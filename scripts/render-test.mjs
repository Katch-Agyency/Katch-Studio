/* Render smoke test — bundles the REAL app with esbuild, mounts it once in
   jsdom and walks every route via in-process SPA navigation (one React
   instance, like a real browser session). */

import { JSDOM } from "jsdom";
import { build } from "esbuild";
import { pathToFileURL } from "node:url";
import path from "node:path";

const root = process.cwd();

await build({
  entryPoints: [path.join(root, "scripts/render-entry.tsx")],
  bundle: true,
  platform: "browser",
  format: "esm",
  outfile: "/tmp/katch-render-entry.mjs",
  alias: { "@": path.join(root, "src") },
  /* "file" loader (not dataurl): keeps project JSON in localStorage small so the
     5 MB jsdom quota never trips — images are just URL strings in the tests. */
  loader: { ".jpg": "file", ".png": "file" },
  /* Firebase is lazily imported only when VITE_FIREBASE_* is configured —
     keep it out of the test bundle (and it is never exercised in tests). */
  external: ["firebase", "firebase/*"],
  define: {
    "process.env.NODE_ENV": '"development"',
    /* Vite provides import.meta.env at build time; emulate an empty env so
       the store boots on the localStorage adapter during tests. */
    "import.meta.env": "{}",
  },
  logLevel: "silent",
  target: "es2020",
});

const dom = new JSDOM('<!doctype html><html class="dark"><body><div id="root"></div></body></html>', {
  url: "http://localhost/",
  pretendToBeVisual: true,
});
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.navigator = dom.window.navigator;
globalThis.localStorage = dom.window.localStorage;
globalThis.sessionStorage = dom.window.sessionStorage;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.HTMLInputElement = dom.window.HTMLInputElement;
globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
globalThis.MutationObserver = dom.window.MutationObserver;

const windowErrors = [];
dom.window.addEventListener("error", (e) => windowErrors.push(String(e.message).slice(0, 300)));
dom.window.addEventListener("unhandledrejection", (e) => windowErrors.push("rejection: " + String(e.reason).slice(0, 300)));

let failures = 0;
const ok = (cond, label) => {
  if (cond) console.log("  ✓", label);
  else {
    failures++;
    console.error("  ✗", label);
  }
};

await import(pathToFileURL("/tmp/katch-render-entry.mjs").href + "?t=" + Date.now());

async function waitFor(predicate, timeout = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (predicate()) return true;
    await new Promise((r) => setTimeout(r, 120));
  }
  return predicate();
}

const text = () => document.body.textContent;
const nav = (path) => dom.window.__TEST_NAV__(path);

console.log("\n1) Dashboard");
await waitFor(() => text().includes("Total Projects"));
ok(text().includes("Total Projects"), "stats render");
ok(text().includes("Looky Cakes"), "demo project listed");
ok(text().includes("Bta3 7awa4y"), "Arabic demo project listed");
ok(text().includes("New Project"), "CTA present");

console.log("\n2) Projects");
nav("/projects");
await waitFor(() => text().includes("All statuses")); // Projects-page-only marker
const rows = document.querySelectorAll("tbody tr").length;
ok(rows === 3, `3 project rows (got ${rows})`);
ok(text().includes("In Progress") && text().includes("Delivered"), "status indicators render");
ok(text().includes("Elegant Restaurant"), "template column renders");

console.log("\n3) New Project wizard");
nav("/projects/new");
await waitFor(() => text().includes("Tell us about the project"));
ok(text().includes("Tell us about the project"), "step 1 renders");
ok(text().includes("Restaurant") && text().includes("E-commerce"), "categories render");
nav("/projects/new?template=tpl-rest-elegant");
await waitFor(() => text().includes("Set up the brand"));
ok(text().includes("Set up the brand"), "template deep-link opens step 3");
ok(text().includes("Elegant Restaurant"), "template preselected");

console.log("\n3b) Full wizard click-through → project created");
nav("/projects"); // leave the wizard route so it remounts fresh
await waitFor(() => text().includes("All statuses"));
nav("/projects/new");
/* Same route component survives search-param changes, so wait for the
   step-1 input element itself — text alone can be stale. */
