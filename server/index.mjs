/* ============================================================
   Katch Studio — deployment API server.

   One handler, two runtimes:
     • `node server/index.mjs`  → local HTTP server on :8787
       (Vite proxies /api/* to it in development)
     • `api/index.js`           → the SAME handler as a Vercel
       serverless function (export default)

   Security model:
     • All provider secrets live in server env vars only — never
       VITE_*, never shipped to the browser.
     • No CORS headers → same-origin only by default.
     • Every request is validated; payloads are size-capped;
       errors returned to the client are friendly, technical
       details stay in the server log (tokens never logged).

   Endpoints (see docs/DEPLOY.md):
     GET  /api/health
     GET  /api/github/connection
     POST /api/github/connect
     POST /api/github/repositories   { name, visibility, projectId, branch }
     POST /api/github/push           { repository, branch, files, message }
     POST /api/vercel/prepare        { slug }
     POST /api/vercel/deploy         { projectId, projectName, slug, repository, branch }
     POST /api/netlify/prepare       { slug }
     POST /api/netlify/deploy        { siteId, slug, repository, branch }
     GET  /api/deployments/status?provider=&id=&siteId=
   ============================================================ */

import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { ApiError, readJsonBody, sendJson } from "./lib/http.mjs";
import { GithubBackend } from "./lib/github.mjs";
import { VercelBackend } from "./lib/vercel.mjs";
import { NetlifyBackend } from "./lib/netlify.mjs";
import { mockProviders, resetMockState } from "./lib/mock.mjs";
import { isValidRepoName, normalizeRepoName } from "./lib/normalize.mjs";
import { hasGitHubCredentials, serverConfig } from "./config.mjs";

const PORT = Number(process.env.DEPLOY_API_PORT ?? 8787);

/* ---------- Backend resolution (mock vs live) ---------- */

let cached = null;
function backends() {
  if (cached) return cached;
  if (serverConfig.mode === "mock") {
    cached = { mode: "mock", ...mockProviders() };
    return cached;
  }
  cached = {
    mode: "live",
    github: new GithubBackend(),
    vercel: new VercelBackend(),
    netlify: new NetlifyBackend(),
  };
  return cached;
}

/* ---------- Validation helpers ---------- */

function requireString(body, key, { max = 200 } = {}) {
  const v = body?.[key];
  if (typeof v !== "string" || !v.trim()) throw new ApiError(400, "missing-field", `“${key}” is required.`);
  if (v.length > max) throw new ApiError(400, "field-too-long", `“${key}” is too long.`);
  return v.trim();
}

function requireRepository(body) {
  const repo = body?.repository;
  const owner = typeof body?.repositoryOwner === "string" ? body.repositoryOwner : null;
  if (typeof repo === "string" && repo.includes("/")) return repo;
  if (owner && typeof repo === "string") return `${owner}/${repo}`;
  throw new ApiError(400, "missing-repo", "repository (owner/name) is required.");
}

async function githubToken(b) {
  return b.mode === "live" ? b.github.token() : "";
}

/* ---------- Routes ---------- */

