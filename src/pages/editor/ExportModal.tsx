import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Archive,
  ArrowLeft,
  Braces,
  Check,
  CheckCircle2,
  ExternalLink,
  FileDown,
  FileJson,
  Github,
  Loader2,
  Rocket,
} from "lucide-react";
import { useEditor } from "./editorStore";
import { Modal } from "@/components/ui/Modal";
import { Badge, Button } from "@/components/ui/ui";
import { useToast } from "@/app/toast";
import { getTemplate } from "@/data/templates";
import { getFeature } from "@/data/features";
import { sectionDefaults } from "@/features/sections/registry";
import { countProjectAssets } from "@/features/export/assets";
import { downloadExport, exportProjectZip } from "@/features/export/exportProject";
import type { ExportOptions, ExportProgress, ExportResult } from "@/features/export/types";
import { deepMerge, downloadFile, slugify } from "@/utils/helpers";

const INITIAL_PROGRESS: ExportProgress = { phase: "idle", label: "Ready", completed: 0, total: 6 };

export default function ExportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { project } = useEditor();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"export" | "future">("export");
  const [zipPanel, setZipPanel] = useState(false);
  const [options, setOptions] = useState<ExportOptions>({ includeAssets: true, includeReadme: true });
  const [progress, setProgress] = useState<ExportProgress>(INITIAL_PROGRESS);
  const [result, setResult] = useState<ExportResult | null>(null);
  const [error, setError] = useState("");
  const [errorDetails, setErrorDetails] = useState<string[]>([]);

  useEffect(() => {
    if (!open) {
      setZipPanel(false);
      setProgress(INITIAL_PROGRESS);
      setResult(null);
      setError("");
      setErrorDetails([]);
    }
  }, [open]);

  const slug = slugify(project.config.projectInfo.name || "project") || "project";
  const assetCount = useMemo(() => countProjectAssets(project), [project]);
  const sectionCount = project.config.sections.filter((section) => !section.hidden).length;
  const templateName = getTemplate(project.config.templateId)?.name ?? project.config.templateId ?? "Custom template";
  const busy = !["idle", "ready", "error"].includes(progress.phase);

  const buildStructure = () => {
    const { config } = project;
    return {
      generator: "Katch Studio",
      version: "1.0.0",
      generatedAt: new Date().toISOString(),
      project: {
        name: config.projectInfo.name,
        client: config.projectInfo.client,
        category: config.projectInfo.category,
        language: config.projectInfo.language,
        direction: config.projectInfo.language === "ar" ? "rtl" : "ltr",
      },
      brand: config.brand,
      theme: config.theme,
      features: Object.fromEntries(
        config.features.map((feature) => [feature.id, { enabled: feature.enabled, name: getFeature(feature.id)?.name ?? feature.id }])
      ),
      pages: config.pages.map((page) => ({
        id: page.id,
        name: page.name,
        path: page.path,
        seo: page.seo,
        sections: page.sections
          .map((id) => config.sections.find((section) => section.id === id))
          .filter((section): section is NonNullable<typeof section> => Boolean(section))
          .map((section) => ({
            id: section.id,
            type: section.type,
            hidden: section.hidden,
            content: deepMerge(sectionDefaults(section.type, config.brand), section.content),
          })),
      })),
      sourceTemplate: getTemplate(config.templateId)?.name ?? null,
    };
  };

  const downloadProject = () => {
    downloadFile(`katch-project-${slug}.json`, JSON.stringify(project, null, 2));
    toast("success", "Project configuration downloaded.");
  };

  const downloadStructure = () => {
    downloadFile(`katch-website-${slug}.json`, JSON.stringify(buildStructure(), null, 2));
    toast("success", "Website structure downloaded.");
  };

  const openFullPreview = () => {
    navigate(`/preview/${project.id}`);
    onClose();
  };

  const generateZip = async () => {
    setError("");
    setErrorDetails([]);
    setResult(null);
    try {
      const next = await exportProjectZip(project, options, setProgress);
      setResult(next);
      downloadExport(next);
      toast("success", `${next.archiveName} is ready.`);
    } catch (cause) {
      const value = cause as Error & { details?: string[] };
      setProgress({ phase: "error", label: "Export failed", completed: 0, total: 6 });
      setError(value.message || "The standalone project could not be generated.");
      setErrorDetails(value.details ?? []);
      toast("error", "ZIP export failed — review the details and try again.");
    }
  };

  return (
    <Modal
      open={open}
      onClose={busy ? () => undefined : onClose}
      title="Export Project"
      description="Download a standalone website, back up its configuration, or open the full preview."
      size="lg"
    >
      {!zipPanel && (
        <div className="seg mb-5">
          <button className={tab === "export" ? "seg-item-active" : "seg-item"} onClick={() => setTab("export")} role="tab" aria-selected={tab === "export"}>
            Export Now
          </button>
          <button className={tab === "future" ? "seg-item-active" : "seg-item"} onClick={() => setTab("future")} role="tab" aria-selected={tab === "future"}>
            Delivery Roadmap
          </button>
        </div>
      )}

      {zipPanel ? (
        <ZipPanel
          projectName={project.config.projectInfo.name}
          templateName={templateName}
          pages={project.config.pages.length}
          sections={sectionCount}
          assets={assetCount}
          options={options}
          setOptions={setOptions}
          progress={progress}
          result={result}
          error={error}
          errorDetails={errorDetails}
          busy={busy}
          onBack={() => setZipPanel(false)}
          onGenerate={() => void generateZip()}
          onDownload={() => result && downloadExport(result)}
        />
      ) : tab === "export" ? (
        <div className="space-y-3">
          <ExportRow
            icon={<Archive className="h-4 w-4" />}
            title="Standalone React/Vite project"
            desc="A complete website codebase with pages, sections, content, theme, features and downloadable assets. Extract it, run npm install, then npm run dev."
            action={<Button size="sm" variant="primary" onClick={() => setZipPanel(true)}><Archive className="h-3.5 w-3.5" /> Download ZIP</Button>}
          />
          <ExportRow
            icon={<FileJson className="h-4 w-4" />}
            title="Project configuration"
            desc="The full Katch project file — template, sections, theme, features and content."
            action={<Button size="sm" onClick={downloadProject}><FileDown className="h-3.5 w-3.5" /> Download .json</Button>}
          />
          <ExportRow
            icon={<Braces className="h-4 w-4" />}
            title="Website structure (resolved)"
            desc="Every page and section with defaults merged into the configured content."
            action={<Button size="sm" onClick={downloadStructure}><FileDown className="h-3.5 w-3.5" /> Download .json</Button>}
          />
          <ExportRow
            icon={<ExternalLink className="h-4 w-4" />}
            title="Full-screen preview"
            desc="Open the rendered website in a clean window for client review."
            action={<Button size="sm" onClick={openFullPreview}><ExternalLink className="h-3.5 w-3.5" /> Open Preview</Button>}
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-line bg-surface-0/50 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="flex items-center gap-2 text-[13.5px] font-semibold text-ink"><Github className="h-4 w-4 text-brand-hover" /> Push generated files to GitHub</p>
              <Badge tone="accent">Planned</Badge>
            </div>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-muted">The standalone file generator now powers ZIP downloads. A future delivery adapter can send the same validated files to a client repository.</p>
          </div>
          <div className="rounded-xl border border-line bg-surface-0/50 p-4">
            <p className="flex items-center gap-2 text-[13.5px] font-semibold text-ink"><Rocket className="h-4 w-4 text-brand-hover" /> Deployment pipeline</p>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-muted">Future: connect a generated repository to Vercel or Netlify and return the production URL to the project.</p>
          </div>
        </div>
      )}
    </Modal>
  );
}

