/* ============================================================
   errorReporting — lightweight, env-gated error + performance
   monitoring. When VITE_SENTRY_DSN is set, unhandled errors
   and promise rejections are captured to Sentry via its HTTP
   envelope API (no SDK weight). Without the DSN, nothing runs.
   ============================================================ */

let installed = false;
let lastSendAt = 0;

function parseDsn(dsn: string): { url: string; projectId: string; publicKey: string } | null {
  try {
    const m = dsn.match(/^(https?):\/\/([^@]+)@([^/]+)\/(.+)$/);
    if (!m) return null;
    const [, scheme, key, host, projectId] = m;
    return {
      url: `${scheme}://${host}/api/${projectId}/envelope/`,
      projectId,
      publicKey: key,
    };
  } catch {
    return null;
  }
}

function sendEnvelope(dsn: string, payload: Record<string, unknown>): void {
  const parsed = parseDsn(dsn);
  if (!parsed) return;
  const now = Date.now();
  if (now - lastSendAt < 1000) return; // throttle: max 1 event/sec
  lastSendAt = now;

  const header = JSON.stringify({
    event_id: crypto.randomUUID ? crypto.randomUUID() : String(now),
    sent_at: new Date().toISOString(),
    dsn,
  });
  const itemHeader = JSON.stringify({ type: "event", content_type: "application/json" });
  const body = `${header}\n${itemHeader}\n${JSON.stringify(payload)}`;

  /* fire-and-forget — reporting must never break the app */
  try {
    navigator.sendBeacon
      ? navigator.sendBeacon(parsed.url, new Blob([body], { type: "application/x-sentry-envelope" }))
      : fetch(parsed.url, { method: "POST", body, keepalive: true }).catch(() => undefined);
  } catch {
    /* ignore */
  }
}

function captureError(dsn: string, error: unknown, source: string): void {
  const err = error instanceof Error ? error : new Error(String(error));
  sendEnvelope(dsn, {
    platform: "javascript",
    level: "error",
    exception: {
      values: [{ type: err.name, value: err.message.slice(0, 2000), stacktrace: { frames: [] } }],
    },
    tags: { source, app: "katch-studio" },
    extra: { url: typeof location !== "undefined" ? location.href : undefined, stack: err.stack?.slice(0, 4000) },
  });
}

export function registerErrorReporting(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;

  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;

  window.addEventListener("error", (e) => {
    captureError(dsn, e.error ?? e.message, "window.onerror");
  });
  window.addEventListener("unhandledrejection", (e) => {
    captureError(dsn, e.reason, "unhandledrejection");
  });
  console.info("[Katch Studio] Error reporting enabled (Sentry DSN configured).");
}
