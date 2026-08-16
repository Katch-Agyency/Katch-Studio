import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  FileText,
  Home,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useEditor } from "../editorStore";
import { useEditorUI } from "../editorUI";
import { useToast } from "@/app/toast";
import { Button } from "@/components/ui/ui";
import { ConfirmDialog } from "@/components/ui/Modal";
import { TextInput } from "@/components/ui/Fields";
import { slugify, uid, cn } from "@/utils/helpers";

/* ============================================================
   Pages panel — add / rename / reorder / delete pages,
   configure sections per page.
   ============================================================ */

export default function PagesPanel() {
  const { project, update } = useEditor();
  const { activePageId, setActivePageId, setSelectedSectionId } = useEditorUI();
  const { toast } = useToast();

  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const pages = project.config.pages;

  const addPage = () => {
    const name = newName.trim() || `Page ${pages.length + 1}`;
    const id = uid();
    update((p) => {
      p.config.pages.push({
        id,
        name,
        path: `/${slugify(name) || `page-${p.config.pages.length + 1}`}`,
        sections: [],
        seo: { title: "", description: "", keywords: "", ogImage: "", index: true },
      });
    });
    setActivePageId(id);
    setNewName("");
    setAdding(false);
    toast("success", `Page “${name}” added.`);
  };

  const renamePage = (id: string) => {
    const name = renameValue.trim();
    if (!name) return;
    update((p) => {
      const page = p.config.pages.find((pg) => pg.id === id);
      if (page) page.name = name;
    });
    setRenamingId(null);
  };

  const movePage = (index: number, dir: -1 | 1) => {
    update((p) => {
      const pages = p.config.pages;
      const target = index + dir;
      if (target < 0 || target >= pages.length) return;
      [pages[index], pages[target]] = [pages[target]!, pages[index]!];
    });
  };

  const deletePage = (id: string) => {
    if (pages.length <= 1) {
      toast("error", "A project needs at least one page.");
      return;
    }
    update((p) => {
      const page = p.config.pages.find((pg) => pg.id === id);
      if (!page) return;
      p.config.pages = p.config.pages.filter((pg) => pg.id !== id);
      p.config.sections = p.config.sections.filter(
        (s) => !page.sections.includes(s.id) || p.config.pages.some((pg) => pg.sections.includes(s.id))
      );
    });
    setActivePageId(project.config.pages.find((pg) => pg.id !== id)?.id ?? "");
    toast("success", "Page deleted.");
  };

  return (
    <div className="space-y-1.5">
      {pages.map((page, i) => {
        const isActive = page.id === activePageId;
        const isHome = i === 0;
        return (
          <div
            key={page.id}
            className={cn(
              "group rounded-lg border transition-colors",
              isActive ? "border-brand-ring bg-brand-muted" : "border-line bg-surface-1 hover:border-line-strong"
            )}
          >
            <div className="flex items-center gap-2 px-3 py-2.5">
              <button
                className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                onClick={() => {
                  setActivePageId(page.id);
                  setSelectedSectionId(null);
                }}
                aria-pressed={isActive}
              >
                {isHome ? (
                  <Home className="h-3.5 w-3.5 shrink-0 text-brand-hover" aria-label="Home page" />
                ) : (
                  <FileText className="h-3.5 w-3.5 shrink-0 text-ink-faint" aria-hidden />
                )}
                {renamingId === page.id ? (
                  <span className="flex flex-1 items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <TextInput
                      className="h-7 flex-1 text-[13px]"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") renamePage(page.id);
                        if (e.key === "Escape") setRenamingId(null);
                      }}
                      autoFocus
                    />
                    <button className="btn-icon-sm" onClick={() => renamePage(page.id)} aria-label="Confirm rename">
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button className="btn-icon-sm" onClick={() => setRenamingId(null)} aria-label="Cancel rename">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ) : (
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-medium text-ink">{page.name}</span>
                    <span className="block truncate font-mono text-[11px] text-ink-faint">{page.path}</span>
                  </span>
                )}
              </button>

              <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                <button className="btn-icon-sm" disabled={i === 0} onClick={() => movePage(i, -1)} aria-label={`Move ${page.name} up`}>
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button className="btn-icon-sm" disabled={i === pages.length - 1} onClick={() => movePage(i, 1)} aria-label={`Move ${page.name} down`}>
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
                <button
                  className="btn-icon-sm"
                  onClick={() => {
                    setRenamingId(page.id);
                    setRenameValue(page.name);
                  }}
                  aria-label={`Rename ${page.name}`}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  className="btn-icon-sm text-danger hover:bg-danger-muted"
                  onClick={() => setDeleteId(page.id)}
                  aria-label={`Delete ${page.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            {isActive && page.sections.length === 0 && (
              <p className="border-t border-line px-3 py-2 text-[11.5px] text-ink-faint">
                No sections yet — switch to the Sections tab and add some.
              </p>
            )}
          </div>
        );
      })}

      {adding ? (
        <div className="rounded-lg border border-brand-ring bg-surface-1 p-2.5">
          <div className="flex items-center gap-1.5">
            <TextInput
              className="h-8 flex-1 text-[13px]"
              placeholder="Page name, e.g. About"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addPage()}
              autoFocus
            />
            <Button variant="primary" size="sm" onClick={addPage}>
              <Plus className="h-3.5 w-3.5" /> Add
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="secondary" size="sm" className="w-full" onClick={() => setAdding(true)}>
          <Plus className="h-3.5 w-3.5" /> Add Page
        </Button>
      )}

      <ConfirmDialog
        open={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deletePage(deleteId)}
        title="Delete page"
        message="The page and its section references will be removed. This cannot be undone."
        confirmLabel="Delete Page"
      />
    </div>
  );
}
