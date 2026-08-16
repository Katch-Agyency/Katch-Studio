/* Generates real standalone fixtures from the current demo projects, then
   installs and production-builds Looky Cakes. Arabic is statically validated
   by the same generator and checked for RTL metadata. */
import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const output = "/tmp/katch-standalone-export";
await build({
  entryPoints: [path.join(root, "scripts/export-fixture.ts")],
  outfile: "/tmp/katch-export-fixture.mjs",
  bundle: true,
  platform: "node",
  format: "esm",
  alias: { "@": path.join(root, "src") },
  loader: { ".jpg": "dataurl", ".png": "dataurl" },
  logLevel: "silent",
  target: "node20",
});

const generated = execFileSync(process.execPath, ["/tmp/katch-export-fixture.mjs", output], { encoding: "utf8" });
console.log(generated.trim());

const looky = path.join(output, "looky-cakes");
execFileSync("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund"], { cwd: looky, stdio: "inherit" });
execFileSync("npm", ["run", "build"], { cwd: looky, stdio: "inherit" });

const dirs = generated.trim().split("\n").map((line) => line.split("|"));
const arabicSlug = dirs.find((parts) => parts[1] === "ar")?.[0];
if (!arabicSlug) throw new Error("Arabic fixture was not generated");
const arabicHtml = readFileSync(path.join(output, arabicSlug, "index.html"), "utf8");
const arabicSite = readFileSync(path.join(output, arabicSlug, "src/data/site.ts"), "utf8");
if (!arabicHtml.includes('dir="rtl"') || !arabicSite.includes('"language": "ar"')) {
  throw new Error("Arabic export did not preserve RTL/language settings");
}
console.log("✓ Looky Cakes standalone production build passed");
console.log("✓ Arabic standalone export preserved RTL settings");
