/* ============================================================
   Credential normalization + validation for the deployment
   backend. PURE functions — no network, no dotenv side effects,
   and NOTHING here ever returns or logs secret material.

   Used by:
     • server/config.mjs          (normalizes env values at boot)
     • server/lib/github.mjs      (validates before signing JWTs)
     • scripts/diagnose-github.mjs
     • scripts/github-auth-test.mjs

   normalizePrivateKey accepts the common real-world pasting
   formats and converts them to one canonical PEM:
     • real newlines (quoted multi-line .env / Vercel dashboard)
     • escaped "\n" text (single-line paste from a browser)
     • CRLF line endings, stray quotes, BOM, trailing spaces
   ============================================================ */

import { createPrivateKey } from "node:crypto";

const PEM_BEGIN = /-----BEGIN (RSA |EC |OPENSSH |ENCRYPTED )?PRIVATE KEY-----/;
const PEM_END = /-----END (RSA |EC |OPENSSH |ENCRYPTED )?PRIVATE KEY-----/;

/* ---------- Private key ---------- */

/** Convert a raw env-var value into a canonical PEM string. Idempotent. */
export function normalizePrivateKey(raw) {
  if (typeof raw !== "string") return "";
  let key = raw.replace(/^\uFEFF/, "").trim();

  /* someone quoted the value inside the env (e.g. the Vercel dashboard) */
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1);
  }

  /* escaped newlines ("\n" as literal text) → real newlines (idempotent:
     a real newline never matches the backslash-n pattern) */
  key = key.replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n");

  /* normalize line endings, trim stray spaces, drop blank lines */
  key = key
    .split(/\r\n|\r|\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n");

  return key.endsWith("\n") ? key : `${key}\n`;
}

/**
 * Strict validation. Returns a safe shape — reason strings are
 * classifications, never key material.
 */
export function validatePrivateKey(key) {
  if (!key) return { ok: false, reason: "missing" };
  if (!PEM_BEGIN.test(key)) return { ok: false, reason: "no-header" };
  if (!PEM_END.test(key)) return { ok: false, reason: "no-footer" };
  try {
    const parsed = createPrivateKey(key);
    return {
      ok: true,
      keyType: parsed.asymmetricKeyType ?? "unknown",
      bits: parsed.asymmetricKeyDetails?.modulusLength ?? null,
    };
  } catch {
    return { ok: false, reason: "unparsable" };
  }
}

/* ---------- App slug ---------- */

/**
 * Accepts either a bare slug ("katch-studio-projects") or a full
 * install-page URL ("https://github.com/apps/katch-studio-projects")
 * and returns the bare slug. Empty string when unrecognizable.
 */
