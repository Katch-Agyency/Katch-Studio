import type { ThemePreset } from "@/types";

/* ============================================================
   Theme presets — the design vocabulary of Katch Studio.
   Presets are starting points; projects always get a deep
   clone that can be customized freely.
   ============================================================ */

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "modern",
    name: "Modern",
    description: "Clean neutrals with a fresh green accent. Katch's house style.",
    mode: "light",
    colors: {
      primary: "#10b981",
      primaryHover: "#0d9f72",
      secondary: "#111827",
      accent: "#f5b942",
      background: "#fafaf9",
      surface: "#ffffff",
      text: "#1c1917",
      textMuted: "#57534e",
    },
    radius: "md",
    buttonStyle: "solid",
    cardStyle: "outlined",
    density: "comfortable",
  },
  {
    id: "elegant",
    name: "Elegant",
    description: "Warm cream and deep gold. Restaurants, hospitality, luxury services.",
    mode: "light",
    colors: {
      primary: "#a16207",
      primaryHover: "#854d0e",
      secondary: "#292524",
      accent: "#d4a017",
      background: "#fbf7f0",
      surface: "#ffffff",
      text: "#292524",
      textMuted: "#78716c",
    },
    radius: "lg",
    buttonStyle: "solid",
    cardStyle: "elevated",
    density: "comfortable",
  },
  {
    id: "luxury",
    name: "Luxury",
    description: "Near-black canvas with champagne gold. Premium, editorial feel.",
    mode: "dark",
    colors: {
      primary: "#d4af37",
      primaryHover: "#e3c456",
      secondary: "#1c1917",
      accent: "#b45309",
      background: "#0c0a09",
      surface: "#171412",
      text: "#fafaf9",
      textMuted: "#a8a29e",
    },
    radius: "sm",
    buttonStyle: "outline",
    cardStyle: "outlined",
    density: "spacious",
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Monochrome with restrained contrast. Studios, portfolios, architects.",
    mode: "light",
    colors: {
      primary: "#18181b",
      primaryHover: "#3f3f46",
      secondary: "#f4f4f5",
      accent: "#52525b",
      background: "#ffffff",
      surface: "#fafafa",
      text: "#18181b",
      textMuted: "#71717a",
    },
    radius: "none",
    buttonStyle: "solid",
    cardStyle: "flat",
    density: "compact",
  },
  {
    id: "bold",
    name: "Bold",
    description: "High-energy color on dark. Product launches, campaigns, events.",
    mode: "dark",
    colors: {
      primary: "#f43f5e",
      primaryHover: "#fb7185",
      secondary: "#0f172a",
      accent: "#38bdf8",
      background: "#0b0f19",
      surface: "#131a2b",
      text: "#f1f5f9",
      textMuted: "#94a3b8",
    },
    radius: "lg",
    buttonStyle: "pill",
    cardStyle: "elevated",
    density: "comfortable",
  },
  {
    id: "playful",
    name: "Playful",
    description: "Warm coral and teal. Food brands, community spaces, kids.",
    mode: "light",
    colors: {
      primary: "#f97316",
      primaryHover: "#ea580c",
      secondary: "#0d9488",
      accent: "#eab308",
      background: "#fffbf5",
      surface: "#ffffff",
      text: "#1c1917",
      textMuted: "#57534e",
    },
    radius: "xl",
    buttonStyle: "pill",
    cardStyle: "elevated",
    density: "spacious",
  },
  {
    id: "corporate",
    name: "Corporate",
    description: "Confident navy and blue. Consulting, finance, B2B services.",
    mode: "light",
    colors: {
      primary: "#1d4ed8",
      primaryHover: "#1e40af",
      secondary: "#0f172a",
      accent: "#38bdf8",
      background: "#f8fafc",
      surface: "#ffffff",
      text: "#0f172a",
      textMuted: "#475569",
    },
    radius: "sm",
    buttonStyle: "solid",
    cardStyle: "outlined",
    density: "compact",
  },
];

export function getThemePreset(id: string): ThemePreset {
  return THEME_PRESETS.find((p) => p.id === id) ?? THEME_PRESETS[0]!;
}

/** Tailwind-mapped radius class per scale (for generated website UI) */
export const RADIUS_CLASS: Record<ThemeConfig["radius"], string> = {
  none: "rounded-none",
  sm: "rounded-md",
  md: "rounded-xl",
  lg: "rounded-2xl",
  xl: "rounded-3xl",
  full: "rounded-full",
};

export const BUTTON_CLASS: Record<ThemeConfig["buttonStyle"], string> = {
  solid: "rounded-xl",
  soft: "rounded-xl",
  outline: "rounded-xl border",
  pill: "rounded-full",
};

export const CARD_CLASS: Record<ThemeConfig["cardStyle"], string> = {
  flat: "",
  elevated: "shadow-lg shadow-black/5",
  outlined: "border",
};

import type { ThemeConfig } from "@/types";
