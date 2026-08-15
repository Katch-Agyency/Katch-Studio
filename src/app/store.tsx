import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Project, ProjectStatus, StudioState } from "@/types";
import { buildDemoProjects } from "@/data/demo";
import { createProjectFromTemplate, duplicateProject as cloneProject, type CreateProjectInput } from "@/lib/projectFactory";

/* ============================================================
   Studio store — pure React context + localStorage.
   The storage boundary is isolated here so it can later be
   swapped for Firestore without touching any UI code.
   ============================================================ */

const PROJECTS_KEY = "katch-studio:projects:v1";
const DRAFTS_KEY = "katch-studio:drafts:v1";
const LAST_OPENED_KEY = "katch-studio:lastOpened:v1";

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error("[Katch Studio] Failed to persist state:", e);
  }
}

export interface StudioStore extends StudioState {
  hydrated: boolean;
  createProject: (input: CreateProjectInput) => Project;
  saveProject: (project: Project) => void;
  updateDraft: (draft: Project) => void;
  clearDraft: (id: string) => void;
  deleteProject: (id: string) => void;
  duplicateProject: (id: string) => Project | undefined;
  setStatus: (id: string, status: ProjectStatus) => void;
  getProject: (id: string) => Project | undefined;
  resetDemoData: () => void;
}

const StoreContext = createContext<StudioStore | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Project>>({});
  const [lastOpenedProjectId, setLastOpenedProjectId] = useState<string | null>(null);

  /* Hydrate once */
  useEffect(() => {
    let loaded = loadJSON<Project[]>(PROJECTS_KEY, []);
    if (!Array.isArray(loaded) || loaded.length === 0) {
      loaded = buildDemoProjects();
    }
    setProjects(loaded);
    setDrafts(loadJSON<Record<string, Project>>(DRAFTS_KEY, {}));
    setLastOpenedProjectId(loadJSON<string | null>(LAST_OPENED_KEY, null));
    setHydrated(true);
  }, []);

  /* Persist on change (only after hydration to avoid clobbering) */
  useEffect(() => {
    if (hydrated) saveJSON(PROJECTS_KEY, projects);
  }, [projects, hydrated]);
  useEffect(() => {
    if (hydrated) saveJSON(DRAFTS_KEY, drafts);
  }, [drafts, hydrated]);

  const getProject = useCallback(
    (id: string) => projects.find((p) => p.id === id),
    [projects]
  );

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
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, status, updatedAt: new Date().toISOString() } : p)));
  }, []);

  const resetDemoData = useCallback(() => {
    const demo = buildDemoProjects();
    setProjects(demo);
    setDrafts({});
  }, []);

  const value = useMemo<StudioStore>(
    () => ({
      hydrated,
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
    }),
    [hydrated, projects, drafts, lastOpenedProjectId, createProject, saveProject, updateDraft, clearDraft, deleteProject, duplicateProject, setStatus, getProject, resetDemoData]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StudioStore {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
