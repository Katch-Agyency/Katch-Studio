import type { Project } from "@/types";
import type { StorageSnapshot, StudioStorageAdapter } from "@/types/storage";

/* ============================================================
   LocalStorage adapter — the zero-config default. Everything
   works offline with no Firebase setup.
   ============================================================ */

const KEYS = {
  projects: "katch-studio:projects:v1",
  drafts: "katch-studio:drafts:v1",
  lastOpened: "katch-studio:lastOpened:v1",
  seeded: "katch-studio:seeded:v1",
} as const;

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error("[Katch Studio] Local storage write failed:", err);
    throw err;
  }
}

export function createLocalStorageAdapter(): StudioStorageAdapter {
  return {
    kind: "local",
    label: "Local browser storage",
    async load(): Promise<StorageSnapshot> {
      return {
        projects: readJSON<Project[]>(KEYS.projects, []),
        drafts: readJSON<Record<string, Project>>(KEYS.drafts, {}),
        lastOpenedProjectId: readJSON<string | null>(KEYS.lastOpened, null),
        seeded: localStorage.getItem(KEYS.seeded) === "1",
      };
    },
    async saveProjects(projects) {
      writeJSON(KEYS.projects, projects);
    },
    async saveDrafts(drafts) {
      writeJSON(KEYS.drafts, drafts);
    },
    async saveLastOpened(projectId) {
      writeJSON(KEYS.lastOpened, projectId);
    },
    async markSeeded() {
      try {
        localStorage.setItem(KEYS.seeded, "1");
      } catch {
        /* non-critical */
      }
    },
  };
}
