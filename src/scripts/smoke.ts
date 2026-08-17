/* ============================================================
   Smoke test — validates the core data pipeline without a browser:
   demo data, template→project cloning, duplication, deep merge.
   Run: npx esbuild src/scripts/smoke.ts --bundle --platform=node \
        --format=esm --alias:@=./src --loader:.jpg=dataurl --outfile=/tmp/smoke.mjs && node /tmp/smoke.mjs
   ============================================================ */

import { buildDemoProjects } from "@/data/demo";
import { createProjectFromTemplate, duplicateProject } from "@/lib/projectFactory";
import { TEMPLATES, getTemplate } from "@/data/templates";
import { SECTION_DEFINITIONS, SECTION_TYPES } from "@/features/sections/registry";
import { deepMerge, validateProject } from "@/utils/helpers";
import { projectForClientBranch } from "@/data/demoImages";
import { parseClientProject, resolveClientPage } from "@/client/projectLoader";

declare const process: { exit(code: number): void; cwd(): string };


/* Recursive deep-equal for JSON-safe structures (key order preserved) */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => deepEqual(v, b[i]));
  }
  if (a && b && typeof a === "object" && typeof b === "object") {
    const ka = Object.keys(a as object);
    const kb = Object.keys(b as object);
    return (
      ka.length === kb.length &&
      ka.every((k) => deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]))
    );
  }
  return false;
}

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
assert(TEMPLATES.length === 20, `20 templates registered (got ${TEMPLATES.length})`);
const cats = new Set(TEMPLATES.map((t) => t.category));
assert([...cats].sort().join(",") === "business,ecommerce,landing,portfolio,restaurant,saas", "all 6 categories covered");
assert(TEMPLATES.every((t) => t.defaultSections.every((s) => SECTION_DEFINITIONS[s])), "all template sections registered");
assert(TEMPLATES.every((t) => t.pages.length >= 1 && t.pages[0]!.name === "Home"), "every template has a Home page");
const ecomCount = TEMPLATES.filter((t) => t.category === "ecommerce").length;
const saasCount = TEMPLATES.filter((t) => t.category === "saas").length;
assert(ecomCount >= 4, `4+ e-commerce templates (${ecomCount})`);
assert(saasCount >= 4, `4+ SaaS templates (${saasCount})`);

console.log("\n7) E-commerce & SaaS projects");
for (const tpl of TEMPLATES.filter((t) => t.category === "ecommerce" || t.category === "saas")) {
  const pr = createProjectFromTemplate({ templateId: tpl.id, name: `Demo ${tpl.name}`, client: "Demo", language: "en" });
  const ids = new Set(pr.config.sections.map((s) => s.id));
  const orphan = pr.config.pages.flatMap((pg) => pg.sections).filter((id) => !ids.has(id));
  assert(orphan.length === 0, `${tpl.name}: no orphan section refs`);
  const prices = pr.config.sections.filter((s) => s.type === "pricing");
  const prods = pr.config.sections.filter((s) => s.type === "products");
  assert(tpl.category !== "saas" || prices.length >= 1, `${tpl.name}: has pricing section`);
  assert(tpl.category !== "ecommerce" || prods.length >= 1, `${tpl.name}: has products section`);
  assert(pr.config.pages.every((pg) => pg.sections.length > 0), `${tpl.name}: every page has sections`);
  /* variant wiring */
  if (tpl.sectionVariants?.hero) {
    const heroSec = pr.config.sections.find((s) => s.type === "hero");
    assert(heroSec?.variant === tpl.sectionVariants.hero, `${tpl.name}: hero variant applied`);
  }
}

console.log("\n8) Repeated section types (two product grids)");
const home = TEMPLATES.find((t) => t.id === "tpl-ecom-home")!;
const homePr = createProjectFromTemplate({ templateId: home.id, name: "Home Demo", client: "Demo", language: "en" });
const homeProds = homePr.config.sections.filter((s) => s.type === "products");
assert(homeProds.length === 2, `template with two product sections → 2 instances (${homeProds.length})`);
const homePage = homePr.config.pages[0]!;
const homePageProductRefs = homePage.sections.filter((id) => homePr.config.sections.find((s) => s.id === id)?.type === "products");
assert(homePageProductRefs.length === 2, "both product instances referenced by the home page");

console.log("\n9) Custom template passthrough");
const custom = structuredClone(TEMPLATES[0]!) as typeof TEMPLATES[0] & { id: string };
custom.id = "tpl-custom-test";
custom.name = "My Custom Template";
const customPr = createProjectFromTemplate({ templateId: custom.id, template: custom, name: "Custom Demo", client: "Demo", language: "en" });
assert(customPr.createdFrom === "tpl-custom-test", "factory accepts custom template objects");
assert(customPr.config.templateId === "tpl-custom-test", "project remembers the custom template id");

