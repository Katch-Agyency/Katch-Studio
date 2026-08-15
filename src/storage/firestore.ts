import type { Project } from "@/types";
import type { StorageSnapshot, StudioStorageAdapter } from "@/types/storage";

/* ============================================================
   Firestore adapter — the cloud backend for Katch Studio.
   Firebase modules are imported dynamically so the SDK is only
   fetched when VITE_FIREBASE_* env vars are configured; the
   default (local storage) bundle stays lean.

   Data layout (per workspace):
     workspaces/{workspaceId}/projects/{projectId}   — project configs
     workspaces/{workspaceId}/drafts/{projectId}     — unsaved editor drafts
     workspaces/{workspaceId}/meta/state             — last-opened + seeded flags

   The shape mirrors the StudioState model 1:1, so migrating
   between local ↔ cloud (and later per-team workspaces) never
   touches UI code.
   ============================================================ */

import type { CollectionReference, Firestore } from "firebase/firestore";

export interface FirestoreSetupConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  workspaceId: string;
}

/** Firestore hard limit is 1 MiB per document — fail loudly before writing */
const MAX_DOC_BYTES = 900_000;
const BATCH_LIMIT = 450;

export async function createFirestoreAdapter(config: FirestoreSetupConfig): Promise<StudioStorageAdapter> {
  const [{ initializeApp, getApps }, { getFirestore, collection, doc, getDoc, getDocs, writeBatch }] =
    await Promise.all([import("firebase/app"), import("firebase/firestore")]);

  const app =
    getApps().length > 0
      ? getApps()[0]!
      : initializeApp({
          apiKey: config.apiKey,
          authDomain: config.authDomain || undefined,
          projectId: config.projectId,
        });

  /* Anonymous sign-in gives the studio an auth token so security rules can
     require `request.auth != null`. Swap this for real accounts later. */
  try {
    const { getAuth, signInAnonymously } = await import("firebase/auth");
    const auth = getAuth(app);
    await auth.authStateReady();
    if (!auth.currentUser) await signInAnonymously(auth);
  } catch (err) {
    console.warn("[Katch Studio] Anonymous sign-in skipped — enable it in Firebase Auth if rules require it.", err);
  }

  const db = getFirestore(app);
  const ws = config.workspaceId || "katch-prod";
  const projectsRef = collection(db, "workspaces", ws, "projects");
  const draftsRef = collection(db, "workspaces", ws, "drafts");
  const metaDoc = doc(db, "workspaces", ws, "meta", "state");

  /* ---------- Full-sync helper (create / update / delete reconciliation) ---------- */

  async function syncCollection(
    db: Firestore,
    ref: CollectionReference,
    docs: Array<{ id: string; data: unknown }>
  ): Promise<void> {
    const existing = await getDocs(ref);
    const wanted = new Set(docs.map((d) => d.id));

    let batch = writeBatch(db);
    let count = 0;
    const flush = async () => {
      if (count === 0) return;
      await batch.commit();
      batch = writeBatch(db);
      count = 0;
    };

    for (const d of existing.docs) {
      if (!wanted.has(d.id)) {
        batch.delete(d.ref);
        count += 1;
        if (count >= BATCH_LIMIT) await flush();
      }
    }

    for (const d of docs) {
      const bytes = JSON.stringify(d.data).length;
      if (bytes > MAX_DOC_BYTES) {
        throw new Error(
          `Document "${d.id}" is ${(bytes / 1024 / 1024).toFixed(2)} MB — over the Firestore 1 MiB limit. ` +
            `Replace uploaded images with URLs or reduce their size (Brand/Content → images).`
        );
      }
      batch.set(doc(ref, d.id), d.data);
      count += 1;
      if (count >= BATCH_LIMIT) await flush();
    }
    await flush();
  }

  const asProject = (value: unknown): Project | null => {
    const p = value as Project | null;
    return p && p.config && p.id ? p : null;
  };

  /* ---------- Adapter ---------- */

  return {
    kind: "firestore",
    label: `Firestore · ${ws}`,

    async load(): Promise<StorageSnapshot> {
      const [projectsSnap, draftsSnap, metaSnap] = await Promise.all([
        getDocs(projectsRef),
        getDocs(draftsRef),
        getDoc(metaDoc),
      ]);

      const projects = projectsSnap.docs
        .map((d) => asProject(d.data()))
        .filter((p): p is Project => Boolean(p))
        .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));

      const drafts: Record<string, Project> = {};
      draftsSnap.docs.forEach((d) => {
        const p = asProject(d.data());
        if (p) drafts[d.id] = p;
      });

      const meta = metaSnap.exists() ? metaSnap.data() : {};
      return {
        projects,
        drafts,
        lastOpenedProjectId: (meta.lastOpenedProjectId as string) ?? null,
        seeded: Boolean(meta.seeded),
      };
    },

    async saveProjects(projects) {
      await syncCollection(
        db,
        projectsRef,
        projects.map((p) => ({ id: p.id, data: p }))
      );
    },

    async saveDrafts(drafts) {
      await syncCollection(
        db,
        draftsRef,
        Object.entries(drafts).map(([id, draft]) => ({ id, data: draft }))
      );
    },

    async saveLastOpened(projectId) {
      const { setDoc } = await import("firebase/firestore");
      await setDoc(metaDoc, { lastOpenedProjectId: projectId }, { merge: true });
    },

    async markSeeded() {
      const { setDoc } = await import("firebase/firestore");
      await setDoc(metaDoc, { seeded: true }, { merge: true });
    },
  };
}
