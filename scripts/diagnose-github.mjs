/* ============================================================
   Katch Studio — GitHub/Vercel/Netlify credentials diagnostic.

   One command, no npm dependencies (Node 20+ only). It reads the
   same .env values the deployment server reads, exercises the
   REAL server code paths (shared modules, no duplicated auth
   logic), and tests them against the live provider APIs.

   Usage (from the repo root, where your .env lives):
     node scripts/diagnose-github.mjs
   Or point at a specific file:
     node scripts/diagnose-github.mjs --env "H:\path\to\.env"

   Read-only by design: it never writes, never stores, and never
   prints any secret value. The installation probe mints one
   short-lived installation token and lists repositories with it —
   the token is discarded immediately and never shown.
   ============================================================ */

import { readFileSync, existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { GithubBackend } from "../server/lib/github.mjs";
import {
  inspectGithubKeyConfig,
  inspectProviderTokenConfig,
  normalizeAppSlug,
  normalizePrivateKey,
  parseEnvFile,
  validatePrivateKey,
} from "../server/lib/credentials.mjs";

/* ------------------------------------------------------------ */
/* Report helpers — plain markers, no emoji.                     */
/* ------------------------------------------------------------ */
let failures = 0;
function ok(msg) { console.log(`  [OK]   ${msg}`); }
function fail(msg) { failures += 1; console.log(`  [FAIL] ${msg}`); }
function warn(msg) { console.log(`  [WARN] ${msg}`); }
function info(msg) { console.log(`  [INFO] ${msg}`); }
function section(title) {
  console.log(`\n${"─".repeat(60)}\n${title}\n${"─".repeat(60)}`);
}

async function fetchJson(url, headers, timeoutMs = 15000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers, signal: ctrl.signal, redirect: "follow" });
    let data = null;
    try { data = await res.json(); } catch { /* non-JSON body */ }
    return { status: res.status, data };
  } catch (err) {
    if (err?.name === "AbortError") return { status: 0, data: null, error: "timed out" };
    return { status: 0, data: null, error: String(err?.cause?.code ?? err?.message ?? err) };
  } finally {
    clearTimeout(t);
  }
}

