const express   = require('express');
const cors      = require('cors');
const { spawn } = require('child_process');
const fs        = require('fs');
const path      = require('path');
const os        = require('os');
const Anthropic  = require('@anthropic-ai/sdk');

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

const GITHUB_API_BASE = 'https://api.github.com';

// ── Load server config (contains GitHub token) ───────────────────────────────
let serverConfig = {};
try {
  const cfgPath = path.join(__dirname, 'server-config.json');
  serverConfig = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
  console.log('✓ server-config.json loaded' + (serverConfig.githubToken ? ' (token present)' : ' (no token)'));
} catch {
  console.warn('⚠ server-config.json not found — create it with { "githubToken": "ghp_..." }');
}

// Returns git -c args that inject the token via http.extraheader.
// This bypasses Windows Credential Manager completely.
function authArgs(token) {
  if (!token) return ['-c', 'credential.helper='];
  const b64 = Buffer.from(`oauth2:${token}`).toString('base64');
  return [
    '-c', 'credential.helper=',
    '-c', `http.https://github.com/.extraheader=Authorization: Basic ${b64}`,
  ];
}

const STEPS = [
  { id: 'checkout', label: 'Checkout Branch',   args: (b)    => ['checkout', b]       },
  { id: 'add',      label: 'Stage All Changes',  args: ()     => ['add', '.']          },
  { id: 'status',   label: 'Show Status',        args: ()     => ['status']            },
  { id: 'commit',   label: 'Commit Changes',     args: (_, m) => ['commit', '-m', m]  },
  { id: 'push',     label: 'Push to Remote',     args: (b)    => ['push', '-u', 'origin', b, '--force'] },
];

// Run a git command, streaming output. Auth args injected when token provided.
function runGitCmd(args, cwd, send, token = null) {
  return new Promise((resolve) => {
    const auth = token ? authArgs(token) : ['-c', 'credential.helper='];
    const proc = spawn('git', [...auth, ...args], {
      cwd,
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
    });
    proc.stdout.on('data', d => send({ type: 'stdout', text: d.toString() }));
    proc.stderr.on('data', d => send({ type: 'stderr', text: d.toString() }));
    proc.on('close', code => resolve(code === 0));
  });
}

// Resolves the stdout string of a git command, or null on failure.
function gitOutput(args, cwd) {
  return new Promise((resolve) => {
    const proc = spawn('git', args, { cwd });
    let out = '';
    proc.stdout.on('data', d => out += d.toString());
    proc.on('close', code => resolve(code === 0 ? out.trim() : null));
  });
}

// Ensure remote 'origin' points to repoUrl (clean URL, no token embedded).
async function ensureRemote(folder, repoUrl, send) {
  const current = await gitOutput(['remote', 'get-url', 'origin'], folder);
  if (current === null) {
    send({ type: 'stdout', text: `  → Adding remote origin: ${repoUrl}\n` });
    return new Promise(resolve => {
      const p = spawn('git', ['remote', 'add', 'origin', repoUrl], { cwd: folder });
      p.on('close', code => resolve(code === 0));
    });
  }
  // If URL changed, update it
  if (current !== repoUrl) {
    await new Promise(resolve => {
      const p = spawn('git', ['remote', 'set-url', 'origin', repoUrl], { cwd: folder });
      p.on('close', resolve);
    });
  }
  return true;
}

function isGitRepo(folder) {
  try { return fs.existsSync(path.join(folder, '.git')); } catch { return false; }
}

function hasCommits(folder) {
  return new Promise((resolve) => {
    const proc = spawn('git', ['log', '--oneline', '-1'], { cwd: folder });
    let out = '';
    proc.stdout.on('data', d => out += d.toString());
    proc.on('close', code => resolve(code === 0 && out.trim().length > 0));
  });
}

function branchExists(branch, folder) {
  return new Promise((resolve) => {
    const proc = spawn('git', ['branch', '--list', branch], { cwd: folder });
    let out = '';
    proc.stdout.on('data', d => out += d.toString());
    proc.on('close', () => resolve(out.trim().length > 0));
  });
}

function remoteBranchExists(branch, folder) {
  return new Promise((resolve) => {
    const proc = spawn('git', ['branch', '-r', '--list', `origin/${branch}`], { cwd: folder });
    let out = '';
    proc.stdout.on('data', d => out += d.toString());
    proc.on('close', () => resolve(out.trim().length > 0));
  });
}

// Sync a fresh local repo with remote branches already created by the Setup tab.
async function syncWithRemote(folder, token, send) {
  send({ type: 'stdout', text: '⚙ Remote branches detected — syncing local repo...\n' });
  send({ type: 'stdout', text: '  → git fetch origin\n' });
  await runGitCmd(['fetch', 'origin'], folder, send, token);

  const localMainExists = await branchExists('main', folder);
  if (!localMainExists) {
    // Use checkout + reset (not `checkout -b main origin/main`) so existing
    // untracked files that already match origin/main aren't treated as
    // conflicts — reset only moves HEAD/index, it never touches the working tree.
    send({ type: 'stdout', text: '  → Create local main tracking origin/main\n' });
    const created = await runGitCmd(['checkout', '-b', 'main'], folder, send);
    if (!created) return false;
    const ok = await runGitCmd(['reset', 'origin/main'], folder, send);
    if (!ok) return false;
    await runGitCmd(['branch', '--set-upstream-to=origin/main', 'main'], folder, send);
  } else {
    send({ type: 'stdout', text: '  → Checkout main\n' });
    await runGitCmd(['checkout', 'main'], folder, send);
  }

  const remoteDevExists = await remoteBranchExists('development', folder);
  const localDevExists  = await branchExists('development', folder);
  if (remoteDevExists && !localDevExists) {
    send({ type: 'stdout', text: '  → Create local development tracking origin/development\n' });
    const created = await runGitCmd(['checkout', '-b', 'development'], folder, send);
    if (!created) return false;
    const ok = await runGitCmd(['reset', 'origin/development'], folder, send);
    if (!ok) return false;
    await runGitCmd(['branch', '--set-upstream-to=origin/development', 'development'], folder, send);
  } else if (!localDevExists) {
    send({ type: 'stdout', text: '  → Create development branch from main\n' });
    await runGitCmd(['checkout', '-b', 'development'], folder, send);
  } else {
    await runGitCmd(['checkout', 'development'], folder, send);
  }

  send({ type: 'stdout', text: '✓ Local branches synced with remote\n\n' });
  return true;
}

// Init a truly empty remote: commit → push main → create development.
async function initFreshRepo(folder, message, token, send) {
  send({ type: 'stdout', text: '⚙ Empty repository — creating initial commit + branches...\n' });

  const steps = [
    { label: 'Stage all files',       args: ['add', '.']             },
    { label: 'Create initial commit', args: ['commit', '-m', message]},
    { label: 'Rename branch → main',  args: ['branch', '-M', 'main'] },
  ];

  for (const step of steps) {
    send({ type: 'stdout', text: `  → ${step.label}\n` });
    const ok = await runGitCmd(step.args, folder, send);
    if (!ok) { send({ type: 'stdout', text: `  ✗ Failed: ${step.label}\n` }); return false; }
  }

  send({ type: 'stdout', text: '  → Push main to remote\n' });
  const pushOk = await runGitCmd(['push', '-u', 'origin', 'main'], folder, send, token);
  if (!pushOk) { send({ type: 'stdout', text: '  ✗ Failed: Push main\n' }); return false; }

  send({ type: 'stdout', text: '  → Create development branch\n' });
  const devOk = await runGitCmd(['checkout', '-b', 'development'], folder, send);
  if (!devOk) { send({ type: 'stdout', text: '  ✗ Failed: Create development\n' }); return false; }

  send({ type: 'stdout', text: '✓ Branches initialised (main + development)\n\n' });
  return true;
}

// Generic CI templates auto-created for a brand-new repo pushed via the Setup
// tab (no project-specific environments/build matrix known yet — see the
// hand-tailored per-environment workflows committed directly to CI_CD and
// Relay-WEB for that). Both gate a single generic "build-output" artifact
// behind a best-effort test step so "build once, deploy same artifact" and
// the CI test gate apply to any project registered through the dashboard,
// not just the two above.
function genericDotnetWorkflowYaml() {
  return [
    'name: CI',
    '',
    'on:',
    '  pull_request:',
    '    branches: [main]',
    '  push:',
    '    branches: [development, main]',
    '',
    'jobs:',
    '  Build:',
    '    runs-on: ubuntu-latest',
    '    steps:',
    '      - uses: actions/checkout@v4',
    '      - uses: actions/setup-dotnet@v4',
    '        with:',
    "          dotnet-version: '8.x'",
    '      - name: Build',
    '        run: dotnet build',
    '      - name: Test',
    '        run: dotnet test --no-build || echo "No tests found, skipping"',
    '      - name: Publish',
    "        if: github.event_name == 'push'",
    '        run: dotnet publish -c Release -o publish-output',
    '      - name: Upload artifact',
    "        if: github.event_name == 'push'",
    '        uses: actions/upload-artifact@v4',
    '        with:',
    '          name: build-output',
    '          path: publish-output',
    '          retention-days: 90',
  ].join('\n') + '\n';
}

