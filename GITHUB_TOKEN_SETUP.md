# GitHub Token Setup (for the Setup tab)

The Setup tab needs a GitHub token in `server-config.json` that can actually
**write** to your repo (create branches, commit files, change repo settings) —
not just read it. Follow this whenever you point the dashboard at a new repo
or a token stops working.

## 1. Create a fine-grained personal access token

Go to `https://github.com/settings/personal-access-tokens` → **Generate new token**.

**Repository access**
- Pick **All repositories**, or **Only select repositories** and choose the target repo.

**Permissions** — click **+ Add permissions** and add exactly these:

| Permission      | Level          | Why |
|-----------------|----------------|-----|
| Contents        | Read and write | create `main` / `development` branches, commit files |
| Workflows       | Read and write | write `.github/workflows/build.yml` (Contents alone is NOT enough for this path) |
| Administration  | Read and write | enable auto-merge, set branch protection |
| Pull Requests  | Read and write | enable auto-merge, set branch protection |
| Actions         | Read-only      | list workflow runs and download artifacts — needed for the Ship wizard's "Deploy CI Build" picker (build once, deploy same artifact) |
| Metadata        | Read-only      | added automatically, mandatory baseline — leave it |

Without **Actions: Read-only**, the CI-build picker fails with `Resource not accessible by personal access token` when listing or downloading artifacts — same failure mode as the Workflows-permission gotcha below, just for a different endpoint.

Click **Generate token** and copy the value (starts with `github_pat_...`).

## 2. Update `server-config.json`

```json
{
  "githubToken": "github_pat_..."
}
```

## 3. Restart the server

`server.js` reads `server-config.json` **once at startup** — editing the file
does nothing until the process restarts. Stop and restart whatever runs it
(`node server.js`, or `npm start` / the `concurrently` script that launches
`GIT` + `NG`).

## 4. Retry Setup

Click **Configure Repository** again. Every step only acts if the
branch/file/setting doesn't already exist or isn't already set, so it's safe
to rerun after a failure.

---

## Decoding errors on the "Creating main & development branches" step

| Error shown | Real meaning |
|---|---|
| `Not Found` | The token can't write here. GitHub returns a generic 404 instead of 403 for both "doesn't exist" and "no permission" so it can't leak repo existence. For a **classic** token (`ghp_...`), this almost always means the `repo` scope wasn't checked at creation. |
| `Git Repository is empty.` (409) | Expected on a brand-new repo with zero commits — the app now treats this the same as "branch doesn't exist yet" and proceeds to create the initial commit. Not an error you need to act on. |
| `Resource not accessible by personal access token` (403) | A **fine-grained** token exists and can read the repo, but wasn't granted the specific write permission needed (see the Contents/Workflows/Administration table above). |

Key gotcha: `GET /repos/{owner}/{repo}` returning `permissions: {admin: true, push: true}`
reflects **your account's role** on the repo, not what the **token** is allowed
to do. A token can belong to the repo owner and still fail every write if its
own scope/permissions are insufficient — reads (including public repo reads)
work with little or no token permission at all, so a successful "Verifying
repository access" step proves nothing about write access.

## Classic vs fine-grained tokens, quick reference

- **Classic** (`ghp_...`, ~40 chars): scopes are account-wide checkboxes.
  Needs `repo` scope (or `public_repo` for public-only repos) to write anything.
- **Fine-grained** (`github_pat_...`, ~90+ chars): permissions are granted
  per-repository and per-category (Contents, Workflows, Administration, etc.)
  at token creation time — there's no single "repo" checkbox, you must add
  each permission explicitly as in step 1 above.
