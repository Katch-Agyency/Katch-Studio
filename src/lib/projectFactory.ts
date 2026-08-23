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
import { deepMerge, uid, generateProjectId } from "@/utils/helpers";

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
    faviconColor: "#84cc16",
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
  contentOverrides: Record<string, unknown> = {},
  variants: Partial<Record<SectionType, string>> = {}
): SectionInstance[] {
  return types.map((type) => {
    const defaults = sectionDefaults(type, brand) as unknown as Record<string, unknown>;
    const override = contentOverrides[type] ?? {};
    return {
      id: uid(),
      type,
      hidden: false,
      variant: variants[type],
      content: deepMerge(defaults, override),
    } as SectionInstance;
  });
}

/** Maps page section types → instance ids, handling repeated section types
 *  (a template can use the same section twice, e.g. two product grids).
 *  The occurrence counter resets per PAGE, so Home's "products" #1 and #2
 *  stay distinct from the Shop page's "products" #1. */
function buildPages(tpl: WebsiteTemplate, sections: SectionInstance[], names: { name: string; path: string; sections: SectionType[] }[]): PageConfig[] {
  return names.map((p) => {
    const occurrence = new Map<SectionType, number>();
    const indexOf = (t: SectionType): string | undefined => {
      const seen = occurrence.get(t) ?? 0;
      occurrence.set(t, seen + 1);
      const found = sections.filter((s) => s.type === t)[seen];
      return found?.id;
    };
    return {
      id: uid(),
      name: p.name,
      path: p.path,
      sections: p.sections.map(indexOf).filter((id): id is string => Boolean(id)),
      seo: {
        title: "",
        description: "",
        keywords: "",
        ogImage: "",
        index: true,
      },
    };
  });
}

export interface CreateProjectInput {
  templateId: string;
  /** Pass the resolved template object when it may be a user-duplicated
   *  (custom) template — the factory falls back to the built-in registry. */
  template?: WebsiteTemplate;
  name: string;
  client: string;
  category?: string;
  description?: string;
  audience?: string;
  language?: "en" | "ar";
  brand?: Partial<BrandConfig>;
  /** Per-section-type content overrides (deep-merged over defaults) */
  content?: Record<string, unknown>;
  /** Restrict the template's section set (e.g. the wizard's toggles).
   *  Empty/undefined = keep the template's full default set. */
  sections?: string[];
  theme?: Partial<ThemeConfig>;
  features?: string[];
  status?: Project["status"];
}

export function createProjectFromTemplate(input: CreateProjectInput): Project {
  const tpl = input.template ?? getTemplate(input.templateId);
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

  const sectionTypes =
    input.sections && input.sections.length > 0
      ? tpl.defaultSections.filter((t) => input.sections!.includes(t))
      : tpl.defaultSections;

  const sections = buildSections(sectionTypes, brand, { ...(tpl.defaultContent ?? {}), ...input.content }, tpl.sectionVariants);
  const pages = buildPages(tpl, sections, tpl.pages);
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
    id: generateProjectId(),
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
  copy.id = generateProjectId();
  copy.config.projectInfo.name = `${project.config.projectInfo.name} (Copy)`;
  copy.config.projectInfo.client = "";
  copy.config.brand = { ...copy.config.brand, businessName: "" };
  copy.status = "draft";
  copy.createdAt = new Date().toISOString();
  copy.updatedAt = copy.createdAt;
  copy.createdFrom = project.createdFrom;
  return copy;
}
