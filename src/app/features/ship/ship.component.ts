import { Component, input, signal, computed, effect, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  Step, StepStatus, PrResult,
  BuildEvent, GitPushEvent, PipelineEvent, PipelineConfig, DeployEvent,
  DeployProject, BuildOption, DeployAuditEntry, DeployRequest, CiBuild,
} from '../../core/models/pipeline.models';
import { GIT_STEPS, PIPE_STEPS, DEPLOY_STEPS } from '../../core/constants/pipeline.constants';
import { GIT_SERVER_BASE } from '../../core/constants/api.constants';
import { freshSteps } from '../../shared/utils/step.utils';
import { currentTimestamp } from '../../shared/utils/time.utils';
import { GithubApiService } from '../../core/services/github-api.service';
import { GitPushService } from '../../core/services/git-push.service';
import { PipelineService } from '../../core/services/pipeline.service';
import { DeployService } from '../../core/services/deploy.service';

// ── Advanced deploy view (frontend-only presentation layer, see plan) ──────
import type { StageTimestamps } from './deploy/deploy-progress.util';
import { buildStageViews, overallProgress, estimateRemainingMs, deploymentSpeed, formatDuration } from './deploy/deploy-progress.util';
import { DeployViewToggleComponent, type DeployViewMode } from './deploy/deploy-view-toggle.component';
import { DeployProgressOverviewComponent } from './deploy/deploy-progress-overview.component';
import { DeployStageListComponent } from './deploy/deploy-stage-list.component';
import { DeployTimelineComponent } from './deploy/deploy-timeline.component';
import { DeployFailureBannerComponent } from './deploy/deploy-failure-banner.component';
import { DeployTerminalComponent } from './deploy/deploy-terminal.component';
import type { DeployTerminalLine } from '../../core/models/deploy-operations.model';

interface LogEntry {
  time: string;
  label: string;
  status: StepStatus;
  text: string;
}

function parseHms(t: string): number {
  const [h, m, s] = t.split(':').map(Number);
  return h * 3600 + m * 60 + s;
}

@Component({
  selector: 'app-ship',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    DeployViewToggleComponent, DeployProgressOverviewComponent, DeployStageListComponent,
    DeployTimelineComponent, DeployFailureBannerComponent, DeployTerminalComponent,
  ],
  templateUrl: './ship.component.html',
  styleUrl: './ship.component.scss',
})
export class ShipComponent {
  private readonly githubApi   = inject(GithubApiService);
  private readonly gitPushSvc  = inject(GitPushService);
  private readonly pipelineSvc = inject(PipelineService);
  private readonly deploySvc   = inject(DeployService);

  token = input('');

  // ── Config fields ──────────────────────────────────────────────────────
  solutionFolder = localStorage.getItem('git_folder') || '';
  repoUrl        = localStorage.getItem('git_repo')   || '';
  description    = '';
  headBranch     = 'development';
  baseBranch     = 'main';

  // ── Repo dropdown ──────────────────────────────────────────────────────
  repos        = signal<{ full_name: string; clone_url: string }[]>([]);
  reposLoading = signal(false);

  // ── Branch dropdowns ────────────────────────────────────────────────────
  branches        = signal<{ name: string }[]>([]);
  branchesLoading = signal(false);

  // ── Phase 1 state (git push) ───────────────────────────────────────────
  gitStarted    = signal(false);
  gitRunning    = signal(false);
  gitDone       = signal(false);
  gitSteps      = signal<Step[]>(freshSteps(GIT_STEPS));
  terminalLines = signal<{ type: string; text: string }[]>([]);

  // ── Phase 2 state (GitHub pipeline) ───────────────────────────────────
  pipeStarted = signal(false);
  pipeRunning = signal(false);
  pipeDone    = signal(false);
  pipeSteps   = signal<Step[]>(freshSteps(PIPE_STEPS));
  selectedId  = signal<string | null>(null);
  prResult    = signal<PrResult | null>(null);

