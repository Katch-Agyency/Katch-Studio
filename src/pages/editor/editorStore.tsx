import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Project } from "@/types";
import { useStore } from "@/app/store";
import { useToast } from "@/app/toast";

/* ============================================================
   Editor state — working copy + autosave to drafts + explicit
   save to the project store. Drafts merge back on reopen, so
   nothing is lost when you navigate away.
   ============================================================ */

export type SaveState = "saved" | "saving" | "unsaved" | "error";

interface EditorCtx {
  project: Project;
  persisted: boolean;
  saveState: SaveState;
  update: (mutator: (draft: Project) => void) => void;
  save: () => void;
  reset: () => void;
  /* Undo / redo history */
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
}

const HISTORY_LIMIT = 60;
/** Typing bursts within this window coalesce into one history entry */
const COALESCE_MS = 600;

const Ctx = createContext<EditorCtx | null>(null);

const AUTOSAVE_MS = 900;

export function EditorProvider({
  projectId,
  children,
}: {
  projectId: string;
  children: React.ReactNode;
}) {
  const { getProject, drafts, updateDraft, clearDraft, saveProject } = useStore();
  const { toast } = useToast();

  const saved = getProject(projectId);
  const draft = drafts[projectId];

  const [project, setProject] = useState<Project>(() => {
    const base = saved ?? draft;
    if (!base) throw new Error(`Project ${projectId} not found`);
    return structuredClone(base);
  });
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const timer = useRef<number | null>(null);
  const latest = useRef(project);
  const cleanRef = useRef(true); // false once the user has unsaved edits

  /* ---------- History (undo / redo) ---------- */
  const pastRef = useRef<Project[]>([]);
  const futureRef = useRef<Project[]>([]);
  const [historyTick, setHistoryTick] = useState(0); // re-render on history change
  const lastEditAtRef = useRef(0);

  const pushHistory = useCallback((snapshot: Project) => {
    const now = Date.now();
    if (now - lastEditAtRef.current < COALESCE_MS && pastRef.current.length > 0) {
      /* coalesce: keep the pre-burst entry, drop this intermediate one */
      lastEditAtRef.current = now;
      return;
    }
    lastEditAtRef.current = now;
    pastRef.current.push(snapshot);
    if (pastRef.current.length > HISTORY_LIMIT) pastRef.current.shift();
    futureRef.current = [];
    setHistoryTick((t) => t + 1);
  }, []);

  const undo = useCallback(() => {
    const prev = pastRef.current.pop();
    if (!prev) return;
    futureRef.current.push(latest.current);
    latest.current = structuredClone(prev);
    setProject(latest.current);
    cleanRef.current = false;
    setSaveState("unsaved");
    setHistoryTick((t) => t + 1);
    /* re-arm autosave so the undone state persists */
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      updateDraft(latest.current);
      window.setTimeout(() => setSaveState("saved"), 450);
    }, AUTOSAVE_MS);
  }, [updateDraft]);

  const redo = useCallback(() => {
    const next = futureRef.current.pop();
    if (!next) return;
    pastRef.current.push(latest.current);
    latest.current = structuredClone(next);
    setProject(latest.current);
    cleanRef.current = false;
    setSaveState("unsaved");
    setHistoryTick((t) => t + 1);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      updateDraft(latest.current);
      window.setTimeout(() => setSaveState("saved"), 450);
    }, AUTOSAVE_MS);
  }, [updateDraft]);

  /* Keep `latest` in sync so flush-on-unmount saves the freshest copy */
  useEffect(() => {
    latest.current = project;
  }, [project]);

  /* If the draft is newer than the saved copy, adopt it */
  useEffect(() => {
    const base = draft ?? saved;
    if (!base) return;
    setProject(structuredClone(base));
    setSaveState("saved");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  /* Flush pending draft on unmount — only when there are unsaved edits */
  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
      if (!cleanRef.current) {
        updateDraft(latest.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const update = useCallback(
    (mutator: (draft: Project) => void) => {
      pushHistory(latest.current);
      cleanRef.current = false;
      setProject((prev) => {
        const next = structuredClone(prev);
        mutator(next);
        next.updatedAt = new Date().toISOString();
        return next;
      });
      setSaveState("unsaved");
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        const current = latest.current;
        setSaveState((s) => (s === "unsaved" ? "saving" : s));
        updateDraft(current);
        window.setTimeout(() => setSaveState("saved"), 450);
      }, AUTOSAVE_MS);
    },
    [updateDraft, pushHistory]
  );

  const save = useCallback(() => {
    try {
      setSaveState("saving");
      if (timer.current) window.clearTimeout(timer.current);
      const current = structuredClone(latest.current);
      saveProject(current);
      clearDraft(current.id);
      cleanRef.current = true;
      pastRef.current = [];
      futureRef.current = [];
      setHistoryTick((t) => t + 1);
      setSaveState("saved");
      toast("success", "Project saved.");
    } catch (e) {
      console.error(e);
      setSaveState("error");
      toast("error", "Failed to save — please try again.");
    }
  }, [saveProject, clearDraft, toast]);

  const reset = useCallback(() => {
    const base = saved ?? getProject(projectId);
    if (base) {
      setProject(structuredClone(base));
      cleanRef.current = true;
      pastRef.current = [];
      futureRef.current = [];
      setHistoryTick((t) => t + 1);
      setSaveState("saved");
      toast("info", "Reverted to the last saved version.");
    }
  }, [saved, getProject, projectId, toast]);

  const value = useMemo<EditorCtx>(
    () => ({
      project,
      persisted: Boolean(saved),
      saveState,
      update,
      save,
      reset,
      canUndo: pastRef.current.length > 0,
      canRedo: futureRef.current.length > 0,
      undo,
      redo,
    }),
    // historyTick re-renders consumers when history changes
    [project, saved, saveState, update, save, reset, undo, redo, historyTick]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useEditor(): EditorCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useEditor must be used inside EditorProvider");
  return ctx;
}
