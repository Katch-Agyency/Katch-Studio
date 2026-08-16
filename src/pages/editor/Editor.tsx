import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  CloudUpload,
  Copy,
  Eye,
  Files,
  Layers,
  Monitor,
  MoreHorizontal,
  PencilLine,
  RotateCcw,
  Save,
  Search,
  Smartphone,
  Tablet,
  ToggleRight,
  Loader2,
  Palette,
} from "lucide-react";
import { EditorProvider, useEditor } from "./editorStore";
import { EditorUIContext, type EditorUIState } from "./editorUI";
import PagesPanel from "./panels/PagesPanel";
import SectionsPanel from "./panels/SectionsPanel";
import ContentPanel from "./panels/ContentPanel";
import BrandPanel from "./panels/BrandPanel";
import FeaturesPanel from "./panels/FeaturesPanel";
import SeoPanel from "./panels/SeoPanel";
import ExportModal from "./ExportModal";
import WebsiteRenderer from "@/website/WebsiteRenderer";
import { useStore } from "@/app/store";
import { useToast } from "@/app/toast";
import { Button } from "@/components/ui/ui";
import { STATUS_META } from "@/data/status";
import type { DeviceMode, EditorTab, ProjectStatus } from "@/types";
import { PROJECT_STATUSES } from "@/types";
import { cn } from "@/utils/helpers";

/* ============================================================
   Project Editor — sidebar panels + live preview.
   The preview renders through the real WebsiteRenderer.
   ============================================================ */

const TABS: { id: EditorTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "pages", label: "Pages", icon: Files },
  { id: "sections", label: "Sections", icon: Layers },
  { id: "content", label: "Content", icon: PencilLine },
  { id: "brand", label: "Brand", icon: Palette },
  { id: "features", label: "Features", icon: ToggleRight },
  { id: "seo", label: "SEO", icon: Search },
];

const DEVICES: { id: DeviceMode; label: string; icon: React.ComponentType<{ className?: string }>; width?: number }[] = [
  { id: "desktop", label: "Desktop", icon: Monitor },
  { id: "tablet", label: "Tablet", icon: Tablet, width: 768 },
  { id: "mobile", label: "Mobile", icon: Smartphone, width: 390 },
];

export default function EditorPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { getProject, drafts } = useStore();

  const exists = Boolean(projectId && (getProject(projectId) || drafts[projectId]));

  if (!exists || !projectId) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-[15px] font-semibold text-ink">This project doesn't exist.</p>
        <p className="text-sm text-ink-muted">It may have been deleted.</p>
        <Link to="/projects">
          <Button variant="secondary">Back to Projects</Button>
        </Link>
      </div>
    );
  }

  return (
    <EditorProvider key={projectId} projectId={projectId}>
      <EditorInner projectId={projectId} />
    </EditorProvider>
  );
}

