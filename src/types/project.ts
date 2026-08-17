/* ============================================================
   Project configuration — the single source of truth that
   controls the generated website
   ============================================================ */

import type { BrandConfig, ThemeConfig } from "./theme";
import type { PageConfig, SectionInstance, SectionType } from "./sections";

export type WebsiteCategoryId = "restaurant" | "business" | "landing" | "portfolio" | "ecommerce" | "saas";

export interface WebsiteCategory {
  id: WebsiteCategoryId;
  label: string;
  description: string;
  icon: string;
  /** MVP-ready vs architecture-ready */
  available: boolean;
}

export type ProjectStatus = "draft" | "in_progress" | "review" | "ready" | "delivered";

export interface ProjectInfo {
  name: string;
  client: string;
  category: WebsiteCategoryId;
  description: string;
  audience: string;
  language: "en" | "ar";
}

export interface FeatureConfig {
  id: string;
  enabled: boolean;
}

export interface ProjectConfig {
  projectInfo: ProjectInfo;
  brand: BrandConfig;
  theme: ThemeConfig;
  pages: PageConfig[];
  sections: SectionInstance[];
  features: FeatureConfig[];
  templateId: string;
}

export interface Project {
  id: string;
  config: ProjectConfig;
  status: ProjectStatus;
  /** ISO timestamp */
  createdAt: string;
  updatedAt: string;
  createdFrom: string; // template id
}

/* ---------- Template ---------- */

export interface TemplateFeature {
  id: string;
  name: string;
  description: string;
  icon: string;
  categories: WebsiteCategoryId[] | "all";
}

export interface TemplateFeatureInstance {
  id: string;
  enabled: boolean;
}

export interface WebsiteTemplate {
  id: string;
  name: string;
  category: WebsiteCategoryId;
  style: string;
  description: string;
  previewImage: string;
  accentColor: string;
  /** Sections added (in order) to the first page */
  defaultSections: SectionType[];
  /** Layout variant per section type (e.g. { hero: "editorial" }) */
  sectionVariants?: Partial<Record<SectionType, string>>;
  /** Realistic starter content per section type (deep-merged over defaults) */
  defaultContent?: Partial<Record<SectionType, Record<string, unknown>>>;
  pages: { name: string; path: string; sections: SectionType[] }[];
  themePresetId: string;
  /** Exact theme override (custom templates preserve their project's look) */
  theme?: ThemeConfig;
  features: string[]; // feature ids enabled by default
  featured: boolean;
}

/* ---------- Store ---------- */

export interface StudioState {
  projects: Project[];
  /** Session-level only — not persisted */
  lastOpenedProjectId: string | null;
  /** Where unsaved editor drafts live */
  drafts: Record<string, Project>;
}
