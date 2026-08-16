import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildDemoProjects } from "@/data/demo";
import { generateStandaloneProject } from "@/features/export/generateProject";
import { exportProjectZip } from "@/features/export/exportProject";
import { validateGeneratedProject, validateProjectForExport } from "@/features/export/validateExport";

const outputRoot = process.argv[2] || "/tmp/katch-standalone-export";
await rm(outputRoot, { recursive: true, force: true });

const demos = buildDemoProjects();
const selected = [
  demos.find((project) => project.config.projectInfo.name === "Looky Cakes"),
  demos.find((project) => project.config.projectInfo.language === "ar"),
].filter((project): project is NonNullable<typeof project> => Boolean(project));

for (const project of selected) {
  validateProjectForExport(project);
  const generated = await generateStandaloneProject(project, { includeAssets: true, includeReadme: true });
  validateGeneratedProject(generated);
  const projectRoot = path.join(outputRoot, generated.rootName);
  for (const [file, content] of generated.files) {
    const target = path.join(projectRoot, file);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content);
  }
  if (project === selected[0]) {
    const archive = await exportProjectZip(project, { includeAssets: true, includeReadme: true });
    const bytes = new Uint8Array(await archive.blob.arrayBuffer());
    if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) throw new Error("Generated download is not a ZIP archive");
    await writeFile(path.join(outputRoot, archive.archiveName), bytes);
  }
  console.log(`${generated.rootName}|${project.config.projectInfo.language}|${generated.files.size}|${generated.warnings.length}`);
}
