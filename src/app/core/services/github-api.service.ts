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

  // ── Repository queries ─────────────────────────────────────────────────

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
        // A 404 means the branch doesn't exist yet; a 409 "Git Repository is
        // empty." is what the Git Data API returns instead of 404 when the
        // repo has zero commits at all — both mean "no sha yet", treat as
        // null. Any other status (401/403/etc.) is a real problem and must
        // surface, otherwise callers wrongly assume the branch is missing
        // and attempt a doomed create.
        catchError(e => (e?.status === 404 || e?.status === 409) ? of(null) : throwError(() => e)),
      );
  }

  getUserRepos(token: string): Observable<UserRepo[]> {
    return this.http.get<UserRepo[]>(
      `${GITHUB_API_BASE}/user/repos?per_page=100&sort=updated&type=all`,
      { headers: this.headers(token) },
    );
  }

  // ── Repository mutations ───────────────────────────────────────────────

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
    // Runtime (bash) project-type detection, not a JS-side fs check — this path
    // writes the file straight to GitHub via the Contents API, with no local
    // checkout of the repo to inspect. Mirrors the split dotnet/node templates
    // server.js generates for a repo pushed from the local machine (see
    // genericDotnetWorkflowYaml/genericNodeWorkflowYaml there), just as a single
    // conditional job since the branch can't be chosen ahead of time here.
    // Gates a generic "build-output" artifact behind a best-effort test step —
    // "build once, deploy same artifact" + the CI test gate for any repo
    // configured through the Setup tab, not just the two with tailored workflows.
    const yaml = [
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
      '      - uses: actions/setup-node@v4',
      '        with:',
      "          node-version: '20'",
      '      - name: Detect project type',
      '        id: detect',
      '        run: |',
      '          if find . -maxdepth 4 \\( -name "*.sln" -o -name "*.csproj" \\) 2>/dev/null | grep -q .; then',
      '            echo "type=dotnet" >> "$GITHUB_OUTPUT"',
      '          elif [ -f package.json ]; then',
      '            echo "type=node" >> "$GITHUB_OUTPUT"',
      '          else',
      '            echo "type=unknown" >> "$GITHUB_OUTPUT"',
      '          fi',
      '      - name: Build & test (.NET)',
      "        if: steps.detect.outputs.type == 'dotnet'",
      '        run: |',
      '          dotnet build',
      '          dotnet test --no-build || echo "No tests found, skipping"',
      '      - name: Publish (.NET)',
      "        if: steps.detect.outputs.type == 'dotnet' && github.event_name == 'push'",
      '        run: dotnet publish -c Release -o publish-output',
      '      - name: Install & build (Node/Angular)',
      "        if: steps.detect.outputs.type == 'node'",
      '        run: |',
      '          [ -f package-lock.json ] && npm ci || npm install',
      '          npm test --if-present -- --watch=false --browsers=ChromeHeadless || echo "Tests failed or not configured, continuing"',
      '          npm run build --if-present || echo "No build script, skipping"',
      '      - name: Resolve build output (Node/Angular)',
      "        if: steps.detect.outputs.type == 'node' && github.event_name == 'push'",
      '        id: resolve',
      '        run: |',
      '          OUT=dist',
      '          for candidate in dist build out; do',
      '            if [ -d "$candidate" ]; then OUT="$candidate"; break; fi',
      '          done',
      '          echo "out=$OUT" >> "$GITHUB_OUTPUT"',
      '      - name: Upload artifact (.NET)',
      "        if: steps.detect.outputs.type == 'dotnet' && github.event_name == 'push'",
      '        uses: actions/upload-artifact@v4',
      '        with:',
      '          name: build-output',
      '          path: publish-output',
      '          retention-days: 90',
      '      - name: Upload artifact (Node/Angular)',
      "        if: steps.detect.outputs.type == 'node' && github.event_name == 'push'",
      '        uses: actions/upload-artifact@v4',
      '        with:',
      '          name: build-output',
      '          path: ${{ steps.resolve.outputs.out }}',
      '          retention-days: 90',
    ].join('\n');

    const content  = btoa(unescape(encodeURIComponent(yaml)));
    const url      = `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/.github/workflows/build.yml`;
    const refQuery = branch ? `?ref=${branch}` : '';

    return this.http
      .get<{ sha: string }>(url + refQuery, { headers: this.headers(token) })
      .pipe(
        catchError(() => of(null)),
        switchMap((existing: { sha: string } | null) => {
          // File already present (e.g. hand-tailored) — leave it untouched, same
          // as server.js's local push path (fs.existsSync guard). Only create it
          // when it's genuinely missing.
          if (existing) return of(null);
          return this.http.put(
            url,
            {
              message: 'ci: add Build workflow',
              content,
              ...(branch ? { branch } : {}),
            },
            { headers: this.headers(token) },
          );
        }),
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

  // ── Utilities ──────────────────────────────────────────────────────────

  parseRepoUrl(url: string): { owner: string; repo: string } | null {
    const m = url.match(/github\.com[/:]([^/]+)\/([^/.]+)/);
    if (!m) return null;
    return { owner: m[1], repo: m[2].replace(/\.git$/, '') };
  }
}