  // ── Phase 3 state (IIS deploy — manual, only after PR merges) ──────────
  deployStarted    = signal(false);
  deployRunning    = signal(false);
  deployDone       = signal(false);
  deploySteps      = signal<Step[]>(freshSteps(DEPLOY_STEPS));
  deployError      = signal('');
  deployCancelling = signal(false);

  // ── Advanced view — frontend-only presentation state, no new API calls ──
  // (deploySteps/handleDeployEvent above remain the single source of truth;
  // this just captures signals already streamed and previously discarded.)
  deployViewMode        = signal<DeployViewMode>((localStorage.getItem('deploy_view_mode') as DeployViewMode) || 'basic');
  deployLogs            = signal<Record<string, string[]>>({});
  deployCmdLog           = signal<Record<string, string[]>>({});
  deployStageTimestamps = signal<Record<string, StageTimestamps>>({});
  deployStartedAt       = signal<number | null>(null);
  deployNowTick         = signal<number>(Date.now());
  private deployTickTimer: ReturnType<typeof setInterval> | null = null;
  /** One merged, true-arrival-order feed for the live terminal — deployLogs/
   *  deployCmdLog above stay as-is (they power per-stage log panels + cmd
   *  detection); this is purely additive, same events, no new source. */
  deployTerminalLines = signal<DeployTerminalLine[]>([]);

  // ── 3-step wizard: 1 select project → 2 push & ship → 3 deploy ──────────
  wizardStep = signal<1 | 2 | 3>(1);

  // ── Deploy wizard: project → environment → build command → confirm ─────
  deployProjects        = signal<DeployProject[]>([]);
  deployProjectsLoading = signal(false);
  selectedProjectId     = signal('');
  selectedEnvironment   = signal('');
  buildOptions          = signal<BuildOption[]>([]);
  buildOptionsLoading   = signal(false);
  buildOptionsError     = signal('');
  selectedBuildOptionId = signal('');
  confirmText           = signal('');
  deployHistory         = signal<DeployAuditEntry[]>([]);

  // ── Build source: a fresh local build (default, unchanged behavior) or the
  // exact artifact a GitHub Actions run already built and tested ───────────
  deploySource          = signal<'local' | 'ci'>('local');
  ciBuilds              = signal<CiBuild[]>([]);
  ciBuildsLoading       = signal(false);
  ciBuildsError         = signal('');
  selectedCiArtifactId  = signal<number | null>(null);

  selectedProject = computed<DeployProject | null>(() =>
    this.deployProjects().find(p => p.id === this.selectedProjectId()) ?? null);

  selectedEnvInfo = computed(() =>
    this.selectedProject()?.environments.find(e => e.name === this.selectedEnvironment()) ?? null);

  requiresApproval = computed(() => this.selectedEnvInfo()?.requireApproval ?? false);

  selectedBuildOption = computed<BuildOption | null>(() =>
    this.buildOptions().find(o => o.id === this.selectedBuildOptionId()) ?? null);

  selectedCiBuild = computed<CiBuild | null>(() =>
    this.ciBuilds().find(b => b.artifactId === this.selectedCiArtifactId()) ?? null);

  // ── Shared log ─────────────────────────────────────────────────────────
  log = signal<LogEntry[]>([]);

  // ── AI commit message generation ───────────────────────────────────────
  generating    = signal(false);
  generateError = signal('');

  // ── Server health ──────────────────────────────────────────────────────
  serverOnline = signal(true);

