import type { PageConfig, ProjectConfig } from "@/types";
import { SectionRenderer } from "./sections/SectionRenderer";
import { WebsiteThemeProvider } from "./renderer";

/* ============================================================
   WebsiteRenderer — the foundation of the whole system.
   <WebsiteRenderer project={config} />
   Determines pages, sections, theme, features and content.
   The preview and the future exported site use this exact
   component, so what you see is what ships.
   ============================================================ */

export function WebsitePage({
  project,
  page,
  activePageId,
  onNavigate,
}: {
  project: ProjectConfig;
  page: PageConfig;
  activePageId?: string;
  onNavigate?: (pageId: string) => void;
}) {
  const sections = page.sections
    .map((id) => project.sections.find((s) => s.id === id))
    .filter((s): s is NonNullable<typeof s> => Boolean(s && !s.hidden));

  return (
    <div className="min-h-full">
      {sections.map((section) => (
        <SectionRenderer key={section.id} section={section} project={project} />
      ))}
    </div>
  );
}

export default function WebsiteRenderer({
  project,
  pageId,
  onNavigate,
}: {
  project: ProjectConfig;
  pageId?: string;
  onNavigate?: (pageId: string) => void;
}) {
  const pages = project.pages;
  const active = pages.find((p) => p.id === pageId) ?? pages[0];

  return (
    <WebsiteThemeProvider project={project}>
      {active ? (
        <WebsitePage project={project} page={active} onNavigate={onNavigate} />
      ) : (
        <div className="flex min-h-[400px] items-center justify-center text-sm" style={{ color: "var(--wp-text-muted)" }}>
          This project has no pages yet — add a page to get started.
        </div>
      )}
    </WebsiteThemeProvider>
  );
}
