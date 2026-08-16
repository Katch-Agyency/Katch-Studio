/* ============================================================
   copy-404 — belt-and-suspenders for SPA deployments.
   Copies dist/index.html → dist/404.html after every build.
   If a host ever serves a deep link (e.g. /settings) without
   SPA rewrites, it returns this file instead of a dead page —
   the React app boots and BrowserRouter renders the right
   route from the URL.
   ============================================================ */

import { copyFileSync, existsSync } from "node:fs";
import path from "node:path";

const dist = path.join(process.cwd(), "dist");
const from = path.join(dist, "index.html");
const to = path.join(dist, "404.html");

if (!existsSync(from)) {
  console.error("copy-404: dist/index.html not found — run vite build first.");
  process.exit(1);
}

copyFileSync(from, to);
console.log("✓ SPA fallback created: dist/404.html");
