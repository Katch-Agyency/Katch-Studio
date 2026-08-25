import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type {
  EmployeeInput,
  EmployeeStatus,
  Lead,
  LeadStatus,
  Profile,
  Project,
  ProjectStatus,
  StudioState,
  WebsiteTemplate,
} from "@/types";
import { isAdminRole } from "@/types";
import type { StorageSnapshot, StudioStorageAdapter } from "@/types/storage";
import { createLocalStorageAdapter } from "@/storage/local";
import { buildDemoProjects } from "@/data/demo";
import { buildDemoLeads, buildDemoTeam } from "@/data/crmDemo";
import {
  buildLead,
  createEmployee,
  patchProfile,
  pickAutoAssignee,
  type EmployeeActionResult,
} from "@/lib/crm";
import { createProjectFromTemplate, duplicateProject as cloneProject, type CreateProjectInput } from "@/lib/projectFactory";
import { TEMPLATES } from "@/data/templates";
import { uid, getProjectCounter, setProjectCounter } from "@/utils/helpers";
import { useToast } from "@/app/toast";

/* ============================================================
   Studio store — pure React context over a pluggable storage
   adapter. Boot order:

     1. If VITE_FIREBASE_* env vars are set → Firestore adapter
        (anonymous sign-in + workspace-scoped collections).
     2. Otherwise → localStorage adapter (zero-config default).
     3. If cloud loading fails, fall back to local storage and
        tell the user — the studio never bricks.

   All persistence happens through the adapter interface, so the
   rest of the app has no idea where data lives.
   ============================================================ */

/* ---------- Adapter resolution (env-gated) ---------- */

async function resolveAdapter(): Promise<StudioStorageAdapter> {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;

  if (apiKey && projectId) {
    try {
      const { createFirestoreAdapter } = await import("@/storage/firestore");
      return await createFirestoreAdapter({
        apiKey,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "",
        projectId,
        workspaceId: import.meta.env.VITE_FIREBASE_WORKSPACE_ID ?? "katch-prod",
      });
    } catch (err) {
      console.error("[Katch Studio] Firestore initialization failed — using local storage.", err);
      return createLocalStorageAdapter();
    }
  }
  return createLocalStorageAdapter();
}

/* ---------- Store ---------- */

/** Session identity ("acting as") — per-device, not workspace data. */
const ACTING_AS_KEY = "katch-studio:acting-as:v1";

function readActingAs(): string | null {
  try {
    return localStorage.getItem(ACTING_AS_KEY);
  } catch {
    return null;
  }
}

function writeActingAs(id: string | null): void {
  try {
    if (id) localStorage.setItem(ACTING_AS_KEY, id);
    else localStorage.removeItem(ACTING_AS_KEY);
  } catch {
    /* non-critical */
  }
}

export interface StudioStore extends StudioState {
  hydrated: boolean;
  storageKind: StudioStorageAdapter["kind"];
  storageLabel: string;
  /** Built-in + user-duplicated templates */
  allTemplates: WebsiteTemplate[];
  createProject: (input: CreateProjectInput) => Project;
  saveProject: (project: Project) => void;
  updateDraft: (draft: Project) => void;
  clearDraft: (id: string) => void;
  deleteProject: (id: string) => void;
  duplicateProject: (id: string) => Project | undefined;
  setStatus: (id: string, status: ProjectStatus) => void;
  getProject: (id: string) => Project | undefined;
  resetDemoData: () => void;
  clearAllData: () => void;
  duplicateTemplate: (id: string) => WebsiteTemplate | undefined;

  /* ---------- Team (Employee Management) ---------- */
  /** The single employee structure — one Profile per employee. */
  profiles: Profile[];
  leads: Lead[];
  /** Who this browser session is acting as (no employee login — a session identity). */
  currentProfileId: string | null;
  currentProfile: Profile | null;
  /** True when acting as an Admin (or in a fresh workspace before any exists). */
  isAdmin: boolean;
  /** Admin only: create an employee (duplicate-safe). */
  addEmployee: (input: EmployeeInput) => EmployeeActionResult;
  /** Admin only: edit an employee — updates the SAME record, never a copy. */
  updateEmployee: (id: string, patch: Partial<EmployeeInput>) => EmployeeActionResult;
  /** Admin only: activate / deactivate. Never deletes, never touches leads. */
  setEmployeeStatus: (id: string, status: EmployeeStatus) => void;
  addLead: (input: {
    name: string;
    company?: string;
    source?: string;
    status?: LeadStatus;
    assignedTo?: string | null;
    notes?: string;
  }) => Lead | null;
  updateLead: (id: string, patch: Partial<Pick<Lead, "name" | "company" | "source" | "status" | "notes">>) => void;
  /** Admin only: assign a lead — active employees only. */
  assignLead: (leadId: string, profileId: string | null) => EmployeeActionResult;
  /** Admin only: Auto Assignment — least-busy ACTIVE employee. */
  autoAssignLead: (leadId: string) => EmployeeActionResult;
  /** Admin only: Auto-assign every unassigned lead. Returns how many were assigned. */
  autoAssignUnassigned: () => number;
  /** Switch the session identity (used to demo admin vs member views). */
  setCurrentProfile: (id: string) => void;
}

