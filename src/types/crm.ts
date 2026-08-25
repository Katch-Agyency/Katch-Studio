/* ============================================================
   CRM types — the team (profiles) and lead model.

   ONE employee structure: the `Profile`. There is deliberately
   no second "employees" table — employees ARE profiles, exactly
   like the fields the existing profile system defines:
   id, name, role, status, phone, email.
   ============================================================ */

export const EMPLOYEE_STATUSES = ["active", "inactive"] as const;
export type EmployeeStatus = (typeof EMPLOYEE_STATUSES)[number];

/** Roles offered in the employee form. `Admin` unlocks management controls. */
export const EMPLOYEE_ROLES = [
  "Admin",
  "Manager",
  "Sales",
  "Designer",
  "Developer",
  "Marketer",
  "Support",
] as const;

/** The one profile/employee record. Never hard-deleted — only deactivated. */
export interface Profile {
  id: string;
  name: string;
  /** Job role. `Admin` (case-insensitive) grants admin capabilities. */
  role: string;
  status: EmployeeStatus;
  phone: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeInput {
  name: string;
  role: string;
  status: EmployeeStatus;
  phone?: string;
  email?: string;
}

/* ---------- Leads ---------- */

export const LEAD_STATUSES = ["new", "contacted", "qualified", "won", "lost"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

/** Statuses that count as an "active lead" (still being worked). */
export const ACTIVE_LEAD_STATUSES: readonly LeadStatus[] = ["new", "contacted", "qualified"];

export const LEAD_SOURCES = [
  "Website",
  "WhatsApp",
  "Instagram",
  "Facebook",
  "Referral",
  "Walk-in",
  "Other",
] as const;

export interface Lead {
  id: string;
  /** Lead contact name. */
  name: string;
  company: string;
  source: string;
  status: LeadStatus;
  /** Assignee (Profile id). Kept forever — deactivating an employee
   *  never touches their historical leads. `null` = unassigned. */
  assignedTo: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeadInput {
  name: string;
  company?: string;
  source?: string;
  status?: LeadStatus;
  assignedTo?: string | null;
  notes?: string;
}

/* ---------- Small helpers ---------- */

/** Admin capability = the profile's role is "Admin" (case-insensitive). */
export function isAdminRole(role: string): boolean {
  return role.trim().toLowerCase() === "admin";
}

export function isActiveProfile(profile: Profile): boolean {
  return profile.status === "active";
}

export function isActiveLead(lead: Lead): boolean {
  return (ACTIVE_LEAD_STATUSES as readonly string[]).includes(lead.status);
}
