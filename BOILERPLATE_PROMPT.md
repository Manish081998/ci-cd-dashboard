# GitWeb — Full Boilerplate Recreation Prompt

Copy everything below this line and paste it to Claude on any new machine.

---

## PROMPT START

Create a full Angular + Node.js project called **GitWeb** (a GitHub deployment automation tool) by creating every file listed below with exact content. Do NOT skip any file. After creating all files, run `npm install` to install dependencies.

---

### Prerequisites on the new machine
- Node.js 20+
- Git CLI in PATH
- `npm install -g @angular/cli`

---

### Project root: `GitWeb/`

Create the following directory structure and files:

---

#### `package.json`
```json
{
  "name": "gitweb",
  "version": "0.0.0",
  "scripts": {
    "ng": "ng",
    "start": "concurrently \"node server.js\" \"ng serve\" --names \"GIT,NG\" --prefix-colors \"yellow,cyan\"",
    "server": "node server.js",
    "build": "ng build",
    "watch": "ng build --watch --configuration development",
    "test": "ng test"
  },
  "prettier": {
    "printWidth": 100,
    "singleQuote": true,
    "overrides": [
      {
        "files": "*.html",
        "options": {
          "parser": "angular"
        }
      }
    ]
  },
  "private": true,
  "dependencies": {
    "@angular/common": "^20.2.0",
    "@angular/compiler": "^20.2.0",
    "@angular/core": "^20.2.0",
    "@angular/forms": "^20.2.0",
    "@angular/platform-browser": "^20.2.0",
    "@angular/router": "^20.2.0",
    "concurrently": "^9.2.1",
    "cors": "^2.8.6",
    "express": "^5.2.1",
    "rxjs": "~7.8.0",
    "tslib": "^2.3.0",
    "zone.js": "~0.15.0"
  },
  "devDependencies": {
    "@angular/build": "^20.2.0",
    "@angular/cli": "^20.2.0",
    "@angular/compiler-cli": "^20.2.0",
    "@types/jasmine": "~5.1.0",
    "jasmine-core": "~5.9.0",
    "karma": "~6.4.0",
    "karma-chrome-launcher": "~3.2.0",
    "karma-coverage": "~2.2.0",
    "karma-jasmine": "~5.1.0",
    "karma-jasmine-html-reporter": "~2.1.0",
    "typescript": "~5.9.2"
  }
}
```

---

#### `angular.json`
```json
{
  "$schema": "./node_modules/@angular/cli/lib/config/schema.json",
  "version": 1,
  "newProjectRoot": "projects",
  "projects": {
    "gitweb": {
      "projectType": "application",
      "schematics": {
        "@schematics/angular:component": { "style": "scss", "skipTests": true },
        "@schematics/angular:class":     { "skipTests": true },
        "@schematics/angular:directive": { "skipTests": true },
        "@schematics/angular:guard":     { "skipTests": true },
        "@schematics/angular:interceptor":{ "skipTests": true },
        "@schematics/angular:pipe":      { "skipTests": true },
        "@schematics/angular:resolver":  { "skipTests": true },
        "@schematics/angular:service":   { "skipTests": true }
      },
      "root": "",
      "sourceRoot": "src",
      "prefix": "app",
      "architect": {
        "build": {
          "builder": "@angular/build:application",
          "options": {
            "browser": "src/main.ts",
            "polyfills": ["zone.js"],
            "tsConfig": "tsconfig.app.json",
            "inlineStyleLanguage": "scss",
            "assets": [{ "glob": "**/*", "input": "public" }],
            "styles": ["src/styles.scss"],
            "optimization": { "fonts": { "inline": false } }
          },
          "configurations": {
            "production": {
              "budgets": [
                { "type": "initial", "maximumWarning": "500kB", "maximumError": "1MB" },
                { "type": "anyComponentStyle", "maximumWarning": "4kB", "maximumError": "8kB" }
              ],
              "outputHashing": "all"
            },
            "development": { "optimization": false, "extractLicenses": false, "sourceMap": true }
          },
          "defaultConfiguration": "production"
        },
        "serve": {
          "builder": "@angular/build:dev-server",
          "configurations": {
            "production": { "buildTarget": "gitweb:build:production" },
            "development": { "buildTarget": "gitweb:build:development" }
          },
          "defaultConfiguration": "development"
        },
        "extract-i18n": { "builder": "@angular/build:extract-i18n" },
        "test": {
          "builder": "@angular/build:karma",
          "options": {
            "polyfills": ["zone.js", "zone.js/testing"],
            "tsConfig": "tsconfig.spec.json",
            "inlineStyleLanguage": "scss",
            "assets": [{ "glob": "**/*", "input": "public" }],
            "styles": ["src/styles.scss"]
          }
        }
      }
    }
  },
  "cli": { "analytics": false }
}
```

---

#### `tsconfig.json`
```json
{
  "compileOnSave": false,
  "compilerOptions": {
    "strict": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "experimentalDecorators": true,
    "importHelpers": true,
    "target": "ES2022",
    "module": "preserve"
  },
  "angularCompilerOptions": {
    "enableI18nLegacyMessageIdFormat": false,
    "strictInjectionParameters": true,
    "strictInputAccessModifiers": true,
    "typeCheckHostBindings": true,
    "strictTemplates": true
  },
  "files": [],
  "references": [{ "path": "./tsconfig.app.json" }]
}
```

---

#### `tsconfig.app.json`
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "./out-tsc/app",
    "types": []
  },
  "files": ["src/main.ts"],
  "include": ["src/**/*.d.ts"]
}
```

---

#### `tsconfig.spec.json`
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "./out-tsc/spec",
    "types": ["jasmine"]
  },
  "include": ["src/**/*.spec.ts", "src/**/*.d.ts"]
}
```

---

#### `.editorconfig`
```
root = true

[*]
charset = utf-8
indent_style = space
indent_size = 2
insert_final_newline = true
trim_trailing_whitespace = true

[*.ts]
quote_type = single

[*.md]
max_line_length = off
trim_trailing_whitespace = false
```

---

#### `.gitignore`
```
# See http://help.github.com/ignore-files/ for more about ignoring files.

# Compiled output
/dist
/tmp
/out-tsc
/bazel-out

# Node
/node_modules
npm-debug.log
yarn-error.log

# IDEs and editors
.idea/
.project
.classpath
.c9/
*.launch
.settings/
*.sublime-workspace

# Visual Studio Code
.vscode/*
!.vscode/settings.json
!.vscode/tasks.json
!.vscode/launch.json
!.vscode/extensions.json
.history/*

# Miscellaneous
/.angular/cache
.sass-cache/
/connect.lock
/coverage
/libpeerconnection.log
testem.log
/typings

# System files
.DS_Store
Thumbs.db

# Server config with token — NEVER commit this
server-config.json
```

---