/* ------------------------------------------------------------ */
async function main() {
  const argIndex = process.argv.indexOf("--env");
  const envPath = argIndex !== -1 && process.argv[argIndex + 1]
    ? resolve(process.argv[argIndex + 1])
    : resolve(".env");

  console.log("Katch Studio — deployment credentials diagnostic");
  console.log(`Looking at: ${envPath}`);

  if (!existsSync(envPath)) {
    fail(`No .env file found at ${envPath}.`);
    info("Run this from the katch-studio root (where .env lives),\n       or pass --env \"C:\\path\\to\\.env\".");
    process.exitCode = 1;
    return;
  }

  const rawText = readFileSync(envPath, "utf8").replace(/\r\n/g, "\n");
  const env = parseEnvFile(rawText);

  const appId = env.GITHUB_APP_ID ?? "";
  const slugRaw = env.GITHUB_APP_SLUG ?? "";
  const keyRaw = env.GITHUB_APP_PRIVATE_KEY ?? "";
  const pat = env.GITHUB_PAT ?? "";
  const vercelToken = env.VERCEL_TOKEN ?? "";
  const netlifyToken = env.NETLIFY_AUTH_TOKEN ?? "";
  const mode = (env.DEPLOYMENT_MODE ?? "").toLowerCase() || "(unset → auto)";

  const slug = normalizeAppSlug(slugRaw);
  const key = normalizePrivateKey(keyRaw);

  /* ---------------- Forensic facts (structure only, no secrets) ---------------- */
  section("0. Why does the server see a different key than .env?");
  const facts = inspectGithubKeyConfig({ rawEnvText: rawText, osEnv: process.env });
  if (facts.osEnvShadowing) {
    fail(
      `A Windows/system environment variable named GITHUB_APP_PRIVATE_KEY exists (${facts.osEnvLength} chars) and SHADOWS the .env file.`
    );
    info("  dotenv NEVER overrides a variable already set in the OS environment — so the");
    info("  server reads the OS copy (likely an old truncated value from setx/System");
    info("  Properties — setx truncates at 1024 characters, cutting the key in half).");
    info("  Fix — delete it in PowerShell, then CLOSE and reopen the terminal:");
    info('    [Environment]::SetEnvironmentVariable("GITHUB_APP_PRIVATE_KEY", $null, "User")');
    info('    [Environment]::SetEnvironmentVariable("GITHUB_APP_PRIVATE_KEY", $null, "Machine")  # admin PowerShell');
    info("  Also check System Properties → Environment Variables for the same name. Restart the server after.");
  } else if (facts.duplicateDefinitions > 0) {
    fail(
      `GITHUB_APP_PRIVATE_KEY is defined ${facts.duplicateDefinitions} times in .env (lines ${facts.definitionLineNumbers.join(", ")}) — the LAST definition wins.`
    );
    info("  Fix: delete every definition except one correct quoted block.");
  } else if (facts.definitionLineNumbers.length === 0) {
    warn("No GITHUB_APP_PRIVATE_KEY= line found in this .env (it may come from elsewhere).");
  } else if (!facts.firstDefinitionQuoted) {
    fail(`The key on line ${facts.definitionLineNumbers[0]} is NOT wrapped in double quotes.`);
    info("  dotenv reads ONLY that single line (BEGIN without END) — exactly the");
    info("  \"no-footer\" error. Even if the rest of the key sits on the following lines,");
    info("  it is ignored.");
  } else {
    ok(
      `Key definition on line ${facts.definitionLineNumbers[0]} is double-quoted (${facts.firstDefinitionBlockLines} line block).`
    );
  }

  let keyFileOk = false;
  const keyFilePath = (env.GITHUB_APP_PRIVATE_KEY_FILE ?? "").trim();
  if (keyFilePath) {
    const abs = resolve(keyFilePath);
    if (!existsSync(abs)) {
      fail(`GITHUB_APP_PRIVATE_KEY_FILE points to a file that does not exist: ${abs}`);
      info("  The server just showed (ENOENT) for the same reason. Copy the downloaded .pem");
      info("  there (or fix the path). If Notepad saved it as <name>.pem.txt, rename it.");
    } else {
      try {
        const size = statSync(abs).size;
        ok(`GITHUB_APP_PRIVATE_KEY_FILE found (${size} bytes) — it takes precedence over GITHUB_APP_PRIVATE_KEY.`);
        keyFileOk = true;
      } catch {
        fail(`GITHUB_APP_PRIVATE_KEY_FILE exists but is unreadable: ${abs}`);
      }
    }
  }

  const explicitMode = (env.DEPLOYMENT_MODE ?? "").trim().toLowerCase();
  const githubOk = Boolean((env.GITHUB_APP_ID && (env.GITHUB_APP_PRIVATE_KEY || keyFileOk)) || env.GITHUB_PAT);
  const providerOk = Boolean(env.VERCEL_TOKEN || env.NETLIFY_AUTH_TOKEN);
  if (explicitMode === "mock") {
    warn("DEPLOYMENT_MODE=mock is set — the server will SIMULATE deployments.");
    info("  Set DEPLOYMENT_MODE=live (or delete the line) to use the real APIs.");
  } else if (explicitMode === "live") {
    ok("DEPLOYMENT_MODE=live — real APIs are forced.");
  } else if (githubOk && providerOk) {
    ok("Auto mode resolves to LIVE (GitHub + provider credentials present).");
  } else if (githubOk && !providerOk) {
    fail("Auto mode resolves to MOCK: no provider token found — VERCEL_TOKEN (or NETLIFY_AUTH_TOKEN) is missing from .env.");
    info("  This is why your server switched from live to mock. Restore the token line and restart.");

    const pt = inspectProviderTokenConfig({ rawEnvText: rawText, osEnv: process.env });
    const shadowed = [pt.vercel, pt.netlify].find((f) => f.osEnvShadowing);
    if (shadowed) {
      const name = shadowed === pt.vercel ? "VERCEL_TOKEN" : "NETLIFY_AUTH_TOKEN";
      fail(`  └ CAUSE: an OS-level environment variable named ${name} exists (${shadowed.osEnvLength} chars) and SHADOWS the .env file.`);
      info("    dotenv NEVER overrides OS variables — even an EMPTY one blocks the file value.");
      info(`    Fix: [Environment]::SetEnvironmentVariable("${name}", $null, "User")  → close/reopen all terminals → restart.`);
    } else {
      const swallowName = [["VERCEL_TOKEN", env.VERCEL_TOKEN, pt.vercel], ["NETLIFY_AUTH_TOKEN", env.NETLIFY_AUTH_TOKEN, pt.netlify]]
        .find(([, parsedVal, f]) => f.definedInFile && !f.lastDefinitionEmpty && !parsedVal)?.[0];
      if (swallowName) {
        fail(`  └ CAUSE: ${swallowName} is physically in .env, but the parser swallowed it — an unterminated quoted block above it (most likely the GITHUB_APP_PRIVATE_KEY block missing its closing double quote) consumes every line below it.`);
        info('    Fix: make sure the quoted key block ends with a closing " on its own line, then restart.');
      } else {
      const lastEmpty = [pt.vercel, pt.netlify].find((f) => f.lastDefinitionEmpty);
      if (lastEmpty) {
        const name = lastEmpty === pt.vercel ? "VERCEL_TOKEN" : "NETLIFY_AUTH_TOKEN";
        const line = lastEmpty.definitionLines[lastEmpty.definitionLines.length - 1];
        fail(`  └ CAUSE: the LAST ${name} definition in .env (line ${line}) is EMPTY — dotenv keeps only the last definition.`);
        info("    Fix: delete the empty definition line(s), keep exactly one line with the real token.");
      } else {
        const dup = [pt.vercel, pt.netlify].find((f) => f.duplicateDefinitions > 1);
        if (dup) {
          const name = dup === pt.vercel ? "VERCEL_TOKEN" : "NETLIFY_AUTH_TOKEN";
          fail(`  └ CAUSE: ${name} is defined ${dup.duplicateDefinitions} times (lines ${dup.definitionLines.join(", ")}) — the last one wins.`);
        } else if (!pt.vercel.definedInFile && !pt.netlify.definedInFile) {
          fail("  └ CAUSE: neither token is defined in the .env this script reads (repo root). Check the file location — the server reads ONLY <project-root>\\.env.");
        }
      }
      }
    }
  } else if (!githubOk && providerOk) {
    warn("Auto mode resolves to MOCK: GitHub credentials are missing (provider token present).");
  } else {
    warn("Auto mode resolves to MOCK: neither GitHub nor provider credentials found.");
  }

  /* ---------------- Local format checks ---------------- */
  section(`1. Local .env format checks   (mode: ${mode})`);

  if (env.GITHUB_APP_ID === undefined && env.GITHUB_PAT === undefined) {
    fail("Neither GITHUB_APP_ID nor GITHUB_PAT found in .env — the server cannot connect to GitHub at all.");
  }

  if (appId) {
    if (!/^\d+$/.test(appId)) {
      fail(`GITHUB_APP_ID is "${appId}" — it must be the NUMERIC App ID shown on the app's General settings page (not the app name).`);
      if (/[\uFEFF]/.test(appId)) info("A hidden BOM character was detected — re-save .env as UTF-8 WITHOUT BOM.");
    } else {
      ok(`GITHUB_APP_ID present and numeric (${appId.length} digits).`);
    }
  } else if (!pat) {
    fail("GITHUB_APP_ID is missing.");
  }

  if (slug) {
    if (slug !== slugRaw) {
      warn(`GITHUB_APP_SLUG contains "${slugRaw}" — the server normalizes it automatically, but the recommended stored value is the bare slug:`);
      info(`  GITHUB_APP_SLUG=${slug}`);
    } else {
      ok(`GITHUB_APP_SLUG present ("${slug}").`);
    }
  } else {
    warn("GITHUB_APP_SLUG is missing — installUrl will be null until it is set.");
    info("  Add: GITHUB_APP_SLUG=katch-studio-projects   (the tail of https://github.com/apps/..., no URL prefix).");
  }

  if (pat && !appId && !keyRaw) {
    ok("Using GITHUB_PAT instead of a GitHub App.");
  }

  if (keyRaw) {
    /* truncation = BEGIN/END exist in the FILE but the parser (same
       behavior as dotenv) only saw the first line → unquoted paste */
    const truncated = rawText.includes("-----END") && !key.includes("-----END");
    const hadEscapedNewlines = keyRaw.includes("\\n") && key.includes("\n");

    if (truncated) {
      fail("GITHUB_APP_PRIVATE_KEY is TRUNCATED — the key was pasted across multiple lines WITHOUT surrounding double quotes.");
      info("  Fix: wrap the whole key in double quotes, exactly like this:");
      info('  GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----');
      info("  MIIEpAIBAAKCAQEA...   (all the middle lines, one per line)");
      info('  -----END RSA PRIVATE KEY-----"');
    } else if (hadEscapedNewlines) {
      warn('The key uses escaped "\\n" text instead of real line breaks.');
      info("  The server now normalizes this automatically (JWT signing will still work),");
      info("  but fixing .env to real line breaks inside double quotes is the cleaner form.");
    }

    const check = validatePrivateKey(key);
    if (check.ok) {
      const bits = check.keyType === "rsa" && check.bits ? ` (${check.bits} bit)` : "";
      ok(`GITHUB_APP_PRIVATE_KEY parses as a valid ${check.keyType.toUpperCase()}${bits} key.`);
    } else {
      const reason =
        check.reason === "missing" ? "missing" :
        check.reason === "no-header" ? "no PEM header found" :
        check.reason === "no-footer" ? "truncated — no END line" :
        "unparsable (corrupted paste, smart quotes, or stray characters)";
      fail(`GITHUB_APP_PRIVATE_KEY is invalid: ${reason}.`);
      info("  Fix: re-download the .pem from the GitHub App, open it in Notepad, copy everything,");
      info('       and paste it into .env inside double quotes with real line breaks.');
    }
  } else if (!pat) {
    fail("GITHUB_APP_PRIVATE_KEY is missing.");
  }

  /* ---------------- JWT generation (local, no network) ---------------- */
  section("2. GitHub App JWT generation (local)");

  const backend = new GithubBackend({ appId, appPrivateKey: keyRaw, appSlug: slugRaw, pat });
  if (appId && key) {
    try {
      const jwt = backend.appJwt();
      const segments = jwt.split(".");
      let claims = null;
      try {
        claims = JSON.parse(Buffer.from(segments[1], "base64url").toString("utf8"));
      } catch { /* decode failure */ }
      if (segments.length === 3 && claims) {
        const lifetime = Number(claims.exp ?? 0) - Number(claims.iat ?? 0);
        const skewOk = Number(claims.iat ?? 0) <= Math.floor(Date.now() / 1000);
        const lifetimeOk = lifetime > 0 && lifetime <= 600;
        if (lifetimeOk && skewOk && String(claims.iss) === String(appId)) {
          ok(`JWT generated: RS256, iss=${claims.iss}, lifetime ${lifetime}s (GitHub max 600s), iat skew ok.`);
        } else {
          fail(`JWT claims invalid: iss=${claims?.iss}, lifetime=${lifetime}s.`);
        }
      } else {
        fail("JWT generation produced a malformed token.");
      }
    } catch (err) {
      const code = err?.code ?? "unknown";
      fail(`JWT generation failed (${code}): ${err?.message ?? err}`);
    }
  }

  /* ---------------- Live GitHub checks ---------------- */
  section("3. Live GitHub checks");

  if (!appId && !pat) {
    info("No GitHub credentials — live checks skipped.");
  } else {
    try {
      const conn = await backend.connection();
      if (conn.connected) {
        const who = conn.mode === "pat" ? `PAT authenticated as "${conn.account}"` : `App authenticated (slug: ${conn.app?.slug ?? "?"})`;
        ok(`GitHub authentication successful — ${who}.`);
        if (conn.mode === "app") {
          if (conn.account) ok(`App installed on: ${conn.account}`);
          if (conn.installUrl) info(`Install page: ${conn.installUrl}`);

          /* installation token → repository access (read-only probe) */
          try {
            const token = await backend.installationToken();
            const repos = await fetchJson("https://api.github.com/installation/repositories", {
              Authorization: `Bearer ${token}`,
              Accept: "application/vnd.github+json",
              "User-Agent": "katch-studio-diagnose",
              "X-GitHub-Api-Version": "2022-11-28",
            });
            if (repos.status === 200) {
              const names = (Array.isArray(repos.data?.repositories) ? repos.data.repositories : [])
                .slice(0, 12)
                .map((r) => r?.name ?? "?");
              ok(`Installation token works — ${repos.data?.total_count ?? 0} accessible repository/repositories${names.length ? ` (e.g. ${names.join(", ")})` : ""}.`);
            } else if (repos.status === 403) {
              fail("Installation token lacks the required repository permissions (403).");
              info("  Fix: on the GitHub App → Permissions & events → set Contents RW, Administration RW, Metadata RO, then reinstall the app.");
            } else if (repos.status === 0) {
              warn(`Could not reach api.github.com (${repos.error}).`);
            } else {
              warn(`Unexpected response listing repositories: ${repos.status}`);
            }
          } catch (err) {
            const code = err?.code ?? "unknown";
            fail(`Installation token failed (${code}): ${err?.message ?? err}`);
          }
        }
      } else if (conn.installationRequired) {
        warn("Authentication works, but the GitHub App has NO installation yet.");
        info(`  Fix: open ${conn.installUrl ?? "https://github.com/settings/installations"} and install it on your account (All repositories).`);
      } else {
        warn(`GitHub reported: connected=false (${conn.hint ?? conn.mode ?? "unknown"}).`);
      }
    } catch (err) {
      const code = err?.code ?? "unknown";
      const status = err?.status ?? "?";
      if (code === "github-key-invalid" || code === "github-app-id-invalid") {
        fail(`GitHub check aborted — configuration error (${code}): ${err.message}`);
      } else if (code === "github-auth-rejected") {
        fail("GitHub REJECTED the app JWT (401) — the private key does not match this App ID.");
        info("  Causes: the key was regenerated at some point (old key is dead), the key belongs to a");
        info("         different GitHub App, or GITHUB_APP_ID points at a different app.");
        info("  Fix: GitHub App → Settings → General → Private keys → Generate a private key,");
        info("       download the fresh .pem, paste it into .env (real line breaks, double quotes),");
        info("       make sure GITHUB_APP_ID is the App ID on that same page, then restart the server.");
        info("  NOTE: generating a new key invalidates all previous keys — the .env and the App must");
        info("        hold the same CURRENT key.");
      } else if (code === "github-app-forbidden") {
        fail(`GitHub blocked the app (${status}) — it may be suspended. Check its settings page.`);
      } else if (status === 0) {
        warn(`Could not reach api.github.com — check your internet connection.`);
      } else {
        fail(`GitHub check failed (${status}, ${code}): ${err.message}`);
      }
    }
  }

  /* ---------------- Providers ---------------- */
  section("4. Provider checks");

  if (vercelToken) {
    const res = await fetchJson("https://api.vercel.com/v2/user", { Authorization: `Bearer ${vercelToken}` });
    if (res.status === 200) {
      ok(`VERCEL_TOKEN works — Vercel user "${res.data?.user?.username ?? res.data?.user?.email ?? "?"}".`);
    } else if (res.status === 403) {
      fail("VERCEL_TOKEN was rejected by Vercel (403) — regenerate it in Vercel → Settings → Tokens.");
    } else if (res.status === 0) {
      warn(`Could not reach api.vercel.com (${res.error}).`);
    } else {
      warn(`Unexpected Vercel response: ${res.status}`);
    }
  } else {
    info("VERCEL_TOKEN not set — Vercel deploy unavailable. Add it: Vercel → Account Settings → Tokens.");
  }

  if (netlifyToken) {
    const res = await fetchJson("https://api.netlify.com/api/v1/user", { Authorization: `Bearer ${netlifyToken}` });
    if (res.status === 200) {
      ok(`NETLIFY_AUTH_TOKEN works — Netlify user "${res.data?.full_name ?? res.data?.email ?? "?"}".`);
    } else if (res.status === 401) {
      fail("NETLIFY_AUTH_TOKEN was rejected (401) — regenerate it in Netlify → User settings → Applications.");
    } else if (res.status === 0) {
      warn(`Could not reach api.netlify.com (${res.error}).`);
    } else {
      warn(`Unexpected Netlify response: ${res.status}`);
    }
  } else {
    info("NETLIFY_AUTH_TOKEN not set — Netlify is optional; Vercel alone is enough.");
  }

  /* ---------------- Verdict ---------------- */
  section("5. Verdict");
  if (failures === 0) {
    console.log("  All checks passed. If /api/health still shows github.connected:false,");
    console.log("  the server was started BEFORE you fixed .env — restart it:");
    console.log("    Ctrl+C, then:  npm run server");
    console.log("  Then open http://localhost:8787/api/github/connection — expect connected:true.");
  } else {
    console.log(`  ${failures} problem(s) found. Fix them in .env (as described above), then:`);
    console.log("    1. Save .env");
    console.log("    2. Restart the API server (it reads .env only at startup):  Ctrl+C, then  npm run server");
    console.log("    3. Open http://localhost:8787/api/github/connection — expect  connected:true  +  account: yusuf-mo-ali");
    console.log("    4. Mirror the SAME values into the Vercel project (Settings → Environment Variables) and Redeploy.");
  }
  process.exitCode = failures > 0 ? 1 : 0;
}

main().catch((err) => {
  console.error("\nUnexpected error:", err);
  process.exitCode = 1;
});
