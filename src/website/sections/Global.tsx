import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import type { FooterContent, NavbarContent, AnnouncementContent } from "@/types";
import { useSectionStyle, useWebsiteTheme } from "@/website/renderer";

/* ============================================================
   Global sections — Navbar, Announcement Bar, Footer
   ============================================================ */

export function NavbarSection({ content }: { content: NavbarContent }) {
  const { brand, radius, theme } = useWebsiteTheme();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    /* Listen with capture so scrolling inside the editor canvas also updates the navbar */
    const onScroll = () => setScrolled((window.scrollY || document.querySelector("#ks-preview-canvas")?.scrollTop || 0) > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("scroll", onScroll, { capture: true } as never);
    };
  }, []);

  const nav = content.nav ?? [];
  const r = theme.buttonStyle === "pill" ? "rounded-full" : radius;

  return (
    <header
      className={`sticky top-0 z-40 transition-shadow ${
        scrolled ? "shadow-md" : ""
      }`}
      style={{ background: "color-mix(in srgb, var(--wp-bg) 88%, transparent)", backdropFilter: "blur(12px)" }}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 md:px-8">
        {/* Logo */}
        <a href="#" className="flex items-center gap-2.5" aria-label={`${brand.businessName} home`}>
          {brand.logoUrl ? (
            <img src={brand.logoUrl} alt="" className="h-8 w-8 object-contain" />
          ) : (
            <span
              className="flex h-8 w-8 items-center justify-center text-sm font-bold text-white"
              style={{ background: "var(--wp-primary)", borderRadius: theme.radius === "none" ? 4 : 8 }}
              aria-hidden
            >
              {(brand.logoText || brand.businessName || "K").slice(0, 1).toUpperCase()}
            </span>
          )}
          <span className="text-[15px] font-bold tracking-tight" style={{ color: "var(--wp-text)", fontFamily: "var(--wp-font-heading)" }}>
            {brand.logoText || brand.businessName || "Your Brand"}
          </span>
        </a>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-7 md:flex" aria-label="Primary">
          {nav.map((item) => (
            <a
              key={item.label + item.href}
              href={item.href}
              className="text-[14px] font-medium transition-opacity hover:opacity-70"
              style={{ color: "var(--wp-text)" }}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {content.cta?.label && (
            <a
              href={content.cta.href}
              className={`hidden px-4 py-2 text-[13.5px] font-semibold text-white transition-opacity hover:opacity-90 sm:inline-flex ${r}`}
              style={{ background: "var(--wp-primary)" }}
            >
              {content.cta.label}
            </a>
          )}
          <button
            className="inline-flex h-9 w-9 items-center justify-center md:hidden"
            onClick={() => setOpen(!open)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {open && (
        <nav
          className="border-t px-5 py-3 md:hidden"
          style={{ borderColor: "rgba(128,128,128,0.2)", background: "var(--wp-bg)" }}
          aria-label="Mobile"
        >
          {nav.map((item) => (
            <a
              key={item.label + item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block py-2.5 text-[15px] font-medium"
              style={{ color: "var(--wp-text)" }}
            >
              {item.label}
            </a>
          ))}
          {content.cta?.label && (
            <a
              href={content.cta.href}
              className={`mt-2 inline-block px-4 py-2.5 text-[14px] font-semibold text-white ${r}`}
              style={{ background: "var(--wp-primary)" }}
            >
              {content.cta.label}
            </a>
          )}
        </nav>
      )}
    </header>
  );
}

export function AnnouncementBar({ content }: { content: AnnouncementContent }) {
  if (!content.text) return null;
  return (
    <div
      className="flex items-center justify-center px-4 py-2 text-center text-[13px] font-medium"
      style={{ background: "var(--wp-secondary)", color: "var(--wp-bg)" }}
    >
      {content.text}
    </div>
  );
}

export function FooterSection({ content }: { content: FooterContent }) {
  const { brand } = useWebsiteTheme();
  const { variant } = useSectionStyle();

  /* Minimal variant — brand + copyright only */
  if (variant === "minimal") {
    return (
      <footer style={{ background: "var(--wp-secondary)", color: "var(--wp-bg)" }}>
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-5 py-10 text-center md:flex-row md:justify-between md:px-8 md:text-left">
          <p className="text-[15px] font-bold" style={{ fontFamily: "var(--wp-font-heading)" }}>
            {brand.logoText || brand.businessName}
          </p>
          <p className="text-xs opacity-60">
            {content.text || `© ${new Date().getFullYear()} ${brand.businessName}. All rights reserved.`}
          </p>
        </div>
      </footer>
    );
  }

  return (
    <footer style={{ background: "var(--wp-secondary)", color: "var(--wp-bg)" }}>
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr] md:px-8">
        <div>
          <p className="text-lg font-bold" style={{ fontFamily: "var(--wp-font-heading)" }}>
            {brand.logoText || brand.businessName}
          </p>
          {brand.tagline && <p className="mt-2 max-w-xs text-[13.5px] opacity-80">{brand.tagline}</p>}
          {brand.social.filter((s) => s.url).length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {brand.social
                .filter((s) => s.url)
                .map((s) => (
                  <a
                    key={s.label}
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-md border border-white/20 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-white/10"
                  >
                    {s.label}
                  </a>
                ))}
            </div>
          )}
        </div>
        {(content.columns ?? []).map((col) => (
          <div key={col.title}>
            <p className="text-[13px] font-semibold uppercase tracking-wider opacity-70">{col.title}</p>
            <ul className="mt-4 space-y-2.5">
              {col.links.map((l) => (
                <li key={l.label + l.href}>
                  <a href={l.href} className="text-[13.5px] opacity-90 transition-opacity hover:opacity-60">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-6xl px-5 py-5 text-center text-xs opacity-60 md:px-8">
          {content.text || `© ${new Date().getFullYear()} ${brand.businessName}. All rights reserved.`}
        </p>
      </div>
    </footer>
  );
}