#### `server.js`
```js
const express = require('express');
const cors    = require('cors');
const { spawn } = require('child_process');
const fs      = require('fs');
const path    = require('path');

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

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
    send({ type: 'stdout', text: '  → Create local main tracking origin/main\n' });
    const ok = await runGitCmd(['checkout', '-b', 'main', 'origin/main'], folder, send);
    if (!ok) return false;
  } else {
    send({ type: 'stdout', text: '  → Checkout main\n' });
    await runGitCmd(['checkout', 'main'], folder, send);
  }

  const remoteDevExists = await remoteBranchExists('development', folder);
  const localDevExists  = await branchExists('development', folder);
  if (remoteDevExists && !localDevExists) {
    send({ type: 'stdout', text: '  → Create local development tracking origin/development\n' });
    await runGitCmd(['checkout', '-b', 'development', 'origin/development'], folder, send);
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

// ── /api/config — returns token to frontend (localhost only) ─────────────────
app.get('/api/config', (_, res) => {
  res.json({ githubToken: serverConfig.githubToken || '' });
});

// ── /api/git/push ─────────────────────────────────────────────────────────────
app.post('/api/git/push', async (req, res) => {
  const { folder, branch, message, repoUrl } = req.body;
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
  const workflowDir  = path.join(folder, '.github', 'workflows');
  const workflowFile = path.join(workflowDir, 'build.yml');
  if (!fs.existsSync(workflowFile)) {
    fs.mkdirSync(workflowDir, { recursive: true });
    const isDotnet = fs.readdirSync(folder).some(f => f.endsWith('.sln') || f.endsWith('.csproj'));
    const buildStep = isDotnet
      ? [
          '      - uses: actions/setup-dotnet@v4',
          '        with:',
          "          dotnet-version: '8.x'",
          '      - name: Build',
          '        run: dotnet build',
        ]
      : [
          '      - uses: actions/setup-node@v4',
          '        with:',
          "          node-version: '20'",
          '      - name: Build',
          '        run: |',
          '          [ -f package-lock.json ] && npm ci || npm install',
          '          npm run build --if-present',
        ];
    const yaml = [
      'name: CI',
      '',
      'on:',
      '  pull_request:',
      '    branches: [main]',
      '  push:',
      '    branches: [development]',
      '',
      'jobs:',
      '  Build:',
      '    runs-on: ubuntu-latest',
      '    steps:',
      '      - uses: actions/checkout@v4',
      ...buildStep,
    ].join('\n');
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

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (_, res) => res.json({ ok: true }));

app.listen(3001, () => console.log('Git server → http://localhost:3001'));
```

---

#### `src/index.html`
```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>GitDeploy</title>
  <base href="/">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="icon" type="image/x-icon" href="favicon.ico">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
</head>
<body>
  <app-root></app-root>
</body>
</html>
```

---

#### `src/main.ts`
```typescript
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
```

---

#### `src/styles.scss`
```scss
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg-void:      #02040b;
  --bg-deep:      #060c1a;
  --bg-surface:   #0b1325;
  --bg-elevated:  #101d38;
  --bg-hover:     rgba(255,255,255,.04);
  --border-dim:   rgba(255,255,255,.06);
  --border-mid:   rgba(255,255,255,.1);
  --border-hi:    rgba(255,255,255,.18);
  --text-primary: #ddeeff;
  --text-muted:   #7a90bb;
  --text-dim:     #3d5070;
  --cyan:         #00d4ff;
  --cyan-dim:     rgba(0,212,255,.55);
  --cyan-glow:    rgba(0,212,255,.2);
  --cyan-bg:      rgba(0,212,255,.07);
  --green:        #00e676;
  --green-dim:    rgba(0,230,118,.55);
  --green-glow:   rgba(0,230,118,.2);
  --green-bg:     rgba(0,230,118,.07);
  --red:          #ff4560;
  --red-dim:      rgba(255,69,96,.55);
  --red-glow:     rgba(255,69,96,.2);
  --red-bg:       rgba(255,69,96,.07);
  --purple:       #c084fc;
  --purple-dim:   rgba(192,132,252,.55);
  --purple-glow:  rgba(192,132,252,.2);
  --purple-bg:    rgba(192,132,252,.07);
  --gold:         #ffd166;
  --gold-dim:     rgba(255,209,102,.55);
  --gold-glow:    rgba(255,209,102,.2);
  --gold-bg:      rgba(255,209,102,.07);
  --radius:       10px;
  --radius-lg:    16px;
  --radius-xl:    22px;
  --shadow:       0 8px 32px rgba(0,0,0,.6);
  --shadow-lg:    0 20px 60px rgba(0,0,0,.8);
  --bg-primary:   var(--bg-void);
  --bg-secondary: var(--bg-surface);
  --bg-tertiary:  var(--bg-elevated);
  --border:       var(--border-dim);
  --border-light: rgba(255,255,255,.04);
  --blue:         var(--cyan);
  --blue-dim:     var(--cyan-dim);
  --blue-glow:    var(--cyan-glow);
  --blue-bg:      var(--cyan-bg);
  --yellow:       var(--gold);
  --yellow-bg:    var(--gold-bg);
  --yellow-dim:   var(--gold-dim);
}

html, body {
  height: 100%;
  background: var(--bg-void);
  color: var(--text-primary);
  font-family: 'Space Grotesk', 'Inter', sans-serif;
  font-size: 14px;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  overflow-x: hidden;
}

body::before {
  content: '';
  position: fixed; inset: 0; pointer-events: none; z-index: 0;
  background:
    radial-gradient(ellipse 70% 45% at 15% 5%,  rgba(0, 80,160,.14) 0%, transparent 65%),
    radial-gradient(ellipse 55% 40% at 85% 85%,  rgba(80,0,160,.12) 0%, transparent 65%),
    radial-gradient(ellipse 45% 55% at 50% 45%,  rgba(0, 40, 90,.09) 0%, transparent 70%);
}

body > * { position: relative; z-index: 1; }

::-webkit-scrollbar           { width: 5px; height: 5px; }
::-webkit-scrollbar-track     { background: transparent; }
::-webkit-scrollbar-thumb     { background: rgba(255,255,255,.1); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,.18); }

.mono { font-family: 'JetBrains Mono', monospace !important; font-size: 12px !important; }

.badge {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; letter-spacing: .3px;
  border: 1px solid;
  &.success { background: var(--green-bg);  color: var(--green);  border-color: var(--green-dim); }
  &.error   { background: var(--red-bg);    color: var(--red);    border-color: var(--red-dim);   }
  &.pending { background: var(--gold-bg);   color: var(--gold);   border-color: var(--gold-dim);  }
  &.info    { background: var(--cyan-bg);   color: var(--cyan);   border-color: var(--cyan-dim);  }
  &.neutral { background: rgba(255,255,255,.04); color: var(--text-muted); border-color: var(--border-dim); }
  &.purple  { background: var(--purple-bg); color: var(--purple); border-color: var(--purple-dim);}
}

.pulse {
  width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0;
  &.green { background: var(--green);  animation: pulse-green 1.6s infinite; }
  &.cyan  { background: var(--cyan);   animation: pulse-cyan  1.6s infinite; }
  &.red   { background: var(--red); }
  &.gray  { background: var(--text-dim); }
}

@keyframes pulse-green { 0%,100% { box-shadow: 0 0 0 0 rgba(0,230,118,.5); } 50% { box-shadow: 0 0 0 5px rgba(0,230,118,0); } }
@keyframes pulse-cyan  { 0%,100% { box-shadow: 0 0 0 0 rgba(0,212,255,.5); } 50% { box-shadow: 0 0 0 5px rgba(0,212,255,0); } }
@keyframes spin        { to { transform: rotate(360deg); } }
@keyframes fadeIn      { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }
@keyframes shimmer     { 0% { background-position:-400px 0; } 100% { background-position:400px 0; } }
@keyframes glowPulse   { 0%,100% { opacity:.6; } 50% { opacity:1; } }
@keyframes scanLine    { 0% { background-position: -200% 0; } 100% { background-position:  200% 0; } }

.spin    { animation: spin .8s linear infinite; display: inline-block; }
.fade-in { animation: fadeIn .3s ease forwards; }

.skeleton {
  background: linear-gradient(90deg, var(--bg-elevated) 25%, rgba(255,255,255,.04) 50%, var(--bg-elevated) 75%);
  background-size: 400px 100%;
  animation: shimmer 1.4s infinite;
  border-radius: var(--radius);
  color: transparent !important;
  pointer-events: none;
}
```