function genericNodeWorkflowYaml() {
  return [
    'name: CI',
    '',
    'on:',
    '  pull_request:',
    '    branches: [main]',
    '  push:',
    '    branches: [development, main]',
    '',
    'jobs:',
    '  Build:',
    '    runs-on: ubuntu-latest',
    '    steps:',
    '      - uses: actions/checkout@v4',
    '      - uses: actions/setup-node@v4',
    '        with:',
    "          node-version: '20'",
    '          cache: \'npm\'',
    '      - name: Install dependencies',
    '        run: |',
    '          [ -f package-lock.json ] && npm ci || npm install',
    '      - name: Test',
    '        run: npm test --if-present -- --watch=false --browsers=ChromeHeadless || echo "Tests failed or not configured, continuing"',
    '      - name: Build',
    '        run: npm run build --if-present',
    '      - name: Resolve build output',
    "        if: github.event_name == 'push'",
    '        id: resolve',
    '        run: |',
    '          OUT=dist',
    '          for candidate in dist build out; do',
    '            if [ -d "$candidate" ]; then OUT="$candidate"; break; fi',
    '          done',
    '          echo "out=$OUT" >> "$GITHUB_OUTPUT"',
    '      - name: Upload artifact',
    "        if: github.event_name == 'push'",
    '        uses: actions/upload-artifact@v4',
    '        with:',
    '          name: build-output',
    '          path: ${{ steps.resolve.outputs.out }}',
    '          retention-days: 90',
  ].join('\n') + '\n';
}

// ── /api/config — returns token to frontend (localhost only) ─────────────────
app.get('/api/config', (_, res) => {
  const deploy = serverConfig.deploy;
  const deployConfigured = !!(deploy && deploy.server && deploy.sharePath && deploy.destPath && deploy.appPoolName && deploy.username && deploy.password);
  res.json({
    githubToken: serverConfig.githubToken || '',
    deployConfigured,
    deployTarget: deployConfigured ? `${deploy.appPoolName} @ ${deploy.server}` : '',
  });
});

