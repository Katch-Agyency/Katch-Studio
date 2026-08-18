import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpDown, Copy, FolderKanban, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useStore } from "@/app/store";
import { useToast } from "@/app/toast";
import { Button } from "@/components/ui/ui";
import { ConfirmDialog } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/EmptyState";
import { WEBSITE_CATEGORIES } from "@/data/features";
import { PROJECT_STATUSES } from "@/types";
import { STATUS_META } from "@/data/status";
import { getTemplate } from "@/data/templates";
import { timeLabel } from "@/utils/helpers";

/* ============================================================
   Projects — the production queue: search, filter, sort,
   duplicate, delete, open.
   ============================================================ */

type SortKey = "updated" | "name" | "status";

export default function Projects() {
  const { projects, duplicateProject, deleteProject, hydrated } = useStore();
  const { toast } = useToast();

  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("updated");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...projects]
      .filter((p) => {
        const info = p.config.projectInfo;
        if (typeFilter !== "all" && info.category !== typeFilter) return false;
        if (statusFilter !== "all" && p.status !== statusFilter) return false;
        if (!q) return true;
        return (
          info.name.toLowerCase().includes(q) ||
          info.client.toLowerCase().includes(q) ||
          p.config.brand.businessName.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (sortKey === "name")
          return (a.config.projectInfo.name || "").localeCompare(b.config.projectInfo.name || "");
        if (sortKey === "status")
          return PROJECT_STATUSES.indexOf(a.status) - PROJECT_STATUSES.indexOf(b.status);
        return b.updatedAt.localeCompare(a.updatedAt);
      });
  }, [projects, query, typeFilter, statusFilter, sortKey]);

  const onDuplicate = (id: string) => {
    const copy = duplicateProject(id);
    if (copy) toast("success", `Duplicated “${copy.config.projectInfo.name}”.`);
  };

  const deleteTarget = projects.find((p) => p.id === deleteId);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="animate-fade-up">
          <h1 className="text-2xl font-bold tracking-tight text-ink">Projects</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {projects.length} project{projects.length === 1 ? "" : "s"} in the workspace
          </p>
        </div>
        <Link to="/projects/new">
          <Button variant="primary" className="w-full sm:w-auto">
            <Plus className="h-4 w-4" /> New Project
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1 md:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden />
          <input
            className="input pl-9"
            placeholder="Search projects or clients…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search projects"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="input w-auto min-w-[140px]"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            aria-label="Filter by website type"
          >
            <option value="all">All types</option>
            {WEBSITE_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          <select
            className="input w-auto min-w-[140px]"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by status"
          >
            <option value="all">All statuses</option>
            {PROJECT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_META[s].label}
              </option>
            ))}
          </select>
          <div className="relative">
            <ArrowUpDown className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint" aria-hidden />
            <select
              className="input w-auto min-w-[160px] pl-8"
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              aria-label="Sort projects"
            >
              <option value="updated">Last updated</option>
              <option value="name">Name</option>
              <option value="status">Status</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card mt-4 overflow-hidden">
        {!hydrated ? (
          <div className="divide-y divide-line">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3.5">
                <div className="skeleton h-8 w-8 rounded-lg" />
                <div className="flex-1">
                  <div className="skeleton h-3.5 w-44" />
                  <div className="skeleton mt-2 h-2.5 w-28" />
                </div>
                <div className="skeleton h-4 w-16" />
                <div className="skeleton h-5 w-24 rounded-full" />
                <div className="skeleton h-3 w-14" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-brand-ring bg-brand-muted text-brand-hover">
              <FolderKanban className="h-5 w-5" aria-hidden />
            </span>
            <h3 className="text-[15px] font-semibold text-ink">
              {projects.length === 0 ? "No projects yet." : "No projects match your filters."}
            </h3>
            <p className="mt-1 max-w-sm text-[13px] text-ink-muted">
              {projects.length === 0
                ? "Create your first Katch website project."
                : "Try a different search term or clear the filters."}
            </p>
            {projects.length === 0 && (
              <Link to="/projects/new">
                <Button variant="primary" className="mt-4">
                  <Plus className="h-4 w-4" /> New Project
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse">
              <thead className="table-head">
                <tr>
                  <th className="th">Project</th>
                  <th className="th">Client</th>
                  <th className="th">Type</th>
                  <th className="th">Template</th>
                  <th className="th">Status</th>
                  <th className="th">Updated</th>
                  <th className="th w-[90px] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map((p) => {
                  const tpl = getTemplate(p.createdFrom);
                  const cat = WEBSITE_CATEGORIES.find((c) => c.id === p.config.projectInfo.category);
                  return (
                    <tr key={p.id} className="group transition-colors hover:bg-surface-2/60">
                      <td className="td">
                        <Link
                          to={`/editor/${p.id}`}
                          className="flex items-center gap-2.5 font-medium text-ink transition-colors hover:text-brand-hover"
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-surface-2 text-[11px] font-bold text-ink-muted">
                            {(p.config.projectInfo.name || "?").slice(0, 2).toUpperCase()}
                          </span>
                          <span className="min-w-0 truncate">
                            {p.config.projectInfo.name || "Untitled Project"}
                          </span>
                        </Link>
                      </td>
                      <td className="td text-ink-muted">{p.config.projectInfo.client || "—"}</td>
                      <td className="td">
                        <span className="inline-flex items-center rounded-md border border-line-strong bg-surface-2 px-2 py-0.5 text-[11.5px] font-medium text-ink-muted">
                          {cat?.label ?? "—"}
                        </span>
                      </td>
                      <td className="td text-ink-muted">{tpl?.name ?? "Custom"}</td>
                      <td className="td">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="td whitespace-nowrap text-ink-muted">{timeLabel(p.updatedAt)}</td>
                      <td className="td">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            to={`/editor/${p.id}`}
                            className="btn-icon-sm"
                            aria-label={`Open ${p.config.projectInfo.name}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Link>
                          <button
                            className="btn-icon-sm"
                            onClick={() => onDuplicate(p.id)}
                            aria-label={`Duplicate ${p.config.projectInfo.name}`}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          <button
                            className="btn-icon-sm text-danger hover:bg-danger-muted"
                            onClick={() => setDeleteId(p.id)}
                            aria-label={`Delete ${p.config.projectInfo.name}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (!deleteId) return;
          deleteProject(deleteId);
          toast("success", "Project deleted.");
        }}
        title="Delete project"
        message={
          <>
            This will permanently delete{" "}
            <strong className="text-ink">{deleteTarget?.config.projectInfo.name}</strong> and its
            configuration. This action cannot be undone.
          </>
        }
        confirmLabel="Delete Project"
      />
    </div>
  );
}
