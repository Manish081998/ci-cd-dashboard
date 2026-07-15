import { Injectable, inject } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import { GithubApiService } from './github-api.service';
import { PipelineConfig, PipelineEvent, PrResult } from '../models/pipeline.models';
import { PullRequest } from '../models/github.models';

@Injectable({ providedIn: 'root' })
export class PipelineService {
  private readonly gh = inject(GithubApiService);

  /**
   * Orchestrates the full GitHub pipeline:
   *   validate → branches → detect-PR → create-PR → auto-merge → monitor-CI → pr-merge
   *
   * Emits typed PipelineEvent items so the component stays stateless with respect
   * to the orchestration logic.  Unsubscribing cancels all in-flight polling.
   */
  run(cfg: PipelineConfig): Observable<PipelineEvent> {
    return new Observable<PipelineEvent>(subscriber => {
      let cancelled = false;

      const emit = (evt: PipelineEvent) => { if (!cancelled) subscriber.next(evt); };
      const delay = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

      const execute = async () => {
        const { owner, repo, token: tok, headBranch, baseBranch, description } = cfg;

        // ── 1. Validate ────────────────────────────────────────────────────
        emit({ type: 'step-start', id: 'validate' });
        try {
          const info = await firstValueFrom(this.gh.getRepo(owner, repo, tok));
          emit({ type: 'step-done', id: 'validate',
            detail: `${info.full_name}  ·  ${info.visibility}  ·  default: ${info.default_branch}` });
        } catch (e: any) {
          emit({ type: 'step-error', id: 'validate',
            detail: e?.error?.message || 'Cannot access repository — check token' });
          emit({ type: 'complete' }); subscriber.complete(); return;
        }

        if (cancelled) return;

        // ── 2. Branches ────────────────────────────────────────────────────
        emit({ type: 'step-start', id: 'branches' });
        try {
          const branches = await firstValueFrom(this.gh.getBranches(owner, repo, tok));
          const hasHead  = branches.some(b => b.name === headBranch);
          const hasBase  = branches.some(b => b.name === baseBranch);
          if (!hasHead || !hasBase) {
            const missing = [!hasHead && headBranch, !hasBase && baseBranch].filter(Boolean).join(', ');
            emit({ type: 'step-error', id: 'branches', detail: `Branch(es) not found: ${missing}` });
            emit({ type: 'complete' }); subscriber.complete(); return;
          }
          try {
            await firstValueFrom(this.gh.createWorkflowFile(owner, repo, tok, headBranch));
            emit({ type: 'step-done', id: 'branches',
              detail: `${headBranch} ✓   ${baseBranch} ✓   workflow ✓` });
          } catch {
            emit({ type: 'step-done', id: 'branches',
              detail: `${headBranch} ✓   ${baseBranch} ✓` });
          }
        } catch (e: any) {
          emit({ type: 'step-error', id: 'branches',
            detail: e?.error?.message || 'Failed to list branches' });
          emit({ type: 'complete' }); subscriber.complete(); return;
        }

        if (cancelled) return;

        // ── 3. Detect PR ───────────────────────────────────────────────────
        emit({ type: 'step-start', id: 'check-pr' });
        let existingPR: PullRequest | null = null;
        try {
          const prs  = await firstValueFrom(this.gh.getOpenPRs(owner, repo, tok));
          existingPR = prs.find(p => p.head.ref === headBranch && p.base.ref === baseBranch) ?? null;
          emit({ type: 'step-done', id: 'check-pr',
            detail: existingPR
              ? `Found PR #${existingPR.number} — "${existingPR.title}"`
              : 'No open PR — a new one will be created' });
        } catch (e: any) {
          emit({ type: 'step-error', id: 'check-pr',
            detail: e?.error?.message || 'Failed to query PRs' });
          emit({ type: 'complete' }); subscriber.complete(); return;
        }

        if (cancelled) return;

        // ── 4. Create PR ───────────────────────────────────────────────────
        emit({ type: 'step-start', id: 'create-pr' });
        let pr!: PullRequest;
        let prStatus!: 'created' | 'exists';
        const title = description.trim() || `Merge ${headBranch} into ${baseBranch}`;
        const body  = description.trim() || `Automated PR: ${headBranch} → ${baseBranch}`;
        try {
          if (existingPR) {
            pr = existingPR; prStatus = 'exists';
            emit({ type: 'step-done', id: 'create-pr',
              detail: `Reusing existing PR #${pr.number}` });
          } else {
            pr = await firstValueFrom(
              this.gh.createPR(owner, repo, title, body, headBranch, baseBranch, tok));
            prStatus = 'created';
            emit({ type: 'step-done', id: 'create-pr',
              detail: `PR #${pr.number} created — "${pr.title}"` });
          }
          const prResult: PrResult = {
            title: pr.title, url: pr.html_url, status: prStatus, number: pr.number };
          emit({ type: 'pr-result', prResult });
        } catch (e: any) {
          const ghMsg     = e?.error?.message || 'Failed to create PR';
          const ghDetails = (e?.error?.errors as { message?: string }[] | undefined)
            ?.map(x => x.message).filter(Boolean).join('  ·  ');
          emit({ type: 'step-error', id: 'create-pr',
            detail: ghDetails ? `${ghMsg} — ${ghDetails}` : ghMsg });
          emit({ type: 'complete' }); subscriber.complete(); return;
        }

        if (cancelled) return;

        // ── 5. Auto-merge ──────────────────────────────────────────────────
        emit({ type: 'step-start', id: 'auto-merge' });
        if (pr.node_id) {
          try {
            await firstValueFrom(this.gh.enablePRAutoMerge(pr.node_id, tok));
            emit({ type: 'step-done', id: 'auto-merge',
              detail: 'Auto-merge enabled — merges when CI passes' });
          } catch {
            emit({ type: 'step-skipped', id: 'auto-merge',
              detail: 'Auto-merge unavailable — enable in repo settings' });
          }
        } else {
          emit({ type: 'step-skipped', id: 'auto-merge', detail: 'PR node ID not available' });
        }

        if (cancelled) return;

        // ── 6. Monitor CI (poll up to 20×, 60 s total) ────────────────────
        emit({ type: 'step-start', id: 'monitor-ci' });
        let ciHandled  = false;
        let ciComplete = false;
        for (let i = 0; i < 20; i++) {
          if (cancelled) return;
          await delay(i === 0 ? 2000 : 3000);
          if (cancelled) return;
          try {
            const res = await firstValueFrom(this.gh.getWorkflowRuns(owner, repo, tok));
            const run = res.workflow_runs[0];
            if (run) {
              ciHandled = true;
              const detail = `${run.name}  ·  ${run.status}${run.conclusion ? ' / ' + run.conclusion : ''}  ·  branch: ${run.head_branch}`;
              if (run.status === 'completed') {
                ciComplete = true;
                emit({
                  type: run.conclusion === 'success' ? 'step-done' : 'step-error',
                  id: 'monitor-ci', detail,
                });
                break;
              } else {
                emit({ type: 'step-running', id: 'monitor-ci', detail });
              }
            }
          } catch { /* swallow transient poll errors */ }
        }
        if (!ciHandled) {
          emit({ type: 'step-skipped', id: 'monitor-ci',
            detail: 'No workflow runs — verify .github/workflows/ci.yml is committed' });
        } else if (!ciComplete) {
          emit({ type: 'step-skipped', id: 'monitor-ci',
            detail: 'CI still in progress after 60 s — check GitHub Actions for status' });
        }

        if (cancelled) return;

        // ── 7. Poll PR merge (poll up to 48×, 120 s total) ────────────────
        emit({ type: 'step-start', id: 'pr-merge' });
        let merged = false;
        for (let i = 0; i < 48; i++) {
          if (cancelled) return;
          await delay(i === 0 ? 3000 : 2500);
          if (cancelled) return;
          try {
            const prs       = await firstValueFrom(this.gh.getOpenPRs(owner, repo, tok));
            const stillOpen = prs.find(p => p.number === pr.number);

            if (!stillOpen) {
              const prData = await firstValueFrom(this.gh.getPR(owner, repo, pr.number, tok));
              if (prData.merged) {
                emit({ type: 'step-done', id: 'pr-merge',
                  detail: `PR #${pr.number} successfully merged into ${baseBranch} ✓` });
                emit({ type: 'pr-result', prResult: {
                  title: pr.title, url: pr.html_url,
                  status: prStatus, number: pr.number, merged: true,
                }});
                merged = true; break;
              } else if (prData.state === 'closed') {
                emit({ type: 'step-error', id: 'pr-merge',
                  detail: `PR #${pr.number} was closed without merging` });
                merged = true; break;
              }
            } else {
              const needsReview = !stillOpen.auto_merge;
              const detail = needsReview
                ? `PR #${pr.number} open · awaiting approval from reviewer`
                : `PR #${pr.number} open · auto-merge queued · waiting for CI + approval`;
              emit({ type: 'step-running', id: 'pr-merge', detail });
            }
          } catch { /* swallow transient poll errors */ }
        }

        if (!merged) {
          emit({ type: 'step-skipped', id: 'pr-merge',
            detail: `PR #${pr.number} still open — approve it on GitHub to trigger auto-merge` });
        }

        emit({ type: 'complete' });
        subscriber.complete();
      };

      execute().catch(err => { if (!cancelled) subscriber.error(err); });

      return () => { cancelled = true; };
    });
  }
}
