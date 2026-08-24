import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Mail, Pencil, Phone, Search, ShieldCheck, UserCheck, UserPlus, UserX, Users } from "lucide-react";
import { useStore } from "@/app/store";
import { useToast } from "@/app/toast";
import { Avatar, Badge, Button } from "@/components/ui/ui";
import { EmptyState } from "@/components/ui/EmptyState";
import { EmployeeFormModal } from "@/pages/team/EmployeeFormModal";
import { activeLeadCount, totalLeadCount } from "@/lib/crm";
import { EMPLOYEE_STATUS_META } from "@/data/status";
import type { EmployeeInput, Profile } from "@/types";
import { cn } from "@/utils/helpers";

/* ============================================================
   Team — Employee Management (Admin only).

   One table over the single `profiles` structure:
   Name · Role · Status · Active Leads · Total Leads · Actions.
   Employees are never deleted — only deactivated, which keeps
   every lead and all history intact.
   ============================================================ */

export default function Team() {
  const { profiles, leads, isAdmin, addEmployee, updateEmployee, setEmployeeStatus } = useStore();
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Profile | null>(null);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return profiles
      .filter((p) => !q || p.name.toLowerCase().includes(q) || p.role.toLowerCase().includes(q))
      .map((p) => ({
        profile: p,
        activeLeads: activeLeadCount(leads, p.id),
        totalLeads: totalLeadCount(leads, p.id),
      }));
  }, [profiles, leads, query]);

  const activeCount = profiles.filter((p) => p.status === "active").length;

  const openAdd = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (profile: Profile) => {
    setEditing(profile);
    setModalOpen(true);
  };

  const handleSubmit = (input: EmployeeInput) => {
    if (editing) {
      const result = updateEmployee(editing.id, input);
      if (result.ok) toast("success", `Updated “${result.profile?.name ?? input.name}”.`);
      else toast("error", result.error ?? "Could not update the employee.");
      return result;
    }
    const result = addEmployee(input);
    if (result.ok) toast("success", `${result.profile?.name} is now active — available in Lead Assignment and Your Tasks.`);
    else toast("error", result.error ?? "Could not add the employee.");
    return result;
  };

  const toggleStatus = (profile: Profile) => {
    const next = profile.status === "active" ? "inactive" : "active";
    setEmployeeStatus(profile.id, next);
    const kept = totalLeadCount(leads, profile.id);
    if (next === "inactive") {
      toast(
        "info",
        kept > 0
          ? `${profile.name} deactivated — ${kept} lead${kept === 1 ? "" : "s"} and full history kept intact.`
          : `${profile.name} deactivated.`
      );
    } else {
      toast("success", `${profile.name} reactivated — available for assignment again.`);
    }
  };

  /* Members never see Employee Management controls. */
  if (!isAdmin) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8">
        <h1 className="text-2xl font-bold tracking-tight text-ink">Team</h1>
        <div className="card mt-6">
          <EmptyState
            icon={<ShieldCheck className="h-6 w-6" />}
            title="Admin access required"
            description="Employee Management is available to Admin users only. Ask a workspace admin to add or update employees."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="animate-fade-up">
          <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-ink">
            Team
            <Badge tone="brand">
              <ShieldCheck className="h-3 w-3" /> Admin
            </Badge>
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            {profiles.length} employee{profiles.length === 1 ? "" : "s"} · {activeCount} active
          </p>
        </div>
        <Button variant="primary" className="w-full sm:w-auto" onClick={openAdd}>
          <UserPlus className="h-4 w-4" /> Add Employee
        </Button>
      </div>

      {/* Search */}
      <div className="relative mt-6 md:max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden />
        <input
          className="input pl-9"
          placeholder="Search employees…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search employees"
        />
      </div>

      {/* Employee list */}
      {profiles.length === 0 ? (
        <div className="card mt-6">
          <EmptyState
            icon={<Users className="h-6 w-6" />}
            title="No employees yet"
            description="Add your first team member — they become instantly available in Lead Assignment, Auto Assignment and Your Tasks."
            action={{ label: "Add Employee", onClick: openAdd, icon: <UserPlus className="h-4 w-4" /> }}
          />
        </div>
      ) : (
        <div className="card mt-6 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead>
                <tr className="table-head">
                  <th className="th">Employee</th>
                  <th className="th">Role</th>
                  <th className="th">Status</th>
                  <th className="th text-right">Active Leads</th>
                  <th className="th text-right">Total Leads</th>
                  <th className="th text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map(({ profile, activeLeads, totalLeads }) => (
                  <tr key={profile.id} className={cn("transition-colors hover:bg-surface-2/50", profile.status === "inactive" && "opacity-60")}>
                    <td className="td">
                      <div className="flex items-center gap-3">
                        <Avatar name={profile.name} size={34} />
                        <div className="min-w-0">
                          <p className="truncate text-[14px] font-medium text-ink">{profile.name}</p>
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11.5px] text-ink-faint">
                            {profile.email && (
                              <span className="inline-flex items-center gap-1">
                                <Mail className="h-3 w-3" aria-hidden /> {profile.email}
                              </span>
                            )}
                            {profile.phone && (
                              <span className="inline-flex items-center gap-1">
                                <Phone className="h-3 w-3" aria-hidden /> {profile.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="td">
                      <Badge tone={profile.role.toLowerCase() === "admin" ? "brand" : "neutral"}>{profile.role}</Badge>
                    </td>
                    <td className="td">
                      <EmployeeStatusChip status={profile.status} />
                    </td>
                    <td className="td text-right font-medium text-ink">{activeLeads}</td>
                    <td className="td text-right text-ink-muted">{totalLeads}</td>
                    <td className="td">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(profile)}>
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </Button>
                        {profile.status === "active" ? (
                          <Button variant="ghost" size="sm" className="text-danger hover:bg-danger-muted hover:text-danger" onClick={() => toggleStatus(profile)}>
                            <UserX className="h-3.5 w-3.5" /> Deactivate
                          </Button>
                        ) : (
                          <Button variant="ghost" size="sm" className="text-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-400" onClick={() => toggleStatus(profile)}>
                            <UserCheck className="h-3.5 w-3.5" /> Activate
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-ink-faint">
                      No employees match “{query}”.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="mt-4 text-xs leading-relaxed text-ink-faint">
        Employees are never permanently deleted — deactivation keeps all leads and activity history, and only removes the
        employee from new assignment options. Open the{" "}
        <Link to="/leads" className="text-brand-hover underline underline-offset-2">
          Leads
        </Link>{" "}
        board to assign work.
      </p>

      <EmployeeFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        employee={editing}
        onSubmit={handleSubmit}
      />
    </div>
  );
}

export function EmployeeStatusChip({ status }: { status: "active" | "inactive" }) {
  const meta = EMPLOYEE_STATUS_META[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium", meta.chip)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} aria-hidden />
      {meta.label}
    </span>
  );
}