  anyRunning     = computed(() => this.gitRunning() || this.pipeRunning());
  gitHasError    = computed(() => this.gitSteps().some(s => s.status === 'error'));
  pipeHasError   = computed(() => this.pipeSteps().some(s => s.status === 'error'));
  failedPipeStep = computed(() => this.pipeSteps().find(s => s.status === 'error')?.label ?? '');
  gitProgress    = computed(() => {
    const s = this.gitSteps();
    return Math.round(
      s.filter(x => x.status === 'done' || x.status === 'skipped' || x.status === 'error').length /
      s.length * 100);
  });
  pipeProgress   = computed(() => {
    const s = this.pipeSteps();
    return Math.round(
      s.filter(x => x.status === 'done' || x.status === 'skipped' || x.status === 'error').length /
      s.length * 100);
  });
  deployHasError = computed(() => this.deploySteps().some(s => s.status === 'error'));
  deployProgress = computed(() => {
    const s = this.deploySteps();
    return Math.round(
      s.filter(x => x.status === 'done' || x.status === 'skipped' || x.status === 'error').length /
      s.length * 100);
  });
  canDeploy = computed(() => {
    const env = this.selectedEnvInfo();
    if (!this.selectedProject() || !env || !env.configured || this.deployRunning()) return false;
    if (this.requiresApproval() && this.confirmText().trim().toLowerCase() !== this.selectedEnvironment().toLowerCase()) return false;
    if (this.deploySource() === 'ci' && !this.selectedCiArtifactId()) return false;
    return true;
  });

  activeDetail = computed<Step | null>(() => {
    const all = [...this.gitSteps(), ...this.pipeSteps()];
    if (this.selectedId()) return all.find(s => s.id === this.selectedId()) ?? null;
    return (
      all.find(s => s.status === 'running') ??
      all.filter(s => s.status === 'error').at(-1) ??
      all.filter(s => s.status === 'done').at(-1) ??
      null
    );
  });

  // ── Unified timeline presentation (derived, read-only — no new business logic) ──
  pipeGroupA = computed(() => this.pipeSteps().slice(0, 4));  // validate → create-pr
  pipeGroupB = computed(() => this.pipeSteps().slice(4));     // auto-merge → pr-merge

  overallSteps    = computed(() => [...this.gitSteps(), ...this.pipeSteps()]);
  overallRunning  = computed(() => this.anyRunning());
  overallHasError = computed(() => this.overallSteps().some(s => s.status === 'error'));
  failedStepLabel = computed(() => this.overallSteps().find(s => s.status === 'error')?.label ?? '');
  overallProgress = computed(() => {
    const s = this.overallSteps();
    return Math.round(
      s.filter(x => x.status === 'done' || x.status === 'skipped' || x.status === 'error').length /
      s.length * 100);
  });

  checksTotal  = computed(() => this.pipeSteps().length);
  checksPassed = computed(() => this.pipeSteps().filter(s => s.status === 'done').length);

  successRateLabel = computed(() => {
    const finished = this.overallSteps().filter(s => s.status === 'done' || s.status === 'error' || s.status === 'skipped');
    if (!finished.length) return '—';
    const ok = finished.filter(s => s.status !== 'error').length;
    return Math.round((ok / finished.length) * 100) + '%';
  });

  mergeElapsedLabel = computed(() => {
    const entries = this.log();
    const start = entries[0];
    const end = entries.find(l => l.label === 'PR Merged' && l.status === 'done');
    if (!start || !end) return null;
    let diff = parseHms(end.time) - parseHms(start.time);
    if (diff < 0) diff += 86400;
    const m = Math.floor(diff / 60), s = diff % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  });

  openPrCount = computed(() => (this.prResult() && !this.prResult()!.merged) ? 1 : 0);

  groupStatus(steps: Step[]): StepStatus {
    if (steps.some(s => s.status === 'error')) return 'error';
    if (steps.some(s => s.status === 'running')) return 'running';
    if (steps.every(s => s.status === 'done' || s.status === 'skipped')) return 'done';
    return 'idle';
  }

  repoDisplayName(): string {
    const parsed = this.githubApi.parseRepoUrl(this.repoUrl);
    return parsed ? `${parsed.owner}/${parsed.repo}` : (this.repoUrl || '—');
  }

  stepById(id: string): Step {
    return this.overallSteps().find(s => s.id === id) ?? {
      id, label: id, sublabel: '', status: 'idle', detail: '',
    };
  }

  deployStepById(id: string): Step {
    return this.deploySteps().find(s => s.id === id) ?? {
      id, label: id, sublabel: '', status: 'idle', detail: '',
    };
  }

