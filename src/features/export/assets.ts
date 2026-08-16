import type { Project } from "@/types";

export interface CollectedAssets {
  project: Project;
  files: Map<string, Uint8Array>;
  warnings: string[];
}

const IMAGE_KEY = /(image|src|logo|ogImage|thumbnail|photo|avatar)/i;
const IMAGE_EXT = /\.(avif|gif|jpe?g|png|svg|webp)(?:[?#].*)?$/i;

function isAssetCandidate(value: string, key: string): boolean {
  return value.startsWith("data:image/") || value.startsWith("blob:") || value.startsWith("/assets/") ||
    (IMAGE_KEY.test(key) && (/^https?:\/\//i.test(value) || IMAGE_EXT.test(value)));
}

function walk(value: unknown, visit: (owner: Record<string, unknown> | unknown[], key: string | number, value: string) => void): void {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      if (typeof item === "string") visit(value, index, item);
      else walk(item, visit);
    });
    return;
  }
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (typeof item === "string") visit(value as Record<string, unknown>, key, item);
    else walk(item, visit);
  }
}

function extensionFor(contentType: string, source: string): string {
  const fromUrl = source.match(IMAGE_EXT)?.[1]?.toLowerCase();
  if (fromUrl) return fromUrl === "jpeg" ? "jpg" : fromUrl;
  const type = contentType.toLowerCase();
  if (type.includes("svg")) return "svg";
  if (type.includes("webp")) return "webp";
  if (type.includes("avif")) return "avif";
  if (type.includes("gif")) return "gif";
  if (type.includes("png")) return "png";
  return "jpg";
}

function safeStem(source: string, fallback: string): string {
  let stem = fallback;
  try {
    const path = new URL(source, window.location.href).pathname;
    stem = decodeURIComponent(path.split("/").pop() || fallback).replace(/\.[^.]+$/, "");
  } catch {
    // Data/blob URLs use the fallback.
  }
  const cleaned = stem.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
  return (cleaned || fallback).slice(0, 48);
}

async function readDataUrl(value: string): Promise<{ bytes: Uint8Array; type: string }> {
  const comma = value.indexOf(",");
  if (comma < 0) throw new Error("Malformed data URL");
  const header = value.slice(5, comma);
  const type = header.split(";")[0] || "image/png";
  const payload = value.slice(comma + 1);
  if (header.includes(";base64")) {
    const binary = atob(payload);
    return { bytes: Uint8Array.from(binary, (char) => char.charCodeAt(0)), type };
  }
  return { bytes: new TextEncoder().encode(decodeURIComponent(payload)), type };
}

async function fetchAsset(source: string): Promise<{ bytes: Uint8Array; type: string }> {
  if (source.startsWith("data:image/")) return readDataUrl(source);
  const response = await fetch(source, { credentials: "omit" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const type = response.headers.get("content-type") || "application/octet-stream";
  if (!type.startsWith("image/") && !IMAGE_EXT.test(source)) throw new Error(`unsupported content type ${type}`);
  return { bytes: new Uint8Array(await response.arrayBuffer()), type };
}

export function countProjectAssets(project: Project): number {
  const unique = new Set<string>();
  walk(project.config, (_owner, key, value) => {
    if (isAssetCandidate(value, String(key))) unique.add(value);
  });
  return unique.size;
}

/** Clone the current project, copy downloadable images into public/assets, and rewrite only successful references. */
export async function collectAssets(project: Project, enabled: boolean): Promise<CollectedAssets> {
  const cloned = structuredClone(project);
  const files = new Map<string, Uint8Array>();
  const warnings: string[] = [];
  const references: Array<{ owner: Record<string, unknown> | unknown[]; key: string | number; source: string }> = [];
  walk(cloned.config, (owner, key, value) => {
    if (isAssetCandidate(value, String(key))) references.push({ owner, key, source: value });
  });
  if (!enabled) {
    const localCount = new Set(references.filter((item) => !/^https?:\/\//i.test(item.source)).map((item) => item.source)).size;
    if (localCount > 0) warnings.push(`${localCount} local image asset${localCount === 1 ? " was" : "s were"} not embedded because asset export was disabled.`);
    return { project: cloned, files, warnings };
  }

  const resolved = new Map<string, string>();
  let index = 0;
  for (const reference of references) {
    const prior = resolved.get(reference.source);
    if (prior) {
      (reference.owner as Record<string | number, unknown>)[reference.key] = prior;
      continue;
    }
    index += 1;
    try {
      const asset = await fetchAsset(reference.source);
      const ext = extensionFor(asset.type, reference.source);
      let name = `${safeStem(reference.source, `image-${index}`)}.${ext}`;
      let suffix = 2;
      while (files.has(`public/assets/${name}`)) {
        name = `${safeStem(reference.source, `image-${index}`)}-${suffix++}.${ext}`;
      }
      files.set(`public/assets/${name}`, asset.bytes);
      const publicPath = `/assets/${name}`;
      resolved.set(reference.source, publicPath);
      (reference.owner as Record<string | number, unknown>)[reference.key] = publicPath;
    } catch (error) {
      const remote = /^https?:\/\//i.test(reference.source);
      const summary = reference.source.length > 90 ? `${reference.source.slice(0, 87)}…` : reference.source;
      warnings.push(`${remote ? "External" : "Local"} asset kept at its original URL (${summary}): ${error instanceof Error ? error.message : "download failed"}`);
    }
  }

  return { project: cloned, files, warnings };
}
