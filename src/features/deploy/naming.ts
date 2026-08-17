import type { DeploymentProviderType } from "@/types";

/* ============================================================
   Deployment naming + provider metadata — pure, testable.
   The repo-name rules mirror server/lib/normalize.mjs (the
   server re-validates everything, so this is UX convenience,
   never a security boundary).
   ============================================================ */

export const REPO_NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** "Looky Cakes" → katch-looky-cakes · "حلويات" → katch-site · "Bta3 7awa4y" → katch-bta3-7awa4y */
export function normalizeRepoName(name: string, fallbackId = ""): string {
  const latin = String(name ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/^(katch-)+/, "");
  const base = latin || "site";
  /* Only fall back to the project id when there are NO usable letters
     (e.g. Arabic-only names) — normal names stay clean ("katch-looky-cakes"). */
  const suffix =
    !latin && fallbackId
      ? `-${String(fallbackId).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 6)}`
      : "";
  const full = `katch-${base}${suffix}`;
  return (full.length > 100 ? full.slice(0, 100) : full).replace(/-+$/g, "") || "katch-site";
}

export function isValidRepoName(name: string): boolean {
  return name.length > 0 && name.length <= 100 && REPO_NAME_PATTERN.test(name);
}

export interface ProviderMeta {
  id: DeploymentProviderType;
  name: string;
  tagline: string;
  recommended: boolean;
  /** Monochrome brand mark (inline SVG path) — brand logos, not UI icons */
  mark: string;
}

export const PROVIDER_META: ProviderMeta[] = [
  {
    id: "vercel",
    name: "Vercel",
    tagline: "Fast global deployment for React/Vite projects",
    recommended: true,
    mark: "M12 3.5L21.5 20H2.5z",
  },
  {
    id: "netlify",
    name: "Netlify",
    tagline: "Simple, reliable hosting with instant deploys",
    recommended: false,
    mark: "M9.2 3l4.4 6.4H8.6L13 15.8 7 22h8.4l1.6-2.6 2.2-3.6L9.2 3z",
  },
];

export function providerMeta(id: DeploymentProviderType): ProviderMeta {
  return PROVIDER_META.find((p) => p.id === id) ?? PROVIDER_META[0];
}

/** Depends on the host env: does this environment know about a mock backend? */
export function mockProductionUrl(provider: DeploymentProviderType, slug: string): string {
  const domain = provider === "vercel" ? ".vercel.app" : ".netlify.app";
  return `https://mock-${normalizeRepoName(slug)}${domain}`;
}
