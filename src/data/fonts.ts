import type { FontPair } from "@/types";

/* ============================================================
   Typography pairs.
   Google Fonts stylesheets are injected on demand — `css` values
   use only URL-safe family names, so links are simple to build.
   ============================================================ */

export const FONT_PAIRS: FontPair[] = [
  {
    id: "inter-sora",
    label: "Inter + Sora",
    heading: "Sora",
    body: "Inter",
    css: "Sora:wght@400;500;600;700&family=Inter:wght@400;500;600",
    arabic: "Noto Kufi Arabic",
  },
  {
    id: "playfair-source",
    label: "Playfair + Source Sans",
    heading: "Playfair Display",
    body: "Source Sans 3",
    css: "Playfair+Display:wght@500;600;700&family=Source+Sans+3:wght@400;500;600",
    arabic: "Noto Naskh Arabic",
  },
  {
    id: "space-grotesk",
    label: "Space Grotesk",
    heading: "Space Grotesk",
    body: "Space Grotesk",
    css: "Space+Grotesk:wght@400;500;600;700",
    arabic: "Noto Kufi Arabic",
  },
  {
    id: "fraunces-inter",
    label: "Fraunces + Inter",
    heading: "Fraunces",
    body: "Inter",
    css: "Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600",
    arabic: "Noto Naskh Arabic",
  },
  {
    id: "ibm-plex",
    label: "IBM Plex",
    heading: "IBM Plex Sans",
    body: "IBM Plex Sans",
    css: "IBM+Plex+Sans:wght@400;500;600;700",
    arabic: "Noto Kufi Arabic",
  },
  {
    id: "lora-inter",
    label: "Lora + Inter",
    heading: "Lora",
    body: "Inter",
    css: "Lora:wght@500;600;700&family=Inter:wght@400;500;600",
    arabic: "Noto Naskh Arabic",
  },
  {
    id: "cairo",
    label: "Cairo",
    heading: "Cairo",
    body: "Cairo",
    css: "Cairo:wght@400;500;600;700;800",
    arabic: "Cairo",
  },
  {
    id: "archivo",
    label: "Archivo",
    heading: "Archivo",
    body: "Archivo",
    css: "Archivo:wght@400;500;600;700",
    arabic: "Noto Kufi Arabic",
  },
];

export const ARABIC_FONT_PAIRS: FontPair[] = [
  {
    id: "naskh",
    label: "Noto Naskh Arabic",
    heading: "Noto Naskh Arabic",
    body: "Noto Naskh Arabic",
    css: "Noto+Naskh+Arabic:wght@400;500;600;700",
    arabic: "Noto Naskh Arabic",
  },
  {
    id: "kufi",
    label: "Noto Kufi Arabic",
    heading: "Noto Kufi Arabic",
    body: "Noto Kufi Arabic",
    css: "Noto+Kufi+Arabic:wght@400;500;600;700",
    arabic: "Noto Kufi Arabic",
  },
  {
    id: "cairo-ar",
    label: "Cairo",
    heading: "Cairo",
    body: "Cairo",
    css: "Cairo:wght@400;500;600;700;800",
    arabic: "Cairo",
  },
  {
    id: "tajawal",
    label: "Tajawal",
    heading: "Tajawal",
    body: "Tajawal",
    css: "Tajawal:wght@400;500;700",
    arabic: "Tajawal",
  },
  {
    id: "amiri",
    label: "Amiri (Serif)",
    heading: "Amiri",
    body: "Noto Naskh Arabic",
    css: "Amiri:wght@400;700&family=Noto+Naskh+Arabic:wght@400;500;700",
    arabic: "Amiri",
  },
];

export function getFontPair(id: string): FontPair {
  return [...FONT_PAIRS, ...ARABIC_FONT_PAIRS].find((f) => f.id === id) ?? FONT_PAIRS[0]!;
}

export function fontCssLink(pair: FontPair): string {
  return `https://fonts.googleapis.com/css2?family=${pair.css}&display=swap`;
}

export function fontCssLinkFor(fontId: string): string {
  return fontCssLink(getFontPair(fontId));
}
