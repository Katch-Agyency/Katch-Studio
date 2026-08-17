import type { PageConfig, Project, ProjectConfig } from "@/types";

function isProjectConfig(value: unknown): value is ProjectConfig {
  if (!value || typeof value !== "object") return false;
  const config = value as Partial<ProjectConfig>;
  return Boolean(
    config.projectInfo?.name &&
    config.brand &&
    config.theme &&
    Array.isArray(config.pages) &&
    Array.isArray(config.sections) &&
    Array.isArray(config.features)
  );
}

/** Accept the existing full Project export. ProjectConfig-only JSON is also
 * accepted as a convenience, while the full Project remains recommended. */
export function parseClientProject(value: unknown, bundledAssets: Record<string, string> = {}): Project {
  if (value && typeof value === "object" && isProjectConfig((value as { config?: unknown }).config)) {
    return localizeBundledAssets(value as Project, bundledAssets);
  }
  if (isProjectConfig(value)) {
    return localizeBundledAssets({
      id: "client-project",
      config: value,
      status: "delivered",
      createdAt: new Date(0).toISOString(),
      updatedAt: new Date(0).toISOString(),
      createdFrom: value.templateId || "client-config",
    }, bundledAssets);
  }
  throw new Error("project.json is not a valid Katch Project configuration.");
}

function localizeBundledAssets<T>(value: T, bundledAssets: Record<string, string>): T {
  if (typeof value === "string") {
    const clean = value.split("?")[0]!;
    return (bundledAssets[clean] ?? value) as T;
  }
  if (Array.isArray(value)) return value.map((item) => localizeBundledAssets(item, bundledAssets)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .map(([key, item]) => [key, localizeBundledAssets(item, bundledAssets)])
    ) as T;
  }
  return value;
}

function normalizePath(path: string): string {
  const clean = path.trim().split(/[?#]/)[0] || "/";
  const withSlash = clean.startsWith("/") ? clean : `/${clean}`;
  return withSlash.length > 1 ? withSlash.replace(/\/+$/, "") : "/";
}

export function resolveClientPage(pages: PageConfig[], pathname: string): PageConfig | undefined {
  const requested = normalizePath(pathname);
  return pages.find((page, index) => normalizePath(index === 0 && !page.path ? "/" : page.path) === requested)
    ?? (requested === "/" ? pages[0] : undefined);
}