---

#### `src/app/app.config.ts`
```typescript
import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideHttpClient(),
  ]
};
```

---

#### `src/app/app.ts`
```typescript
import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SetupComponent } from './features/setup/setup.component';
import { ShipComponent } from './features/ship/ship.component';
import { MonitorComponent } from './features/monitor/monitor.component';

type Tab = 'setup' | 'ship' | 'monitor';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, SetupComponent, ShipComponent, MonitorComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  activeTab = signal<Tab>('monitor');
  token     = signal('');

  tabList = [
    { id: 'setup'   as Tab, label: 'Setup',   icon: '⚙' },
    { id: 'ship'    as Tab, label: 'Ship',     icon: '🚀' },
    { id: 'monitor' as Tab, label: 'Monitor',  icon: '◉' },
  ];

  constructor() {
    fetch('http://localhost:3001/api/config')
      .then(r => r.json())
      .then(cfg => { if (cfg.githubToken) this.token.set(cfg.githubToken); })
      .catch(() => {});
  }
}
```

---

#### `src/app/app.html`
```html
<div class="shell">

  <!-- Header -->
  <header class="header">
    <div class="header-left">
      <div class="logo">
        <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
        </svg>
        <span class="logo-text">GitDeploy</span>
      </div>
    </div>

    <div class="header-center">
      <nav class="tabs">
        @for (tab of tabList; track tab.id) {
          <button class="tab" [class.active]="activeTab() === tab.id" (click)="activeTab.set(tab.id)">
            <span [innerHTML]="tab.icon"></span>
            {{ tab.label }}
          </button>
        }
      </nav>
    </div>

    <div class="header-right">
      <div class="token-status" [class.configured]="token()">
        <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
          <path fill-rule="evenodd" d="M8 0a8.1 8.1 0 00-2.56 15.79c.4.07.55-.17.55-.38l-.01-1.49c-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52 0-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.5-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.68 7.68 0 014 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48l-.01 2.2c0 .21.15.46.55.38A8.01 8.01 0 0016 8a8 8 0 00-8-8z"/>
        </svg>
        @if (token()) {
          <span class="token-ok">Token configured ✓</span>
        } @else {
          <span class="token-missing">No token — add to server-config.json</span>
        }
      </div>
    </div>
  </header>

  <!-- Token Warning -->
  @if (!token()) {
    <div class="token-banner fade-in">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
        <path fill-rule="evenodd" d="M8.22 1.754a.25.25 0 00-.44 0L1.698 13.132a.25.25 0 00.22.368h12.164a.25.25 0 00.22-.368L8.22 1.754zm-1.763-.707c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0114.082 15H1.918a1.75 1.75 0 01-1.543-2.575L6.457 1.047zM9 11a1 1 0 11-2 0 1 1 0 012 0zm-.25-5.25a.75.75 0 00-1.5 0v2.5a.75.75 0 001.5 0v-2.5z"/>
      </svg>
      GitHub token not found. Add your token to <strong>server-config.json</strong> in the GitWeb folder:
      <code>&#123; "githubToken": "ghp_..." &#125;</code>
    </div>
  }

  <!-- Main Content -->
  <main class="main">
    @if (activeTab() === 'setup') {
      <app-setup [token]="token()" class="fade-in" />
    }
    @if (activeTab() === 'ship') {
      <app-ship [token]="token()" class="fade-in" />
    }
    @if (activeTab() === 'monitor') {
      <app-monitor [token]="token()" class="fade-in" />
    }
  </main>

  <footer class="footer">
    GitDeploy AI · Built for the <strong>ai-github-ci-boilerplate</strong> workflow
  </footer>

</div>
```

---

#### `src/app/app.scss`
```scss
.shell { min-height: 100vh; display: flex; flex-direction: column; }

.header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 28px; height: 58px; flex-shrink: 0;
  background: rgba(6, 12, 26, 0.88);
  border-bottom: 1px solid rgba(0, 212, 255, 0.08);
  position: sticky; top: 0; z-index: 100;
  backdrop-filter: blur(16px);
  box-shadow: 0 1px 0 rgba(0,212,255,.06), 0 8px 32px rgba(0,0,0,.5);
}

.logo { display: flex; align-items: center; gap: 10px; }
.logo svg { color: var(--cyan); filter: drop-shadow(0 0 6px var(--cyan-glow)); }
.logo-text {
  font-size: 15px; font-weight: 700; letter-spacing: -.3px;
  background: linear-gradient(120deg, #ddeeff, var(--cyan));
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
}

.header-center { position: absolute; left: 50%; transform: translateX(-50%); }
.tabs {
  display: flex; gap: 3px;
  background: rgba(11, 19, 37, 0.8);
  padding: 4px; border-radius: 12px;
  border: 1px solid rgba(255,255,255,.07);
  backdrop-filter: blur(8px);
}
.tab {
  display: flex; align-items: center; gap: 7px;
  padding: 7px 18px; border-radius: 9px; font-size: 13px; font-weight: 500;
  border: none; background: none; color: var(--text-muted); cursor: pointer;
  transition: all .2s;
  &:hover { color: var(--text-primary); background: rgba(255,255,255,.05); }
  &.active {
    background: rgba(0, 212, 255, 0.08);
    color: var(--cyan);
    border: 1px solid rgba(0, 212, 255, 0.18);
    box-shadow: 0 0 16px rgba(0,212,255,.08), inset 0 0 12px rgba(0,212,255,.04);
  }
}

.header-right { display: flex; align-items: center; }
.token-status {
  display: flex; align-items: center; gap: 7px;
  background: rgba(11,19,37,.7); border: 1px solid var(--border-dim); border-radius: var(--radius);
  padding: 5px 12px; font-size: 12px;
  svg { color: var(--text-dim); flex-shrink: 0; }
  &.configured {
    border-color: rgba(0,230,118,.2);
    svg { color: var(--green); filter: drop-shadow(0 0 4px var(--green-glow)); }
  }
}
.token-ok { color: var(--green); font-weight: 600; }
.token-missing { color: var(--gold); }

.token-banner {
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  background: rgba(255,209,102,.05); border-bottom: 1px solid rgba(255,209,102,.15);
  padding: 10px 28px; font-size: 13px; color: var(--gold);
  strong { color: var(--text-primary); }
  svg { flex-shrink: 0; }
  code {
    font-family: 'JetBrains Mono', monospace; font-size: 11.5px;
    background: rgba(0,0,0,.3); padding: 2px 8px; border-radius: 5px;
    border: 1px solid rgba(255,255,255,.08); color: var(--cyan);
  }
}

.main { flex: 1; padding: 24px; max-width: 1160px; width: 100%; margin: 0 auto; }

.footer {
  text-align: center; padding: 14px; font-size: 12px; color: var(--text-dim);
  border-top: 1px solid rgba(0,212,255,.06);
  strong { color: var(--text-muted); }
}

.spin { display: inline-block; animation: sp .8s linear infinite; }
@keyframes sp { to { transform: rotate(360deg); } }
@keyframes fi { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: none; } }
.fade-in { animation: fi .3s ease; }
```

