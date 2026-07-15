import { Component, input, signal, OnDestroy, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription, interval } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { GithubApiService } from '../../core/services/github-api.service';
import { RepoInfo, WorkflowRun, PullRequest, Commit, Branch } from '../../core/models/github.models';

@Component({
  selector: 'app-monitor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './monitor.component.html',
  styleUrl: './monitor.component.scss',
})
export class MonitorComponent implements OnDestroy {
  private readonly gh = inject(GithubApiService);

  token = input('');

  repoUrl      = '';
  repos        = signal<{ full_name: string; clone_url: string }[]>([]);
  reposLoading = signal(false);
  loading      = signal(false);
  autoRefresh = signal(false);
  lastRefresh = signal('');
  repoInfo    = signal<RepoInfo | null>(null);
  ciRuns      = signal<WorkflowRun[]>([]);
  openPRs     = signal<PullRequest[]>([]);
  commits     = signal<Commit[]>([]);
  branches    = signal<Branch[]>([]);

  private sub?: Subscription;

  constructor() {
    effect(() => {
      const t = this.token();
      if (!t) return;
      this.reposLoading.set(true);
      this.gh.getUserRepos(t).subscribe({
        next:  rs => {
          this.repos.set(rs.map(r => ({ full_name: r.full_name, clone_url: r.clone_url })));
          this.reposLoading.set(false);
        },
        error: () => this.reposLoading.set(false),
      });
    });
  }

  ngOnDestroy() { this.sub?.unsubscribe(); }

  canLoad() { return !!this.repoUrl && !!this.token(); }

  onUrlChange() {
    if (this.canLoad()) this.load();
  }

  toggleAuto() {
    this.autoRefresh.update(v => !v);
    this.sub?.unsubscribe();
    if (this.autoRefresh()) {
      this.sub = interval(10000).subscribe(() => this.load());
    }
  }

  load() {
    const parsed = this.gh.parseRepoUrl(this.repoUrl);
    if (!parsed || !this.token()) return;
    const { owner, repo } = parsed;
    this.loading.set(true);

    Promise.all([
      firstValueFrom(this.gh.getRepo(owner, repo, this.token())).catch(() => null),
      firstValueFrom(this.gh.getWorkflowRuns(owner, repo, this.token())).catch(() => ({ workflow_runs: [] as WorkflowRun[] })),
      firstValueFrom(this.gh.getOpenPRs(owner, repo, this.token())).catch(() => [] as PullRequest[]),
      firstValueFrom(this.gh.getCommits(owner, repo, 'development', this.token())).catch(() => [] as Commit[]),
      firstValueFrom(this.gh.getBranches(owner, repo, this.token())).catch(() => [] as Branch[]),
    ]).then(([repoData, runs, prs, commits, branches]) => {
      this.repoInfo.set(repoData);
      this.ciRuns.set(runs?.workflow_runs ?? []);
      this.openPRs.set(prs ?? []);
      this.commits.set(commits ?? []);
      this.branches.set(branches ?? []);
      this.lastRefresh.set(new Date().toLocaleTimeString());
      this.loading.set(false);
    });
  }

  latestRunStatus(): string {
    const r = this.ciRuns()[0];
    if (!r) return '—';
    if (r.status === 'in_progress' || r.status === 'queued') return 'Running';
    return r.conclusion
      ? r.conclusion.charAt(0).toUpperCase() + r.conclusion.slice(1)
      : r.status;
  }

  latestRunColor(): string {
    const r = this.ciRuns()[0];
    if (!r) return '';
    if (r.status === 'in_progress') return 'yellow';
    if (r.conclusion === 'success') return 'green';
    if (r.conclusion === 'failure') return 'red';
    return '';
  }

  hasRunningCI(): boolean {
    return this.ciRuns().some(r => r.status === 'in_progress' || r.status === 'queued');
  }

  runPulse(r: WorkflowRun): string {
    if (r.status === 'in_progress' || r.status === 'queued') return 'yellow';
    if (r.conclusion === 'success') return 'green';
    if (r.conclusion === 'failure') return 'red';
    return 'gray';
  }

  runBadge(r: WorkflowRun): string {
    if (r.status === 'in_progress' || r.status === 'queued') return 'pending';
    if (r.conclusion === 'success') return 'success';
    if (r.conclusion === 'failure') return 'error';
    return 'neutral';
  }

  runLabel(r: WorkflowRun): string {
    if (r.status === 'in_progress') return 'Running';
    if (r.status === 'queued') return 'Queued';
    return r.conclusion || r.status;
  }
}
