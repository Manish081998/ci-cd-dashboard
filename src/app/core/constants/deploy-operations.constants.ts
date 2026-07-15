// ── Advanced-view sub-operation catalog ─────────────────────────────────────
// server.js only ever reports 4 macro stages over SSE (publish/stage/deploy/
// verify — see DEPLOY_STEPS below). This catalog breaks each stage into the
// conceptual operations a deploy actually performs, for the Advanced View.
//
// Each op is either:
//  - `detect`: resolved from a REAL signal already streamed by the backend —
//    either the raw stdout/stderr text of that stage, or the `cmd` string
//    from that stage's step-start event(s). No backend change; this just
//    reads text the client already receives and previously discarded.
//  - no `detect`: there is no distinguishable backend signal for it (e.g.
//    the whole "Deploy on Server" stage is one opaque remote PowerShell
//    block with no intermediate output). These are time-estimated while
//    their parent stage is running, and always finalize to the stage's
//    real outcome once its step-end/fatal arrives — never invented as
//    "done" ahead of the server actually finishing that stage.

export interface DeployOperationDetect {
  kind: 'stdout' | 'cmd';
  pattern: RegExp;
}

export interface DeployOperationDef {
  id: string;
  label: string;
  detect?: DeployOperationDetect;
}

export interface DeployStageDef {
  id: string;
  label: string;
  operations: DeployOperationDef[];
}

export const DEPLOY_STAGE_OPERATIONS: DeployStageDef[] = [
  {
    id: 'publish',
    label: 'Publish Build',
    operations: [
      // step-start for 'publish' only fires after the server has already
      // validated the request and loaded the environment config
      // (server.js:858-877), so both are genuinely already true the moment
      // this stage's cmd text appears.
      { id: 'validate-request', label: 'Validate deployment request',   detect: { kind: 'cmd', pattern: /.+/ } },
      { id: 'load-env-config',  label: 'Load environment configuration', detect: { kind: 'cmd', pattern: /.+/ } },
      { id: 'restore-deps',     label: 'Restore dependencies',           detect: { kind: 'stdout', pattern: /restor/i } },
      { id: 'build-solution',   label: 'Build solution',                 detect: { kind: 'stdout', pattern: /build succeeded|compiled successfully|application bundle generation complete|webpack compiled successfully/i } },
      { id: 'publish-output',   label: 'Publish output' },
      { id: 'generate-artifacts', label: 'Generate artifacts' },
    ],
  },
  {
    id: 'stage',
    label: 'Copy to Staging',
    operations: [
      // buildStageScript (server.js:749-761) now brackets Compress-Archive and
      // Copy-Item -ToSession with Write-Output checkpoints, so all three of
      // these resolve from real stdout instead of a cmd-string guess.
      { id: 'compress-zip',      label: 'Compress build into ZIP', detect: { kind: 'stdout', pattern: /Compressing build output/i } },
      { id: 'validate-artifact', label: 'Validate artifact',      detect: { kind: 'stdout', pattern: /Compressed to .* MB/i } },
      { id: 'copy-to-staging',   label: 'Copy artifact to staging', detect: { kind: 'stdout', pattern: /Upload complete/i } },
    ],
  },
  {
    id: 'deploy',
    label: 'Deploy on Server',
    // buildDeployScript (server.js:770-793) now brackets each existing remote
    // statement with Write-Output checkpoints — PSRP streams them back live,
    // so these resolve from real stdout too. 'backup-existing' is dropped by
    // buildStageViews for environments with no backupPath configured (see
    // DeployEnvironment.hasBackup) rather than shown as a step that never
    // happens. 'apply-config' was removed — there's no such action in the
    // deploy script (the extracted package's config files ARE the config,
    // nothing transforms them). 'warm-up' has no backend action either and
    // stays the one honest, clearly-marked-estimated tail item.
    operations: [
      { id: 'backup-existing',  label: 'Backup existing deployment', detect: { kind: 'stdout', pattern: /Backup complete/i } },
      { id: 'stop-app-pool',    label: 'Stop IIS / App Pool',        detect: { kind: 'stdout', pattern: /Restarting app pool/i } },
      { id: 'copy-files',       label: 'Copy files to IIS',          detect: { kind: 'stdout', pattern: /Extraction complete/i } },
      { id: 'restart-app-pool', label: 'Restart IIS / App Pool',     detect: { kind: 'stdout', pattern: /App pool restarted/i } },
      { id: 'warm-up',          label: 'Warm up application' },
    ],
  },
  {
    id: 'verify',
    label: 'Verify Site',
    operations: [
      // step-start for 'verify' is always sent, even when healthCheckUrl is
      // unset (server.js:974-985), so this is a real signal either way.
      // 'cleanup'/'complete' resolve from the finally-block checkpoints added
      // around the existing cleanup/audit calls (server.js:1010-1035).
      { id: 'health-check',      label: 'Run health checks',          detect: { kind: 'cmd', pattern: /.*/ } },
      { id: 'verify-availability', label: 'Verify website availability' },
      { id: 'cleanup',           label: 'Clean temporary files',      detect: { kind: 'stdout', pattern: /Cleaning up temporary files/i } },
      { id: 'complete',          label: 'Complete deployment',        detect: { kind: 'stdout', pattern: /Deployment complete/i } },
    ],
  },
];

/** Fallback share of total deploy time per stage, used until real audit history exists. */
export const DEFAULT_STAGE_WEIGHTS: Record<string, number> = {
  publish: 0.55,
  stage: 0.15,
  deploy: 0.20,
  verify: 0.10,
};
