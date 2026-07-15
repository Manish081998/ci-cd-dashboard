// ── Step UI types ──────────────────────────────────────────────────────────

export type StepStatus = 'idle' | 'running' | 'done' | 'error' | 'skipped';

export interface Step {
  id: string;
  label: string;
  sublabel: string;
  status: StepStatus;
  detail: string;
}

export interface LogEntry {
  time: string;
  label: string;
  status: StepStatus;
  text: string;
}

export interface PrResult {
  title: string;
  url: string;
  status: 'created' | 'exists';
  number: number;
  merged?: boolean;
}

// ── GitPushService event discriminated union ───────────────────────────────
// Maps to SSE events from the local express server (/api/dotnet/build)

export type BuildEvent =
  | { type: 'stdout';      text: string }
  | { type: 'stderr';      text: string }
  | { type: 'build-done' }
  | { type: 'build-fatal'; text: string };

// Maps to SSE events from the local express server (/api/git/push)
export type GitPushEvent =
  | { type: 'step-start'; id: string; cmd: string }
  | { type: 'stdout';     text: string }
  | { type: 'stderr';     text: string }
  | { type: 'step-end';   id: string; ok: boolean; noop?: boolean }
  | { type: 'fatal';      id: string; text: string }
  | { type: 'git-done' };

// ── PipelineService event discriminated union ──────────────────────────────

export type PipelineEvent =
  | { type: 'step-start';   id: string }
  | { type: 'step-running'; id: string; detail: string }
  | { type: 'step-done';    id: string; detail: string }
  | { type: 'step-skipped'; id: string; detail: string }
  | { type: 'step-error';   id: string; detail: string }
  | { type: 'pr-result';    prResult: PrResult }
  | { type: 'complete' };

export interface PipelineConfig {
  owner: string;
  repo: string;
  token: string;
  headBranch: string;
  baseBranch: string;
  description: string;
}

// ── DeployService event discriminated union ─────────────────────────────────
// Maps to SSE events from the local express server (/api/deploy/iis)

export type DeployEvent =
  | { type: 'step-start'; id: string; cmd: string }
  | { type: 'stdout';     id: string; text: string }
  | { type: 'stderr';     id: string; text: string }
  | { type: 'step-end';   id: string; ok: boolean; noop?: boolean; detail?: string }
  | { type: 'fatal';      id: string; text: string }
  | { type: 'deploy-done' };

// ── Deploy project registry — maps to GET /api/projects ─────────────────────

export interface DeployEnvironment {
  name: string;
  configured: boolean;
  requireApproval: boolean;
  hasBackup: boolean;
}

export interface DeployProject {
  id: string;
  name: string;
  type: 'angular' | 'dotnet' | 'node' | string;
  hasCiRepo: boolean;
  environments: DeployEnvironment[];
}

// Maps to GET /api/projects/:id/build-options
export interface BuildOption {
  id: string;
  label: string;
  kind: 'ng-configuration' | 'npm-script' | 'dotnet-configuration';
  configuration?: string;
  script?: string;
}

export interface DeployRequest {
  projectId: string;
  environment: string;
  folder: string;
  buildSelectionId?: string;
  confirmText?: string;
  // Set when deploying a GitHub Actions artifact instead of building locally
  // ("build once, deploy same artifact") — folder is still sent (some deploy
  // plumbing uses it as a working directory) but its build output is ignored.
  ciArtifactId?: number;
  ciRunId?: number | null;
  ciSha?: string | null;
  ciBranch?: string | null;
  ciRunNumber?: number | null;
}

// Maps to GET /api/projects/:id/ci-builds — a deployable GitHub Actions artifact
export interface CiBuild {
  artifactId: number;
  artifactName: string;
  runId: number | null;
  runNumber: number | null;
  htmlUrl: string;
  sha: string;
  shortSha: string;
  branch: string;
  commitMessage: string;
  createdAt: string;
  sizeInBytes: number;
}

// Maps to GET /api/deploy/audit
export interface DeployAuditEntry {
  time: string;
  user: string;
  projectId: string;
  projectName: string;
  environment: string;
  buildOption: string | null;
  source?: 'local' | 'ci';
  ci?: { runId: number | null; artifactId: number; sha: string | null; branch: string | null; runNumber: number | null } | null;
  outcome: 'success' | 'failed';
  stage: string;
  detail: string;
  durationMs: number;
}
