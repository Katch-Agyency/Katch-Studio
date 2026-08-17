import type { Project, SectionType, WebsiteTemplate } from "@/types";
import { getTemplate, DEMO_IMAGES } from "@/data/templates";
import { uid } from "@/utils/helpers";

/* ============================================================
   templateFromProject — the pragmatic path to template creation.
   Any finished project can be promoted into the template library;
   the result is a real composition (section types, variants,
   content, theme, features) that the factory clones like any
   built-in template.
   ============================================================ */

export function projectToTemplate(project: Project, name?: string): WebsiteTemplate {
  const { config } = project;
  const source = getTemplate(project.createdFrom ?? config.templateId);
  const home = config.pages[0] ?? config.pages.find((p) => p.path === "/") ?? config.pages[0]!;

  /* Home sections, in order, mapped to their types */
  const homeSections = home.sections
    .map((id) => config.sections.find((s) => s.id === id))
    .filter((s): s is NonNullable<typeof s> => Boolean(s));

  const defaultSections = homeSections.map((s) => s.type);

  /* Variants used on the home page */
  const sectionVariants: Partial<Record<SectionType, string>> = {};
  for (const s of homeSections) {
    if (s.variant) sectionVariants[s.type] = s.variant;
  }

  /* Content per type — first occurrence wins for repeated types */
  const defaultContent: Partial<Record<SectionType, Record<string, unknown>>> = {};
  for (const s of homeSections) {
    if (!(s.type in defaultContent)) {
      defaultContent[s.type] = s.content as Record<string, unknown>;
    }
  }

  /* Preview image: the home hero image, else the source template's */
  const hero = homeSections.find((s) => s.type === "hero");
  const heroImage = (hero?.content as { image?: string } | undefined)?.image;
  const previewImage = heroImage || source?.previewImage || DEMO_IMAGES.cafeInterior;

  const label = name?.trim() || `${config.projectInfo.name || "Project"} Template`;

  return {
    id: `tpl-custom-${uid()}`,
    name: label,
    category: config.projectInfo.category,
    style: source?.style ?? "Custom",
    description:
      config.projectInfo.description?.trim() ||
      `Saved from the project “${config.projectInfo.name}”.`,
    previewImage,
    accentColor: source?.accentColor ?? config.theme.colors.primary,
    defaultSections,
    sectionVariants: Object.keys(sectionVariants).length > 0 ? sectionVariants : undefined,
    defaultContent: Object.keys(defaultContent).length > 0 ? defaultContent : undefined,
    pages: config.pages.map((p) => ({
      name: p.name,
      path: p.path,
      sections: p.sections
        .map((id) => config.sections.find((s) => s.id === id)?.type)
        .filter((t): t is SectionType => Boolean(t)),
    })),
    themePresetId: source?.themePresetId ?? "modern",
    /* Full theme override so the clone keeps the project's exact look */
    theme: config.theme,
    features: config.features.filter((f) => f.enabled).map((f) => f.id),
    featured: false,
  };
}
