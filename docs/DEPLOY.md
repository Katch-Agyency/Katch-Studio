# Katch Studio — Automated Deployment

One-click deployment of generated websites: **GitHub repository → build on Vercel/Netlify → production URL**, with the project permanently linked for maintenance updates.

```text
Katch Studio ──▶ Generate React/Vite project ──▶ GitHub repository ──▶ Vercel / Netlify ──▶ Production URL
      ▲                                                                                        │
      └────────────────────────  Deploy Changes (same repo, rebuild)  ◀────────────────────────┘
```

## Architecture

```
React/Vite UI (Deploy tab)  →  Secure API layer (/api/*)  →  GitHub · Vercel · Netlify
   ids/names/URLs only         server-side secrets only
```

* **UI** — the editor's **Deploy** tab (`src/features/deploy/`). The controller (`useDeployment.tsx`) drives the lifecycle: `validate → generate → repository → push → provider → deploy → poll → live`, persists progress onto the project's `deployment` config, and can **retry only the failed stage**.
* **API** — `server/index.mjs`, one handler used by two runtimes:
  * Local: `npm run server` (port 8787; Vite proxies `/api/*` in dev).
  * Vercel: `api/index.js` (serverless function; `vercel.json` rewrites `/api/*` to it). The Node version for the function comes from `package.json` `engines.node` (or Vercel → Project → Settings → General → Node.js Version — set 20.x). Do NOT add a `functions.runtime` block to `vercel.json`: the `"nodejs20.x"` syntax is invalid there and fails the build with *"Function Runtimes must have a valid version"*.
* **Providers** — pluggable backends behind one interface (`DeploymentProvider`):
  * `server/lib/github.mjs` — GitHub App (JWT → installation token) or fine-grained PAT; repositories default **private**, branch `main`; pushes via the Git Data API (one commit per deploy).
  * `server/lib/vercel.mjs` — project ensure + direct-upload deployments (`/v2/now/files` → `/v13/deployments`), status polling, production alias lookup. Works with a token alone — no account-level GitHub OAuth needed.
  * `server/lib/netlify.mjs` — site ensure + zip deploys built server-side from the pushed repo, status polling, site URL.
  * `server/lib/mock.mjs` — **Development Mode**: a faithful simulation used whenever credentials are missing. The API reports `mode: "mock"` and the UI shows a "Development Mode" badge; simulated URLs use a `mock-` prefix. For failure-injection testing, any project/repository name containing **"fail"** fails the simulated build.

