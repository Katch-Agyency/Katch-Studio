import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, ShieldCheck, Target, Zap } from "lucide-react";
import { useStore } from "@/app/store";
import { useToast } from "@/app/toast";
import { Badge, Button } from "@/components/ui/ui";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, Select, TextInput } from "@/components/ui/Fields";
import { Modal } from "@/components/ui/Modal";
import { EmployeeStatusChip } from "@/pages/team/Team";
import { LEAD_STATUS_META } from "@/data/status";
import type { Lead, LeadStatus } from "@/types";
import { LEAD_SOURCES, LEAD_STATUSES } from "@/types";
import { cn } from "@/utils/helpers";
import { timeLabel } from "@/utils/helpers";

/* ============================================================
   Leads — the assignment board.

   Lead Assignment offers ACTIVE employees only. Auto Assignment
   picks the least-busy active employee. Leads held by a
   deactivated teammate keep their assignee (history stays
   visible) and can be reassigned at any time.
   ============================================================ */

export default function Leads() {
  const {
    profiles,
    leads,
    isAdmin,
    addLead,
    updateLead,
    assignLead,
    autoAssignLead,
    autoAssignUnassigned,
  } = useStore();
  const { toast } = useToast();

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);

  const byId = useMemo(() => new Map(profiles.map((p) => [p.id, p])), [profiles]);

  /** Lead Assignment options — active employees only. */
  const assignable = useMemo(() => profiles.filter((p) => p.status === "active"), [profiles]);

  const unassignedCount = leads.filter((l) => l.assignedTo === null).length;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...leads]
      .filter((l) => {
        if (statusFilter !== "all" && l.status !== statusFilter) return false;
        if (assigneeFilter === "unassigned" && l.assignedTo !== null) return false;
        if (assigneeFilter !== "all" && assigneeFilter !== "unassigned" && l.assignedTo !== assigneeFilter)
          return false;
        if (!q) return true;
        const assignee = l.assignedTo ? byId.get(l.assignedTo)?.name ?? "" : "";
        return (
          l.name.toLowerCase().includes(q) ||
          l.company.toLowerCase().includes(q) ||
          assignee.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [leads, query, statusFilter, assigneeFilter, byId]);

  /** Assignee dropdown for one lead: active employees, plus the current
   *  assignee when they're inactive (so history stays visible + reassignable). */
  const optionsFor = (lead: Lead) => {
    const current = lead.assignedTo ? byId.get(lead.assignedTo) : undefined;
    const showCurrent =
      current && current.status !== "active" && !assignable.some((p) => p.id === current.id);
    return (
      <>
        {showCurrent && current && (
          <option value={current.id}>
            {current.name} (inactive)
          </option>
        )}
        <option value="">Unassigned</option>
        {assignable.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </>
    );
  };

  const onAssign = (lead: Lead, value: string) => {
    const result = assignLead(lead.id, value || null);
    if (!result.ok) {
      toast("error", result.error ?? "Could not assign the lead.");
      return;
    }
    if (value) toast("success", `${lead.name} assigned to ${result.profile?.name}.`);
    else toast("info", `${lead.name} is now unassigned.`);
  };

  const onAutoAssign = (lead: Lead) => {
    const result = autoAssignLead(lead.id);
    if (!result.ok) {
      toast("error", result.error ?? "Could not auto-assign.");
      return;
    }
    toast("success", `${lead.name} auto-assigned to ${result.profile?.name}.`);
  };

  const onAutoAssignAll = () => {
    const count = autoAssignUnassigned();
    if (count === 0) {
      toast("info", unassignedCount === 0 ? "No unassigned leads." : "No active employees to assign to.");
      return;
    }
    toast("success", `Auto-assigned ${count} lead${count === 1 ? "" : "s"} to active employees.`);
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="animate-fade-up">
          <h1 className="text-2xl font-bold tracking-tight text-ink">Leads</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {leads.length} lead{leads.length === 1 ? "" : "s"}
            {unassignedCount > 0 && (
              <>
                {" · "}
                <span className="text-ink">{unassignedCount} unassigned</span>
              </>
            )}
            {assignable.length === 0 && (
              <>
                {" · "}
                <span className="text-amber-500">no active employees</span>
              </>
            )}
          </p>
        </div>
        {isAdmin && (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="secondary"
              onClick={onAutoAssignAll}
              disabled={unassignedCount === 0 || assignable.length === 0}
              title="Assign every unassigned lead to the least-busy active employee"
            >
              <Zap className="h-4 w-4" /> Auto-assign all
            </Button>
            <Button variant="primary" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" /> Add Lead
            </Button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1 md:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden />
          <input
            className="input pl-9"
            placeholder="Search leads, companies or assignees…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search leads"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select className="input w-auto min-w-[140px]" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by lead status">
            <option value="all">All statuses</option>
            {LEAD_STATUSES.map((s) => (
              <option key={s} value={s}>
                {LEAD_STATUS_META[s].label}
              </option>
            ))}
          </select>
          <select className="input w-auto min-w-[150px]" value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)} aria-label="Filter by assignee">
            <option value="all">All assignees</option>
            <option value="unassigned">Unassigned</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.status !== "active" ? " (inactive)" : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Lead list */}
      {leads.length === 0 ? (
        <div className="card mt-6">
          <EmptyState
            icon={<Target className="h-6 w-6" />}
            title="No leads yet"
            description="Add a lead and assign it to an active employee — or let Auto Assignment pick the least-busy teammate."
            action={isAdmin ? { label: "Add Lead", onClick: () => setAddOpen(true), icon: <Plus className="h-4 w-4" /> } : undefined}
          />
        </div>
      ) : (
        <div className="card mt-6 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px]">
              <thead>
                <tr className="table-head">
                  <th className="th">Lead</th>
                  <th className="th">Status</th>
                  <th className="th">Assigned To</th>
                  <th className="th">Created</th>
                  {(isAdmin || unassignedCount > 0) && <th className="th text-right">Assignment</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map((lead) => {
                  const assignee = lead.assignedTo ? byId.get(lead.assignedTo) : undefined;
                  return (
                    <tr key={lead.id} className="transition-colors hover:bg-surface-2/50">
                      <td className="td">
                        <p className="text-[14px] font-medium text-ink">{lead.name}</p>
                        <p className="mt-0.5 text-[11.5px] text-ink-faint">
                          {lead.company || "—"}
                          {lead.company && ` · ${lead.source}`}
                        </p>
                      </td>
                      <td className="td">
                        {isAdmin ? (
                          <select
                            className="input h-8 w-auto text-xs"
                            value={lead.status}
                            aria-label={`Status of ${lead.name}`}
                            onChange={(e) => updateLead(lead.id, { status: e.target.value as LeadStatus })}
                          >
                            {LEAD_STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {LEAD_STATUS_META[s].label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <LeadStatusChip status={lead.status} />
                        )}
                      </td>
                      <td className="td">
                        {isAdmin ? (
                          <select
                            className="input h-8 w-auto min-w-[150px] text-xs"
                            value={lead.assignedTo ?? ""}
                            aria-label={`Assignee of ${lead.name}`}
                            onChange={(e) => onAssign(lead, e.target.value)}
                          >
                            {optionsFor(lead)}
                          </select>
                        ) : assignee ? (
                          <span className={cn("inline-flex items-center gap-2", assignee.status !== "active" && "opacity-70")}>
                            {assignee.name}
                            {assignee.status !== "active" && <Badge tone="neutral">inactive</Badge>}
                          </span>
                        ) : (
                          <span className="text-ink-faint">Unassigned</span>
                        )}
                      </td>
                      <td className="td text-ink-muted">{timeLabel(lead.createdAt)}</td>
                      <td className="td">
                        {isAdmin && (
                          <div className="flex items-center justify-end gap-1.5">
                            {lead.assignedTo === null && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onAutoAssign(lead)}
                                disabled={assignable.length === 0}
                                title="Auto-assign to the least-busy active employee"
                              >
                                <Zap className="h-3.5 w-3.5" /> Auto
                              </Button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-sm text-ink-faint">
                      No leads match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!isAdmin && (
        <p className="mt-4 flex items-center gap-1.5 text-xs text-ink-faint">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
          Read-only view — lead assignment is managed by workspace admins. Head to{" "}
          <Link to="/tasks" className="text-brand-hover underline underline-offset-2">
            Your Tasks
          </Link>
          .
        </p>
      )}

      <AddLeadModal open={addOpen} onClose={() => setAddOpen(false)} assignable={assignable} onAdd={addLead} />
    </div>
  );
}

function LeadStatusChip({ status }: { status: LeadStatus }) {
  const meta = LEAD_STATUS_META[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium", meta.chip)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} aria-hidden />
      {meta.label}
    </span>
  );
}

function AddLeadModal({
  open,
  onClose,
  assignable,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  assignable: { id: string; name: string }[];
  onAdd: ReturnType<typeof useStore>["addLead"];
}) {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", company: "", source: "Website", assignedTo: "" });
  const [error, setError] = useState("");

  const reset = () => {
    setForm({ name: "", company: "", source: "Website", assignedTo: "" });
    setError("");
  };

  const close = () => {
    reset();
    onClose();
  };

  const submit = () => {
    if (!form.name.trim()) {
      setError("Lead name is required.");
      return;
    }
    const lead = onAdd({
      name: form.name,
      company: form.company,
      source: form.source,
      assignedTo: form.assignedTo || null,
    });
    if (!lead) {
      setError("Could not create the lead.");
      return;
    }
    toast("success", `Lead “${lead.name}” created${lead.assignedTo ? " and assigned" : " — unassigned"}.`);
    close();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Add Lead"
      description="Assign now to an active employee, or leave unassigned and use Auto Assignment later."
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit}>
            <Plus className="h-4 w-4" /> Add Lead
          </Button>
        </>
      }
    >
      <form
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Field label="Lead Name *">
          <TextInput
            id="lead-name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Habiba Sherif"
            autoFocus
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Company (optional)">
            <TextInput
              id="lead-company"
              value={form.company}
              onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
              placeholder="e.g. HS Boutique"
            />
          </Field>
          <Field label="Source">
            <Select id="lead-source" value={form.source} onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}>
              {LEAD_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Assign To" hint="Only active employees can take new leads.">
          <Select
            id="lead-assignee"
            value={form.assignedTo}
            onChange={(e) => setForm((f) => ({ ...f, assignedTo: e.target.value }))}
          >
            <option value="">Unassigned — auto-assign later</option>
            {assignable.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
        {error && (
          <p role="alert" className="rounded-lg border border-danger/30 bg-danger-muted px-3 py-2 text-xs text-danger">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}