  deployActiveDetail = computed<Step | null>(() => {
    const all = this.deploySteps();
    return (
      all.find(s => s.status === 'running') ??
      all.filter(s => s.status === 'error').at(-1) ??
      all.filter(s => s.status === 'done').at(-1) ??
      null
    );
  });

  // ── Advanced view — derived, read-only (see deploy-progress.util.ts) ──────
  deployStageViews = computed(() => buildStageViews(
    this.deploySteps(), this.deployStageTimestamps(), this.deployLogs(), this.deployCmdLog(),
    this.deployNowTick(), this.deployHistory(), this.selectedEnvInfo()?.hasBackup ?? true,
  ));
  deployOverall = computed(() => overallProgress(this.deployStageViews()));
  deployElapsedLabel = computed(() => {
    const start = this.deployStartedAt();
    return start ? formatDuration(this.deployNowTick() - start) : '—';
  });
  deployRemainingLabel = computed(() =>
    formatDuration(estimateRemainingMs(this.deployStageViews(), this.deployStartedAt(), this.deployNowTick(), this.deployHistory())));
  deploySpeedValue = computed(() =>
    deploymentSpeed(this.deployStageViews(), this.deployStartedAt(), this.deployNowTick()));

  constructor() {
    this.checkServer();
    this.loadDeployProjects();
    effect(() => {
      const t = this.token();
      if (!t) return;
      this.reposLoading.set(true);
      this.githubApi.getUserRepos(t).subscribe({
        next:  rs => {
          this.repos.set(rs.map(r => ({ full_name: r.full_name, clone_url: r.clone_url })));
          this.reposLoading.set(false);
        },
        error: () => this.reposLoading.set(false),
      });
      this.fetchBranches();
    });

    // Drives the elapsed clock and time-estimated Advanced-view sub-steps
    // while a deploy is running; stops itself once it isn't.
    effect(() => {
      if (this.deployRunning()) {
        if (!this.deployTickTimer) this.deployTickTimer = setInterval(() => this.deployNowTick.set(Date.now()), 200);
      } else if (this.deployTickTimer) {
        clearInterval(this.deployTickTimer);
        this.deployTickTimer = null;
      }
    });
    inject(DestroyRef).onDestroy(() => { if (this.deployTickTimer) clearInterval(this.deployTickTimer); });
  }

  setDeployViewMode(mode: DeployViewMode) {
    this.deployViewMode.set(mode);
    localStorage.setItem('deploy_view_mode', mode);
  }

  async checkServer() {
    try {
      const r = await fetch(`${GIT_SERVER_BASE}/api/health`);
      this.serverOnline.set(r.ok);
    } catch {
      this.serverOnline.set(false);
    }
  }

  // ── Deploy wizard ────────────────────────────────────────────────────────
  async loadDeployProjects() {
    this.deployProjectsLoading.set(true);
    try {
      const projects = await this.deploySvc.listProjects();
      this.deployProjects.set(projects);
    } catch {
      this.deployProjects.set([]);
    } finally {
      this.deployProjectsLoading.set(false);
    }
  }

  selectProject(id: string) {
    this.selectedProjectId.set(id);
    this.confirmText.set('');
    const project = this.deployProjects().find(p => p.id === id);
    const envs = project?.environments ?? [];
    const preferred = envs.find(e => e.configured) ?? envs[0];
    this.selectedEnvironment.set(preferred?.name ?? '');
    this.deploySource.set('local');
    this.selectedCiArtifactId.set(null);
    if (preferred) {
      this.loadBuildOptions();
      if (project?.hasCiRepo) this.loadCiBuilds();
    } else {
      this.buildOptions.set([]); this.selectedBuildOptionId.set('');
      this.ciBuilds.set([]);
    }
    this.loadHistory();
    if (id) this.wizardStep.set(2);
  }

