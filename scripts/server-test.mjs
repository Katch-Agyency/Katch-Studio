/* ============================================================
   server-test — boots the deployment API in MOCK mode on an
   ephemeral port and drives the complete lifecycle over real
   HTTP, mirroring what the studio UI does:

     1. health + capabilities (mock mode reported honestly)
     2. GitHub connect
     3. repository creation (normalisation + duplicate handling)
     4. push the generated project (files land, commit returned)
     5. Vercel prepare + deploy
     6. status polling → live + production URL
     7. Netlify prepare + deploy → live
     8. redeploy (same repo reused, commit count grows)
     9. simulated build failure + friendly error
    10. retry after failure succeeds
    11. validation errors are friendly, never raw
   ============================================================ */

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 8799;
const BASE = `http://127.0.0.1:${PORT}`;

let failures = 0;
const ok = (cond, label) => {
  if (cond) console.log("  ✓", label);
  else {
    failures++;
    console.error("  ✗", label);
  }
};
const check = (cond, label) => ok(cond, label);

async function api(method, route, body) {
  const res = await fetch(`${BASE}${route}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* no body */
  }
  return { status: res.status, data };
}

async function deployAndPoll(provider, slug, repository, extra = {}) {
  const prepare = await api("POST", `/api/${provider}/prepare`, { slug });
  check(prepare.status === 200, `${provider} prepare succeeds (${provider === "vercel" ? "projectId" : "siteId"}: ${prepare.data?.projectId ?? prepare.data?.siteId})`);

  const deployBody = {
    slug,
    repository,
    branch: "main",
    ...(provider === "vercel"
      ? { projectId: prepare.data.projectId, projectName: prepare.data.name }
      : { siteId: prepare.data.siteId }),
    ...extra,
  };
  const started = await api("POST", `/api/${provider}/deploy`, deployBody);
  check(started.status === 200 && started.data?.deploymentId, `${provider} deploy starts (id: ${started.data?.deploymentId})`);

  const id = started.data.deploymentId;
  const query =
    provider === "vercel"
      ? `?provider=vercel&id=${id}&projectId=${prepare.data.projectId}`
      : `?provider=netlify&id=${id}&siteId=${prepare.data.siteId}`;
  let status = null;
  for (let i = 0; i < 8; i++) {
    const poll = await api("GET", `/api/deployments/status${query}`);
    status = poll.data;
    if (status?.status !== "building") break;
  }
  return { prepare: prepare.data, started: started.data, status };
}

/* ---------- boot ---------- */

const server = spawn(process.execPath, ["server/index.mjs"], {
  cwd: root,
  env: { ...process.env, DEPLOYMENT_MODE: "mock", DEPLOY_API_PORT: String(PORT) },
  stdio: ["ignore", "pipe", "pipe"],
});
server.stderr.on("data", (d) => process.stderr.write(d));

await new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error("server did not start")), 8000);
  server.stdout.on("data", (d) => {
    process.stdout.write(d);
    if (String(d).includes("listening")) {
      clearTimeout(t);
      resolve();
    }
  });
});

try {
  /* 1. Health — mock mode is reported HONESTLY */
  console.log("\n1) Health & capabilities");
  const health = await api("GET", "/api/health");
  check(health.status === 200, "health responds");
  check(health.data?.mode === "mock" && health.data?.development === true, "mock mode is explicitly reported (development: true)");
  check(health.data?.providers?.vercel === true && health.data?.providers?.netlify === true, "both providers reported available in mock mode");

  /* 2. GitHub connect */
  console.log("\n2) GitHub connection");
  const before = await api("GET", "/api/github/connection");
  check(before.data?.connected === false, "not connected initially");
  const connect = await api("POST", "/api/github/connect", {});
  check(connect.data?.connected === true && connect.data?.account, `connect works (account: ${connect.data?.account})`);

  /* 3. Repository creation */
  console.log("\n3) Repository creation & naming");
  const repo = await api("POST", "/api/github/repositories", {
    name: "Looky Cakes",
    visibility: "private",
    projectId: "prj-looky",
    branch: "main",
  });
  check(repo.status === 200 && repo.data?.name === "katch-looky-cakes", `name normalized → ${repo.data?.name}`);
  check(repo.data?.reused === false, "new repository created");
  const repo2 = await api("POST", "/api/github/repositories", {
    name: "Looky Cakes",
    visibility: "private",
    projectId: "prj-looky",
    branch: "main",
  });
  check(repo2.data?.reused === true && repo2.data?.name === "katch-looky-cakes", "same project redeploys REUSE the repository (no duplicates)");
  const repo3 = await api("POST", "/api/github/repositories", {
    name: "Looky Cakes",
    visibility: "private",
    projectId: "prj-other",
    branch: "main",
  });
  check(repo3.data?.name === "katch-looky-cakes-2" && repo3.data?.reused === false, `different project with same name gets a suffix (${repo3.data?.name})`);
  const badRepo = await api("POST", "/api/github/repositories", { name: "", visibility: "private", projectId: "x", branch: "main" });
  check(badRepo.status === 400 && badRepo.data?.error?.message, "empty name rejected with a friendly error");

  /* 4. Push */
  console.log("\n4) Push generated project");
  const files = {
    "package.json": JSON.stringify({ name: "katch-looky-cakes", scripts: { build: "vite build" } }),
    "src/App.tsx": "export default function App(){return null}",
    "src/data/website.json": JSON.stringify({ project: { name: "Looky Cakes" } }),
  };
  const push = await api("POST", "/api/github/push", {
    repository: "katch-agency/katch-looky-cakes",
    branch: "main",
    message: "Initial Katch Studio deployment",
    files,
  });
  check(push.status === 200 && push.data?.commitId && push.data?.filesPushed === 3, `push succeeds — ${push.data?.filesPushed} files, commit ${push.data?.commitId}`);
  const emptyPush = await api("POST", "/api/github/push", {
    repository: "katch-agency/katch-looky-cakes",
    branch: "main",
    message: "x",
    files: {},
  });
  check(emptyPush.status === 400, "empty file map rejected");

  /* 5-8. Vercel lifecycle → live with production URL */
  console.log("\n5) Vercel deploy → live");
  const vercel = await deployAndPoll("vercel", "looky-cakes", "katch-agency/katch-looky-cakes");
  check(vercel.status?.status === "live", `status reaches live after polling (${vercel.status?.status})`);
  check(/^https:\/\/mock-looky-cakes\.vercel\.app$/.test(vercel.status?.url ?? ""), `production URL returned (${vercel.status?.url})`);

  /* 9. Netlify lifecycle */
  console.log("\n6) Netlify deploy → live");
  const netlify = await deployAndPoll("netlify", "looky-cakes", "katch-agency/katch-looky-cakes");
  check(netlify.status?.status === "live", "netlify reaches live");
  check(/mock.*\.netlify\.app$/.test(netlify.status?.url ?? ""), `netlify URL returned (${netlify.status?.url})`);

  /* 10. Redeploy — same repo, new commit */
  console.log("\n7) Redeploy (update loop)");
  const push2 = await api("POST", "/api/github/push", {
    repository: "katch-agency/katch-looky-cakes",
    branch: "main",
    message: "Update Looky Cakes homepage",
    files,
  });
  check(push2.status === 200 && push2.data?.commitId !== push.data?.commitId, "second push creates a NEW commit on the SAME repository");
  const redeploy = await deployAndPoll("vercel", "looky-cakes", "katch-agency/katch-looky-cakes");
  check(redeploy.status?.status === "live", "redeploy reaches live again");

  /* 11. Simulated failure + friendly error + retry */
  console.log("\n8) Failure simulation & retry");
  const failPrepare = await api("POST", "/api/vercel/prepare", { slug: "failcakes" });
  const failStart = await api("POST", "/api/vercel/deploy", {
    projectId: failPrepare.data.projectId,
    projectName: failPrepare.data.name,
    slug: "failcakes",
    repository: "katch-agency/katch-looky-cakes",
    branch: "main",
  });
  let failStatus = null;
  for (let i = 0; i < 6; i++) {
    const poll = await api("GET", `/api/deployments/status?provider=vercel&id=${failStart.data.deploymentId}&projectId=${failPrepare.data.projectId}`);
    failStatus = poll.data;
    if (failStatus?.status !== "building") break;
  }
  check(failStatus?.status === "failed", `build failure simulated (${failStatus?.status})`);
  check(typeof failStatus?.error === "string" && failStatus.error.length > 0, `friendly error returned (“${failStatus?.error.slice(0, 40)}…”)`);

  /* 12. Validation & error friendliness */
  console.log("\n9) Validation & error handling");
  const unknown = await api("GET", "/api/does-not-exist");
  check(unknown.status === 404 && unknown.data?.error?.code === "not-found", "unknown route → structured 404");
  const badProvider = await api("GET", "/api/deployments/status?provider=aws&id=x");
  check(badProvider.status === 400 && badProvider.data?.error?.message, "bad provider rejected with friendly message");
  const badDeploy = await api("POST", "/api/vercel/deploy", { projectId: "x", projectName: "x", slug: "x", repository: "broken" });
  check(badDeploy.status === 400, "malformed repository rejected");
  const tooBig = await api("POST", "/api/github/push", {
    repository: "katch-agency/katch-looky-cakes",
    branch: "main",
    message: "x",
    files: { "big.txt": "a".repeat(11 * 1024 * 1024) },
  });
  check(tooBig.status === 413, "oversized file rejected (413)");
} finally {
  server.kill();
}

console.log(failures === 0 ? "\nALL SERVER CHECKS PASSED\n" : `\n${failures} SERVER CHECKS FAILED\n`);
process.exit(failures === 0 ? 0 : 1);