---

#### `src/app/core/constants/api.constants.ts`
```typescript
export const GITHUB_API_BASE = 'https://api.github.com';
export const GITHUB_GRAPHQL  = 'https://api.github.com/graphql';
export const GIT_SERVER_BASE = 'http://localhost:3001';
```

---

#### `src/app/core/constants/pipeline.constants.ts`
```typescript
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
```

---

#### `src/app/core/models/github.models.ts`
```typescript
export interface RepoInfo {
  full_name: string;
  description: string;
  visibility: string;
  default_branch: string;
  allow_auto_merge: boolean;
  open_issues_count: number;
  stargazers_count: number;
  html_url: string;
  pushed_at: string;
}

export interface Branch {
  name: string;
  commit: { sha: string; url: string };
  protected: boolean;
}

export interface PullRequest {
  number: number;
  title: string;
  state: string;
  html_url: string;
  head: { ref: string; sha: string };
  base: { ref: string };
  created_at: string;
  auto_merge: unknown;
  node_id: string;
  user: { login: string; avatar_url: string };
  merged?: boolean;
}

export interface WorkflowRun {
  id: number;
  name: string;
  status: string;
  conclusion: string;
  html_url: string;
  created_at: string;
  updated_at: string;
  head_commit: { message: string; author: { name: string } };
  head_branch: string;
}

export interface Commit {
  sha: string;
  html_url: string;
  commit: { message: string; author: { name: string; date: string } };
  author: { login: string; avatar_url: string } | null;
}

export interface Protection {
  required_status_checks: { contexts: string[] } | null;
  required_pull_request_reviews: { required_approving_review_count: number } | null;
}

export interface UserRepo {
  full_name: string;
  html_url: string;
  clone_url: string;
  private: boolean;
}
```

---

#### `src/app/core/models/pipeline.models.ts`
```typescript
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

export type BuildEvent =
  | { type: 'stdout';      text: string }
  | { type: 'stderr';      text: string }
  | { type: 'build-done' }
  | { type: 'build-fatal'; text: string };

export type GitPushEvent =
  | { type: 'step-start'; id: string; cmd: string }
  | { type: 'stdout';     text: string }
  | { type: 'stderr';     text: string }
  | { type: 'step-end';   id: string; ok: boolean; noop?: boolean }
  | { type: 'fatal';      id: string; text: string }
  | { type: 'git-done' };

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
```

---

