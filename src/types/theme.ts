/* ============================================================
   Theme & Brand types — drive both Katch Studio and generated sites
   ============================================================ */

export type ThemeMode = "light" | "dark";

export type RadiusScale = "none" | "sm" | "md" | "lg" | "xl" | "full";
export type ButtonStyle = "solid" | "soft" | "outline" | "pill";
export type CardStyle = "flat" | "elevated" | "outlined";
export type SpacingDensity = "compact" | "comfortable" | "spacious";

export interface FontPair {
  id: string;
  heading: string;
  body: string;
  css: string;
  /** Browsers substitute an Arabic-capable font stack for Arabic text */
  arabic: string;
  label: string;
}

export interface ThemeColors {
  primary: string;
  primaryHover: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textMuted: string;
}

export interface ThemeConfig {
  mode: ThemeMode;
  colors: ThemeColors;
  fonts: { heading: string; body: string; arabic: string };
  radius: RadiusScale;
  buttonStyle: ButtonStyle;
  cardStyle: CardStyle;
  density: SpacingDensity;
}

export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  mode: ThemeMode;
  colors: ThemeColors;
  radius: RadiusScale;
  buttonStyle: ButtonStyle;
  cardStyle: CardStyle;
  density: SpacingDensity;
}

export interface BrandConfig {
  businessName: string;
  tagline: string;
  description: string;
  logoText: string;
  /** Optional logo image; empty = text wordmark */
  logoUrl: string;
  logoFormat: "wordmark" | "mark" | "both";
  faviconColor: string;
  email: string;
  phone: string;
  whatsapp: string;
  address: string;
  social: { label: string; url: string }[];
}
