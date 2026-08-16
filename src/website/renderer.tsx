import React, { createContext, useContext, useEffect, useMemo } from "react";
import type {
  BrandConfig,
  ProjectConfig,
  SectionInstance,
  SectionStyles,
  ThemeConfig,
} from "@/types";
import { getSectionDefinition } from "@/features/sections/registry";
import { deepMerge, cn } from "@/utils/helpers";
import { defaultSectionStyles, SPACING_SCALE } from "@/types";
import { RADIUS_CLASS, CARD_CLASS } from "@/data/palette";
import { getFontPair } from "@/data/fonts";

/* ============================================================
   Website renderer — turns a ProjectConfig into website UI.
   The SAME components and config pipeline will power the
   future exported client website, so the preview is real.
   ============================================================ */

/* ---------- Resolved section content ---------- */

export function resolveSection(section: SectionInstance, brand: BrandConfig) {
  const def = getSectionDefinition(section.type);
  const defaults = def.defaults(brand);
  return deepMerge(defaults, section.content);
}

/** Resolved per-section styles + variant */
export function resolveSectionStyles(section: SectionInstance): { styles: SectionStyles; variant: string } {
  return {
    styles: deepMerge(defaultSectionStyles(), section.styles ?? {}),
    variant: section.variant && getSectionDefinition(section.type).variants?.some((v) => v.id === section.variant)
      ? section.variant
      : "default",
  };
}

/* ---------- Per-section style context ---------- */

export interface SectionStyleCtx {
  variant: string;
  styles: SectionStyles;
}

const SectionCtx = createContext<SectionStyleCtx | null>(null);

export function useSectionStyle(): SectionStyleCtx {
  return useContext(SectionCtx) ?? { variant: "default", styles: defaultSectionStyles() };
}

export function SectionStyleProvider({
  section,
  children,
}: {
  section: SectionInstance;
  children: React.ReactNode;
}) {
  const resolved = useMemo(() => resolveSectionStyles(section), [section]);
  return <SectionCtx.Provider value={resolved}>{children}</SectionCtx.Provider>;
}

/* Visibility: mobile = base, tablet = md+, desktop = lg+ */
export function visibilityClass(v: SectionStyles["visibility"]): string {
  return cn(
    v.mobile ? "" : "hidden",
    v.tablet ? "md:block" : "md:hidden",
    v.desktop ? "lg:block" : "lg:hidden"
  );
}

/* ---------- Website theme context ---------- */

export interface WebsiteThemeCtx {
  theme: ThemeConfig;
  brand: BrandConfig;
  radius: string;
  cardCls: string;
  density: string;
}

const Ctx = createContext<WebsiteThemeCtx | null>(null);

export function useWebsiteTheme(): WebsiteThemeCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useWebsiteTheme outside WebsiteThemeProvider");
  return ctx;
}

const DENSITY: Record<ThemeConfig["density"], string> = {
  compact: "py-12 md:py-14",
  comfortable: "py-16 md:py-20",
  spacious: "py-20 md:py-28",
};

