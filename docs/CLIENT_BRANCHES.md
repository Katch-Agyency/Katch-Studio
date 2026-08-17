# Client branch mode

Katch Studio uses one renderer and one repository in two modes, controlled by the committed root file `katch.config.json`.

## Studio (`main`)

```json
{
  "katch_visibility": true,
  "project_config_path": "/project.json"
}
```

Studio mode boots the existing dashboard, Firebase store, editor, export tools and deployment UI. `main` does not need `public/project.json`.

## Client branch

1. Finish and explicitly save the project in Studio.
2. Open **Export → Client Branch → Download project.json**.
3. Create a branch:

   ```bash
   git switch -c client/taza
   ```

4. Copy the downloaded file into the branch:

   ```text
   public/project.json
   ```

5. Change `katch.config.json`:

   ```json
   {
     "katch_visibility": false,
     "project_config_path": "/project.json"
   }
   ```

6. Commit and push:

   ```bash
   git add katch.config.json public/project.json
   git commit -m "Configure Taza client website"
   git push -u origin client/taza
   ```

7. Build or deploy the branch normally.

Client mode does not boot the Studio store, Firebase, editor or deployment UI. It fetches the existing full `Project` JSON, validates it, resolves bundled asset paths, selects the page from the browser URL and renders `WebsiteRenderer` directly.

## Multi-page routing

Configured page paths such as `/`, `/products` and `/contact` are selected from `project.config.pages`. `vercel.json` already includes the SPA rewrite required for direct navigation.

## Assets

The Client Branch export converts built-in demo image URLs to stable `/src/assets/...` references. Client mode resolves those references through Vite so production builds emit valid fingerprinted assets. Data URLs and external URLs remain unchanged.

For new branch-specific files, put assets under `src/assets/` and reference their stable `/src/assets/...` path in `project.json`, or use a public/external URL.

## Failure behavior

If client mode is enabled without a valid `public/project.json`, the site displays a configuration error instead of exposing Studio. The deployment API also returns 404 in client mode.

## Important

`katch_visibility` controls application composition, not user authentication. Studio mode still requires proper Firebase rules and deployment API authorization before public production use.
