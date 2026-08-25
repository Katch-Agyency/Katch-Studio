import React, { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Building2,
  Check,
  ChevronsLeft,
  ChevronsRight,
  Component,
  FolderKanban,
  LayoutDashboard,
  LayoutTemplate,
  ListTodo,
  Menu,
  Moon,
  Package,
  Search,
  Settings,
  Sun,
  Target,
  Users,
  X,
} from "lucide-react";
import { Logo, LogoMark } from "./Logo";
import CommandPalette, { PALETTE_OPEN_EVENT } from "./CommandPalette";
import CloudStatusBanner from "./CloudStatusBanner";
import PwaStatus, { InstallButton } from "./PwaStatus";
import { useStudioTheme } from "@/app/theme";
import { useStore } from "@/app/store";
import { Avatar, Kbd } from "@/components/ui/ui";
import { cn } from "@/utils/helpers";

/* ============================================================
   App shell — grouped sidebar navigation + top bar.
   Desktop: full sidebar / collapsible icon rail.
   Mobile: drawer.
   ============================================================ */

const NAV_GROUPS: {
  label: string;
  items: {
    to: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    end?: boolean;
    /** Employee Management is admin-only — members never see it. */
    adminOnly?: boolean;
  }[];
}[] = [
  {
    label: "Workspace",
    items: [
      { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
      { to: "/projects", label: "Projects", icon: FolderKanban },
      { to: "/templates", label: "Templates", icon: LayoutTemplate },
      { to: "/sections", label: "Sections", icon: Package },
    ],
  },
  {
    label: "Team",
    items: [
      { to: "/team", label: "Team", icon: Users, adminOnly: true },
      { to: "/leads", label: "Leads", icon: Target },
      { to: "/tasks", label: "Your Tasks", icon: ListTodo },
    ],
  },
  {
    label: "Design",
    items: [{ to: "/design-system", label: "Design System", icon: Component }],
  },
  {
    label: "System",
    items: [{ to: "/settings", label: "Settings", icon: Settings }],
  },
];

const RAIL_KEY = "katch-studio:rail:v1";

/* ============================================================
   Session identity — "acting as". NOT an employee login: it
   selects which teammate this browser session acts as, so
   Admin vs regular-member views can be exercised. Admins get
   the Employee Management controls; members don't.
   ============================================================ */

function IdentityMenu({
  profiles,
  currentProfile,
  onSelect,
  compact,
  className,
}: {
  profiles: ReturnType<typeof useStore>["profiles"];
  currentProfile: ReturnType<typeof useStore>["currentProfile"];
  onSelect: (id: string) => void;
  compact?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const name = currentProfile?.name ?? "Katch Team";
  const roleLabel = currentProfile ? currentProfile.role : "Workspace admin";

  return (
    <div className={cn("relative min-w-0 flex-1", className)} ref={ref}>
      <button
        type="button"
        className={cn(
          "flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-surface-2",
          compact && "justify-center px-0"
        )}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Switch acting profile"
        title="Switch acting profile"
      >
        <Avatar name={name} size={30} />
        {!compact && (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium text-ink">{name}</span>
            <span className="block truncate text-[11px] text-ink-faint">{roleLabel}</span>
          </span>
        )}
        {!compact && <ChevronsRight className="h-3.5 w-3.5 shrink-0 rotate-90 text-ink-faint" aria-hidden />}
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Acting profile"
          className="absolute bottom-full left-0 z-40 mb-2 w-56 overflow-hidden rounded-xl border border-line bg-surface-1 shadow-pop"
        >
          <p className="border-b border-line px-3 py-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
            Acting as
          </p>
          <div className="max-h-64 overflow-y-auto py-1">
            {profiles.length === 0 && (
              <p className="px-3 py-2 text-xs text-ink-faint">No employees yet.</p>
            )}
            {profiles.map((p) => (
              <button
                key={p.id}
                role="menuitem"
                type="button"
                disabled={p.status !== "active"}
                onClick={() => {
                  onSelect(p.id);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-40",
                  currentProfile?.id === p.id && "bg-brand-muted/40"
                )}
              >
                <Avatar name={p.name} size={24} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium text-ink">{p.name}</span>
                  <span className="block truncate text-[10.5px] text-ink-faint">
                    {p.role}
                    {p.status !== "active" && " · inactive"}
                  </span>
                </span>
                {currentProfile?.id === p.id && <Check className="h-3.5 w-3.5 shrink-0 text-brand-hover" aria-hidden />}
              </button>
            ))}
          </div>
          <p className="border-t border-line px-3 py-2 text-[10.5px] leading-4 text-ink-faint">
            Session identity for role-based views — not an employee login.
          </p>
        </div>
      )}
    </div>
  );
}

