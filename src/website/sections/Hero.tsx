import type { HeroContent } from "@/types";
import { CTALink, SmartImage, useWebsiteTheme } from "@/website/renderer";

/* ============================================================
   Hero — supports left / center alignment, optional image
   ============================================================ */

export function HeroSection({ content }: { content: HeroContent }) {
  const { brand, theme } = useWebsiteTheme();
  const align = content.alignment ?? "left";
  const hasImage = Boolean(content.image);
  const centered = align === "center";

  return (
    <section className="relative overflow-hidden">
      {/* Soft brand glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(700px 340px at ${centered ? "50%" : "18%"} 0%, color-mix(in srgb, var(--wp-primary) 14%, transparent), transparent 70%)`,
        }}
      />
      <div
        className={`relative mx-auto grid max-w-6xl gap-10 px-5 pb-16 pt-14 md:px-8 md:pb-24 md:pt-20 ${
          hasImage && !centered ? "lg:grid-cols-[1.1fr_0.9fr] lg:items-center" : "max-w-4xl"
        }`}
      >
        <div className={centered ? "text-center" : ""}>
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
            <p
              className={`mt-5 max-w-xl text-[16px] leading-relaxed md:text-[17px] ${centered ? "mx-auto" : ""}`}
              style={{ color: "var(--wp-text-muted)" }}
            >
              {content.description}
            </p>
          )}
          {(content.primaryCTA?.label || content.secondaryCTA?.label) && (
            <div className={`mt-8 flex flex-wrap gap-3 ${centered ? "justify-center" : ""}`}>
              {content.primaryCTA?.label && <CTALink cta={content.primaryCTA} />}
              {content.secondaryCTA?.label && <CTALink cta={content.secondaryCTA} />}
            </div>
          )}
        </div>

        {hasImage && !centered && (
          <div className="relative">
            <div
              aria-hidden
              className="absolute -inset-3 rounded-3xl opacity-40 blur-2xl"
              style={{ background: "var(--wp-primary)" }}
            />
            <SmartImage
              src={content.image}
              alt={content.imageAlt || brand.businessName}
              className="relative aspect-[16/10] w-full object-cover shadow-2xl"
              style={{ borderRadius: theme.radius === "none" ? 8 : theme.radius === "sm" ? 12 : theme.radius === "md" ? 20 : 28 }}
            />
          </div>
        )}

        {hasImage && centered && (
          <div className="relative mx-auto mt-2 w-full max-w-3xl">
            <div
              aria-hidden
              className="absolute -inset-3 rounded-3xl opacity-40 blur-2xl"
              style={{ background: "var(--wp-primary)" }}
            />
            <SmartImage
              src={content.image}
              alt={content.imageAlt || brand.businessName}
              className="relative aspect-[16/8] w-full object-cover shadow-2xl"
              style={{ borderRadius: theme.radius === "none" ? 8 : theme.radius === "sm" ? 12 : theme.radius === "md" ? 20 : 28 }}
            />
          </div>
        )}
      </div>
    </section>
  );
}