function ZipPanel({
  projectName,
  templateName,
  pages,
  sections,
  assets,
  options,
  setOptions,
  progress,
  result,
  error,
  errorDetails,
  busy,
  onBack,
  onGenerate,
  onDownload,
}: {
  projectName: string;
  templateName: string;
  pages: number;
  sections: number;
  assets: number;
  options: ExportOptions;
  setOptions: React.Dispatch<React.SetStateAction<ExportOptions>>;
  progress: ExportProgress;
  result: ExportResult | null;
  error: string;
  errorDetails: string[];
  busy: boolean;
  onBack: () => void;
  onGenerate: () => void;
  onDownload: () => void;
}) {
  const phases = ["Validating project", "Preparing pages", "Preparing sections", "Preparing assets", "Generating source code", "Creating ZIP archive"];
  return (
    <div>
      <button className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted hover:text-ink" onClick={onBack} disabled={busy}>
        <ArrowLeft className="h-3.5 w-3.5" /> Back to export options
      </button>

      <div className="grid gap-3 rounded-xl border border-line bg-surface-0/50 p-4 sm:grid-cols-2">
        <Summary label="Project" value={projectName} />
        <Summary label="Template" value={templateName} />
        <Summary label="Pages" value={String(pages)} />
        <Summary label="Sections" value={String(sections)} />
        <Summary label="Assets detected" value={String(assets)} />
        <Summary label="Output" value="React + Vite + TypeScript" />
      </div>

      <div className="mt-4 space-y-2 rounded-xl border border-line bg-surface-1 p-4">
        <Option checked disabled label="Include source code" hint="Required for a standalone website." />
        <Option checked={options.includeAssets} disabled={busy} onChange={(value) => setOptions((old) => ({ ...old, includeAssets: value }))} label="Include downloadable assets" hint="External URLs are preserved if the browser cannot fetch them." />
        <Option checked={options.includeReadme} disabled={busy} onChange={(value) => setOptions((old) => ({ ...old, includeReadme: value }))} label="Include README" hint="Setup, build, environment and routing instructions." />
      </div>

      {progress.phase !== "idle" && (
        <div className="mt-4 rounded-xl border border-line bg-surface-0/50 p-4" aria-live="polite">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-[13px] font-semibold text-ink">{progress.label}</p>
            <span className="text-[11px] text-ink-faint">{Math.round((progress.completed / progress.total) * 100)}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
            <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${(progress.completed / progress.total) * 100}%` }} />
          </div>
          <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
            {phases.map((label, index) => {
              const done = progress.completed > index;
              const current = progress.completed === index && busy;
              return <li key={label} className="flex items-center gap-2 text-[11.5px] text-ink-muted">{done ? <Check className="h-3.5 w-3.5 text-ok" /> : current ? <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-hover" /> : <span className="h-3.5 w-3.5 rounded-full border border-line-strong" />}{label}</li>;
            })}
          </ul>
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-xl border border-danger/30 bg-danger-muted p-4 text-[12.5px] text-danger" role="alert">
          <p className="flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4" /> {error}</p>
          {errorDetails.length > 0 && <ul className="mt-2 list-disc space-y-1 ps-5">{errorDetails.map((detail) => <li key={detail}>{detail}</li>)}</ul>}
        </div>
      )}

      {result && (
        <div className="mt-4 rounded-xl border border-ok/30 bg-ok/10 p-4 text-[12.5px] text-ink">
          <p className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-4 w-4 text-ok" /> {result.archiveName} generated with {result.fileCount} files.</p>
          {result.warnings.length > 0 && <details className="mt-2 text-ink-muted"><summary>{result.warnings.length} asset warning{result.warnings.length === 1 ? "" : "s"}</summary><ul className="mt-1 list-disc space-y-1 ps-5">{result.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></details>}
        </div>
      )}

      <div className="mt-5 flex items-center justify-end gap-2">
        <Button variant="ghost" onClick={onBack} disabled={busy}>Cancel</Button>
        {result ? (
          <Button variant="primary" onClick={onDownload}><FileDown className="h-4 w-4" /> Download again</Button>
        ) : (
          <Button variant="primary" onClick={onGenerate} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
            {busy ? "Generating…" : "Generate ZIP"}
          </Button>
        )}
      </div>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-faint">{label}</p><p className="mt-0.5 truncate text-[13.5px] font-medium text-ink">{value}</p></div>;
}

function Option({ checked, disabled, onChange, label, hint }: { checked: boolean; disabled?: boolean; onChange?: (value: boolean) => void; label: string; hint: string }) {
  return (
    <label className="flex items-start gap-3 rounded-lg px-2 py-2 hover:bg-surface-2/60">
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange?.(event.target.checked)} className="mt-0.5 h-4 w-4 accent-brand" />
      <span><span className="block text-[13px] font-medium text-ink">{label}</span><span className="block text-[11.5px] text-ink-faint">{hint}</span></span>
    </label>
  );
}

function ExportRow({ icon, title, desc, action }: { icon: React.ReactNode; title: string; desc: string; action: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-line bg-surface-1 p-3.5 sm:flex-row sm:items-center">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-muted text-brand-hover">{icon}</span>
      <div className="min-w-0 flex-1"><p className="text-[13.5px] font-semibold text-ink">{title}</p><p className="text-[12px] leading-relaxed text-ink-faint">{desc}</p></div>
      <div className="shrink-0">{action}</div>
    </div>
  );
}
