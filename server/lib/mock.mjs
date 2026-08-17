/* ============================================================
   Mock deployment backend — simulates GitHub, Vercel and Netlify
   when no real credentials are configured (or DEPLOYMENT_MODE=mock).

   This is EXPLICITLY a development stand-in: the API reports
   mode "mock", the studio UI shows a "Development Mode" badge,
   and simulated URLs use a `mock-` prefix so they can never be
   mistaken for real deployments.

   Failure injection for testing: a project whose slug contains
   "fail" fails at the BUILD stage on the second status poll.
   ============================================================ */

import { ApiError } from "./http.mjs";
import { isValidRepoName, normalizeRepoName, repoMarker, repoMatchesMarker } from "./normalize.mjs";

const state = {
  githubConnected: false,
  account: "katch-agency",
  repos: new Map(), // name → { name, owner, files, commits: [], marker }
  deployments: new Map(), // id → { provider, slug, polls, status, url, error, siteId }
};

export function resetMockState() {
  state.githubConnected = false;
  state.repos.clear();
  state.deployments.clear();
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const jitter = (ms) => ms + Math.floor(Math.random() * 300);

/* ---------- GitHub simulation ---------- */

export const MockGithub = {
  async connect() {
    await sleep(jitter(350));
    state.githubConnected = true;
    return { connected: true, account: state.account, mode: "mock" };
  },

  async connection() {
    return state.githubConnected
      ? { connected: true, account: state.account, mode: "mock" }
      : { connected: false, account: null, mode: "mock", hint: null, installUrl: null };
  },

  async ensureRepository({ name, visibility = "private", projectId, branch = "main" }) {
    await sleep(jitter(450));
    const preferred = isValidRepoName(name) ? name : normalizeRepoName(name, projectId);
    for (let attempt = 0; attempt < 20; attempt++) {
      const candidate = attempt === 0 ? preferred : `${preferred}-${attempt + 1}`;
      const existing = state.repos.get(candidate);
      if (existing) {
        if (repoMatchesMarker(existing.marker, projectId)) {
          return { id: candidate, name: candidate, owner: state.account, url: `https://github.com/${state.account}/${candidate}`, reused: true };
        }
        continue;
      }
      const repo = { name: candidate, owner: state.account, files: {}, commits: [], marker: repoMarker(projectId), visibility };
      state.repos.set(candidate, repo);
      return { id: candidate, name: candidate, owner: state.account, url: `https://github.com/${state.account}/${candidate}`, reused: false };
    }
    throw new ApiError(409, "repo-name-conflict", "Could not find a free repository name after 20 attempts.");
  },

  async pushFiles({ repository, branch = "main", files, message }) {
    await sleep(jitter(600));
    const repo = state.repos.get(repository.split("/")[1] ?? repository);
    if (!repo) throw new ApiError(404, "repo-not-found", "The repository does not exist.");
    if (!files || Object.keys(files).length === 0) throw new ApiError(400, "empty-files", "The generated project contains no files.");
    /* Mirror the real backend's validation so tests exercise the same rules */
    for (const p of Object.keys(files)) {
      if (typeof files[p] !== "string") throw new ApiError(400, "bad-file", `File "${p}" is not text content.`);
      if (Buffer.byteLength(files[p], "utf8") > 10 * 1024 * 1024) {
        throw new ApiError(413, "file-too-large", `File "${p}" exceeds the 10 MB per-file limit.`);
      }
    }
    const commitId = `mock-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    repo.files = { ...files };
    repo.commits.unshift({ id: commitId, message, at: new Date().toISOString() });
    return { commitId, url: `https://github.com/${repo.owner}/${repo.name}/commit/${commitId}`, filesPushed: Object.keys(files).length };
  },
};

/* ---------- Provider simulation ---------- */

function mockProviderDeploy({ provider, slug }) {
  const id = `mock-${provider}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const fails = /fail/i.test(slug);
  const host = fails ? "mock-fail" : "mock";
  state.deployments.set(id, {
    provider,
    slug,
    siteId: `mock-${slug}`,
    polls: 0,
    status: "building",
    url: null,
    error: null,
    failAtBuild: fails,
  });
  return { deploymentId: id, url: null, simulated: true };
}

const MockVercel = {
  async ensureProject(slug) {
    await sleep(jitter(400));
    const name = normalizeRepoName(slug);
    return {
      projectId: `mock-vercel-${name}`,
      name,
      accountId: "mock-team",
      dashboardUrl: `https://vercel.com/mock-team/${name}`,
    };
  },
  async deployFromRepo({ projectName: _n, owner: _o, repo: _r, slug }) {
    await sleep(jitter(700));
    return mockProviderDeploy({ provider: "vercel", slug });
  },
  async status(deploymentId) {
    await sleep(jitter(250));
    return advanceMockDeployment(deploymentId, "vercel");
  },
  async productionUrl() {
    return null;
  },
};

const MockNetlify = {
  async ensureSite(slug) {
    await sleep(jitter(400));
    const name = normalizeRepoName(slug);
    return {
      siteId: `mock-netlify-${name}`,
      name,
      url: `https://mock-${name}.netlify.app`,
      dashboardUrl: `https://app.netlify.com/sites/${name}`,
    };
  },
  async deployFromRepo({ siteId: _s, owner: _o, repo: _r, slug }) {
    await sleep(jitter(700));
    return mockProviderDeploy({ provider: "netlify", slug });
  },
  async status(siteId, deploymentId) {
    await sleep(jitter(250));
    return advanceMockDeployment(deploymentId, "netlify");
  },
};

function advanceMockDeployment(deploymentId, provider) {
  const d = state.deployments.get(deploymentId);
  if (!d) throw new ApiError(404, "deployment-not-found", "The deployment does not exist.");
  if (d.provider !== provider) throw new ApiError(404, "deployment-not-found", "The deployment does not exist on this provider.");
  d.polls += 1;

  const host = d.failAtBuild ? "mock-fail" : "mock";
  const domain = provider === "vercel" ? ".vercel.app" : ".netlify.app";

  if (d.failAtBuild && d.polls >= 2) {
    d.status = "failed";
    d.error = "Build failed: simulated error (Development Mode). Use a project name without “fail” to deploy successfully.";
    return { status: "failed", url: null, error: d.error };
  }
  if (d.polls >= 3) {
    d.status = "live";
    d.url = `https://${host}-${d.slug}${domain}`;
    return { status: "live", url: d.url };
  }
  return { status: "building", url: null };
}

export function mockProviders() {
  return { github: MockGithub, vercel: MockVercel, netlify: MockNetlify };
}

/** URL stubs used by the live UI so it can render production links in mock mode. */
export function mockProductionUrl(provider, slug, deploymentUrl) {
  if (deploymentUrl) return deploymentUrl;
  const fails = /fail/i.test(slug);
  const host = fails ? "mock-fail" : "mock";
  const domain = provider === "vercel" ? ".vercel.app" : ".netlify.app";
  return `https://${host}-${normalizeRepoName(slug)}${domain}`;
}
