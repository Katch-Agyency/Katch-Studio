/* ============================================================
   Katch Studio deployment backend — server configuration.

   ALL deployment secrets live here, server-side only. They are
   NEVER prefixed with VITE_ and NEVER shipped to the browser.

   Mode resolution:
     DEPLOYMENT_MODE=live  → real GitHub/Vercel/Netlify APIs
     DEPLOYMENT_MODE=mock  → simulated backend (development)
     (unset / auto)        → live when credentials exist, else mock

   In mock mode the studio UI shows a "Development Mode" badge —
   mock deployments are never presented as real ones.
   ============================================================ */

import dotenv from "dotenv";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { normalizeAppSlug, normalizePrivateKey } from "./lib/credentials.mjs";

/* Snapshot the OS-level environment BEFORE dotenv loads .env into it —
   used to detect a Windows/system env var shadowing the .env file
   (dotenv never overrides a variable that already exists). */
const osEnvBeforeDotenv = { ...process.env };
dotenv.config({ quiet: true });
const rawEnvText = (() => {
  try {
    const p = resolve(process.cwd(), ".env");
    return existsSync(p) ? readFileSync(p, "utf8") : "";
  } catch {
    return "";
  }
})();

/* Optional escape hatch: point at the downloaded .pem file directly.
   Immune to env-var truncation, quoting mistakes and OS-level shadowing.
   When set and readable, it takes PRECEDENCE over GITHUB_APP_PRIVATE_KEY. */
const privateKeyFile = (process.env.GITHUB_APP_PRIVATE_KEY_FILE ?? "").trim();
let privateKeyFromFile = "";
if (privateKeyFile) {
  try {
    privateKeyFromFile = readFileSync(resolve(privateKeyFile), "utf8");
  } catch (err) {
    console.warn(
      `[Katch Studio] GITHUB_APP_PRIVATE_KEY_FILE could not be read (${privateKeyFile}) — falling back to GITHUB_APP_PRIVATE_KEY. (${err?.code ?? err?.message ?? err})`
    );
    console.warn(
      "[Katch Studio]   Check the path actually exists (PowerShell: dir \"<path>\") — the downloaded .pem often lives in Downloads, and Notepad sometimes saves it as <name>.pem.txt."
    );
  }
}

export const envFacts = { osEnvBeforeDotenv, rawEnvText };

/* Single source of truth for mode auto-detection. GitHub credentials
   count when they come from EITHER the environment OR a successfully
   read GITHUB_APP_PRIVATE_KEY_FILE. */
export const modeFacts = {
  explicit: (process.env.DEPLOYMENT_MODE ?? "").toLowerCase(),
  githubOk: Boolean(
    (process.env.GITHUB_APP_ID && normalizePrivateKey(privateKeyFromFile || (process.env.GITHUB_APP_PRIVATE_KEY ?? ""))) ||
      process.env.GITHUB_PAT
  ),
  providerOk: Boolean(process.env.VERCEL_TOKEN || process.env.NETLIFY_AUTH_TOKEN),
};

export function getDeploymentMode() {
  const explicit = modeFacts.explicit;
  if (explicit === "mock") return "mock";
  if (explicit === "live") return "live";

  return modeFacts.githubOk && modeFacts.providerOk ? "live" : "mock";
}

export const serverConfig = {
  mode: getDeploymentMode(),

  github: {
    appId: (process.env.GITHUB_APP_ID ?? "").trim(),
    /** Normalized at boot: real/escaped newlines, quotes and CRLF are all
     *  canonicalized before the JWT layer ever sees the key. The file-based
     *  source (GITHUB_APP_PRIVATE_KEY_FILE) wins when present AND readable. */
    appPrivateKey: normalizePrivateKey(privateKeyFromFile || (process.env.GITHUB_APP_PRIVATE_KEY ?? "")),
    /** non-empty only when the file was actually read successfully */
    appPrivateKeyFile: privateKeyFromFile ? privateKeyFile : "",
    /** Normalized at boot: a full "https://github.com/apps/…" URL is reduced
     *  to the bare slug; the bare slug is the canonical stored form. */
    appSlug: normalizeAppSlug(process.env.GITHUB_APP_SLUG ?? ""),
    /** Optional — short-circuit installation discovery */
    appInstallationId: process.env.GITHUB_APP_INSTALLATION_ID ?? "",
    /** Alternative to a GitHub App: a fine-grained personal access token */
    pat: process.env.GITHUB_PAT ?? "",
  },

  vercel: {
    token: process.env.VERCEL_TOKEN ?? "",
    teamId: process.env.VERCEL_TEAM_ID ?? "",
  },

  netlify: {
    token: process.env.NETLIFY_AUTH_TOKEN ?? "",
  },

  /** Request body cap (raw bytes, after decompression) */
  maxBodyBytes: Number(process.env.DEPLOY_MAX_BODY_BYTES ?? 25 * 1024 * 1024),
};

export function hasGitHubCredentials() {
  const g = serverConfig.github;
  return Boolean((g.appId && g.appPrivateKey) || g.pat);
}