await waitFor(() => Boolean(document.querySelector("#np-name")));
const nameInput = document.querySelector("#np-name");
const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
valueSetter.call(nameInput, "Wizard Test Café");
nameInput.dispatchEvent(new window.Event("input", { bubbles: true }));
await new Promise((r) => setTimeout(r, 200));
const clickButton = async (label) => {
  const btn = [...document.querySelectorAll("button")].find((b) => b.textContent.includes(label));
  if (btn) btn.click();
  await new Promise((r) => setTimeout(r, 600));
};
await clickButton("Continue"); // → step 2 (template)
await waitFor(() => text().includes("Choose a starting template"));
ok(text().includes("Choose a starting template"), "step 2 reached");
/* Exercise the template preview dialog + real Use Template CTA */
await waitFor(() => [...document.querySelectorAll("button")].some((b) => b.textContent.trim() === "Use Template"));
const useBtn = [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "Use Template");
const previewBtn = [...document.querySelectorAll("button")].find((b) =>
  (b.getAttribute("aria-label") ?? "").startsWith("Preview ")
);
ok(Boolean(previewBtn), "template preview button found");
previewBtn?.click();
await waitFor(() => Boolean(document.querySelector("[role='dialog']")));
const dlg = document.querySelector("[role='dialog']");
ok(
  dlg && dlg.textContent.includes("Elegant Restaurant") && dlg.textContent.includes("Features"),
  "template preview dialog shows details"
);
const closeDialog = [...document.querySelectorAll("button")].find((b) => b.getAttribute("aria-label") === "Close dialog");
closeDialog?.click();
await new Promise((r) => setTimeout(r, 300));
useBtn?.click();
await new Promise((r) => setTimeout(r, 400));
await clickButton("Continue"); // → step 3 (brand & theme)
await waitFor(() => text().includes("Set up the brand"));
await clickButton("Continue"); // → step 4 (sections & features)
await waitFor(() => text().includes("Choose the building blocks"));
ok(text().includes("Choose the building blocks"), "step 4 reached");
await clickButton("Create Project");
await waitFor(() => text().includes("Wizard Test Café") && text().includes("Saved"), 10000);
const stored = JSON.parse(localStorage.getItem("katch-studio:projects:v1") ?? "[]");
const created = stored.find((p) => p.config.projectInfo.name === "Wizard Test Café");
ok(Boolean(created), "project created and persisted");
if (created) {
  ok(created.config.sections.length > 5, `created project has sections (${created.config.sections.length})`);
  ok(created.config.pages.length > 1, `created project has pages (${created.config.pages.length})`);
  ok(created.config.pages.every((pg) => pg.sections.length > 0), "every created page has sections");
  /* No orphan/unreferenced sections */
  const ids = new Set(created.config.sections.map((s) => s.id));
  const orphan = created.config.pages.flatMap((pg) => pg.sections).filter((id) => !ids.has(id));
  ok(orphan.length === 0, "no orphan section references after wizard filtering");
}

console.log("\n4) Editor + live preview (Looky Cakes)");
const saved = JSON.parse(localStorage.getItem("katch-studio:projects:v1") ?? "[]");
const lookyId = saved.find((p) => p.config.projectInfo.name === "Looky Cakes")?.id;
nav(`/editor/${lookyId}`);
await waitFor(() => text().includes("Signature Cakes"));
ok(text().includes("Saved"), "save state indicator");
ok(text().includes("Pages") && text().includes("Layers") && text().includes("Brand"), "editor structure & inspector tabs");
/* Structure tabs: Pages + Layers; Inspector tabs: Design, Content, Brand, Features, SEO */
const structNav = document.querySelector("nav[aria-label='Structure tabs']");
ok(Boolean(structNav), "structure tab strip exists");
if (structNav) {
  const labels = [...structNav.querySelectorAll("button")].map((b) => b.textContent.trim());
  ok(labels.includes("Pages") && labels.includes("Layers"), `structure tabs (${labels.join(", ")})`);
}
const inspNav = document.querySelector("nav[aria-label='Inspector tabs']");
ok(Boolean(inspNav), "inspector tab strip exists");
if (inspNav) {
  const labels = [...inspNav.querySelectorAll("button")].map((b) => b.textContent.trim());
  const expected = ["Design", "Content", "Brand", "Features", "SEO"];
  ok(expected.every((l) => labels.includes(l)), `all 5 inspector tabs (${labels.join(", ")})`);
}
/* Layers tree: sections listed (collapse/expand controls present) */
await waitFor(() =>
  [...document.querySelectorAll("button")].some((b) =>
    /^(Expand|Collapse) /.test(b.getAttribute("aria-label") ?? "")
  )
);
ok(
  [...document.querySelectorAll("button")].some((b) =>
    /^(Expand|Collapse) /.test(b.getAttribute("aria-label") ?? "")
  ),
  "layers tree lists sections"
);
ok(text().includes("Signature Cakes"), "preview renders menu content");
ok(text().includes("Order on WhatsApp"), "preview renders CTA content");
ok(text().includes("Chocolate Ganache"), "preview renders menu items");

