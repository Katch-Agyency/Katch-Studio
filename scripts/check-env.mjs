/* ============================================================
   check-env — build-time Firebase presence check.
   Runs before every build and prints (not the values, just
   presence) whether the VITE_FIREBASE_* variables are set in
   the build environment. This makes "why is the site in local
   mode?" answerable from the Vercel build logs alone.
   ============================================================ */

const REQUIRED = ["VITE_FIREBASE_API_KEY", "VITE_FIREBASE_AUTH_DOMAIN", "VITE_FIREBASE_PROJECT_ID"];
const OPTIONAL = ["VITE_FIREBASE_WORKSPACE_ID"];

const missing = REQUIRED.filter((name) => !process.env[name]);
const set = REQUIRED.filter((name) => Boolean(process.env[name]));

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
const rawKeys = ["apiKey", "authDomain", "projectId"].filter((k) => process.env[k]);
if (rawKeys.length > 0) {
  console.warn(`⚠ Found env variables WITHOUT the VITE_ prefix: ${rawKeys.join(", ")}.`);
  console.warn("  Rename them to VITE_FIREBASE_API_KEY / VITE_FIREBASE_AUTH_DOMAIN / VITE_FIREBASE_PROJECT_ID");
  console.warn("  (Vite only exposes variables whose names start with VITE_).");
}

/* Deployment backend mode hint — server-side vars only, never VITE_ */
const deployGithub = Boolean((process.env.GITHUB_APP_ID && process.env.GITHUB_APP_PRIVATE_KEY) || process.env.GITHUB_PAT);
const deployProvider = Boolean(process.env.VERCEL_TOKEN || process.env.NETLIFY_AUTH_TOKEN);
const deployExplicit = (process.env.DEPLOYMENT_MODE ?? "").toLowerCase();
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
