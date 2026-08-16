import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CircleCheck,
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
import { LogoFull } from "@/components/layout/Logo";
import { TEMPLATES } from "@/data/templates";
import { getCategory } from "@/data/features";
import { timeLabel } from "@/utils/helpers";

/* ============================================================
   Dashboard — built around the agency workflow:
   the most important action (+ New Project) is unmissable,
   stats are limited to what drives production, and the rest
   is recent work + shortcuts.
   ============================================================ */

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function Dashboard() {
  const { projects, duplicateProject, hydrated } = useStore();
  const navigate = useNavigate();
  const { toast } = useToast();

  const stats = useMemo(() => {
    const inProgress = projects.filter((p) => p.status === "in_progress").length;
    const ready = projects.filter((p) => ["ready", "review"].includes(p.status)).length;
    return [
      { label: "Total Projects", value: projects.length, icon: FolderKanban },
      { label: "In Progress", value: inProgress, icon: Sparkles },
      { label: "Ready", value: ready, icon: CircleCheck },
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
      {/* ---------- Hero ---------- */}
      <section className="animate-fade-up">
        <div className="card relative overflow-hidden p-6 md:p-8">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(600px 260px at 85% -40%, rgba(215,255,79,0.08), transparent 70%)",
            }}
          />
          <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <LogoFull size={56} className="hidden sm:inline-flex" />
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-ink md:text-[28px]">
                  {greeting()}, Katch.
                </h1>
                <p className="mt-1.5 max-w-lg text-[14.5px] leading-relaxed text-ink-muted">
                  Create your next website. Start from a template, customize, preview and ship — all
                  from one place.
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2.5">
              <Link to="/projects/new">
                <Button variant="primary" size="lg" className="px-6">
                  <Plus className="h-4 w-4" /> New Project
                </Button>
              </Link>
              <Link to="/templates">
                <Button variant="secondary" size="lg">
                  Browse Templates
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Stats ---------- */}
      <section className="mt-5 grid grid-cols-3 gap-3" aria-label="Workspace statistics">
        {stats.map((s, i) => (
          <div
            key={s.label}
            className="card card-hover animate-fade-up p-4"
            style={{ animationDelay: `${i * 45}ms` }}
          >
            {hydrated ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium text-ink-muted">{s.label}</span>
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-muted text-brand-hover">
                    <s.icon className="h-3.5 w-3.5" aria-hidden />
                  </span>
                </div>
                <p className="mt-2.5 font-display text-[26px] font-bold leading-none text-ink">
                  {s.value}
                </p>
              </>
            ) : (
              <>
                <div className="skeleton h-3 w-20" />
                <div className="skeleton mt-3 h-6 w-8" />
              </>
            )}
          </div>
        ))}
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* ---------- Recent projects ---------- */}
        <section aria-label="Recent projects">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-ink">Recent Projects</h2>
            <Link
              to="/projects"
              className="inline-flex items-center gap-1 text-[13px] font-medium text-brand-hover hover:underline"
            >
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="card overflow-hidden">
            {!hydrated ? (
              <div className="space-y-0 divide-y divide-line">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-4 px-4 py-3.5">
                    <div className="skeleton h-8 w-8 rounded-lg" />
                    <div className="flex-1">
                      <div className="skeleton h-3.5 w-40" />
                      <div className="skeleton mt-2 h-2.5 w-24" />
                    </div>
                    <div className="skeleton h-5 w-20 rounded-full" />
                  </div>
                ))}
              </div>
            ) : recent.length === 0 ? (
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
                    <th className="th w-[90px] text-right">Actions</th>
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

        {/* ---------- Quick actions ---------- */}
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
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-muted text-brand-hover">
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
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-muted text-brand-hover">
                <FolderKanban className="h-4 w-4" />
              </span>
              <span className="flex-1">
                <span className="block text-[13.5px] font-semibold text-ink">All Projects</span>
                <span className="block text-xs text-ink-faint">Manage the production queue</span>
              </span>
              <ArrowRight className="h-4 w-4 text-ink-faint" />
            </button>
          </div>

          <div className="mt-4 rounded-xl border border-line bg-surface-1 p-4">
            <p className="text-[13px] font-semibold text-ink">Pro tip</p>
            <p className="mt-1 text-xs leading-relaxed text-ink-muted">
              Press{" "}
              <span className="rounded border border-line-strong bg-surface-2 px-1 font-mono text-[10.5px]">
                ⌘K
              </span>{" "}
              anywhere to jump to projects, duplicate a site or save — no mouse needed.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