export function WebsiteThemeProvider({
  project,
  children,
}: {
  project: ProjectConfig;
  children: React.ReactNode;
}) {
  const { theme, brand } = project;
  const t = theme;

  const vars = useMemo(() => {
    const c = t.colors;
    return {
      "--wp-bg": c.background,
      "--wp-surface": c.surface,
      "--wp-primary": c.primary,
      "--wp-primary-hover": c.primaryHover,
      "--wp-secondary": c.secondary,
      "--wp-accent": c.accent,
      "--wp-text": c.text,
      "--wp-text-muted": c.textMuted,
    } as React.CSSProperties;
  }, [t]);

  /* Load fonts for this project (heading + body + Arabic fallback) */
  useEffect(() => {
    const ids = [...new Set([t.fonts.heading, t.fonts.body, t.fonts.arabic])].filter(Boolean);
    if (ids.length === 0) return;
    const linkId = `ks-font-${ids.join("-")}`;
    if (document.getElementById(linkId)) return;
    const link = document.createElement("link");
    link.id = linkId;
    link.rel = "stylesheet";
    /* Combine pairs into one Google Fonts request */
    const families = ids
      .map((id) => {
        const pair = getFontPair(id);
        return pair.css;
      })
      .join("&family=");
    link.href = `https://fonts.googleapis.com/css2?family=${families}&display=swap`;
    document.head.appendChild(link);
  }, [t.fonts]);

  const value = useMemo<WebsiteThemeCtx>(
    () => ({
      theme: t,
      brand,
      radius: RADIUS_CLASS[t.radius],
      cardCls: CARD_CLASS[t.cardStyle],
      density: DENSITY[t.density],
    }),
    [t, brand]
  );

  return (
    <Ctx.Provider value={value}>
      <div
        dir={project.projectInfo.language === "ar" ? "rtl" : "ltr"}
        style={{
          ...vars,
          background: "var(--wp-bg)",
          color: "var(--wp-text)",
          fontFamily: `var(--wp-font-body), ${t.fonts.arabic}, ui-sans-serif, system-ui, sans-serif`,
          ["--wp-font-heading" as string]: `"${t.fonts.heading}", ${t.fonts.arabic}, ui-sans-serif, system-ui, sans-serif`,
          ["--wp-font-body" as string]: `"${t.fonts.body}", ${t.fonts.arabic}, ui-sans-serif, system-ui, sans-serif`,
          ["--wp-heading" as string]: `"${t.fonts.heading}"`,
        }}
        className="min-h-full"
      >
        {children}
      </div>
    </Ctx.Provider>
  );
}

/* ---------- Small shared primitives ---------- */

const MAX_WIDTH_CLS: Record<string, string> = {
  sm: "max-w-2xl",
  md: "max-w-4xl",
  lg: "max-w-5xl",
  xl: "max-w-6xl",
  full: "max-w-none",
};

export function SectionShell({
  id,
  className = "",
  children,
  tone = "default",
}: {
  id?: string;
  className?: string;
  children: React.ReactNode;
  tone?: "default" | "alt" | "primary";
}) {
  const { density } = useWebsiteTheme();
  const { styles } = useSectionStyle();

  /* Section-level design overrides win over theme density/tone */
  const spacingCls = SPACING_SCALE.find((s) => s.id === styles.spacing)?.cls ?? density;
  const backgroundCls =
    styles.background === "transparent"
      ? ""
      : styles.background === "surface"
        ? "bg-[var(--wp-surface)]"
        : styles.background === "subtle"
          ? "bg-[color-mix(in_srgb,var(--wp-primary)_6%,transparent)]"
          : "bg-[var(--wp-secondary)]";

  const tones: Record<string, string> = {
    default: "",
    alt: "bg-[var(--wp-surface)]",
    primary: "bg-[var(--wp-primary)]",
  };

  return (
    <section
      id={id}
      className={cn(
        spacingCls,
        backgroundCls || tones[tone],
        className,
        styles.background === "dark" && "[&_h2]:text-[var(--wp-bg)] [&_p]:text-[color-mix(in_srgb,var(--wp-bg)_75%,transparent)]"
      )}
    >
      <div
        className={cn(
          "mx-auto w-full px-5 md:px-8",
          MAX_WIDTH_CLS[styles.maxWidth] ?? "max-w-6xl",
          styles.align === "center" && "text-center"
        )}
      >
        {children}
      </div>
    </section>
  );
}

