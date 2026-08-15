import type {
  BrandConfig,
  PageConfig,
  Project,
  ProjectConfig,
  ProjectInfo,
  SectionInstance,
  SectionType,
  ThemeConfig,
  WebsiteTemplate,
} from "@/types";
import { getThemePreset } from "@/data/palette";
import { getTemplate } from "@/data/templates";
import { sectionDefaults } from "@/features/sections/registry";
import { TEMPLATE_FEATURES } from "@/data/features";
import { deepMerge, uid } from "@/utils/helpers";

/* ============================================================
   Project factory — the ONLY way a template becomes a project.
   Guarantees the "template vs project" rule: templates are
   immutable; projects are deep clones built from them.
   ============================================================ */

export function defaultBrand(): BrandConfig {
  return {
    businessName: "",
    tagline: "",
    description: "",
    logoText: "Your Brand",
    logoUrl: "",
    logoFormat: "wordmark",
    faviconColor: "#10b981",
    email: "",
    phone: "",
    whatsapp: "",
    address: "",
    social: [
      { label: "Instagram", url: "" },
      { label: "Facebook", url: "" },
    ],
  };
}

export function defaultProjectInfo(): ProjectInfo {
  return {
    name: "",
    client: "",
    category: "restaurant",
    description: "",
    audience: "",
    language: "en",
  };
}

export function themeFromPreset(presetId: string): ThemeConfig {
  const p = getThemePreset(presetId);
  return {
    mode: p.mode,
    colors: { ...p.colors },
    fonts: { heading: "inter-sora", body: "inter-sora", arabic: "kufi" },
    radius: p.radius,
    buttonStyle: p.buttonStyle,
    cardStyle: p.cardStyle,
    density: p.density,
  };
}

function buildSections(
  types: SectionType[],
  brand: BrandConfig,
  contentOverrides: Record<string, unknown> = {}
): SectionInstance[] {
  return types.map((type) => {
    const defaults = sectionDefaults(type, brand) as unknown as Record<string, unknown>;
    const override = contentOverrides[type] ?? {};
    return {
      id: uid(),
      type,
      hidden: false,
      content: deepMerge(defaults, override),
    } as SectionInstance;
  });
}

function buildPages(tpl: WebsiteTemplate, sectionIds: string[], names: { name: string; path: string; sections: SectionType[] }[]): PageConfig[] {
  const idx = (t: SectionType) => sectionIds[tpl.defaultSections.indexOf(t)];
  return names.map((p) => ({
    id: uid(),
    name: p.name,
    path: p.path,
    sections: p.sections.map(idx).filter(Boolean),
    seo: {
      title: "",
      description: "",
      keywords: "",
      ogImage: "",
      index: true,
    },
  }));
}

export interface CreateProjectInput {
  templateId: string;
  name: string;
  client: string;
  category?: string;
  description?: string;
  audience?: string;
  language?: "en" | "ar";
  brand?: Partial<BrandConfig>;
  /** Per-section-type content overrides (deep-merged over defaults) */
  content?: Record<string, unknown>;
  theme?: Partial<ThemeConfig>;
  features?: string[];
  status?: Project["status"];
}

export function createProjectFromTemplate(input: CreateProjectInput): Project {
  const tpl = getTemplate(input.templateId);
  if (!tpl) throw new Error(`Unknown template: ${input.templateId}`);

  const brand: BrandConfig = { ...defaultBrand(), ...input.brand };
  const info: ProjectInfo = {
    name: input.name,
    client: input.client,
    category: (input.category as ProjectInfo["category"]) ?? tpl.category,
    description: input.description ?? "",
    audience: input.audience ?? "",
    language: input.language ?? "en",
  };

  const sections = buildSections(tpl.defaultSections, brand, input.content);
  const sectionIds = sections.map((s) => s.id);
  const pages = buildPages(tpl, sectionIds, tpl.pages);
  const features = TEMPLATE_FEATURES.map((f) => ({
    id: f.id,
    enabled: (input.features ?? tpl.features).includes(f.id),
  }));

  const now = new Date().toISOString();
  const baseTheme = themeFromPreset(tpl.themePresetId);
  const theme: ThemeConfig = deepMerge(baseTheme, {
    ...(input.theme ?? {}),
    /* Arabic projects default to an Arabic typeface pair */
    ...(input.language === "ar"
      ? { fonts: { heading: "kufi", body: "kufi", arabic: "kufi" } }
      : {}),
  });
  const config: ProjectConfig = {
    projectInfo: info,
    brand,
    theme,
    pages,
    sections,
    features,
    templateId: tpl.id,
  };

  return {
    id: uid(),
    config,
    status: input.status ?? "draft",
    createdAt: now,
    updatedAt: now,
    createdFrom: tpl.id,
  };
}

/** Duplicate a project — copies template, sections, theme, pages and features;
 *  resets client-specific identifiers, keeps content as a starting point. */
export function duplicateProject(project: Project): Project {
  const copy = structuredClone(project);
  copy.id = uid();
  copy.config.projectInfo.name = `${project.config.projectInfo.name} (Copy)`;
  copy.config.projectInfo.client = "";
  copy.config.brand = { ...copy.config.brand, businessName: "" };
  copy.status = "draft";
  copy.createdAt = new Date().toISOString();
  copy.updatedAt = copy.createdAt;
  copy.createdFrom = project.createdFrom;
  return copy;
}
