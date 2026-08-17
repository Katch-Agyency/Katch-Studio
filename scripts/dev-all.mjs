/* ============================================================
   dev-all — run the studio AND the deployment API together:
   one command, both processes, cross-platform (Windows-safe,
   no shell operators). `npm run dev:all` replaces the pair
   `npm run server` + `npm run dev`.
   ============================================================ */

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const viteBin = path.join(root, "node_modules", "vite", "bin", "vite.js");

const children = [];

function start(name, args) {
  const child = spawn(process.execPath, args, {
    cwd: root,
    stdio: "inherit",
    shell: false, // no shell → works on Windows + POSIX identically
  });
  child.on("exit", (code) => {
    console.log(`[dev-all] ${name} exited (${code ?? "signal"}).`);
    shutdown(code ?? 0);
  });
  children.push(child);
}

function shutdown(code) {
  for (const c of children) {
    try {
      c.kill();
    } catch {
      /* already gone */
    }
  }
  process.exit(code);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

start("deployment-api", ["server/index.mjs"]);
start("studio", [viteBin]);
console.log("[dev-all] Deployment API on :8787, Studio on :5173 (Ctrl+C to stop both).");
