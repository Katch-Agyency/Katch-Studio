import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { DeploymentConfig, DeploymentProviderType, DeploymentRecord, Project } from "@/types";
import { useEditor } from "@/pages/editor/editorStore";
import { useToast } from "@/app/toast";
import { validateProject, uid, slugify } from "@/utils/helpers";
import { buildScaffoldFiles } from "@/lib/scaffold";
import { DeployApi, DeployApiError, deployApi, type DeployBackendInfo } from "./api";
import { describeCommit } from "./commits";
import { contentFingerprint, pageHashes } from "./fingerprint";
import { mockProductionUrl, normalizeRepoName } from "./naming";

/* ============================================================
   Deployment controller — drives the deploy lifecycle:

     validate → generate → repository → push → provider → deploy
                                                        ↓ (poll)
                                                      live / failed

   The controller lives in DeployProvider (mounted for the whole
   editor session) so polling and logs survive tab switches.
   Progress milestones are persisted onto the project's
   `deployment` config at every step; a failed step can be
   retried without regenerating what already succeeded.
   ============================================================ */

export type DeployStepId = "validate" | "generate" | "repository" | "push" | "provider" | "deploy" | "live";
export type StepStatus = "pending" | "active" | "done" | "failed";

export interface DeployStep {
  id: DeployStepId;
  label: string;
  status: StepStatus;
}

export interface LogLine {
  id: string;
  at: string;
  text: string;
}

const STEP_ORDER: DeployStepId[] = ["validate", "generate", "repository", "push", "provider", "deploy", "live"];

const STEP_LABELS: Record<DeployStepId, string> = {
  validate: "Validate project",
  generate: "Generate React/Vite project",
  repository: "Create GitHub repository",
  push: "Push project to GitHub",
  provider: "Connect hosting provider",
  deploy: "Start deployment",
  live: "Production build & deploy",
};

const POLL_MS = 4000;
const HISTORY_LIMIT = 50;

export interface DeployRunOptions {
  provider: DeploymentProviderType;
  repositoryName: string;
  visibility: "private" | "public";
}

interface DeployContextValue {
  backend: DeployBackendInfo | null;
  backendError: string | null;
  github: { connected: boolean; account: string | null; installUrl: string | null } | null;
  deployment: DeploymentConfig | null;
  session: {
    phase: "idle" | "running" | "failed" | "live";
    steps: DeployStep[];
    logs: LogLine[];
    error: string | null;
  };
  fingerprint: string;
  changesDetected: boolean;
  repoNameDefault: string;
  refresh: () => Promise<void>;
  connectGithub: () => Promise<void>;
  startDeploy: (opts: DeployRunOptions) => Promise<void>;
  retryDeploy: (opts?: DeployRunOptions) => Promise<void>;
}

const DeployContext = createContext<DeployContextValue | null>(null);

export function useDeployment(): DeployContextValue {
  const ctx = useContext(DeployContext);
  if (!ctx) throw new Error("useDeployment must be used inside DeployProvider");
  return ctx;
}

function initialSteps(doneUpTo: DeployStepId | null): DeployStep[] {
  const doneIdx = doneUpTo ? STEP_ORDER.indexOf(doneUpTo) : -1;
  return STEP_ORDER.map((id, i) => ({
    id,
    label: STEP_LABELS[id],
    status: i <= doneIdx ? "done" : "pending",
  }));
}

