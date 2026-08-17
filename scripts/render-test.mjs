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

/* ============================================================
   Deployment API stub — an in-memory mock of the real backend
   (same contract as server/index.mjs in mock mode), so the
   Deploy tab's full lifecycle can be exercised in jsdom:
   connect → repo → push → provider → poll → live/failed.
   Failure injection: repository names containing "fail" fail
   the build on the second status poll (mirrors the server).
   ============================================================ */
import { gunzipSync } from "node:zlib";
const deployState = { connected: false, repos: new Map(), deploys: new Map(), seq: 0 };
const stubReadBody = (b) => {
  if (b == null) return {};
  const buf = typeof b === "string" ? Buffer.from(b, "utf8") : Buffer.from(b);
  try {
    return JSON.parse(buf.toString("utf8"));
  } catch {
    return JSON.parse(gunzipSync(buf).toString("utf8"));
  }
};
const stubJson = (data, status = 200) => ({ ok: status < 400, status, json: async () => data });
globalThis.fetch = async (url, init = {}) => {
  const path = String(url).replace(/^https?:\/\/[^/]+/, "");
  const method = String(init.method ?? "GET").toUpperCase();
  const body = stubReadBody(init.body);

  if (path === "/api/health") {
    return stubJson({
      ok: true,
      mode: "mock",
      development: true,
      github: { connected: deployState.connected, account: deployState.connected ? "katch-agency" : null, installUrl: null },
      providers: { vercel: true, netlify: true },
    });
  }
  if (path === "/api/github/connection") {
    return stubJson({ connected: deployState.connected, account: deployState.connected ? "katch-agency" : null, mode: "mock", installUrl: null });
  }
  if (path === "/api/github/connect" && method === "POST") {
    deployState.connected = true;
    return stubJson({ connected: true, account: "katch-agency", mode: "mock" });
  }
  if (path === "/api/github/repositories" && method === "POST") {
    const existing = deployState.repos.get(body.name);
    if (!existing) deployState.repos.set(body.name, { name: body.name, owner: "katch-agency", commits: [] });
    return stubJson({
      id: body.name,
      name: body.name,
      owner: "katch-agency",
      url: `https://github.com/katch-agency/${body.name}`,
      reused: Boolean(existing),
    });
  }
  if (path === "/api/github/push" && method === "POST") {
    const repoName = String(body.repository).split("/")[1] ?? "repo";
    const repo = deployState.repos.get(repoName) ?? { name: repoName, owner: "katch-agency", commits: [] };
    deployState.seq += 1;
    const commitId = `mock-commit-${deployState.seq}`;
    repo.commits.unshift(commitId);
    return stubJson({
      commitId,
      url: `https://github.com/katch-agency/${repoName}/commit/${commitId}`,
      filesPushed: Object.keys(body.files ?? {}).length,
    });
  }
  if (path === "/api/vercel/prepare" && method === "POST") {
    const name = `katch-${body.slug}`;
    return stubJson({ projectId: `mock-vercel-${body.slug}`, name, accountId: "mock-team", dashboardUrl: `https://vercel.com/mock-team/${name}` });
  }
  if (path === "/api/netlify/prepare" && method === "POST") {
    const name = `katch-${body.slug}`;
    return stubJson({
      siteId: `mock-netlify-${body.slug}`,
      name,
      url: `https://mock-${body.slug}.netlify.app`,
      dashboardUrl: `https://app.netlify.com/sites/${name}`,
    });
  }
  if ((path === "/api/vercel/deploy" || path === "/api/netlify/deploy") && method === "POST") {
    deployState.seq += 1;
    const id = `mock-dep-${deployState.seq}`;
    deployState.deploys.set(id, { provider: path.includes("netlify") ? "netlify" : "vercel", repository: body.repository, polls: 0, slug: body.slug });
    return stubJson({ deploymentId: id, url: null });
  }
  if (path.startsWith("/api/deployments/status")) {
    const q = new URLSearchParams(path.split("?")[1] ?? "");
    const d = deployState.deploys.get(q.get("id") ?? "");
    if (!d) return stubJson({ error: { code: "deployment-not-found", message: "The deployment does not exist." } }, 404);
    d.polls += 1;
    const fails = /fail/.test(String(d.repository ?? ""));
    if (fails && d.polls >= 2) {
      return stubJson({ status: "failed", url: null, previewUrl: null, error: "Build failed: simulated error (Development Mode)." });
    }
    if (d.polls >= 3) {
      const domain = d.provider === "vercel" ? "vercel" : "netlify";
      return stubJson({ status: "live", url: `https://mock-${d.slug}.${domain}.app`, previewUrl: null });
    }
    return stubJson({ status: "building", url: null, previewUrl: null });
  }
  /* Anything else (image embeds during generation, etc.) → not ok */
  return stubJson({ error: { code: "not-found", message: "Not found in test stub." } }, 404);
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

console.log("\n13) Deployment tab — full lifecycle (mock backend via stubbed API)");
{
  nav(`/editor/${lookyId}`);
  await waitFor(() => text().includes("Export") && !text().includes("Back to Editor"));

  /* Open the Deploy tab */
  const deployTab = [...document.querySelectorAll("nav[aria-label='Inspector tabs'] button")].find((b) => b.textContent.trim() === "Deploy");
  deployTab?.click();
  await waitFor(() => text().includes("Connect GitHub"));
  ok(text().includes("Not connected"), "first deploy: GitHub shown as not connected");
  ok(text().includes("Development Mode"), "mock backend clearly labelled Development Mode");
  ok(text().includes("Vercel") && text().includes("Netlify") && text().includes("Recommended"), "provider cards render (Vercel recommended)");
  const deployBtn = () => [...document.querySelectorAll("button")].find((b) => b.textContent.includes("Deploy Project"));
  ok(deployBtn()?.disabled === true, "Deploy disabled until GitHub is connected");

  /* Connect GitHub */
  [...document.querySelectorAll("button")].find((b) => b.textContent.includes("Connect GitHub"))?.click();
  await waitFor(() => text().includes("Connected as katch-agency"), 10000);
  ok(text().includes("Connected as katch-agency"), "Connect GitHub completes (mock account)");
  await waitFor(() => deployBtn()?.disabled === false, 10000);
  ok(deployBtn()?.disabled === false, "Deploy enabled after connect");

  /* ---- Failure path: repo name containing "fail" fails the build ---- */
  const setInput = (input, value) => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    setter.call(input, value);
    input.dispatchEvent(new window.Event("input", { bubbles: true }));
  };
  const repoInput = document.querySelector("input[aria-label='Repository name']");
  setInput(repoInput, "katch-fail-cakes");
  await new Promise((r) => setTimeout(r, 200));
  deployBtn()?.click();
  await waitFor(() => text().includes("Retry Deployment"), 25000);
  ok(text().includes("Retry Deployment"), "build failure shows Retry Deployment");
  ok(text().includes("Build failed"), "friendly failure message shown");
  ok(text().includes("Failed"), "history records the failed attempt");

  /* ---- Retry with a corrected name → live ---- */
  const repoInput2 = document.querySelector("input[aria-label='Repository name']");
  setInput(repoInput2, "katch-looky-cakes");
  await new Promise((r) => setTimeout(r, 200));
  [...document.querySelectorAll("button")].find((b) => b.textContent.includes("Retry Deployment"))?.click();
  await waitFor(() => text().includes("Open Website"), 30000);
  ok(text().includes("Open Website"), "retry reaches LIVE with production URL");
  ok(text().includes("mock-looky-cakes.vercel.app"), "production URL displayed");
  ok(text().includes("Deployment History"), "history section renders");
  ok(text().includes("Deployed version is up to date"), "freshly deployed content shows no changes pending");

  /* Deployment metadata persisted to the draft (autosave is debounced — wait for it) */
  await waitFor(() => {
    const draftCheck = JSON.parse(localStorage.getItem("katch-studio:drafts:v1") ?? "{}");
    const dep = draftCheck[lookyId]?.deployment;
    return dep?.status === "live" && Boolean(dep?.productionUrl) && dep?.github?.repositoryName === "katch-looky-cakes";
  }, 10000);
  const draftCheck = JSON.parse(localStorage.getItem("katch-studio:drafts:v1") ?? "{}");
  const dep = draftCheck[lookyId]?.deployment;
  ok(dep?.status === "live" && dep?.productionUrl && dep?.github?.repositoryName === "katch-looky-cakes", "deployment config persisted (status/url/repo)");
  await waitFor(() => (JSON.parse(localStorage.getItem("katch-studio:drafts:v1") ?? "{}")[lookyId]?.deploymentHistory ?? []).length >= 2, 10000);
  const historyCheck = JSON.parse(localStorage.getItem("katch-studio:drafts:v1") ?? "{}");
  ok((historyCheck[lookyId]?.deploymentHistory ?? []).length >= 2, "deployment history persisted (failed + live entries)");

  /* ---- Edit → Changes detected → Deploy Changes ---- */
  const nameBtn = [...document.querySelectorAll("header button")].find((b) => b.textContent.trim().startsWith("Looky Cakes"));
  nameBtn?.click();
  await waitFor(() => Boolean(document.querySelector("input[aria-label='Project name']")));
  setInput(document.querySelector("input[aria-label='Project name']"), "Renamed Cakes");
  document.querySelector("input[aria-label='Project name']").dispatchEvent(new window.FocusEvent("focusout", { bubbles: true }));
  await waitFor(() => text().includes("Changes detected"), 15000);
  ok(text().includes("Changes detected"), "content change detected against the deployed version");
  ok(text().includes("Deploy Changes"), "Deploy Changes CTA shown");
  [...document.querySelectorAll("button")].find((b) => b.textContent.includes("Deploy Changes"))?.click();
  await waitFor(() => {
    const d = JSON.parse(localStorage.getItem("katch-studio:drafts:v1") ?? "{}");
    return (d[lookyId]?.deploymentHistory ?? []).length >= 3 && d[lookyId]?.deployment?.lastCommitMessage !== "Initial Katch Studio deployment";
  }, 30000);
  const finalDraft = JSON.parse(localStorage.getItem("katch-studio:drafts:v1") ?? "{}");
  ok((finalDraft[lookyId]?.deploymentHistory ?? []).length >= 3, "redeploy appended history (no new repository)");
  ok(finalDraft[lookyId]?.deployment?.lastCommitMessage === "Update website content", "redeploy commit message describes the update");
  ok(finalDraft[lookyId]?.deployment?.status === "live", "redeploy back to live");
}

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