export function normalizeAppSlug(raw) {
  if (typeof raw !== "string") return "";
  let slug = raw.replace(/^\uFEFF/, "").trim();
  if (!slug) return "";
  if (/^https?:\/\//i.test(slug)) {
    const match = slug.replace(/\/+$/, "").match(/^https?:\/\/[^/]+\/apps\/([^/?#]+)/i);
    slug = match ? decodeURIComponent(match[1]) : "";
  }
  return slug.replace(/\/+$/, "");
}

/** Installation URL built from the bare slug (never from raw env text). */
export function appInstallUrl(slug) {
  const bare = normalizeAppSlug(slug);
  return bare ? `https://github.com/apps/${bare}/installations/new` : null;
}

/* ---------- Safe logging helpers ---------- */

/** Booleans/classifications only — safe for server logs. */
export function safeCredentialSummary(cfg) {
  const normalized = cfg?.appPrivateKey ? normalizePrivateKey(cfg.appPrivateKey) : "";
  return {
    appIdConfigured: Boolean(cfg?.appId && /^\d+$/.test(String(cfg.appId))),
    appSlugConfigured: Boolean(cfg?.appSlug),
    privateKeyConfigured: Boolean(cfg?.appPrivateKey),
    privateKeyFormatValid: normalized ? validatePrivateKey(normalized).ok : false,
  };
}

/**
 * Forensic facts about the GITHUB_APP_PRIVATE_KEY definition —
 * structure only, never key material. Answers "why does the server
 * see a different value than the one I wrote in .env?"
 */
export function inspectGithubKeyConfig({ rawEnvText = "", osEnv = {} } = {}) {
  const lines = String(rawEnvText ?? "").replace(/^\uFEFF/, "").split(/\r\n|\r|\n/);
  const defs = [];
  lines.forEach((line, i) => {
    if (/^(export\s+)?GITHUB_APP_PRIVATE_KEY\s*=/.test(line.trim())) defs.push(i);
  });

  const first = defs[0] ?? -1;
  let firstQuoted = false;
  let firstBlockLines = 0;
  if (first >= 0) {
    const afterEq = lines[first].slice(lines[first].indexOf("=") + 1).trim();
    if (afterEq.startsWith('"') || afterEq.startsWith("'")) {
      const quote = afterEq[0];
      firstQuoted = true;
      let body = afterEq.slice(1);
      let end = first;
      while (!body.endsWith(quote) && end < lines.length - 1) {
        end += 1;
        body += "\n" + lines[end];
      }
      firstBlockLines = end - first + 1;
    } else {
      firstBlockLines = 1;
    }
  }

  const osValue = osEnv.GITHUB_APP_PRIVATE_KEY;
  return {
    envFileLines: lines.length,
    definitionLineNumbers: defs.map((d) => d + 1),
    firstDefinitionQuoted: firstQuoted,
    firstDefinitionBlockLines: firstBlockLines,
    duplicateDefinitions: defs.length > 1 ? defs.length : 0,
    /** a Windows/system env var with the same name exists — dotenv will
     *  NOT override it, so the OS value (not .env) is what the server reads */
    osEnvShadowing: osValue !== undefined,
    osEnvLength: osValue !== undefined ? String(osValue).length : null,
  };
}

/**
 * Forensic facts about the VERCEL_TOKEN / NETLIFY_AUTH_TOKEN
 * definitions — structure only, never values. Answers "why does the
 * server think no provider token is configured when .env has one?"
 */
export function inspectProviderTokenConfig({ rawEnvText = "", osEnv = {} } = {}) {
  const lines = String(rawEnvText ?? "").replace(/^\uFEFF/, "").split(/\r\n|\r|\n/);
  const scan = (name) => {
    const defs = [];
    lines.forEach((line, i) => {
      if (line.trim().startsWith("#")) return;
      const eq = line.indexOf("=");
      if (eq === -1) return;
      const key = line.slice(0, eq).trim().replace(/^export\s+/, "").trim();
      if (key !== name) return;
      const rawVal = line.slice(eq + 1).trim();
      defs.push({
        line: i + 1,
        empty: rawVal.length === 0 || rawVal === '""' || rawVal === "''",
      });
    });
    const osValue = osEnv[name];
    return {
      definedInFile: defs.length > 0,
      definitionLines: defs.map((d) => d.line),
      duplicateDefinitions: defs.length > 1 ? defs.length : 0,
      lastDefinitionEmpty: defs.length ? defs[defs.length - 1].empty : null,
      /** an OS-level var with the same name exists — dotenv will NOT
       *  override it (even when the OS value is an empty string) */
      osEnvShadowing: osValue !== undefined,
      osEnvLength: osValue !== undefined ? String(osValue).length : null,
    };
  };
  return { vercel: scan("VERCEL_TOKEN"), netlify: scan("NETLIFY_AUTH_TOKEN") };
}

/* ---------- Minimal .env parsing (shared by the scripts) ---------- */

/**
 * Tiny dotenv-compatible parser (quoted multi-line support) — used by
 * the diagnostic and test scripts so they read the exact same values
 * the deployment server does. Unquoted multi-line values keep only
 * their first line, exactly like the real dotenv used by the server.
 */
export function parseEnvFile(text) {
  const out = {};
  const src = String(text ?? "").replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  const lines = src.split("\n");
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    if (!line || line.startsWith("#")) continue;
    if (line.startsWith("export ")) line = line.slice(7).trim();
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (value.startsWith('"') || value.startsWith("'")) {
      const quote = value[0];
      /* mirror dotenv v17 exactly: a multi-line quoted value is consumed
         ONLY when a closing quote exists on a later line; otherwise the
         value is just this line (dangling quote kept) and later lines
         parse independently */
      const closeAt = lines.slice(i + 1).findIndex((l) => l.includes(quote));
      if (closeAt !== -1) {
        let body = value.slice(1);
        let end = i;
        while (!body.endsWith(quote) && end < lines.length - 1) {
          end += 1;
          body += "\n" + lines[end];
        }
        if (body.endsWith(quote)) body = body.slice(0, -1);
        value = body;
        i = end;
      }
    }
    if (key) out[key] = value;
  }
  return out;
}
