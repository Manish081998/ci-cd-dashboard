import { Component, input, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { GithubApiService } from '../../core/services/github-api.service';
import { GIT_SERVER_BASE } from '../../core/constants/api.constants';

interface Step { label: string; status: 'idle' | 'running' | 'done' | 'error'; detail?: string; }

@Component({
  selector: 'app-setup',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './setup.component.html',
  styleUrl: './setup.component.scss',
})
export class SetupComponent {
  private readonly gh = inject(GithubApiService);

  token = input('');

  repoUrl = '';
  devType  = signal<'solo' | 'team'>('solo');
  running  = signal(false);
  done     = signal(false);
  steps    = signal<Step[]>([]);

  private serverToken = signal('');
  get effectiveToken(): string { return this.token() || this.serverToken(); }

  get urlError(): string {
    if (!this.repoUrl) return '';
    return this.gh.parseRepoUrl(this.repoUrl) ? '' : 'Invalid GitHub URL';
  }

  get canRun(): boolean {
    return !!this.repoUrl && !this.urlError && !!this.effectiveToken;
  }

  hasError = computed(() => this.steps().some(s => s.status === 'error'));

  constructor() {
    // Load token directly from server config so the button works before
    // the parent app finishes its own fetch.
    fetch(`${GIT_SERVER_BASE}/api/config`)
      .then(r => r.json())
      .then((cfg: { githubToken?: string }) => {
        if (cfg.githubToken) this.serverToken.set(cfg.githubToken);
      })
      .catch(() => {});
  }

  async runSetup() {
    const parsed = this.gh.parseRepoUrl(this.repoUrl);
    if (!parsed) return;
    const { owner, repo } = parsed;

    this.running.set(true);
    this.done.set(false);
    this.steps.set([
      { label: 'Verifying repository access',          status: 'idle' },
      { label: 'Creating main & development branches', status: 'idle' },
      { label: 'Adding CI workflow (Build check)',     status: 'idle' },
      { label: 'Enabling auto-merge on repository',   status: 'idle' },
      { label: 'Configuring branch protection',       status: 'idle' },
      { label: 'Verifying final configuration',       status: 'idle' },
    ]);

    const setStep = (i: number, status: Step['status'], detail?: string) => {
      this.steps.update(s => s.map((x, idx) => idx === i ? { ...x, status, detail } : x));
    };

    try {
      // Step 0 — verify repo
      setStep(0, 'running');
      const repoInfo = await firstValueFrom(this.gh.getRepo(owner, repo, this.effectiveToken));
      setStep(0, 'done', `${repoInfo.full_name} · ${repoInfo.visibility}`);

      // Step 1 — create branches if repo is empty
      setStep(1, 'running');
      let mainSha: string | null = await firstValueFrom(
        this.gh.getBranchSha(owner, repo, 'main', this.effectiveToken));
      if (!mainSha) {
        const created = await firstValueFrom(
          this.gh.createInitialCommit(owner, repo, this.effectiveToken));
        mainSha = created.commit.sha;
      }
      const devRef = await firstValueFrom(
        this.gh.getBranchSha(owner, repo, 'development', this.effectiveToken));
      if (!devRef) {
        await firstValueFrom(
          this.gh.createBranch(owner, repo, 'development', mainSha!, this.effectiveToken));
        setStep(1, 'done', 'main ✓  development ✓  (created)');
      } else {
        setStep(1, 'done', 'main ✓  development ✓  (already existed)');
      }

      // Step 2 — push CI workflow to both main and development
      setStep(2, 'running');
      await firstValueFrom(this.gh.createWorkflowFile(owner, repo, this.effectiveToken));
      await firstValueFrom(this.gh.createWorkflowFile(owner, repo, this.effectiveToken, 'development'));
      setStep(2, 'done', '.github/workflows/build.yml ✓  (main + development)');

      // Step 3 — enable auto-merge
      setStep(3, 'running');
      await firstValueFrom(this.gh.enableAutoMerge(owner, repo, this.effectiveToken));
      setStep(3, 'done', 'allow_auto_merge: true · allow_merge_commit: true');

      // Step 4 — branch protection on main
      setStep(4, 'running');
      await firstValueFrom(
        this.gh.setProtection(owner, repo, 'main', this.devType() === 'team', this.effectiveToken));
      setStep(4, 'done', this.devType() === 'solo'
        ? 'No approval required (sole developer)'
        : '1 approval required before merging');

      // Step 5 — verify final config
      setStep(5, 'running');
      const final = await firstValueFrom(this.gh.getRepo(owner, repo, this.effectiveToken));
      setStep(5, 'done', `auto_merge: ${final.allow_auto_merge} · default: ${final.default_branch}`);

    } catch (e: any) {
      const idx = this.steps().findIndex(s => s.status === 'running');
      if (idx >= 0) setStep(idx, 'error', this.friendlyError(e));
    }

    this.running.set(false);
    this.done.set(true);
  }

  // GitHub returns a generic 404 for both "doesn't exist" and "token can't
  // write here" (so it doesn't leak repo existence to unauthorized callers).
  // Translate the common cases into something actionable instead of a bare
  // "Not Found".
  private friendlyError(e: any): string {
    const status = e?.status;
    const ghMessage = e?.error?.message || e?.message || 'API error';
    if (status === 404) {
      return `${ghMessage} — the token likely lacks push access to this repo. `
        + `Make sure the token's account owns the repo or is added as a collaborator with Write access, `
        + `and that a classic token has the "repo" scope.`;
    }
    if (status === 403) {
      return `${ghMessage} — the token is missing a required scope/permission. `
        + `Check "repo" scope for classic tokens, or "Contents: Read & write" for fine-grained tokens.`;
    }
    if (status === 422) {
      return `${ghMessage} — GitHub rejected the request. This can happen if a branch protection `
        + `rule or ruleset on this repo already restricts branch or file creation.`;
    }
    return ghMessage;
  }
}
