import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Eye,
  EyeOff,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useEditor } from "../editorStore";
import { useEditorUI } from "../editorUI";
import { useToast } from "@/app/toast";
import { Button, Badge } from "@/components/ui/ui";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { SECTION_DEFINITIONS } from "@/features/sections/registry";
import { SECTION_GROUPS } from "@/types";
import { SectionIcon } from "@/components/SectionIcon";
import type { SectionInstance, SectionType } from "@/types";
import { deepMerge, uid, cn } from "@/utils/helpers";

/* ============================================================
   Sections panel — reorder, duplicate, hide, delete, add
   sections for the active page.
   ============================================================ */


export default function SectionsPanel() {
  const { project, update } = useEditor();
  const { activePageId, selectedSectionId, setSelectedSectionId } = useEditorUI();
  const { toast } = useToast();

  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const page = project.config.pages.find((p) => p.id === activePageId);
  const instances = (page?.sections ?? [])
    .map((id) => project.config.sections.find((s) => s.id === id))
    .filter((s): s is NonNullable<typeof s> => Boolean(s));

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

  const addSection = (type: SectionType) => {
    update((p) => {
      const def = SECTION_DEFINITIONS[type];
      const defaults = def.defaults(p.config.brand) as unknown as Record<string, unknown>;
      const instance: SectionInstance = {
        id: uid(),
        type,
        hidden: false,
        content: deepMerge(defaults, {}),
      };
      p.config.sections.push(instance);
      const pg = p.config.pages.find((x) => x.id === activePageId);
      if (pg) pg.sections.push(instance.id);
    });
    setAdding(false);
    toast("success", `“${SECTION_DEFINITIONS[type].name}” added to ${page?.name ?? "page"}.`);
  };

  const q = search.trim().toLowerCase();

  return (
    <div className="space-y-1.5">
      {instances.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line-strong px-4 py-10 text-center">
          <p className="text-[13.5px] font-medium text-ink">This page has no sections yet.</p>
          <p className="mt-1 text-xs text-ink-faint">Add sections from the library below.</p>
          <Button variant="primary" size="sm" className="mt-4" onClick={() => setAdding(true)}>
            <Plus className="h-3.5 w-3.5" /> Add Section
          </Button>
        </div>
      ) : (
        instances.map((s, i) => {
          const def = SECTION_DEFINITIONS[s.type];
          const isSelected = s.id === selectedSectionId;
          return (
            <div
              key={s.id}
              className={cn(
                "group rounded-lg border transition-colors",
                isSelected ? "border-brand-ring bg-brand-muted" : "border-line bg-surface-1 hover:border-line-strong",
                s.hidden && "opacity-55"
              )}
            >
              <div className="flex items-center gap-2 px-3 py-2.5">
                <button
                  className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                  onClick={() => setSelectedSectionId(isSelected ? null : s.id)}
                  aria-pressed={isSelected}
                >
                  <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-md", isSelected ? "bg-brand-muted text-brand-hover" : "bg-surface-2 text-ink-muted")}>
                    <SectionGlyph type={s.type} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-medium text-ink">{def.name}</span>
                    {s.hidden && <span className="block text-[11px] text-ink-faint">Hidden in preview</span>}
                  </span>
                </button>

                <div className="flex items-center gap-0.5">
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
                  <button className="btn-icon-sm text-danger hover:bg-danger-muted" onClick={() => setDeleteId(s.id)} aria-label={`Remove ${def.name}`}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })
      )}

      <Button variant="secondary" size="sm" className="w-full" onClick={() => setAdding(true)}>
        <Plus className="h-3.5 w-3.5" /> Add Section
      </Button>

      {/* Add section modal */}
      <Modal
        open={adding}
        onClose={() => setAdding(false)}
        title="Add a section"
        description="Every section is reusable and theme-aware — content starts from smart defaults."
        size="lg"
      >
        <div className="relative mb-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden />
          <input
            className="input pl-9"
            placeholder="Search sections…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search sections"
          />
        </div>
        <div className="max-h-[50vh] space-y-5 overflow-y-auto pr-1">
          {SECTION_GROUPS.map((group) => {
            const types = (Object.keys(SECTION_DEFINITIONS) as SectionType[]).filter(
              (t) => SECTION_DEFINITIONS[t].group === group.id
            );
            if (types.length === 0) return null;
            const filtered = types.filter((t) => {
              if (!q) return true;
              const def = SECTION_DEFINITIONS[t];
              return def.name.toLowerCase().includes(q) || def.description.toLowerCase().includes(q);
            });
            if (filtered.length === 0) return null;
            return (
              <div key={group.id}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-faint">{group.label}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {filtered.map((t) => {
                    const def = SECTION_DEFINITIONS[t];
                    const alreadyOnPage = instances.some((i) => i.type === t);
                    return (
                      <button
                        key={t}
                        onClick={() => addSection(t)}
                        className="flex items-start gap-3 rounded-lg border border-line bg-surface-1 p-3 text-left transition-all hover:border-line-strong hover:bg-surface-2"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-surface-2 text-ink-muted">
                          <SectionGlyph type={t} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2 text-[13.5px] font-medium text-ink">
                            {def.name}
                            {alreadyOnPage && <Badge tone="neutral">on page</Badge>}
                          </span>
                          <span className="mt-0.5 block text-[11.5px] leading-4 text-ink-faint">{def.description}</span>
                        </span>
                        <Plus className="mt-1 h-3.5 w-3.5 shrink-0 text-ink-faint" aria-hidden />
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {q && (
            <p className="pb-2 text-center text-xs text-ink-faint">
              {SECTION_GROUPS.every((g) =>
                (Object.keys(SECTION_DEFINITIONS) as SectionType[]).every(
                  (t) =>
                    SECTION_DEFINITIONS[t].group !== g.id ||
                    !SECTION_DEFINITIONS[t].name.toLowerCase().includes(q)
                )
              )
                ? "No sections match your search."
                : ""}
            </p>
          )}
        </div>
      </Modal>

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

/* ---------- Section type glyph ---------- */

function SectionGlyph({ type }: { type: SectionType }) {
  return <SectionIcon type={type} className="h-4 w-4" />;
}
