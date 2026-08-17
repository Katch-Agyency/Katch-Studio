/* Temporarily builds the real repository as a client branch, then restores the
   Studio configuration and any existing public/project.json. */
import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const configPath = path.join(root, "katch.config.json");
const projectPath = path.join(root, "public/project.json");
const originalConfig = readFileSync(configPath, "utf8");
const hadProject = existsSync(projectPath);
const originalProject = hadProject ? readFileSync(projectPath) : null;

try {
  await build({
    entryPoints: [path.join(root, "scripts/client-fixture.ts")],
    outfile: "/tmp/katch-client-fixture.mjs",
    bundle: true,
    platform: "node",
    format: "esm",
    alias: { "@": path.join(root, "src") },
    loader: { ".jpg": "dataurl", ".png": "dataurl" },
    logLevel: "silent",
    target: "node20",
  });
  execFileSync(process.execPath, ["/tmp/katch-client-fixture.mjs", projectPath], { stdio: "inherit" });
  writeFileSync(configPath, JSON.stringify({ katch_visibility: false, project_config_path: "/project.json" }, null, 2) + "\n");
  execFileSync("npm", ["run", "build"], { cwd: root, stdio: "inherit" });

  const builtProject = JSON.parse(readFileSync(path.join(root, "dist/project.json"), "utf8"));
  if (builtProject.config?.projectInfo?.name !== "Looky Cakes") throw new Error("Client project was not copied to dist");
  const html = readFileSync(path.join(root, "dist/index.html"), "utf8");
  const entry = html.match(/<script[^>]+src="([^"]+\.js)"/)?.[1];
  if (!entry) throw new Error("Built client entry was not found");
  const initialChunk = readFileSync(path.join(root, "dist", entry.replace(/^\//, "")), "utf8");
  if (/firebase\/firestore|Production Workspace|Total Projects/.test(initialChunk)) {
    throw new Error("Initial client bundle contains Studio/Firebase implementation");
  }
  console.log("✓ Client mode production build passed");
  console.log("✓ public/project.json copied and readable");
  console.log("✓ Initial client bundle excludes Studio/Firebase implementation");
} finally {
  writeFileSync(configPath, originalConfig);
  if (hadProject && originalProject) writeFileSync(projectPath, originalProject);
  else rmSync(projectPath, { force: true });
}
