import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Project, ProjectStatus, StudioState, WebsiteTemplate } from "@/types";
import type { StorageSnapshot, StudioStorageAdapter } from "@/types/storage";
import { createLocalStorageAdapter } from "@/storage/local";
import { buildDemoProjects } from "@/data/demo";
import { createProjectFromTemplate, duplicateProject as cloneProject, type CreateProjectInput } from "@/lib/projectFactory";
import { TEMPLATES } from "@/data/templates";
import { uid } from "@/utils/helpers";
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

  /* Never stay silent about WHY local mode is active. */
  if (import.meta.env.PROD) {
    console.info(
      "[Katch Studio] Local storage mode: the VITE_FIREBASE_* variables were not present when this " +
        "bundle was BUILT (they are compiled in at build time). Add them in the hosting environment " +
        "(Vercel → Settings → Environment Variables) and redeploy."
    );
  } else {
    console.info(
      "[Katch Studio] Local storage mode (dev). Create a .env file with VITE_FIREBASE_* variables to sync to Firestore."
    );
  }
  return createLocalStorageAdapter();
}

/* ---------- Store ---------- */

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

      setProjects(loadedProjects);
      setDrafts(snap?.drafts ?? {});
      setCustomTemplates(snap?.customTemplates ?? []);
      setLastOpenedProjectId(snap?.lastOpenedProjectId ?? null);
      setAdapter(active);
      setHydrated(true);
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

  /* ---------- Actions ---------- */

  const getProject = useCallback((id: string) => projects.find((p) => p.id === id), [projects]);

  const createProject = useCallback((input: CreateProjectInput) => {
    const project = createProjectFromTemplate(input);
    setProjects((prev) => [project, ...prev]);
    setLastOpenedProjectId(project.id);
    return project;
  }, []);

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
      return copy;
    },
    [projects]
  );

  const setStatus = useCallback((id: string, status: ProjectStatus) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status, updatedAt: new Date().toISOString() } : p))
    );
  }, []);

  const resetDemoData = useCallback(() => {
    setProjects(buildDemoProjects());
    setDrafts({});
  }, []);

  const clearAllData = useCallback(() => {
    setProjects([]);
    setDrafts({});
    setCustomTemplates([]);
    setLastOpenedProjectId(null);
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
    ]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StudioStore {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