#### `src/app/core/services/github-api.service.ts`
```typescript
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { GITHUB_API_BASE, GITHUB_GRAPHQL } from '../constants/api.constants';
import {
  RepoInfo, Branch, PullRequest, WorkflowRun,
  Commit, Protection, UserRepo,
} from '../models/github.models';

@Injectable({ providedIn: 'root' })
export class GithubApiService {
  private readonly http = inject(HttpClient);

  private headers(token: string): HttpHeaders {
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    });
  }

  getRepo(owner: string, repo: string, token: string): Observable<RepoInfo> {
    return this.http
      .get<RepoInfo>(`${GITHUB_API_BASE}/repos/${owner}/${repo}`, { headers: this.headers(token) })
      .pipe(catchError(e => throwError(() => e)));
  }

  getBranches(owner: string, repo: string, token: string): Observable<Branch[]> {
    return this.http.get<Branch[]>(
      `${GITHUB_API_BASE}/repos/${owner}/${repo}/branches`,
      { headers: this.headers(token) },
    );
  }

  getProtection(owner: string, repo: string, branch: string, token: string): Observable<Protection> {
    return this.http.get<Protection>(
      `${GITHUB_API_BASE}/repos/${owner}/${repo}/branches/${branch}/protection`,
      { headers: this.headers(token) },
    );
  }

  getOpenPRs(owner: string, repo: string, token: string): Observable<PullRequest[]> {
    return this.http.get<PullRequest[]>(
      `${GITHUB_API_BASE}/repos/${owner}/${repo}/pulls?state=open&per_page=10`,
      { headers: this.headers(token) },
    );
  }

  getPR(owner: string, repo: string, prNumber: number, token: string): Observable<PullRequest> {
    return this.http.get<PullRequest>(
      `${GITHUB_API_BASE}/repos/${owner}/${repo}/pulls/${prNumber}`,
      { headers: this.headers(token) },
    );
  }

  getWorkflowRuns(owner: string, repo: string, token: string): Observable<{ workflow_runs: WorkflowRun[] }> {
    return this.http.get<{ workflow_runs: WorkflowRun[] }>(
      `${GITHUB_API_BASE}/repos/${owner}/${repo}/actions/runs?per_page=10`,
      { headers: this.headers(token) },
    );
  }

  getCommits(owner: string, repo: string, branch: string, token: string): Observable<Commit[]> {
    return this.http.get<Commit[]>(
      `${GITHUB_API_BASE}/repos/${owner}/${repo}/commits?sha=${branch}&per_page=8`,
      { headers: this.headers(token) },
    );
  }

  getBranchSha(owner: string, repo: string, branch: string, token: string): Observable<string | null> {
    return this.http
      .get<{ object: { sha: string } }>(
        `${GITHUB_API_BASE}/repos/${owner}/${repo}/git/ref/heads/${branch}`,
        { headers: this.headers(token) },
      )
      .pipe(
        map(ref => ref.object.sha),
        catchError(() => of(null)),
      );
  }

  getUserRepos(token: string): Observable<UserRepo[]> {
    return this.http.get<UserRepo[]>(
      `${GITHUB_API_BASE}/user/repos?per_page=100&sort=updated&type=all`,
      { headers: this.headers(token) },
    );
  }

  enableAutoMerge(owner: string, repo: string, token: string): Observable<unknown> {
    return this.http.patch(
      `${GITHUB_API_BASE}/repos/${owner}/${repo}`,
      { allow_auto_merge: true, allow_merge_commit: true },
      { headers: this.headers(token) },
    );
  }

  setProtection(
    owner: string,
    repo: string,
    branch: string,
    requireApproval: boolean,
    token: string,
  ): Observable<unknown> {
    const body = {
      required_status_checks: null,
      enforce_admins: false,
      required_pull_request_reviews: requireApproval
        ? { required_approving_review_count: 1, dismiss_stale_reviews: false }
        : null,
      restrictions: null,
    };
    return this.http.put(
      `${GITHUB_API_BASE}/repos/${owner}/${repo}/branches/${branch}/protection`,
      body,
      { headers: this.headers(token) },
    );
  }

  createPR(
    owner: string,
    repo: string,
    title: string,
    body: string,
    head: string,
    base: string,
    token: string,
  ): Observable<PullRequest> {
    return this.http.post<PullRequest>(
      `${GITHUB_API_BASE}/repos/${owner}/${repo}/pulls`,
      { title, body, head, base },
      { headers: this.headers(token) },
    );
  }

  enablePRAutoMerge(prNodeId: string, token: string): Observable<unknown> {
    const query = `
      mutation EnableAutoMerge($prId: ID!) {
        enablePullRequestAutoMerge(input: { pullRequestId: $prId, mergeMethod: MERGE }) {
          pullRequest { autoMergeRequest { enabledAt } }
        }
      }`;
    return this.http.post(
      GITHUB_GRAPHQL,
      { query, variables: { prId: prNodeId } },
      { headers: this.headers(token) },
    );
  }

  createInitialCommit(
    owner: string,
    repo: string,
    token: string,
  ): Observable<{ content: { sha: string }; commit: { sha: string } }> {
    const content = btoa('# ' + repo + '\n\nInitialised by GitDeploy AI.\n');
    return this.http.put<{ content: { sha: string }; commit: { sha: string } }>(
      `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/README.md`,
      { message: 'Initial commit', content },
      { headers: this.headers(token) },
    );
  }

  createWorkflowFile(owner: string, repo: string, token: string, branch?: string): Observable<unknown> {
    const yaml = [
      'name: CI',
      '',
      'on:',
      '  pull_request:',
      '    branches: [main]',
      '  push:',
      '    branches: [development]',
      '',
      'jobs:',
      '  Build:',
      '    runs-on: ubuntu-latest',
      '    steps:',
      '      - uses: actions/checkout@v4',
      '      - uses: actions/setup-dotnet@v4',
      '        with:',
      "          dotnet-version: '8.x'",
      '      - uses: actions/setup-node@v4',
      '        with:',
      "          node-version: '20'",
      '      - name: Build',
      '        run: |',
      '          if find . -maxdepth 4 \\( -name "*.sln" -o -name "*.csproj" \\) 2>/dev/null | grep -q .; then',
      '            echo "Detected .NET project"',
      '            dotnet build',
      '          elif [ -f package.json ]; then',
      '            echo "Detected Node/Angular project"',
      '            [ -f package-lock.json ] && npm ci || npm install',
      '            npm run build --if-present || echo "No build script, skipping"',
      '          else',
      '            echo "No recognizable project type — skipping build"',
      '          fi',
    ].join('\n');

    const content  = btoa(unescape(encodeURIComponent(yaml)));
    const url      = `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/.github/workflows/build.yml`;
    const refQuery = branch ? `?ref=${branch}` : '';

    return this.http
      .get<{ sha: string }>(url + refQuery, { headers: this.headers(token) })
      .pipe(
        catchError(() => of(null)),
        switchMap((existing: { sha: string } | null) =>
          this.http.put(
            url,
            {
              message: 'ci: update Build workflow',
              content,
              ...(existing?.sha ? { sha: existing.sha } : {}),
              ...(branch ? { branch } : {}),
            },
            { headers: this.headers(token) },
          ),
        ),
        catchError(err => {
          if (err?.status === 403) {
            throw new Error('Token missing "workflow" scope — add it at github.com/settings/tokens');
          }
          throw err;
        }),
      );
  }

  createBranch(owner: string, repo: string, branch: string, sha: string, token: string): Observable<unknown> {
    return this.http.post(
      `${GITHUB_API_BASE}/repos/${owner}/${repo}/git/refs`,
      { ref: `refs/heads/${branch}`, sha },
      { headers: this.headers(token) },
    );
  }

  parseRepoUrl(url: string): { owner: string; repo: string } | null {
    const m = url.match(/github\.com[/:]([^/]+)\/([^/.]+)/);
    if (!m) return null;
    return { owner: m[1], repo: m[2].replace(/\.git$/, '') };
  }
}
```

---

