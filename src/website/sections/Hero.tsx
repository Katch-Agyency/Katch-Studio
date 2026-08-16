import type { HeroContent } from "@/types";
import { CTALink, SmartImage, useSectionStyle, useWebsiteTheme } from "@/website/renderer";

/* ============================================================
   Hero — variants: split (default), centered, editorial, minimal
   ============================================================ */

export function HeroSection({ content }: { content: HeroContent }) {
  const { variant } = useSectionStyle();
  const align = content.alignment ?? "left";
  const hasImage = Boolean(content.image);

  if (variant === "editorial" && hasImage) {
    return <HeroEditorial content={content} />;
  }
  if (variant === "minimal") {
    return <HeroMinimal content={content} />;
  }
  if (variant === "centered" || (align === "center" && variant !== "split")) {
    return <HeroCentered content={content} />;
  }
  return <HeroSplit content={content} hasImage={hasImage} />;
}

/* ---------- Split: text beside an image ---------- */

function HeroSplit({ content, hasImage }: { content: HeroContent; hasImage: boolean }) {
  const { brand } = useWebsiteTheme();
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(700px 340px at 18% 0%, color-mix(in srgb, var(--wp-primary) 14%, transparent), transparent 70%)",
        }}
      />
      <div
        className={`relative mx-auto grid max-w-6xl gap-10 px-5 pb-16 pt-14 md:px-8 md:pb-24 md:pt-20 ${
          hasImage ? "lg:grid-cols-[1.1fr_0.9fr] lg:items-center" : "max-w-3xl"
        }`}
      >
        <div>
          {content.subtitle && (
            <p
              className="mb-4 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold"
              style={{ background: "color-mix(in srgb, var(--wp-primary) 12%, transparent)", color: "var(--wp-primary)" }}
            >
              {content.subtitle}
            </p>
          )}
          <h1
            className="text-4xl font-bold leading-[1.08] tracking-tight md:text-5xl lg:text-[56px]"
            style={{ fontFamily: "var(--wp-font-heading)", color: "var(--wp-text)" }}
          >
            {content.title || brand.businessName}
          </h1>
          {content.description && (
            <p className="mt-5 max-w-xl text-[16px] leading-relaxed md:text-[17px]" style={{ color: "var(--wp-text-muted)" }}>
              {content.description}
            </p>
          )}
          {(content.primaryCTA?.label || content.secondaryCTA?.label) && (
            <div className="mt-8 flex flex-wrap gap-3">
              {content.primaryCTA?.label && <CTALink cta={content.primaryCTA} />}
              {content.secondaryCTA?.label && <CTALink cta={content.secondaryCTA} />}
            </div>
          )}
        </div>
        {hasImage && <HeroImage content={content} />}
      </div>
    </section>
  );
}

/* ---------- Centered ---------- */

function HeroCentered({ content }: { content: HeroContent }) {
  const { brand } = useWebsiteTheme();
  const hasImage = Boolean(content.image);
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(700px 340px at 50% 0%, color-mix(in srgb, var(--wp-primary) 14%, transparent), transparent 70%)",
        }}
      />
      <div className="relative mx-auto max-w-4xl px-5 pb-16 pt-14 text-center md:px-8 md:pb-24 md:pt-20">
        {content.subtitle && (
          <p
            className="mb-4 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold"
            style={{ background: "color-mix(in srgb, var(--wp-primary) 12%, transparent)", color: "var(--wp-primary)" }}
          >
            {content.subtitle}
          </p>
        )}
        <h1
          className="mx-auto max-w-3xl text-4xl font-bold leading-[1.08] tracking-tight md:text-5xl lg:text-[56px]"
          style={{ fontFamily: "var(--wp-font-heading)", color: "var(--wp-text)" }}
        >
          {content.title || brand.businessName}
        </h1>
        {content.description && (
          <p className="mx-auto mt-5 max-w-xl text-[16px] leading-relaxed md:text-[17px]" style={{ color: "var(--wp-text-muted)" }}>
            {content.description}
          </p>
        )}
        {(content.primaryCTA?.label || content.secondaryCTA?.label) && (
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {content.primaryCTA?.label && <CTALink cta={content.primaryCTA} />}
            {content.secondaryCTA?.label && <CTALink cta={content.secondaryCTA} />}
          </div>
        )}
        {hasImage && (
          <div className="relative mx-auto mt-10 w-full max-w-3xl">
            <div aria-hidden className="absolute -inset-3 rounded-3xl opacity-40 blur-2xl" style={{ background: "var(--wp-primary)" }} />
            <HeroImage content={content} className="relative aspect-[16/8]" />
          </div>
        )}
      </div>
    </section>
  );
}