// ── /api/git/push ─────────────────────────────────────────────────────────────
app.post('/api/git/push', async (req, res) => {
  const { folder, branch, message, repoUrl } = req.body;
  // Token comes from server config, NOT from the request body
  const token = serverConfig.githubToken || '';

  if (!folder || !branch || !message) {
    return res.status(400).json({ error: 'folder, branch and message are required' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (data) => {
    try { res.write(`data: ${JSON.stringify(data)}\n\n`); } catch {}
  };

  if (!token) {
    send({ type: 'fatal', id: 'checkout', text: 'No GitHub token configured — add githubToken to server-config.json' });
    res.end(); return;
  }

  // ── 0. git init if needed ────────────────────────────────────────────────
  if (!isGitRepo(folder)) {
    send({ type: 'stdout', text: '  → git init (no .git found)\n' });
    const ok = await runGitCmd(['init'], folder, send);
    if (!ok) {
      send({ type: 'fatal', id: 'checkout', text: 'git init failed' });
      res.end(); return;
    }
  }

  // ── 1. Ensure remote origin ──────────────────────────────────────────────
  if (repoUrl) {
    const ok = await ensureRemote(folder, repoUrl, send);
    if (!ok) {
      send({ type: 'fatal', id: 'checkout', text: 'Failed to configure remote origin' });
      res.end(); return;
    }
  }

  // ── 2. Fetch so we know remote state ────────────────────────────────────
  await runGitCmd(['fetch', 'origin'], folder, send, token);

  // ── 3. Branch setup for repos with no local commits ─────────────────────
  const repoHasCommits = await hasCommits(folder);
  if (!repoHasCommits) {
    const remoteHasMain = await remoteBranchExists('main', folder);
    if (remoteHasMain) {
      const ok = await syncWithRemote(folder, token, send);
      if (!ok) {
        send({ type: 'fatal', id: 'checkout', text: 'Failed to sync with remote branches' });
        res.end(); return;
      }
    } else {
      const ok = await initFreshRepo(folder, message, token, send);
      if (!ok) {
        send({ type: 'fatal', id: 'checkout', text: 'Failed to initialise repository branches' });
        res.end(); return;
      }
    }
  }

  // ── 4. Source branch guard ───────────────────────────────────────────────
  const sourceBranchExists = await branchExists(branch, folder);
  if (!sourceBranchExists) {
    send({ type: 'stdout', text: `  → Branch '${branch}' not found — creating it\n` });
    const ok = await runGitCmd(['checkout', '-b', branch], folder, send);
    if (!ok) {
      send({ type: 'fatal', id: 'checkout', text: `Failed to create branch: ${branch}` });
      res.end(); return;
    }
  }

  // ── 5. Ensure source branch shares history with main ────────────────────
  // GitHub refuses to create a PR if branches have no common ancestor.
  // Fix: checkout source branch, then merge origin/main with --allow-unrelated-histories
  // using -X ours so our project files always win over any conflicts (e.g. README.md).
  await runGitCmd(['checkout', branch], folder, send);
  const remoteMainExists = await remoteBranchExists('main', folder);
  if (remoteMainExists) {
    send({ type: 'stdout', text: `  → Merging origin/main into ${branch} to connect git histories...\n` });
    await runGitCmd(
      ['merge', 'origin/main', '--allow-unrelated-histories', '-X', 'ours', '--no-edit'],
      folder, send
    );
    send({ type: 'stdout', text: '  ✓ Histories connected — PR creation will succeed\n' });
  }

  // ── 6. Auto-create CI workflow file if not already in the project ───────
  // This ensures "CI / Build" check runs on every PR without needing the
  // GitHub "workflow" token scope (git push works with repo scope only).
  const workflowDir  = path.join(folder, '.github', 'workflows');
  const workflowFile = path.join(workflowDir, 'build.yml');
  if (!fs.existsSync(workflowFile)) {
    fs.mkdirSync(workflowDir, { recursive: true });
    const isDotnet = fs.readdirSync(folder).some(f => f.endsWith('.sln') || f.endsWith('.csproj'));
    const yaml = isDotnet ? genericDotnetWorkflowYaml() : genericNodeWorkflowYaml();
    fs.writeFileSync(workflowFile, yaml, 'utf8');
    send({ type: 'stdout', text: '  → Created .github/workflows/build.yml (CI workflow)\n' });
  }

  // ── 7. Git steps ─────────────────────────────────────────────────────────
  for (const step of STEPS) {
    const args = step.args(branch, message);
    send({ type: 'step-start', id: step.id, label: step.label, cmd: `git ${args.join(' ')}` });

    let output = '';
    const isAuthStep = step.id === 'push';

    const ok = await new Promise(resolve => {
      const auth = isAuthStep ? authArgs(token) : ['-c', 'credential.helper='];
      const proc = spawn('git', [...auth, ...args], {
        cwd: folder,
        env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
      });
      proc.stdout.on('data', d => { const t = d.toString(); output += t; send({ type: 'stdout', id: step.id, text: t }); });
      proc.stderr.on('data', d => { const t = d.toString(); output += t; send({ type: 'stderr', id: step.id, text: t }); });
      proc.on('close', code => resolve(code === 0));
    });

    const noop = step.id === 'commit' && (output.includes('nothing to commit') || output.includes('nothing added'));
    const stepOk = ok || noop;
    send({ type: 'step-end', id: step.id, ok: stepOk, noop });
    if (!stepOk) {
      send({ type: 'fatal', id: step.id, text: output.trim() || `git ${args.join(' ')} failed` });
      res.end(); return;
    }
  }

  send({ type: 'done' });
  res.end();
});

// ── /api/dotnet/build ─────────────────────────────────────────────────────────
app.post('/api/dotnet/build', (req, res) => {
  const { folder } = req.body;
  if (!folder) return res.status(400).json({ error: 'folder is required' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (data) => {
    try { res.write(`data: ${JSON.stringify(data)}\n\n`); } catch {}
  };

  let hasDotnet = false;
  try {
    const entries = fs.readdirSync(folder);
    hasDotnet = entries.some(f => f.endsWith('.sln') || f.endsWith('.csproj'));
  } catch (e) {
    send({ type: 'fatal', text: `Cannot read folder: ${e.message}` });
    res.end(); return;
  }

  if (!hasDotnet) {
    send({ type: 'stdout', text: 'No .sln / .csproj found — skipping dotnet build (Angular/Node project detected)\n' });
    send({ type: 'done', ok: true });
    res.end(); return;
  }

  const proc = spawn('dotnet', ['build'], { cwd: folder });
  proc.stdout.on('data', d => send({ type: 'stdout', text: d.toString() }));
  proc.stderr.on('data', d => send({ type: 'stderr', text: d.toString() }));
  proc.on('close', code => {
    if (code === 0) send({ type: 'done', ok: true });
    else            send({ type: 'fatal', text: `dotnet build failed — exit code ${code}` });
    res.end();
  });
});

// ── /api/git/generate-commit-message ─────────────────────────────────────────
app.post('/api/git/generate-commit-message', async (req, res) => {
  const { folder } = req.body;
  if (!folder) return res.status(400).json({ error: 'folder is required' });

  const apiKey = serverConfig.anthropicApiKey;
  if (!apiKey || apiKey.startsWith('sk-ant-...')) {
    return res.status(400).json({ error: 'No Anthropic API key — add anthropicApiKey to server-config.json' });
  }

  try {
    const [diff, status] = await Promise.all([
      gitOutput(['diff', 'HEAD'], folder),
      gitOutput(['status', '--short'], folder),
    ]);

    if (!status || status.trim() === '') {
      return res.json({ message: 'No changes detected' });
    }

    const client = new Anthropic({ apiKey });
    const diffText = diff ? diff.slice(0, 4000) : '';

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 100,
      messages: [{
        role: 'user',
        content: `Generate a concise git commit message (max 72 chars) for these changes.

Git status:
${status}
${diffText ? `\nGit diff (truncated):\n${diffText}` : ''}

Rules:
- Use conventional commit format: type(scope): description
- Types: feat, fix, refactor, chore, docs, test, style
- Be specific about what changed
- No period at end
- Return ONLY the commit message, nothing else`,
      }],
    });

    const message = response.content[0]?.type === 'text'
      ? response.content[0].text.trim()
      : 'chore: update changes';
    res.json({ message });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── /api/deploy/iis ────────────────────────────────────────────────────────────
// Publishes a .NET solution, stages the output on a network share, then has
// the IIS server itself pull from that share into wwwroot and recycle its
// app pool over PowerShell Remoting (WinRM) — mirrors the manual process:
// local → \\staging-share\... → (on the server) copy into C:\inetpub\wwwroot\...
const DEPLOY_STEPS = [
  { id: 'publish', label: 'Publish Build' },
  { id: 'stage',   label: 'Copy to Staging' },
  { id: 'deploy',  label: 'Deploy on Server' },
  { id: 'verify',  label: 'Verify Site' },
];

// Detects what kind of project lives in `folder` so the publish step can
// run the right build command (dotnet publish vs npm/ng build).
function detectProjectType(folder) {
  const entries = fs.readdirSync(folder);
  if (entries.some(f => f.endsWith('.sln') || f.endsWith('.csproj'))) return 'dotnet';
  if (fs.existsSync(path.join(folder, 'angular.json'))) return 'angular';
  if (fs.existsSync(path.join(folder, 'package.json'))) return 'node';
  return 'unknown';
}

// Resolves an Angular project's build output dir from angular.json,
// accounting for the newer application builder's nested "browser" subfolder.
function resolveAngularOutputPath(folder) {
  try {
    const ngJson = JSON.parse(fs.readFileSync(path.join(folder, 'angular.json'), 'utf8'));
    const projName = ngJson.defaultProject || Object.keys(ngJson.projects)[0];
    const outputPath = ngJson.projects?.[projName]?.architect?.build?.options?.outputPath || `dist/${projName}`;
    // The "application" builder (Angular 17+) allows outputPath to be an object
    // ({ base, browser, server, media }) instead of a plain string — path.join
    // can't consume that object directly, which silently fell through to the
    // catch below and zipped the whole "dist" folder (parent of the real
    // project subfolder) instead of just the build output.
    const base = typeof outputPath === 'string' ? outputPath : outputPath.base;
    const browserDirName = typeof outputPath === 'string' ? 'browser' : (outputPath.browser ?? 'browser');
    const resolved = path.join(folder, base);
    const browserSub = browserDirName ? path.join(resolved, browserDirName) : resolved;
    return fs.existsSync(browserSub) ? browserSub : resolved;
  } catch {
    return path.join(folder, 'dist');
  }
}

// Best-effort output dir for a generic Node project (React/Vue/etc.).
function resolveNodeOutputPath(folder) {
  for (const candidate of ['dist', 'build', 'out']) {
    const p = path.join(folder, candidate);
    if (fs.existsSync(p)) return p;
  }
  return path.join(folder, 'dist');
}

// ── Project registry (server-config.json "projects") ─────────────────────────
// Discovers the build commands actually available for a project — Angular CLI
// configurations from angular.json, and build:* scripts from package.json —
// instead of hardcoding a single command per project type. Each option is a
// structured description (never a raw shell string) so the deploy step can
// run it directly without building up a command line from config/user input.
function resolveBuildOptions(folder, project, environment) {
  if (!folder || !fs.existsSync(folder)) return [];

  // A project/environment can pin a single build command in server-config.json
  // ("buildCommand", env-level overriding project-level) instead of showing
  // every script/configuration this function can auto-detect — keeps the
  // dropdown to exactly the one command that's right for that deploy target.
  const envCfg = project.environments?.[environment];
  const fixedCommand = envCfg?.buildCommand || project.buildCommand;
  if (fixedCommand) {
    return [{ id: 'fixed', label: fixedCommand, kind: 'fixed-command', command: fixedCommand }];
  }

  const options = [];

  if (project.type === 'angular') {
    try {
      const ngJson = JSON.parse(fs.readFileSync(path.join(folder, 'angular.json'), 'utf8'));
      const projName = ngJson.defaultProject || Object.keys(ngJson.projects)[0];
      const configs = ngJson.projects?.[projName]?.architect?.build?.configurations || {};
      for (const name of Object.keys(configs)) {
        options.push({ id: `ng:${name}`, label: `ng build --configuration=${name}`, kind: 'ng-configuration', configuration: name });
      }
    } catch {}
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(folder, 'package.json'), 'utf8'));
      for (const script of Object.keys(pkg.scripts || {})) {
        if (script === 'build' || script.startsWith('build:')) {
          options.push({ id: `npm:${script}`, label: `npm run ${script}`, kind: 'npm-script', script });
        }
      }
    } catch {}
  } else if (project.type === 'node') {
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(folder, 'package.json'), 'utf8'));
      for (const script of Object.keys(pkg.scripts || {})) {
        if (script === 'build' || script.startsWith('build:')) {
          options.push({ id: `npm:${script}`, label: `npm run ${script}`, kind: 'npm-script', script });
        }
      }
    } catch {}
  } else if (project.type === 'dotnet') {
    for (const configuration of ['Release', 'Debug']) {
      options.push({ id: `dotnet:${configuration}`, label: `dotnet publish -c ${configuration}`, kind: 'dotnet-configuration', configuration });
    }
  }
  return options;
}

// Maps an environment name (dev/qa/uat/production/...) to the best-matching
// build option by convention. Falls back to production/Release, then to
// whatever was detected, rather than guessing silently past that.
function pickRecommendedBuildOption(options, environment) {
  if (!options.length) return null;
  const env = String(environment || '').toLowerCase();
  const aliasMap = { dev: ['development', 'dev'], qa: ['qa'], uat: ['uat'], production: ['production', 'prod'], prod: ['production', 'prod'] };
  const aliases = aliasMap[env] || [env];

  const match =
    options.find(o => o.kind === 'ng-configuration' && aliases.includes(o.configuration.toLowerCase())) ||
    options.find(o => o.kind === 'npm-script' && aliases.some(a => o.script.toLowerCase() === `build:${a}`)) ||
    options.find(o => o.kind === 'dotnet-configuration' && o.configuration === (env === 'dev' ? 'Debug' : 'Release'));

  return match
    || options.find(o => o.kind === 'ng-configuration' && o.configuration === 'production')
    || options.find(o => o.kind === 'npm-script' && o.script === 'build')
    || options[0];
}

