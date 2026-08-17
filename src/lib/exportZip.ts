import type { Project } from "@/types";
import { getTemplate } from "@/data/templates";
import { getFeature } from "@/data/features";
import { sectionDefaults } from "@/features/sections/registry";
import { deepMerge, slugify } from "@/utils/helpers";

/* ============================================================
   Export package — pure functions that turn a project into
   portable artifacts (resolved structure + standalone ZIP).
   Framework-free so it works in the browser AND in Node tests,
   and will feed the future scaffold generator.
   ============================================================ */

/** The generated website as data: pages, sections, resolved content,
 *  theme tokens and features. This is what the renderer consumes. */
export function buildResolvedStructure(project: Project): Record<string, unknown> {
  const { config } = project;
  return {
    generator: "Katch Studio",
    version: "1.0.0",
    generatedAt: new Date().toISOString(),
    project: {
      name: config.projectInfo.name,
      client: config.projectInfo.client,
      category: config.projectInfo.category,
      language: config.projectInfo.language,
      direction: config.projectInfo.language === "ar" ? "rtl" : "ltr",
    },
    brand: config.brand,
    theme: config.theme,
    features: Object.fromEntries(
      config.features.map((f) => [f.id, { enabled: f.enabled, name: getFeature(f.id)?.name ?? f.id }])
    ),
    pages: config.pages.map((page) => ({
      id: page.id,
      name: page.name,
      path: page.path,
      seo: page.seo,
      sections: page.sections
        .map((sid) => config.sections.find((s) => s.id === sid))
        .filter((s): s is NonNullable<typeof s> => Boolean(s))
        .map((s) => ({
          id: s.id,
          type: s.type,
          hidden: s.hidden,
          variant: s.variant,
          styles: s.styles,
          content: deepMerge(sectionDefaults(s.type, config.brand), s.content),
        })),
    })),
    sourceTemplate: getTemplate(config.templateId)?.name ?? null,
  };
}

/** Standalone ZIP: project.json + website.json + handover README.
 *  jszip is lazy-loaded so the main bundle stays lean. */
export async function buildProjectZip(project: Project): Promise<Blob> {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();

  zip.file("project.json", JSON.stringify(project, null, 2));
  zip.file("website.json", JSON.stringify(buildResolvedStructure(project), null, 2));
  zip.file(
    "README.md",
    [
      `# ${project.config.projectInfo.name}`,
      "",
      `Exported from Katch Studio on ${new Date().toLocaleString()}.`,
      "",
      "## Contents",
      "- `project.json` — the full editable project configuration (template, sections, theme, features, content)",
      "- `website.json` — the resolved website structure (what the renderer builds from)",
      "",
      "## Notes",
      `- Client: ${project.config.projectInfo.client || "—"}`,
      `- Website type: ${project.config.projectInfo.category}`,
      `- Language: ${project.config.projectInfo.language === "ar" ? "Arabic (RTL)" : "English (LTR)"}`,
      `- Source template: ${getTemplate(project.config.templateId)?.name ?? "Custom"}`,
      "",
      "The automated scaffold generator (config → React/Vite project) is the next",
      "phase of the Katch Studio pipeline.",
    ].join("\n")
  );

  return zip.generateAsync({ type: "blob" });
}

export function projectZipFilename(project: Project): string {
  const slug = slugify(project.config.projectInfo.name || "project") || "project";
  return `katch-website-${slug}.zip`;
}
