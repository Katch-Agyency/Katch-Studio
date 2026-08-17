import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronUp,
  CircleDashed,
  ExternalLink,
  FlaskConical,
  Github,
  Globe,
  Loader2,
  Plug,
  RefreshCw,
  Rocket,
  ScrollText,
  X,
} from "lucide-react";
import { useEditor } from "@/pages/editor/editorStore";
import { Badge, Button } from "@/components/ui/ui";
import { useToast } from "@/app/toast";
import { cn, timeAgo } from "@/utils/helpers";
import type { DeploymentProviderType, DeploymentStatus } from "@/types";
import { useDeployment, type DeployStep } from "./useDeployment";
import { isValidRepoName, PROVIDER_META, providerMeta } from "./naming";

/* ============================================================
   Deployment panel — the editor tab that runs the whole
   deployment lifecycle: GitHub connection, repository config,
   provider selection, deploy, status timeline, production URL,
   history and logs. Every visible action is real (or clearly
   marked Development Mode).
   ============================================================ */

const STATUS_BADGE: Record<DeploymentStatus | "not-deployed", { label: string; tone: "neutral" | "brand" | "accent" | "danger" | "info"; dot: string }> = {
  "not-deployed": { label: "Not deployed", tone: "neutral", dot: "bg-ink-faint" },
  preparing: { label: "Preparing", tone: "info", dot: "bg-info" },
  generating: { label: "Generating", tone: "info", dot: "bg-info" },
  github: { label: "GitHub", tone: "info", dot: "bg-info" },
  building: { label: "Building", tone: "accent", dot: "bg-warn animate-pulse" },
  deploying: { label: "Deploying", tone: "accent", dot: "bg-warn animate-pulse" },
  live: { label: "Live", tone: "brand", dot: "bg-ok" },
  failed: { label: "Failed", tone: "danger", dot: "bg-danger" },
};

function StatusPill({ status }: { status: DeploymentStatus | "not-deployed" }) {
  const meta = STATUS_BADGE[status];
  return (
    <Badge tone={meta.tone}>
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} aria-hidden />
      {meta.label}
    </Badge>
  );
}

