/* ============================================================
   HTTP utilities for the deployment backend — raw body reading
   (gzip-aware), JSON responses, and a resilient fetch wrapper
   that maps provider errors to friendly, user-safe messages.
   ============================================================ */

import { gunzipSync } from "node:zlib";
import { serverConfig } from "../config.mjs";

/** An error that is safe to show to the studio user. */
export class ApiError extends Error {
  constructor(status, code, message, technical = "") {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.technical = technical;
  }
}

export function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(body);
}

export function sendNoContent(res) {
  res.writeHead(204);
  res.end();
}

/** Read the full request body (decompressing gzip when the client
 *  compressed it — the generated file maps can be several MB). */
export async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > serverConfig.maxBodyBytes) {
      throw new ApiError(
        413,
        "body-too-large",
        "The generated project is too large to upload. Replace large images with URLs and try again."
      );
    }
    chunks.push(chunk);
  }
  let buffer = Buffer.concat(chunks);
  const encoding = String(req.headers["content-encoding"] ?? "").toLowerCase();
  if (encoding === "gzip") {
    buffer = gunzipSync(buffer);
  }
  return buffer;
}

export async function readJsonBody(req) {
  const buffer = await readBody(req);
  if (buffer.length === 0) return {};
  try {
    return JSON.parse(buffer.toString("utf8"));
  } catch {
    throw new ApiError(400, "invalid-json", "The request payload is not valid JSON.");
  }
}

/* ---------- Resilient provider fetch ---------- */

const RETRYABLE = new Set([408, 429, 500, 502, 503, 504]);

function maskHeaders(headers) {
  const out = { ...headers };
  delete out.Authorization;
  delete out.authorization;
  return out;
}

/** Fetch JSON from a provider API with one retry on transient failures.
 *  Never leaks tokens: Authorization headers are stripped from errors. */
export async function request(url, { method = "GET", headers = {}, body, token, tries = 2 } = {}) {
  const h = {
    Accept: "application/vnd.github+json",
    "User-Agent": "Katch-Studio-Deploy",
    ...headers,
  };
  if (token) h.Authorization = `Bearer ${token}`;
  if (body !== undefined && !(body instanceof Uint8Array)) {
    h["Content-Type"] = "application/json";
  }

  let lastError;
  for (let attempt = 1; attempt <= tries; attempt++) {
    try {
      const res = await fetch(url, {
        method,
        headers: h,
        body:
          body instanceof Uint8Array
            ? body
            : body !== undefined
              ? JSON.stringify(body)
              : undefined,
      });
      const text = await res.text();
      let data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        /* non-JSON body */
      }

      if (res.status >= 200 && res.status < 300) {
        return { status: res.status, data, raw: text };
      }

      const code = String(res.status);
      const message = pickMessage(data, res.status);
      if (RETRYABLE.has(res.status) && attempt < tries) {
        lastError = new ApiError(res.status, code, message, message);
        await new Promise((r) => setTimeout(r, 400 * attempt));
        continue;
      }
      throw new ApiError(res.status, code, message, message);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      lastError = err;
      if (attempt < tries) {
        await new Promise((r) => setTimeout(r, 400 * attempt));
        continue;
      }
      const detail = err instanceof Error ? err.message : String(err);
      console.error("[deploy] network failure", { url, headers: maskHeaders(h), detail });
      throw new ApiError(502, "provider-unreachable", "The deployment provider is unreachable. Check your connection and try again.", detail);
    }
  }
  throw lastError;
}

function pickMessage(data, status) {
  const m = data?.message ?? data?.error?.message ?? data?.error_description ?? data?.msg;
  if (typeof m === "string" && m) return m.slice(0, 300);
  if (status === 401) return "Authentication failed — the deployment credentials were rejected.";
  if (status === 403) return "Access denied — the deployment credentials lack permission for this action.";
  if (status === 404) return "Not found — the resource does not exist on the provider.";
  if (status === 409) return "A conflict occurred — the resource already exists.";
  if (status === 422) return "The provider rejected the request — verify the settings and try again.";
  return `The provider returned an error (HTTP ${status}).`;
}
