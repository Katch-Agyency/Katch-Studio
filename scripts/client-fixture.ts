import { writeFile } from "node:fs/promises";
import { buildDemoProjects } from "@/data/demo";
import { projectForClientBranch } from "@/data/demoImages";

const output = process.argv[2];
if (!output) throw new Error("Output path required");
const project = buildDemoProjects().find((item) => item.config.projectInfo.name === "Looky Cakes");
if (!project) throw new Error("Looky Cakes fixture missing");
await writeFile(output, JSON.stringify(projectForClientBranch(project), null, 2));
