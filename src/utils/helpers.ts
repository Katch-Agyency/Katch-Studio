/* ============================================================
   Small shared utilities — no dependencies
   ============================================================ */

let counter = 0;

/** Short unique id, e.g. "ab12cd34" */
export function uid(): string {
  counter += 1;
  return (
    Date.now().toString(36).slice(-4) +
    counter.toString(36).padStart(2, "0") +
    Math.random().toString(36).slice(2, 6)
  );
}

/** Class names combiner */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

const NUM_FMT = new Intl.NumberFormat("en-US");

export function formatNumber(n: number): string {
  return NUM_FMT.format(n);
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "Yesterday";
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

export function timeLabel(iso: string): string {
  if (isToday(iso)) return "Today";
  return timeAgo(iso);
}

/* ---------- Deep merge for section content (partial → defaults) ---------- */

type AnyRecord = Record<string, unknown>;

function isPlainObject(v: unknown): v is AnyRecord {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function deepMerge<T>(base: T, partial: unknown): T {
  if (!isPlainObject(partial)) return partial === undefined ? base : (partial as T);
  const out: AnyRecord = { ...(isPlainObject(base) ? (base as AnyRecord) : {}) };
  for (const key of Object.keys(partial)) {
    const b = out[key];
    const p = partial[key];
    if (Array.isArray(p)) out[key] = p;
    else if (isPlainObject(b) && isPlainObject(p)) out[key] = deepMerge(b, p);
    else out[key] = p;
  }
  return out as T;
}

/* ---------- Validation ---------- */

export function validateProject(p: unknown): string | null {
  const pr = p as { config?: { projectInfo?: { name?: string; category?: string } } };
  if (!pr || !pr.config || !pr.config.projectInfo) return "Project data is missing its configuration.";
  if (!pr.config.projectInfo.name || !pr.config.projectInfo.name.trim())
    return "Project name is required.";
  if (!pr.config.projectInfo.category) return "Project category is required.";
  return null;
}

/* ---------- Files ---------- */

export function downloadFile(filename: string, content: string, mime = "application/json") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 400);
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u0600-\u06FF\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}