function EditorInner({ projectId }: { projectId: string }) {
  const { project, saveState, update, save, reset } = useEditor();
  const { duplicateProject } = useStore();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [activePageId, setActivePageId] = useState<string>(project.config.pages[0]?.id ?? "");
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [device, setDevice] = useState<DeviceMode>("desktop");
  const [tab, setTab] = useState<EditorTab>("sections");
  const [mobileView, setMobileView] = useState<"edit" | "preview">("edit");
  const [exportOpen, setExportOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  /* Keep the active page valid when pages change */
  useEffect(() => {
    if (!project.config.pages.some((p) => p.id === activePageId)) {
      setActivePageId(project.config.pages[0]?.id ?? "");
    }
  }, [project.config.pages, activePageId]);

  /* Ctrl/Cmd + S saves; the command palette can also request a save */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        save();
      }
    };
    const onPaletteSave = () => save();
    window.addEventListener("keydown", onKey);
    window.addEventListener("katch-studio:save-request", onPaletteSave);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("katch-studio:save-request", onPaletteSave);
    };
  }, [save]);

  const ui = useMemo<EditorUIState>(
    () => ({
      activePageId,
      setActivePageId,
      selectedSectionId,
      setSelectedSectionId,
      device,
      setDevice,
      tab,
      setTab,
      mobileView,
      setMobileView,
    }),
    [activePageId, selectedSectionId, device, tab, mobileView]
  );

  const onDuplicate = () => {
    const copy = duplicateProject(projectId);
    if (copy) {
      toast("success", "Project duplicated.");
      navigate(`/editor/${copy.id}`);
    }
  };

  const status = project.status;
  const activePage = project.config.pages.find((p) => p.id === activePageId);

  return (
    <EditorUIContext.Provider value={ui}>
      <div className="flex h-full min-h-0 flex-col">
        {/* ================= Top bar ================= */}
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-line bg-surface-1/70 px-3 backdrop-blur md:px-4">
          <Link to="/projects" className="btn-icon shrink-0" aria-label="Back to projects">
            <ArrowLeft className="h-4 w-4" />
          </Link>

          {/* Project name (inline editable) */}
          <div className="min-w-0 flex-1">
            {renaming ? (
              <input
                className="input h-8 max-w-[260px] text-[13.5px] font-semibold"
                defaultValue={project.config.projectInfo.name}
                autoFocus
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v) update((p) => void (p.config.projectInfo.name = v));
                  setRenaming(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  if (e.key === "Escape") setRenaming(false);
                }}
                aria-label="Project name"
              />
            ) : (
              <button
                className="flex max-w-full items-center gap-1.5 truncate text-[13.5px] font-semibold text-ink hover:text-brand-hover"
                onClick={() => setRenaming(true)}
                title="Rename project"
              >
                <span className="truncate">{project.config.projectInfo.name || "Untitled Project"}</span>
                <PencilLine className="h-3 w-3 shrink-0 text-ink-faint" aria-hidden />
              </button>
            )}
            <span className="hidden items-center gap-1.5 pl-1 text-[11.5px] text-ink-faint sm:inline-flex">
              <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_META[status].dot)} aria-hidden />
              {STATUS_META[status].label} · {project.config.pages.length} pages
            </span>
          </div>

          {/* Status select */}
          <select
            className="input hidden h-8 w-[130px] text-xs md:block"
            value={status}
            onChange={(e) => update((p) => void (p.status = e.target.value as ProjectStatus))}
            aria-label="Project status"
          >
            {PROJECT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_META[s].label}
              </option>
            ))}
          </select>

          {/* Device switcher */}
          <div className="seg hidden lg:flex" role="tablist" aria-label="Preview device">
            {DEVICES.map((d) => (
              <button
                key={d.id}
                role="tab"
                aria-selected={device === d.id}
                className={device === d.id ? "seg-item-active" : "seg-item"}
                onClick={() => setDevice(d.id)}
                title={d.label}
              >
                <d.icon className="h-3.5 w-3.5" />
                <span className="hidden xl:inline">{d.label}</span>
              </button>
            ))}
          </div>

          {/* Save */}
          <SaveButton state={saveState} onSave={save} onReset={reset} />

          {/* Export */}
          <Button variant="secondary" size="md" onClick={() => setExportOpen(true)} className="hidden sm:inline-flex">
            <CloudUpload className="h-4 w-4" /> Export
          </Button>

          {/* Menu */}
          <div className="relative">
            <button className="btn-icon" onClick={() => setMenuOpen(!menuOpen)} aria-label="More actions" aria-expanded={menuOpen}>
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 z-50 mt-1 w-48 animate-scale-in rounded-xl border border-line bg-surface-1 p-1 shadow-pop">
                  <button className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] text-ink hover:bg-surface-2" onClick={onDuplicate}>
                    <Copy className="h-3.5 w-3.5 text-ink-muted" /> Duplicate project
                  </button>
                  <button className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] text-ink hover:bg-surface-2" onClick={reset}>
                    <RotateCcw className="h-3.5 w-3.5 text-ink-muted" /> Discard changes
                  </button>
                  <button className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] text-ink hover:bg-surface-2 sm:hidden" onClick={() => setExportOpen(true)}>
                    <CloudUpload className="h-3.5 w-3.5 text-ink-muted" /> Export…
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Mobile edit/preview switch */}
        <div className="seg mx-auto mt-2 shrink-0 lg:hidden" role="tablist" aria-label="Editor or preview">
          <button role="tab" aria-selected={mobileView === "edit"} className={mobileView === "edit" ? "seg-item-active" : "seg-item"} onClick={() => setMobileView("edit")}>
            <PencilLine className="h-3.5 w-3.5" /> Edit
          </button>
          <button role="tab" aria-selected={mobileView === "preview"} className={mobileView === "preview" ? "seg-item-active" : "seg-item"} onClick={() => setMobileView("preview")}>
            <Eye className="h-3.5 w-3.5" /> Preview
          </button>
        </div>

        {/* ================= Body ================= */}
        <div className="flex min-h-0 flex-1">
          {/* Left panel */}
          <aside
            className={cn(
              "w-full shrink-0 flex-col border-r border-line bg-surface-1/40 lg:flex lg:w-[320px]",
              mobileView === "edit" ? "flex" : "hidden"
            )}
            aria-label="Editor panels"
          >
            {/* Tabs */}
            <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-line px-3 py-2 no-scrollbar" aria-label="Editor tabs">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium transition-colors",
                    tab === t.id ? "bg-brand-muted text-brand-hover" : "text-ink-muted hover:bg-surface-2 hover:text-ink"
                  )}
                  aria-pressed={tab === t.id}
                >
                  <t.icon className="h-3.5 w-3.5" />
                  {t.label}
                </button>
              ))}
            </nav>
            <div className="min-h-0 flex-1 overflow-y-auto p-3.5">
              {tab === "pages" && <PagesPanel />}
              {tab === "sections" && <SectionsPanel />}
              {tab === "content" && <ContentPanel />}
              {tab === "brand" && <BrandPanel />}
              {tab === "features" && <FeaturesPanel />}
              {tab === "seo" && <SeoPanel />}
            </div>
          </aside>

          {/* Preview */}
          <div className={cn("min-w-0 flex-1 flex-col lg:flex", mobileView === "preview" ? "flex" : "hidden")}>
            {/* Page tabs */}
            <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-line bg-surface-1/40 px-3 py-2 no-scrollbar">
              {project.config.pages.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setActivePageId(p.id)}
                  className={cn(
                    "shrink-0 rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition-colors",
                    p.id === activePageId ? "bg-brand-muted text-brand-hover" : "text-ink-muted hover:bg-surface-2 hover:text-ink"
                  )}
                  aria-pressed={p.id === activePageId}
                >
                  {p.name}
                </button>
              ))}
              <span className="ml-auto hidden shrink-0 pr-1 text-[11px] text-ink-faint md:block">
                {DEVICES.find((d) => d.id === device)?.label} · live render
              </span>
            </div>

            {/* Canvas */}
            <div className="min-h-0 flex-1 overflow-y-auto bg-surface-0 p-0 md:p-5">
              <div
                className="mx-auto h-full min-h-full overflow-y-auto overflow-x-hidden border-line bg-white transition-all duration-300 md:rounded-lg md:border md:shadow-pop"
                style={{
                  maxWidth: device === "desktop" ? undefined : DEVICES.find((d) => d.id === device)?.width,
                  transform: "translateZ(0)", // keeps `fixed` website elements anchored to the canvas
                }}
              >
                <WebsiteRenderer project={project.config} pageId={activePage?.id} />
              </div>
            </div>
          </div>
        </div>

        <ExportModal open={exportOpen} onClose={() => setExportOpen(false)} />
      </div>
    </EditorUIContext.Provider>
  );
}

/* ---------- Save button with state ---------- */

function SaveButton({
  state,
  onSave,
  onReset,
}: {
  state: "saved" | "saving" | "unsaved" | "error";
  onSave: () => void;
  onReset: () => void;
}) {
  if (state === "error") {
    return (
      <Button variant="danger" size="md" onClick={onSave}>
        <RotateCcw className="h-4 w-4" /> Save failed — retry
      </Button>
    );
  }
  if (state === "saving") {
    return (
      <Button variant="primary" size="md" disabled>
        <Loader2 className="h-4 w-4 animate-spin" /> Saving…
      </Button>
    );
  }
  if (state === "unsaved") {
    return (
      <Button variant="primary" size="md" onClick={onSave}>
        <Save className="h-4 w-4" />
        <span className="hidden sm:inline">Save</span>
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" aria-label="Unsaved changes" />
      </Button>
    );
  }
  return (
    <Button variant="secondary" size="md" onClick={onSave} title="All changes saved">
      <Check className="h-4 w-4 text-ok" />
      <span className="hidden sm:inline">Saved</span>
    </Button>
  );
}
