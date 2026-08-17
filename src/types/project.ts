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
  /** Deployment linkage — set once the project is deployed the first time */
  deployment?: DeploymentConfig;
  /** Ordered (newest first) record of every deployment attempt — rollback-ready */
  deploymentHistory?: DeploymentRecord[];
}

/* ============================================================
   Deployment — the project's permanent link to its GitHub
   repository and hosting provider (Katch maintenance loop).
   Contains NO secrets: only ids, names and URLs. Tokens live
   server-side only.
   ============================================================ */

export type DeploymentProviderType = "vercel" | "netlify";

export type DeploymentStatus =
  | "not-deployed"
  | "preparing"
  | "generating"
  | "github"
  | "building"
  | "deploying"
  | "live"
  | "failed";

export interface DeploymentGithubInfo {
  repositoryId?: string;
  repositoryName?: string;
  repositoryUrl?: string;
  owner?: string;
  branch: string;
}

export interface DeploymentConfig {
  provider: DeploymentProviderType;
  github: DeploymentGithubInfo;
  /** Provider-side project/site id (Vercel project id / Netlify site id) */
  providerProjectId?: string;
  providerProjectName?: string;
  /** The in-flight or latest deployment id on the provider */
  deploymentId?: string;
  status: DeploymentStatus;
  /** Production URL — https://… once live */
  productionUrl?: string;
  /** Latest provider deployment URL (unique per deploy) */
  previewUrl?: string;
  /** Link to the provider's dashboard for this project/site */
  providerDashboardUrl?: string;
  /** ISO timestamp */
  lastDeployedAt?: string;
  lastCommitId?: string;
  lastCommitMessage?: string;
  /** Fingerprint of the content at the last successful deployment */
  lastContentHash?: string;
  /** Per-page fingerprints at the last deploy — used to localise commit messages */
  lastPageHashes?: Record<string, string>;
  error?: string;
}

export interface DeploymentRecord {
  id: string;
  provider: DeploymentProviderType;
  status: "live" | "failed";
  commitId?: string;
  commitMessage?: string;
  url?: string;
  error?: string;
  /** ISO timestamp */
  at: string;
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
