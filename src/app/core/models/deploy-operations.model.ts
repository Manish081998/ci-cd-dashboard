import type { StepStatus } from './pipeline.models';

// ── Advanced-view sub-operation types ───────────────────────────────────────
// Purely a frontend presentation layer over the 4 real SSE stages already
// emitted by /api/deploy/iis (see DEPLOY_STEPS in pipeline.constants.ts).
// Reuses StepStatus so an operation's status is always expressible in terms
// of the same vocabulary the rest of the app already understands.

export type OperationStatus = StepStatus;

/** Human label for the 5-state model requested in the design ask. */
export function operationStatusLabel(status: OperationStatus): string {
  switch (status) {
    case 'idle':     return 'Pending';
    case 'running':  return 'Running';
    case 'done':     return 'Success';
    case 'error':    return 'Failed';
    case 'skipped':  return 'Skipped';
  }
}

export interface DeployOperation {
  id: string;
  label: string;
  status: OperationStatus;
  detail: string;
  logLines: string[];
  startedAt: number | null;
  endedAt: number | null;
  /** True when this operation's status came from a real detected signal
   *  (build output, a distinct command boundary) rather than a time estimate. */
  real: boolean;
}

export interface DeployStageView {
  id: string;
  label: string;
  status: StepStatus;
  detail: string;
  operations: DeployOperation[];
  /** 0-100, share of this stage's own operations completed. */
  progressPct: number;
  /** Share of overall deploy progress this stage represents (0-1, sums to 1 across all stages). */
  weight: number;
  startedAt: number | null;
  endedAt: number | null;
  /** Raw stdout/stderr captured for this stage — the actual evidence behind its operations. */
  logLines: string[];
}

export interface DeployOverallProgress {
  pct: number;
  completedOps: number;
  totalOps: number;
  currentStageLabel: string;
  currentTaskLabel: string;
}

/** One line in the live terminal — true arrival order across all 4 stages. */
export interface DeployTerminalLine {
  stageId: string;
  kind: 'cmd' | 'stdout' | 'stderr';
  text: string;
  at: number;
}
