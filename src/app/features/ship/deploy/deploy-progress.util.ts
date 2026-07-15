// ── Pure Advanced-view progress derivation ──────────────────────────────────
// No Angular DI, no HTTP calls, no mutation — everything here is a function
// of the state ship.component.ts already holds (deploySteps + the SSE
// stdout/cmd text it now captures instead of discarding). Kept isolated so
// the "how honest is this number" logic is easy to read and audit in one
// place, per the design plan's transparency requirement.

import type { Step, StepStatus, DeployAuditEntry } from '../../../core/models/pipeline.models';
import type { DeployOperation, DeployOverallProgress, DeployStageView } from '../../../core/models/deploy-operations.model';
import { DEPLOY_STAGE_OPERATIONS, DEFAULT_STAGE_WEIGHTS, DeployOperationDef } from '../../../core/constants/deploy-operations.constants';

export interface StageTimestamps {
  start: number | null;
  end: number | null;
}

/** deploy-audit only records total deploy duration, not a per-stage split —
 *  so weights stay a fixed, sane proportion (build dominates a typical
 *  publish→stage→deploy→verify pipeline); only the *total* estimated time
 *  is scaled from this project's own history when there is any. */
const NO_HISTORY_TOTAL_MS = 90_000;

export function averageTotalDurationMs(history: DeployAuditEntry[]): number | null {
  const ok = history.filter(h => h.outcome === 'success' && h.durationMs > 0);
  if (!ok.length) return null;
  return ok.reduce((sum, h) => sum + h.durationMs, 0) / ok.length;
}

export function estimatedStageDurationMs(stageId: string, history: DeployAuditEntry[]): number {
  const total = averageTotalDurationMs(history) ?? NO_HISTORY_TOTAL_MS;
  return total * (DEFAULT_STAGE_WEIGHTS[stageId] ?? 0.25);
}

export interface DerivedOperations {
  operations: DeployOperation[];
  /** Sum of per-operation completion credit (0..1 each) — fractional for the
   *  one estimated operation currently in flight, so the stage's progress
   *  bar creeps continuously instead of only jumping at op boundaries. */
  creditSum: number;
}

/**
 * Walks a stage's operations strictly in catalog order and stops advancing at
 * the first one that isn't confirmed done yet — whether that's a real
 * operation still waiting for its stdout/cmd signal, or an estimated one
 * whose time slice hasn't elapsed. This is deliberate: an operation must
 * never show progress while an earlier operation in the same stage hasn't
 * resolved, since that would show something like "Publish output" as done
 * while "Build solution" (which necessarily happens first) is still pending.
 * Real and estimated operations otherwise advance independently — real ones
 * only ever flip via their detected signal, estimated ones only via elapsed
 * time — but this single forward scan is what keeps both tracks honest
 * about ordering relative to each other.
 */
function deriveOperations(
  defs: DeployOperationDef[],
  status: StepStatus,
  detailText: string,
  stdoutText: string,
  cmdText: string,
  elapsedMs: number,
  estimatedDurationMs: number,
): DerivedOperations {
  const n = defs.length;

  if (status === 'idle' || status === 'skipped') {
    const operations = defs.map(def => finalizeOp(def, status, detailText, stdoutText, cmdText));
    return { operations, creditSum: status === 'skipped' ? n : 0 };
  }

  if (status === 'done') {
    return { operations: defs.map(def => finalizeOp(def, 'done', detailText, stdoutText, cmdText)), creditSum: n };
  }

  // running / error: sequential scan, stop at the first unresolved operation.
  const fracElapsed = estimatedDurationMs > 0 ? Math.min(1, Math.max(0, elapsedMs / estimatedDurationMs)) : 0;
  const timeAllowedCount = Math.floor(fracElapsed * n);

  const raw: StepStatus[] = new Array(n).fill('idle');
  let blockedAt = -1;
  for (let i = 0; i < n; i++) {
    const def = defs[i];
    const resolved = def.detect
      ? def.detect.pattern.test(def.detect.kind === 'stdout' ? stdoutText : cmdText)
      : i < timeAllowedCount;
    if (resolved) { raw[i] = 'done'; continue; }
    blockedAt = i;
    raw[i] = status === 'running' ? 'running' : 'idle';
    break; // nothing after this point may advance
  }

  if (status === 'error') {
    raw[blockedAt !== -1 ? blockedAt : n - 1] = 'error';
  }

  // Partial credit for the one in-flight operation: only ever for an
  // *estimated* op (no real detect) — a real op waiting on its signal gets
  // no fabricated fraction, just its spinner. This is what makes the bar
  // creep smoothly between op boundaries without inventing a number for
  // something that isn't actually measured.
  let creditSum = raw.filter(s => s === 'done').length;
  if (status === 'running' && blockedAt !== -1 && !defs[blockedAt].detect && n > 0) {
    const sliceMs = estimatedDurationMs / n;
    const tIntoSlice = Math.max(0, elapsedMs - blockedAt * sliceMs);
    const eased = sliceMs > 0 ? Math.min(0.92, 1 - Math.exp(-tIntoSlice / (sliceMs * 0.5))) : 0;
    creditSum += eased;
  }

  return { operations: defs.map((def, i) => finalizeOp(def, raw[i], detailText, stdoutText, cmdText)), creditSum };
}

