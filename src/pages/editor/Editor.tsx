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
  LayoutTemplate,
  Loader2,
  Monitor,
  MoreHorizontal,
  Palette,
  PencilLine,
  Redo2,
  Rocket,
  RotateCcw,
  Save,
  Search,
  Smartphone,
  SlidersHorizontal,
  Tablet,
  ToggleRight,
  Undo2,
  X,
} from "lucide-react";
import { EditorProvider, useEditor } from "./editorStore";
import { EditorUIContext, type EditorUIState, type InspectorTab } from "./editorUI";
import PagesPanel from "./panels/PagesPanel";
import LayersPanel from "./panels/LayersPanel";
import DesignPanel from "./panels/DesignPanel";
import ContentPanel from "./panels/ContentPanel";
import BrandPanel from "./panels/BrandPanel";
import FeaturesPanel from "./panels/FeaturesPanel";
import SeoPanel from "./panels/SeoPanel";
import AddSectionModal from "./panels/AddSectionModal";
import ExportModal from "./ExportModal";
import WebsiteRenderer from "@/website/WebsiteRenderer";
import { useStore } from "@/app/store";
import { useToast } from "@/app/toast";
import { Button } from "@/components/ui/ui";
import { STATUS_META } from "@/data/status";
import { DeployProvider } from "@/features/deploy/useDeployment";
import DeploymentPanel from "@/features/deploy/DeploymentPanel";
import type { DeviceMode, ProjectStatus } from "@/types";
import { PROJECT_STATUSES } from "@/types";
import { cn } from "@/utils/helpers";

/* ============================================================
   Project Editor — three-panel professional layout:
   Structure (left) · Live preview (center) · Inspector (right).
   The inspector is contextual: select a section to design &
   edit its content; Brand/Features/SEO are always available.
   ============================================================ */

