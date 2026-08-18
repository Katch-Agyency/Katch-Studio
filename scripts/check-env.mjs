/* ============================================================
   check-env — build-time Firebase presence check.
   Runs before every build and prints (not the values, just
   presence) whether the VITE_FIREBASE_* variables are set in
   the build environment. This makes "why is the site in local
   mode?" answerable from the Vercel build logs alone.
   ============================================================ */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseEnvFile } from "../server/lib/credentials.mjs";

/* Merge the local .env for the deployment-mode hint (the real server
   does the same via dotenv; OS-level vars always win). */
const localEnv = (() => {
  try {
    const p = resolve(process.cwd(), ".env");
    return existsSync(p) ? parseEnvFile(readFileSync(p, "utf8")) : {};
  } catch {
    return {};
  }
})();
const merged = { ...localEnv, ...process.env };

const REQUIRED = ["VITE_FIREBASE_API_KEY", "VITE_FIREBASE_AUTH_DOMAIN", "VITE_FIREBASE_PROJECT_ID"];
const OPTIONAL = ["VITE_FIREBASE_WORKSPACE_ID"];

const missing = REQUIRED.filter((name) => !merged[name]);
const set = REQUIRED.filter((name) => Boolean(merged[name]));

if (missing.length === 0) {
  console.log(`✓ Firebase env present in this build: ${set.map(() => "✓").join(" ")} (apiKey/authDomain/projectId set${process.env.VITE_FIREBASE_WORKSPACE_ID ? `, workspace "${process.env.VITE_FIREBASE_WORKSPACE_ID}"` : ", default workspace"})`);
} else {
  console.warn("");
  console.warn("⚠ FIREBASE ENV MISSING AT BUILD TIME");
  console.warn(`  Missing: ${missing.join(", ")}`);
  console.warn("  The deployed bundle will run in LOCAL STORAGE mode.");
  console.warn("  Vercel → Project → Settings → Environment Variables:");
  console.warn("  add the variables with EXACT names (the VITE_ prefix is required).");
  console.warn("");
}

/* Also warn about the classic mistake: raw firebaseConfig keys without VITE_ */
const rawKeys = ["apiKey", "authDomain", "projectId"].filter((k) => merged[k]);
if (rawKeys.length > 0) {
  console.warn(`⚠ Found env variables WITHOUT the VITE_ prefix: ${rawKeys.join(", ")}.`);
  console.warn("  Rename them to VITE_FIREBASE_API_KEY / VITE_FIREBASE_AUTH_DOMAIN / VITE_FIREBASE_PROJECT_ID");
  console.warn("  (Vite only exposes variables whose names start with VITE_).");
}

/* Deployment backend mode hint — server-side vars only, never VITE_.
   Mirrors the server's resolver: a GITHUB_APP_PRIVATE_KEY_FILE counts
   as a key source too. */
const deployGithub = Boolean(
  (merged.GITHUB_APP_ID && (merged.GITHUB_APP_PRIVATE_KEY || merged.GITHUB_APP_PRIVATE_KEY_FILE)) || merged.GITHUB_PAT
);
const deployProvider = Boolean(merged.VERCEL_TOKEN || merged.NETLIFY_AUTH_TOKEN);
const deployExplicit = (merged.DEPLOYMENT_MODE ?? "").toLowerCase();
const deployMode = deployExplicit === "mock" ? "mock" : deployExplicit === "live" ? "live" : deployGithub && deployProvider ? "live" : "mock";
if (deployMode === "live") {
  console.log(`✓ Deployment backend: LIVE mode (GitHub ${deployGithub ? "configured" : "MISSING"}, provider ${deployProvider ? "configured" : "MISSING"})`);
} else {
  console.log("ℹ Deployment backend: MOCK mode — deployments are simulated until server-side credentials are added (see docs/DEPLOY.md).");
}

/* Anti-leak guard: deployment secrets must never be VITE_-prefixed */
const leaked = ["VITE_GITHUB_APP_ID", "VITE_GITHUB_PAT", "VITE_GITHUB_APP_PRIVATE_KEY", "VITE_VERCEL_TOKEN", "VITE_NETLIFY_AUTH_TOKEN"].filter(
  (k) => process.env[k]
);
if (leaked.length > 0) {
  console.warn(`⚠ SECURITY: deployment secrets found with a VITE_ prefix: ${leaked.join(", ")}.`);
  console.warn("  They would be compiled into the browser bundle. Rename them WITHOUT the VITE_ prefix.");
}