export default function AppLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [rail, setRail] = useState<boolean>(() => {
    try {
      return localStorage.getItem(RAIL_KEY) === "1";
    } catch {
      return false;
    }
  });
  const { theme, toggle } = useStudioTheme();
  const location = useLocation();
  const { profiles, currentProfile, isAdmin, setCurrentProfile } = useStore();

  const navGroups = useMemo(
    () =>
      NAV_GROUPS.map((group) => ({
        ...group,
        items: group.items.filter((item) => !item.adminOnly || isAdmin),
      })).filter((group) => group.items.length > 0),
    [isAdmin]
  );

  useEffect(() => setDrawerOpen(false), [location.pathname]);

  const toggleRail = () => {
    setRail((r) => {
      const next = !r;
      try {
        localStorage.setItem(RAIL_KEY, next ? "1" : "0");
      } catch {
        /* non-critical */
      }
      return next;
    });
  };

  const openPalette = () => window.dispatchEvent(new CustomEvent(PALETTE_OPEN_EVENT));

  const sidebar = (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className={cn("flex h-16 shrink-0 items-center border-b border-line", rail ? "justify-center px-0" : "justify-between px-5")}>
        {rail ? (
          <LogoMark size={30} />
        ) : (
          <Logo />
        )}
        <button className="btn-icon-sm md:hidden" onClick={() => setDrawerOpen(false)} aria-label="Close menu">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Workspace */}
      {!rail && (
        <div className="px-4 pb-2 pt-3">
          <button className="flex w-full items-center gap-2.5 rounded-lg border border-line bg-surface-1 px-3 py-2 text-left transition-colors hover:bg-surface-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-muted text-brand-hover">
              <Building2 className="h-3.5 w-3.5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold text-ink">Katch Studio</span>
              <span className="block truncate text-[11px] text-ink-faint">Production Workspace</span>
            </span>
          </button>
        </div>
      )}

      {/* Grouped nav */}
      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-3" aria-label="Main">
        {navGroups.map((group) => (
          <div key={group.label}>
            {!rail && (
              <p className="mb-1.5 px-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  title={rail ? item.label : undefined}
                  className={({ isActive }) =>
                    cn(
                      "group flex items-center gap-3 rounded-lg px-2.5 py-2 text-[13.5px] font-medium transition-colors",
                      rail && "justify-center px-0 py-2.5",
                      isActive
                        ? "bg-brand-muted text-brand-hover"
                        : "text-ink-muted hover:bg-surface-2 hover:text-ink"
                    )
                  }
                >
                  <item.icon className="h-4 w-4 shrink-0" aria-hidden />
                  {!rail && item.label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-line p-3">
        {!rail ? (
          <div className="flex items-center gap-1">
            <IdentityMenu
              profiles={profiles}
              currentProfile={currentProfile}
              onSelect={setCurrentProfile}
              className="flex-1"
            />
            <button className="btn-icon-sm" onClick={toggle} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}>
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <IdentityMenu profiles={profiles} currentProfile={currentProfile} onSelect={setCurrentProfile} compact />
            <button className="btn-icon-sm" onClick={toggle} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}>
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        )}
        <button
          className={cn("btn-ghost mt-1 hidden w-full items-center justify-center text-ink-faint md:flex", rail ? "h-8 w-full" : "h-8 w-full")}
          onClick={toggleRail}
          aria-label={rail ? "Expand sidebar" : "Collapse sidebar"}
          title={rail ? "Expand sidebar" : "Collapse sidebar"}
        >
          {rail ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
          {!rail && <span className="text-xs">Collapse</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-full">
      {/* Desktop sidebar / rail */}
      <aside
        className={cn(
          "hidden shrink-0 border-r border-line bg-surface-1/60 transition-all duration-200 lg:block",
          rail ? "w-[64px]" : "w-60"
        )}
      >
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <div className="absolute inset-0 animate-fade-in bg-black/60" onClick={() => setDrawerOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] animate-fade-up border-r border-line bg-surface-1 shadow-pop">
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-line bg-surface-1/60 px-4 backdrop-blur md:px-6">
          <button className="btn-icon lg:hidden" onClick={() => setDrawerOpen(true)} aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>
          <span className="flex items-center gap-2 lg:hidden">
            <LogoMark size={26} />
          </span>

          {/* Command palette trigger */}
          <button
            onClick={openPalette}
            className="ml-auto hidden h-8 w-56 items-center gap-2 rounded-lg border border-line bg-surface-1 px-3 text-[12.5px] text-ink-faint transition-colors hover:border-line-strong hover:text-ink-muted sm:flex"
            aria-label="Open command palette"
          >
            <Search className="h-3.5 w-3.5" aria-hidden />
            <span className="flex-1 text-left">Search or jump to…</span>
            <span className="flex items-center gap-0.5">
              <Kbd>⌘</Kbd>
              <Kbd>K</Kbd>
            </span>
          </button>
          <button className="btn-icon sm:hidden" onClick={openPalette} aria-label="Open command palette">
            <Search className="h-4 w-4" />
          </button>

          <InstallButton compact />
          <button className="btn-icon" onClick={toggle} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}>
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <Avatar name={currentProfile?.name ?? "Katch Studio"} size={30} />
        </header>

        {/* Deployed-but-not-connected warning (invisible on localhost / when Firestore is active) */}
        <CloudStatusBanner />
        {/* Offline notice + update-available banner */}
        <PwaStatus />

        <main className="min-h-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      <CommandPalette />
    </div>
  );
}
