import type { Lead, Profile } from "./crm";
import type { Project, WebsiteTemplate } from "./project";

/* ============================================================
   Storage adapter — the persistence boundary of Katch Studio.
   The app talks to this interface; localStorage and Firestore
   are interchangeable implementations selected at boot from
   environment variables (VITE_FIREBASE_*).
   ============================================================ */

export interface StorageSnapshot {
  projects: Project[];
  drafts: Record<string, Project>;
  lastOpenedProjectId: string | null;
  /** User-duplicated templates (built-ins ship with the app) */
  customTemplates: WebsiteTemplate[];
  /** True once the workspace has been initialized (prevents demo reseeding after a wipe) */
  seeded: boolean;
  /** Sequential project counter for generating #001, #002, etc. */
  projectCounter?: number;
  /** Team members (the single employee structure). Optional: older snapshots predate the CRM. */
  profiles?: Profile[];
  /** Leads assigned to team members. Optional: older snapshots predate the CRM. */
  leads?: Lead[];
  /** True once the demo team + leads have been seeded. */
  crmSeeded?: boolean;
}

export interface StudioStorageAdapter {
  kind: "local" | "firestore";
  /** Human-readable label shown in Settings */
  label: string;
  load(): Promise<StorageSnapshot>;
  saveProjects(projects: Project[]): Promise<void>;
  saveDrafts(drafts: Record<string, Project>): Promise<void>;
  saveLastOpened(projectId: string | null): Promise<void>;
  saveCustomTemplates(templates: WebsiteTemplate[]): Promise<void>;
  saveProjectCounter?(counter: number): Promise<void>;
  markSeeded(): Promise<void>;
  /** Team members — the single employee/profile record. */
  saveProfiles?(profiles: Profile[]): Promise<void>;
  /** Leads (assignment history is never rewritten by deactivation). */
  saveLeads?(leads: Lead[]): Promise<void>;
  markCrmSeeded?(): Promise<void>;
}