/* ---------- Editorial: full-bleed image with overlay ---------- */

function HeroEditorial({ content }: { content: HeroContent }) {
  const { brand } = useWebsiteTheme();
  return (
    <section className="relative flex min-h-[520px] items-end overflow-hidden md:min-h-[640px]">
      <SmartImage
        src={content.image}
        alt={content.imageAlt || brand.businessName}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" aria-hidden />
      <div className="relative mx-auto w-full max-w-6xl px-5 pb-14 pt-40 md:px-8 md:pb-20">
        {content.subtitle && (
          <p className="mb-4 inline-flex items-center rounded-full bg-white/15 px-3.5 py-1.5 text-[12.5px] font-semibold text-white backdrop-blur">
            {content.subtitle}
          </p>
        )}
        <h1
          className="max-w-3xl text-4xl font-bold leading-[1.06] tracking-tight text-white md:text-6xl"
          style={{ fontFamily: "var(--wp-font-heading)" }}
        >
          {content.title || brand.businessName}
        </h1>
        {content.description && (
          <p className="mt-4 max-w-xl text-[15.5px] leading-relaxed text-white/85 md:text-[17px]">
            {content.description}
          </p>
        )}
        {(content.primaryCTA?.label || content.secondaryCTA?.label) && (
          <div className="mt-8 flex flex-wrap gap-3">
            {content.primaryCTA?.label && <CTALink cta={content.primaryCTA} />}
            {content.secondaryCTA?.label && <CTALink cta={content.secondaryCTA} light />}
          </div>
        )}
      </div>
    </section>
  );
}

/* ---------- Minimal: typography only ---------- */

function HeroMinimal({ content }: { content: HeroContent }) {
  const { brand } = useWebsiteTheme();
  return (
    <section className="relative">
      <div className="mx-auto max-w-3xl px-5 py-16 md:px-8 md:py-24">
        {content.subtitle && (
          <p className="mb-4 text-[13px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--wp-primary)" }}>
            {content.subtitle}
          </p>
        )}
        <h1
          className="text-[40px] font-bold leading-[1.05] tracking-tight md:text-6xl"
          style={{ fontFamily: "var(--wp-font-heading)", color: "var(--wp-text)" }}
        >
          {content.title || brand.businessName}
        </h1>
        {content.description && (
          <p className="mt-5 max-w-xl text-[16px] leading-relaxed md:text-[17px]" style={{ color: "var(--wp-text-muted)" }}>
            {content.description}
          </p>
        )}
        {(content.primaryCTA?.label || content.secondaryCTA?.label) && (
          <div className="mt-8 flex flex-wrap gap-3">
            {content.primaryCTA?.label && <CTALink cta={content.primaryCTA} />}
            {content.secondaryCTA?.label && <CTALink cta={content.secondaryCTA} />}
          </div>
        )}
      </div>
    </section>
  );
}

/* ---------- Shared image block ---------- */

function HeroImage({ content, className = "relative aspect-[16/10] w-full object-cover shadow-2xl" }: { content: HeroContent; className?: string }) {
  const { theme } = useWebsiteTheme();
  return (
    <SmartImage
      src={content.image}
      alt={content.imageAlt || ""}
      className={className}
      style={{ borderRadius: theme.radius === "none" ? 8 : theme.radius === "sm" ? 12 : theme.radius === "md" ? 20 : 28 }}
    />
  );
}