const StoreContext = createContext<StudioStore | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();

  const [hydrated, setHydrated] = useState(false);
  const [adapter, setAdapter] = useState<StudioStorageAdapter | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Project>>({});
  const [customTemplates, setCustomTemplates] = useState<WebsiteTemplate[]>([]);
  const [lastOpenedProjectId, setLastOpenedProjectId] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null);

  /* Throttled sync-error reporting — never silently fail, never spam */
  const lastSyncErrorAt = useRef(0);
  const reportSyncError = useCallback(
    (err: unknown) => {
      console.error("[Katch Studio] Storage sync failed:", err);
      const now = Date.now();
      if (now - lastSyncErrorAt.current > 8000) {
        lastSyncErrorAt.current = now;
        toast("error", "Couldn't sync with storage — the latest change may not be saved.");
      }
    },
    [toast]
  );

  /* ---------- Boot: resolve adapter → load → hydrate ---------- */

  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      const primary = await resolveAdapter();
      let active = primary;
      let snap: StorageSnapshot | null = null;

      try {
        snap = await active.load();
      } catch (err) {
        console.error("[Katch Studio] Storage load failed:", err);
        if (active.kind === "firestore") {
          toast("error", "Could not reach Firestore — switched to local browser storage.");
          active = createLocalStorageAdapter();
          snap = await active.load();
        }
      }
      if (cancelled) return;

      let loadedProjects = snap?.projects ?? [];
      if (loadedProjects.length === 0 && !(snap?.seeded)) {
        /* First run — seed realistic demo projects */
        loadedProjects = buildDemoProjects();
        active.markSeeded().catch(() => undefined);
      }

      let loadedProfiles = snap?.profiles ?? [];
      let loadedLeads = snap?.leads ?? [];
      if (loadedProfiles.length === 0 && !snap?.crmSeeded) {
        /* First run — seed the demo team + leads (Ahmed 3 · Mohamed 5 · Ali 0) */
        loadedProfiles = buildDemoTeam();
        loadedLeads = buildDemoLeads();
        active.markCrmSeeded?.().catch(() => undefined);
      }

      setProjects(loadedProjects);
      setDrafts(snap?.drafts ?? {});
      setCustomTemplates(snap?.customTemplates ?? []);
      setLastOpenedProjectId(snap?.lastOpenedProjectId ?? null);
      setProfiles(loadedProfiles);
      setLeads(loadedLeads);
      /* Session identity: the stored pick, else the first Admin, else anyone. */
      const storedActingAs = readActingAs();
      const initialProfileId =
        loadedProfiles.find((p) => p.id === storedActingAs)?.id ??
        loadedProfiles.find((p) => isAdminRole(p.role))?.id ??
        loadedProfiles[0]?.id ??
        null;
      setCurrentProfileId(initialProfileId);
      setAdapter(active);
      setHydrated(true);

      // Initialize project counter from storage
      if (snap?.projectCounter !== undefined) {
        setProjectCounter(snap.projectCounter);
      }
    };

    void boot();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- Persist on change (after hydration) ---------- */

  useEffect(() => {
    if (!hydrated || !adapter) return;
    adapter.saveProjects(projects).catch(reportSyncError);
  }, [projects, hydrated, adapter, reportSyncError]);

  useEffect(() => {
    if (!hydrated || !adapter) return;
    adapter.saveDrafts(drafts).catch(reportSyncError);
  }, [drafts, hydrated, adapter, reportSyncError]);

  useEffect(() => {
    if (!hydrated || !adapter) return;
    adapter.saveLastOpened(lastOpenedProjectId).catch(reportSyncError);
  }, [lastOpenedProjectId, hydrated, adapter, reportSyncError]);

  useEffect(() => {
    if (!hydrated || !adapter) return;
    adapter.saveCustomTemplates(customTemplates).catch(reportSyncError);
  }, [customTemplates, hydrated, adapter, reportSyncError]);

  useEffect(() => {
    if (!hydrated || !adapter) return;
    adapter.saveProfiles?.(profiles).catch(reportSyncError);
  }, [profiles, hydrated, adapter, reportSyncError]);

  useEffect(() => {
    if (!hydrated || !adapter) return;
    adapter.saveLeads?.(leads).catch(reportSyncError);
  }, [leads, hydrated, adapter, reportSyncError]);

  /* ---------- Actions ---------- */

  const getProject = useCallback((id: string) => projects.find((p) => p.id === id), [projects]);

  const createProject = useCallback((input: CreateProjectInput) => {
    const project = createProjectFromTemplate(input);
    setProjects((prev) => [project, ...prev]);
    setLastOpenedProjectId(project.id);
    
    // Sync counter to Firestore after project creation
    if (adapter && adapter.saveProjectCounter) {
      const counter = getProjectCounter();
      if (counter > 0) {
        adapter.saveProjectCounter(counter).catch(reportSyncError);
      }
    }
    
    return project;
  }, [adapter, reportSyncError]);

  const saveProject = useCallback((project: Project) => {
    const stamped = { ...project, updatedAt: new Date().toISOString() };
    setProjects((prev) => {
      const exists = prev.some((p) => p.id === stamped.id);
      return exists ? prev.map((p) => (p.id === stamped.id ? stamped : p)) : [stamped, ...prev];
    });
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[stamped.id];
      return next;
    });
  }, []);

  const updateDraft = useCallback((draft: Project) => {
    setDrafts((prev) => ({ ...prev, [draft.id]: draft }));
  }, []);

  const clearDraft = useCallback((id: string) => {
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const deleteProject = useCallback((id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const duplicateProject = useCallback(
    (id: string) => {
      const source = projects.find((p) => p.id === id);
      if (!source) return undefined;
      const copy = cloneProject(source);
      setProjects((prev) => [copy, ...prev]);
      
      // Sync counter to Firestore after duplication
      if (adapter && adapter.saveProjectCounter) {
        const counter = getProjectCounter();
        if (counter > 0) {
          adapter.saveProjectCounter(counter).catch(reportSyncError);
        }
      }
      
      return copy;
    },
    [projects, adapter, reportSyncError]
  );

  const setStatus = useCallback((id: string, status: ProjectStatus) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status, updatedAt: new Date().toISOString() } : p))
    );
  }, []);

  /* ---------- Team (Employee Management) actions ---------- */

  /** Add Employee — admin only, duplicate-safe. */
  const addEmployee = useCallback(
    (input: EmployeeInput): EmployeeActionResult => {
      const result = createEmployee(profiles, input);
      if (!result.ok) return result;
      setProfiles((prev) => [...prev, result.profile!]);
      return result;
    },
    [profiles]
  );

  /** Edit Employee — patches the SAME profile record (never a duplicate). */
  const updateEmployee = useCallback(
    (id: string, patch: Partial<EmployeeInput>): EmployeeActionResult => {
      const result = patchProfile(profiles, id, patch);
      if (!result.ok) return result;
      const updated = result.profile!;
      setProfiles((prev) => prev.map((p) => (p.id === id ? updated : p)));
      return result;
    },
    [profiles]
  );

  /** Activate / Deactivate — leads and history are never touched. */
  const setEmployeeStatus = useCallback((id: string, status: EmployeeStatus) => {
    setProfiles((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status, updatedAt: new Date().toISOString() } : p))
    );
  }, []);

  const addLead = useCallback(
    (input: { name: string; company?: string; source?: string; status?: LeadStatus; assignedTo?: string | null; notes?: string }) => {
      const lead = buildLead(input, profiles);
      if (lead) setLeads((prev) => [lead, ...prev]);
      return lead;
    },
    [profiles]
  );

  const updateLead = useCallback(
    (id: string, patch: Partial<Pick<Lead, "name" | "company" | "source" | "status" | "notes">>) => {
      setLeads((prev) =>
        prev.map((l) => (l.id === id ? { ...l, ...patch, updatedAt: new Date().toISOString() } : l))
      );
    },
    []
  );

  /** Assign a lead — only ACTIVE employees are valid targets. */
  const assignLead = useCallback(
    (leadId: string, profileId: string | null): EmployeeActionResult => {
      if (profileId) {
        const target = profiles.find((p) => p.id === profileId);
        if (!target) return { ok: false, error: "Employee not found." };
        if (target.status !== "active")
          return { ok: false, error: `${target.name} is inactive — reassign to an active employee.` };
      }
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, assignedTo: profileId, updatedAt: new Date().toISOString() } : l))
      );
      return { ok: true, profile: profileId ? profiles.find((p) => p.id === profileId) : undefined };
    },
    [profiles]
  );

  /** Auto Assignment — least-busy ACTIVE employee; inactive never picked. */
  const autoAssignLead = useCallback(
    (leadId: string): EmployeeActionResult => {
      const pick = pickAutoAssignee(profiles, leads);
      if (!pick) return { ok: false, error: "No active employees to assign to." };
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, assignedTo: pick.id, updatedAt: new Date().toISOString() } : l))
      );
      return { ok: true, profile: pick };
    },
    [profiles, leads]
  );

  const autoAssignUnassigned = useCallback((): number => {
    const unassigned = leads.filter((l) => l.assignedTo === null);
    if (unassigned.length === 0) return 0;
    /* Assign sequentially, recomputing the least-busy pick so the load stays even. */
    let working = [...leads];
    let count = 0;
    for (const lead of unassigned) {
      const pick = pickAutoAssignee(profiles, working);
      if (!pick) break;
      working = working.map((l) =>
        l.id === lead.id ? { ...l, assignedTo: pick.id, updatedAt: new Date().toISOString() } : l
      );
      count += 1;
    }
    if (count > 0) setLeads(working);
    return count;
  }, [profiles, leads]);

  const setCurrentProfile = useCallback(
    (id: string) => {
      setCurrentProfileId(id);
      writeActingAs(id);
    },
    []
  );

  const resetDemoData = useCallback(() => {
    setProjects(buildDemoProjects());
    setDrafts({});
    setProfiles(buildDemoTeam());
    setLeads(buildDemoLeads());
  }, []);

  const clearAllData = useCallback(() => {
    setProjects([]);
    setDrafts({});
    setCustomTemplates([]);
    setLastOpenedProjectId(null);
    setProfiles([]);
    setLeads([]);
    setCurrentProfileId(null);
    writeActingAs(null);
  }, []);

  const duplicateTemplate = useCallback(
    (id: string) => {
      const source = TEMPLATES.find((t) => t.id === id) ?? customTemplates.find((t) => t.id === id);
      if (!source) return undefined;
      const copy: WebsiteTemplate = {
        ...structuredClone(source),
        id: `tpl-custom-${uid()}`,
        name: `${source.name} (Copy)`,
        featured: false,
      };
      setCustomTemplates((prev) => [copy, ...prev]);
      return copy;
    },
    [customTemplates]
  );

  const allTemplates = useMemo<WebsiteTemplate[]>(
    () => [...customTemplates, ...TEMPLATES],
    [customTemplates]
  );

  const currentProfile = useMemo(
    () => profiles.find((p) => p.id === currentProfileId) ?? null,
    [profiles, currentProfileId]
  );

  /* Admin = acting as an Admin profile. A wiped workspace (no profiles yet)
     stays admin-enabled so the first employee can always be added. */
  const isAdmin = !currentProfile || isAdminRole(currentProfile.role);

  const value = useMemo<StudioStore>(
    () => ({
      hydrated,
      storageKind: adapter?.kind ?? "local",
      storageLabel: adapter?.label ?? "Local browser storage",
      allTemplates,
      projects,
      drafts,
      lastOpenedProjectId,
      createProject,
      saveProject,
      updateDraft,
      clearDraft,
      deleteProject,
      duplicateProject,
      setStatus,
      getProject,
      resetDemoData,
      clearAllData,
      duplicateTemplate,
      profiles,
      leads,
      currentProfileId,
      currentProfile,
      isAdmin,
      addEmployee,
      updateEmployee,
      setEmployeeStatus,
      addLead,
      updateLead,
      assignLead,
      autoAssignLead,
      autoAssignUnassigned,
      setCurrentProfile,
    }),
    [
      hydrated,
      adapter,
      projects,
      drafts,
      lastOpenedProjectId,
      createProject,
      saveProject,
      updateDraft,
      clearDraft,
      deleteProject,
      duplicateProject,
      setStatus,
      getProject,
      resetDemoData,
      clearAllData,
      duplicateTemplate,
      allTemplates,
      profiles,
      leads,
      currentProfileId,
      currentProfile,
      isAdmin,
      addEmployee,
      updateEmployee,
      setEmployeeStatus,
      addLead,
      updateLead,
      assignLead,
      autoAssignLead,
      autoAssignUnassigned,
      setCurrentProfile,
    ]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StudioStore {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
