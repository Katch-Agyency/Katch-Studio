import type { EmployeeInput, Lead, LeadStatus, Profile } from "@/types";
import { isActiveLead, isActiveProfile } from "@/types";
import { uid } from "@/utils/helpers";

/* ============================================================
   CRM domain logic — every rule the Employee Management spec
   cares about lives here so UI pages and the store share it.

   Core invariants:
   - Employees are never deleted, only deactivated.
   - Deactivating an employee never touches their leads.
   - Only ACTIVE employees are eligible for (auto)assignment.
   ============================================================ */

export interface EmployeeActionResult {
  ok: boolean;
  error?: string;
  profile?: Profile;
}

const nowISO = () => new Date().toISOString();

/** Case-insensitive duplicate guard — one employee per name. */
export function findDuplicateEmployee(profiles: Profile[], name: string, exceptId?: string): Profile | undefined {
  const key = name.trim().toLowerCase();
  return profiles.find((p) => p.id !== exceptId && p.name.trim().toLowerCase() === key);
}

/** Build a Profile from validated form input. */
export function buildProfile(input: EmployeeInput): Profile {
  const ts = nowISO();
  return {
    id: `emp-${uid()}`,
    name: input.name.trim(),
    role: input.role.trim() || "Sales",
    status: input.status,
    phone: (input.phone ?? "").trim(),
    email: (input.email ?? "").trim(),
    createdAt: ts,
    updatedAt: ts,
  };
}

/** Validate + create an employee (duplicate-safe). */
export function createEmployee(profiles: Profile[], input: EmployeeInput): EmployeeActionResult {
  if (!input.name.trim()) return { ok: false, error: "Full name is required." };
  if (findDuplicateEmployee(profiles, input.name))
    return { ok: false, error: `“${input.name.trim()}” already exists — no duplicate employee was created.` };
  const profile = buildProfile(input);
  return { ok: true, profile };
}

/** Apply an edit to an existing profile record (same record — never a copy). */
export function patchProfile(profiles: Profile[], id: string, patch: Partial<EmployeeInput>): EmployeeActionResult {
  const existing = profiles.find((p) => p.id === id);
  if (!existing) return { ok: false, error: "Employee not found." };
  const nextName = patch.name ?? existing.name;
  if (!nextName.trim()) return { ok: false, error: "Full name is required." };
  if (findDuplicateEmployee(profiles, nextName, id))
    return { ok: false, error: `“${nextName.trim()}” already exists — no duplicate employee was created.` };
  const profile: Profile = {
    ...existing,
    name: nextName.trim(),
    role: (patch.role ?? existing.role).trim() || existing.role,
    status: patch.status ?? existing.status,
    phone: (patch.phone ?? existing.phone).trim(),
    email: (patch.email ?? existing.email).trim(),
    updatedAt: nowISO(),
  };
  return { ok: true, profile };
}

/* ---------- Lead counts ---------- */

export function activeLeadCount(leads: Lead[], profileId: string): number {
  return leads.filter((l) => l.assignedTo === profileId && isActiveLead(l)).length;
}

export function totalLeadCount(leads: Lead[], profileId: string): number {
  return leads.filter((l) => l.assignedTo === profileId).length;
}

/* ---------- Assignment ---------- */

/** Employees that may receive NEW leads — active only, always. */
export function assignableEmployees(profiles: Profile[]): Profile[] {
  return profiles.filter(isActiveProfile);
}

/**
 * Auto Assignment — pick the least-busy active employee (fewest active
 * leads; ties go to the earliest-created employee). Inactive employees
 * can never be picked, and previous assignments are never rewritten.
 */
export function pickAutoAssignee(profiles: Profile[], leads: Lead[]): Profile | null {
  const candidates = assignableEmployees(profiles);
  if (candidates.length === 0) return null;
  let best: Profile | null = null;
  let bestCount = Number.POSITIVE_INFINITY;
  for (const p of candidates) {
    const count = activeLeadCount(leads, p.id);
    if (count < bestCount || (count === bestCount && best && p.createdAt < best.createdAt)) {
      best = p;
      bestCount = count;
    }
  }
  return best;
}

export function buildLead(
  input: { name: string; company?: string; source?: string; status?: LeadStatus; assignedTo?: string | null; notes?: string },
  profiles: Profile[]
): Lead | null {
  if (!input.name.trim()) return null;
  /* A lead can only be created assigned to an ACTIVE employee. */
  const assignee =
    input.assignedTo && profiles.some((p) => p.id === input.assignedTo && isActiveProfile(p))
      ? input.assignedTo
      : null;
  const ts = nowISO();
  return {
    id: `lead-${uid()}`,
    name: input.name.trim(),
    company: (input.company ?? "").trim(),
    source: input.source ?? "Website",
    status: input.status ?? "new",
    assignedTo: assignee,
    notes: (input.notes ?? "").trim(),
    createdAt: ts,
    updatedAt: ts,
  };
}