console.log("\n5) Arabic RTL project preview");
const hawa4yId = saved.find((p) => p.config.projectInfo.name === "Bta3 7awa4y")?.id;
nav(`/editor/${hawa4yId}`);
await waitFor(() => text().includes("أشهى حواوشي في مصر"));
ok(text().includes("أشهى حواوشي في مصر"), "Arabic hero renders");
ok(Boolean(document.querySelector("[dir='rtl']")), "preview wrapper is RTL");
ok(text().includes("حواوشي لحمة بلدي"), "Arabic menu items render");

console.log("\n6) Library pages");
nav("/templates");
await waitFor(() => document.querySelectorAll("img").length >= 20);
ok(document.querySelectorAll("img").length >= 20, "20 template preview images");
ok(text().includes("Elegant Restaurant") && text().includes("Developer Portfolio"), "classic template names");
ok(text().includes("Fashion Editorial") && text().includes("AI Product"), "e-commerce & SaaS templates listed");
ok(text().includes("E-commerce") && text().includes("SaaS"), "new category filters shown");
ok(text().includes("New from project"), "create-template-from-project button present");
/* Open the create-from-project modal */
const newFromProject = [...document.querySelectorAll("button")].find((b) => b.textContent.includes("New from project"));
newFromProject?.click();
await waitFor(() => text().includes("Create template from a project"));
ok(text().includes("Create template from a project"), "project→template modal opens");
const cancelBtn = [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "Cancel");
cancelBtn?.click();
await new Promise((r) => setTimeout(r, 300));
nav("/sections");
await waitFor(() => text().includes("Reservation"));
ok(text().includes("Navbar") && text().includes("Reservation") && text().includes("Case Studies"), "section library");
nav("/design-system");
await waitFor(() => text().includes("Typography"));
ok(text().includes("Typography") && text().includes("Badges & Status"), "design system");
nav("/settings");
await waitFor(() => text().includes("Restore demo data"));
ok(text().includes("Workspace") && text().includes("Restore demo data"), "settings");
ok(text().includes("Storage & Sync") && text().includes("Local browser storage"), "storage status shows local adapter when no Firebase env");

console.log("\n6b) Export modal — scaffold + share");
nav(`/editor/${lookyId}`);
await waitFor(() => text().includes("Signature Cakes"));
const exportBtn = [...document.querySelectorAll("button")].find((b) => b.textContent.includes("Export"));
exportBtn?.click();
await waitFor(() => text().includes("Standalone React/Vite project"));
ok(text().includes("Standalone React/Vite project"), "real code-generation export row");
ok(text().includes("Share for review"), "share-for-review row");
const closeBtn = [...document.querySelectorAll("button")].find((b) => b.getAttribute("aria-label") === "Close dialog");
closeBtn?.click();
await new Promise((r) => setTimeout(r, 300));
/* Save-as-template in the editor menu */
const moreBtn = [...document.querySelectorAll("button")].find((b) => b.getAttribute("aria-label") === "More actions");
moreBtn?.click();
await waitFor(() => text().includes("Save as template"));
ok(text().includes("Save as template"), "editor menu has Save as template");
const menuSave = [...document.querySelectorAll("button")].find((b) => b.textContent.includes("Save as template"));
menuSave?.click();
await waitFor(() => text().includes("Saved as template"));
ok(text().includes("Saved as template"), "save-as-template toast confirms");
/* the template landed in the store */
const customTpls = JSON.parse(localStorage.getItem("katch-studio:customTemplates:v1") ?? "[]");
ok(customTpls.some((t) => t.name.includes("Looky Cakes")), "custom template persisted");

