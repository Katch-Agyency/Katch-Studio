# Linking Katch Studio to Firebase (Firestore)

Katch Studio talks to storage through a small adapter interface
(`src/types/storage.ts`). Two implementations ship with the app:

| Adapter | Used when | Files |
| --- | --- | --- |
| **localStorage** (default) | no `VITE_FIREBASE_*` env vars | `src/storage/local.ts` |
| **Firestore** | env vars present | `src/storage/firestore.ts` |

You never change UI code to switch — only `.env`. Here's the full setup.

---

## 1. Create a Firebase project

1. Go to [console.firebase.google.com](https://console.firebase.google.com/) → **Add project**.
2. Name it (e.g. `katch-studio`). Google Analytics is optional — not needed for the MVP.
3. **Important:** on the Spark (free) plan everything below costs nothing. Consider
   Billing → Budgets → set a $5 alert anyway, so a runaway script can never surprise you.

## 2. Create the Firestore database

1. In the left menu: **Build → Firestore Database → Create database**.
2. Choose **production mode** (default) and a region close to the team
   (e.g. `europe-west1` or `us-central1` — pick one; it can't be changed later).
3. The studio needs **no composite indexes** (it only reads/writes by document id).

## 3. Deploy the security rules

Copy the contents of `firestore.rules` (in the repo root) into
**Firestore Database → Rules** in the console and press **Publish**.

> Prefer the CLI? `npx firebase-tools deploy --only firestore:rules` after `firebase login`.

## 4. Enable Anonymous sign-in (recommended)

The studio signs in anonymously on boot so the rules above
(`request.auth != null`) pass.

1. **Build → Authentication → Get started → Sign-in method**.
2. Enable **Anonymous**.

Skipping this step? Use the `if true` variant inside `firestore.rules`
(for a local trial only — never for anything real).

## 5. Register a Web app and grab the config

1. **Project settings (gear) → Your apps → Web app (`</>`)**.
2. Register it (nickname: `katch-studio`, no need for Firebase Hosting).
3. From the SDK setup snippet, copy only these three values:

```js
const firebaseConfig = {
  apiKey: "AIza…",            // ← VITE_FIREBASE_API_KEY
  authDomain: "…firebaseapp.com", // ← VITE_FIREBASE_AUTH_DOMAIN
  projectId: "katch-studio",  // ← VITE_FIREBASE_PROJECT_ID
};
```

## 6. Create `.env` in the project root

```bash
cp .env.example .env   # Windows: copy .env.example .env
```

Fill it in:

```ini
VITE_FIREBASE_API_KEY=AIza…
VITE_FIREBASE_AUTH_DOMAIN=katch-studio.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=katch-studio
VITE_FIREBASE_WORKSPACE_ID=katch-prod
```

Then **restart `npm run dev`** (env vars are read at server start).

> The `VITE_` prefix is mandatory — Vite only exposes `VITE_*` vars to the app.
> These keys are **public by design** (they only identify your project); security
> comes from the Firestore rules, not from the keys.

## 7. Verify it's connected

1. Open **Settings → Storage & Sync** — it should show
   `Firestore · katch-prod` with a green dot.
2. First run seeds the demo projects into the cloud. Create or edit a project,
   then look in **Firestore Console → Data**:
   `workspaces/katch-prod/projects/<id>` — your project config is there.
3. Drafts autosave to `workspaces/katch-prod/drafts/<id>` while you edit;
   pressing **Save** moves the result into `projects` and removes the draft.

To restore the three demo projects at any time: **Settings → Restore demo data**.

## What syncs

- ✅ Projects (create / edit / duplicate / delete / status)
- ✅ Editor drafts (autosave)
- ✅ Last-opened project
- ✅ Demo-data seeding flag
- ✅ Workspace-scoped: switch teams later by changing `VITE_FIREBASE_WORKSPACE_ID`

## Known limits (honest scope)

- **1 MiB per Firestore document.** Uploaded images are auto-compressed
  (≤1600px JPEG) to stay far under it; if a config still exceeds the limit the
  studio reports the exact document instead of failing silently. Large asset
  libraries should use image URLs, or the future Firebase Storage integration
  (the ImagePicker is already isolated for it).
- **Existing localStorage data is not auto-migrated.** On first Firestore boot the
  workspace starts fresh (and seeds the demos). Move real work over with
  Settings → Export all (a manual import will come with the storage integration).
- **Firestore's offline persistence** is on by default in the web SDK — a flaky
  connection queues writes and syncs when you're back online.
- **One team per workspace for the MVP.** Real multi-team access means replacing
  anonymous sign-in with Google/email auth and per-workspace membership checks
  (the rules file has a commented template for exactly that).

## Deploying (Vercel)

The repo includes `vercel.json` (SPA rewrites so `/editor/:id`, `/preview/:id` and the other
deep links survive refresh + immutable caching for the hashed `/assets/*` files) and a build
step that copies `dist/index.html` → `dist/404.html` as a second fallback layer.

**Refresh on a deep link 404s?** The deployed build is missing the rewrite config:
`vercel.json` must be in the **repo root that Vercel builds from** (next to `package.json`) —
it is only read at build time, and it takes effect on the next deployment. Commit it, push,
redeploy, then hard-refresh (Ctrl+Shift+R) once to drop the cached old bundle.

1. **Set env vars in Vercel, not just locally.** Vercel bakes `VITE_*` vars into the bundle
   **at build time** — if they're missing during deploy, the Firestore adapter is dropped from
   the bundle and the site silently falls back to localStorage.
   Vercel → Project → **Settings → Environment Variables** → add all four `VITE_FIREBASE_*`
   values (scope: Production) → **Save** → **Deployments → ⋯ → Redeploy** (changing env vars
   never rebuilds automatically).
2. **Node version** — react-router 7 needs Node ≥ 20 (`engines` is set in package.json):
   Vercel → Project → **Settings → General → Node.js Version → 20.x**.
3. **Authorized domains** — anonymous sign-in works from any domain, but add your Vercel
   domains now so Google sign-in works later: Firebase Console → **Authentication → Settings →
   Authorized domains** → add `katch-studio.vercel.app` (and `*.vercel.app` if you want preview
   builds to auth) and your custom domain.
4. **Verification checklist**:
   - Deployed site → Settings → **Storage & Sync** shows `Firestore · katch-prod` with a green dot
   - Firestore Console → Data shows the workspace docs — the deployed app shares the same
     workspace as your local dev, so your projects are already there
   - Refresh directly on a deep link (e.g. `/editor/<projectId>`) — no 404 means the rewrites are active
   - Open the site in a second browser — same projects appear (that's the sync working)
5. **Preview deployments** (every git push) use the same env vars by default, so previews touch
   the same Firestore workspace. To keep experiments out of production data, set a separate
   `VITE_FIREBASE_WORKSPACE_ID` (e.g. `katch-preview`) scoped to the **Preview** environment.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| "Could not reach Firestore — switched to local storage" | Check `.env` values + `npm run dev` restart + browser console for details |
| "Couldn't sync with storage" toast while on Firestore | Usually `permission-denied` → deploy `firestore.rules` AND enable Anonymous sign-in |
| Settings still shows "Local browser storage" | `.env` is missing/typo'd, or the dev server wasn't restarted — **on Vercel: the `VITE_FIREBASE_*` vars were missing at BUILD time → add them in Vercel Settings → Environment Variables, then Redeploy** |
| Deployed site works but Firestore stays empty | (1) Visit the deployed URL first — the app only writes when opened. (2) Check DevTools console for `requests from referer … are blocked` → the API key is referrer-restricted: Google Cloud Console → Credentials → Browser key → add your `*.vercel.app` domain. (3) `permission-denied` → republish `firestore.rules` + verify Anonymous sign-in is enabled |
| One device shows "Firestore · katch-prod" but another shows "Local browser storage" | The connection is baked into the **build**, not the device — the other device is running a different build. Share only the production domain URL (Vercel → Settings → Domains); old preview links are separate deployments with their own env scope. Hard-refresh (Ctrl+Shift+R) once to drop a cached old bundle. Deployed builds in local mode now show a warning banner at the top of every page |
| Doc-size error mentioning a project name | That project's config passed 1 MiB → swap big uploaded images for URLs |
| Changes appear locally but not in the console | Open DevTools → Console for the sync error, then check the table above |

## Next steps when the team grows

1. **Real authentication** — enable Google sign-in, call `signInWithPopup` instead of
   anonymous, and store `uid → workspace` memberships.
2. **Firebase Storage for assets** — upload logos/photos to
   `workspaces/{ws}/assets/…` and keep URLs in the config (ImagePicker is the single
   touchpoint).
3. **Firestore rules per member** — see the commented template in `firestore.rules`.
4. **Hosting** — `npm run build` + `npx firebase-tools deploy --only hosting` gives
   the team a shared URL instead of `npm run dev`.
