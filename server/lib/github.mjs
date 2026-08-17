/* ============================================================
   GitHub deployment backend — real GitHub REST API integration.

   Auth (server-side only, never exposed to the browser):
     • GitHub App  → JWT (RS256) → installation access token
     • Fallback    → fine-grained personal access token (PAT)

   Repository creation defaults to PRIVATE with branch `main`.
   Files are pushed through the Git Data API (blobs → tree →
   commit → ref) so a whole generated project lands as ONE commit.
   ============================================================ */

import { createSign } from "node:crypto";
import { ApiError, request } from "./http.mjs";
import { isValidRepoName, normalizeRepoName, repoMarker, repoMatchesMarker } from "./normalize.mjs";
import { serverConfig } from "../config.mjs";

const GITHUB_API = "https://api.github.com";

export class GithubBackend {
  constructor(config = serverConfig.github) {
    this.config = config;
  }

  /* ---------- Authentication ---------- */

  get authMode() {
    if (this.config.appId && this.config.appPrivateKey) return "app";
    if (this.config.pat) return "pat";
    return "none";
  }

  /** Short-lived (10 min) signed JWT for GitHub App authentication */
  appJwt() {
    const now = Math.floor(Date.now() / 1000);
    const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
    const payload = Buffer.from(
      JSON.stringify({ iat: now - 60, exp: now + 600, iss: this.config.appId })
    ).toString("base64url");
    const signature = createSign("RSA-SHA256")
      .update(`${header}.${payload}`)
      .sign(this.config.appPrivateKey, "base64url");
    return `${header}.${payload}.${signature}`;
  }

  async installationToken() {
    let installationId = this.config.appInstallationId;
    if (!installationId) {
      const { data } = await request(`${GITHUB_API}/app/installations`, {
        token: this.appJwt(),
      });
      const installations = Array.isArray(data) ? data : [];
      if (installations.length === 0) {
        throw new ApiError(
          400,
          "github-app-not-installed",
          "The Katch GitHub App is not installed on any account. Install it first, then retry."
        );
      }
      installationId = String(installations[0].id);
    }
    const { data } = await request(
      `${GITHUB_API}/app/installations/${installationId}/access_tokens`,
      { method: "POST", token: this.appJwt() }
    );
    return String(data?.token ?? "");
  }

  async token() {
    if (this.authMode === "pat") return this.config.pat;
    return this.installationToken();
  }

  /* ---------- Connection status ---------- */

  async connection() {
    if (this.authMode === "none") {
      return {
        connected: false,
        mode: "none",
        account: null,
        installUrl: null,
        hint:
          "GitHub credentials are not configured on the Katch deployment server. Set GITHUB_APP_ID/GITHUB_APP_PRIVATE_KEY (or GITHUB_PAT) server-side.",
      };
    }
    try {
      if (this.authMode === "pat") {
        const { data } = await request(`${GITHUB_API}/user`, { token: this.config.pat });
        return { connected: true, mode: "pat", account: data?.login ?? null, installUrl: null };
      }
      const token = await this.token();
      const { data } = await request(`${GITHUB_API}/app`, { token });
      const slug = this.config.appSlug ?? data?.slug ?? "";
      const installUrl = slug ? `https://github.com/apps/${slug}/installations/new` : null;
      /* The installation account (org/user) is what owns the repositories */
      let account = null;
      try {
        const tokenNow = await this.token();
        const inst = await request(`${GITHUB_API}/app/installations`, { token: tokenNow });
        account = Array.isArray(inst.data) && inst.data[0]?.account?.login ? inst.data[0].account.login : null;
      } catch {
        /* account is cosmetic — never fail the connection check for it */
      }
      return { connected: true, mode: "app", account, installUrl };
    } catch (err) {
      if (err instanceof ApiError && (err.status === 400 || err.status === 403)) {
        const slug = this.config.appSlug;
        return {
          connected: false,
          mode: "app",
          account: null,
          installUrl: slug ? `https://github.com/apps/${slug}/installations/new` : null,
          hint: "The Katch GitHub App is not installed on your GitHub account yet.",
        };
      }
      throw err;
    }
  }

  /* ---------- Repositories ---------- */

  /** Create-or-reuse: recognises repos this project already owns via the
   *  description marker; otherwise walks katch-name-2, katch-name-3… on
   *  name conflicts. Returns the final repository identity. */
  async ensureRepository({ name, visibility = "private", projectId, branch = "main" }) {
    const token = await this.token();
    const owner = await this.ownerLogin();
    const preferred = isValidRepoName(name) ? name : normalizeRepoName(name, projectId);

    for (let attempt = 0; attempt < 20; attempt++) {
      const candidate = attempt === 0 ? preferred : `${preferred}-${attempt + 1}`;
      const existing = await this.findRepository(owner, candidate);
      if (existing) {
        if (repoMatchesMarker(existing.description, projectId)) {
          return this.repoShape(existing);
        }
        continue; // someone else's repo with this name → try the next suffix
      }
      const { data } = await request(`${GITHUB_API}/user/repos`, {
        method: "POST",
        token,
        body: {
          name: candidate,
          private: visibility === "private",
          description: repoMarker(projectId),
          auto_init: false,
          default_branch: branch,
          homepage: "",
        },
      }).catch((err) => {
        if (err instanceof ApiError && err.status === 404) {
          /* App installation token: repos belong to the INSTALLATION owner */
          return this.createUnderInstallation(candidate, visibility, projectId, branch);
        }
        throw err;
      });
      return {
        id: data?.id ?? null,
        name: data?.name ?? candidate,
        owner: data?.owner?.login ?? owner,
        url: data?.html_url ?? `https://github.com/${owner}/${candidate}`,
        reused: false,
      };
    }
    throw new ApiError(409, "repo-name-conflict", "Could not find a free repository name after 20 attempts.");
  }

