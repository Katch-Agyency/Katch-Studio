/* ============================================================
   Netlify deployment backend — real Netlify REST API integration.

   Sites are created via the API and deploys are ZIP uploads built
   server-side from the pushed GitHub repository, so the whole flow
   works with a server-side NETLIFY_AUTH_TOKEN alone (no browser
   secrets). GitHub-linked sites (auto-build on push) can be
   layered on later without changing this interface.
   ============================================================ */

import { ZipFile } from "yazl";
import { ApiError, request } from "./http.mjs";
import { fetchRepoFiles } from "./tarball.mjs";
import { normalizeRepoName } from "./normalize.mjs";
import { serverConfig } from "../config.mjs";

const NETLIFY_API = "https://api.netlify.com/api/v1";

export class NetlifyBackend {
  constructor(config = serverConfig.netlify) {
    this.config = config;
  }

  configured() {
    return Boolean(this.config.token);
  }

  /* ---------- Site ---------- */

  async ensureSite(slug) {
    const token = this.config.token;
    if (!token) {
      throw new ApiError(400, "netlify-unconfigured", "Netlify is not configured on the Katch deployment server.");
    }
    const name = normalizeRepoName(slug);

    /* Reuse an existing site with the same name (idempotent redeploys) */
    const list = await request(`${NETLIFY_API}/sites?name=${encodeURIComponent(name)}`, { token });
    const found = Array.isArray(list.data) ? list.data.find((s) => s?.name === name) : null;
    if (found) return this.siteShape(found);

    const created = await request(`${NETLIFY_API}/sites`, {
      method: "POST",
      token,
      body: { name },
    }).catch((err) => {
      if (err instanceof ApiError && (err.status === 422 || err.status === 409)) {
        throw new ApiError(err.status, "netlify-site-conflict", `The site name “${name}” is already taken on Netlify.`);
      }
      throw err;
    });
    return this.siteShape(created.data);
  }

  siteShape(site) {
    return {
      siteId: String(site?.id ?? ""),
      name: String(site?.name ?? ""),
      url: String(site?.ssl_url ?? site?.url ?? ""),
      dashboardUrl: `https://app.netlify.com/sites/${encodeURIComponent(site?.name ?? "")}`,
    };
  }

  /* ---------- Deploy ---------- */

  async deployFromRepo({ siteId, owner, repo, branch = "main", githubToken = "" }) {
    const files = await fetchRepoFiles({ owner, repo, branch, token: githubToken });
    if (!files["package.json"]) {
      throw new ApiError(400, "not-a-project", "The repository does not contain a package.json — expected a generated Katch project.");
    }

    const zipBuffer = await zipFiles(files);
    const { data } = await request(`${NETLIFY_API}/sites/${encodeURIComponent(siteId)}/deploys`, {
      method: "POST",
      token: this.config.token,
      headers: { "Content-Type": "application/zip" },
      body: zipBuffer,
    });
    const deploymentId = String(data?.id ?? "");
    if (!deploymentId) throw new ApiError(502, "netlify-deploy-failed", "Netlify did not return a deployment id.");
    return { deploymentId, url: data?.ssl_url ?? data?.url ?? null };
  }

  /** Poll → studio status. Netlify states: new/uploading/building → building; ready → live; error → failed. */
  async status(siteId, deploymentId) {
    const { data } = await request(`${NETLIFY_API}/sites/${encodeURIComponent(siteId)}/deploys/${encodeURIComponent(deploymentId)}`, {
      token: this.config.token,
    });
    const state = String(data?.state ?? "").toLowerCase();
    if (state === "ready") {
      return { status: "live", url: data?.ssl_url ?? data?.url ?? null };
    }
    if (state === "error") {
      const msg = typeof data?.error_message === "string" ? data.error_message.slice(0, 240) : "";
      return {
        status: "failed",
        url: data?.ssl_url ?? data?.url ?? null,
        error: msg
          ? `Netlify build failed: ${msg}`
          : "Netlify build failed — view the deploy log in the Netlify dashboard.",
      };
    }
    return { status: "building", url: data?.ssl_url ?? data?.url ?? null };
  }
}

/** Build a zip archive in memory (yazl — no temp files). */
async function zipFiles(files) {
  const zip = new ZipFile();
  for (const [path, content] of Object.entries(files)) {
    zip.addBuffer(Buffer.from(content, "utf8"), path, { compress: true });
  }
  zip.end();
  const chunks = [];
  zip.outputStream.on("data", (c) => chunks.push(c));
  await new Promise((resolve, reject) => {
    zip.outputStream.on("end", resolve);
    zip.outputStream.on("error", reject);
  });
  return Buffer.concat(chunks);
}