const INSPECTOR_TABS: { id: InspectorTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "design", label: "Design", icon: SlidersHorizontal },
  { id: "content", label: "Content", icon: PencilLine },
  { id: "brand", label: "Brand", icon: Palette },
  { id: "features", label: "Features", icon: ToggleRight },
  { id: "seo", label: "SEO", icon: Search },
  { id: "deploy", label: "Deploy", icon: Rocket },
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
  const { project, saveState, update, save, reset, canUndo, canRedo, undo, redo } = useEditor();
  const { duplicateProject, saveProjectAsTemplate } = useStore();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [activePageId, setActivePageId] = useState<string>(project.config.pages[0]?.id ?? "");
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [focusedElement, setFocusedElement] = useState<string | null>(null);
  const [device, setDevice] = useState<DeviceMode>("desktop");
  const [tab, setTab] = useState<InspectorTab>("design");
  const [structureTab, setStructureTab] = useState<"pages" | "layers">("layers");
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [mobileView, setMobileView] = useState<"edit" | "preview">("edit");
  const [inspectorOpen, setInspectorOpen] = useState(false); // mobile overlay
  const [addSectionOpen, setAddSectionOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  /* Keep the active page valid when pages change */
  useEffect(() => {
    if (!project.config.pages.some((p) => p.id === activePageId)) {
      setActivePageId(project.config.pages[0]?.id ?? "");
    }
  }, [project.config.pages, activePageId]);

  /* Selecting a section opens the contextual inspector */
  useEffect(() => {
    if (selectedSectionId) setTab("design");
  }, [selectedSectionId]);

  /* Keyboard: save + undo/redo; command palette save bridge */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        save();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      }
    };
    const onPaletteSave = () => save();
    window.addEventListener("keydown", onKey);
    window.addEventListener("katch-studio:save-request", onPaletteSave);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("katch-studio:save-request", onPaletteSave);
    };
  }, [save, undo, redo]);

  const ui = useMemo<EditorUIState>(
    () => ({
      activePageId,
      setActivePageId,
      selectedSectionId,
      setSelectedSectionId,
      focusedElement,
      setFocusedElement,
      device,
      setDevice,
      tab,
      setTab,
      mode,
      setMode,
      mobileView,
      setMobileView,
    }),
    [activePageId, selectedSectionId, focusedElement, device, tab, mode, mobileView]
  );

  const onDuplicate = () => {
    const copy = duplicateProject(projectId);
    if (copy) {
      toast("success", "Project duplicated.");
      navigate(`/editor/${copy.id}`);
    }
  };

  const onSaveAsTemplate = () => {
    const template = saveProjectAsTemplate(project);
    toast("success", `Saved as template “${template.name}”.`);
    setMenuOpen(false);
  };

  const status = project.status;
  const activePage = project.config.pages.find((p) => p.id === activePageId);
  const showPanels = mode === "edit";
  const deviceWidth = device === "desktop" ? undefined : DEVICES.find((d) => d.id === device)?.width;

  return (
    <DeployProvider>
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
            <span className="hidden items-center gap-1.5 pl-1 text-[11.5px] text-ink-faint lg:inline-flex">
              <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_META[status].dot)} aria-hidden />
              {STATUS_META[status].label} · {project.config.pages.length} pages
            </span>
          </div>

          {/* Status select */}
          <select
            className="input hidden h-8 w-[130px] text-xs lg:block"
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

          {/* Undo / Redo */}
          <div className="hidden items-center gap-0.5 md:flex" role="group" aria-label="History">
            <button className="btn-icon-sm" onClick={undo} disabled={!canUndo} aria-label="Undo (Ctrl+Z)" title="Undo (Ctrl+Z)">
              <Undo2 className="h-4 w-4" />
            </button>
            <button className="btn-icon-sm" onClick={redo} disabled={!canRedo} aria-label="Redo (Ctrl+Shift+Z)" title="Redo (Ctrl+Shift+Z)">
              <Redo2 className="h-4 w-4" />
            </button>
          </div>

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

          {/* Edit / Preview mode */}
          <div className="seg hidden sm:flex" role="tablist" aria-label="Editor mode">
            <button
              role="tab"
              aria-selected={mode === "edit"}
              className={mode === "edit" ? "seg-item-active" : "seg-item"}
              onClick={() => setMode("edit")}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span className="hidden xl:inline">Edit</span>
            </button>
            <button
              role="tab"
              aria-selected={mode === "preview"}
              className={mode === "preview" ? "seg-item-active" : "seg-item"}
              onClick={() => setMode("preview")}
            >
              <Eye className="h-3.5 w-3.5" />
              <span className="hidden xl:inline">Preview</span>
            </button>
          </div>

          <SaveButton state={saveState} onSave={save} onReset={reset} />

          <Button variant="secondary" size="md" onClick={() => setExportOpen(true)} className="hidden sm:inline-flex">
            <CloudUpload className="h-4 w-4" /> Export
          </Button>

          {/* More menu */}
          <div className="relative">
            <button className="btn-icon" onClick={() => setMenuOpen(!menuOpen)} aria-label="More actions" aria-expanded={menuOpen}>
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 z-50 mt-1 w-52 animate-scale-in rounded-xl border border-line bg-surface-1 p-1 shadow-pop">
                  <button className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] text-ink hover:bg-surface-2" onClick={() => { undo(); setMenuOpen(false); }}>
                    <Undo2 className="h-3.5 w-3.5 text-ink-muted" /> Undo
                  </button>
                  <button className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] text-ink hover:bg-surface-2" onClick={() => { redo(); setMenuOpen(false); }}>
                    <Redo2 className="h-3.5 w-3.5 text-ink-muted" /> Redo
                  </button>
                  <button className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] text-ink hover:bg-surface-2" onClick={() => { onDuplicate(); setMenuOpen(false); }}>
                    <Copy className="h-3.5 w-3.5 text-ink-muted" /> Duplicate project
                  </button>
                  <button className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] text-ink hover:bg-surface-2" onClick={onSaveAsTemplate}>
                    <LayoutTemplate className="h-3.5 w-3.5 text-ink-muted" /> Save as template
                  </button>
                  <button className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] text-ink hover:bg-surface-2" onClick={() => { reset(); setMenuOpen(false); }}>
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
          {/* -------- Left: Structure -------- */}
          {showPanels && (
            <aside
              className={cn(
                "w-full shrink-0 flex-col border-r border-line bg-surface-1/40 lg:flex lg:w-[300px]",
                mobileView === "edit" ? "flex" : "hidden"
              )}
              aria-label="Structure panel"
            >
              <nav className="flex shrink-0 gap-1 border-b border-line px-3 py-2" aria-label="Structure tabs">
                {([
                  { id: "layers" as const, label: "Layers", icon: Layers },
                  { id: "pages" as const, label: "Pages", icon: Files },
                ]).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setStructureTab(t.id)}
                    className={cn(
                      "flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium transition-colors",
                      structureTab === t.id ? "bg-brand-muted text-brand-hover" : "text-ink-muted hover:bg-surface-2 hover:text-ink"
                    )}
                    aria-pressed={structureTab === t.id}
                  >
                    <t.icon className="h-3.5 w-3.5" />
                    {t.label}
                  </button>
                ))}
                <span className="ml-auto self-center pr-1 text-[11px] text-ink-faint">{activePage?.name}</span>
              </nav>
              <div className="min-h-0 flex-1 overflow-y-auto p-3">
                {structureTab === "pages" ? (
                  <PagesPanel />
                ) : (
                  <LayersPanel onAddSection={() => setAddSectionOpen(true)} />
                )}
              </div>
            </aside>
          )}

          {/* -------- Center: Live preview -------- */}
          <div className={cn("min-w-0 flex-1 flex-col lg:flex", mode === "preview" || mobileView === "preview" ? "flex" : "hidden")}>
            {/* Page tabs */}
            <div className="flex shrink-0 flex-wrap items-center gap-1 border-b border-line bg-surface-1/40 px-3 py-2">
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
                  maxWidth: deviceWidth,
                  transform: "translateZ(0)", // keeps `fixed` website elements anchored to the canvas
                }}
              >
                <WebsiteRenderer project={project.config} pageId={activePage?.id} />
              </div>
            </div>
          </div>

          {/* -------- Right: Inspector (desktop) -------- */}
          {showPanels && (
            <aside
              className="hidden w-[340px] shrink-0 flex-col border-l border-line bg-surface-1/40 lg:flex"
              aria-label="Inspector panel"
            >
              <nav className="flex shrink-0 flex-wrap gap-1 border-b border-line px-3 py-2" aria-label="Inspector tabs">
                {INSPECTOR_TABS.map((t) => (
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
                {tab === "design" && <DesignPanel />}
                {tab === "content" && <ContentPanel />}
                {tab === "brand" && <BrandPanel />}
                {tab === "features" && <FeaturesPanel />}
                {tab === "seo" && <SeoPanel />}
                {tab === "deploy" && <DeploymentPanel />}
              </div>
            </aside>
          )}

          {/* -------- Right: Inspector (mobile overlay) -------- */}
          {showPanels && mobileView === "edit" && (
            <>
              <button
                className="btn-primary fixed bottom-4 right-4 z-40 h-11 px-4 shadow-pop lg:hidden"
                onClick={() => setInspectorOpen(true)}
                aria-label="Open inspector"
              >
                <SlidersHorizontal className="h-4 w-4" /> Inspector
              </button>
              {inspectorOpen && (
                <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Inspector">
                  <div className="absolute inset-0 animate-fade-in bg-black/60" onClick={() => setInspectorOpen(false)} />
                  <div className="absolute inset-y-0 right-0 flex w-[88%] max-w-sm animate-fade-up flex-col border-l border-line bg-surface-1 shadow-pop">
                    <div className="flex shrink-0 items-center gap-2 border-b border-line px-3 py-2.5">
                      <nav className="flex flex-1 flex-wrap gap-1" aria-label="Inspector tabs">
                        {INSPECTOR_TABS.map((t) => (
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
                      <button className="btn-icon-sm" onClick={() => setInspectorOpen(false)} aria-label="Close inspector">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto p-3.5">
                      {tab === "design" && <DesignPanel />}
                      {tab === "content" && <ContentPanel />}
                      {tab === "brand" && <BrandPanel />}
                      {tab === "features" && <FeaturesPanel />}
                      {tab === "seo" && <SeoPanel />}
                      {tab === "deploy" && <DeploymentPanel />}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <AddSectionModal open={addSectionOpen} onClose={() => setAddSectionOpen(false)} />
        <ExportModal open={exportOpen} onClose={() => setExportOpen(false)} onOpenDeployment={() => { setTab("deploy"); setExportOpen(false); }} />
      </div>
    </EditorUIContext.Provider>
    </DeployProvider>
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
        <span className="h-1.5 w-1.5 rounded-full bg-katch" aria-label="Unsaved changes" />
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