export function DeployProvider({ children }: { children: React.ReactNode }) {
  const { project, updateDeploymentMeta } = useEditor();
  const { toast } = useToast();

  const [backend, setBackend] = useState<DeployContextValue["backend"]>(null);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [github, setGithub] = useState<{ connected: boolean; account: string | null; installUrl: string | null } | null>(null);
  const [session, setSession] = useState<DeployContextValue["session"]>({
    phase: "idle",
    steps: initialSteps(null),
    logs: [],
    error: null,
  });

  const apiRef = useRef<DeployApi>(deployApi);
  const filesRef = useRef<Record<string, string> | null>(null);
  const repoRef = useRef<string>("");
  const optsRef = useRef<DeployRunOptions | null>(null);
  const resumeRef = useRef<DeployStepId | null>(null);
  const pollRef = useRef<number | null>(null);
  const runningRef = useRef(false);

  const deployment = project.deployment ?? null;
  const deploymentRef = useRef(deployment);
  deploymentRef.current = deployment;

  const projectRef = useRef(project);
  projectRef.current = project;

  const fingerprint = useMemo(() => contentFingerprint(project), [project]);
  const fingerprintRef = useRef(fingerprint);
  fingerprintRef.current = fingerprint;

  const changesDetected = Boolean(
    deployment?.status === "live" && deployment.lastContentHash && deployment.lastContentHash !== fingerprint
  );

  const repoNameDefault = useMemo(
    () => deployment?.github.repositoryName ?? normalizeRepoName(project.config.projectInfo.name || "project", project.id),
    [deployment?.github.repositoryName, project.config.projectInfo.name, project.id]
  );

  /* ---------- session helpers ---------- */

  const log = useCallback((text: string) => {
    setSession((s) => ({
      ...s,
      logs: [...s.logs, { id: uid(), at: new Date().toISOString(), text }].slice(-200),
    }));
  }, []);

  const setSteps = useCallback((updater: (steps: DeployStep[]) => DeployStep[]) => {
    setSession((s) => ({ ...s, steps: updater(s.steps) }));
  }, []);

  const markStep = useCallback(
    (id: DeployStepId, status: StepStatus) => {
      setSteps((steps) => steps.map((st) => (st.id === id ? { ...st, status } : st)));
    },
    [setSteps]
  );

  const recordHistory = useCallback(
    (record: DeploymentRecord) => {
      updateDeploymentMeta((draft) => {
        const history = draft.deploymentHistory ?? [];
        draft.deploymentHistory = [record, ...history].slice(0, HISTORY_LIMIT);
      });
    },
    [updateDeploymentMeta]
  );

  /* ---------- fail / complete ---------- */

  const fail = useCallback(
    (message: string, step: DeployStepId, provider: DeploymentProviderType | null) => {
      runningRef.current = false;
      resumeRef.current = step === "live" ? "deploy" : step;
      markStep(step, "failed");
      const d = deploymentRef.current;
      updateDeploymentMeta((draft) => {
        const dep = draft.deployment!;
        dep.status = "failed";
        dep.error = message;
      });
      if (provider) {
        recordHistory({
          id: uid(),
          provider,
          status: "failed",
          commitId: d?.lastCommitId,
          commitMessage: d?.lastCommitMessage,
          at: new Date().toISOString(),
          error: message,
        });
      }
      log(`✕ Failed — ${message}`);
      setSession((s) => ({ ...s, phase: "failed", error: message }));
    },
    [log, markStep, recordHistory, updateDeploymentMeta]
  );

  const complete = useCallback(
    async (status: { url: string | null; previewUrl: string | null }, provider: DeploymentProviderType) => {
      runningRef.current = false;
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
      markStep("live", "done");
      const d = deploymentRef.current;
      const fallbackUrl =
        backend?.mode === "mock"
          ? mockProductionUrl(provider, slugify(projectRef.current.config.projectInfo.name || "project") || "project")
          : null;
      /* The production URL is STABLE across redeploys (alias/site URL) —
         keep it once set; per-deploy URLs land in previewUrl. */
      const url = d?.productionUrl ?? status.url ?? fallbackUrl;
      const now = new Date().toISOString();
      updateDeploymentMeta((draft) => {
        const dep = draft.deployment!;
        dep.status = "live";
        dep.productionUrl = url ?? dep.productionUrl;
        dep.previewUrl = status.previewUrl ?? dep.previewUrl;
        dep.lastDeployedAt = now;
        dep.lastContentHash = fingerprintRef.current;
        dep.lastPageHashes = pageHashes(projectRef.current);
        dep.error = undefined;
      });
      recordHistory({
        id: uid(),
        provider,
        status: "live",
        commitId: d?.lastCommitId,
        commitMessage: d?.lastCommitMessage,
        url: url ?? undefined,
        at: now,
      });
      log(`✓ Live — ${url ?? "deployment ready"}`);
      setSession((s) => ({ ...s, phase: "live", error: null }));
      toast("success", "Website is live.");
    },
    [backend?.mode, log, markStep, recordHistory, toast, updateDeploymentMeta]
  );

  /* ---------- polling ---------- */

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const poll = useCallback(async () => {
    const d = deploymentRef.current;
    if (!d?.deploymentId || (d.status !== "deploying" && d.status !== "building")) {
      stopPolling();
      return;
    }
    try {
      const s = await apiRef.current.deploymentStatus({
        provider: d.provider,
        id: d.deploymentId,
        projectId: d.providerProjectId,
        siteId: d.providerProjectId,
      });
      if (s.status === "live") {
        await complete(s, d.provider);
      } else if (s.status === "failed") {
        fail(s.error ?? "The provider build failed — check the deployment logs.", "live", d.provider);
      } else {
        if (s.url && s.url !== d.previewUrl) {
          updateDeploymentMeta((draft) => {
            draft.deployment!.previewUrl = s.url ?? undefined;
          });
        }
      }
    } catch {
      /* transient network hiccup — retry on the next tick, never kill the deploy */
      log("Status check failed — retrying…");
    }
  }, [complete, fail, log, stopPolling, updateDeploymentMeta]);

  const beginPolling = useCallback(() => {
    stopPolling();
    markStep("live", "active");
    log("Waiting for the production build…");
    void poll();
    pollRef.current = window.setInterval(() => void poll(), POLL_MS);
  }, [log, markStep, poll, stopPolling]);

  /* ---------- the run loop ---------- */

  const runFrom = useCallback(
    async (opts: DeployRunOptions, resumeFrom: DeployStepId | null) => {
      if (runningRef.current) return;
      runningRef.current = true;
      optsRef.current = opts;
      resumeRef.current = resumeFrom;

      const startIdx = resumeFrom ? Math.max(0, STEP_ORDER.indexOf(resumeFrom)) : 0;
      setSession((s) => ({
        phase: "running",
        steps: initialSteps(startIdx === 0 ? null : STEP_ORDER[startIdx - 1]),
        logs: s.logs,
        error: null,
      }));
      updateDeploymentMeta((draft) => {
        const dep = draft.deployment!;
        dep.error = undefined;
        dep.status = "preparing";
      });
      log(`Deploying “${projectRef.current.config.projectInfo.name}” via ${opts.provider === "vercel" ? "Vercel" : "Netlify"}…`);

      for (let i = startIdx; i < STEP_ORDER.length; i++) {
        const step = STEP_ORDER[i];
        if (step === "live") continue; // handled by the poller
        markStep(step, "active");
        try {
          switch (step) {
            case "validate": {
              const problem = validateProject(projectRef.current);
              if (problem) throw new DeployApiError(problem, "invalid-project");
              updateDeploymentMeta((draft) => {
                draft.deployment!.status = "preparing";
              });
              log("Project configuration is valid");
              break;
            }
            case "generate": {
              updateDeploymentMeta((draft) => {
                draft.deployment!.status = "generating";
              });
              const catalogue = (await import("@/features/export/catalogue.json")).default as Record<string, string>;
              const files = await buildScaffoldFiles(projectRef.current, catalogue, { embed: true });
              filesRef.current = files;
              log(`Generated ${Object.keys(files).length} project files`);
              break;
            }
            case "repository": {
              updateDeploymentMeta((draft) => {
                draft.deployment!.status = "github";
              });
              const repo = await apiRef.current.createRepository({
                name: opts.repositoryName,
                visibility: opts.visibility,
                projectId: projectRef.current.id,
                branch: "main",
              });
              repoRef.current = `${repo.owner}/${repo.name}`;
              updateDeploymentMeta((draft) => {
                const dep = draft.deployment!;
                dep.github = {
                  repositoryId: repo.id ?? dep.github.repositoryId,
                  repositoryName: repo.name,
                  repositoryUrl: repo.url,
                  owner: repo.owner,
                  branch: "main",
                };
              });
              log(repo.reused ? `GitHub repository ready — ${repo.owner}/${repo.name}` : `Created GitHub repository ${repo.owner}/${repo.name}`);
              break;
            }
            case "push": {
              const message = describeCommit(projectRef.current, deploymentRef.current ?? undefined);
              const pushed = await apiRef.current.push({
                repository: repoRef.current,
                branch: "main",
                files: filesRef.current ?? {},
                message,
              });
              updateDeploymentMeta((draft) => {
                const dep = draft.deployment!;
                dep.lastCommitId = pushed.commitId;
                dep.lastCommitMessage = message;
              });
              log(`Pushed ${pushed.filesPushed} files — commit “${message}”`);
              break;
            }
            case "provider": {
              const existing = deploymentRef.current;
              if (existing?.providerProjectId && existing.provider === opts.provider) {
                /* Maintenance loop: one provider project per studio project —
                   redeploys keep the production URL. */
                log(`Reusing the existing ${opts.provider === "vercel" ? "Vercel" : "Netlify"} project`);
                break;
              }
              const slug = slugify(projectRef.current.config.projectInfo.name || "project") || "project";
              const prepared = await apiRef.current.providerPrepare(opts.provider, slug);
              updateDeploymentMeta((draft) => {
                const dep = draft.deployment!;
                dep.provider = opts.provider;
                dep.providerProjectId = (prepared.projectId ?? prepared.siteId) || dep.providerProjectId;
                dep.providerProjectName = prepared.name;
                dep.providerDashboardUrl = prepared.dashboardUrl;
                if (prepared.url) dep.productionUrl = prepared.url;
              });
              log(`${opts.provider === "vercel" ? "Vercel" : "Netlify"} project ready — ${prepared.name}`);
              break;
            }
            case "deploy": {
              updateDeploymentMeta((draft) => {
                draft.deployment!.status = "building";
              });
              const slug = slugify(projectRef.current.config.projectInfo.name || "project") || "project";
              const d = deploymentRef.current;
              const started = await apiRef.current.providerDeploy(opts.provider, {
                projectId: opts.provider === "vercel" ? d?.providerProjectId : undefined,
                siteId: opts.provider === "netlify" ? d?.providerProjectId : undefined,
                projectName: d?.providerProjectName,
                slug,
                repository: repoRef.current,
                branch: "main",
              });
              updateDeploymentMeta((draft) => {
                const dep = draft.deployment!;
                dep.deploymentId = started.deploymentId;
                dep.previewUrl = started.url ?? dep.previewUrl;
                dep.status = "deploying";
              });
              log("Deployment started on the provider");
              break;
            }
          }
          markStep(step, "done");
        } catch (err) {
          const message = err instanceof Error ? err.message : "Deployment failed.";
          fail(message, step, opts.provider);
          return;
        }
      }

      beginPolling();
    },
    [beginPolling, fail, log, markStep, updateDeploymentMeta]
  );

  const startDeploy = useCallback((opts: DeployRunOptions) => runFrom(opts, null), [runFrom]);

  /** Retry only the failed stage — unless the settings changed, in which
   *  case resume from the repository step (the first settings-dependent one). */
  const retryDeploy = useCallback(
    async (opts?: DeployRunOptions) => {
      if (!optsRef.current) return;
      const next = opts ?? optsRef.current;
      const settingsChanged = next.repositoryName !== optsRef.current.repositoryName || next.provider !== optsRef.current.provider;
      await runFrom(next, settingsChanged ? "repository" : resumeRef.current);
    },
    [runFrom]
  );

  /* ---------- connection handling ---------- */

  const refresh = useCallback(async () => {
    try {
      const health = await apiRef.current.health();
      /* A null response means the request fell through to a non-API page
         (e.g. the SPA rewrite answered instead of the function) — treat it
         exactly like an unreachable API. */
      if (!health) {
        throw new DeployApiError(
          "The deployment API is unreachable. Start it locally with `npm run server` (or `npm run dev:all`), or check the deployment server logs.",
          "unreachable"
        );
      }
      setBackend(health);
      setBackendError(null);
      const conn = await apiRef.current.githubConnection();
      if (!conn) {
        throw new DeployApiError(
          "The deployment API is unreachable. Start it locally with `npm run server` (or `npm run dev:all`), or check the deployment server logs.",
          "unreachable"
        );
      }
      setGithub({ connected: conn.connected, account: conn.account, installUrl: conn.installUrl });
    } catch (err) {
      setBackendError(err instanceof Error ? err.message : "The deployment API is unreachable.");
    }
  }, []);

  const connectGithub = useCallback(async () => {
    try {
      const conn = await apiRef.current.githubConnect();
      setGithub({ connected: conn.connected, account: conn.account, installUrl: conn.installUrl });
      if (conn.connected) {
        toast("success", `GitHub connected${conn.account ? ` as ${conn.account}` : ""}.`);
      } else if (conn.installUrl) {
        window.open(conn.installUrl, "_blank", "noopener");
        toast("info", "Install the Katch GitHub App, then press Connect again.");
      } else {
        toast("error", conn.hint ?? "GitHub is not configured on the deployment server.");
      }
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "Could not connect GitHub.");
    }
  }, [toast]);

  /* ---------- boot: capabilities + resume in-flight deploys ---------- */

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const d = deployment;
    if (d?.deploymentId && (d.status === "building" || d.status === "deploying") && session.phase === "idle") {
      setSession((s) => ({ ...s, phase: "running", steps: initialSteps("deploy") }));
      log("Resumed an in-flight deployment…");
      beginPolling();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deployment?.deploymentId, deployment?.status]);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const value = useMemo<DeployContextValue>(
    () => ({
      backend,
      backendError,
      github,
      deployment,
      session,
      fingerprint,
      changesDetected,
      repoNameDefault,
      refresh,
      connectGithub,
      startDeploy,
      retryDeploy,
    }),
    [backend, backendError, github, deployment, session, fingerprint, changesDetected, repoNameDefault, refresh, connectGithub, startDeploy, retryDeploy]
  );

  return <DeployContext.Provider value={value}>{children}</DeployContext.Provider>;
}
