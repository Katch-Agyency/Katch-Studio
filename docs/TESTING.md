# Katch Studio — Verification & Testing Checklist

Last verified green: 2026-08-17 (typecheck, build, data suite, render suite ×2, audit, scaffold build).

## 1. Automated checks (run after every significant change)

From the project root (`H:\Yusuf\Work\WebWork\Katch Studio\katch-studio`):

**Windows (PowerShell):**

```powershell
cd "H:\Yusuf\Work\WebWork\Katch Studio\katch-studio"
npm install
npm run typecheck        # must exit silently (strict TS, no unused locals)
npm run build            # tsc + vite build + copy-404; "✓ SPA fallback created: dist/404.html"
npm run test:data        # must print "ALL CHECKS PASSED"
npm run test:render      # must print "ALL RENDER CHECKS PASSED" — run twice, both must pass
npm run test:server      # deployment API lifecycle over real HTTP (mock) — "ALL SERVER CHECKS PASSED"
npm run test:github-auth # GitHub auth matrix A–I (pure always; live parts when creds exist)
npm run test:scaffold    # generates /tmp/ks-scaffold; then build it by hand (see §4)
npm audit                # must print "found 0 vulnerabilities"
```

**bash (same commands):**

```bash
cd /home/user/katch-studio
npm install && npm run typecheck && npm run build
npm run test:data && npm run test:render && npm run test:render
npm run test:server && npm run test:scaffold && npm audit
```

What each suite covers:

| Command | Covers |
|---|---|
| `typecheck` | Strict TypeScript across the whole app. |
| `build` | Production bundle, lazy routes, SPA fallback file. Also runs `check-env.mjs` (Firebase env guard) and `generate-catalogue.mjs` (export codegen snapshot). |
| `test:data` | All 20 templates resolve; every project factory output is **JSON-pure** (no `undefined` fields — the bug that broke Firestore sync, group 11); ZIP config package round-trip (group 12); scaffold assembly 31 files (group 12); template lifecycle round-trip: theme + content + pages + features + no orphan refs (group 13); deployment logic: repo naming, fingerprints, commit messages, config shape (group 14). |
| `test:render` | Full jsdom render of Dashboard, Projects, Templates, New Project wizard, Editor (layers/inspector/undo/redo/variants), Export modal (scaffold/share/save-as-template), preview route, **Deploy tab full lifecycle** (connect → failure → retry → live → changes → redeploy, group 13), runtime error capture. |
| `test:server` | Boots the deployment API (mock) and drives the lifecycle over real HTTP: health honesty, GitHub connect, repo creation/reuse/suffix, push + validation, Vercel & Netlify deploy → live with URLs, redeploy, simulated build failure + retry, friendly errors. |
| `test:github-auth` | GitHub App auth matrix A–I: missing/truncated/escaped-newline/multiline key normalization + validation, slug normalization, JWT claims (RS256, iss, ≤600s lifetime, clock skew), classified errors (`github-key-invalid`, `github-app-id-invalid`, `github-auth-rejected`). Live parts (wrong App ID → 401 rejection, real auth, installation detection, repo access via installation token) run automatically when `GITHUB_APP_ID`/`GITHUB_APP_PRIVATE_KEY` exist in the environment or `--env` file; otherwise they are reported as skipped (CI-safe). |
| `test:scaffold` | Generates the standalone client project from the demo (Looky Cakes). |
| `npm audit` | Dependency vulnerabilities (prod + dev). |

## 2. Manual browser tests (local dev)

```powershell
npm run dev    # http://localhost:5173
```

### 2.1 The P0 golden path (the one thing that must never break)
Dashboard → **+ New Project** → type "Restaurant" → pick **Elegant Restaurant** → set name/logo/colors/contact/WhatsApp/language → choose sections (Hero, About, Menu, Gallery, Testimonials, Location, CTA) → edit content → **live preview updates as you type** → Save → project appears in Dashboard with correct status.

### 2.2 Persistence
- Reload the browser → project still there (localStorage mode), no lost edits.
- Firestore mode: create on device A → hard-refresh on device B → project appears. Banner in the top bar must show connected (not local mode).

### 2.3 Editor
- **Reorder** sections with move up/down — order persists after save/reload.
- Duplicate / hide / delete a section.
- **Undo/redo**: Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z — reverts content and structural edits.
- Layers tree, contextual inspector (only relevant settings shown), Add Section modal (classified library incl. E-commerce Products + SaaS Pricing).
- Multi-page: add/rename/reorder/delete pages; each page has its own sections; Navbar links update.
- Mobile drawer + preview mode on small screens.

### 2.4 Brand & theme
- Switch theme presets (Modern/Elegant/Luxury/Minimal/Bold/Playful/Corporate) — preview updates live.
- Change primary color, radius, button style, density, typography (incl. Arabic font) — live updates, no page reload.

### 2.5 Content, features, SEO
- Edit headlines/paragraphs/buttons/images/services/products/testimonials/FAQ/contact/social/hours/location.
- Toggle features: WhatsApp CTA, Contact Form, Google Maps, Booking, Online Ordering, Instagram, Analytics, SEO, Newsletter, Testimonials, Gallery — each appears/disappears in preview.
- SEO panel: title/description/keywords/OG image/slug/index toggle.
- Autosave indicator: **Saved / Saving… / Unsaved** + toasts. Never silent.