  selectEnvironment(name: string) {
    this.selectedEnvironment.set(name);
    this.confirmText.set('');
    this.selectedCiArtifactId.set(null);
    this.loadBuildOptions();
    if (this.selectedProject()?.hasCiRepo) this.loadCiBuilds(); else this.ciBuilds.set([]);
  }

  setDeploySource(source: 'local' | 'ci') {
    this.deploySource.set(source);
    if (source === 'ci' && !this.ciBuilds().length && !this.ciBuildsLoading()) this.loadCiBuilds();
  }

  async loadCiBuilds() {
    const projectId = this.selectedProjectId();
    const environment = this.selectedEnvironment();
    if (!projectId || !environment) return;
    this.ciBuildsLoading.set(true);
    this.ciBuildsError.set('');
    try {
      const builds = await this.deploySvc.getCiBuilds(projectId, environment);
      this.ciBuilds.set(builds);
      const stillValid = builds.some(b => b.artifactId === this.selectedCiArtifactId());
      if (!stillValid) this.selectedCiArtifactId.set(builds[0]?.artifactId ?? null);
    } catch (err: any) {
      this.ciBuilds.set([]);
      this.selectedCiArtifactId.set(null);
      this.ciBuildsError.set(err?.message ?? 'Failed to load CI builds');
    } finally {
      this.ciBuildsLoading.set(false);
    }
  }

  /** Wizard step navigation — steps unlock in order but stay reachable via
   *  the stepper once their prerequisites are met (deploy has always been
   *  usable independently of the git/PR pipeline, see canGoStep3()). */
  goToStep(step: 1 | 2 | 3) {
    if (step === 2 && !this.selectedProjectId()) return;
    if (step === 3 && !this.canGoStep3()) return;
    this.wizardStep.set(step);
    // Build options require the Solution Folder, which may only just have
    // been filled in on Step 2 — (re)detect them now that we're reaching Deploy.
    if (step === 3 && !this.buildOptions().length && !this.buildOptionsLoading()) this.loadBuildOptions();
    if (step === 3 && this.selectedProject()?.hasCiRepo && !this.ciBuilds().length && !this.ciBuildsLoading()) this.loadCiBuilds();
  }

  canGoStep3(): boolean {
    return !!this.selectedProjectId() && !!this.solutionFolder.trim();
  }

  async loadBuildOptions() {
    const projectId = this.selectedProjectId();
    const environment = this.selectedEnvironment();
    if (!projectId || !environment || !this.solutionFolder.trim()) return;
    this.buildOptionsLoading.set(true);
    this.buildOptionsError.set('');
    try {
      const { options, recommendedId } = await this.deploySvc.getBuildOptions(projectId, environment, this.solutionFolder);
      this.buildOptions.set(options);
      this.selectedBuildOptionId.set(recommendedId ?? options[0]?.id ?? '');
    } catch (err: any) {
      this.buildOptions.set([]);
      this.selectedBuildOptionId.set('');
      this.buildOptionsError.set(err?.message ?? 'Failed to load build options');
    } finally {
      this.buildOptionsLoading.set(false);
    }
  }

  async loadHistory() {
    const projectId = this.selectedProjectId();
    if (!projectId) return;
    try {
      this.deployHistory.set(await this.deploySvc.getAudit(projectId, 5));
    } catch {
      this.deployHistory.set([]);
    }
  }

  selectStep(id: string) {
    this.selectedId.set(this.selectedId() === id ? null : id);
  }

