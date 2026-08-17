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
dotenv.config({ quiet: true });

export function getDeploymentMode() {
  const explicit = (process.env.DEPLOYMENT_MODE ?? "").toLowerCase();
  if (explicit === "mock") return "mock";
  if (explicit === "live") return "live";

  const githubOk = Boolean(
    (process.env.GITHUB_APP_ID && process.env.GITHUB_APP_PRIVATE_KEY) || process.env.GITHUB_PAT
  );
  const providerOk = Boolean(process.env.VERCEL_TOKEN || process.env.NETLIFY_AUTH_TOKEN);
  return githubOk && providerOk ? "live" : "mock";
}

export const serverConfig = {
  mode: getDeploymentMode(),

  github: {
    appId: process.env.GITHUB_APP_ID ?? "",
    appPrivateKey: process.env.GITHUB_APP_PRIVATE_KEY ?? "",
    appSlug: process.env.GITHUB_APP_SLUG ?? "",
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
