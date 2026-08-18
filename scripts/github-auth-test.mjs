/* ============================================================
   GitHub App authentication test matrix (A–I).

   Pure tests run always (no network, ephemeral in-memory keys —
   no credentials needed). Live tests run only when real
   GITHUB_APP_ID / GITHUB_APP_PRIVATE_KEY values are present,
   either in process.env or in a --env file (CI-safe: skipped
   otherwise).

   Usage:
     npm run test:github-auth
     node scripts/github-auth-test.mjs --env "H:\path\to\.env"

   Matrix (from the deployment spec):
     A  missing key              → configuration error
     B  truncated key            → invalid private key
     C  escaped-newline key      → valid (normalized)
     D  correct multiline key    → valid
     E  incorrect App ID         → GitHub JWT rejection (live)
     F  revoked key              → GitHub JWT rejection (live,
                                   same 401 class as E)
     G  correct App ID + key     → authentication success (live)
     H  app not installed        → auth OK, installation required
     I  app installed            → connected: true (+ repo access)
   ============================================================ */

import { generateKeyPairSync } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { ApiError } from "../server/lib/http.mjs";
import { GithubBackend } from "../server/lib/github.mjs";
import {
  normalizeAppSlug,
  normalizePrivateKey,
  parseEnvFile,
  validatePrivateKey,
} from "../server/lib/credentials.mjs";

let pass = 0;
let failed = 0;
let skipped = 0;