export function SectionHeading({
  title,
  subtitle,
  center = false,
  light = false,
}: {
  title: string;
  subtitle?: string;
  center?: boolean;
  light?: boolean;
}) {
  if (!title) return null;
  return (
    <div className={`mb-10 max-w-2xl ${center ? "mx-auto text-center" : ""}`}>
      {subtitle && (
        <p
          className="mb-2 text-[13px] font-semibold uppercase tracking-[0.16em]"
          style={{ color: "var(--wp-primary)" }}
        >
          {subtitle}
        </p>
      )}
      <h2
        className="text-3xl font-bold leading-tight md:text-4xl"
        style={{
          fontFamily: "var(--wp-font-heading)",
          color: light ? "#ffffff" : "var(--wp-text)",
        }}
      >
        {title}
      </h2>
    </div>
  );
}

export function CTALink({
  cta,
  light = false,
}: {
  cta: { label: string; href: string; variant: "primary" | "secondary" };
  light?: boolean;
}) {
  if (!cta?.label) return null;
  const { radius, theme } = useWebsiteTheme();
  const base = `inline-flex items-center justify-center gap-2 px-6 py-3 text-[15px] font-semibold transition-all duration-200 ${radius} ${
    theme.buttonStyle === "pill" ? "rounded-full" : ""
  }`;
  if (cta.variant === "primary") {
    return (
      <a
        href={cta.href}
        className={`${base} text-white shadow-md hover:-translate-y-0.5 hover:shadow-lg`}
        style={{ background: "var(--wp-primary)" }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--wp-primary-hover)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "var(--wp-primary)")}
      >
        {cta.label}
      </a>
    );
  }
  return (
    <a
      href={cta.href}
      className={`${base} border transition-colors hover:-translate-y-0.5`}
      style={{
        borderColor: light ? "rgba(255,255,255,0.4)" : "var(--wp-text-muted)",
        color: light ? "#ffffff" : "var(--wp-text)",
      }}
    >
      {cta.label}
    </a>
  );
}

/* ---------- Smart image (graceful error handling) ---------- */

const PLACEHOLDER_COLORS = ["#10b981", "#0ea5e9", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export function placeholderImage(seed: string): string {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) % 997;
  const c = PLACEHOLDER_COLORS[h % PLACEHOLDER_COLORS.length]!;
  const letter = (seed.trim()[0] ?? "K").toUpperCase();
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='640' height='400'><rect width='640' height='400' fill='${c}' opacity='0.16'/><rect width='640' height='400' fill='url(#g)'/><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='${c}' stop-opacity='0.25'/><stop offset='1' stop-color='${c}' stop-opacity='0.05'/></linearGradient></defs><text x='320' y='215' font-family='sans-serif' font-size='88' font-weight='700' fill='${c}' fill-opacity='0.5' text-anchor='middle'>${letter}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function SmartImage({
  src,
  alt,
  className,
  style,
}: {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [failed, setFailed] = React.useState(false);
  const finalSrc = !src || failed ? placeholderImage(alt || "image") : src;
  return (
    <img
      src={finalSrc}
      alt={alt}
      loading="lazy"
      className={className}
      style={style}
      onError={() => setFailed(true)}
    />
  );
}

/* ---------- Section icon → Lucide ---------- */

import {
  Award,
  BarChart3,
  Briefcase,
  Clock,
  Code,
  Gauge,
  Handshake,
  Headphones,
  HeartHandshake,
  LayoutGrid,
  Megaphone,
  Palette,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  Users,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  award: Award,
  "bar-chart-3": BarChart3,
  briefcase: Briefcase,
  clock: Clock,
  code: Code,
  gauge: Gauge,
  handshake: Handshake,
  headphones: Headphones,
  "heart-handshake": HeartHandshake,
  "layout-grid": LayoutGrid,
  megaphone: Megaphone,
  palette: Palette,
  "shield-check": ShieldCheck,
  "shopping-bag": ShoppingBag,
  sparkles: Sparkles,
  "trending-up": TrendingUp,
  users: Users,
  wrench: Wrench,
  zap: Zap,
};

export function FeatureIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICON_MAP[name] ?? Sparkles;
  return <Icon className={className} aria-hidden />;
}