## Endpoints

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/health` | mode (mock/live), GitHub connection, provider availability |
| GET | `/api/github/connection` | GitHub connection status + App install URL |
| POST | `/api/github/connect` | verify GitHub App installation (mock: instant connect) |
| POST | `/api/github/repositories` | create-or-reuse repository (name normalized, private default) |
| POST | `/api/github/push` | push the generated file map as one commit (gzip-capable) |
| POST | `/api/vercel/prepare` · `/api/netlify/prepare` | ensure provider project/site |
| POST | `/api/vercel/deploy` · `/api/netlify/deploy` | start a deployment from the pushed repository |
| GET | `/api/deployments/status` | poll status (`building` → `live`/`failed`) + production URL |

## Development

```powershell
npm run dev:all        # studio on :5173 + deployment API on :8787 (mock mode by default)
# or two terminals:
npm run server         # deployment API
npm run dev            # studio
npm run test:server    # full mock lifecycle over real HTTP (connect → repo → push → deploy → live → failure → retry)
```

## Going live — server-side credentials

All credentials are **server-side environment variables only**. They are read by `server/index.mjs` (local `.env`) or must be set in **Vercel → Project → Settings → Environment Variables**. ⚠️ Never prefix them with `VITE_` — the build guard (`scripts/check-env.mjs`) warns if you do, and Vite would otherwise bake them into the browser bundle.

### 1. GitHub (choose one)

**Option A — GitHub App (recommended).** GitHub → Settings → Developer settings → GitHub Apps → New GitHub App, then:
* Repository permissions: **Contents (Read & write)**, **Administration (Read & write)**, **Metadata (Read)** (least privilege — exactly what repo creation + pushes need).
* Generate a private key, note the **App ID** (numeric) and the **slug** from the app's public page.
* Install the app on your account/organization (the studio's "Connect GitHub" button links to the installation page automatically once `GITHUB_APP_SLUG` is set).

```env
GITHUB_APP_ID=123456
# BARE slug only — the tail of the app URL (https://github.com/apps/katch-studio-projects → katch-studio-projects).
# A full URL is auto-normalized at server start, but store the bare form.
GITHUB_APP_SLUG=katch-studio-projects
# The ENTIRE .pem contents inside double quotes with REAL line breaks.
# Single-line keys with literal \n text are also accepted (normalized automatically).
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA... (every line from the .pem file)
-----END RSA PRIVATE KEY-----"
```

> ⚠️ **Key rotation:** generating a new private key on the GitHub App invalidates every previous key. Update `.env` AND the Vercel environment variables with the same current key **together**, then restart the server / redeploy.

> **Windows tip — the no-paste alternative.** If the multi-line env var keeps misbehaving (truncation, quoting, an old `setx` value shadowing the file), store the downloaded `.pem` somewhere on disk and add `GITHUB_APP_PRIVATE_KEY_FILE=H:\path\to\key.pem` to `.env`. The server reads the key straight from the file — it takes precedence over `GITHUB_APP_PRIVATE_KEY`, needs no admin rights, and cannot be truncated. On Vercel, file paths don't exist: keep using the env var there (the dashboard handles multi-line values fine).

> **Verify credentials anytime (safe, read-only, no secrets printed):**
> ```powershell
> node scripts/diagnose-github.mjs     # full local + live GitHub/Vercel/Netlify check
> npm run test:github-auth             # automated test matrix (live parts run when credentials exist)
> ```

**Option B — fine-grained personal access token (quickest).** GitHub → Settings → Developer settings → Personal access tokens → Fine-grained → All repositories → Contents RW, Administration RW, Metadata RO.

```env
GITHUB_PAT=
```

### 2. Vercel

Vercel → Account Settings → Tokens → Create token (account scope).

```env
VERCEL_TOKEN=
VERCEL_TEAM_ID=        # optional — only for team accounts
```

### 3. Netlify

Netlify → User settings → Applications → Personal access tokens → New access token.

```env
NETLIFY_AUTH_TOKEN=
```

### 4. Mode

```env
DEPLOYMENT_MODE=       # "mock" forces simulation, "live" forces real APIs, empty = auto-detect
```

Redeploy the studio after changing Vercel env vars — they are read at build/runtime by the API, not by the browser.

## Security model

* Secrets never enter the browser: the client only receives ids, names and URLs.
* No tokens in localStorage, no `VITE_*` deployment variables, tokens never logged (Authorization headers stripped from server errors).
* Same-origin by default (no CORS headers) — the API is only callable from the studio itself.
* Every request is validated server-side (name patterns, size caps ≤25 MB per request, ≤10 MB per file, ≤500 files); errors returned to the UI are friendly, technical details stay in server logs.
* Repositories are created **private by default**; the branch is `main`.
* GitHub App tokens are short-lived installation tokens minted per request.

## Known limits (honest notes)

* Vercel serverless caps request bodies (~4.5 MB): the push endpoint gzip-compresses the file map, but a project whose embedded images total many megabytes may need images replaced with URLs (the API reports this clearly if it happens). Local mode has no such cap.
* One provider project per studio project: redeploys reuse the same repository and provider project so the production URL stays stable.
* Rollback is *prepared*, not implemented: full deployment history with commit ids is stored (`deploymentHistory`), so a future rollback can restore any commit.
* Custom domains: the model stores the production URL cleanly; a future phase can add domain aliasing (Vercel/Netlify API) on top.

## Troubleshooting — GitHub authentication

The API classifies every GitHub failure into a safe error `code` (shown in the UI) while the technical detail stays in the server log. `GET /api/github/connection` (or the diagnostic script) tells you exactly which case you are in:

| Error code | Meaning | Fix |
|---|---|---|
| `github-key-invalid` | Private key missing, truncated, or malformed PEM (server could not even sign a JWT) | Re-paste the complete `.pem` contents into `GITHUB_APP_PRIVATE_KEY` (double quotes, real line breaks), restart the server |
| `github-key-invalid` + `no-footer` in the server console | Only the first key line is being read | See the **key shape** report the server now prints at boot — it names the cause: (a) unquoted multi-line paste, (b) duplicate definitions, or (c) an OS-level variable shadowing the file |
| Windows/system env var `GITHUB_APP_PRIVATE_KEY` exists | dotenv **never overrides** an existing OS variable — the OS value wins even when `.env` is correct (a leftover `setx` value is truncated at 1024 chars → `no-footer`) | `[Environment]::SetEnvironmentVariable("GITHUB_APP_PRIVATE_KEY", $null, "User")` in PowerShell (add `, "Machine"` with admin rights), close and reopen the terminal, restart the server |
| Deleting the Machine-scope variable fails ("Requested registry access is not allowed") | PowerShell isn't elevated | Either run PowerShell as administrator, or skip deleting entirely: set `GITHUB_APP_PRIVATE_KEY_FILE=<path to the .pem>` in `.env` — it takes precedence and is immune to shadowing |
| Server boots in mock with *"no provider token was found"* even though `VERCEL_TOKEN` is in `.env` | (a) an OS-level `VERCEL_TOKEN` variable shadows the file (dotenv never overrides OS vars — even an empty one), (b) `VERCEL_TOKEN` is defined twice and the last definition is empty, (c) the token line is missing from the repo-root `.env` | The server console prints the exact cause at boot (`Provider token analysis` + `CAUSE:`). For (a): delete the OS variable, close/reopen all terminals, restart. For (b): keep exactly one definition. For (c): put it in the same folder as `package.json` |
| Server boots in mock although the key comes from `GITHUB_APP_PRIVATE_KEY_FILE` | Old behavior — mode auto-detection only counted the env-var key | Fixed: auto-detection now counts a successfully read key file, so file-key + provider token resolves to live |
| `github-app-id-invalid` | `GITHUB_APP_ID` is not numeric | Use the numeric App ID from the app's General settings page |
| `github-auth-rejected` | GitHub rejected the signed JWT (401) — key revoked, from a different app, or App ID mismatch | Generate a fresh key on the GitHub App and update `.env` + Vercel together |
| `github-app-forbidden` | GitHub returned 403 — app suspended/blocked | Check the app's settings page on github.com |
| `github-app-not-installed` | App authenticates but has no installation | Open the `installUrl` from the response and Install (All repositories) |
| `github-installation-missing` | Installation id no longer exists | Reinstall the app on your account |
| `provider-unreachable` | Network problem reaching GitHub/Vercel/Netlify | Check internet access and retry |

`.env` is read only at server start — after any fix: restart (`Ctrl+C`, `npm run server`), re-check `/api/github/connection`, then mirror the same values into Vercel and redeploy.
