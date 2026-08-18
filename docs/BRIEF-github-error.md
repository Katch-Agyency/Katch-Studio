# Error Brief — GitHub App Connection Failure (Deployment Backend)

**Project:** Katch Studio — Automated Deployment System
**Date:** 2026-08-17 (updated after hardening pass)
**Status:** Root cause confirmed — code hardening delivered & verified; user-side credential fix pending
**Severity:** High for the Deployment feature only (Studio itself is unaffected)

---

## 1. Summary

The deployment backend could not authenticate to GitHub. Locally,
`GET /api/github/connection` returned a generic `internal` server error, and the
production API on Vercel returned GitHub's `401` ("A JSON web token could not be
decoded"). The Studio application, Vercel credentials, and the deployment server
itself were all healthy; the failure was isolated to the GitHub App credentials
stored in environment variables.

## 2. Observed errors

**Local (Windows, `npm run server`):**

```json
{"error":{"code":"internal","message":"Something went wrong on the deployment server — please try again."}}
```

**Production (`https://katch-studio.vercel.app/api/github/connection`):**

```json
{"error":{"code":"401","message":"A JSON web token could not be decoded"}}
```

## 3. Root cause

The credentials diagnostic (`node scripts/diagnose-github.mjs`) confirmed two
faults in the local `.env`:

1. **`GITHUB_APP_PRIVATE_KEY` truncated.** The private key was pasted across
   multiple lines without surrounding double quotes. The `.env` parser reads
   only the first line (`-----BEGIN RSA PRIVATE KEY-----`); the server cannot
   parse that fragment and crashed with an opaque `internal` error.
2. **`GITHUB_APP_SLUG` contained the full URL** (`https://github.com/apps/katch-studio-projects`)
   instead of the bare slug — the reason `installUrl` reported `null`.

The production 401 was a separate copy of the same class of problem: the Vercel
key parses but GitHub rejects the signed JWT — that key is revoked, from a
different app, or paired with a mismatched `GITHUB_APP_ID`.

## 4. Impact

- GitHub connection failed → no repository creation, no push, no Vercel deploy.
- All other Studio functionality unaffected. No data loss. No workflow changes.

## 5. Fix — system hardening (delivered with this brief update)

The backend now fails *loudly and safely* instead of masking credential faults:

- **Key normalization** (`server/lib/credentials.mjs`, wired into `server/config.mjs`): real
  newlines, escaped `\n` text, CRLF, stray quotes and BOM are all canonicalized into a valid
  PEM at boot — a single-line browser paste now works without manual repair. A file-based
  source (`GITHUB_APP_PRIVATE_KEY_FILE=<path to the .pem>`) is also supported and takes
  precedence — no pasting, immune to OS-variable shadowing/truncation (local only).
- **Key validation before JWT signing** (`server/lib/github.mjs`): a missing/truncated/
  malformed key throws classified `github-key-invalid` (never an opaque `internal`);
  non-numeric App IDs throw `github-app-id-invalid`. Logs carry booleans + classification
  only — key material is never logged.
- **Classified GitHub errors**: `github-auth-rejected` (401 — revoked/mismatched key),
  `github-app-forbidden` (403 — suspended app), `github-app-not-installed` / `installationRequired`
  (auth OK, no installation), `github-installation-missing`. Friendly copy reaches the UI;
  technical detail stays server-side.
- **Slug normalization**: a full URL stored in `GITHUB_APP_SLUG` is reduced to the bare slug;
  `installUrl` is now derived from the normalized slug and surfaced by `/api/health` even
  while the key is broken.
- **JWT timestamps corrected**: `iat` keeps a 60s clock-skew buffer and the lifetime is
  exactly GitHub's 600s maximum.
- **Verification tooling**: `node scripts/diagnose-github.mjs` now runs the *server's own*
  code paths (no duplicated logic) and probes installation token + repository permissions;
  `npm run test:github-auth` automates the A–I test matrix (pure tests always; live tests
  when credentials exist). Docs updated: `.env.example`, `docs/DEPLOY.md` (troubleshooting
  table), `docs/TESTING.md`.

All suites remain green: typecheck, build, test:data, test:server, test:render,
test:github-auth (22 checks). Sandbox end-to-end proofs: unquoted truncated key →
`github-key-invalid`; escaped-`\n` key + wrong App ID → real GitHub 401 mapped to
`github-auth-rejected`; health shows a correct `installUrl` in both cases. Security audit:
no secrets committed, `.env` gitignored, no `VITE_*` deployment vars, responses/logs
secret-free.

## 6. Remaining manual steps (user side)

1. In `.env`: either wrap the private key in double quotes (real line breaks) **or** point
   at the downloaded `.pem` with `GITHUB_APP_PRIVATE_KEY_FILE=H:\path\to\key.pem` (takes
   precedence, immune to shadowing — recommended on Windows). Set
   `GITHUB_APP_SLUG=katch-studio-projects` (bare), confirm `GITHUB_APP_ID` matches.
2. If the diagnostic still reports *GitHub REJECTED the JWT (401)*: generate a fresh key on
   the GitHub App (Settings → General → Private keys → Generate) and paste the new `.pem`
   between the quotes. Generating a key invalidates all previous keys — update every
   environment together.
3. Restart the API server (`Ctrl+C`, `npm run server`) — `.env` is read only at startup.
4. Verify `/api/github/connection` → `connected: true`, `account: yusuf-mo-ali`. If instead
   `installationRequired: true`, open the printed `installUrl` and install the app.
5. Mirror the same `GITHUB_APP_ID` / `GITHUB_APP_SLUG` / `GITHUB_APP_PRIVATE_KEY` into the
   Vercel project → Settings → Environment Variables → Redeploy → hard-refresh (Ctrl+Shift+R).

## 7. Open item

`VERCEL_TOKEN` returned an unusual `404` from the Vercel API during an earlier diagnostic
(invalid tokens normally return `403`). If `/api/health` shows `providers.vercel: true`, no
action is needed; otherwise regenerate the token in Vercel → Settings → Tokens and update
both `.env` and the Vercel project env vars.