console.log("\n10) PWA assets present");
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
const pub = (f: string) => path.join(process.cwd(), "public", f);
assert(existsSync(pub("manifest.webmanifest")), "manifest exists");
assert(existsSync(pub("sw.js")), "service worker exists");
assert(existsSync(pub("icon-192.png")) && existsSync(pub("icon-512.png")) && existsSync(pub("icon-maskable-512.png")), "PWA icons exist");
const manifest = JSON.parse(readFileSync(pub("manifest.webmanifest"), "utf8"));
assert(manifest.name.includes("Katch Studio") && manifest.display === "standalone", "manifest: name + standalone");
assert(manifest.icons.some((i: { purpose?: string }) => i.purpose === "maskable"), "manifest: maskable icon");
assert(manifest.theme_color === "#0d100c", "manifest: dark theme color");

console.log("\n11) Section styles & variants resolve");const { resolveSectionStyles } = await import("@/website/renderer");
const st = resolveSectionStyles({ id: "x", type: "hero", hidden: false, content: {} } as never);
assert(st.variant === "default" && st.styles.spacing === "md" && st.styles.visibility.desktop, "style defaults resolve");
const st2 = resolveSectionStyles({ id: "x", type: "hero", variant: "editorial", hidden: false, content: {}, styles: { spacing: "xl" } } as never);
assert(st2.variant === "editorial" && st2.styles.spacing === "xl", "variant + style overrides resolve");
const allVariants = SECTION_TYPES.filter((t) => SECTION_DEFINITIONS[t].variants?.length);
assert(allVariants.length >= 10, `variants defined for 10+ section types (${allVariants.length})`);


console.log("\n11) JSON purity — projects must contain no undefined fields");
{
  /* Firestore rejects documents with undefined field values; a JSON
     round-trip that changes the object proves undefined (or non-JSON)
     fields are present. Every project must survive it untouched. */
  const allProjects = [...demos, ...TEMPLATES.flatMap((t) => [
    createProjectFromTemplate({ templateId: t.id, name: `P-${t.id}`, client: "Demo", language: "en" }),
  ])];
  let bad = 0;
  for (const pr of allProjects) {
    const roundTripped = JSON.parse(JSON.stringify(pr));
    if (!deepEqual(pr, roundTripped)) {
      bad++;
      console.error(`  ✗ ${pr.config.projectInfo.name}: JSON round-trip changed the project (undefined/non-JSON fields present)`);
    }
  }
  assert(bad === 0, `all ${allProjects.length} projects are JSON-pure (undefined-free) for Firestore`);
}

console.log("\n12) Standalone scaffold (real code generation)");
{
  const { buildScaffoldFiles } = await import("@/lib/scaffold");
  /* esbuild inlines the JSON import as an object; in the raw-file fallback it's a string */
  const rawCatalogue = (await import("@/features/export/catalogue.json")) as unknown;
  let cat: Record<string, string> = {};
  if (typeof rawCatalogue === "string") {
    cat = JSON.parse(rawCatalogue) as Record<string, string>;
  } else if (typeof (rawCatalogue as { default?: unknown }).default === "object") {
    cat = (rawCatalogue as { default: Record<string, string> }).default;
  } else {
    cat = rawCatalogue as Record<string, string>;
  }

  const files = await buildScaffoldFiles(looky, cat, { embed: false });
  const names = Object.keys(files);
  assert(Boolean(files["package.json"]), "package.json present");
  assert(Boolean(files["index.html"] && files["src/App.tsx"] && files["src/main.tsx"]), "app entry files present");
  assert(Boolean(files["src/data/website.json"]), "website.json data file present");
  assert(Boolean(files["src/website/WebsiteRenderer.tsx"] && files["src/features/sections/registry.ts"]), "website layer sources embedded");
  assert(Boolean(files["src/types/index.ts"]), "types index generated");
  const pkg = JSON.parse(files["package.json"]);
  assert(Boolean(pkg.dependencies?.react && pkg.devDependencies?.vite), "generated package.json has react + vite");
  const site = JSON.parse(files["src/data/website.json"]);
  assert(site.project?.name === "Looky Cakes", "website.json carries the project");
  const readme = files["README.md"];
  assert(readme.includes("npm run dev") && readme.includes("Looky Cakes"), "handover README written");
  assert(names.length >= 30, `30+ files generated (${names.length})`);
}

