import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Braces,
  ExternalLink,
  FileArchive,
  FileDown,
  FileJson,
  Loader2,
  Rocket,
  TerminalSquare,
} from "lucide-react";
import { useEditor } from "./editorStore";
import { Modal } from "@/components/ui/Modal";
import { Badge, Button } from "@/components/ui/ui";
import { useToast } from "@/app/toast";
import { buildProjectZip, buildResolvedStructure, projectZipFilename } from "@/lib/exportZip";
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
  const [tab, setTab] = useState<"export" | "future">("export");
  const [zipping, setZipping] = useState(false);

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

  /* Standalone ZIP package (jszip is lazy-loaded by the lib) */
  const downloadZip = async () => {
    try {
      setZipping(true);
      const blob = await buildProjectZip(project);
      downloadFile(projectZipFilename(project), blob, "application/zip");
      toast("success", "ZIP package downloaded.");
    } catch (err) {
      console.error("[Katch Studio] ZIP export failed:", err);
      toast("error", "Could not build the ZIP package — please try again.");
    } finally {
      setZipping(false);
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
        <button className={tab === "future" ? "seg-item-active" : "seg-item"} onClick={() => setTab("future")} role="tab" aria-selected={tab === "future"}>
          Code Generation
        </button>
      </div>

      {tab === "export" && (
        <div className="space-y-3">
          <ExportRow
            icon={<FileArchive className="h-4 w-4" />}
            title="Standalone ZIP package"
            desc="project.json + website.json + handover README in one archive — the complete, portable export of this project."
            action={
              <Button size="sm" variant="primary" onClick={downloadZip} disabled={zipping}>
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
          <div className="rounded-lg border border-line bg-surface-0/50 p-3.5 text-[12.5px] leading-relaxed text-ink-muted">
            <strong className="text-ink">Honest scope:</strong> the MVP exports configuration and resolved
            structure — it does not fabricate source files. One-click scaffold generation (below) is the next
            phase of the pipeline.
          </div>
        </div>
      )}

      {tab === "future" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-line bg-surface-0/50 p-4">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 text-[13.5px] font-semibold text-ink">
                <TerminalSquare className="h-4 w-4 text-brand-hover" /> Automated scaffold generation
              </p>
              <Badge tone="accent">Planned · P2</Badge>
            </div>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-muted">
              Katch Studio will run a Node script that reads the exported structure JSON and scaffolds a
              standalone React/Vite project — the website sections you see in the preview become the actual
              <code className="rounded bg-surface-2 px-1 py-0.5 text-[11.5px]"> src/sections/ </code>
              of the client site. No rewriting, no drift between preview and production.
            </p>
          </div>

          <div className="rounded-xl border border-line bg-surface-0/50 p-4 font-mono text-[11.5px] leading-relaxed text-ink-muted">
            <p className="mb-2 text-[13px] font-sans font-semibold text-ink">Planned output</p>
            <pre className="overflow-x-auto">{`client-project/
├── src/
│   ├── components/     # shared UI (buttons, cards…)
│   ├── sections/       # the reusable sections
│   ├── pages/          # one page per config page
│   ├── data/           # website-structure.json
│   ├── assets/         # uploaded images
│   └── styles/         # theme tokens → CSS variables
├── public/
├── package.json        # React + Vite
└── README.md           # client handover notes`}</pre>
          </div>

          <div className="rounded-xl border border-line bg-surface-0/50 p-4">
            <p className="flex items-center gap-2 text-[13.5px] font-semibold text-ink">
              <Rocket className="h-4 w-4 text-brand-hover" /> Deployment pipeline
            </p>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-muted">
              Future: push the scaffold to GitHub → auto-build on Vercel/Netlify → share the production URL with
              the client. Katch Studio will keep the project linked for maintenance and updates.
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
