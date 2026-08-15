import { useState } from "react";
import { Check, ChevronDown, Star } from "lucide-react";
import type {
  AboutContent,
  FaqContent,
  FeaturesContent,
  ProcessContent,
  ServicesContent,
  StatsContent,
  TestimonialsContent,
} from "@/types";
import { Avatar } from "@/components/ui/ui";
import { FeatureIcon, SectionHeading, SectionShell, SmartImage, useWebsiteTheme } from "@/website/renderer";

/* ============================================================
   Content sections — About, Services, Features, Stats,
   Process, Testimonials, FAQ
   ============================================================ */

export function AboutSection({ content }: { content: AboutContent }) {
  const { radius } = useWebsiteTheme();
  return (
    <SectionShell id="about">
      <div className="grid items-center gap-10 lg:grid-cols-2">
        {content.image && (
          <SmartImage
            src={content.image}
            alt={content.imageAlt || content.title}
            className="aspect-[16/11] w-full object-cover shadow-xl"
            style={{ borderRadius: radius === "none" ? 4 : radius === "sm" ? 8 : 20 }}
          />
        )}
        <div>
          <SectionHeading title={content.title} subtitle={content.subtitle} />
          {content.text && (
            <p className="text-[15.5px] leading-relaxed" style={{ color: "var(--wp-text-muted)" }}>
              {content.text}
            </p>
          )}
          {(content.points ?? []).length > 0 && (
            <ul className="mt-6 space-y-3">
              {content.points.map((pt) => (
                <li key={pt} className="flex items-start gap-3 text-[14.5px] font-medium">
                  <span
                    className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                    style={{ background: "color-mix(in srgb, var(--wp-primary) 14%, transparent)", color: "var(--wp-primary)" }}
                  >
                    <Check className="h-3 w-3" aria-hidden />
                  </span>
                  {pt}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </SectionShell>
  );
}

function ItemGrid({ items }: { items: { icon: string; title: string; text: string }[] }) {
  const { cardCls, theme } = useWebsiteTheme();
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <div
          key={item.title + item.text.slice(0, 8)}
          className={`${cardCls} p-6 transition-transform duration-200 hover:-translate-y-1`}
          style={{
            background: "var(--wp-surface)",
            borderColor: "color-mix(in srgb, var(--wp-text) 8%, transparent)",
            borderRadius: theme.radius === "none" ? 4 : theme.radius === "sm" ? 8 : 16,
            boxShadow: theme.cardStyle === "elevated" ? "0 12px 32px -18px rgba(0,0,0,0.35)" : undefined,
          }}
        >
          <span
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg"
            style={{ background: "color-mix(in srgb, var(--wp-primary) 12%, transparent)", color: "var(--wp-primary)" }}
          >
            <FeatureIcon name={item.icon} className="h-5 w-5" />
          </span>
          <h3 className="mt-4 text-[16.5px] font-semibold" style={{ color: "var(--wp-text)" }}>
            {item.title}
          </h3>
          <p className="mt-2 text-[14px] leading-relaxed" style={{ color: "var(--wp-text-muted)" }}>
            {item.text}
          </p>
        </div>
      ))}
    </div>
  );
}

export function ServicesSection({ content }: { content: ServicesContent }) {
  return (
    <SectionShell id="services" tone="alt">
      <SectionHeading title={content.title} subtitle={content.subtitle} center />
      <ItemGrid items={content.items ?? []} />
    </SectionShell>
  );
}

export function FeaturesSection({ content }: { content: FeaturesContent }) {
  return (
    <SectionShell id="features">
      <SectionHeading title={content.title} subtitle={content.subtitle} center />
      <ItemGrid items={content.items ?? []} />
    </SectionShell>
  );
}

export function StatsSection({ content }: { content: StatsContent }) {
  const items = content.items ?? [];
  if (items.length === 0) return null;
  return (
    <section style={{ background: "var(--wp-primary)", color: "#fff" }}>
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-5 py-14 md:grid-cols-4 md:px-8">
        {items.map((s) => (
          <div key={s.label + s.value} className="text-center">
            <p className="text-3xl font-bold md:text-4xl" style={{ fontFamily: "var(--wp-font-heading)" }}>
              {s.value}
            </p>
            <p className="mt-1.5 text-[13.5px] font-medium opacity-85">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ProcessSection({ content }: { content: ProcessContent }) {
  const { radius } = useWebsiteTheme();
  const steps = content.steps ?? [];
  if (steps.length === 0) return null;
  return (
    <SectionShell id="process" tone="alt">
      <SectionHeading title={content.title} subtitle={content.subtitle} center />
      <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, i) => (
          <li
            key={step.title}
            className="relative p-6"
            style={{
              background: "var(--wp-surface)",
              borderRadius: radius === "none" ? 4 : radius === "sm" ? 8 : 16,
              border: "1px solid color-mix(in srgb, var(--wp-text) 8%, transparent)",
            }}
          >
            <span
              className="flex h-9 w-9 items-center justify-center rounded-full text-[15px] font-bold text-white"
              style={{ background: "var(--wp-primary)" }}
            >
              {i + 1}
            </span>
            <h3 className="mt-4 text-[16px] font-semibold">{step.title}</h3>
            <p className="mt-1.5 text-[13.5px] leading-relaxed" style={{ color: "var(--wp-text-muted)" }}>
              {step.text}
            </p>
          </li>
        ))}
      </ol>
    </SectionShell>
  );
}

export function TestimonialsSection({ content }: { content: TestimonialsContent }) {
  const { theme } = useWebsiteTheme();
  const items = content.items ?? [];
  if (items.length === 0) return null;
  return (
    <SectionShell id="testimonials">
      <SectionHeading title={content.title} subtitle={content.subtitle} center />
      <div className="grid gap-5 md:grid-cols-3">
        {items.map((t) => (
          <figure
            key={t.name + t.quote.slice(0, 12)}
            className="flex flex-col p-6"
            style={{
              background: "var(--wp-surface)",
              borderRadius: theme.radius === "none" ? 4 : theme.radius === "sm" ? 8 : 16,
              border: "1px solid color-mix(in srgb, var(--wp-text) 8%, transparent)",
              boxShadow: theme.cardStyle === "elevated" ? "0 12px 32px -18px rgba(0,0,0,0.35)" : undefined,
            }}
          >
            {t.rating > 0 && (
              <div className="flex gap-0.5" aria-label={`${t.rating} out of 5 stars`}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className="h-4 w-4"
                    style={{ color: i < t.rating ? "var(--wp-accent)" : "color-mix(in srgb, var(--wp-text) 18%, transparent)", fill: i < t.rating ? "var(--wp-accent)" : "none" }}
                    aria-hidden
                  />
                ))}
              </div>
            )}
            <blockquote className="mt-3 flex-1 text-[14.5px] leading-relaxed" style={{ color: "var(--wp-text)" }}>
              “{t.quote}”
            </blockquote>
            <figcaption className="mt-5 flex items-center gap-3">
              <Avatar name={t.name} size={38} />
              <span>
                <span className="block text-[13.5px] font-semibold">{t.name}</span>
                <span className="block text-xs" style={{ color: "var(--wp-text-muted)" }}>
                  {t.role}
                </span>
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </SectionShell>
  );
}

export function FaqSection({ content }: { content: FaqContent }) {
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  const items = content.items ?? [];
  if (items.length === 0) return null;
  return (
    <SectionShell id="faq" tone="alt">
      <SectionHeading title={content.title} subtitle={content.subtitle} center />
      <div className="mx-auto max-w-3xl space-y-3">
        {items.map((item, i) => {
          const open = openIdx === i;
          return (
            <div
              key={item.q}
              className="overflow-hidden"
              style={{
                background: "var(--wp-surface)",
                borderRadius: 12,
                border: "1px solid color-mix(in srgb, var(--wp-text) 8%, transparent)",
              }}
            >
              <button
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-[15px] font-semibold"
                onClick={() => setOpenIdx(open ? null : i)}
                aria-expanded={open}
              >
                {item.q}
                <ChevronDown
                  className={`h-4 w-4 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                  style={{ color: "var(--wp-primary)" }}
                  aria-hidden
                />
              </button>
              {open && (
                <p className="px-5 pb-5 text-[14px] leading-relaxed" style={{ color: "var(--wp-text-muted)" }}>
                  {item.a}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </SectionShell>
  );
}
