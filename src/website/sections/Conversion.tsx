import { useState } from "react";
import { Check, Clock, Mail, MapPin, Phone, Send } from "lucide-react";
import type {
  ContactContent,
  CtaContent,
  NewsletterContent,
  WhatsappCtaContent,
} from "@/types";
import { CTALink, SectionHeading, SectionShell, useSectionStyle, useWebsiteTheme } from "@/website/renderer";
import { WhatsAppGlyph } from "./Restaurant";

/* ============================================================
   Conversion sections — CTA, Contact, Newsletter, WhatsApp CTA
   ============================================================ */

export function CtaSection({ content }: { content: CtaContent }) {
  const { radius, theme } = useWebsiteTheme();
  const { variant } = useSectionStyle();

  /* Simple variant — quiet, no accent band */
  if (variant === "simple") {
    return (
      <SectionShell id="cta">
        <div className="mx-auto max-w-2xl py-6 text-center">
          <h2 className="text-3xl font-bold md:text-4xl" style={{ fontFamily: "var(--wp-font-heading)", color: "var(--wp-text)" }}>
            {content.title}
          </h2>
          {content.text && (
            <p className="mx-auto mt-3 max-w-xl text-[15.5px] leading-relaxed" style={{ color: "var(--wp-text-muted)" }}>
              {content.text}
            </p>
          )}
          {(content.primaryCTA?.label || content.secondaryCTA?.label) && (
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              {content.primaryCTA?.label && <CTALink cta={content.primaryCTA} />}
              {content.secondaryCTA?.label && <CTALink cta={content.secondaryCTA} />}
            </div>
          )}
        </div>
      </SectionShell>
    );
  }

  return (
    <SectionShell id="cta">
      <div
        className={`relative overflow-hidden px-8 py-12 text-center md:px-16 md:py-16 ${theme.cardStyle === "elevated" ? "shadow-xl" : ""}`}
        style={{
          background: "var(--wp-primary)",
          borderRadius: theme.radius === "none" ? 8 : theme.radius === "sm" ? 12 : theme.radius === "md" ? 24 : 32,
          color: "#fff",
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(480px 220px at 50% -20%, rgba(255,255,255,0.22), transparent 70%)" }}
        />
        <div className="relative">
          <h2 className="mx-auto max-w-2xl text-3xl font-bold md:text-4xl" style={{ fontFamily: "var(--wp-font-heading)" }}>
            {content.title}
          </h2>
          {content.text && <p className="mx-auto mt-3 max-w-xl text-[15.5px] leading-relaxed opacity-90">{content.text}</p>}
          {(content.primaryCTA?.label || content.secondaryCTA?.label) && (
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              {content.primaryCTA?.label && (
                <a
                  href={content.primaryCTA.href}
                  className={`inline-flex items-center justify-center gap-2 px-6 py-3 text-[15px] font-semibold transition-transform hover:-translate-y-0.5 ${radius} ${
                    theme.buttonStyle === "pill" ? "rounded-full" : ""
                  }`}
                  style={{ background: "#ffffff", color: "var(--wp-primary)" }}
                >
                  {content.primaryCTA.label}
                </a>
              )}
              {content.secondaryCTA?.label && (
                <a
                  href={content.secondaryCTA.href}
                  className={`inline-flex items-center justify-center gap-2 border px-6 py-3 text-[15px] font-semibold transition-transform hover:-translate-y-0.5 ${radius} ${
                    theme.buttonStyle === "pill" ? "rounded-full" : ""
                  }`}
                  style={{ borderColor: "rgba(255,255,255,0.5)" }}
                >
                  {content.secondaryCTA.label}
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </SectionShell>
  );
}

export function ContactSection({ content, features }: { content: ContactContent; features?: { contactForm?: boolean } }) {
  const { brand, radius, theme } = useWebsiteTheme();
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: "", message: "" });
  const info = content.info;
  const showForm = features?.contactForm ?? true;

  const rows = [
    { icon: Mail, label: "Email", value: info.email },
    { icon: Phone, label: "Phone", value: info.phone },
    info.whatsapp ? { icon: null, label: "WhatsApp", value: info.whatsapp } : null,
    { icon: MapPin, label: "Address", value: info.address },
    info.hours.length ? { icon: Clock, label: "Hours", value: info.hours.join(" · ") } : null,
  ].filter((r): r is { icon: typeof Mail | null; label: string; value: string } => Boolean(r && r.value));

  return (
    <SectionShell id="contact" tone="alt">
      <SectionHeading title={content.title} subtitle={content.subtitle} center />
      <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-4">
          {rows.map((r) => (
            <div
              key={r.label}
              className="flex items-start gap-3.5 p-4"
              style={{
                background: "var(--wp-surface)",
                borderRadius: theme.radius === "none" ? 4 : theme.radius === "sm" ? 8 : 14,
                border: "1px solid color-mix(in srgb, var(--wp-text) 8%, transparent)",
              }}
            >
              {r.icon && (
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ background: "color-mix(in srgb, var(--wp-primary) 12%, transparent)", color: "var(--wp-primary)" }}>
                  <r.icon className="h-4 w-4" aria-hidden />
                </span>
              )}
              <span className="min-w-0">
                <span className="block text-[12px] font-semibold uppercase tracking-wider" style={{ color: "var(--wp-text-muted)" }}>
                  {r.label}
                </span>
                <span className="mt-0.5 block break-words text-[14.5px] font-medium" style={{ color: "var(--wp-text)" }}>
                  {r.value}
                </span>
              </span>
            </div>
          ))}
        </div>

        {showForm && (
          <form
            className="p-6"
            style={{
              background: "var(--wp-surface)",
              borderRadius: theme.radius === "none" ? 4 : theme.radius === "sm" ? 8 : 16,
              border: "1px solid color-mix(in srgb, var(--wp-text) 8%, transparent)",
            }}
            onSubmit={(e) => {
              e.preventDefault();
              if (form.name.trim() && form.message.trim()) {
                setSent(true);
                setForm({ name: "", message: "" });
                window.setTimeout(() => setSent(false), 4000);
              }
            }}
          >
            {sent ? (
              <div className="flex min-h-[280px] flex-col items-center justify-center text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: "color-mix(in srgb, var(--wp-primary) 14%, transparent)", color: "var(--wp-primary)" }}>
                  <Check className="h-5 w-5" aria-hidden />
                </span>
                <p className="mt-4 text-[16px] font-semibold">Message ready to send</p>
                <p className="mt-1 text-[13.5px]" style={{ color: "var(--wp-text-muted)" }}>
                  Connect your form service in the export to receive submissions.
                </p>
              </div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-[13px] font-semibold" style={{ color: "var(--wp-text)" }}>
                      Your name
                    </span>
                    <input
                      className="w-full rounded-lg border px-3.5 py-2.5 text-[14px] outline-none transition-colors"
                      style={{
                        borderColor: "color-mix(in srgb, var(--wp-text) 18%, transparent)",
                        background: "var(--wp-bg)",
                        color: "var(--wp-text)",
                      }}
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      required
                      placeholder="Your name"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-[13px] font-semibold" style={{ color: "var(--wp-text)" }}>
                      Phone / Email
                    </span>
                    <input
                      className="w-full rounded-lg border px-3.5 py-2.5 text-[14px] outline-none transition-colors"
                      style={{
                        borderColor: "color-mix(in srgb, var(--wp-text) 18%, transparent)",
                        background: "var(--wp-bg)",
                        color: "var(--wp-text)",
                      }}
                      placeholder="How can we reach you?"
                    />
                  </label>
                </div>
                <label className="mt-4 block">
                  <span className="mb-1.5 block text-[13px] font-semibold" style={{ color: "var(--wp-text)" }}>
                    Message
                  </span>
                  <textarea
                    className="min-h-[110px] w-full rounded-lg border px-3.5 py-2.5 text-[14px] leading-relaxed outline-none transition-colors"
                    style={{
                      borderColor: "color-mix(in srgb, var(--wp-text) 18%, transparent)",
                      background: "var(--wp-bg)",
                      color: "var(--wp-text)",
                    }}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    required
                    placeholder={`Hi ${brand.businessName || "there"} — I'd like to ask about…`}
                  />
                </label>
                <button
                  type="submit"
                  className={`mt-5 inline-flex items-center gap-2 px-6 py-3 text-[14.5px] font-semibold text-white transition-opacity hover:opacity-90 ${radius} ${theme.buttonStyle === "pill" ? "rounded-full" : ""}`}
                  style={{ background: "var(--wp-primary)" }}
                >
                  <Send className="h-4 w-4" aria-hidden /> Send Message
                </button>
              </>
            )}
          </form>
        )}
      </div>
    </SectionShell>
  );
}

export function NewsletterSection({ content }: { content: NewsletterContent }) {
  const { radius, theme } = useWebsiteTheme();
  const [done, setDone] = useState(false);
  const [email, setEmail] = useState("");
  return (
    <SectionShell id="newsletter">
      <div
        className={`px-8 py-12 text-center ${theme.cardStyle === "elevated" ? "shadow-lg" : ""}`}
        style={{
          background: "var(--wp-secondary)",
          color: "var(--wp-bg)",
          borderRadius: theme.radius === "none" ? 8 : theme.radius === "sm" ? 12 : 20,
        }}
      >
        <h2 className="text-2xl font-bold md:text-3xl" style={{ fontFamily: "var(--wp-font-heading)" }}>
          {content.title}
        </h2>
        {content.subtitle && <p className="mx-auto mt-2 max-w-md text-[14.5px] opacity-85">{content.subtitle}</p>}
        {done ? (
          <p className="mt-6 inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2.5 text-[14px] font-medium">
            <Check className="h-4 w-4" aria-hidden /> You're on the list — see you soon.
          </p>
        ) : (
          <form
            className="mx-auto mt-6 flex max-w-md flex-col gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              if (email.includes("@")) {
                setDone(true);
                setEmail("");
                window.setTimeout(() => setDone(false), 4000);
              }
            }}
          >
            <label className="sr-only" htmlFor="nl-email">Email address</label>
            <input
              id="nl-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              className="flex-1 rounded-lg border border-white/25 bg-white/10 px-4 py-3 text-[14px] outline-none placeholder:opacity-60"
            />
            <button
              type="submit"
              className={`px-6 py-3 text-[14px] font-semibold transition-transform hover:-translate-y-0.5 ${radius}`}
              style={{ background: "var(--wp-primary)", color: "#fff" }}
            >
              Subscribe
            </button>
          </form>
        )}
      </div>
    </SectionShell>
  );
}

export function WhatsappFloat({ content }: { content: WhatsappCtaContent }) {
  const href = content.cta?.href || (content.number ? `https://wa.me/${content.number.replace(/\D/g, "")}` : "#");
  const position = content.position === "left" ? "left" : "right";
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={content.cta?.label || "Chat on WhatsApp"}
      className="fixed bottom-5 z-50 flex items-center gap-2.5 rounded-full py-3 pe-5 ps-4 font-semibold text-white shadow-xl transition-transform hover:-translate-y-1"
      style={{
        background: "#25d366",
        [position]: "20px",
      }}
    >
      <WhatsAppGlyph className="h-5 w-5" />
      <span className="text-[14px]">{content.cta?.label || "WhatsApp"}</span>
    </a>
  );
}

/* ---------- CTA helper re-export (used by renderer) ---------- */
export { CTALink } from "@/website/renderer";
