import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { useEditor } from "../editorStore";
import { useEditorUI } from "../editorUI";
import { useToast } from "@/app/toast";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/ui";
import { SectionIcon } from "@/components/SectionIcon";
import { SECTION_DEFINITIONS } from "@/features/sections/registry";
import { SECTION_GROUPS } from "@/types";
import type { SectionInstance, SectionType } from "@/types";
import { deepMerge, uid } from "@/utils/helpers";

/* ============================================================
   Add Section — a visual library of every reusable section,
   grouped by category, with variant badges and search.
   ============================================================ */

export default function AddSectionModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { project, update } = useEditor();
  const { activePageId, setSelectedSectionId } = useEditorUI();
  const { toast } = useToast();
  const [search, setSearch] = useState("");

  const page = project.config.pages.find((p) => p.id === activePageId);

  const addSection = (type: SectionType) => {
    const def = SECTION_DEFINITIONS[type];
    const defaults = def.defaults(project.config.brand) as unknown as Record<string, unknown>;
    const instance: SectionInstance = {
      id: uid(),
      type,
      hidden: false,
      content: deepMerge(defaults, {}),
    };
    update((p) => {
      p.config.sections.push(instance);
      const pg = p.config.pages.find((x) => x.id === activePageId);
      if (pg) pg.sections.push(instance.id);
    });
    setSelectedSectionId(instance.id);
    onClose();
    toast("success", `“${def.name}” added to ${page?.name ?? "the page"}.`);
  };

  const q = search.trim().toLowerCase();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add a section"
      description="Every section is reusable, theme-aware and starts from smart defaults."
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
      <div className="max-h-[52vh] space-y-5 overflow-y-auto pr-1">
        {SECTION_GROUPS.map((group) => {
          const types = (Object.keys(SECTION_DEFINITIONS) as SectionType[]).filter(
            (t) => SECTION_DEFINITIONS[t].group === group.id
          );
          if (types.length === 0) return null;
          const filtered = types.filter((t) => {
            if (!q) return true;
            const def = SECTION_DEFINITIONS[t];
            return (
              def.name.toLowerCase().includes(q) ||
              def.description.toLowerCase().includes(q) ||
              (def.variants ?? []).some((v) => v.name.toLowerCase().includes(q))
            );
          });
          if (filtered.length === 0) return null;
          return (
            <div key={group.id}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-faint">{group.label}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {filtered.map((t) => {
                  const def = SECTION_DEFINITIONS[t];
                  return (
                    <button
                      key={t}
                      onClick={() => addSection(t)}
                      className="group flex items-start gap-3 rounded-lg border border-line bg-surface-1 p-3 text-left transition-all hover:border-line-strong hover:bg-surface-2"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-surface-2 text-ink-muted group-hover:bg-brand-muted group-hover:text-brand-hover">
                        <SectionIcon type={t} className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13.5px] font-medium text-ink">{def.name}</span>
                        <span className="mt-0.5 block text-[11.5px] leading-4 text-ink-faint">{def.description}</span>
                        {(def.variants ?? []).length > 0 && (
                          <span className="mt-1.5 flex flex-wrap gap-1">
                            {def.variants!.slice(0, 3).map((v) => (
                              <Badge key={v.id} tone="neutral">
                                {v.name}
                              </Badge>
                            ))}
                            {def.variants!.length > 3 && (
                              <Badge tone="neutral">+{def.variants!.length - 3}</Badge>
                            )}
                          </span>
                        )}
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
            No sections match “{search}”.
          </p>
        )}
      </div>
    </Modal>
  );
}