console.log("\n7) Full-screen preview");
nav(`/preview/${lookyId}`);
await waitFor(() => text().includes("Cakes that make moments"));
ok(text().includes("Cakes that make moments"), "preview page renders hero");

console.log("\n8) Editor interaction (hide a section)");
nav(`/editor/${lookyId}`);
/* Wait for the editor (not the previous preview page) AND its sections list */
await waitFor(() => text().includes("Export") && !text().includes("Back to Editor"));
await waitFor(() =>
  [...document.querySelectorAll("button")].some((b) => (b.getAttribute("aria-label") ?? "").startsWith("Hide "))
);
/* Let lazy panels settle, then query the button fresh — React re-renders
   detach stale nodes and a click on a detached node is silently ignored. */
await new Promise((r) => setTimeout(r, 400));
const hideBtn = [...document.querySelectorAll("button")].find((b) =>
  (b.getAttribute("aria-label") ?? "").startsWith("Hide ")
);
if (hideBtn) {
  hideBtn.click();
  await waitFor(() => text().includes("Hidden"));
  ok(text().includes("Hidden"), "hidden section flagged");
  /* the save-state pill cycles Unsaved→Saving→Saved; assert the durable outcome */
  await waitFor(() => text().includes("Saved"));
  ok(text().includes("Saved"), "autosave cycle completed back to Saved");
} else {
  ok(false, "hide button found");
}

console.log("\n8b) Variants, undo/redo, preview mode");
{
  /* Select the hero section in the layers tree */
  const heroRow = [...document.querySelectorAll("button")].find(
    (b) => b.textContent.trim() === "Hero" && b.closest("[aria-label='Structure panel']")
  );
  heroRow?.click();
  await waitFor(() => text().includes("Variant"));
  ok(text().includes("Variant"), "Design inspector shows variant control");

  /* Change variant → config updated */
  const variantBtn = [...document.querySelectorAll("button")].find(
    (b) => b.textContent.includes("Centered") && b.textContent.includes("Text beside") === false && text().includes("Section settings")
  );
  const centeredBtn = [...document.querySelectorAll("button")].find((b) => b.textContent.trim().startsWith("Centered"));
  centeredBtn?.click();
  await waitFor(() => {
    const drafts = JSON.parse(localStorage.getItem("katch-studio:drafts:v1") ?? "{}");
    const hero = drafts[lookyId]?.config.sections.find((s) => s.type === "hero");
    return hero?.variant === "centered";
  });
  let drafts = JSON.parse(localStorage.getItem("katch-studio:drafts:v1") ?? "{}");
  let heroSec = drafts[lookyId]?.config.sections.find((s) => s.type === "hero");
  ok(heroSec?.variant === "centered", "variant change persisted to the config");

  /* Undo → variant reverted */
  dom.window.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "z", ctrlKey: true, bubbles: true }));
  await waitFor(() => {
    const d = JSON.parse(localStorage.getItem("katch-studio:drafts:v1") ?? "{}");
    const h = d[lookyId]?.config.sections.find((s) => s.type === "hero");
    return !h?.variant || h.variant === "split";
  }, 4000);
  drafts = JSON.parse(localStorage.getItem("katch-studio:drafts:v1") ?? "{}");
  heroSec = drafts[lookyId]?.config.sections.find((s) => s.type === "hero");
  ok(!heroSec?.variant || heroSec.variant === "split", "Ctrl+Z undid the variant change");

  /* Redo → variant back */
  dom.window.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "z", ctrlKey: true, shiftKey: true, bubbles: true }));
  await waitFor(() => {
    const d = JSON.parse(localStorage.getItem("katch-studio:drafts:v1") ?? "{}");
    const h = d[lookyId]?.config.sections.find((s) => s.type === "hero");
    return h?.variant === "centered";
  }, 4000);
  drafts = JSON.parse(localStorage.getItem("katch-studio:drafts:v1") ?? "{}");
  heroSec = drafts[lookyId]?.config.sections.find((s) => s.type === "hero");
  ok(heroSec?.variant === "centered", "Ctrl+Shift+Z redid the variant change");

  /* Undo again + revert to split to keep demo data tidy */
  dom.window.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "z", ctrlKey: true, bubbles: true }));
  await new Promise((r) => setTimeout(r, 900));

  /* Preview mode hides the panels */
  const previewModeBtn = [...document.querySelectorAll("[aria-label='Editor mode'] button")].find(
    (b) => b.getAttribute("aria-selected") === "false" && b.textContent.includes("Preview")
  );
  previewModeBtn?.click();
  await waitFor(() => !document.querySelector("nav[aria-label='Structure tabs']"));
  ok(!document.querySelector("nav[aria-label='Structure tabs']"), "preview mode hides the structure panel");
  ok(!document.querySelector("nav[aria-label='Inspector tabs']"), "preview mode hides the inspector");
  ok(text().includes("Signature Cakes"), "preview still renders the website");
  const editModeBtn = [...document.querySelectorAll("[aria-label='Editor mode'] button")].find(
    (b) => b.getAttribute("aria-selected") === "false"
  );
  editModeBtn?.click();
  await waitFor(() => Boolean(document.querySelector("nav[aria-label='Structure tabs']")));
  ok(Boolean(document.querySelector("nav[aria-label='Structure tabs']")), "back to edit mode");
}