console.log("\n13) Template lifecycle (project → template → project)");
{
  const { projectToTemplate } = await import("@/lib/templateFromProject");
  const tpl = projectToTemplate(looky, "Looky Cakes Template");
  assert(tpl.id.startsWith("tpl-custom-"), "custom template id");
  assert(tpl.name === "Looky Cakes Template", "custom name applied");
  assert(tpl.category === "restaurant" && tpl.defaultSections.includes("hero"), "category + sections carried");
  assert(Boolean(tpl.theme && tpl.theme.colors.primary === looky.config.theme.colors.primary), "exact theme carried");
  assert(Boolean(tpl.defaultContent?.hero), "content carried");
  assert(tpl.pages.length === looky.config.pages.length, "page structure carried");
  assert(tpl.features.length > 0, "enabled features carried");

  /* Clone through the factory — the full round trip */
  const clone = createProjectFromTemplate({ templateId: tpl.id, template: tpl, name: "Clone Demo", client: "Demo", language: "en" });
  assert(clone.config.theme.colors.primary === looky.config.theme.colors.primary, "clone keeps the exact theme");
  const cloneHero = clone.config.sections.find((s) => s.type === "hero");
  const lookyHero = looky.config.sections.find((s) => s.type === "hero");
  assert(
    JSON.stringify(cloneHero?.content) === JSON.stringify(lookyHero?.content),
    "clone keeps the exact content"
  );
  const ids = new Set(clone.config.sections.map((s) => s.id));
  const orphan = clone.config.pages.flatMap((pg) => pg.sections).filter((id) => !ids.has(id));
  assert(orphan.length === 0, "clone: no orphan section refs");
}

console.log("\n12) ZIP export package");
{
  const { buildProjectZip, buildResolvedStructure, projectZipFilename } = await import("@/lib/exportZip");
  const structure = buildResolvedStructure(looky) as { project?: { name?: string }; pages?: unknown[] };
  assert(structure.project?.name === "Looky Cakes", "resolved structure carries the project name");
  assert(Array.isArray(structure.pages) && structure.pages.length === 4, "resolved structure lists all pages");

  const blob = await buildProjectZip(looky);
  assert(blob.size > 500, `zip blob has content (${blob.size} bytes)`);
  assert(projectZipFilename(looky) === "katch-website-looky-cakes.zip", "zip filename slugified");

  /* Re-open the zip and check its entries */
  const JSZip = (await import("jszip")).default;
  const bytes = (blob as unknown as { arrayBuffer?: () => Promise<ArrayBuffer> }).arrayBuffer
    ? await (blob as unknown as { arrayBuffer: () => Promise<ArrayBuffer> }).arrayBuffer()
    : Buffer.from(await (blob as unknown as { text: () => Promise<string> }).text());
  const zip = await JSZip.loadAsync(bytes);
  const entries = Object.keys(zip.files);
  assert(entries.includes("project.json") && entries.includes("website.json") && entries.includes("README.md"),
    `zip contains project.json + website.json + README.md (${entries.join(", ")})`);
  const projectJson = JSON.parse(await zip.file("project.json")!.async("string"));
  assert(projectJson.config?.projectInfo?.name === "Looky Cakes", "zipped project.json round-trips");
  const readme = await zip.file("README.md")!.async("string");
  assert(readme.includes("Looky Cakes"), "zipped README mentions the project");
}