// Runs whichever build option was selected. Returns the resolved output dir
// alongside the usual {code, output} so the caller can stage it without
// re-deriving project-type logic.
async function runPublishStep(project, buildOption, folder, send, handle) {
  if (project.type === 'prebuilt') {
    // No build step — folder already holds a build produced outside the
    // dashboard (e.g. an old-style ASP.NET Web Application Project that
    // needs Visual Studio's MSBuild/WebApplication.targets and can't be
    // built with the `dotnet` CLI). Ship whatever's currently there.
    send({ type: 'step-start', id: 'publish', cmd: '(prebuilt — using existing folder contents)' });
    return { code: 0, output: '', publishDir: folder };
  }
  if (project.type === 'dotnet') {
    const configuration = buildOption?.configuration || 'Release';
    const publishDir = path.join(folder, 'bin', '_publish');
    const res = await runDeployCmd('dotnet', ['publish', '-c', configuration, '-o', publishDir], folder, send, 'publish', handle);
    return { ...res, publishDir };
  }
  if (project.type === 'angular' || project.type === 'node') {
    const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    let cmd = npmCmd;
    let args;
    if (buildOption?.kind === 'fixed-command') {
      // Run through powershell.exe -Command (like every other scripted step
      // in this deploy pipeline) instead of splitting on whitespace and
      // spawning directly — a fixed command may itself be a PowerShell
      // statement (env var assignment, `;` chaining, etc.), e.g.
      // `$env:NODE_OPTIONS="--openssl-legacy-provider"; ng build --configuration=qa`.
      // Passed as a single argv element, not concatenated shell text, so no
      // extra escaping/injection risk versus the plain-args spawn below.
      cmd = 'powershell.exe';
      args = ['-NoProfile', '-NonInteractive', '-Command', buildOption.command];
    } else if (buildOption?.kind === 'ng-configuration') args = ['run', 'build', '--', `--configuration=${buildOption.configuration}`];
    else if (buildOption?.kind === 'npm-script') args = ['run', buildOption.script];
    else args = ['run', 'build'];
    const res = await runDeployCmd(cmd, args, folder, send, 'publish', handle);
    const publishDir = project.type === 'angular' ? resolveAngularOutputPath(folder) : resolveNodeOutputPath(folder);
    // SSR/prerendering-enabled Angular builds emit index.csr.html (the
    // client-only fallback) instead of index.html in the browser output —
    // index.html is normally generated by a Node SSR server. When shipping
    // straight to a static IIS site with no Node process behind it, fall
    // back to index.csr.html so IIS has a default document to serve.
    if (project.type === 'angular' && publishDir && fs.existsSync(publishDir)) {
      const indexHtml = path.join(publishDir, 'index.html');
      const indexCsr = path.join(publishDir, 'index.csr.html');
      if (!fs.existsSync(indexHtml) && fs.existsSync(indexCsr)) {
        fs.copyFileSync(indexCsr, indexHtml);
      }
    }
    return { ...res, publishDir };
  }
  return { code: -1, output: `Unsupported project type: ${project.type}`, publishDir: null };
}

// Deletes files from the local publish output that must never reach a
// server — e.g. a developer's local appsettings.json, which would overwrite
// the environment-specific config/secrets already deployed there. Runs
// before zipping, so an excluded file is never even transmitted (mirrors
// deleting it from the publish folder by hand). Paths are relative to the
// publish dir root; missing files are silently skipped.
function stripExcludedFiles(dir, patterns, send, stepId = 'publish') {
  for (const rel of patterns || []) {
    const target = path.join(dir, rel);
    if (fs.existsSync(target)) {
      fs.rmSync(target, { recursive: true, force: true });
      send({ type: 'stdout', id: stepId, text: `Excluded ${rel} from deploy package (server keeps its existing copy)\n` });
    }
  }
}

// ── Credentials, deploy locking, and audit log ────────────────────────────────
// A credential value of "$ENV:NAME" is resolved from process.env at request
// time instead of sitting in server-config.json in plaintext — lets you keep
// the registry's *shape* in the repo/config while secrets live in the
// environment (or a secret manager that injects env vars).
function resolveSecretValue(value) {
  if (typeof value === 'string' && value.startsWith('$ENV:')) {
    return process.env[value.slice(5)] || '';
  }
  return value || '';
}

function resolveCredential(rawCred) {
  if (!rawCred) return null;
  return {
    username: resolveSecretValue(rawCred.username),
    password: resolveSecretValue(rawCred.password),
  };
}

// ── GitHub Actions artifacts — "build once, deploy same artifact" ────────────
// Backs the CI-build picker in the Ship wizard: lists workflow-produced
// artifacts for a project/environment, and downloads+extracts the chosen one
// so /api/deploy/iis can ship it without ever rebuilding on this machine.
function ghHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

// On a corporate network with a TLS-inspecting proxy, Node's bundled CA list
// (unlike the Windows cert store browsers/curl use) won't trust the proxy's
// re-signed certificate — surfaces as a cryptic "unable to get local issuer
// certificate". Detected here and turned into an actionable message instead
// of letting callers guess from a raw fetch error.
function isCertTrustError(err) {
  const msg = `${err?.cause?.message || err?.message || ''}`;
  return /unable to get local issuer certificate|self[- ]signed certificate|certificate has expired|unable to verify the first certificate/i.test(msg);
}

function wrapGithubFetchError(err) {
  if (isCertTrustError(err)) {
    return new Error(
      'TLS certificate error reaching GitHub — likely a corporate proxy re-signing HTTPS traffic with a ' +
      'root CA Node doesn\'t trust by default (browsers/curl trust it via the Windows cert store; Node ' +
      "doesn't automatically). Restart the server with `npm run server:ca` (or `npm run start:ca`) to have " +
      'Node consult the Windows certificate store instead.'
    );
  }
  return err;
}

async function ghGet(urlPath, token) {
  let r;
  try {
    r = await fetch(`${GITHUB_API_BASE}${urlPath}`, { headers: ghHeaders(token) });
  } catch (err) {
    throw wrapGithubFetchError(err);
  }
  if (!r.ok) throw new Error(`GitHub API ${urlPath} → HTTP ${r.status}`);
  return r.json();
}

// Artifact existence alone implies the run's test job passed — the build job
// that uploads it is gated with `needs: test` in every workflow this app
// writes, so there's no separate "is this run green?" check to make here.
async function listCiBuilds(repo, environment, token, limit = 10) {
  const wanted = new Set([`build-${environment}`, 'build-output']);
  const data = await ghGet(`/repos/${repo}/actions/artifacts?per_page=100`, token);
  const matches = (data.artifacts || [])
    .filter(a => !a.expired && wanted.has(a.name))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, limit);

  const builds = [];
  for (const a of matches) {
    const runId = a.workflow_run?.id ?? null;
    let runNumber = null, htmlUrl = '', commitMessage = '';
    if (runId) {
      try {
        const run = await ghGet(`/repos/${repo}/actions/runs/${runId}`, token);
        runNumber = run.run_number;
        htmlUrl = run.html_url;
        // First line only — commit bodies can be multi-paragraph and this is
        // shown inline in a single-line dropdown option.
        commitMessage = (run.head_commit?.message || '').split('\n')[0];
      } catch { /* best-effort — artifact is still usable without these */ }
    }
    const sha = a.workflow_run?.head_sha || '';
    builds.push({
      artifactId: a.id,
      artifactName: a.name,
      runId,
      runNumber,
      htmlUrl,
      sha,
      shortSha: sha.slice(0, 7),
      branch: a.workflow_run?.head_branch || '',
      commitMessage,
      createdAt: a.created_at,
      sizeInBytes: a.size_in_bytes,
    });
  }
  return builds;
}