#### `src/app/core/services/git-push.service.ts`
```typescript
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { GIT_SERVER_BASE } from '../constants/api.constants';
import { BuildEvent, GitPushEvent } from '../models/pipeline.models';

@Injectable({ providedIn: 'root' })
export class GitPushService {

  streamBuild(folder: string): Observable<BuildEvent> {
    return new Observable<BuildEvent>(subscriber => {
      const ctrl = new AbortController();

      fetch(`${GIT_SERVER_BASE}/api/dotnet/build`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder }),
        signal: ctrl.signal,
      })
        .then(res => {
          const reader  = res.body!.getReader();
          const decoder = new TextDecoder();
          let   buffer  = '';

          const pump = (): Promise<void> =>
            reader.read().then(({ done, value }) => {
              if (done) { subscriber.complete(); return; }

              buffer += decoder.decode(value, { stream: true });
              const parts = buffer.split('\n\n');
              buffer = parts.pop() ?? '';

              for (const part of parts) {
                const line = part.trim();
                if (!line.startsWith('data: ')) continue;
                let raw: { type: string; text?: string };
                try { raw = JSON.parse(line.slice(6)); } catch { continue; }

                let evt: BuildEvent;
                switch (raw.type) {
                  case 'stdout': evt = { type: 'stdout',      text: raw.text ?? '' }; break;
                  case 'stderr': evt = { type: 'stderr',      text: raw.text ?? '' }; break;
                  case 'done':   evt = { type: 'build-done' };                         break;
                  case 'fatal':  evt = { type: 'build-fatal', text: raw.text ?? '' }; break;
                  default: continue;
                }

                subscriber.next(evt);
                if (evt.type === 'build-done' || evt.type === 'build-fatal') {
                  subscriber.complete();
                  return;
                }
              }
              return pump();
            });

          pump().catch(err => {
            if (err?.name !== 'AbortError') {
              subscriber.next({ type: 'build-fatal', text: 'Build stream error' });
              subscriber.error(err);
            }
          });
        })
        .catch(err => {
          if (err?.name !== 'AbortError') {
            subscriber.next({ type: 'build-fatal', text: 'Cannot reach server' });
            subscriber.error(err);
          }
        });

      return () => ctrl.abort();
    });
  }

  streamGitPush(folder: string, branch: string, message: string, repoUrl: string): Observable<GitPushEvent> {
    return new Observable<GitPushEvent>(subscriber => {
      const ctrl = new AbortController();

      fetch(`${GIT_SERVER_BASE}/api/git/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder, branch, message, repoUrl }),
        signal: ctrl.signal,
      })
        .then(res => {
          const reader  = res.body!.getReader();
          const decoder = new TextDecoder();
          let   buffer  = '';

          const pump = (): Promise<void> =>
            reader.read().then(({ done, value }) => {
              if (done) { subscriber.complete(); return; }

              buffer += decoder.decode(value, { stream: true });
              const parts = buffer.split('\n\n');
              buffer = parts.pop() ?? '';

              for (const part of parts) {
                const line = part.trim();
                if (!line.startsWith('data: ')) continue;
                let raw: { type: string; id?: string; cmd?: string; ok?: boolean; noop?: boolean; text?: string };
                try { raw = JSON.parse(line.slice(6)); } catch { continue; }

                let evt: GitPushEvent;
                switch (raw.type) {
                  case 'step-start': evt = { type: 'step-start', id: raw.id ?? '', cmd: raw.cmd ?? '' };          break;
                  case 'stdout':     evt = { type: 'stdout',     text: raw.text ?? '' };                           break;
                  case 'stderr':     evt = { type: 'stderr',     text: raw.text ?? '' };                           break;
                  case 'step-end':   evt = { type: 'step-end',   id: raw.id ?? '', ok: raw.ok ?? false, noop: raw.noop }; break;
                  case 'fatal':      evt = { type: 'fatal',      id: raw.id ?? '', text: raw.text ?? '' };        break;
                  case 'done':       evt = { type: 'git-done' };                                                   break;
                  default: continue;
                }

                subscriber.next(evt);
                if (evt.type === 'git-done') { subscriber.complete(); return; }
                if (evt.type === 'fatal')    { subscriber.error(evt); return; }
              }
              return pump();
            });

          pump().catch(err => {
            if (err?.name !== 'AbortError') {
              const fatal: GitPushEvent = { type: 'fatal', id: 'push', text: 'Git push stream error' };
              subscriber.next(fatal);
              subscriber.error(err);
            }
          });
        })
        .catch(err => {
          if (err?.name !== 'AbortError') {
            const fatal: GitPushEvent = { type: 'fatal', id: 'push', text: 'Cannot reach git server — make sure you started with: npm start' };
            subscriber.next(fatal);
            subscriber.error(err);
          }
        });

      return () => ctrl.abort();
    });
  }
}
```

---

#### `src/app/core/services/pipeline.service.ts`
```typescript
import { Injectable, inject } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import { GithubApiService } from './github-api.service';
import { PipelineConfig, PipelineEvent, PrResult } from '../models/pipeline.models';
import { PullRequest } from '../models/github.models';

@Injectable({ providedIn: 'root' })
export class PipelineService {
  private readonly gh = inject(GithubApiService);

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
```

---

#### `src/app/shared/utils/step.utils.ts`
```typescript
import type { Step, StepStatus } from '../../core/models/pipeline.models';

export function freshSteps(defs: Omit<Step, 'status' | 'detail'>[]): Step[] {
  return defs.map(d => ({ ...d, status: 'idle' as StepStatus, detail: '' }));
}
```

---

#### `src/app/shared/utils/time.utils.ts`
```typescript
export function currentTimestamp(): string {
  return new Date().toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}
```

---

#### `src/app/features/setup/setup.component.ts`
```typescript
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
      setStep(0, 'running');
      const repoInfo = await firstValueFrom(this.gh.getRepo(owner, repo, this.effectiveToken));
      setStep(0, 'done', `${repoInfo.full_name} · ${repoInfo.visibility}`);

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

      setStep(2, 'running');
      await firstValueFrom(this.gh.createWorkflowFile(owner, repo, this.effectiveToken));
      await firstValueFrom(this.gh.createWorkflowFile(owner, repo, this.effectiveToken, 'development'));
      setStep(2, 'done', '.github/workflows/build.yml ✓  (main + development)');

      setStep(3, 'running');
      await firstValueFrom(this.gh.enableAutoMerge(owner, repo, this.effectiveToken));
      setStep(3, 'done', 'allow_auto_merge: true · allow_merge_commit: true');

      setStep(4, 'running');
      await firstValueFrom(
        this.gh.setProtection(owner, repo, 'main', this.devType() === 'team', this.effectiveToken));
      setStep(4, 'done', this.devType() === 'solo'
        ? 'No approval required (sole developer)'
        : '1 approval required before merging');

      setStep(5, 'running');
      const final = await firstValueFrom(this.gh.getRepo(owner, repo, this.effectiveToken));
      setStep(5, 'done', `auto_merge: ${final.allow_auto_merge} · default: ${final.default_branch}`);

    } catch (e: any) {
      const idx = this.steps().findIndex(s => s.status === 'running');
      if (idx >= 0) setStep(idx, 'error', e?.error?.message || e?.message || 'API error');
    }

    this.running.set(false);
    this.done.set(true);
  }
}
```

---

#### `src/app/features/setup/setup.component.html`
```html
<div class="setup fade-in">

  <div class="card">
    <div class="card-title">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
      </svg>
      One-Time Repository Setup
    </div>
    <div class="card-sub">Configure your GitHub repo — branch protection, auto-merge, and CI all set automatically.</div>

    <div class="field-row">
      <div class="field">
        <label>GitHub Repo URL</label>
        <input [(ngModel)]="repoUrl" placeholder="https://github.com/username/repo.git"
               [class.error]="urlError" />
        @if (urlError) { <span class="field-error">{{ urlError }}</span> }
      </div>
    </div>

    <div class="field-row">
      <div class="field">
        <label>Developer Setup</label>
        <div class="radio-group">
          <label class="radio" [class.active]="devType() === 'solo'" (click)="devType.set('solo')">
            <span class="radio-dot" [class.checked]="devType() === 'solo'"></span>
            <div>
              <strong>Sole Developer</strong>
              <span>No approval required — push directly</span>
            </div>
          </label>
          <label class="radio" [class.active]="devType() === 'team'" (click)="devType.set('team')">
            <span class="radio-dot" [class.checked]="devType() === 'team'"></span>
            <div>
              <strong>Team / Manager Reviews</strong>
              <span>1 approval required before merging</span>
            </div>
          </label>
        </div>
      </div>
    </div>

    <button class="btn-primary" [disabled]="running() || !canRun" (click)="runSetup()">
      @if (running()) {
        <span class="spin">⟳</span> Configuring...
      } @else {
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25z"/>
        </svg>
        Configure Repository
      }
    </button>
  </div>

  @if (steps().length > 0) {
    <div class="card fade-in">
      <div class="card-title">Setup Progress</div>
      <div class="steps">
        @for (step of steps(); track $index) {
          <div class="step" [class]="step.status">
            <div class="step-icon">
              @if (step.status === 'done')    { <span class="icon-done">✓</span> }
              @if (step.status === 'error')   { <span class="icon-error">✕</span> }
              @if (step.status === 'running') { <span class="spin" style="color:var(--blue)">⟳</span> }
              @if (step.status === 'idle')    { <span class="icon-idle">○</span> }
            </div>
            <div class="step-body">
              <span class="step-label">{{ step.label }}</span>
              @if (step.detail) { <span class="step-detail">{{ step.detail }}</span> }
            </div>
          </div>
        }
      </div>
    </div>
  }

  @if (done()) {
    <div class="card result-card fade-in" [class.result-success]="!hasError()" [class.result-error]="hasError()">
      <div class="result-icon">{{ hasError() ? '✕' : '✓' }}</div>
      <div class="result-body">
        <strong>{{ hasError() ? 'Setup encountered an error' : 'Repository fully configured!' }}</strong>
        <span>{{ hasError() ? 'Check the steps above for details.' : 'Auto-merge enabled · Branch protection set · CI workflow deployed' }}</span>
      </div>
    </div>
  }