  async createUnderInstallation(name, visibility, projectId, branch) {
    const token = await this.token();
    const inst = await request(`${GITHUB_API}/app/installations`, { token });
    const account = Array.isArray(inst.data) && inst.data[0]?.account?.login ? inst.data[0].account.login : null;
    if (!account) throw new ApiError(400, "github-installation", "Could not determine the GitHub installation account.");
    const { data } = await request(`${GITHUB_API}/orgs/${account}/repos`, {
      method: "POST",
      token,
      body: {
        name,
        private: visibility === "private",
        description: repoMarker(projectId),
        auto_init: false,
        default_branch: branch,
      },
    });
    return { data, owner: account };
  }

  async findRepository(owner, name) {
    try {
      const { data } = await request(`${GITHUB_API}/repos/${owner}/${name}`);
      return data ?? null;
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return null;
      throw err;
    }
  }

  async ownerLogin() {
    const token = await this.token();
    if (this.authMode === "pat") {
      const { data } = await request(`${GITHUB_API}/user`, { token });
      return String(data?.login ?? "");
    }
    const inst = await request(`${GITHUB_API}/app/installations`, { token });
    const account = Array.isArray(inst.data) && inst.data[0]?.account?.login ? inst.data[0].account.login : null;
    if (!account) throw new ApiError(400, "github-installation", "Could not determine the GitHub installation account.");
    return String(account);
  }

  repoShape(repo) {
    return {
      id: repo?.id ?? null,
      name: String(repo?.name ?? ""),
      owner: String(repo?.owner?.login ?? ""),
      url: String(repo?.html_url ?? ""),
      reused: true,
    };
  }

  /* ---------- Push (Git Data API — one commit per deploy) ---------- */

  async pushFiles({ repository, branch = "main", files, message, author = { name: "Katch Studio", email: "studio@katch.agency" } }) {
    if (!repository || typeof repository !== "string") {
      throw new ApiError(400, "missing-repo", "A repository is required to push the project.");
    }
    if (!files || typeof files !== "object" || Object.keys(files).length === 0) {
      throw new ApiError(400, "empty-files", "The generated project contains no files.");
    }
    const paths = Object.keys(files);
    if (paths.length > 500) {
      throw new ApiError(400, "too-many-files", "The generated project has too many files (limit 500).");
    }
    for (const p of paths) {
      if (typeof files[p] !== "string") {
        throw new ApiError(400, "bad-file", `File "${p}" is not text content.`);
      }
      if (Buffer.byteLength(files[p], "utf8") > 10 * 1024 * 1024) {
        throw new ApiError(413, "file-too-large", `File "${p}" exceeds the 10 MB per-file limit.`);
      }
    }

    const token = await this.token();
    const [owner, repo] = repository.split("/");
    if (!owner || !repo) {
      throw new ApiError(400, "bad-repo", "The repository must be in owner/name form.");
    }

    const base = `${GITHUB_API}/repos/${owner}/${repo}`;

    /* Blobs */
    const blobs = await Promise.all(
      paths.map(async (path) => {
        const { data } = await request(`${base}/git/blobs`, {
          method: "POST",
          token,
          body: { content: files[path], encoding: "utf-8" },
        });
        return { path, sha: String(data?.sha ?? "") };
      })
    );
    if (blobs.some((b) => !b.sha)) {
      throw new ApiError(502, "github-blob-failed", "GitHub could not store the project files.");
    }

    /* Tree */
    const { data: tree } = await request(`${base}/git/trees`, {
      method: "POST",
      token,
      body: {
        tree: blobs.map((b) => ({ path: b.path, mode: "100644", type: "blob", sha: b.sha })),
      },
    });

    /* Parent commit (empty on the very first push) */
    let parentSha = null;
    try {
      const ref = await request(`${base}/git/ref/heads/${branch}`, { token });
      parentSha = ref.data?.object?.sha ?? null;
    } catch {
      /* fresh repository — first commit */
    }

    /* Commit */
    const { data: commit } = await request(`${base}/git/commits`, {
      method: "POST",
      token,
      body: {
        message,
        tree: String(tree?.sha ?? ""),
        parents: parentSha ? [parentSha] : [],
        author,
        committer: author,
      },
    });
    const commitSha = String(commit?.sha ?? "");
    if (!commitSha) throw new ApiError(502, "github-commit-failed", "GitHub could not create the commit.");

    /* Ref — update or create */
    const ref = `refs/heads/${branch}`;
    if (parentSha) {
      await request(`${base}/git/refs/heads/${branch}`, {
        method: "PATCH",
        token,
        body: { sha: commitSha, force: false },
      });
    } else {
      await request(`${base}/git/refs`, {
        method: "POST",
        token,
        body: { ref, sha: commitSha },
      });
    }

    return {
      commitId: commitSha,
      url: `https://github.com/${owner}/${repo}/commit/${commitSha}`,
      filesPushed: paths.length,
    };
  }
}
