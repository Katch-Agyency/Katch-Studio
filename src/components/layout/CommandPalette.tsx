import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Copy,
  FolderKanban,
  LayoutDashboard,
  LayoutTemplate,
  ListTodo,
  Moon,
  Package,
  Plus,
  Save,
  Search,
  Settings,
  Sun,
  Target,
  Users,
  Component,
} from "lucide-react";
import { useStore } from "@/app/store";
import { useStudioTheme } from "@/app/theme";
import { useToast } from "@/app/toast";
import { Kbd } from "@/components/ui/ui";
import { LogoMark } from "./Logo";
import { cn } from "@/utils/helpers";

/* ============================================================
   Command palette — Ctrl/Cmd + K.
   Lightweight: navigate anywhere, open/duplicate projects,
   create projects, toggle theme, save from the editor.
   ============================================================ */

export const PALETTE_OPEN_EVENT = "katch-studio:palette-open";
export const PALETTE_SAVE_EVENT = "katch-studio:save-request";

interface Command {
  id: string;
  group: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  run: () => void;
  keywords?: string;
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const navigate = useNavigate();
  const { projects, duplicateProject, isAdmin } = useStore();
  const { theme, toggle } = useStudioTheme();
  const { toast } = useToast();

  /* Open/close listeners */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
        setQuery("");
        setActiveIdx(0);
      }
      if (e.key === "Escape") setOpen(false);
    };
    const onOpen = () => {
      setOpen(true);
      setQuery("");
      setActiveIdx(0);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener(PALETTE_OPEN_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(PALETTE_OPEN_EVENT, onOpen);
    };
  }, []);

  /* Focus input on open */
  useEffect(() => {
    if (open) {
      const t = window.setTimeout(() => inputRef.current?.focus(), 20);
      return () => window.clearTimeout(t);
    }
  }, [open]);

  const commands = useMemo<Command[]>(() => {
    const go = (path: string) => () => {
      navigate(path);
      setOpen(false);
    };
    const nav: Command[] = [
      { id: "nav-home", group: "Navigate", label: "Go to Dashboard", icon: LayoutDashboard, run: go("/") },
      { id: "nav-projects", group: "Navigate", label: "Go to Projects", icon: FolderKanban, run: go("/projects") },
      { id: "nav-templates", group: "Navigate", label: "Go to Templates", icon: LayoutTemplate, run: go("/templates") },
      { id: "nav-sections", group: "Navigate", label: "Go to Sections", icon: Package, run: go("/sections") },
      /* Employee Management is admin-only — members never get the command. */
      ...(isAdmin
        ? [{ id: "nav-team", group: "Navigate", label: "Go to Team (Employee Management)", icon: Users, run: go("/team") }]
        : []),
      { id: "nav-leads", group: "Navigate", label: "Go to Leads", icon: Target, run: go("/leads") },
      { id: "nav-tasks", group: "Navigate", label: "Go to Your Tasks", icon: ListTodo, run: go("/tasks") },
      { id: "nav-ds", group: "Navigate", label: "Go to Design System", icon: Component, run: go("/design-system") },
      { id: "nav-settings", group: "Navigate", label: "Go to Settings", icon: Settings, run: go("/settings") },
    ];
    const actions: Command[] = [
      { id: "act-new", group: "Actions", label: "Create a new project", icon: Plus, run: go("/projects/new") },
      {
        id: "act-theme",
        group: "Actions",
        label: `Switch to ${theme === "dark" ? "light" : "dark"} theme`,
        icon: theme === "dark" ? Sun : Moon,
        run: () => {
          toggle();
          setOpen(false);
        },
      },
      {
        id: "act-save",
        group: "Actions",
        label: "Save current project",
        icon: Save,
        keywords: "save editor ctrl s",
        run: () => {
          window.dispatchEvent(new CustomEvent(PALETTE_SAVE_EVENT));
          setOpen(false);
        },
      },
    ];
    const projectCommands: Command[] = projects
      .slice()
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .flatMap((p) => {
        const name = p.config.projectInfo.name || "Untitled Project";
        return [
          {
            id: `open-${p.id}`,
            group: "Projects",
            label: `Open “${name}”`,
            icon: FolderKanban,
            keywords: `open project ${name}`,
            run: go(`/editor/${p.id}`),
          },
          {
            id: `dup-${p.id}`,
            group: "Projects",
            label: `Duplicate “${name}”`,
            icon: Copy,
            keywords: `duplicate copy ${name}`,
            run: () => {
              const copy = duplicateProject(p.id);
              setOpen(false);
              if (copy) {
                toast("success", `Duplicated “${copy.config.projectInfo.name}”.`);
                navigate(`/editor/${copy.id}`);
              }
            },
          },
        ];
      });
    return [...nav, ...actions, ...projectCommands];
  }, [navigate, projects, duplicateProject, isAdmin, theme, toggle, toast]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter(
      (c) => c.label.toLowerCase().includes(q) || (c.keywords ?? "").toLowerCase().includes(q)
    );
  }, [commands, query]);

  /* Reset active when list changes */
  useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  const runActive = useCallback(() => {
    const cmd = filtered[activeIdx];
    if (cmd) cmd.run();
  }, [filtered, activeIdx]);

  /* Keep active item visible */
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${activeIdx}"]`);
    el?.scrollIntoView?.({ block: "nearest" });
  }, [activeIdx, open]);

  if (!open) return null;

  const groups: string[] = [];
  for (const c of filtered) if (!groups.includes(c.group)) groups.push(c.group);

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center p-4 pt-[14vh]" role="dialog" aria-modal="true" aria-label="Command palette">
      <div className="absolute inset-0 animate-fade-in bg-black/60 backdrop-blur-[2px]" onClick={() => setOpen(false)} />
      <div className="relative z-10 w-full max-w-lg animate-scale-in overflow-hidden rounded-2xl border border-line-strong bg-surface-1 shadow-pop">
        {/* Search */}
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search className="h-4 w-4 shrink-0 text-ink-faint" aria-hidden />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveIdx((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                runActive();
              }
            }}
            placeholder="Search Katch Studio…"
            className="h-12 flex-1 bg-transparent text-[14.5px] text-ink outline-none placeholder:text-ink-faint"
            aria-label="Search commands"
          />
          <Kbd>esc</Kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[46vh] overflow-y-auto p-1.5">
          {filtered.length === 0 && (
            <p className="px-3 py-8 text-center text-[13px] text-ink-faint">
              No results for “{query}”.
            </p>
          )}
          {filtered.map((cmd, i) => {
            const firstInGroup = groups.indexOf(cmd.group) === filtered.indexOf(cmd);
            return (
              <React.Fragment key={cmd.id}>
                {firstInGroup && (
                  <p className="px-3 pb-1 pt-2.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
                    {cmd.group}
                  </p>
                )}
                <button
                  data-idx={i}
                  onClick={cmd.run}
                  onMouseEnter={() => setActiveIdx(i)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13.5px] transition-colors",
                    i === activeIdx ? "bg-brand-muted text-brand-hover" : "text-ink"
                  )}
                  aria-selected={i === activeIdx}
                  role="option"
                >
                  <cmd.icon className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                  <span className="min-w-0 flex-1 truncate">{cmd.label}</span>
                  {i === activeIdx && <Kbd>↵</Kbd>}
                </button>
              </React.Fragment>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 border-t border-line bg-surface-0/50 px-4 py-2.5 text-[11px] text-ink-faint">
          <LogoMark size={18} />
          <span className="flex items-center gap-1">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd> navigate
          </span>
          <span className="flex items-center gap-1">
            <Kbd>↵</Kbd> select
          </span>
          <span className="ml-auto flex items-center gap-1">
            <Kbd>esc</Kbd> close
          </span>
        </div>
      </div>
    </div>
  );
}
