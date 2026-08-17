import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Braces,
  Check,
  Code2,
  Copy,
  ExternalLink,
  FileArchive,
  FileDown,
  FileJson,
  Link2,
  Loader2,
  Rocket,
  TerminalSquare,
} from "lucide-react";
import { useEditor } from "./editorStore";
import { Modal } from "@/components/ui/Modal";
import { Badge, Button } from "@/components/ui/ui";
import { useToast } from "@/app/toast";
import { buildProjectZip, buildResolvedStructure, projectZipFilename } from "@/lib/exportZip";
import { buildScaffoldZip, scaffoldZipFilename } from "@/lib/scaffold";
import { downloadFile, slugify } from "@/utils/helpers";

/* ============================================================
   Export — real exports: project configuration, resolved
   website structure, a standalone ZIP package (config + docs)
   and the full-screen preview link. Automated code generation
   is clearly marked as the next phase.
   ============================================================ */

export default function ExportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { project } = useEditor();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"export" | "deploy">("export");
  const [zipping, setZipping] = useState(false);
  const [scaffolding, setScaffolding] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const slug = slugify(project.config.projectInfo.name || "project") || "project";

  /* Resolved website structure (theme tokens + resolved content) */
  const buildStructure = () => buildResolvedStructure(project);

  const downloadProject = () => {
    downloadFile(`katch-project-${slug}.json`, JSON.stringify(project, null, 2));
    toast("success", "Project configuration downloaded.");
  };

  const downloadStructure = () => {
    downloadFile(`katch-website-${slug}.json`, JSON.stringify(buildStructure(), null, 2));
    toast("success", "Website structure downloaded.");
  };

  /* Standalone React/Vite project — REAL code generation.
     The website layer sources are embedded at build time; jszip is lazy. */
  const downloadScaffold = async () => {
    try {
      setScaffolding(true);
      const catalogue = (await import("@/features/export/catalogue.json")).default;
      const blob = await buildScaffoldZip(project, catalogue, { embed: true });
      downloadFile(scaffoldZipFilename(project), blob, "application/zip");
      toast("success", "Standalone project downloaded — npm install && npm run dev to run it.");
    } catch (err) {
      console.error("[Katch Studio] Scaffold export failed:", err);
      toast("error", "Could not generate the project — please try again.");
    } finally {
      setScaffolding(false);
    }
  };

  /* Plain config package (backup / handoff) */
  const downloadZip = async () => {
    try {
      setZipping(true);
      const blob = await buildProjectZip(project);
      downloadFile(projectZipFilename(project), blob, "application/zip");
      toast("success", "Config package downloaded.");
    } catch (err) {
      console.error("[Katch Studio] ZIP export failed:", err);
      toast("error", "Could not build the ZIP package — please try again.");
    } finally {
      setZipping(false);
    }
  };

  /* Share for review — a link the client can open on any device */
  const buildShareLink = () => {
    const url = `${window.location.origin}/preview/${project.id}`;
    setShareUrl(url);
  };

  const copyShareLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
      toast("success", "Review link copied.");
    } catch {
      toast("error", "Could not copy — select the link and copy it manually.");
    }
  };

  const openFullPreview = () => {
    navigate(`/preview/${project.id}`);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Export Project"
      description="Everything you need to hand off, back up, or continue in the build pipeline."
      size="lg"
    >
      <div className="seg mb-5">
        <button className={tab === "export" ? "seg-item-active" : "seg-item"} onClick={() => setTab("export")} role="tab" aria-selected={tab === "export"}>
          Export Now
        </button>
        <button className={tab === "deploy" ? "seg-item-active" : "seg-item"} onClick={() => setTab("deploy")} role="tab" aria-selected={tab === "deploy"}>
          Deployment
        </button>
      </div>

      {tab === "export" && (
        <div className="space-y-3">
          <ExportRow
            icon={<Code2 className="h-4 w-4" />}
            title="Standalone React/Vite project"
            desc="Real code generation: a complete client website (the same renderer as this preview) with npm scripts, editable website.json and a README. Unzip, npm install, npm run dev."
            action={
              <Button size="sm" variant="primary" onClick={downloadScaffold} disabled={scaffolding}>
                {scaffolding ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating…
                  </>
                ) : (
                  <>
                    <FileDown className="h-3.5 w-3.5" /> Download project
                  </>
                )}
              </Button>
            }
          />
          <ExportRow
            icon={<FileArchive className="h-4 w-4" />}
            title="Config package"
            desc="project.json + website.json + handover README — a portable backup without source code."
            action={
              <Button size="sm" onClick={downloadZip} disabled={zipping}>
                {zipping ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Zipping…
                  </>
                ) : (
                  <>
                    <FileDown className="h-3.5 w-3.5" /> Download .zip
                  </>
                )}
              </Button>
            }
          />
          <ExportRow
            icon={<Link2 className="h-4 w-4" />}
            title="Share for review"
            desc="A clean preview link your client can open on any device — no login, read-only."
            action={
              <Button size="sm" onClick={buildShareLink}>
                <Link2 className="h-3.5 w-3.5" /> Create link
              </Button>
            }
          />
          <ExportRow
            icon={<FileJson className="h-4 w-4" />}
            title="Project configuration"
            desc="The full project file — template, sections, theme, features and content. Importable, diffable, and a complete backup."
            action={<Button size="sm" onClick={downloadProject}><FileDown className="h-3.5 w-3.5" /> Download .json</Button>}
          />
          <ExportRow
            icon={<Braces className="h-4 w-4" />}
            title="Website structure (resolved)"
            desc="The generated website as data: every page, section and resolved content with theme tokens. This is the exact input the future code generator consumes."
            action={<Button size="sm" onClick={downloadStructure}><FileDown className="h-3.5 w-3.5" /> Download .json</Button>}
          />
          <ExportRow
            icon={<ExternalLink className="h-4 w-4" />}
            title="Full-screen preview"
            desc="Open the real rendered website in a clean window — ideal for client reviews before build."
            action={<Button size="sm" variant="primary" onClick={openFullPreview}><ExternalLink className="h-3.5 w-3.5" /> Open Preview</Button>}
          />
          {shareUrl && (
            <div className="flex items-center gap-2 rounded-lg border border-brand-ring bg-brand-muted/40 p-3">
              <input
                className="input h-9 min-w-0 flex-1 font-mono text-[12px]"
                value={shareUrl}
                readOnly
                onFocus={(e) => e.target.select()}
                aria-label="Review link"
              />
              <Button size="sm" variant="primary" onClick={copyShareLink}>
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          )}
          <div className="rounded-lg border border-line bg-surface-0/50 p-3.5 text-[12.5px] leading-relaxed text-ink-muted">
            <strong className="text-ink">Scope:</strong> the standalone project is generated from the same
            renderer as this preview — what you see is what ships. Automated deployment (GitHub → Vercel)
            for generated projects is the next phase.
          </div>
        </div>
      )}

      {tab === "deploy" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-line bg-surface-0/50 p-4">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 text-[13.5px] font-semibold text-ink">
                <TerminalSquare className="h-4 w-4 text-brand-hover" /> The generated project
              </p>
              <Badge tone="brand">Ships today</Badge>
            </div>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-muted">
              The ZIP from the Export tab is a complete, runnable React/Vite app: the same website
              layer as this preview, <code className="rounded bg-surface-2 px-1 py-0.5 text-[11px]">website.json</code> as the
              single content source, npm scripts, and a handover README. Run it locally, hand it to a
              developer, or deploy <code className="rounded bg-surface-2 px-1 py-0.5 text-[11px]">dist/</code> to any static host.
            </p>
          </div>

          <div className="rounded-xl border border-line bg-surface-0/50 p-4">
            <p className="flex items-center gap-2 text-[13.5px] font-semibold text-ink">
              <Rocket className="h-4 w-4 text-brand-hover" /> Automated deployment
            </p>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-muted">
              Next phase: push the generated project to GitHub → auto-build on Vercel/Netlify → share the
              production URL, all from Katch Studio. The project stays linked here for maintenance and
              updates.
            </p>
          </div>

          <div className="rounded-xl border border-line bg-surface-0/50 p-4">
            <p className="flex items-center gap-2 text-[13.5px] font-semibold text-ink">
              <Rocket className="h-4 w-4 text-brand-hover" /> Client review portal
            </p>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-muted">
              The Share-for-review link is live today. Next phase adds client feedback and approval on
              that link, synced back into this project.
            </p>
          </div>
        </div>
      )}


    </Modal>
  );
}

function ExportRow({
  icon,
  title,
  desc,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  action: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-line bg-surface-1 p-3.5 sm:flex-row sm:items-center">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-muted text-brand-hover">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-semibold text-ink">{title}</p>
        <p className="text-[12px] leading-relaxed text-ink-faint">{desc}</p>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  );
}