</div>
```

---

#### `src/app/features/setup/setup.component.scss`
```scss
.setup { display: flex; flex-direction: column; gap: 16px; }

.card {
  background: rgba(11, 19, 37, 0.85);
  border: 1px solid rgba(255,255,255,.07);
  border-radius: 18px; padding: 22px;
  backdrop-filter: blur(12px);
  box-shadow: 0 4px 24px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.04);
}
.card-title {
  display: flex; align-items: center; gap: 9px;
  font-weight: 700; font-size: 15px; margin-bottom: 6px; color: var(--text-primary);
  svg { color: var(--cyan); filter: drop-shadow(0 0 6px var(--cyan-glow)); }
}
.card-sub { color: var(--text-muted); margin-bottom: 22px; font-size: 13px; line-height: 1.5; }

.field-row { display: flex; gap: 14px; margin-bottom: 18px; }
.field { display: flex; flex-direction: column; gap: 7px; flex: 1; }
label {
  font-size: 10.5px; font-weight: 700; color: rgba(0,212,255,.5);
  letter-spacing: .8px; text-transform: uppercase;
}
input {
  background: rgba(6,12,26,.7); border: 1px solid rgba(0,212,255,.12);
  border-radius: 10px; color: var(--text-primary); padding: 9px 13px; font-size: 13px; outline: none;
  transition: border-color .2s, box-shadow .2s;
  font-family: 'JetBrains Mono', monospace;
  &:focus {
    border-color: rgba(0,212,255,.4);
    box-shadow: 0 0 0 3px rgba(0,212,255,.08), 0 0 16px rgba(0,212,255,.06);
  }
  &.error { border-color: rgba(255,69,96,.4); }
}
.field-error { color: var(--red); font-size: 12px; }

.radio-group { display: flex; gap: 12px; }
.radio {
  flex: 1; display: flex; align-items: flex-start; gap: 12px; cursor: pointer;
  background: rgba(6,12,26,.6); border: 1px solid rgba(255,255,255,.07); border-radius: 12px;
  padding: 14px; transition: all .2s;
  &:hover { border-color: rgba(0,212,255,.2); background: rgba(0,212,255,.03); }
  &.active {
    border-color: rgba(0,212,255,.3); background: rgba(0,212,255,.06);
    box-shadow: 0 0 18px rgba(0,212,255,.08);
  }
  div { display: flex; flex-direction: column; gap: 3px; }
  strong { font-size: 13px; font-weight: 600; color: var(--text-primary); }
  span { font-size: 12px; color: var(--text-muted); }
}
.radio-dot {
  width: 16px; height: 16px; border-radius: 50%; border: 2px solid rgba(255,255,255,.15);
  flex-shrink: 0; margin-top: 2px; transition: all .2s;
  &.checked {
    border-color: var(--cyan); background: var(--cyan);
    box-shadow: 0 0 8px var(--cyan-glow), inset 0 0 0 3px rgba(6,12,26,.9);
  }
}

.btn-primary {
  display: inline-flex; align-items: center; gap: 8px; margin-top: 4px;
  background: linear-gradient(160deg, rgba(0,200,120,.22), rgba(0,160,90,.16));
  color: var(--green); border: 1px solid rgba(0,230,118,.25);
  border-radius: 10px; padding: 10px 20px; font-size: 13px; font-weight: 700;
  cursor: pointer; transition: all .2s;
  box-shadow: 0 0 20px rgba(0,230,118,.08);
  &:hover:not(:disabled) {
    background: linear-gradient(160deg, rgba(0,230,118,.28), rgba(0,200,100,.2));
    border-color: rgba(0,230,118,.4);
    box-shadow: 0 0 28px rgba(0,230,118,.18), 0 4px 16px rgba(0,0,0,.3);
    transform: translateY(-1px);
  }
  &:disabled { opacity: .25; cursor: not-allowed; }
}

.steps { display: flex; flex-direction: column; gap: 0; }
.step {
  display: flex; align-items: flex-start; gap: 14px; padding: 12px 0;
  border-bottom: 1px solid rgba(255,255,255,.04);
  &:last-child { border-bottom: none; }
  &.done    .step-label { color: var(--text-primary); }
  &.error   .step-label { color: var(--red); }
  &.running .step-label { color: var(--cyan); }
  &.idle    .step-label { color: var(--text-dim); }
}
.step-icon { width: 22px; text-align: center; padding-top: 1px; flex-shrink: 0; font-size: 14px; }
.icon-done  { color: var(--green); filter: drop-shadow(0 0 4px var(--green-glow)); }
.icon-error { color: var(--red);   filter: drop-shadow(0 0 4px var(--red-glow)); }
.icon-idle  { color: var(--text-dim); }
.step-body  { display: flex; flex-direction: column; gap: 3px; }
.step-label { font-size: 13px; font-weight: 600; transition: color .2s; }
.step-detail {
  font-size: 11.5px; color: var(--text-muted);
  font-family: 'JetBrains Mono', monospace;
  background: rgba(0,212,255,.04); padding: 2px 8px; border-radius: 5px;
  border: 1px solid rgba(0,212,255,.07); display: inline-block; margin-top: 2px;
}

