import type { Project } from "@/types";
import { generateStandaloneProject } from "./generateProject";
import type { ExportOptions, ExportResult, ProgressCallback } from "./types";
import { validateGeneratedProject, validateProjectForExport } from "./validateExport";

export async function exportProjectZip(
  project: Project,
  options: ExportOptions,
  onProgress?: ProgressCallback
): Promise<ExportResult> {
  const total = 6;
  onProgress?.({ phase: "validating", label: "Validating project", completed: 0, total });
  validateProjectForExport(project);

  const generated = await generateStandaloneProject(project, options, onProgress);
  validateGeneratedProject(generated);

  onProgress?.({ phase: "zip", label: "Creating ZIP archive", completed: 5, total });
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  const root = zip.folder(generated.rootName);
  if (!root) throw new Error("Could not create the ZIP project folder.");
  for (const [path, content] of generated.files) root.file(path, content);
  root.file("export-report.json", JSON.stringify({
    generatedAt: new Date().toISOString(),
    project: project.config.projectInfo.name,
    pages: project.config.pages.length,
    sections: project.config.sections.filter((section) => !section.hidden).length,
    warnings: generated.warnings,
  }, null, 2));

  const blob = await zip.generateAsync(
    { type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } },
    (metadata) => onProgress?.({
      phase: "zip",
      label: `Creating ZIP archive (${Math.round(metadata.percent)}%)`,
      completed: 5,
      total,
    })
  );
  onProgress?.({ phase: "ready", label: "Ready to download", completed: total, total });
  return { archiveName: generated.archiveName, blob, warnings: generated.warnings, fileCount: generated.files.size + 1 };
}

export function downloadExport(result: ExportResult): void {
  const url = URL.createObjectURL(result.blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = result.archiveName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
