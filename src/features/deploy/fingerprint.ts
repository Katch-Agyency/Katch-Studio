import type { Project } from "@/types";
import { buildResolvedStructure } from "@/lib/exportZip";

/* ============================================================
   Content fingerprint — detects "changes since the last deploy"
   without timestamps or comparisons against live data.
   Pure FNV-1a over the resolved website structure (excluding
   the generatedAt stamp and any deployment metadata), so the
   same content always yields the same hash.
   ============================================================ */

function fnv1a(str: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/** Per-page fingerprints — used to localise commit messages ("Update Home") */
export function pageHashes(project: Project): Record<string, string> {
  const structure = buildResolvedStructure(project);
  const pages = Array.isArray(structure.pages) ? structure.pages : [];
  const out: Record<string, string> = {};
  for (const page of pages as Array<{ id?: unknown }>) {
    if (typeof page?.id === "string") {
      out[page.id] = fnv1a(JSON.stringify(page));
    }
  }
  return out;
}

/** Whole-site fingerprint — the "is the deployed version stale?" check */
export function contentFingerprint(project: Project): string {
  const structure = buildResolvedStructure(project);
  delete structure.generatedAt;
  return fnv1a(JSON.stringify(structure));
}