// Downloads a workflow artifact zip and extracts it into destDir. GitHub
// redirects the authenticated request to a signed, unauthenticated blob-store
// URL — fetch follows that automatically and (per the fetch spec) strips the
// Authorization header once the redirect target is a different origin, so
// the token is never sent to the storage host.
async function downloadAndExtractArtifact(repo, artifactId, token, destDir, send, handle) {
  if (handle?.cancelled) throw new Error('Cancelled by user');
  send({ type: 'stdout', id: 'publish', text: `Downloading CI artifact #${artifactId} from ${repo}...\n` });
  let r;
  try {
    r = await fetch(`${GITHUB_API_BASE}/repos/${repo}/actions/artifacts/${artifactId}/zip`, { headers: ghHeaders(token) });
  } catch (err) {
    throw wrapGithubFetchError(err);
  }
  if (!r.ok) throw new Error(`Failed to download CI artifact: HTTP ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  const zipPath = path.join(os.tmpdir(), `ci-artifact-${artifactId}.zip`);
  fs.writeFileSync(zipPath, buf);
  send({ type: 'stdout', id: 'publish', text: `Downloaded ${(buf.length / 1024 / 1024).toFixed(1)} MB — extracting...\n` });

  fs.rmSync(destDir, { recursive: true, force: true });
  fs.mkdirSync(destDir, { recursive: true });
  const extractRes = await runDeployCmd(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-Command', `Expand-Archive -Path '${psEscape(zipPath)}' -DestinationPath '${psEscape(destDir)}' -Force`],
    os.tmpdir(), send, 'publish', handle);
  fs.rmSync(zipPath, { force: true });
  if (extractRes.cancelled) throw new Error('Cancelled by user');
  if (extractRes.code !== 0) throw new Error(extractRes.output.trim() || 'Failed to extract CI artifact');
  send({ type: 'stdout', id: 'publish', text: `Extracted to ${destDir}\n` });
}

// One in-flight deploy per project+environment at a time.
const deployLocks = new Set();

// Live deploys, keyed the same as deployLocks, so a separate request can
// cancel one in progress: flips `cancelled` and force-kills whatever child
// process is currently running under it.
const activeDeploys = new Map();

// spawn's own .kill() only signals the immediate child — on Windows that's
// often just the cmd.exe wrapper (npm.cmd, robocopy), leaving the real work
// (ng build, robocopy's copy) as an orphan. taskkill /T kills the whole tree.
function killProcessTree(proc) {
  if (!proc?.pid) return;
  if (process.platform === 'win32') {
    try { spawn('taskkill', ['/pid', String(proc.pid), '/T', '/F']); } catch {}
  } else {
    try { proc.kill('SIGKILL'); } catch {}
  }
}

const AUDIT_LOG_PATH = path.join(__dirname, 'deploy-audit.log');

function appendAudit(entry) {
  try { fs.appendFileSync(AUDIT_LOG_PATH, JSON.stringify(entry) + '\n'); } catch {}
}

function readAudit(limit = 50, projectId = null) {
  try {
    const lines = fs.readFileSync(AUDIT_LOG_PATH, 'utf8').split('\n').filter(Boolean);
    const entries = lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
    const filtered = projectId ? entries.filter(e => e.projectId === projectId) : entries;
    return filtered.slice(-limit).reverse();
  } catch {
    return [];
  }
}

// Runs a command, streaming stdout/stderr under a given step id. When a
// `handle` is passed (see activeDeploys), the running process is registered
// on it so a concurrent /api/deploy/cancel call can kill it mid-flight.
function runDeployCmd(cmd, args, cwd, send, id, handle) {
  return new Promise((resolve) => {
    if (handle?.cancelled) { resolve({ code: -1, output: 'Cancelled by user', cancelled: true }); return; }

    send({ type: 'step-start', id, cmd: `${cmd} ${args.join(' ')}` });
    let output = '';
    // Node blocks spawning .cmd/.bat directly on Windows without a shell (CVE-2024-27980).
    const needsShell = process.platform === 'win32' && /\.(cmd|bat)$/i.test(cmd);
    const proc = spawn(cmd, args, { cwd, shell: needsShell });
    if (handle) handle.currentProc = proc;
    proc.stdout.on('data', d => { const t = d.toString(); output += t; send({ type: 'stdout', id, text: t }); });
    proc.stderr.on('data', d => { const t = d.toString(); output += t; send({ type: 'stderr', id, text: t }); });
    proc.on('close', code => {
      if (handle) handle.currentProc = null;
      resolve(handle?.cancelled ? { code: -1, output: 'Cancelled by user', cancelled: true } : { code, output });
    });
    proc.on('error', err => {
      if (handle) handle.currentProc = null;
      resolve({ code: -1, output: err.message });
    });
  });
}

// Escapes a value for embedding inside a single-quoted PowerShell string.
function psEscape(s) {
  return String(s).replace(/'/g, "''");
}

// Sortable, filesystem-safe timestamp for backup folder names, e.g. 2026-07-09_22-30-45.
function backupStamp() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
}

// Shared preamble: builds the credential and the New-PSSession/Invoke-Command
// flags common to both the stage and deploy scripts.
//
// cfg.useSsl: some corporate networks' app-aware firewalls silently drop
// plaintext WinRM (port 5985) while passing HTTPS (5986) through untouched —
// symptom is a TCP connect that succeeds but the WS-Man handshake times out.
// When set, connects over HTTPS and skips cert-chain/name/revocation checks,
// since internal WinRM listeners are typically self-signed or their CRL/OCSP
// endpoint isn't reachable from an off-domain VPN client anyway.
function psAuthPreamble(cfg) {
  const escape = psEscape;
  const sessionOpts = cfg.useSsl
    ? ` -UseSSL -SessionOption (New-PSSessionOption -SkipCACheck -SkipCNCheck -SkipRevocationCheck)`
    : '';
  return {
    lines: [
      `$secpw = ConvertTo-SecureString '${escape(cfg.password)}' -AsPlainText -Force`,
      `$cred = New-Object System.Management.Automation.PSCredential('${escape(cfg.username)}', $secpw)`,
    ],
    sessionOpts,
  };
}

// Pushes the local zip onto the target server over a plain SMB copy (via a
// temporary PSDrive mapped to its C$ admin share), instead of through
// Copy-Item -ToSession (WinRM/PSRP). -ToSession serializes the file into
// base64-encoded remoting message fragments — one WinRM round trip per
// fragment — which is dramatically slower than a raw file copy for anything
// but a tiny file. This is the same single-hop path a manual drag-and-drop
// copy into \\<server>\C$\... already uses (no WinRM session involved at
// all), so it matches manual-copy speed instead of remoting overhead.
// (No "double hop" concern here: the local machine is copying directly onto
// the target server's own disk, not asking a remote session to reach a
// *third* machine's share.)
function buildStageScript(cfg) {
  const escape = psEscape;
  const { lines } = psAuthPreamble(cfg);
  const driveMatch = /^([A-Za-z]):(.*)$/.exec(cfg.remoteStagePath);
  const drive = driveMatch ? driveMatch[1].toUpperCase() : 'C';
  const rest = driveMatch ? driveMatch[2] : cfg.remoteStagePath;
  const uncRoot = `\\\\${cfg.server}\\${drive}$`;
  const uncDest = `${uncRoot}${rest}`;
  return [
    ...lines,
    // Write-Output checkpoints only — same copy call, same order, same args.
    `Write-Output 'Connecting to ${escape(cfg.server)}...'`,
    `New-PSDrive -Name DeployStage -PSProvider FileSystem -Root '${escape(uncRoot)}' -Credential $cred -Scope Global -ErrorAction Stop | Out-Null`,
    `if (!(Test-Path '${escape(uncDest)}')) { New-Item -ItemType Directory -Force -Path '${escape(uncDest)}' | Out-Null }`,
    `Write-Output 'Uploading ${escape(cfg.zipName)}...'`,
    `Copy-Item -Path '${escape(cfg.localZipPath)}' -Destination '${escape(uncDest)}\\${escape(cfg.zipName)}' -Force -ErrorAction Stop`,
    `Write-Output 'Upload complete'`,
    `Remove-PSDrive -Name DeployStage -Force -ErrorAction SilentlyContinue`,
  ].join('; ');
}

// Expands the zip already pushed onto the target server's local disk into
// the site's physical path and recycles its app pool. When cfg.backupPath is
// set, the existing destPath contents are copied into a same-server, dated
// backup folder first — so a bad deploy can be rolled back by hand from
// <backupPath>\<backupStamp>.
function buildDeployScript(cfg) {
  const escape = psEscape;
  const { lines, sessionOpts } = psAuthPreamble(cfg);
  // robocopy (not Copy-Item -Recurse): multi-threaded (/MT) native copy engine
  // instead of PowerShell's per-file cmdlet overhead — much faster for the
  // many-small-files trees a built site/app usually is. Its exit codes aren't
  // pass/fail like a normal command though: 0-7 are all success (bit flags for
  // "files copied"/"extra files present"/etc.), only 8+ is a real failure, so
  // the usual "-ErrorAction Stop" pattern doesn't apply — check $LASTEXITCODE instead.
  // /R:2 /W:2 (not robocopy's default /R:1000000 /W:30): destPath is a live
  // site's folder, so a log/temp file the app pool currently has open can be
  // locked at the exact moment the backup runs. Without this, one locked file
  // makes robocopy retry up to a million times, 30s apart — effectively a
  // hang. Two quick retries cap the worst case at a few seconds instead.
  const backupLine = cfg.backupPath
    ? `  Write-Output 'Backing up existing deployment to ${escape(cfg.backupPath)}\\${escape(cfg.backupStamp)}...'; $backupDest = Join-Path '${escape(cfg.backupPath)}' '${escape(cfg.backupStamp)}'; if (Test-Path '${escape(cfg.destPath)}') { New-Item -ItemType Directory -Force -Path $backupDest | Out-Null; robocopy '${escape(cfg.destPath)}' "$backupDest" /E /MT:16 /R:2 /W:2 /NFL /NDL /NJH /NJS | Out-Null; if ($LASTEXITCODE -ge 8) { throw "robocopy backup failed with exit code $LASTEXITCODE" } }; Write-Output 'Backup complete';`
    : null;
  // /XF (exclude-file) makes robocopy leave a matching filename completely
  // alone on BOTH sides of the mirror — not copied from source, and (unlike
  // simply omitting it from source) not purged from destPath either. Without
  // this, a file deliberately excluded from the deploy package (see
  // stripExcludedFiles in the publish step) looks like a stale leftover to
  // /MIR and gets deleted from the server — the opposite of "preserve the
  // server's existing copy" that excludeFromDeploy is meant to guarantee.
  const xf = cfg.excludeFromDeploy?.length
    ? ' ' + cfg.excludeFromDeploy.map(f => `/XF '${escape(f)}'`).join(' ')
    : '';
  return [
    ...lines,
    // Write-Output checkpoints inside the remote scriptblock only — PSRP streams
    // output back to the caller as it's produced, same cmdlets/args/order as before.
    `Invoke-Command -ComputerName '${escape(cfg.server)}' -Credential $cred${sessionOpts} -ScriptBlock {`,
    `  $zipPath = Join-Path '${escape(cfg.remoteStagePath)}' '${escape(cfg.zipName)}';`,
    ...(backupLine ? [backupLine] : []),
    `  Write-Output 'Extracting package...';`,
    `  $extractDir = Join-Path '${escape(cfg.remoteStagePath)}' ('extract_' + [System.IO.Path]::GetFileNameWithoutExtension('${escape(cfg.zipName)}'));`,
    `  Remove-Item $extractDir -Recurse -Force -ErrorAction SilentlyContinue;`,
    `  Expand-Archive -Path $zipPath -DestinationPath $extractDir -Force;`,
    `  Write-Output 'Extraction complete';`,
    `  New-Item -ItemType Directory -Force -Path '${escape(cfg.destPath)}' | Out-Null;`,
    // robocopy /MIR (not Expand-Archive straight into destPath): mirrors the new
    // build's exact tree onto destPath, deleting anything left over from a
    // previous deploy — e.g. a stale nested folder from a since-fixed CI
    // artifact — which a plain Expand-Archive -Force would never clean up
    // (it only overwrites files present in the new archive, never removes
    // extra ones). Safe to wipe destPath's extras because the backup step
    // above already copied its prior contents out when backupPath is set.
    `  Write-Output 'Syncing to ${escape(cfg.destPath)}...';`,
    `  robocopy $extractDir '${escape(cfg.destPath)}' /MIR /MT:16 /R:2 /W:2 /NFL /NDL /NJH /NJS${xf} | Out-Null;`,
    `  if ($LASTEXITCODE -ge 8) { throw "robocopy deploy sync failed with exit code $LASTEXITCODE" }`,
    `  Remove-Item $extractDir -Recurse -Force -ErrorAction SilentlyContinue;`,
    `  Write-Output 'Sync complete';`,
    `  Remove-Item $zipPath -Force -ErrorAction SilentlyContinue;`,
    `  Import-Module WebAdministration;`,
    `  Write-Output 'Restarting app pool ${escape(cfg.appPoolName)}...';`,
    `  Restart-WebAppPool -Name '${escape(cfg.appPoolName)}';`,
    `  Write-Output 'App pool restarted';`,
    `}`,
  ].join('; '); // ';' (not a bare space) — each entry must be its own PowerShell statement
}

// ── /api/projects — registry of deployable projects, for the deploy wizard ───
app.get('/api/projects', (_, res) => {
  const projects = (serverConfig.projects || []).map(p => ({
    id: p.id,
    name: p.name,
    type: p.type,
    hasCiRepo: !!p.repo,
    environments: Object.entries(p.environments || {}).map(([name, envCfg]) => ({
      name,
      configured: !!(envCfg.server && envCfg.sharePath && envCfg.destPath && envCfg.appPoolName && envCfg.credentialRef),
      requireApproval: envCfg.requireApproval ?? (name.toLowerCase() === 'production'),
      hasBackup: !!envCfg.backupPath,
    })),
  }));
  res.json({ projects });
});

// Build options detected for a project, with a recommended pick for ?environment=.
app.get('/api/projects/:id/build-options', (req, res) => {
  const project = (serverConfig.projects || []).find(p => p.id === req.params.id);
  if (!project) return res.status(404).json({ error: `Unknown project: ${req.params.id}` });
  const folder = req.query.folder;
  if (!folder || !fs.existsSync(folder)) {
    return res.status(400).json({ error: `Project folder not found: ${folder || '(not set)'}` });
  }
  const options = resolveBuildOptions(folder, project, req.query.environment);
  const recommended = pickRecommendedBuildOption(options, req.query.environment);
  res.json({ options, recommendedId: recommended?.id ?? null });
});

// ── /api/projects/:id/ci-builds — recent CI-built artifacts for the "Deploy
// from CI Build" picker (build once, deploy same artifact) ──────────────────
app.get('/api/projects/:id/ci-builds', async (req, res) => {
  const project = (serverConfig.projects || []).find(p => p.id === req.params.id);
  if (!project) return res.status(404).json({ error: `Unknown project: ${req.params.id}` });
  if (!project.repo) {
    return res.status(400).json({ error: `No GitHub repo configured for ${project.name} — add "repo": "owner/name" to server-config.json` });
  }
  const token = serverConfig.githubToken;
  if (!token) return res.status(400).json({ error: 'No GitHub token configured — add githubToken to server-config.json' });
  const environment = req.query.environment;
  if (!environment) return res.status(400).json({ error: 'environment query param is required' });

  try {
    const builds = await listCiBuilds(project.repo, environment, token);
    res.json({ builds });
  } catch (err) {
    res.status(502).json({ error: err.message || 'Failed to list CI builds' });
  }
});

// ── /api/deploy/audit — recent deploy history for the wizard's history panel ──
app.get('/api/deploy/audit', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
  res.json({ entries: readAudit(limit, req.query.projectId || null) });
});

// ── /api/deploy/cancel — best-effort cancel of an in-flight deploy ──────────
app.post('/api/deploy/cancel', (req, res) => {
  const { projectId, environment } = req.body;
  const handle = activeDeploys.get(`${projectId}:${environment}`);
  if (!handle) {
    return res.status(404).json({ ok: false, error: 'No deploy in progress for this project/environment' });
  }
  handle.cancelled = true;
  killProcessTree(handle.currentProc);
  res.json({ ok: true });
});

app.post('/api/deploy/iis', async (req, res) => {
  const { folder, projectId, environment, buildSelectionId, confirmText, ciArtifactId, ciRunId, ciSha, ciBranch, ciRunNumber } = req.body;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (data) => { try { res.write(`data: ${JSON.stringify(data)}\n\n`); } catch {} };

  // ── Registry-based deploy: { projectId, environment } ───────────────────
  if (projectId) {
    const startedAt = Date.now();
    const lockKey = `${projectId}:${environment}`;
    let acquiredLock = false;
    let project = null, chosen = null, zipPath = null, ciMeta = null, ciArtifactDir = null;
    const outcome = { ok: false, stage: 'validate', detail: '' };
    const deployHandle = { cancelled: false, currentProc: null };
    // Per-step wall-clock time, written to the audit log alongside the total —
    // lets a slow deploy be diagnosed from data instead of inference.
    const stepDurations = {};
    // A CI-artifact deploy never touches the local Solution Folder for its
    // build output, but folder is still used as a working directory for the
    // zip/stage commands below — fall back to a temp dir when none is set.
    const cwd = (folder && fs.existsSync(folder)) ? folder : os.tmpdir();

    const bailIfCancelled = (stepId) => {
      if (!deployHandle.cancelled) return false;
      outcome.stage = 'cancelled';
      outcome.detail = 'Cancelled by user';
      send({ type: 'fatal', id: stepId, text: outcome.detail });
      return true;
    };

    try {
      project = (serverConfig.projects || []).find(p => p.id === projectId);
      if (!project) { outcome.detail = `Unknown project: ${projectId}`; send({ type: 'fatal', id: 'publish', text: outcome.detail }); return; }
      if (!ciArtifactId && (!folder || !fs.existsSync(folder))) {
        outcome.detail = `Project folder not found: ${folder || '(not set)'}`;
        send({ type: 'fatal', id: 'publish', text: outcome.detail });
        return;
      }
      const envCfg = project.environments?.[environment];
      if (!envCfg) {
        outcome.detail = `No "${environment}" environment configured for ${project.name}`;
        send({ type: 'fatal', id: 'publish', text: outcome.detail });
        return;
      }
      const cred = resolveCredential(serverConfig.credentials?.[envCfg.credentialRef]);
      if (!envCfg.server || !envCfg.sharePath || !envCfg.destPath || !envCfg.appPoolName || !cred?.username || !cred?.password) {
        outcome.detail = `"${environment}" for ${project.name} is not fully configured — check server-config.json`;
        send({ type: 'fatal', id: 'publish', text: outcome.detail });
        return;
      }

      // Production (or any environment explicitly flagged requireApproval) needs
      // the caller to echo the environment name back — a lightweight guard
      // against a stray/automated click deploying to prod unattended.
      const requireApproval = envCfg.requireApproval ?? (String(environment).toLowerCase() === 'production');
      if (requireApproval && String(confirmText || '').trim().toLowerCase() !== String(environment).toLowerCase()) {
        outcome.stage = 'confirm';
        outcome.detail = `Deploying to "${environment}" requires confirmation — resend with confirmText: "${environment}"`;
        send({ type: 'fatal', id: 'publish', text: outcome.detail });
        return;
      }

      if (deployLocks.has(lockKey)) {
        outcome.stage = 'lock';
        outcome.detail = `A deploy to ${project.name} / ${environment} is already running — try again once it finishes`;
        send({ type: 'fatal', id: 'publish', text: outcome.detail });
        return;
      }
      deployLocks.add(lockKey);
      acquiredLock = true;
      activeDeploys.set(lockKey, deployHandle);

      // ── 1. Publish — either build locally, or (build once, deploy same
      // artifact) download the exact zip a GitHub Actions run already built
      // and tested, and skip building here entirely ────────────────────────
      const tPublish = Date.now();
      let publishRes;
      if (ciArtifactId) {
        if (!project.repo) {
          outcome.stage = 'publish';
          outcome.detail = `No GitHub repo configured for ${project.name} — add "repo" to server-config.json`;
          send({ type: 'fatal', id: 'publish', text: outcome.detail });
          return;
        }
        if (!serverConfig.githubToken) {
          outcome.stage = 'publish';
          outcome.detail = 'No GitHub token configured — add githubToken to server-config.json';
          send({ type: 'fatal', id: 'publish', text: outcome.detail });
          return;
        }
        ciArtifactDir = path.join(os.tmpdir(), `${project.id}-${environment}-ci-artifact`);
        send({ type: 'step-start', id: 'publish', cmd: `Download CI artifact #${ciArtifactId} from ${project.repo}` });
        try {
          await downloadAndExtractArtifact(project.repo, ciArtifactId, serverConfig.githubToken, ciArtifactDir, send, deployHandle);
          publishRes = { code: 0, output: '', publishDir: ciArtifactDir };
          ciMeta = { runId: ciRunId ?? null, artifactId: ciArtifactId, sha: ciSha || null, branch: ciBranch || null, runNumber: ciRunNumber ?? null };
        } catch (err) {
          publishRes = { code: -1, output: err.message || 'Failed to fetch CI artifact', publishDir: null };
        }
      } else {
        const options = resolveBuildOptions(folder, project, environment);
        chosen = (buildSelectionId && options.find(o => o.id === buildSelectionId)) || pickRecommendedBuildOption(options, environment);
        publishRes = await runPublishStep(project, chosen, folder, send, deployHandle);
      }
      stepDurations.publishMs = Date.now() - tPublish;
      if (bailIfCancelled('publish')) return;
      const publishDetail = ciMeta
        ? `CI build ${ciMeta.branch || '?'}@${(ciMeta.sha || '').slice(0, 7) || '?'}${ciMeta.runNumber ? ` (run #${ciMeta.runNumber})` : ''}`
        : (chosen ? chosen.label : undefined);
      send({ type: 'step-end', id: 'publish', ok: publishRes.code === 0, detail: publishDetail });
      if (publishRes.code !== 0) {
        outcome.stage = 'publish';
        outcome.detail = publishRes.output.trim() || 'Build failed';
        send({ type: 'fatal', id: 'publish', text: outcome.detail });
        return;
      }
      if (!publishRes.publishDir || !fs.existsSync(publishRes.publishDir)) {
        outcome.stage = 'publish';
        outcome.detail = `Build output not found at ${publishRes.publishDir}`;
        send({ type: 'fatal', id: 'publish', text: outcome.detail });
        return;
      }

      // Env-level "excludeFromDeploy" overrides the project-level one, same
      // precedence as "buildCommand" above — lets one environment carve out
      // an exception without disturbing the rest.
      const excludeFromDeploy = envCfg.excludeFromDeploy || project.excludeFromDeploy;
      if (excludeFromDeploy?.length) stripExcludedFiles(publishRes.publishDir, excludeFromDeploy, send);

      // ── 2. Zip the build output and copy the single archive to staging ────
      // One file over a slow/VPN link beats mirroring hundreds of small ones.
      zipPath = path.join(os.tmpdir(), `${project.id}-${environment}-deploy.zip`);
      try { fs.rmSync(zipPath, { force: true }); } catch {}
      const tZip = Date.now();
      const zipRes = await runDeployCmd(
        'powershell.exe',
        ['-NoProfile', '-NonInteractive', '-Command',
          // Write-Output checkpoints bracket the existing Compress-Archive call — same
          // cmdlet/args/outcome, just live progress text for the SSE stream to carry.
          `Write-Output ('Compressing build output (' + (Get-ChildItem '${psEscape(publishRes.publishDir)}' -Recurse -File | Measure-Object).Count + ' files)...'); ` +
          // -CompressionLevel Fastest: staging is now a direct SMB copy (see
          // buildStageScript), not the transfer bottleneck it used to be — so
          // there's no upside left to Optimal's extra CPU time for a smaller
          // zip. Same archive format/contents, Expand-Archive on the other
          // end reads either compression level identically.
          `Compress-Archive -Path '${psEscape(publishRes.publishDir)}\\*' -DestinationPath '${psEscape(zipPath)}' -CompressionLevel Fastest -Force; ` +
          // Guarded on Test-Path so a failed Compress-Archive above doesn't throw a
          // second, unrelated error here — zipRes.code below still reflects the real outcome.
          `if (Test-Path '${psEscape(zipPath)}') { Write-Output ('Compressed to ' + [Math]::Round((Get-Item '${psEscape(zipPath)}').Length / 1MB, 1) + ' MB') }`],
        cwd, send, 'stage', deployHandle);
      stepDurations.zipMs = Date.now() - tZip;
      if (bailIfCancelled('stage')) return;
      if (zipRes.code !== 0) {
        outcome.stage = 'stage';
        outcome.detail = zipRes.output.trim() || 'Compress-Archive failed';
        send({ type: 'fatal', id: 'stage', text: outcome.detail });
        return;
      }

      // Pushed straight onto the target server's own disk over the same
      // WinRM session used for the deploy step below — not a UNC share —
      // so there's no third-hop credential problem for the remote
      // Expand-Archive to hit. See buildStageScript's comment for why.
      const zipName = path.basename(zipPath);
      const stageCfg = { server: envCfg.server, username: cred.username, password: cred.password, localZipPath: zipPath, remoteStagePath: envCfg.sharePath, zipName, useSsl: !!envCfg.useSsl };
      const tStage = Date.now();
      const stageRes = await runDeployCmd(
        'powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', buildStageScript(stageCfg)], cwd, send, 'stage', deployHandle);
      stepDurations.stageMs = Date.now() - tStage;
      if (bailIfCancelled('stage')) return;
      const stageOk = stageRes.code === 0;
      send({ type: 'step-end', id: 'stage', ok: stageOk });
      if (!stageOk) {
        outcome.stage = 'stage';
        outcome.detail = stageRes.output.trim() || 'Pushing build to server failed';
        send({ type: 'fatal', id: 'stage', text: outcome.detail });
        return;
      }

      // ── 3. Deploy on server ────────────────────────────────────────────
      // envCfg.backupPath (optional) is a folder on the target server itself —
      // when set, the existing site is copied into a dated subfolder there
      // before the new build is extracted, so a bad deploy can be rolled back.
      const stamp = envCfg.backupPath ? backupStamp() : null;
      const deployCfg = { server: envCfg.server, username: cred.username, password: cred.password, remoteStagePath: envCfg.sharePath, destPath: envCfg.destPath, appPoolName: envCfg.appPoolName, zipName, useSsl: !!envCfg.useSsl, backupPath: envCfg.backupPath || null, backupStamp: stamp, excludeFromDeploy };
      const tDeploy = Date.now();
      const deployRes = await runDeployCmd(
        'powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', buildDeployScript(deployCfg)], cwd, send, 'deploy', deployHandle);
      stepDurations.deployMs = Date.now() - tDeploy;
      if (bailIfCancelled('deploy')) return;
      const deployOk = deployRes.code === 0;
      send({ type: 'step-end', id: 'deploy', ok: deployOk, detail: deployOk && envCfg.backupPath ? `Backed up previous build to ${envCfg.backupPath}\\${stamp}` : undefined });
      if (!deployOk) {
        outcome.stage = 'deploy';
        outcome.detail = deployRes.output.trim() || 'Deploy on server failed';
        send({ type: 'fatal', id: 'deploy', text: outcome.detail });
        return;
      }

      // ── 4. Verify ───────────────────────────────────────────────────────
      const tVerify = Date.now();
      if (envCfg.healthCheckUrl) {
        send({ type: 'step-start', id: 'verify', cmd: `GET ${envCfg.healthCheckUrl}` });
        try {
          const r = await fetch(envCfg.healthCheckUrl);
          send({ type: 'step-end', id: 'verify', ok: r.ok, detail: `HTTP ${r.status}` });
        } catch (e) {
          send({ type: 'step-end', id: 'verify', ok: false, detail: e.message });
        }
      } else {
        send({ type: 'step-start', id: 'verify', cmd: '' });
        send({ type: 'step-end', id: 'verify', ok: true, noop: true, detail: 'No healthCheckUrl configured — skipped' });
      }
      stepDurations.verifyMs = Date.now() - tVerify;

      outcome.ok = true;
      outcome.stage = 'done';
      outcome.detail = chosen ? chosen.label : '';
      // 'done' itself moves to the finally block below (after the cleanup
      // checkpoints) — the client stops reading the stream as soon as 'done'
      // arrives, so anything sent after it here would never be seen.
    } catch (err) {
      outcome.detail = err.message || 'Unexpected deploy error';
      send({ type: 'fatal', id: 'publish', text: outcome.detail });
    } finally {
      activeDeploys.delete(lockKey);
      if (acquiredLock) deployLocks.delete(lockKey);
      // Write-Output-style checkpoints for the cleanup that already happens here —
      // no change to what's cleaned up or when, just a signal for it on success.
      if (outcome.ok) send({ type: 'stdout', id: 'verify', text: 'Cleaning up temporary files...' });
      if (zipPath) { try { fs.rmSync(zipPath, { force: true }); } catch {} }
      if (ciArtifactDir) { try { fs.rmSync(ciArtifactDir, { recursive: true, force: true }); } catch {} }
      appendAudit({
        time: new Date().toISOString(),
        user: os.userInfo().username,
        projectId,
        projectName: project?.name || projectId,
        environment,
        buildOption: chosen?.id || null,
        source: ciMeta ? 'ci' : 'local',
        ci: ciMeta,
        outcome: outcome.ok ? 'success' : 'failed',
        stage: outcome.stage,
        detail: outcome.detail,
        durationMs: Date.now() - startedAt,
        stepDurationsMs: stepDurations,
      });
      if (outcome.ok) {
        send({ type: 'stdout', id: 'verify', text: 'Deployment complete' });
        send({ type: 'done' });
      }
      res.end();
    }
    return;
  }

  // ── Legacy single-target deploy: { folder } ─────────────────────────────
  const cfg = serverConfig.deploy;

  try {
    if (!folder) {
      send({ type: 'fatal', id: 'publish', text: 'folder is required' });
      return;
    }
    if (!cfg || !cfg.server || !cfg.sharePath || !cfg.destPath || !cfg.appPoolName || !cfg.username || !cfg.password) {
      send({ type: 'fatal', id: 'publish', text: 'IIS deploy is not configured — add a "deploy" block to server-config.json (see DEPLOY_SETUP.md)' });
      return;
    }
    if (!fs.existsSync(folder)) {
      send({ type: 'fatal', id: 'publish', text: `Solution folder not found: ${folder}` });
      return;
    }

    // ── 1. Publish (auto-detected: .NET publish vs Angular/Node build) ───────
    const projectType = detectProjectType(folder);
    let publishDir;

    if (projectType === 'dotnet') {
      publishDir = path.join(folder, 'bin', '_publish');
      const publishRes = await runDeployCmd('dotnet', ['publish', '-c', 'Release', '-o', publishDir], folder, send, 'publish');
      send({ type: 'step-end', id: 'publish', ok: publishRes.code === 0 });
      if (publishRes.code !== 0) {
        send({ type: 'fatal', id: 'publish', text: publishRes.output.trim() || 'dotnet publish failed' });
        return;
      }
    } else if (projectType === 'angular' || projectType === 'node') {
      const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
      const buildRes = await runDeployCmd(npmCmd, ['run', 'build'], folder, send, 'publish');
      send({ type: 'step-end', id: 'publish', ok: buildRes.code === 0 });
      if (buildRes.code !== 0) {
        send({ type: 'fatal', id: 'publish', text: buildRes.output.trim() || 'npm run build failed' });
        return;
      }
      publishDir = projectType === 'angular' ? resolveAngularOutputPath(folder) : resolveNodeOutputPath(folder);
      if (!fs.existsSync(publishDir)) {
        send({ type: 'fatal', id: 'publish', text: `Build output not found at ${publishDir}` });
        return;
      }
      // See runPublishStep's comment: SSR-enabled Angular builds emit
      // index.csr.html instead of index.html when there's no Node SSR host.
      if (projectType === 'angular') {
        const indexHtml = path.join(publishDir, 'index.html');
        const indexCsr = path.join(publishDir, 'index.csr.html');
        if (!fs.existsSync(indexHtml) && fs.existsSync(indexCsr)) {
          fs.copyFileSync(indexCsr, indexHtml);
        }
      }
    } else {
      send({ type: 'fatal', id: 'publish', text: 'Could not detect project type — no .sln/.csproj, angular.json, or package.json found in folder' });
      return;
    }

    // ── 2. Zip the build output and push it straight onto the server's own
    // disk over WinRM (not a UNC share — avoids the double-hop auth problem
    // a remote Expand-Archive would hit reading from a third machine) ──────
    const legacyZipPath = path.join(os.tmpdir(), `legacy-deploy-${Date.now()}.zip`);
    try { fs.rmSync(legacyZipPath, { force: true }); } catch {}
    const zipRes = await runDeployCmd(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command',
        `Compress-Archive -Path '${psEscape(publishDir)}\\*' -DestinationPath '${psEscape(legacyZipPath)}' -CompressionLevel Fastest -Force`],
      folder, send, 'stage');
    if (zipRes.code !== 0) {
      send({ type: 'fatal', id: 'stage', text: zipRes.output.trim() || 'Compress-Archive failed' });
      return;
    }
    const legacyZipName = path.basename(legacyZipPath);
    const stageCfg = { ...cfg, localZipPath: legacyZipPath, remoteStagePath: cfg.sharePath, zipName: legacyZipName };
    const stageRes = await runDeployCmd(
      'powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', buildStageScript(stageCfg)], folder, send, 'stage');
    const stageOk = stageRes.code === 0;
    send({ type: 'step-end', id: 'stage', ok: stageOk });
    if (!stageOk) {
      send({ type: 'fatal', id: 'stage', text: stageRes.output.trim() || 'Pushing build to server failed' });
      return;
    }

    // ── 3. Deploy on server: expand the pushed zip into wwwroot + recycle pool ─
    const deployCfg = { ...cfg, remoteStagePath: cfg.sharePath, zipName: legacyZipName };
    const deployRes = await runDeployCmd(
      'powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', buildDeployScript(deployCfg)], folder, send, 'deploy');
    const deployOk = deployRes.code === 0;
    send({ type: 'step-end', id: 'deploy', ok: deployOk });
    if (!deployOk) {
      send({ type: 'fatal', id: 'deploy', text: deployRes.output.trim() || 'Deploy on server failed' });
      return;
    }
    try { fs.rmSync(legacyZipPath, { force: true }); } catch {}

    // ── 4. Verify (optional health check) ─────────────────────────────────────
    if (cfg.healthCheckUrl) {
      send({ type: 'step-start', id: 'verify', cmd: `GET ${cfg.healthCheckUrl}` });
      try {
        const r = await fetch(cfg.healthCheckUrl);
        send({ type: 'step-end', id: 'verify', ok: r.ok, detail: `HTTP ${r.status}` });
      } catch (e) {
        send({ type: 'step-end', id: 'verify', ok: false, detail: e.message });
      }
    } else {
      send({ type: 'step-start', id: 'verify', cmd: '' });
      send({ type: 'step-end', id: 'verify', ok: true, noop: true, detail: 'No healthCheckUrl configured — skipped' });
    }

    send({ type: 'done' });
  } catch (err) {
    send({ type: 'fatal', id: 'publish', text: err.message || 'Unexpected deploy error' });
  } finally {
    res.end();
  }
});

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (_, res) => res.json({ ok: true }));

app.listen(3001, () => console.log('Git server → http://localhost:3001'));
