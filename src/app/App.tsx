import React, { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import { LogoMark } from "@/components/layout/Logo";
import { useStore } from "@/app/store";

/* ============================================================
   Routing — dashboard-first. Heavy pages are lazy-loaded so
   the shell stays instant.
   ============================================================ */

const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Projects = lazy(() => import("@/pages/Projects"));
const NewProject = lazy(() => import("@/pages/NewProject"));
const Editor = lazy(() => import("@/pages/editor/Editor"));
const Templates = lazy(() => import("@/pages/Templates"));
const Sections = lazy(() => import("@/pages/Sections"));
const DesignSystem = lazy(() => import("@/pages/DesignSystem"));
const Settings = lazy(() => import("@/pages/Settings"));
const Preview = lazy(() => import("@/pages/Preview"));

function PageLoader() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-ink-faint">
      <LogoMark size={32} className="animate-pulse" />
      <p className="text-xs">Loading…</p>
    </div>
  );
}

/** Editor route also handles "last opened project" redirects */
function EditorRedirect() {
  const { lastOpenedProjectId, projects, drafts } = useStore();
  const candidates = [
    drafts[lastOpenedProjectId ?? ""]?.id,
    lastOpenedProjectId,
    ...projects.map((p) => p.id),
  ].filter((id): id is string => Boolean(id && projects.some((p) => p.id === id)));
  const target = candidates[0];
  if (!target) return <Navigate to="/projects" replace />;
  return <Navigate to={`/editor/${target}`} replace />;
}

function ScrollToTop() {
  const { pathname } = useLocation();
  React.useEffect(() => {
    document.querySelector("main")?.scrollTo?.({ top: 0 });
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <ScrollToTop />
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="projects" element={<Projects />} />
          <Route path="projects/new" element={<NewProject />} />
          <Route path="editor" element={<EditorRedirect />} />
          <Route path="editor/:projectId" element={<Editor />} />
          <Route path="templates" element={<Templates />} />
          <Route path="sections" element={<Sections />} />
          <Route path="design-system" element={<DesignSystem />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
        {/* Clean window — no studio chrome */}
        <Route path="preview/:projectId" element={<Preview />} />
      </Routes>
    </Suspense>
  );
}