  // ── Branch dropdown ──────────────────────────────────────────────────────
  fetchBranches() {
    const parsed = this.githubApi.parseRepoUrl(this.repoUrl);
    const t = this.token();
    if (!parsed || !t) {
      this.branches.set([]);
      return;
    }
    this.branchesLoading.set(true);
    this.githubApi.getBranches(parsed.owner, parsed.repo, t).subscribe({
      next: bs => {
        this.branches.set(bs.map(b => ({ name: b.name })));
        this.branchesLoading.set(false);
        const names = bs.map(b => b.name);
        if (names.length && !names.includes(this.headBranch)) {
          this.headBranch = names.includes('development') ? 'development' : names[0];
        }
        if (names.length && !names.includes(this.baseBranch)) {
          this.baseBranch = names.includes('main') ? 'main' : (names.find(n => n !== this.headBranch) ?? names[0]);
        }
      },
      error: () => {
        this.branches.set([]);
        this.branchesLoading.set(false);
      },
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────
  private setGitStep(id: string, status: StepStatus, detail = '') {
    const step = this.gitSteps().find(s => s.id === id);
    this.gitSteps.update(ss => ss.map(s => s.id === id ? { ...s, status, detail } : s));
    if (step) this.addLog(step.label, status, detail || step.sublabel);
  }

  private setPipeStep(id: string, status: StepStatus, detail = '') {
    const step = this.pipeSteps().find(s => s.id === id);
    this.pipeSteps.update(ss => ss.map(s => s.id === id ? { ...s, status, detail } : s));
    if (step) this.addLog(step.label, status, detail || step.sublabel);
  }

  private setDeployStep(id: string, status: StepStatus, detail = '') {
    const step = this.deploySteps().find(s => s.id === id);
    this.deploySteps.update(ss => ss.map(s => s.id === id ? { ...s, status, detail } : s));
    if (step) this.addLog(step.label, status, detail || step.sublabel);
  }

  private addLog(label: string, status: StepStatus, text: string) {
    this.log.update(l => [...l, { time: currentTimestamp(), label, status, text }]);
  }

  private addTerminal(type: string, text: string) {
    this.terminalLines.update(l => [...l, { type, text }]);
  }

  resetAll() {
    this.gitStarted.set(false);    this.gitRunning.set(false);    this.gitDone.set(false);
    this.pipeStarted.set(false);   this.pipeRunning.set(false);   this.pipeDone.set(false);
    this.deployStarted.set(false); this.deployRunning.set(false); this.deployDone.set(false);
    this.gitSteps.set(freshSteps(GIT_STEPS));
    this.pipeSteps.set(freshSteps(PIPE_STEPS));
    this.deploySteps.set(freshSteps(DEPLOY_STEPS));
    this.deployError.set('');
    this.deployLogs.set({});
    this.deployCmdLog.set({});
    this.deployStageTimestamps.set({});
    this.deployTerminalLines.set([]);
    this.deployStartedAt.set(null);
    this.terminalLines.set([]);
    this.log.set([]);
    this.prResult.set(null);
    this.selectedId.set(null);
  }

  async generateMessage() {
    if (!this.solutionFolder || this.generating()) return;
    this.generating.set(true);
    this.generateError.set('');
    try {
      const r = await fetch(`${GIT_SERVER_BASE}/api/git/generate-commit-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder: this.solutionFolder }),
      });
      const data = await r.json();
      if (r.ok && data.message) {
        this.description = data.message;
      } else {
        this.generateError.set(data.error ?? 'Generation failed');
      }
    } catch {
      this.generateError.set('Git server not reachable — restart with npm start');
    }
    this.generating.set(false);
  }

  // ══ ENTRY POINT ════════════════════════════════════════════════════════
  runAll() {
    localStorage.setItem('git_folder', this.solutionFolder);
    localStorage.setItem('git_repo',   this.repoUrl);
    this.resetAll();
    this.goToStep(3);

    this.gitStarted.set(true);
    this.gitRunning.set(true);
    this.setGitStep('build', 'running');

    this.gitPushSvc.streamBuild(this.solutionFolder).subscribe({
      next:     evt => this.handleBuildEvent(evt),
      error:    ()  => { this.gitRunning.set(false); },
      complete: ()  => {
        if (this.gitSteps().find(s => s.id === 'build')?.status === 'done') {
          this.startGitPush();
        } else {
          this.gitRunning.set(false);
        }
      },
    });
  }

  private startGitPush() {
    const message = this.description.trim() || `Update ${this.headBranch}`;
    this.gitPushSvc.streamGitPush(this.solutionFolder, this.headBranch, message, this.repoUrl).subscribe({
      next:     evt => this.handleGitPushEvent(evt),
      error:    ()  => { this.gitRunning.set(false); },
      complete: ()  => {
        this.gitRunning.set(false);
        this.gitDone.set(true);
        const allOk = this.gitSteps().every(s => s.status === 'done' || s.status === 'skipped');
        if (allOk) this.startPipeline();
      },
    });
  }

  private startPipeline() {
    const parsed = this.githubApi.parseRepoUrl(this.repoUrl);
    this.pipeStarted.set(true);
    this.pipeRunning.set(true);

    if (!parsed) {
      this.setPipeStep('validate', 'error', 'Invalid GitHub URL');
      this.pipeRunning.set(false); this.pipeDone.set(true); return;
    }

    const cfg: PipelineConfig = {
      owner:      parsed.owner,
      repo:       parsed.repo,
      token:      this.token(),
      headBranch: this.headBranch,
      baseBranch: this.baseBranch,
      description: this.description,
    };

    this.pipelineSvc.run(cfg).subscribe({
      next:     evt => this.handlePipelineEvent(evt),
      error:    ()  => { this.pipeRunning.set(false); this.pipeDone.set(true); },
      complete: ()  => { this.pipeRunning.set(false); this.pipeDone.set(true); },
    });
  }

  // ══ DEPLOY (manual — only enabled once the PR is merged) ══════════════
  deploy() {
    if (!this.canDeploy()) return;
    this.deployError.set('');
    this.deployStarted.set(true);
    this.deployRunning.set(true);
    this.deploySteps.set(freshSteps(DEPLOY_STEPS));
    this.deployLogs.set({});
    this.deployCmdLog.set({});
    this.deployStageTimestamps.set({});
    this.deployTerminalLines.set([]);
    this.deployStartedAt.set(Date.now());
    this.deployNowTick.set(Date.now());

    const ciBuild = this.deploySource() === 'ci' ? this.selectedCiBuild() : null;
    const request: DeployRequest = {
      projectId: this.selectedProjectId(),
      environment: this.selectedEnvironment(),
      folder: this.solutionFolder,
      buildSelectionId: this.selectedBuildOptionId() || undefined,
      confirmText: this.requiresApproval() ? this.confirmText().trim() : undefined,
      ...(ciBuild ? {
        ciArtifactId: ciBuild.artifactId,
        ciRunId: ciBuild.runId,
        ciSha: ciBuild.sha,
        ciBranch: ciBuild.branch,
        ciRunNumber: ciBuild.runNumber,
      } : {}),
    };

    this.deploySvc.streamDeploy(request).subscribe({
      next: evt => this.handleDeployEvent(evt),
      error: (err) => {
        this.deployRunning.set(false);
        this.deployCancelling.set(false);
        this.deployDone.set(true);
        this.deployNowTick.set(Date.now());
        if (err?.text) this.deployError.set(err.text);
        this.loadHistory();
      },
      complete: () => {
        this.deployRunning.set(false);
        this.deployCancelling.set(false);
        this.deployDone.set(true);
        this.deployNowTick.set(Date.now());
        this.loadHistory();
      },
    });
  }

  async cancelDeploy() {
    if (!this.deployRunning() || this.deployCancelling()) return;
    this.deployCancelling.set(true);
    try {
      await this.deploySvc.cancelDeploy(this.selectedProjectId(), this.selectedEnvironment());
    } catch {
      this.deployCancelling.set(false);
    }
  }

  /** Reset just the deploy card so another project/environment can be picked,
   *  without touching the separate git/PR pipeline state above it. */
  resetDeploy() {
    if (this.deployRunning()) return;
    this.deployStarted.set(false);
    this.deployRunning.set(false);
    this.deployDone.set(false);
    this.deploySteps.set(freshSteps(DEPLOY_STEPS));
    this.deployError.set('');
    this.deployLogs.set({});
    this.deployCmdLog.set({});
    this.deployStageTimestamps.set({});
    this.deployTerminalLines.set([]);
    this.deployStartedAt.set(null);
    this.confirmText.set('');
  }

  private touchDeployStageTimestamp(id: string, end: boolean) {
    this.deployStageTimestamps.update(m => ({
      ...m,
      [id]: { start: m[id]?.start ?? Date.now(), end: end ? Date.now() : (m[id]?.end ?? null) },
    }));
  }

  private pushTerminalLine(stageId: string, kind: DeployTerminalLine['kind'], text: string) {
    this.deployTerminalLines.update(l => [...l, { stageId, kind, text, at: Date.now() }]);
  }

  private handleDeployEvent(evt: DeployEvent) {
    switch (evt.type) {
      case 'step-start':
        this.deployCmdLog.update(m => ({ ...m, [evt.id]: [...(m[evt.id] ?? []), evt.cmd] }));
        this.touchDeployStageTimestamp(evt.id, false);
        this.setDeployStep(evt.id, 'running');
        if (evt.cmd) this.pushTerminalLine(evt.id, 'cmd', `$ ${evt.cmd}`);
        break;
      case 'stdout':
        this.deployLogs.update(m => ({ ...m, [evt.id]: [...(m[evt.id] ?? []), evt.text] }));
        this.pushTerminalLine(evt.id, 'stdout', evt.text);
        break;
      case 'stderr':
        this.deployLogs.update(m => ({ ...m, [evt.id]: [...(m[evt.id] ?? []), evt.text] }));
        this.pushTerminalLine(evt.id, 'stderr', evt.text);
        break;
      case 'step-end':
        this.touchDeployStageTimestamp(evt.id, true);
        this.setDeployStep(evt.id, evt.ok ? 'done' : 'error', evt.detail ?? '');
        break;
      case 'fatal':
        this.touchDeployStageTimestamp(evt.id, true);
        this.setDeployStep(evt.id, 'error', evt.text);
        this.deployError.set(evt.text);
        this.pushTerminalLine(evt.id, 'stderr', evt.text);
        break;
      case 'deploy-done':
        this.deployNowTick.set(Date.now());
        break;
    }
  }

  // ── Event handlers ──────────────────────────────────────────────────────
  private handleBuildEvent(evt: BuildEvent) {
    switch (evt.type) {
      case 'stdout':      this.addTerminal('tl-stdout', evt.text.trimEnd()); break;
      case 'stderr':      this.addTerminal('tl-stderr', evt.text.trimEnd()); break;
      case 'build-done':  this.setGitStep('build', 'done',  'Build succeeded'); break;
      case 'build-fatal': this.setGitStep('build', 'error', evt.text);          break;
    }
  }

  private handleGitPushEvent(evt: GitPushEvent) {
    switch (evt.type) {
      case 'step-start':
        this.setGitStep(evt.id, 'running');
        this.addTerminal('tl-cmd', `$ git ${evt.cmd.replace('git ', '')}`);
        break;
      case 'stdout':   this.addTerminal('tl-stdout', evt.text.trimEnd()); break;
      case 'stderr':   this.addTerminal('tl-stderr', evt.text.trimEnd()); break;
      case 'step-end':
        this.setGitStep(evt.id, evt.ok ? 'done' : 'error',
          evt.noop ? 'Nothing to commit — already up to date' : '');
        break;
      case 'fatal':    this.setGitStep(evt.id, 'error', evt.text); break;
      case 'git-done': break;
    }
  }

  private handlePipelineEvent(evt: PipelineEvent) {
    switch (evt.type) {
      case 'step-start':   this.setPipeStep(evt.id, 'running');          break;
      case 'step-running': this.setPipeStep(evt.id, 'running', evt.detail); break;
      case 'step-done':    this.setPipeStep(evt.id, 'done',    evt.detail); break;
      case 'step-skipped': this.setPipeStep(evt.id, 'skipped', evt.detail); break;
      case 'step-error':   this.setPipeStep(evt.id, 'error',   evt.detail); break;
      case 'pr-result':    this.prResult.set(evt.prResult);               break;
      case 'complete':     break;
    }
  }
}
