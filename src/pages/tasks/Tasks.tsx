import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ListTodo, ShieldCheck } from "lucide-react";
import { useStore } from "@/app/store";
import { Avatar, Badge, Button } from "@/components/ui/ui";
import { EmptyState } from "@/components/ui/EmptyState";
import { activeLeadCount, totalLeadCount } from "@/lib/crm";
import { LEAD_STATUS_META } from "@/data/status";
import type { Lead, Profile } from "@/types";
import { cn } from "@/utils/helpers";

/* ============================================================
   Your Tasks — every ACTIVE employee appears automatically,
   with their active-lead count:

     Ahmed (3) · Mohamed (5) · Ali (0)

   Reactivated employees reappear instantly. Deactivated
   teammates keep their history visible below.
   ============================================================ */

export default function Tasks() {
  const { profiles, leads, currentProfileId, isAdmin } = useStore();
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  /** Active employees only — this is the Your Tasks roster. */
  const roster = useMemo(() => {
    const active = profiles.filter((p) => p.status === "active");
    return [...active].sort((a, b) => {
      if (a.id === currentProfileId) return -1;
      if (b.id === currentProfileId) return 1;
      return a.createdAt.localeCompare(b.createdAt);
    });
  }, [profiles, currentProfileId]);

  /** Deactivated teammates that still hold leads — history stays visible. */
  const inactiveHolders = useMemo(
    () =>
      profiles
        .filter((p) => p.status !== "active" && leads.some((l) => l.assignedTo === p.id))
        .map((p) => ({ profile: p, leads: leads.filter((l) => l.assignedTo === p.id) })),
    [profiles, leads]
  );

  const selected = selectedId ? roster.find((p) => p.id === selectedId) ?? null : null;
  const selectedLeads = selected
    ? leads.filter((l) => l.assignedTo === selected.id && isActiveLeadStatus(l))
    : [];

  if (roster.length === 0) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8">
        <h1 className="text-2xl font-bold tracking-tight text-ink">Your Tasks</h1>
        <div className="card mt-6">
          <EmptyState
            icon={<ListTodo className="h-6 w-6" />}
            title="No active employees"
            description="Every employee is currently deactivated. Activate a teammate to see their tasks here."
            action={isAdmin ? { label: "Open Team", onClick: () => navigate("/team") } : undefined}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8">
      <div className="animate-fade-up">
        <h1 className="text-2xl font-bold tracking-tight text-ink">Your Tasks</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Active leads per active employee — updated instantly when leads are assigned or employees change.
        </p>
      </div>

      {/* Roster cards — Name (active leads) */}
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {roster.map((p) => {
          const active = activeLeadCount(leads, p.id);
          const total = totalLeadCount(leads, p.id);
          const isYou = p.id === currentProfileId;
          const isSelected = selectedId === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelectedId(isSelected ? null : p.id)}
              aria-pressed={isSelected}
              className={cn(
                "card card-hover flex items-center gap-3 p-4 text-left",
                isSelected && "border-brand-ring bg-brand-muted/30"
              )}
            >
              <Avatar name={p.name} size={38} />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-1.5">
                  <span className="truncate text-[14px] font-semibold text-ink">
                    {p.name} ({active})
                  </span>
                  {isYou && <Badge tone="brand">You</Badge>}
                </span>
                <span className="mt-0.5 block truncate text-[11.5px] text-ink-faint">
                  {p.role} · {active} active · {total} total
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Selected employee's active leads */}
      {selected && <TaskPanel profile={selected} leads={selectedLeads} />}

      {/* Historical assignments of deactivated teammates */}
      {inactiveHolders.length > 0 && (
        <section className="mt-8">
          <h2 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wider text-ink-faint">
            <ShieldCheck className="h-4 w-4" aria-hidden />
            Kept history — deactivated teammates
          </h2>
          <div className="mt-3 space-y-3">
            {inactiveHolders.map(({ profile, leads: held }) => (
              <div key={profile.id} className="card p-4 opacity-80">
                <div className="flex flex-wrap items-center gap-2">
                  <Avatar name={profile.name} size={26} />
                  <p className="text-[13px] font-medium text-ink">{profile.name}</p>
                  <Badge tone="neutral">inactive</Badge>
                  <span className="text-[11.5px] text-ink-faint">
                    still holds {held.length} lead{held.length === 1 ? "" : "s"} — nothing was deleted
                  </span>
                  {isAdmin && (
                    <Link to="/leads" className="ml-auto">
                      <Button variant="ghost" size="sm">
                        Reassign in Leads
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function TaskPanel({ profile, leads }: { profile: Profile; leads: Lead[] }) {
  return (
    <section className="card mt-6 overflow-hidden animate-fade-up" aria-label={`Tasks of ${profile.name}`}>
      <div className="flex items-center gap-3 border-b border-line px-4 py-3">
        <Avatar name={profile.name} size={28} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold text-ink">{profile.name}</p>
          <p className="text-[11.5px] text-ink-faint">
            {leads.length} active lead{leads.length === 1 ? "" : "s"}
          </p>
        </div>
        <Link to="/leads">
          <Button variant="ghost" size="sm">
            Open Leads
          </Button>
        </Link>
      </div>
      {leads.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-ink-faint">
          No active leads right now — new assignments will appear here.
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {leads.map((lead) => {
            const meta = LEAD_STATUS_META[lead.status];
            return (
              <li key={lead.id} className="flex items-center gap-3 px-4 py-3">
                <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", meta.dot)} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-medium text-ink">{lead.name}</span>
                  <span className="block truncate text-[11.5px] text-ink-faint">
                    {lead.company || "—"}
                    {lead.company && ` · ${lead.source}`}
                  </span>
                </span>
                <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium", meta.chip)}>
                  {meta.label}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function isActiveLeadStatus(lead: Lead): boolean {
  return (["new", "contacted", "qualified"] as string[]).includes(lead.status);
}