export default function DeploymentPanel() {
  const { project } = useEditor();
  const deploy = useDeployment();
  const { toast } = useToast();

  const [repoName, setRepoName] = useState(deploy.repoNameDefault);
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const [provider, setProvider] = useState<DeploymentProviderType>(deploy.deployment?.provider ?? "vercel");
  const [logsOpen, setLogsOpen] = useState(false);

  /* Keep the prefilled name in sync when it changes (e.g. after first deploy) */
  useEffect(() => {
    setRepoName(deploy.repoNameDefault);
  }, [deploy.repoNameDefault]);

  const deployment = deploy.deployment;
  const status: DeploymentStatus | "not-deployed" = deployment?.status ?? "not-deployed";
  const running = deploy.session.phase === "running";
  const name = project.config.projectInfo.name || "Untitled Project";

  const providerConfigured = (id: DeploymentProviderType) =>
    deploy.backend?.providers?.[id] ?? false;

  const onDeploy = async () => {
    const trimmed = repoName.trim();
    if (!isValidRepoName(trimmed)) {
      toast("error", "Repository name is invalid — use lowercase letters, numbers and hyphens (e.g. katch-looky-cakes).");
      return;
    }
    setLogsOpen(true);
    await deploy.startDeploy({ provider, repositoryName: trimmed, visibility });
  };

  const onRetry = async () => {
    const trimmed = repoName.trim();
    if (!isValidRepoName(trimmed)) {
      toast("error", "Repository name is invalid — use lowercase letters, numbers and hyphens (e.g. katch-looky-cakes).");
      return;
    }
    setLogsOpen(true);
    await deploy.retryDeploy({ provider, repositoryName: trimmed, visibility });
  };

  const stepsVisible = deploy.session.steps.filter((s) => s.status !== "pending" || running);
  const hasLogs = deploy.session.logs.length > 0;

  return (
    <div className="space-y-4">
      {/* ---------- Header ---------- */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-wider text-ink-muted">Deployment</p>
          <p className="mt-0.5 truncate text-[15px] font-semibold text-ink">{name}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {deploy.backend?.development && (
            <Badge tone="accent">
              <FlaskConical className="h-3 w-3" /> Development Mode
            </Badge>
          )}
          <StatusPill status={status} />
        </div>
      </div>

      {/* ---------- Backend unreachable ---------- */}
      {deploy.backendError && (
        <div className="rounded-xl border border-warn/30 bg-warn/5 p-4" role="alert">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-warn">
            <Plug className="h-4 w-4" /> Deployment API unreachable
          </p>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-muted">{deploy.backendError}</p>
          <p className="mt-2 rounded-lg bg-surface-2 px-2.5 py-1.5 font-mono text-[11.5px] text-ink-muted">
            npm run server <span className="text-ink-faint">(or)</span> npm run dev:all
          </p>
          <Button size="sm" className="mt-3" onClick={() => void deploy.refresh()}>
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </Button>
        </div>
      )}

      {/* ---------- Development Mode note ---------- */}
      {deploy.backend?.development && !deploy.backendError && (
        <div className="rounded-xl border border-line bg-surface-0/50 p-3.5 text-[12.5px] leading-relaxed text-ink-muted">
          <strong className="text-ink">Development Mode:</strong> deployments are simulated by the local
          backend — nothing is sent to real GitHub/Vercel/Netlify. Add the server-side credentials in{" "}
          <code className="rounded bg-surface-2 px-1 py-0.5 text-[11px]">docs/DEPLOY.md</code> to go live.
        </div>
      )}

      {/* ---------- GitHub connection ---------- */}
      <section className="card p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-ink">
              <Github className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-ink">GitHub</p>
              <p className="truncate text-[12px] text-ink-muted">
                {deploy.github?.connected
                  ? `Connected${deploy.github.account ? ` as ${deploy.github.account}` : ""}`
                  : "Not connected"}
              </p>
            </div>
          </div>
          {deploy.github?.connected ? (
            <Badge tone="brand">
              <Check className="h-3 w-3" /> Connected
            </Badge>
          ) : (
            <Button size="sm" variant="primary" onClick={() => void deploy.connectGithub()} disabled={running}>
              <Github className="h-3.5 w-3.5" /> Connect GitHub
            </Button>
          )}
        </div>
        {deploy.github && !deploy.github.connected && deploy.github.installUrl && (
          <p className="mt-2.5 text-[12px] leading-relaxed text-ink-muted">
            Install the Katch GitHub App on your account, then press Connect again.{" "}
            <a href={deploy.github.installUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-brand-hover hover:underline">
              Open installation page <ExternalLink className="h-3 w-3" />
            </a>
          </p>
        )}
      </section>

      {/* ---------- Repository + provider config ---------- */}
      <section className="card space-y-4 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="label">Repository name</p>
            <input
              className="input h-9 w-full font-mono text-[12.5px]"
              value={repoName}
              onChange={(e) => setRepoName(e.target.value)}
              disabled={running || status === "live"}
              aria-label="Repository name"
              spellCheck={false}
            />
            <p className="mt-1 text-[11px] text-ink-faint">
              {isValidRepoName(repoName.trim()) ? "Valid GitHub name" : "Lowercase letters, numbers and hyphens only"}
            </p>
          </div>
          <div>
            <p className="label">Visibility</p>
            <select
              className="input h-9 w-full text-[12.5px]"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value === "public" ? "public" : "private")}
              disabled={running || status === "live"}
              aria-label="Repository visibility"
            >
              <option value="private">Private (recommended)</option>
              <option value="public">Public</option>
            </select>
            <p className="mt-1 text-[11px] text-ink-faint">Branch: main</p>
          </div>
        </div>

        {/* Provider cards */}
        <div>
          <p className="label mb-2">Deployment provider</p>
          <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Deployment provider">
            {PROVIDER_META.map((p) => {
              const selected = provider === p.id;
              const configured = providerConfigured(p.id);
              return (
                <button
                  key={p.id}
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setProvider(p.id)}
                  disabled={running || status === "live"}
                  className={cn(
                    "flex items-start gap-3 rounded-xl border p-3 text-left transition-all",
                    selected ? "border-brand-ring bg-brand-muted/50" : "border-line bg-surface-0/50 hover:border-line-strong"
                  )}
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-2">
                    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] fill-ink" aria-hidden>
                      <path d={p.mark} />
                    </svg>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
                      {p.name}
                      {p.recommended && (
                        <span className="rounded bg-brand-muted px-1 py-px text-[9.5px] font-bold uppercase tracking-wide text-brand-hover">Recommended</span>
                      )}
                    </span>
                    <span className="mt-0.5 block text-[11.5px] leading-snug text-ink-muted">{p.tagline}</span>
                    <span className={cn("mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium", configured ? "text-ok" : "text-ink-faint")}>
                      {configured ? (
                        <>
                          <Check className="h-3 w-3" /> Configured
                        </>
                      ) : (
                        <>
                          <CircleDashed className="h-3 w-3" /> Not configured
                        </>
                      )}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Action row */}
        {status === "live" ? (
          deploy.changesDetected ? (
            <div className="rounded-xl border border-warn/30 bg-warn/5 p-3.5">
              <p className="text-[12.5px] font-semibold text-warn">Changes detected</p>
              <p className="mt-0.5 text-[12px] text-ink-muted">The local Katch Studio project differs from the deployed version.</p>
              <Button variant="primary" size="sm" className="mt-2.5" onClick={() => void onDeploy()} disabled={running}>
                {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Rocket className="h-3.5 w-3.5" />}
                Deploy Changes
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface-0/50 p-3">
              <p className="flex items-center gap-1.5 text-[12.5px] text-ink-muted">
                <Check className="h-3.5 w-3.5 text-ok" /> Deployed version is up to date
              </p>
              <Button size="sm" onClick={() => void onDeploy()} disabled={running} title="Push the same content again">
                <RefreshCw className="h-3.5 w-3.5" /> Redeploy
              </Button>
            </div>
          )
        ) : (
          <Button variant="primary" className="w-full sm:w-auto" onClick={() => void onDeploy()} disabled={running || !deploy.github?.connected}>
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
            {running ? "Deploying…" : "Deploy Project"}
          </Button>
        )}
        {!deploy.github?.connected && !running && status !== "live" && (
          <p className="text-[11.5px] text-ink-faint">Connect GitHub above to enable deployment.</p>
        )}
      </section>

      {/* ---------- Status timeline ---------- */}
      {(running || deploy.session.phase === "failed" || (stepsVisible.some((s) => s.status === "done" && s.id !== "validate"))) && (
        <section className="card p-4" aria-label="Deployment progress">
          <p className="text-[13px] font-semibold text-ink">
            {running ? `Deploying ${name}…` : deploy.session.phase === "failed" ? "Deployment failed" : "Deployment complete"}
          </p>
          <ul className="mt-3 space-y-2">
            {stepsVisible.map((s) => (
              <StepRow key={s.id} step={s} />
            ))}
          </ul>
          {deploy.session.error && (
            <div className="mt-3 rounded-lg border border-danger/30 bg-danger-muted p-3 text-[12.5px] text-danger" role="alert">
              {deploy.session.error}
            </div>
          )}
          {deploy.session.phase === "failed" && (
            <Button variant="danger" size="sm" className="mt-3" onClick={() => void onRetry()}>
              <RefreshCw className="h-3.5 w-3.5" /> Retry Deployment
            </Button>
          )}
        </section>
      )}

      {/* ---------- Live links ---------- */}
      {status === "live" && (
        <section className="card space-y-3 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-[13.5px] font-semibold text-ink">
              <Globe className="h-4 w-4 text-ok" /> Production
            </p>
            {deployment?.lastDeployedAt && (
              <span className="text-[11.5px] text-ink-faint">Last deployed {timeAgo(deployment.lastDeployedAt)}</span>
            )}
          </div>
          {deployment?.productionUrl && (
            <div className="flex items-center gap-2 rounded-lg border border-brand-ring bg-brand-muted/40 p-2.5">
              <input className="input h-9 min-w-0 flex-1 font-mono text-[12px]" value={deployment.productionUrl} readOnly onFocus={(e) => e.target.select()} aria-label="Production URL" />
              <a href={deployment.productionUrl} target="_blank" rel="noreferrer" className="btn-primary btn-sm inline-flex shrink-0 items-center gap-1.5" role="button">
                <ArrowUpRight className="h-3.5 w-3.5" /> Open Website
              </a>
            </div>
          )}
          <p className="text-[11.5px] text-ink-faint">
            Custom domain support coming soon — the production URL stays stable when you connect one later.
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            {deployment?.github.repositoryUrl && (
              <a href={deployment.github.repositoryUrl} target="_blank" rel="noreferrer" className="link-row">
                <Github className="h-3.5 w-3.5 shrink-0 text-ink-muted" />
                <span className="min-w-0 flex-1 truncate">{deployment.github.repositoryName ?? "Repository"}</span>
                <ExternalLink className="h-3 w-3 shrink-0 text-ink-faint" />
              </a>
            )}
            {deployment?.providerDashboardUrl && (
              <a href={deployment.providerDashboardUrl} target="_blank" rel="noreferrer" className="link-row">
                <span className="flex h-3.5 w-3.5 shrink-0 items-center text-ink-muted">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" aria-hidden>
                    <path d={providerMeta(deployment.provider).mark} />
                  </svg>
                </span>
                <span className="min-w-0 flex-1 truncate">{providerMeta(deployment.provider).name} dashboard</span>
                <ExternalLink className="h-3 w-3 shrink-0 text-ink-faint" />
              </a>
            )}
            {deployment?.previewUrl && (
              <a href={deployment.previewUrl} target="_blank" rel="noreferrer" className="link-row">
                <ScrollText className="h-3.5 w-3.5 shrink-0 text-ink-muted" />
                <span className="min-w-0 flex-1 truncate">Latest deployment</span>
                <ExternalLink className="h-3 w-3 shrink-0 text-ink-faint" />
              </a>
            )}
          </div>
        </section>
      )}

      {/* ---------- History ---------- */}
      {(project.deploymentHistory?.length ?? 0) > 0 && (
        <section className="card p-4">
          <p className="text-[13px] font-semibold text-ink">Deployment History</p>
          <ul className="mt-3 space-y-1">
            {project.deploymentHistory!.map((r) => (
              <li key={r.id} className="flex items-start gap-2.5 rounded-lg px-2 py-2 hover:bg-surface-2">
                {r.status === "live" ? (
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ok" />
                ) : (
                  <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-danger" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-baseline gap-x-2 text-[12.5px] text-ink">
                    <span className="font-medium">{r.status === "live" ? "Live" : "Failed"}</span>
                    <span className="text-[11.5px] text-ink-faint">{formatDate(r.at)}</span>
                    {r.url && (
                      <a href={r.url} target="_blank" rel="noreferrer" className="truncate font-mono text-[11px] text-brand-hover hover:underline">
                        {r.url.replace(/^https?:\/\//, "")}
                      </a>
                    )}
                  </p>
                  <p className="truncate text-[11.5px] text-ink-muted">{r.commitMessage ?? "—"}</p>
                  {r.error && <p className="mt-0.5 text-[11.5px] text-danger">{r.error}</p>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ---------- Logs ---------- */}
      {hasLogs && (
        <section className="card p-4">
          <button
            className="flex w-full items-center justify-between text-[13px] font-semibold text-ink"
            onClick={() => setLogsOpen(!logsOpen)}
            aria-expanded={logsOpen}
          >
            Deployment Logs
            {logsOpen ? <ChevronUp className="h-4 w-4 text-ink-muted" /> : <ChevronDown className="h-4 w-4 text-ink-muted" />}
          </button>
          {logsOpen && (
            <pre className="mt-3 max-h-56 overflow-y-auto rounded-lg border border-line bg-surface-0 p-3 font-mono text-[11px] leading-relaxed text-ink-muted">
              {deploy.session.logs.map((l) => (
                <span key={l.id} className="block">
                  <span className="text-ink-faint">{new Date(l.at).toLocaleTimeString()}</span> {l.text}
                </span>
              ))}
            </pre>
          )}
        </section>
      )}
    </div>
  );
}

/* ---------- Small pieces ---------- */

function StepRow({ step }: { step: DeployStep }) {
  return (
    <li className="flex items-center gap-2.5">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center">
        {step.status === "done" && <Check className="h-4 w-4 text-ok" />}
        {step.status === "active" && <Loader2 className="h-4 w-4 animate-spin text-brand-hover" />}
        {step.status === "failed" && <X className="h-4 w-4 text-danger" />}
        {step.status === "pending" && <CircleDashed className="h-4 w-4 text-ink-faint" />}
      </span>
      <span
        className={cn(
          "text-[12.5px]",
          step.status === "active" ? "font-medium text-ink" : step.status === "failed" ? "text-danger" : "text-ink-muted"
        )}
      >
        {step.label}
      </span>
    </li>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