console.log("\n9) Persistence (draft autosave written)");
await waitFor(() => {
  const drafts = JSON.parse(localStorage.getItem("katch-studio:drafts:v1") ?? "{}");
  return Boolean(drafts[lookyId]);
});
const drafts = JSON.parse(localStorage.getItem("katch-studio:drafts:v1") ?? "{}");
ok(Boolean(drafts[lookyId]), "autosave draft persisted to localStorage");

console.log("\n9b) Command palette (Ctrl+K)");
dom.window.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }));
await waitFor(() => Boolean(document.querySelector("input[placeholder='Search Katch Studio…']")));
ok(Boolean(document.querySelector("input[placeholder='Search Katch Studio…']")), "palette opens with Ctrl+K");
ok(text().includes("Create a new project"), "palette lists actions");
ok(text().includes("Duplicate “"), "palette lists project commands");
dom.window.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
await waitFor(() => !document.querySelector("input[placeholder='Search Katch Studio…']"));
ok(!document.querySelector("input[placeholder='Search Katch Studio…']"), "palette closes with Escape");

console.log("\n10) Deployed build without Firebase → local-mode banner");
{
  /* Fresh DOM on a REMOTE host: a deployed build in local mode must scream about it */
  const dom2 = new JSDOM('<!doctype html><html class="dark"><body><div id="root"></div></body></html>', {
    url: "https://katch-studio.vercel.app/",
    pretendToBeVisual: true,
  });
  globalThis.window = dom2.window;
  globalThis.document = dom2.window.document;
  globalThis.navigator = dom2.window.navigator;
  globalThis.localStorage = dom2.window.localStorage;
  globalThis.HTMLElement = dom2.window.HTMLElement;
  await import(pathToFileURL("/tmp/katch-render-entry.mjs").href + "?banner=" + Date.now());
  await waitFor(() => document.body.textContent.includes("Local mode"));
  ok(document.body.textContent.includes("Local mode"), "banner visible on remote host in local mode");
  ok(Boolean(document.querySelector("[role='note']")), "banner marked as a note region");
}

console.log("\n11) Runtime errors during the whole session");
ok(windowErrors.length === 0, windowErrors.length === 0 ? "no window errors" : `${windowErrors.length} errors`);
windowErrors.slice(0, 5).forEach((e) => console.log("  ·", e.split("\n")[0].slice(0, 160)));

console.log(failures === 0 ? "\nALL RENDER CHECKS PASSED" : `\n${failures} CHECKS FAILED`);
process.exit(failures === 0 ? 0 : 1);
