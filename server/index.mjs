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
import { inspectGithubKeyConfig, inspectProviderTokenConfig } from "./lib/credentials.mjs";
import { envFacts, hasGitHubCredentials, modeFacts, serverConfig } from "./config.mjs";

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
      /* Still surface the install link when the slug is known — the
       * connection check can fail on a broken key while the app itself
       * is perfectly installable. */
      if (b.mode === "live" && b.github.authMode === "app") {
        const slug = serverConfig.github.appSlug;
        if (slug) {
          github = {
            connected: false,
            account: null,
            mode: "app",
            installUrl: `https://github.com/apps/${slug}/installations/new`,
          };
        }
      }
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

/* ---------- Boot-time provider-token shape check (local only, secret-free) ---------- */

function logProviderTokenCause() {
  const facts = inspectProviderTokenConfig({
    rawEnvText: envFacts.rawEnvText,
    osEnv: envFacts.osEnvBeforeDotenv,
  });
  console.log("[Katch Studio] Provider token analysis (structure only, no secrets):", facts);

  const shadowed = [facts.vercel, facts.netlify].find((f) => f.osEnvShadowing);
  if (shadowed) {
    const name = shadowed === facts.vercel ? "VERCEL_TOKEN" : "NETLIFY_AUTH_TOKEN";
    console.log(
      `[Katch Studio] CAUSE: an OS-level environment variable named ${name} exists (${shadowed.osEnvLength} chars) and SHADOWS the .env file — dotenv never overrides OS variables, even an EMPTY one.`
    );
    console.log(`[Katch Studio]   Fix — delete it in PowerShell, close and reopen ALL terminals, restart the server:`);
    console.log(`[Katch Studio]   [Environment]::SetEnvironmentVariable("${name}", $null, "User")`);
    return;
  }

  const lastEmpty = [facts.vercel, facts.netlify].find((f) => f.lastDefinitionEmpty);
  if (lastEmpty) {
    const name = lastEmpty === facts.vercel ? "VERCEL_TOKEN" : "NETLIFY_AUTH_TOKEN";
    const line = lastEmpty.definitionLines[lastEmpty.definitionLines.length - 1];
    console.log(
      `[Katch Studio] CAUSE: the LAST ${name} definition in .env (line ${line}) is empty — dotenv keeps only the LAST definition, so it discards your real token.`
    );
    console.log("[Katch Studio]   Fix — delete the empty definition line(s), keep exactly one line with the real token, restart.");
    return;
  }

  /* the line physically exists with a value, but the parsed environment
     has none → an unterminated quoted block ABOVE it swallowed it */
  const swallow = [facts.vercel, facts.netlify].find((f) =>
    f.definedInFile && !f.lastDefinitionEmpty && !(f === facts.vercel ? serverConfig.vercel.token : serverConfig.netlify.token)
  );
  if (swallow) {
    const name = swallow === facts.vercel ? "VERCEL_TOKEN" : "NETLIFY_AUTH_TOKEN";
    console.log(
      `[Katch Studio] CAUSE: the ${name} line EXISTS in .env but the server's environment has no value for it — an unterminated quoted block above it (most likely the GITHUB_APP_PRIVATE_KEY block missing its closing double quote) is swallowing every line below it.`
    );
    console.log(`[Katch Studio]   Fix — make sure the quoted key block ends with a closing " on its own line, save, restart.`);
    return;
  }

  const dup = [facts.vercel, facts.netlify].find((f) => f.duplicateDefinitions > 1);
  if (dup) {
    const name = dup === facts.vercel ? "VERCEL_TOKEN" : "NETLIFY_AUTH_TOKEN";
    console.log(
      `[Katch Studio] CAUSE: ${name} is defined ${dup.duplicateDefinitions} times in .env (lines ${dup.definitionLines.join(", ")}) — the last one wins. Keep exactly one definition.`
    );
    return;
  }

  if (!facts.vercel.definedInFile && !facts.netlify.definedInFile) {
    console.log(
      "[Katch Studio] CAUSE: neither VERCEL_TOKEN nor NETLIFY_AUTH_TOKEN is defined in the .env the server reads (the repo-root .env — same folder as package.json)."
    );
    console.log("[Katch Studio]   Fix — make sure the token line lives in H:\\...\\katch-studio\\.env (not in a subfolder like server\\.env), then restart.");
    return;
  }

  console.log(
    "[Katch Studio] CAUSE unclear from the file shape alone — run `node scripts/diagnose-github.mjs` for the full forensics (it checks the exact same file and reports line-by-line)."
  );
}

/* ---------- Boot-time credential shape check (local only, secret-free) ---------- */

