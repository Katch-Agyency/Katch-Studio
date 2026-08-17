/* ============================================================
   Deployment API client — the ONLY place the studio talks to
   the deployment backend. Relative URLs work identically in
   local dev (Vite proxy → :8787) and production (Vercel
   function at /api/*). No secrets ever cross this boundary:
   the browser only sees ids, names and URLs.
   ============================================================ */

import type { DeploymentProviderType } from "@/types";

export interface DeployBackendInfo {
  ok: boolean;
  mode: "mock" | "live";
  development: boolean;
  github: { connected: boolean; account: string | null; installUrl: string | null };
  providers: { vercel: boolean; netlify: boolean };
}

export interface GithubConnection {
  connected: boolean;
  account: string | null;
  mode: string;
  installUrl: string | null;
  hint?: string | null;
}

export interface RepositoryInfo {
  id: string | null;
  name: string;
  owner: string;
  url: string;
  reused: boolean;
}

export interface PushResult {
  commitId: string;
  url: string;
  filesPushed: number;
}

export interface ProviderPrepareResult {
  projectId?: string;
  siteId?: string;
  name: string;
  dashboardUrl: string;
  url?: string;
}

export interface ProviderDeployResult {
  deploymentId: string;
  url: string | null;
}

export interface DeploymentStatusResult {
  status: "building" | "live" | "failed";
  url: string | null;
  previewUrl: string | null;
  error: string | null;
}

export class DeployApiError extends Error {
  code: string;
  constructor(message: string, code = "request-failed") {
    super(message);
    this.name = "DeployApiError";
    this.code = code;
  }
}

type FetchImpl = typeof fetch;

export class DeployApi {
  constructor(private fetchImpl: FetchImpl = fetch) {}

  private async call<T>(path: string, init?: RequestInit & { gzipBody?: string }): Promise<T> {
    let body: BodyInit | undefined = init?.body as BodyInit | undefined;
    let headers: Record<string, string> = { ...(init?.headers as Record<string, string>) };

    /* Compress big payloads (the generated file map) when the browser supports it */
    if (init?.gzipBody !== undefined) {
      const raw = new TextEncoder().encode(init.gzipBody);
      const CS = (globalThis as { CompressionStream?: new (format: string) => CompressionStream }).CompressionStream;
      if (CS) {
        try {
          const stream = new Blob([raw]).stream().pipeThrough(new CS("gzip"));
          body = new Uint8Array(await new Response(stream).arrayBuffer());
          headers["Content-Encoding"] = "gzip";
          headers["Content-Type"] = "application/json";
        } catch {
          body = raw;
        }
      } else {
        body = raw;
      }
    }

    let res: Response;
    try {
      res = await this.fetchImpl(path, { ...init, headers, body } as RequestInit);
    } catch {
      throw new DeployApiError(
        "The deployment API is unreachable. Start it locally with `npm run server` (or `npm run dev:all`), or check the deployment server logs.",
        "unreachable"
      );
    }

    let data: unknown = null;
    try {
      data = await res.json();
    } catch {
      /* empty body */
    }

    if (!res.ok) {
      const err = (data as { error?: { code?: string; message?: string } } | null)?.error;
      throw new DeployApiError(
        err?.message ?? `The deployment server returned an error (HTTP ${res.status}).`,
        err?.code ?? "http-error"
      );
    }
    return data as T;
  }

  health(): Promise<DeployBackendInfo> {
    return this.call("/api/health");
  }

  githubConnection(): Promise<GithubConnection> {
    return this.call("/api/github/connection");
  }

  githubConnect(): Promise<GithubConnection> {
    return this.call("/api/github/connect", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
  }

  createRepository(payload: { name: string; visibility: "private" | "public"; projectId: string; branch: string }): Promise<RepositoryInfo> {
    return this.call("/api/github/repositories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }

  push(payload: { repository: string; branch: string; files: Record<string, string>; message: string }): Promise<PushResult> {
    return this.call("/api/github/push", {
      method: "POST",
      gzipBody: JSON.stringify(payload),
    });
  }

  providerPrepare(provider: DeploymentProviderType, slug: string): Promise<ProviderPrepareResult> {
    return this.call(`/api/${provider}/prepare`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
    });
  }

  providerDeploy(
    provider: DeploymentProviderType,
    payload: {
      projectId?: string;
      siteId?: string;
      projectName?: string;
      slug: string;
      repository: string;
      branch: string;
    }
  ): Promise<ProviderDeployResult> {
    return this.call(`/api/${provider}/deploy`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }

  deploymentStatus(params: { provider: DeploymentProviderType; id: string; projectId?: string; siteId?: string }): Promise<DeploymentStatusResult> {
    const q = new URLSearchParams({ provider: params.provider, id: params.id });
    if (params.projectId) q.set("projectId", params.projectId);
    if (params.siteId) q.set("siteId", params.siteId);
    return this.call(`/api/deployments/status?${q.toString()}`);
  }
}

export const deployApi = new DeployApi();