console.log("\n14) Deployment — naming, fingerprints, commits, config shape");
{
  const { normalizeRepoName, isValidRepoName, PROVIDER_META, providerMeta } = await import("@/features/deploy/naming");
  const { contentFingerprint, pageHashes } = await import("@/features/deploy/fingerprint");
  const { describeCommit } = await import("@/features/deploy/commits");

  /* Repo naming */
  assert(normalizeRepoName("Looky Cakes") === "katch-looky-cakes", `“Looky Cakes” → ${normalizeRepoName("Looky Cakes")}`);
  assert(normalizeRepoName("  Bta3  7awa4y!!  ") === "katch-bta3-7awa4y", `specials/uppercase → ${normalizeRepoName("  Bta3  7awa4y!!  ")}`);
  assert(normalizeRepoName("حلويات", "ab12cd") === "katch-site-ab12cd", "Arabic-only name falls back to katch-site-{id}");
  assert(normalizeRepoName("Katch-Café & Co.") === "katch-cafe-co", `accents stripped → ${normalizeRepoName("Katch-Café & Co.")}`);
  assert(normalizeRepoName("katch-katch-double") === "katch-double", "katch- prefix not doubled");
  assert(isValidRepoName("katch-looky-cakes") && !isValidRepoName("Looky Cakes!") && !isValidRepoName("-bad"), "repo-name validation accepts kebab, rejects spaces/specials/leading hyphens");
  const longName = normalizeRepoName("a".repeat(300));
  assert(longName.length <= 100, `long names are capped at 100 chars (${longName.length})`);

  /* Provider meta */
  assert(PROVIDER_META.length === 2 && providerMeta("vercel").recommended, "Vercel is the default (recommended) provider");

  /* Fingerprint: same content → same hash; edits → different hash */
  const f1 = contentFingerprint(looky);
  const f2 = contentFingerprint(looky);
  assert(f1 === f2 && /^[0-9a-f]{8}$/.test(f1), `fingerprint deterministic (${f1})`);
  const clone = structuredClone(looky);
  (clone.config.sections.find((s) => s.type === "hero")!.content as Record<string, unknown>).title = "Changed headline";
  assert(contentFingerprint(clone) !== f1, "content change flips the fingerprint");

  /* Page hashes localise commits */
  const hashes = pageHashes(looky);
  const homeId = looky.config.pages[0].id;
  assert(typeof hashes[homeId] === "string" && hashes[homeId].length === 8, "per-page hashes computed for the home page");

  /* Commit messages */
  assert(describeCommit(looky) === "Initial Katch Studio deployment", "first deploy → initial commit message");
  const deployed = {
    provider: "vercel" as const,
    github: { branch: "main" },
    status: "live" as const,
    lastCommitId: "abc123",
    lastContentHash: f1,
    lastPageHashes: hashes,
  };
  assert(describeCommit(looky, deployed) === "Update website content", "same home page → generic update message");
  const changedHome = {
    ...deployed,
    lastPageHashes: { [homeId]: "deadbeef" },
  };
  assert(describeCommit(looky, changedHome) === `Update ${looky.config.pages[0].name} homepage`, "changed home page → named commit message");

  /* Deployment config shape: valid defaults, JSON-pure, duplicate stripped */
  const withDeployment = structuredClone(looky) as typeof looky & { deployment?: unknown; deploymentHistory?: unknown[] };
  withDeployment.deployment = {
    provider: "vercel",
    github: { branch: "main", repositoryName: "katch-looky-cakes", repositoryUrl: "https://github.com/katch-agency/katch-looky-cakes" },
    status: "live",
    productionUrl: "https://mock-looky-cakes.vercel.app",
    lastDeployedAt: new Date().toISOString(),
    lastCommitId: "mock-abc123",
    lastCommitMessage: "Initial Katch Studio deployment",
    lastContentHash: f1,
    lastPageHashes: hashes,
  };
  withDeployment.deploymentHistory = [
    { id: "h1", provider: "vercel", status: "live", commitId: "mock-abc123", commitMessage: "Initial Katch Studio deployment", url: "https://mock-looky-cakes.vercel.app", at: new Date().toISOString() },
  ];
  assert(deepEqual(withDeployment, JSON.parse(JSON.stringify(withDeployment))), "project with deployment attached is JSON-pure (no undefined)");

  const copy = duplicateProject(withDeployment as typeof looky);
  assert(!copy.deployment && !copy.deploymentHistory, "duplicated project starts deployment-free (fresh site)");

  /* Fresh projects carry no deployment key */
  const fresh = createProjectFromTemplate({ templateId: "tpl-rest-elegant", name: "Fresh", client: "", language: "en" });
  assert(!("deployment" in fresh), "new projects have no deployment field until deployed");
}

console.log("\n15) Client branch mode — JSON loading, routing, stable assets");
{
  const exported = projectForClientBranch(looky);
  const encoded = JSON.stringify(exported);
  assert(encoded.includes("/src/assets/demo/cakes-hero.jpg"), "branch export replaces build-specific demo image URL");
  const parsed = parseClientProject(JSON.parse(encoded), {
    "/src/assets/demo/cakes-hero.jpg": "/assets/cakes-hero-built.jpg",
  });
  const parsedHero = parsed.config.sections.find((section) => section.type === "hero");
  assert(JSON.stringify(parsedHero).includes("/assets/cakes-hero-built.jpg"), "client loader resolves stable source asset through Vite manifest");
  assert(resolveClientPage(parsed.config.pages, "/")?.name === "Home", "root URL resolves the home page");
  const secondary = parsed.config.pages.find((page) => page.path !== "/");
  assert(!secondary || resolveClientPage(parsed.config.pages, secondary.path)?.id === secondary.id, "configured page path resolves the matching page");
  assert(resolveClientPage(parsed.config.pages, "/does-not-exist") === undefined, "unknown URL resolves to client 404");
  let invalidRejected = false;
  try { parseClientProject({ hello: "world" }); } catch { invalidRejected = true; }
  assert(invalidRejected, "invalid project.json is rejected before rendering");
}

console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : failures + " CHECKS FAILED"}`);
process.exit(failures === 0 ? 0 : 1);
