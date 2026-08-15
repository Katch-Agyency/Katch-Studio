import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Copy,
  FolderKanban,
  LayoutTemplate,
  Pencil,
  Plus,
  Sparkles,
} from "lucide-react";
import { useStore } from "@/app/store";
import { useToast } from "@/app/toast";
import { Button } from "@/components/ui/ui";
import { StatusBadge } from "@/components/ui/EmptyState";
import { TEMPLATES } from "@/data/templates";
import { getCategory } from "@/data/features";
import { timeLabel } from "@/utils/helpers";

/* ============================================================
   Dashboard — workspace overview with stats, recent projects
   and quick actions.
   ============================================================ */

export default function Dashboard() {
  const { projects, duplicateProject, hydrated } = useStore();
  const navigate = useNavigate();
  const { toast } = useToast();

  const stats = useMemo(() => {
    const active = projects.filter((p) => ["draft", "in_progress", "review"].includes(p.status)).length;
    const delivered = projects.filter((p) => p.status === "delivered").length;
    return [
      { label: "Total Projects", value: projects.length, icon: FolderKanban },
      { label: "Active Projects", value: active, icon: Sparkles },
      { label: "Templates", value: TEMPLATES.length, icon: LayoutTemplate },
      { label: "Completed", value: delivered, icon: CheckCircle2 },
    ];
  }, [projects]);

  const recent = useMemo(
    () => [...projects].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5),
    [projects]
  );

  const onDuplicate = (id: string) => {
    const copy = duplicateProject(id);
    if (copy) toast("success", `Duplicated “${copy.config.projectInfo.name}”.`);
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8">
      {/* Header */}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="animate-fade-up">
          <p className="text-[13px] font-medium text-brand-hover">Katch Studio</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink md:text-[28px]">
            Good morning, Katch Team
          </h1>
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-ink-muted">
            Build client websites faster — start from a template, customize, preview and ship.
          </p>
        </div>
        <Link to="/projects/new" className="animate-fade-up">
          <Button variant="primary" size="lg" className="w-full sm:w-auto">
            <Plus className="h-4 w-4" /> New Project
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <section className="mt-7 grid grid-cols-2 gap-3 md:grid-cols-4" aria-label="Workspace statistics">
        {stats.map((s, i) => (
          <div
            key={s.label}
            className="card card-hover animate-fade-up p-4"
            style={{ animationDelay: `${i * 45}ms` }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium text-ink-muted">{s.label}</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-muted text-brand-hover">
                <s.icon className="h-3.5 w-3.5" aria-hidden />
              </span>
            </div>
            <p className="mt-2.5 font-display text-2xl font-bold text-ink">
              {hydrated ? s.value : "—"}
            </p>
          </div>
        ))}
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* Recent projects */}
        <section aria-label="Recent projects">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-ink">Recent Projects</h2>
            <Link to="/projects" className="inline-flex items-center gap-1 text-[13px] font-medium text-brand-hover hover:underline">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="card overflow-hidden">
            {recent.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="text-sm text-ink-muted">No projects yet.</p>
                <p className="mt-1 text-[13px] text-ink-faint">Create your first Katch website project.</p>
                <Link to="/projects/new">
                  <Button variant="primary" className="mt-4">
                    <Plus className="h-4 w-4" /> New Project
                  </Button>
                </Link>
              </div>
            ) : (
              <table className="w-full border-collapse">
                <thead className="table-head">
                  <tr>
                    <th className="th">Project</th>
                    <th className="th hidden md:table-cell">Client</th>
                    <th className="th hidden sm:table-cell">Type</th>
                    <th className="th">Status</th>
                    <th className="th hidden sm:table-cell">Updated</th>
                    <th className="th w-[110px] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {recent.map((p) => {
                    const cat = getCategory(p.config.projectInfo.category);
                    return (
                      <tr key={p.id} className="group transition-colors hover:bg-surface-2/60">
                        <td className="td">
                          <Link
                            to={`/editor/${p.id}`}
                            className="block font-medium text-ink transition-colors hover:text-brand-hover"
                          >
                            {p.config.projectInfo.name || "Untitled Project"}
                          </Link>
                          <span className="text-xs text-ink-faint">{p.config.brand.businessName || "—"}</span>
                        </td>
                        <td className="td hidden text-ink-muted md:table-cell">
                          {p.config.projectInfo.client || "—"}
                        </td>
                        <td className="td hidden text-ink-muted sm:table-cell">{cat?.label ?? "—"}</td>
                        <td className="td">
                          <StatusBadge status={p.status} />
                        </td>
                        <td className="td hidden whitespace-nowrap text-ink-muted sm:table-cell">
                          {timeLabel(p.updatedAt)}
                        </td>
                        <td className="td">
                          <div className="flex items-center justify-end gap-1 opacity-60 transition-opacity group-hover:opacity-100">
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
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* Quick actions */}
        <aside aria-label="Quick actions">
          <h2 className="mb-3 text-[15px] font-semibold text-ink">Quick Actions</h2>
          <div className="space-y-2">
            <button
              onClick={() => navigate("/projects/new")}
              className="card card-hover flex w-full items-center gap-3 px-4 py-3.5 text-left"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-muted text-brand-hover">
                <Plus className="h-4 w-4" />
              </span>
              <span className="flex-1">
                <span className="block text-[13.5px] font-semibold text-ink">New Project</span>
                <span className="block text-xs text-ink-faint">Start a client website</span>
              </span>
              <ArrowRight className="h-4 w-4 text-ink-faint" />
            </button>
            <button
              onClick={() => navigate("/templates")}
              className="card card-hover flex w-full items-center gap-3 px-4 py-3.5 text-left"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-muted text-accent">
                <LayoutTemplate className="h-4 w-4" />
              </span>
              <span className="flex-1">
                <span className="block text-[13.5px] font-semibold text-ink">Browse Templates</span>
                <span className="block text-xs text-ink-faint">{TEMPLATES.length} production-ready starts</span>
              </span>
              <ArrowRight className="h-4 w-4 text-ink-faint" />
            </button>
            <button
              onClick={() => navigate("/projects")}
              className="card card-hover flex w-full items-center gap-3 px-4 py-3.5 text-left"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-info/10 text-info">
                <FolderKanban className="h-4 w-4" />
              </span>
              <span className="flex-1">
                <span className="block text-[13.5px] font-semibold text-ink">All Projects</span>
                <span className="block text-xs text-ink-faint">Manage the production queue</span>
              </span>
              <ArrowRight className="h-4 w-4 text-ink-faint" />
            </button>
          </div>

          {/* Tip */}
          <div className="mt-4 rounded-xl border border-line bg-surface-1 p-4">
            <p className="text-[13px] font-semibold text-ink">Pro tip</p>
            <p className="mt-1 text-xs leading-relaxed text-ink-muted">
              Duplicate a delivered project and you're 80% of the way to the next client site — swap the
              content, change the theme, done.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
