import type { Project } from "@/types";
import type { GeneratedProject } from "./types";

export class ExportValidationError extends Error {
  constructor(message: string, readonly details: string[] = []) {
    super(message);
    this.name = "ExportValidationError";
  }
}

export function validateProjectForExport(project: Project): void {
  const errors: string[] = [];
  const config = project?.config;
  if (!config) throw new ExportValidationError("Project configuration is missing.");
  if (!config.projectInfo?.name?.trim()) errors.push("Project name is required.");
  if (!Array.isArray(config.pages) || config.pages.length === 0) errors.push("At least one page is required.");
  if (!Array.isArray(config.sections)) errors.push("The section collection is invalid.");

  const sectionIds = new Set((config.sections ?? []).map((section) => section.id));
  const pagePaths = new Set<string>();
  for (const page of config.pages ?? []) {
    if (!page.id || !page.name) errors.push("Every page needs an id and name.");
    const path = page.path || "/";
    if (pagePaths.has(path)) errors.push(`Duplicate page path: ${path}`);
    pagePaths.add(path);
    for (const sectionId of page.sections ?? []) {
      if (!sectionIds.has(sectionId)) errors.push(`Page “${page.name}” references missing section ${sectionId}.`);
    }
  }
  if (errors.length) throw new ExportValidationError("The project is not ready to export.", errors);
}

function resolves(files: Map<string, string | Uint8Array>, importer: string, specifier: string): boolean {
  if (!specifier.startsWith(".") && !specifier.startsWith("@/")) return true;
  const base = specifier.startsWith("@/")
    ? `src/${specifier.slice(2)}`
    : new URL(specifier, `file:///${importer}`).pathname.slice(1);
  return [base, `${base}.ts`, `${base}.tsx`, `${base}.js`, `${base}.css`, `${base}/index.ts`, `${base}/index.tsx`]
    .some((candidate) => files.has(candidate));
}

export function validateGeneratedProject(generated: GeneratedProject): void {
  const { files } = generated;
  const errors: string[] = [];
  for (const required of ["package.json", "index.html", "src/main.tsx", "src/App.tsx", "src/data/site.ts", "vite.config.ts"]) {
    if (!files.has(required)) errors.push(`Missing required file: ${required}`);
  }

  const pkg = files.get("package.json");
  try {
    if (typeof pkg !== "string") throw new Error();
    const parsed = JSON.parse(pkg) as { scripts?: Record<string, string> };
    if (!parsed.scripts?.dev || !parsed.scripts?.build) errors.push("package.json must include dev and build scripts.");
  } catch {
    errors.push("package.json is not valid JSON.");
  }

  const forbiddenImport = /(katch-studio|@\/app\/|@\/pages\/editor|firebase|service-account)/i;
  const importPattern = /(?:import|export)\s+(?:type\s+)?(?:[^"']*?\s+from\s+)?["']([^"']+)["']/g;
  for (const [path, content] of files) {
    if (typeof content !== "string" || !/\.(?:ts|tsx|js|jsx)$/.test(path)) continue;
    importPattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = importPattern.exec(content))) {
      const specifier = match[1]!;
      if (forbiddenImport.test(specifier)) errors.push(`Forbidden internal import in ${path}: ${specifier}`);
      if (!resolves(files, path, specifier)) errors.push(`Unresolved import in ${path}: ${specifier}`);
    }
  }

  const forbiddenFiles = [...files.keys()].filter((path) =>
    /(^|\/)(\.env|\.env\.local|service-account\.json|.*\.(?:pem|key))$/i.test(path) && !path.endsWith(".env.example")
  );
  forbiddenFiles.forEach((path) => errors.push(`Secret-bearing file is not allowed: ${path}`));
  const secretPattern = /(-----BEGIN (?:RSA |EC )?PRIVATE KEY-----|"private_key"\s*:|"type"\s*:\s*"service_account"|\bghp_[A-Za-z0-9]{30,}|\bsk_live_[A-Za-z0-9]{16,})/;
  for (const [path, content] of files) {
    if (typeof content === "string" && secretPattern.test(content)) errors.push(`Possible secret detected in ${path}.`);
  }

  const pageFiles = [...files.keys()].filter((path) => path.startsWith("src/pages/") && path.endsWith(".tsx"));
  if (pageFiles.length !== generated.project.config.pages.length) {
    errors.push(`Expected ${generated.project.config.pages.length} generated pages, found ${pageFiles.length}.`);
  }

  if (errors.length) throw new ExportValidationError("Generated project validation failed.", errors);
}
