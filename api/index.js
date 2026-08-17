/* ============================================================
   Vercel serverless adapter — the deployment API as an
   api/index.js function. Requests to /api/* are rewritten here
   (see vercel.json) and handled by the SAME code that runs
   locally under `npm run server`.

   Secrets come from the Vercel project's Environment Variables
   (GITHUB_APP_ID, VERCEL_TOKEN, …) — never from the client.
   ============================================================ */

import { createHandler } from "../server/index.mjs";

export default createHandler;
