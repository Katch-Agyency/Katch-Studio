import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  MousePointerClick,
  Plus,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { useEditor } from "../editorStore";
import { useEditorUI } from "../editorUI";
import { useToast } from "@/app/toast";
import { Button } from "@/components/ui/ui";
import { ConfirmDialog } from "@/components/ui/Modal";
import { SectionIcon } from "@/components/SectionIcon";
import { SECTION_DEFINITIONS } from "@/features/sections/registry";
import type { SectionInstance } from "@/types";
import { cn, uid } from "@/utils/helpers";

/* ============================================================
   Layers panel — hierarchical website structure.
   Page → Sections → Content elements. Clicking a section or
   element selects it (element clicks also focus the matching
   content editor field).
   ============================================================ */

export default function LayersPanel({ onAddSection }: { onAddSection: () => void }) {
  const { project, update } = useEditor();
  const {
    activePageId,
    selectedSectionId,
    setSelectedSectionId,
    setFocusedElement,
  } = useEditorUI();
  const { toast } = useToast();

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const page = project.config.pages.find((p) => p.id === activePageId);
  const instances = (page?.sections ?? [])
    .map((id) => project.config.sections.find((s) => s.id === id))
    .filter((s): s is SectionInstance => Boolean(s));

  const move = (index: number, dir: -1 | 1) => {
    update((p) => {
      const pg = p.config.pages.find((x) => x.id === activePageId);
      if (!pg) return;
      const target = index + dir;
      if (target < 0 || target >= pg.sections.length) return;
      [pg.sections[index], pg.sections[target]] = [pg.sections[target]!, pg.sections[index]!];
    });
  };

  const toggleHidden = (id: string) => {
    update((p) => {
      const s = p.config.sections.find((x) => x.id === id);
      if (s) s.hidden = !s.hidden;
    });
  };

  const duplicateSection = (id: string) => {
    update((p) => {
      const src = p.config.sections.find((x) => x.id === id);
      const pg = p.config.pages.find((x) => x.id === activePageId);
      if (!src || !pg) return;
      const copy = structuredClone(src);
      copy.id = uid();
      p.config.sections.push(copy);
      const idx = pg.sections.indexOf(id);
      pg.sections.splice(idx + 1, 0, copy.id);
    });
    toast("success", "Section duplicated.");
  };

  const deleteSection = (id: string) => {
    update((p) => {
      const pg = p.config.pages.find((x) => x.id === activePageId);
      if (pg) pg.sections = pg.sections.filter((sid) => sid !== id);
      p.config.sections = p.config.sections.filter(
        (s) => s.id !== id || p.config.pages.some((x) => x.sections.includes(s.id))
      );
    });
    if (selectedSectionId === id) setSelectedSectionId(null);
    toast("success", "Section removed from this page.");
  };

  if (instances.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-lg border border-dashed border-line-strong px-4 py-10 text-center">
        <MousePointerClick className="mb-3 h-6 w-6 text-ink-faint" aria-hidden />
        <p className="text-[13.5px] font-medium text-ink">This page has no sections yet.</p>
        <p className="mt-1 text-xs text-ink-faint">Add your first section from the library.</p>
        <Button variant="primary" size="sm" className="mt-4" onClick={onAddSection}>
          <Plus className="h-3.5 w-3.5" /> Add Section
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {instances.map((s, i) => {
        const def = SECTION_DEFINITIONS[s.type];
        const isSelected = s.id === selectedSectionId;
        const isCollapsed = collapsed[s.id];
        const elements = def.elements ?? [];
        return (
          <div key={s.id}>
            <div
              className={cn(
                "group rounded-lg border transition-colors",
                isSelected ? "border-brand-ring bg-brand-muted/60" : "border-line bg-surface-1 hover:border-line-strong",
                s.hidden && "opacity-55"
              )}
            >
              <div className="flex items-center gap-1.5 px-2 py-1.5">
                <button
                  className="btn-icon-sm shrink-0"
                  onClick={() => setCollapsed((c) => ({ ...c, [s.id]: !c[s.id] }))}
                  aria-label={isCollapsed ? `Expand ${def.name}` : `Collapse ${def.name}`}
                  aria-expanded={!isCollapsed}
                >
                  {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>
                <button
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  onClick={() => setSelectedSectionId(isSelected ? null : s.id)}
                  aria-pressed={isSelected}
                >
                  <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded", isSelected ? "bg-brand-muted text-brand-hover" : "bg-surface-2 text-ink-muted")}>
                    <SectionIcon type={s.type} className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-ink">{def.name}</span>
                    {s.hidden && <span className="block text-[10.5px] text-ink-faint">Hidden</span>}
                  </span>
                </button>

                {/* Quick actions */}
                <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <button className="btn-icon-sm" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move ${def.name} up`}>
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button className="btn-icon-sm" disabled={i === instances.length - 1} onClick={() => move(i, 1)} aria-label={`Move ${def.name} down`}>
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  <button className="btn-icon-sm" onClick={() => toggleHidden(s.id)} aria-label={s.hidden ? `Show ${def.name}` : `Hide ${def.name}`}>
                    {s.hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                  <button className="btn-icon-sm" onClick={() => duplicateSection(s.id)} aria-label={`Duplicate ${def.name}`}>
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <button
                    className="btn-icon-sm text-danger hover:bg-danger-muted"
                    onClick={() => setDeleteId(s.id)}
                    aria-label={`Remove ${def.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Elements */}
            {isSelected && !isCollapsed && elements.length > 0 && (
              <ul className="ml-5 mt-0.5 space-y-0.5 border-s-2 border-line pb-1 ps-2" aria-label={`${def.name} elements`}>
                {elements.map((el) => (
                  <li key={el.id}>
                    <button
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-[12px] text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
                      onClick={() => {
                        setSelectedSectionId(s.id);
                        setFocusedElement(el.anchor);
                      }}
                    >
                      <span className="h-1 w-1 rounded-full bg-ink-faint" aria-hidden />
                      {el.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}

      <Button variant="secondary" size="sm" className="w-full" onClick={onAddSection}>
        <Plus className="h-3.5 w-3.5" /> Add Section
      </Button>

      <ConfirmDialog
        open={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteSection(deleteId)}
        title="Remove section"
        message="The section will be removed from this page. Other pages keep it if they use it."
        confirmLabel="Remove Section"
      />
    </div>
  );
}