function finalizeOp(def: DeployOperationDef, status: StepStatus, detailText: string, stdoutText: string, cmdText: string): DeployOperation {
  const matched = !!def.detect && def.detect.pattern.test(def.detect.kind === 'stdout' ? stdoutText : cmdText);
  return {
    id: def.id,
    label: def.label,
    status,
    detail: status === 'error' ? detailText : '',
    logLines: [],
    startedAt: null,
    endedAt: null,
    real: !!def.detect && (matched || status === 'running'),
  };
}

export function buildStageViews(
  steps: Step[],
  timestamps: Record<string, StageTimestamps>,
  logs: Record<string, string[]>,
  cmdLog: Record<string, string[]>,
  now: number,
  history: DeployAuditEntry[],
  hasBackup: boolean,
): DeployStageView[] {
  return DEPLOY_STAGE_OPERATIONS.map(stageDef => {
    const step = steps.find(s => s.id === stageDef.id);
    const status: StepStatus = step?.status ?? 'idle';
    const detail = step?.detail ?? '';
    const ts = timestamps[stageDef.id] ?? { start: null, end: null };
    const stdoutText = (logs[stageDef.id] ?? []).join('\n');
    const cmdText = (cmdLog[stageDef.id] ?? []).join('\n');
    const estimatedDurationMs = estimatedStageDurationMs(stageDef.id, history);
    const elapsedMs = ts.start ? (ts.end ?? now) - ts.start : 0;

    // Environments with no backupPath configured never produce a "Backup
    // complete" line — showing that row would otherwise block every op
    // after it from ever advancing (see deriveOperations), so it's dropped
    // from the list entirely rather than shown as a step that never happens.
    const defs = stageDef.id === 'deploy' && !hasBackup
      ? stageDef.operations.filter(d => d.id !== 'backup-existing')
      : stageDef.operations;

    const { operations, creditSum } = deriveOperations(defs, status, detail, stdoutText, cmdText, elapsedMs, estimatedDurationMs);
    const progressPct = operations.length ? Math.min(100, Math.round((creditSum / operations.length) * 100)) : 0;

    return {
      id: stageDef.id,
      label: stageDef.label,
      status,
      detail,
      operations,
      progressPct,
      weight: DEFAULT_STAGE_WEIGHTS[stageDef.id] ?? 0.25,
      startedAt: ts.start,
      endedAt: ts.end,
      logLines: [...(logs[stageDef.id] ?? [])],
    };
  });
}

export function overallProgress(stages: DeployStageView[]): DeployOverallProgress {
  const totalOps = stages.reduce((s, st) => s + st.operations.length, 0);
  const weightedDone = stages.reduce((sum, st) => sum + st.weight * (st.progressPct / 100), 0);
  const totalWeight = stages.reduce((s, st) => s + st.weight, 0) || 1;
  const pct = Math.round((weightedDone / totalWeight) * 100);
  const completedOps = stages.reduce((s, st) => s + st.operations.filter(o => o.status === 'done' || o.status === 'skipped').length, 0);

  const runningStage = stages.find(s => s.status === 'running');
  const erroredStage = stages.find(s => s.status === 'error');
  const activeStage = runningStage ?? erroredStage ?? [...stages].reverse().find(s => s.status === 'done');
  const activeOp = activeStage?.operations.find(o => o.status === 'running')
    ?? activeStage?.operations.find(o => o.status === 'error');

  return {
    pct: Math.min(100, Math.max(0, pct)),
    completedOps,
    totalOps,
    currentStageLabel: activeStage?.label ?? '—',
    currentTaskLabel: activeOp?.label ?? (activeStage ? `${activeStage.label} finishing…` : '—'),
  };
}

export function estimateRemainingMs(stages: DeployStageView[], startedAt: number | null, now: number, history: DeployAuditEntry[]): number | null {
  if (!startedAt) return null;
  const totalEstimateMs = DEPLOY_STAGE_OPERATIONS.reduce((s, d) => s + estimatedStageDurationMs(d.id, history), 0);
  const { pct } = overallProgress(stages);
  const elapsed = now - startedAt;
  if (pct <= 0) return totalEstimateMs;
  if (pct >= 100) return 0;
  const projectedTotal = elapsed / (pct / 100);
  return Math.max(0, projectedTotal - elapsed);
}

export function deploymentSpeed(stages: DeployStageView[], startedAt: number | null, now: number): number {
  if (!startedAt) return 0;
  const elapsedMin = (now - startedAt) / 60_000;
  if (elapsedMin <= 0) return 0;
  const completedOps = stages.reduce((s, st) => s + st.operations.filter(o => o.status === 'done' || o.status === 'skipped').length, 0);
  return Math.round((completedOps / elapsedMin) * 10) / 10;
}

export function formatDuration(ms: number | null): string {
  if (ms == null || !isFinite(ms) || ms < 0) return '—';
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