### 2.6 RTL / Arabic
- Open or create an Arabic project (e.g. Bta3 7awa4y demo) → layout flips RTL, Arabic font renders, no broken glyphs.

### 2.7 Responsive & edge cases
- Preview toggles Desktop / Tablet / Mobile (375 px) → **no horizontal overflow**, hamburger works, scroll lock + accessible close.
- Sections with empty content or missing images must degrade gracefully (placeholder, no crash).
- Long names (incl. Arabic) in project titles, nav items, buttons — no overflow.
- Many sections on one page — editor stays responsive.

### 2.8 Templates page
- Preview any of the 20 templates, **Use Template**, **Duplicate** (goes to your custom library, `tpl-custom-*`).
- **New from project** → creates a template from an existing project (exact theme + content).
- Delete a custom template → confirm dialog → gone.

### 2.9 Export (Export modal → both tabs)
- **Standalone React/Vite project** → download `katch-site-{slug}.zip` → verify with §4.
- **Config package** → download `katch-website-{slug}.zip` → contains `project.json` + `website.json` + `README.md`.
- **Share for review** → copy link → open in an incognito window → read-only preview renders.
- Full-screen preview button works.
- Deployment tab of the modal links to the editor's Deploy tab.

### 2.10 Deployment tab (editor → Deploy)
Run with `npm run dev:all` (mock backend — a "Development Mode" badge must be visible):
1. First deploy: GitHub **Not connected** → Deploy button disabled.
2. **Connect GitHub** → shows *Connected as …*.
3. Set repo name to something containing `fail` → **Deploy Project** → steps progress → **Build failed** with a friendly message → **Retry Deployment** appears.
4. Fix the repo name → **Retry** → reaches **Live** → production URL + **Open Website** + GitHub/provider links + **Deployment History** (failed + live) + logs.
5. Freshly deployed → "Deployed version is up to date". Edit content → **Changes detected** → **Deploy Changes** → same repository, new commit, live again.
6. Switch tabs mid-deploy — the status keeps tracking (controller lives for the whole editor session).
7. Narrow the window: cards stack, no horizontal overflow.

With real credentials (see `docs/DEPLOY.md`): the same flow creates a real private repo, pushes the generated project, and produces a real `.vercel.app`/`.netlify.app` URL.

## 3. Firebase + Vercel checks (if deployed)

1. Vercel → Settings → Environment Variables: exactly `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID` (+ optional `VITE_FIREBASE_WORKSPACE_ID=katch-prod`). The `VITE_` prefix is required; raw `apiKey`-style names are invisible to Vite. Delete unused `storageBucket/messagingSenderId/appId/measurementId`.
2. Any env change requires **redeploy** (commit + push). Build log must NOT show "FIREBASE ENV MISSING".
3. `firestore.rules` must use the recursive wildcard (`{document=**}`) — nested collections are not covered by v1 path rules.
4. On the canonical domain: **hard-refresh** (Ctrl+Shift+R). Check no CloudStatusBanner (means local mode).
5. Refresh on a deep link (e.g. `/projects`, `/editor/:id`) → page loads (vercel.json rewrites + `dist/404.html`).
6. Create/edit a project → if a sync error toast appears, read its reason text:
   - *permission* → rules not republished / anonymous auth issue
   - *quota/resource* → Firebase Usage tab
   - *too large (1 MiB)* → replace uploaded images with URLs
   - *network* → offline/retry
7. Console (F12) → no errors, no `undefined` field warnings.
8. PWA (deployed HTTPS only): install prompt appears once; offline reload shows app shell; update banner doesn't break the session.

## 4. Verify the standalone exported project (the real codegen proof)

After downloading `katch-site-{slug}.zip` from Export:

```powershell
# extract the zip, then inside it:
npm install
npm run build      # must finish with "✓ built" (a chunk-size warning is expected, not a failure)
npm run dev        # open the URL → the client site renders from website.json only
```

Checks: `<title>` matches the project name; all pages/sections render; images load (embedded as data URIs); editing `src/data/website.json` changes the site — no editor needed. Also covered automatically by `npm run test:scaffold` + a manual `npm install && npm run build` inside the generated folder.

## 5. If something fails

1. `npm install` first — a missing `node_modules` produces misleading errors.
2. Re-run the failing command twice — render tests are deterministic; if it passes on retry, look for stale localStorage in the test harness rather than real code.
3. `test:data` group 11 failure = an `undefined` value is being written into project data (Firestore will reject it). Find the field, write it conditionally.
4. `test:render` failure = a real UI regression — the checks mirror the user flows above.
5. Build-time "FIREBASE ENV MISSING" = env vars not set for that environment (local `.env` or Vercel). The app still works in localStorage mode; deployed sync just won't.
6. GitHub connection failing? Run `node scripts/diagnose-github.mjs` (safe, read-only, prints the exact problem + fix) and `npm run test:github-auth`. Error codes are classified — see `docs/DEPLOY.md` → Troubleshooting.
7. When in doubt, run the full suite — it takes ~2 minutes and catches the 13 classes of regressions above.