function logGitHubKeyBootSummary() {
  const g = serverConfig.github;
  if (!g.appId && !g.pat) return;
  const inMock = serverConfig.mode === "mock";

  const summary = {
    appIdConfigured: Boolean(g.appId && /^\d+$/.test(String(g.appId))),
    appSlugConfigured: Boolean(g.appSlug),
    privateKeyConfigured: Boolean(g.appPrivateKey),
    privateKeyFormatValid: Boolean(g.appPrivateKey && g.appPrivateKey.includes("-----END")),
    keySource: g.appPrivateKeyFile ? "file" : "env",
  };
  if (summary.privateKeyFormatValid) {
    console.log(
      `[Katch Studio] GitHub App key: valid PEM (source: ${summary.keySource})${inMock ? " — ignored: server is in mock mode" : ""}. Booleans only:`,
      summary
    );
    return;
  }

  const facts = inspectGithubKeyConfig({
    rawEnvText: envFacts.rawEnvText,
    osEnv: envFacts.osEnvBeforeDotenv,
  });
  console.log(
    `[Katch Studio] GitHub App key problem${inMock ? " (server is in mock mode — nothing real will be attempted)" : ""} (booleans only, no secrets):`,
    { ...summary, ...facts }
  );

  if (facts.osEnvShadowing) {
    console.log(
      `[Katch Studio] CAUSE: a Windows/system environment variable named GITHUB_APP_PRIVATE_KEY exists (${facts.osEnvLength} chars) and SHADOWS the .env file — dotenv never overrides OS variables. Delete it (or use the file source, which needs no admin), then restart:`
    );
    console.log('[Katch Studio]   PowerShell (user scope): [Environment]::SetEnvironmentVariable("GITHUB_APP_PRIVATE_KEY", $null, "User")');
    console.log('[Katch Studio]   Machine scope needs an ADMIN PowerShell (add "Machine"); otherwise skip it and use:');
    console.log('[Katch Studio]   GITHUB_APP_PRIVATE_KEY_FILE=<path to the downloaded .pem>  in .env — takes precedence, immune to shadowing');
    console.log('[Katch Studio]   (close and reopen all terminals afterwards, then restart the server)');
  } else if (facts.duplicateDefinitions > 0) {
    console.log(
      `[Katch Studio] CAUSE: GITHUB_APP_PRIVATE_KEY is defined ${facts.duplicateDefinitions} times in .env (lines ${facts.definitionLineNumbers.join(", ")}) — the LAST definition wins. Remove the broken definition(s) and restart.`
    );
  } else if (!facts.firstDefinitionQuoted) {
    console.log(
      `[Katch Studio] CAUSE: the key on line ${facts.definitionLineNumbers[0] ?? "?"} of .env is NOT wrapped in double quotes — only that single line is read (BEGIN without END). Wrap the entire key in "..." with real line breaks, then restart.`
    );
  } else {
    console.log(
      `[Katch Studio] CAUSE: the key block on line ${facts.definitionLineNumbers[0] ?? "?"} is quoted but still invalid — check for smart quotes, a missing closing quote, or a break inside the block. Re-paste the .pem contents cleanly, then restart.`
    );
  }
}

export function startServer(port = PORT) {
  const server = createServer(createHandler);
  server.listen(port, "0.0.0.0", () => {
    const mode = serverConfig.mode;
    console.log(`[Katch Studio] Deployment API listening on http://localhost:${port} (mode: ${mode})`);
    if (mode === "mock") {
      console.log("[Katch Studio] Development Mode — deployments are SIMULATED (no real GitHub/Vercel/Netlify calls).");
      const explicit = modeFacts.explicit === "mock";
      if (explicit) {
        console.log("[Katch Studio] Why mock: DEPLOYMENT_MODE=mock is set explicitly. Set DEPLOYMENT_MODE=live (or remove the line) to use real APIs.");
      } else if (modeFacts.githubOk && !modeFacts.providerOk) {
        console.log(
          "[Katch Studio] Why mock: GitHub credentials ARE configured, but no provider token was found — auto mode needs VERCEL_TOKEN (or NETLIFY_AUTH_TOKEN) too. Restore it in .env and restart."
        );
        logProviderTokenCause();
      } else if (!modeFacts.githubOk && modeFacts.providerOk) {
        console.log(
          "[Katch Studio] Why mock: a provider token IS configured, but GitHub credentials were not detected (need GITHUB_APP_ID + a readable key/env file, or GITHUB_PAT)."
        );
      } else {
        console.log("[Katch Studio] Why mock: no GitHub credentials and no provider token — auto mode falls back to mock.");
      }
      console.log(`[Katch Studio] GitHub configured: ${hasGitHubCredentials() ? "yes (ignored in mock mode)" : "no"}`);
      logGitHubKeyBootSummary();
    } else {
      console.log("[Katch Studio] Live mode — real GitHub/Vercel/Netlify APIs.");
      logGitHubKeyBootSummary();
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