const routes = {
  "GET /api/health": async () => {
    const b = backends();
    let github = { connected: false, account: null, mode: "none", installUrl: null };
    try {
      github = await b.github.connection();
    } catch (err) {
      console.error("[deploy] github connection check failed:", err);
    }
    return {
      ok: true,
      mode: b.mode,
      development: b.mode === "mock",
      github: {
        connected: Boolean(github.connected),
        account: github.account ?? null,
        installUrl: github.installUrl ?? null,
      },
      providers: {
        vercel: b.mode === "mock" ? true : b.vercel.configured(),
        netlify: b.mode === "mock" ? true : b.netlify.configured(),
      },
    };
  },

  "GET /api/github/connection": async () => {
    const b = backends();
    return b.github.connection();
  },

  "POST /api/github/connect": async (body) => {
    const b = backends();
    if (b.mode === "mock") return b.github.connect();
    /* Live mode: OAuth/App install happens on GitHub's side — the server
       verifies the installation and reports whether it is complete. */
    const conn = await b.github.connection();
    if (!conn.connected && !conn.installUrl) {
      throw new ApiError(400, "github-unconfigured", "GitHub credentials are not configured on the deployment server.");
    }
    return conn;
  },

  "POST /api/github/repositories": async (body) => {
    const b = backends();
    const projectId = requireString(body, "projectId", { max: 100 });
    const visibility = body?.visibility === "public" ? "public" : "private";
    const branch = body?.branch === "main" || body?.branch === "master" ? body.branch : "main";
    const name = normalizeRepoName(requireString(body, "name", { max: 100 }), projectId);
    if (!isValidRepoName(name)) throw new ApiError(400, "bad-repo-name", "The repository name is invalid.");
    return b.github.ensureRepository({ name, visibility, projectId, branch });
  },

  "POST /api/github/push": async (body) => {
    const b = backends();
    const repository = requireRepository(body);
    const files = body?.files;
    if (!files || typeof files !== "object" || Array.isArray(files)) {
      throw new ApiError(400, "empty-files", "The generated project contains no files.");
    }
    const message = requireString(body, "message", { max: 200 });
    const branch = typeof body?.branch === "string" && /^[a-zA-Z0-9._/-]+$/.test(body.branch) ? body.branch : "main";
    const author = body?.author;
    return b.github.pushFiles({
      repository,
      branch,
      files,
      message,
      author:
        author && typeof author.name === "string" && typeof author.email === "string"
          ? { name: author.name.slice(0, 60), email: author.email.slice(0, 120) }
          : undefined,
    });
  },

  "POST /api/vercel/prepare": async (body) => {
    const b = backends();
    const slug = requireString(body, "slug", { max: 100 });
    return b.vercel.ensureProject(slug);
  },

  "POST /api/vercel/deploy": async (body) => {
    const b = backends();
    const projectId = requireString(body, "projectId", { max: 100 });
    const projectName = requireString(body, "projectName", { max: 100 });
    const slug = requireString(body, "slug", { max: 100 });
    const repository = requireRepository(body);
    const branch = typeof body?.branch === "string" && /^[a-zA-Z0-9._/-]+$/.test(body.branch) ? body.branch : "main";
    const [owner, repo] = repository.split("/");
    return b.vercel.deployFromRepo({
      projectId,
      projectName,
      slug,
      owner,
      repo,
      branch,
      githubToken: await githubToken(b),
    });
  },

  "POST /api/netlify/prepare": async (body) => {
    const b = backends();
    const slug = requireString(body, "slug", { max: 100 });
    return b.netlify.ensureSite(slug);
  },

  "POST /api/netlify/deploy": async (body) => {
    const b = backends();
    const siteId = requireString(body, "siteId", { max: 100 });
    const slug = requireString(body, "slug", { max: 100 });
    const repository = requireRepository(body);
    const branch = typeof body?.branch === "string" && /^[a-zA-Z0-9._/-]+$/.test(body.branch) ? body.branch : "main";
    const [owner, repo] = repository.split("/");
    return b.netlify.deployFromRepo({
      siteId,
      slug,
      owner,
      repo,
      branch,
      githubToken: await githubToken(b),
    });
  },

  "GET /api/deployments/status": async (body, query) => {
    const b = backends();
    const provider = query.get("provider");
    if (provider !== "vercel" && provider !== "netlify") {
      throw new ApiError(400, "bad-provider", "provider must be “vercel” or “netlify”.");
    }
    const id = String(query.get("id") ?? "");
    const siteId = String(query.get("siteId") ?? "");
    const projectId = String(query.get("projectId") ?? "");
    if (!id || !/^[a-zA-Z0-9-]+$/.test(id)) throw new ApiError(400, "bad-deployment-id", "A deployment id is required.");

    const raw =
      provider === "vercel"
        ? await b.vercel.status(id)
        : await b.netlify.status(siteId || id, id);

    if (raw.status === "live") {
      /* Prefer the stable production alias (.vercel.app) over the per-deploy URL */
      let productionUrl = raw.url ?? null;
      if (provider === "vercel" && projectId) {
        const alias = await b.vercel.productionUrl(projectId).catch(() => null);
        if (alias) productionUrl = alias;
      }
      return { status: "live", url: productionUrl, previewUrl: raw.url ?? null };
    }
    return { status: raw.status, url: raw.url ?? null, previewUrl: raw.url ?? null, error: raw.error ?? null };
  },
};

/* ---------- HTTP handler (local + Vercel) ---------- */

export async function createHandler(req, res) {
  const url = new URL(req.url ?? "/", "http://localhost");
  const route = `${req.method} ${url.pathname}`;

  // Client branches are presentation-only. Never expose repository/deployment
  // mutations merely because the shared server files exist in the branch.
  if (!serverConfig.katchVisibility) {
    sendJson(res, 404, { error: { code: "client-mode", message: "Deployment API is disabled for client websites." } });
    return;
  }

  if (req.method === "OPTIONS") {
    res.writeHead(204, { Allow: "GET, POST, OPTIONS" });
    res.end();
    return;
  }

  const handler = routes[route];
  if (!handler) {
    sendJson(res, 404, { error: { code: "not-found", message: "Unknown API route." } });
    return;
  }

  try {
    const body = req.method === "POST" ? await readJsonBody(req) : {};
    const result = await handler(body, url.searchParams);
    if (result === undefined || result === null) {
      res.writeHead(204);
      res.end();
    } else {
      sendJson(res, 200, result);
    }
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status >= 500) {
        console.error(`[deploy] ${route} failed:`, err.technical || err.message);
      }
      sendJson(res, err.status, { error: { code: err.code, message: err.message } });
    } else {
      console.error(`[deploy] ${route} unexpected error:`, err);
      sendJson(res, 500, {
        error: { code: "internal", message: "Something went wrong on the deployment server — please try again." },
      });
    }
  }
}

/* ---------- Local entry ---------- */

export function startServer(port = PORT) {
  const server = createServer(createHandler);
  server.listen(port, "0.0.0.0", () => {
    const mode = serverConfig.mode;
    console.log(`[Katch Studio] Deployment API listening on http://localhost:${port} (mode: ${mode})`);
    if (mode === "mock") {
      console.log("[Katch Studio] Development Mode — deployments are SIMULATED (no real GitHub/Vercel/Netlify calls).");
      console.log(`[Katch Studio] GitHub configured: ${hasGitHubCredentials() ? "yes (ignored in mock mode)" : "no"}`);
    } else {
      console.log("[Katch Studio] Live mode — real GitHub/Vercel/Netlify APIs.");
    }
  });
  return server;
}

const isMain =
  Boolean(process.argv[1]) &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMain) {
  startServer();
}

export { resetMockState };
