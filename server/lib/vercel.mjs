/* ============================================================
   Vercel deployment backend — real Vercel REST API integration.

   Deployments are DIRECT uploads driven by the server: the pushed
   GitHub repository is downloaded, uploaded file-by-file to the
   Vercel file endpoint, then a production deployment is created
   and polled. This works with a server-side VERCEL_TOKEN alone —
   no browser secrets, no account-level GitHub OAuth required.
   (GitHub-linked auto-builds can be layered on later without
   touching this interface.)
   ============================================================ */

import { createHash } from "node:crypto";
import { ApiError, request } from "./http.mjs";
import { fetchRepoFiles } from "./tarball.mjs";
import { normalizeRepoName } from "./normalize.mjs";
import { serverConfig } from "../config.mjs";

const VERCEL_API = "https://api.vercel.com";

export class VercelBackend {
  constructor(config = serverConfig.vercel) {
    this.config = config;
  }

  configured() {
    return Boolean(this.config.token);
  }

  teamQuery() {
    return this.config.teamId ? `?teamId=${encodeURIComponent(this.config.teamId)}` : "";
  }

  /* ---------- Project ---------- */

  async ensureProject(slug) {
    const token = this.config.token;
    if (!token) {
      throw new ApiError(400, "vercel-unconfigured", "Vercel is not configured on the Katch deployment server.");
    }
    const name = normalizeRepoName(slug);

    /* Reuse an existing project with the same name (idempotent redeploys) */
    const existing = await request(`${VERCEL_API}/v9/projects/${encodeURIComponent(name)}${this.teamQuery()}`, {
      token,
    }).catch((err) => (err instanceof ApiError && err.status === 404 ? null : Promise.reject(err)));
    if (existing) {
      return this.projectShape(existing.data);
    }

    const created = await request(`${VERCEL_API}/v9/projects${this.teamQuery()}`, {
      method: "POST",
      token,
      body: {
        name,
        framework: "vite",
        buildCommand: "npm run build",
        installCommand: "npm install",
        outputDirectory: "dist",
      },
    }).catch((err) => {
      /* Racy double-create → fetch and reuse */
      if (err instanceof ApiError && (err.status === 400 || err.status === 409)) {
        return request(`${VERCEL_API}/v9/projects/${encodeURIComponent(name)}${this.teamQuery()}`, { token }).then(
          (r) => r,
          () => {
            throw new ApiError(err.status, "vercel-project-conflict", "Could not create the Vercel project — the name may be taken.");
          }
        );
      }
      throw err;
    });
    return this.projectShape(created.data);
  }

  projectShape(p) {
    const accountId = p?.accountId ?? this.config.teamId ?? "";
    return {
      projectId: String(p?.id ?? ""),
      name: String(p?.name ?? ""),
      accountId: String(accountId),
      dashboardUrl: accountId
        ? `https://vercel.com/${accountId}/${encodeURIComponent(p?.name ?? "")}`
        : `https://vercel.com/dashboard`,
    };
  }

  /* ---------- Deploy ---------- */

  async deployFromRepo({ projectId, projectName, owner, repo, branch = "main", githubToken = "" }) {
    const token = this.config.token;
    const files = await fetchRepoFiles({ owner, repo, branch, token: githubToken });
    const paths = Object.keys(files);
    if (!paths.includes("package.json")) {
      throw new ApiError(400, "not-a-project", "The repository does not contain a package.json — expected a generated Katch project.");
    }

    /* 1. Upload every file to the Vercel file store */
    const uploaded = [];
    for (const path of paths) {
      const content = Buffer.from(files[path], "utf8");
      const digest = createHash("sha1").update(content).digest("hex");
      const { data } = await request(`${VERCEL_API}/v2/now/files`, {
        method: "POST",
        token,
        headers: {
          "Content-Type": "application/octet-stream",
          "x-vercel-digest": digest,
        },
        body: content,
      });
      const uid = data?.uid ?? data?.id;
      if (!uid) throw new ApiError(502, "vercel-upload-failed", "Vercel could not receive the project files.");
      uploaded.push({ file: path, data: String(uid), sha: digest });
    }

    /* 2. Create a production deployment */
    const { data } = await request(`${VERCEL_API}/v13/deployments${this.teamQuery()}`, {
      method: "POST",
      token,
      body: {
        name: projectName,
        project: projectId,
        target: "production",
        files: uploaded,
        projectSettings: {
          framework: "vite",
          buildCommand: "npm run build",
          installCommand: "npm install",
          outputDirectory: "dist",
          devCommand: "npm run dev",
        },
      },
    }).catch((err) => {
      if (err instanceof ApiError && err.status === 400) {
        throw new ApiError(400, "vercel-deploy-rejected", "Vercel rejected the deployment — check the project settings in the Vercel dashboard.");
      }
      throw err;
    });

    const deploymentId = String(data?.id ?? data?.uid ?? "");
    if (!deploymentId) throw new ApiError(502, "vercel-deploy-failed", "Vercel did not return a deployment id.");
    return {
      deploymentId,
      url: data?.url ? `https://${data.url}` : null,
    };
  }

  /** Poll → studio status + URL. Vercel states: QUEUED/INITIALIZING/BUILDING → building; READY → live; ERROR/CANCELED → failed. */
  async status(deploymentId) {
    const { data } = await request(`${VERCEL_API}/v13/deployments/${encodeURIComponent(deploymentId)}${this.teamQuery()}`, {
      token: this.config.token,
    });
    const state = String(data?.state ?? "").toUpperCase();
    if (state === "READY") {
      return { status: "live", url: data?.url ? `https://${data.url}` : null };
    }
    if (state === "ERROR" || state === "CANCELED") {
      return {
        status: "failed",
        url: data?.url ? `https://${data.url}` : null,
        error: friendlyBuildError(data),
      };
    }
    return { status: "building", url: data?.url ? `https://${data.url}` : null };
  }

  /** Production alias — the stable .vercel.app URL */
  async productionUrl(projectId) {
    const { data } = await request(`${VERCEL_API}/v9/projects/${encodeURIComponent(projectId)}/aliases${this.teamQuery()}`, {
      token: this.config.token,
    });
    const list = Array.isArray(data?.aliases) ? data.aliases : [];
    const prod = list.find((a) => typeof a?.alias === "string" && a.alias.endsWith(".vercel.app"));
    return prod?.alias ? `https://${prod.alias}` : null;
  }
}

function friendlyBuildError(deployment) {
  const code = deployment?.errorCode ?? deployment?.buildError ?? "";
  const message = typeof deployment?.errorMessage === "string" ? deployment.errorMessage.slice(0, 240) : "";
  if (code || message) return `Vercel build failed${message ? `: ${message}` : code ? ` (${code})` : ""}. View the deployment logs in the Vercel dashboard.`;
  return "Vercel build failed — view the deployment logs in the Vercel dashboard.";
}
