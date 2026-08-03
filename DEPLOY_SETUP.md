# IIS Deploy Setup

The Ship tab's **Deploy to IIS** card builds a project and ships it to an
IIS server, in 4 steps:

1. **Publish Build** — builds the project (command depends on project type, see below).
2. **Copy to Staging** — zips the build output and pushes that single zip directly onto the target server's own disk, over the same PowerShell Remoting (WinRM) connection used for step 3.
3. **Deploy on Server** — the target server unzips that file into the site's folder and recycles its app pool.
4. **Verify Site** — optional HTTP health check.

Steps 2 and 3 deliberately avoid a shared UNC folder — pushing the file directly over WinRM sidesteps a "double-hop" authentication problem that a shared folder on a *third* machine would hit (see [WinRM connection problems](#winrm-connection-problems) if you're curious why).

It's a manual, independent step — merging a PR never triggers a deploy by itself.

## Projects registry

Deploy targets live in `server-config.json` (same file as `githubToken` —
never committed). Each **project** has a type and one config block per
**environment** (`dev`, `uat`, `production`, ...):

```json
{
  "githubToken": "github_pat_...",
  "credentials": {
    "iis-default": { "username": "DOMAIN\\svc-deploy", "password": "..." }
  },
  "projects": [
    {
      "id": "qualvora-web",
      "name": "Qualvora Web",
      "type": "angular",
      "environments": {
        "uat": {
          "server": "server-hostname.domain.com",
          "sharePath": "C:\\DeployStaging\\SiteName",
          "destPath": "C:\\inetpub\\wwwroot\\SiteName",
          "appPoolName": "SiteAppPool",
          "credentialRef": "iis-default",
          "useSsl": false,
          "healthCheckUrl": ""
        }
      }
    }
  ]
}
```

**Note:** projects no longer carry a `folder` field in this file. The
project's source path is entered once by the user as the **Solution Folder**
in Step 2 of the Ship wizard, and that runtime value is sent along with every
build-options lookup and deploy request — see `folder` on `DeployRequest` in
`pipeline.models.ts` and the `folder` query param on
`GET /api/projects/:id/build-options`.

| Field            | Meaning                                                                                                                                            |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `type`           | `angular`, `dotnet`, or `node` — determines the build command options offered in the UI                                                           |
| `server`         | Target IIS server's **hostname** (not a raw IP — see [WinRM troubleshooting](#winrm-connection-problems))                                         |
| `sharePath`      | A **local folder path on the target server itself** (not a UNC share) used as a temp staging spot — created automatically if it doesn't exist    |
| `destPath`       | Site's physical path **on the target server**                                                                                                     |
| `appPoolName`    | IIS app pool to recycle after deploy                                                                                                               |
| `credentialRef`  | Key into the top-level `credentials` map. A password can be `"$ENV:VAR_NAME"` to pull from an environment variable instead of sitting in the file |
| `useSsl`         | Set `true` only if plain WinRM (port 5985) is blocked on your network — see below                                                                 |
| `backupPath`     | Optional. A folder **on the target server itself** (e.g. `G:\Backups\SiteName`). If set, the current contents of `destPath` are copied into a dated subfolder here (`<backupPath>\yyyy-MM-dd_HH-mm-ss`) *before* the new build is extracted — so a bad deploy can be rolled back by hand. Omit to skip backups entirely (previous behavior). |
| `healthCheckUrl` | Optional — `GET` after deploy, reports the status code. Leave `""` to skip                                                                        |
| `excludeFromDeploy` | Optional array of filenames/paths (relative to the publish output root), e.g. `["appsettings.json"]`. Deleted from the build output right after publish, before it's zipped — so the file is never transmitted. The same list is also passed as `robocopy /XF` on the server-side `/MIR` sync in the deploy step, so that filename is left completely alone on both sides of the mirror — without this, `/MIR` would otherwise treat the server's existing copy as a stale leftover (since it's absent from the freshly-extracted source) and delete it. Can be set at project level (applies to every environment) or overridden per environment. |

Build command per `type`:

| Type      | Build command                                                                                          | Build output                             |
| --------- | -------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `angular` | Auto-detected from `angular.json` configurations + `package.json` `build:*` scripts, picker in the UI | `angular.json`'s `outputPath`            |
| `dotnet`  | `dotnet publish -c Release\|Debug`, picker in the UI                                                   | `<folder>\bin\_publish`                  |
| `node`    | `package.json` `build`/`build:*` scripts, picker in the UI                                             | First existing of `dist`, `build`, `out` |

Restart `node server.js` after editing `server-config.json` — it's read once at startup.

## One-time server prerequisites

On the **target IIS server**:
- WinRM enabled: `Enable-PSRemoting -Force`
- The `credentialRef` account needs local write access to `sharePath` and `destPath`, and rights to run `Restart-WebAppPool`

On **this machine** (running the dashboard):
- `powershell.exe` on PATH (ships with Windows by default)

If this machine isn't domain-joined with the server, or you're deploying over VPN, see [WinRM connection problems](#winrm-connection-problems) below.

## Using it

The Ship tab is a 3-step wizard: **1. Select Project**, **2. Push & Ship**, **3. Deploy**. Pick the project once in Step 1; the Deploy to IIS card in Step 3 then only asks for an **environment** and (optionally override) a **build command**, then click **Deploy to IIS**. Environments named/flagged `production` require typing the environment name to confirm before deploying. A **Cancel** button appears while a deploy is running. Recent deploys for the selected project show underneath, pulled from `deploy-audit.log`.

## Deploying from a CI build (build once, deploy same artifact)

Step 3's Deploy to IIS card can deploy either a fresh local build (as above)
or the exact `.zip` a GitHub Actions run already built and tested — nothing
is rebuilt on this machine in the latter case. This needs one extra field
per project in `server-config.json`:

```json
{
  "id": "example-web",
  "repo": "your-org/example-web"
}
```

The workflow that produces the artifact must upload it under the name
`build-<environment>` (e.g. `build-uat`, `build-production`) — or
`build-output` for a single generic build not split per environment — and
only after tests pass (`needs: test`), since the picker treats "artifact
exists" as "this run is deployable". `CI_CD` and `Relay-WEB`'s
`.github/workflows/build.yml` already do this per-environment; a repo
registered fresh through the Setup tab gets a generic single-artifact
version automatically.

**Corporate proxy / "unable to get local issuer certificate":** the backend
talks to `api.github.com` from Node, not the browser. If your network runs
HTTPS through a TLS-inspecting proxy, browsers and `curl` trust its
re-signed certificate via the Windows certificate store, but Node's own
bundled CA list doesn't — GitHub calls fail with a certificate error. Fix:
run the server with `npm run server:ca` (or `npm run start:ca` for both
processes) instead of `npm run server` / `npm start` — this adds Node's
`--use-system-ca` flag so it consults the same Windows trust store.

## Troubleshooting

| Symptom                            | Cause                                                                                                       |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| "not fully configured"             | One of `server`/`sharePath`/`destPath`/`appPoolName`/`credentialRef` is empty for that project/environment |
| `stage` fails                       | Usually a WinRM problem (same causes as `deploy` below) — it also connects to the server                  |
| `deploy` fails with a WinRM error   | See [WinRM connection problems](#winrm-connection-problems)                                                |
| `deploy` fails: *"path either does not exist or is not a valid file system path"* on `Expand-Archive` | `sharePath` is set to a UNC share instead of a local path on the target server — see item 5 below |
| `verify` shows a non-2xx status    | App pool recycled fine, but the app itself is erroring — check IIS logs on the target                     |
| "already running"                  | Another deploy to that project/environment is in flight — wait or click Cancel                            |

## WinRM connection problems

Work through these **in order** — each fixes a specific error you'll see. Stop once deploy succeeds.

**1. `Set-Item` itself fails: *"client cannot connect to the destination"***
- **Where:** your machine, elevated PowerShell
- **Fix:**
  ```powershell
  Start-Service WinRM
  Set-Item WSMan:\localhost\Client\TrustedHosts -Value "<server-hostname>" -Concatenate -Force
  ```

**2. `ServerNotTrusted` / `PSSessionStateBroken`**
- **Where:** your machine, elevated PowerShell
- **Fix:** Same as #1 — trusts the server for WinRM. Use the server's **hostname**, not IP (Kerberos can't authenticate to a bare IP).

**3. `WinRMOperationTimeout`** (TCP port test succeeds, but `Test-WSMan -ComputerName <server>` also times out)
- **Where:** the server, elevated PowerShell
- **Fix:** Windows Firewall's WinRM rule for the Public profile only allows the local subnet by default — widen it:
  ```powershell
  Get-NetFirewallRule -DisplayName "Windows Remote Management (HTTP-In)" | ForEach-Object {
      $f = $_ | Get-NetFirewallAddressFilter
      if ($f.RemoteAddress -eq 'LocalSubnet') { $_ | Set-NetFirewallRule -RemoteAddress Any }
  }
  ```

**4. Same timeout persists after #1–3**, but `Test-WSMan -ComputerName <server> -UseSSL` gives a *different* error (e.g. a certificate error)
- **Where:** `server-config.json`, that environment
- **Fix:** Your network is blocking plaintext WinRM (5985) but passes HTTPS (5986) — set `"useSsl": true` on that environment. Requires the server to already have a WinRM-HTTPS listener; if `-UseSSL` also just times out, this path isn't available.

**5. `deploy` connects fine, but `Expand-Archive` fails: *"path either does not exist or is not a valid file system path"*** — even though you can browse to that exact file yourself over RDP
- **Where:** `server-config.json`, that environment
- **Cause:** the WinRM "double-hop" problem. `Invoke-Command` opens a remote session into the target server, and if `sharePath` is a UNC share hosted on a *third* machine, that remote session can't use your credentials to reach it — WinRM doesn't forward credentials across a second hop by default. Browsing the share yourself over RDP works fine because that's a single hop with your real session; the remote script has no such thing.
- **Fix:** make sure `sharePath` is a **local path on the target server itself** (e.g. `C:\DeployStaging\SiteName`), not a UNC share. The file gets pushed there directly over the same already-authenticated WinRM connection (`Copy-Item -ToSession`), so no second hop is ever needed.

**Why #4 happens:** a corporate firewall/VPN gateway can allow a TCP handshake through while still silently dropping the actual (unencrypted) WinRM protocol traffic — deep packet inspection recognizing and blocking plaintext HTTP-based protocols. Encrypted traffic on 5986 isn't inspectable the same way, so it gets through.

**Security note on #3:** widening a firewall rule on a shared server is a real (if narrow) change — any host can now attempt a WinRM connection, though valid credentials are still required to do anything. If you don't manage that server yourself, ask whoever does rather than making the change blind.

If deploy still fails after all of this, the next error will be a genuinely different problem (e.g. an actual auth/permissions failure) — not a repeat of the above.