function check(name, cond, detail = "") {
  if (cond) {
    pass += 1;
    console.log(`  [PASS] ${name}`);
  } else {
    failed += 1;
    console.log(`  [FAIL] ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function skip(name, why) {
  skipped += 1;
  console.log(`  [SKIP] ${name} — ${why}`);
}

/* ------------------------------------------------------------ */
/* Ephemeral RSA key (PKCS#8 PEM, exactly like OpenSSL 3 output) */
/* ------------------------------------------------------------ */
function makePem() {
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  return privateKey.export({ type: "pkcs8", format: "pem" }).toString();
}

function expectApiError(name, fn, code) {
  return Promise.resolve()
    .then(fn)
    .then(() => check(`${name} → ${code}`, false, "expected an error, none thrown"))
    .catch((err) =>
      check(
        `${name} → ${code}`,
        err instanceof ApiError && err.code === code,
        err instanceof ApiError ? `got code "${err.code}": ${err.message}` : `got ${String(err)}`
      )
    );
}

function decodeJwt(jwt) {
  try {
    const [header, payload] = jwt.split(".");
    return {
      header: JSON.parse(Buffer.from(header, "base64url").toString("utf8")),
      claims: JSON.parse(Buffer.from(payload, "base64url").toString("utf8")),
    };
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------ */
async function main() {
  const argIndex = process.argv.indexOf("--env");
  let env = {};
  if (argIndex !== -1 && process.argv[argIndex + 1]) {
    const p = resolve(process.argv[argIndex + 1]);
    if (!existsSync(p)) {
      console.error(`No .env file found at ${p}`);
      process.exitCode = 1;
      return;
    }
    env = parseEnvFile(readFileSync(p, "utf8"));
  } else {
    env = process.env;
  }

  console.log("Katch Studio — GitHub App authentication test matrix (A–I)\n");

  const pem = makePem();
  const escapedPem = pem.replace(/\n/g, "\\n");

  /* ---------------- A: missing key ---------------- */
  console.log("A. Missing private key → configuration error");
  check("normalizePrivateKey(undefined) → ''", normalizePrivateKey(undefined) === "");
  check("validatePrivateKey('') → missing", validatePrivateKey("").reason === "missing");
  await expectApiError(
    "GithubBackend appJwt",
    () => new GithubBackend({ appId: "123456", appPrivateKey: "" }).appJwt(),
    "github-key-invalid"
  );
  await expectApiError(
    "GithubBackend appJwt (invalid App ID)",
    () => new GithubBackend({ appId: "abc", appPrivateKey: pem }).appJwt(),
    "github-app-id-invalid"
  );

  /* ---------------- B: truncated key ---------------- */
  console.log("\nB. Truncated key → invalid private key");
  const truncated = pem.split("\n").slice(0, 4).join("\n");
  check("validatePrivateKey(truncated) → no-footer", validatePrivateKey(truncated).reason === "no-footer");
  await expectApiError(
    "GithubBackend appJwt",
    () => new GithubBackend({ appId: "123456", appPrivateKey: truncated }).appJwt(),
    "github-key-invalid"
  );

  /* ---------------- C: escaped-newline key ---------------- */
  console.log("\nC. Escaped-newline key → normalized to valid PEM");
  const normalizedFromEscaped = normalizePrivateKey(escapedPem);
  check("normalize escapes → equals original PEM", normalizedFromEscaped === pem);
  check("validatePrivateKey → ok", validatePrivateKey(normalizedFromEscaped).ok === true);
  const jwtEscaped = new GithubBackend({ appId: "123456", appPrivateKey: escapedPem }).appJwt();
  check("appJwt signs with the escaped key", typeof jwtEscaped === "string" && jwtEscaped.split(".").length === 3);

  /* ---------------- D: correct multiline key + JWT claims ---------------- */
  console.log("\nD. Correct multiline key → valid");
  check("normalize is idempotent", normalizePrivateKey(pem) === pem);
  check("validatePrivateKey(pem) → ok (rsa)", (() => {
    const v = validatePrivateKey(pem);
    return v.ok === true && v.keyType === "rsa" && v.bits === 2048;
  })());
  check("CRLF variant normalizes to the same PEM", normalizePrivateKey(pem.replace(/\n/g, "\r\n")) === pem);
  check("double-quote-wrapped variant normalizes", normalizePrivateKey(`"${pem}"`) === pem);
  const now = Math.floor(Date.now() / 1000);
  const jwt = new GithubBackend({ appId: "123456", appPrivateKey: pem }).appJwt();
  const decoded = decodeJwt(jwt);
  check("JWT has 3 segments + RS256 header", decoded?.header?.alg === "RS256" && decoded?.header?.typ === "JWT");
  check("JWT iss = App ID", String(decoded?.claims?.iss) === "123456");
  check("JWT lifetime ≤ 600s (GitHub max)", decoded && decoded.claims.exp - decoded.claims.iat > 0 && decoded.claims.exp - decoded.claims.iat <= 600);
  check("JWT iat has backward clock-skew buffer", decoded && decoded.claims.iat <= now && decoded.claims.exp > now);

  /* ---------------- Slug normalization ---------------- */
  console.log("\nSlug normalization");
  check("bare slug unchanged", normalizeAppSlug("katch-studio-projects") === "katch-studio-projects");
  check("full URL → bare slug", normalizeAppSlug("https://github.com/apps/katch-studio-projects") === "katch-studio-projects");
  check("trailing slash stripped", normalizeAppSlug("katch-studio-projects/") === "katch-studio-projects");
  check("empty → empty", normalizeAppSlug("") === "");
  check("unrelated URL → empty", normalizeAppSlug("https://example.com/x") === "");

  /* ---------------- E–I: live tests (credentials required) ---------------- */
  console.log("\nE–I. Live GitHub checks");
  const appId = env.GITHUB_APP_ID ?? "";
  const keyRaw = env.GITHUB_APP_PRIVATE_KEY ?? "";
  const pat = env.GITHUB_PAT ?? "";

  if (!appId && !pat) {
    skip("E–I", "no GITHUB_APP_ID/GITHUB_PAT in the environment — run with real credentials locally (npm run test:github-auth) to execute the live matrix");
  } else if (appId && !keyRaw) {
    skip("E–I", "GITHUB_APP_ID set but no GITHUB_APP_PRIVATE_KEY");
  } else {
    const live = new GithubBackend({ appId, appPrivateKey: keyRaw, appSlug: env.GITHUB_APP_SLUG, pat });

    /* E — incorrect App ID: the key is valid but iss points elsewhere.
       F — revoked key: GitHub treats a revoked key exactly like a
           mismatched one (both 401), so E covers the F class. */
    if (appId && keyRaw) {
      const wrongId = "987654321";
      await expectApiError(
        "E/F wrong App ID → github-auth-rejected",
        () => new GithubBackend({ appId: wrongId, appPrivateKey: keyRaw, appSlug: env.GITHUB_APP_SLUG }).connection(),
        "github-auth-rejected"
      );
      console.log("      (F — a revoked key produces the same 401 class as E; cannot fabricate a real revoked key)");
    }

    /* G/H/I — real credentials */
    try {
      const conn = await live.connection();
      if (conn.connected) {
        check("G authentication successful", true);
        check("I connected:true returned", true);
        if (conn.mode === "app") {
          check("I app.slug present", typeof conn.app?.slug === "string" && conn.app.slug.length > 0);
          check("I account resolved", typeof conn.account === "string" && conn.account.length > 0, `account=${conn.account ?? "null"}`);
          /* installation token → repository access (read-only probe) */
          try {
            const token = await live.installationToken();
            const res = await fetch("https://api.github.com/installation/repositories", {
              headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/vnd.github+json",
                "User-Agent": "katch-studio-auth-test",
                "X-GitHub-Api-Version": "2022-11-28",
              },
            });
            check("I installation token has repository access", res.status === 200, `HTTP ${res.status}`);
          } catch (err) {
            check("I installation token has repository access", false, String(err));
          }
        } else {
          check("I PAT account resolved", typeof conn.account === "string" && conn.account.length > 0);
        }
      } else if (conn.installationRequired) {
        check("G authentication successful (JWT accepted)", true);
        check("H installationRequired:true returned", true);
        check("H installUrl present", typeof conn.installUrl === "string" && conn.installUrl.startsWith("https://github.com/apps/"));
      } else {
        check("G authentication successful", false, `connected:false (${conn.hint ?? conn.mode})`);
      }
    } catch (err) {
      if (err instanceof ApiError && err.code === "github-auth-rejected") {
        check("G authentication successful", false, "GitHub rejected the credentials (401) — key/App ID mismatch or revoked key");
      } else if (err instanceof ApiError) {
        check("G authentication successful", false, `${err.code}: ${err.message}`);
      } else {
        check("G authentication successful", false, String(err));
      }
    }
  }

  /* ---------------- Summary ---------------- */
  console.log(`\n${"─".repeat(50)}`);
  console.log(`  PASS ${pass} · FAIL ${failed} · SKIP ${skipped}`);
  if (failed > 0) {
    console.log("  RESULT: FAILURES PRESENT");
    process.exitCode = 1;
  } else {
    console.log("  RESULT: ALL EXECUTED CHECKS PASSED");
  }
}

main().catch((err) => {
  console.error("\nUnexpected error:", err);
  process.exitCode = 1;
});
