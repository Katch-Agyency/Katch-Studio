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
  markSeeded(): Promise<void>;
}
