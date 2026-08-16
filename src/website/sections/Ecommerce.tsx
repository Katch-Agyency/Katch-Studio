import { Check, ShoppingBag, Star } from "lucide-react";
import type { CategoriesContent, PricingContent, ProductsContent } from "@/types";
import { SectionHeading, SectionShell, SmartImage, useWebsiteTheme, useSectionStyle, CTALink } from "@/website/renderer";

/* ============================================================
   E-commerce & SaaS sections — Products, Categories, Pricing
   ============================================================ */

function ratingStars(rating: number) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className="h-3.5 w-3.5"
          style={{
            color: i <= rating ? "var(--wp-accent)" : "color-mix(in srgb, var(--wp-text) 18%, transparent)",
            fill: i <= rating ? "var(--wp-accent)" : "none",
          }}
          aria-hidden
        />
      ))}
    </span>
  );
}

export function ProductsSection({ content }: { content: ProductsContent }) {
  const { theme } = useWebsiteTheme();
  const { variant } = useSectionStyle();
  const items = content.items ?? [];
  if (items.length === 0) return null;
  const cols = variant === "wide" || content.columns === 4
    ? "sm:grid-cols-2 lg:grid-cols-4"
    : "sm:grid-cols-2 lg:grid-cols-3";

  return (
    <SectionShell id="products">
      <SectionHeading title={content.title} subtitle={content.subtitle} center />
      <div className={`grid grid-cols-1 gap-x-4 gap-y-8 ${cols}`}>
        {items.map((p) => (
          <article key={p.name} className="group flex flex-col">
            <div
              className="relative aspect-[4/5] overflow-hidden"
              style={{
                borderRadius: theme.radius === "none" ? 6 : theme.radius === "sm" ? 10 : 18,
                background: "var(--wp-surface)",
                border: "1px solid color-mix(in srgb, var(--wp-text) 8%, transparent)",
              }}
            >
              <SmartImage
                src={p.image}
                alt={p.name}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
              />
              {p.badge && (
                <span
                  className="absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-bold text-white"
                  style={{ background: "var(--wp-primary)" }}
                >
                  {p.badge}
                </span>
              )}
              <button
                type="button"
                className="absolute bottom-3 end-3 flex h-10 w-10 items-center justify-center rounded-full text-white shadow-lg transition-transform hover:-translate-y-0.5"
                style={{ background: "var(--wp-secondary)" }}
                aria-label={`Add ${p.name} to cart`}
              >
                <ShoppingBag className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <div className="mt-3 flex items-start justify-between gap-2 px-0.5">
              <div className="min-w-0">
                <p className="text-[12px] font-medium uppercase tracking-wide" style={{ color: "var(--wp-text-muted)" }}>
                  {p.category}
                </p>
                <h3 className="mt-0.5 truncate text-[14.5px] font-semibold" style={{ color: "var(--wp-text)" }}>
                  {p.name}
                </h3>
                {p.rating > 0 && <span className="mt-1 block">{ratingStars(p.rating)}</span>}
              </div>
              {content.showPrices && (
                <div className="shrink-0 text-right">
                  <p className="text-[14.5px] font-bold" style={{ color: "var(--wp-text)" }}>
                    {p.price}
                  </p>
                  {p.compareAt && (
                    <p className="text-[12px] line-through" style={{ color: "var(--wp-text-muted)" }}>
                      {p.compareAt}
                    </p>
                  )}
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
    </SectionShell>
  );
}

export function CategoriesSection({ content }: { content: CategoriesContent }) {
  const { theme } = useWebsiteTheme();
  const { variant } = useSectionStyle();
  const items = content.items ?? [];
  if (items.length === 0) return null;
  const overlay = variant === "overlay";

  return (
    <SectionShell id="categories">
      <SectionHeading title={content.title} subtitle={content.subtitle} center />
      <div className={`grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4 ${items.length === 2 ? "md:grid-cols-2" : ""}`}>
        {items.map((c, i) => (
          <a
            key={c.label}
            href="#products"
            className={`group relative block overflow-hidden ${i === 0 && !overlay ? "col-span-2 row-span-2" : ""}`}
            style={{
              borderRadius: theme.radius === "none" ? 6 : theme.radius === "sm" ? 10 : 18,
              background: "var(--wp-surface)",
            }}
          >
            <SmartImage
              src={c.image}
              alt={c.label}
              className={`w-full object-cover transition-transform duration-300 group-hover:scale-[1.04] ${
                i === 0 && !overlay ? "aspect-[4/3] h-full" : "aspect-[4/3] md:aspect-[4/5]"
              }`}
            />
            <span
              className={`absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 px-4 pb-3.5 pt-10 ${
                overlay ? "bg-gradient-to-t from-black/60 to-transparent" : ""
              }`}
            >
              <span
                className="text-[14px] font-semibold"
                style={{ color: overlay ? "#fff" : "var(--wp-text)" }}
              >
                {c.label}
              </span>
              {overlay && (
                <span className="rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
                  Shop →
                </span>
              )}
            </span>
          </a>
        ))}
      </div>
    </SectionShell>
  );
}

export function PricingSection({ content }: { content: PricingContent }) {
  const { theme, radius } = useWebsiteTheme();
  const { variant } = useSectionStyle();
  const tiers = content.tiers ?? [];
  if (tiers.length === 0) return null;
  const shown = variant === "two" ? tiers.slice(0, 2) : tiers;

  return (
    <SectionShell id="pricing" tone="alt">
      <SectionHeading title={content.title} subtitle={content.subtitle} center />
      <div className={`grid gap-5 ${shown.length === 2 ? "mx-auto max-w-3xl lg:grid-cols-2" : "lg:grid-cols-3"}`}>
        {shown.map((tier) => {
          const hl = tier.highlighted;
          return (
            <div
              key={tier.name}
              className={`relative flex flex-col p-7 ${hl ? "lg:-my-2 lg:py-9" : ""}`}
              style={{
                background: hl ? "var(--wp-primary)" : "var(--wp-surface)",
                color: hl ? "#fff" : "var(--wp-text)",
                borderRadius: theme.radius === "none" ? 6 : theme.radius === "sm" ? 12 : 20,
                border: hl ? "none" : "1px solid color-mix(in srgb, var(--wp-text) 8%, transparent)",
                boxShadow: hl ? "0 24px 48px -20px rgba(0,0,0,0.35)" : theme.cardStyle === "elevated" ? "0 12px 32px -18px rgba(0,0,0,0.35)" : undefined,
              }}
            >
              {hl && (
                <span
                  className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-[11px] font-bold"
                  style={{ background: "var(--wp-secondary)", color: "var(--wp-bg)" }}
                >
                  Most Popular
                </span>
              )}
              <h3 className="text-[16px] font-bold" style={{ fontFamily: "var(--wp-font-heading)" }}>
                {tier.name}
              </h3>
              <p className="mt-1 text-[13px]" style={{ color: hl ? "rgba(255,255,255,0.85)" : "var(--wp-text-muted)" }}>
                {tier.description}
              </p>
              <p className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold" style={{ fontFamily: "var(--wp-font-heading)" }}>
                  {tier.price}
                </span>
                {tier.period && (
                  <span className="text-[13.5px]" style={{ color: hl ? "rgba(255,255,255,0.8)" : "var(--wp-text-muted)" }}>
                    {tier.period}
                  </span>
                )}
              </p>
              <ul className="mt-5 flex-1 space-y-2.5">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-[13.5px]">
                    <span
                      className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full"
                      style={{
                        background: hl ? "rgba(255,255,255,0.22)" : "color-mix(in srgb, var(--wp-primary) 14%, transparent)",
                        color: hl ? "#fff" : "var(--wp-primary)",
                      }}
                    >
                      <Check className="h-3 w-3" aria-hidden />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                {tier.cta?.label &&
                  (hl ? (
                    <a
                      href={tier.cta.href}
                      className={`inline-flex items-center justify-center gap-2 px-6 py-3 text-[15px] font-semibold transition-transform hover:-translate-y-0.5 ${radius} ${
                        theme.buttonStyle === "pill" ? "rounded-full" : ""
                      }`}
                      style={{ background: "#fff", color: "var(--wp-primary)" }}
                    >
                      {tier.cta.label}
                    </a>
                  ) : (
                    <CTALink cta={tier.cta} />
                  ))}
              </div>
            </div>
          );
        })}
      </div>
    </SectionShell>
  );
}
