import type { Step } from '../models/pipeline.models';

export const GIT_STEPS: Omit<Step, 'status' | 'detail'>[] = [
  { id: 'build',    label: 'Build Solution',  sublabel: 'dotnet build — must pass before push' },
  { id: 'checkout', label: 'Checkout Branch', sublabel: 'Switch to source branch'              },
  { id: 'add',      label: 'Stage Changes',   sublabel: 'git add . — all files'               },
  { id: 'status',   label: 'Show Status',     sublabel: 'Confirm staged files'                },
  { id: 'commit',   label: 'Commit',          sublabel: 'Save snapshot with message'          },
  { id: 'push',     label: 'Push to GitHub',  sublabel: 'Upload to remote branch'             },
];

export const PIPE_STEPS: Omit<Step, 'status' | 'detail'>[] = [
  { id: 'validate',   label: 'Validate Repo',  sublabel: 'Check token & repo access'          },
  { id: 'branches',   label: 'Check Branches', sublabel: 'Verify branches & sync CI workflow' },
  { id: 'check-pr',   label: 'Detect PR',      sublabel: 'Find open pull request'             },
  { id: 'create-pr',  label: 'Create PR',      sublabel: 'Open or reuse pull request'         },
  { id: 'auto-merge', label: 'Auto-merge',     sublabel: 'Enable merge on CI pass'            },
  { id: 'monitor-ci', label: 'Monitor CI',     sublabel: 'Poll GitHub Actions status'         },
  { id: 'pr-merge',   label: 'PR Merged',      sublabel: 'Confirm merge into target branch'   },
];

export const DEPLOY_STEPS: Omit<Step, 'status' | 'detail'>[] = [
  { id: 'publish', label: 'Publish Build',       sublabel: 'Local build, or download + extract a CI artifact' },
  { id: 'stage',   label: 'Copy to Staging',     sublabel: 'robocopy output to staging share'          },
  { id: 'deploy',  label: 'Deploy on Server',    sublabel: 'Server pulls from staging + recycles pool' },
  { id: 'verify',  label: 'Verify Site',         sublabel: 'Health check after restart'                },
];
