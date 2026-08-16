import React, { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Building2,
  ChevronsUpDown,
  FolderKanban,
  LayoutDashboard,
  LayoutTemplate,
  Menu,
  Moon,
  Package,
  Settings,
  Sun,
  X,
} from "lucide-react";
import { Logo, LogoMark } from "./Logo";
import CloudStatusBanner from "./CloudStatusBanner";
import { useStudioTheme } from "@/app/theme";
import { Avatar, Kbd } from "@/components/ui/ui";
import { cn } from "@/utils/helpers";

/* ============================================================
   App shell — sidebar navigation + top bar. Responsive:
   desktop sidebar / tablet collapsible / mobile drawer.
   ============================================================ */

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/projects", label: "Projects", icon: FolderKanban, end: false },
  { to: "/templates", label: "Templates", icon: LayoutTemplate, end: false },
  { to: "/sections", label: "Sections", icon: Package, end: false },
  { to: "/design-system", label: "Design System", icon: LayoutDashboard, end: false, hidden: false },
  { to: "/settings", label: "Settings", icon: Settings, end: false },
];

export default function AppLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { theme, toggle } = useStudioTheme();
  const location = useLocation();

  /* Close drawer on navigation */
  React.useEffect(() => setDrawerOpen(false), [location.pathname]);

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center justify-between px-5">
        <Logo />
        <button className="btn-icon-sm md:hidden" onClick={() => setDrawerOpen(false)} aria-label="Close menu">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Workspace */}
      <div className="px-4 pb-3">
        <button className="flex w-full items-center gap-2.5 rounded-lg border border-line bg-surface-1 px-3 py-2 text-left transition-colors hover:bg-surface-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-muted text-brand-hover">
            <Building2 className="h-3.5 w-3.5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-semibold text-ink">Katch Studio</span>
            <span className="block truncate text-[11px] text-ink-faint">Production Workspace</span>
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 text-ink-faint" />
        </button>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2" aria-label="Main">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors",
                isActive
                  ? "bg-brand-muted text-brand-hover"
                  : "text-ink-muted hover:bg-surface-2 hover:text-ink"
              )
            }
          >
            <item.icon className="h-4 w-4 shrink-0" aria-hidden />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-line p-3">
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
          <Avatar name="Katch Studio" size={30} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium text-ink">Katch Team</span>
            <span className="block truncate text-[11px] text-ink-faint">Workspace admin</span>
          </span>
          <button className="btn-icon-sm" onClick={toggle} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}>
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-full">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 border-r border-line bg-surface-1/60 lg:block">
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
          <div className="flex min-w-0 items-center gap-2 lg:hidden">
            <LogoMark size={26} />
            <span className="font-display text-sm font-bold text-ink">Katch Studio</span>
          </div>
          <div className="hidden items-center gap-2 text-[13px] text-ink-faint lg:flex">
            <span className="font-medium text-ink">Production Workspace</span>
            <span aria-hidden>·</span>
            <span>Internal</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="mr-1 hidden items-center gap-1.5 text-xs text-ink-faint sm:flex">
              <Kbd>⌘</Kbd>
              <Kbd>K</Kbd>
            </span>
            <button className="btn-icon" onClick={toggle} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}>
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <Avatar name="Katch Studio" size={30} />
          </div>
        </header>

        {/* Deployed-but-not-connected warning (invisible on localhost / when Firestore is active) */}
        <CloudStatusBanner />

        <main className="min-h-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