.result-card {
  display: flex; align-items: center; gap: 16px;
  &.result-success { border-color: rgba(0,230,118,.2); background: rgba(0,230,118,.04); box-shadow: 0 0 28px rgba(0,230,118,.06); }
  &.result-error   { border-color: rgba(255,69,96,.2);  background: rgba(255,69,96,.04);  box-shadow: 0 0 28px rgba(255,69,96,.06); }
}
.result-icon { font-size: 24px; }
.result-success .result-icon { color: var(--green); filter: drop-shadow(0 0 8px var(--green-glow)); }
.result-error   .result-icon { color: var(--red);   filter: drop-shadow(0 0 8px var(--red-glow)); }
.result-body {
  display: flex; flex-direction: column; gap: 3px;
  strong { font-size: 14px; color: var(--text-primary); }
  span   { font-size: 12px; color: var(--text-muted); }
}

.spin { display: inline-block; animation: sp .8s linear infinite; }
@keyframes sp { to { transform: rotate(360deg); } }
@keyframes fi { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
.fade-in { animation: fi .35s ease; }
```

---

#### `src/app/features/ship/ship.component.ts`
*(paste the full TypeScript content from ship.component.ts — 259 lines — exactly as shown in the source)*

**Full content:**
```typescript
import { Component, input, signal, computed, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  Step, StepStatus, PrResult,
  BuildEvent, GitPushEvent, PipelineEvent, PipelineConfig,
} from '../../core/models/pipeline.models';
import { GIT_STEPS, PIPE_STEPS } from '../../core/constants/pipeline.constants';
import { GIT_SERVER_BASE } from '../../core/constants/api.constants';
import { freshSteps } from '../../shared/utils/step.utils';
import { currentTimestamp } from '../../shared/utils/time.utils';
import { GithubApiService } from '../../core/services/github-api.service';
import { GitPushService } from '../../core/services/git-push.service';
import { PipelineService } from '../../core/services/pipeline.service';

interface LogEntry {
  time: string;
  label: string;
  status: StepStatus;
  text: string;
}

@Component({
  selector: 'app-ship',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ship.component.html',
  styleUrl: './ship.component.scss',
})
export class ShipComponent {
  private readonly githubApi   = inject(GithubApiService);
  private readonly gitPushSvc  = inject(GitPushService);
  private readonly pipelineSvc = inject(PipelineService);

  token = input('');

  solutionFolder = localStorage.getItem('git_folder') || '';
  repoUrl        = localStorage.getItem('git_repo')   || '';
  description    = '';
  headBranch     = 'development';
  baseBranch     = 'main';

  repos        = signal<{ full_name: string; clone_url: string }[]>([]);
  reposLoading = signal(false);

  gitStarted    = signal(false);
  gitRunning    = signal(false);
  gitDone       = signal(false);
  gitSteps      = signal<Step[]>(freshSteps(GIT_STEPS));
  terminalLines = signal<{ type: string; text: string }[]>([]);

  pipeStarted = signal(false);
  pipeRunning = signal(false);
  pipeDone    = signal(false);
  pipeSteps   = signal<Step[]>(freshSteps(PIPE_STEPS));
  selectedId  = signal<string | null>(null);
  prResult    = signal<PrResult | null>(null);

  log = signal<LogEntry[]>([]);

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

  activeDetail = computed<Step | null>(() => {
    const all = this.pipeSteps();
    if (this.selectedId()) return all.find(s => s.id === this.selectedId()) ?? null;
    return (
      all.find(s => s.status === 'running') ??
      all.filter(s => s.status === 'error').at(-1) ??
      all.filter(s => s.status === 'done').at(-1) ??
      null
    );
  });

  constructor() {
    this.checkServer();
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
    });
  }

  async checkServer() {
    try {
      const r = await fetch(`${GIT_SERVER_BASE}/api/health`);
      this.serverOnline.set(r.ok);
    } catch {
      this.serverOnline.set(false);
    }
  }

  selectStep(id: string) {
    this.selectedId.set(this.selectedId() === id ? null : id);
  }

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

  private addLog(label: string, status: StepStatus, text: string) {
    this.log.update(l => [...l, { time: currentTimestamp(), label, status, text }]);
  }

  private addTerminal(type: string, text: string) {
    this.terminalLines.update(l => [...l, { type, text }]);
  }

  resetAll() {
    this.gitStarted.set(false);  this.gitRunning.set(false);  this.gitDone.set(false);
    this.pipeStarted.set(false); this.pipeRunning.set(false); this.pipeDone.set(false);
    this.gitSteps.set(freshSteps(GIT_STEPS));
    this.pipeSteps.set(freshSteps(PIPE_STEPS));
    this.terminalLines.set([]);
    this.log.set([]);
    this.prResult.set(null);
    this.selectedId.set(null);
  }

  runAll() {
    localStorage.setItem('git_folder', this.solutionFolder);
    localStorage.setItem('git_repo',   this.repoUrl);
    this.resetAll();

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
```

---

#### `src/app/features/ship/ship.component.html`
*(copy exact content from ship.component.html — 212 lines)*

#### `src/app/features/ship/ship.component.scss`
*(copy exact content from ship.component.scss — 286 lines)*

#### `src/app/features/monitor/monitor.component.ts`
*(copy exact content from monitor.component.ts — 131 lines)*

#### `src/app/features/monitor/monitor.component.html`
*(copy exact content from monitor.component.html — 218 lines)*

#### `src/app/features/monitor/monitor.component.scss`
*(copy exact content from monitor.component.scss — 184 lines)*

---

#### `.github/workflows/build.yml`
```yaml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [development]

jobs:
  Build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-dotnet@v4
        with:
          dotnet-version: '8.x'
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Build
        run: |
          if find . -maxdepth 4 \( -name "*.sln" -o -name "*.csproj" \) 2>/dev/null | grep -q .; then
            echo "Detected .NET project"
            dotnet build
          elif [ -f package.json ]; then
            echo "Detected Node/Angular project"
            [ -f package-lock.json ] && npm ci || npm install
            npm run build --if-present || echo "No build script, skipping"
          else
            echo "No recognizable project type — skipping build"
          fi
```

---

#### `server-config.json` (create manually — NOT committed to git)
```json
{
  "githubToken": "ghp_YOUR_GITHUB_TOKEN_HERE"
}
```

---

### Setup & Run

```bash
# Install dependencies
npm install

# Create server-config.json with your GitHub token (see above)

# Start both servers
npm start
# Angular: http://localhost:4200
# Express: http://localhost:3001
```

### GitHub Token Required Scopes
- `repo` — repository access
- `workflow` — to create/update CI workflow files

---

## PROMPT END

> **Note for ship/monitor HTML+SCSS files:** If Claude asks, provide the full file contents. The HTML/SCSS for `ship.component.html`, `ship.component.scss`, `monitor.component.html`, `monitor.component.scss` are lengthy but follow the same dark-cyan-themed design system as the other files. Ask Claude to create them matching the style patterns shown in `setup.component.html/scss`.
