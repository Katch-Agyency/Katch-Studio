/* ============================================================
   Smoke test — validates the core data pipeline without a browser:
   demo data, template→project cloning, duplication, deep merge.
   Run: npx esbuild src/scripts/smoke.ts --bundle --platform=node \
        --format=esm --alias:@=./src --loader:.jpg=dataurl --outfile=/tmp/smoke.mjs && node /tmp/smoke.mjs
   ============================================================ */

import { buildDemoProjects } from "@/data/demo";
import { createProjectFromTemplate, duplicateProject } from "@/lib/projectFactory";
import { TEMPLATES, getTemplate } from "@/data/templates";
import { SECTION_DEFINITIONS } from "@/features/sections/registry";
import { deepMerge, validateProject } from "@/utils/helpers";

declare const process: { exit(code: number): void };

let failures = 0;
function assert(cond: boolean, label: string) {
  if (cond) console.log("  ✓", label);
  else {
    failures++;
    console.error("  ✗", label);
  }
}

console.log("\n1) Demo data");
const demos = buildDemoProjects();
assert(demos.length === 3, "three demo projects exist");
const looky = demos.find((p) => p.config.projectInfo.name === "Looky Cakes")!;
assert(Boolean(looky), "Looky Cakes present");
assert(looky.status === "in_progress", "Looky Cakes is in progress");
assert(looky.config.pages.length === 4, "Looky Cakes has 4 pages");
assert(looky.config.sections.length >= 10, "Looky Cakes has 10+ sections");
const hero = looky.config.sections.find((s) => s.type === "hero")!;
assert(((hero.content as { title?: string }).title ?? "").includes("Cakes"), "hero content customized");
assert(looky.config.brand.whatsapp.startsWith("+20"), "brand whatsapp set");
const hawa4y = demos.find((p) => p.config.projectInfo.name === "Bta3 7awa4y")!;
assert(hawa4y.config.projectInfo.language === "ar", "Bta3 7awa4y is Arabic");
assert(hawa4y.config.theme.fonts.heading === "kufi", "Arabic font applied");
const menu = hawa4y.config.sections.find((s) => s.type === "menu")!;
assert(JSON.stringify(menu.content).includes("حواوشي"), "Arabic menu content present");

console.log("\n2) Project integrity (pages ↔ sections linkage)");
for (const p of demos) {
  const ids = new Set(p.config.sections.map((s) => s.id));
  const orphanRefs = p.config.pages.flatMap((pg) => pg.sections).filter((id) => !ids.has(id));
  assert(orphanRefs.length === 0, `${p.config.projectInfo.name}: no orphan section refs`);
  const unreferenced = p.config.sections.filter((s) => !p.config.pages.some((pg) => pg.sections.includes(s.id)));
  assert(unreferenced.length === 0, `${p.config.projectInfo.name}: no unreferenced sections`);
}

console.log("\n3) Template → project cloning (template never mutated)");
const tpl = getTemplate("tpl-rest-elegant")!;
const tplJson = JSON.stringify(tpl);
const fresh = createProjectFromTemplate({
  templateId: "tpl-rest-elegant",
  name: "Test Café",
  client: "Test Client",
  language: "en",
  brand: { businessName: "Test Café", whatsapp: "+20 100 000 0000" },
});
assert(JSON.stringify(tpl) === tplJson, "template object untouched by cloning");
assert(fresh.config.templateId === tpl.id, "project remembers source template");
assert(fresh.config.projectInfo.name === "Test Café", "project name set");
assert(fresh.config.theme.mode === "light", "elegant theme is light");
assert(fresh.config.sections.every((s) => Boolean(SECTION_DEFINITIONS[s.type])), "all sections registered");
assert(fresh.config.features.some((f) => f.id === "whatsapp" && f.enabled), "template features enabled by default");
assert(fresh.config.pages.every((pg) => pg.sections.length > 0), "every page has sections");

console.log("\n4) Duplication");
const copy = duplicateProject(looky);
assert(copy.id !== looky.id, "new id");
assert(copy.config.projectInfo.name.includes("Copy"), "name marked as copy");
assert(copy.config.projectInfo.client === "", "client reset");
assert(copy.status === "draft", "status reset to draft");
assert(copy.config.sections.length === looky.config.sections.length, "sections carried over");
assert(copy.config.theme.colors.primary === looky.config.theme.colors.primary, "theme carried over");
assert(JSON.stringify(copy.config.pages.map((p) => p.name)) === JSON.stringify(looky.config.pages.map((p) => p.name)), "page structure carried over");

console.log("\n5) Deep merge & validation");
const merged = deepMerge({ a: 1, b: { c: 2, d: [1] } }, { b: { c: 9 }, e: "x" });
assert(JSON.stringify(merged) === JSON.stringify({ a: 1, b: { c: 9, d: [1] }, e: "x" }), "deep merge semantics");
assert(validateProject({ config: { projectInfo: { name: "", category: "x" } } }) !== null, "missing name invalid");
assert(validateProject(fresh) === null, "valid project passes validation");

console.log("\n6) Templates");
assert(TEMPLATES.length === 12, "12 templates registered");
const cats = new Set(TEMPLATES.map((t) => t.category));
assert([...cats].sort().join(",") === "business,landing,portfolio,restaurant", "4 MVP categories covered");
assert(TEMPLATES.every((t) => t.defaultSections.every((s) => SECTION_DEFINITIONS[s])), "all template sections registered");
assert(TEMPLATES.every((t) => t.pages.length >= 1 && t.pages[0]!.name === "Home"), "every template has a Home page");

console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : failures + " CHECKS FAILED"}`);
process.exit(failures === 0 ? 0 : 1);
