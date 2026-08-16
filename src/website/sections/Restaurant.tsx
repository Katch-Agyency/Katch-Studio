import type { GalleryContent, LocationContent, MenuContent, ReservationContent } from "@/types";
import {
  SectionHeading,
  SectionShell,
  SmartImage,
  useSectionStyle,
  useWebsiteTheme,
} from "@/website/renderer";

/* ============================================================
   Restaurant sections — Menu, Gallery, Reservation, Location
   ============================================================ */

export function MenuSection({ content }: { content: MenuContent }) {
  const { radius } = useWebsiteTheme();
  const { variant } = useSectionStyle();
  const categories = content.categories ?? [];
  if (categories.length === 0) return null;
  return (
    <SectionShell id="menu" tone="alt">
      <SectionHeading title={content.title} subtitle={content.subtitle} center />
      <div className={`grid gap-6 ${variant === "list" ? "mx-auto max-w-3xl lg:grid-cols-1" : "lg:grid-cols-3"}`}>
        {categories.map((cat) => (
          <div
            key={cat.name}
            className="p-6"
            style={{
              background: "var(--wp-surface)",
              borderRadius: radius === "none" ? 4 : radius === "sm" ? 8 : 16,
              border: "1px solid color-mix(in srgb, var(--wp-text) 8%, transparent)",
            }}
          >
            <h3 className="text-[17px] font-bold" style={{ color: "var(--wp-text)", fontFamily: "var(--wp-font-heading)" }}>
              {cat.name}
            </h3>
            <div className="mt-4 space-y-4">
              {cat.items.map((item) => (
                <div key={item.name} className="flex items-baseline justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[14.5px] font-semibold" style={{ color: "var(--wp-text)" }}>
                      {item.name}
                    </p>
                    {item.description && (
                      <p className="mt-0.5 text-[12.5px] leading-relaxed" style={{ color: "var(--wp-text-muted)" }}>
                        {item.description}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 text-[13.5px] font-bold" style={{ color: "var(--wp-primary)" }}>
                    {item.price}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

export function GallerySection({ content }: { content: GalleryContent }) {
  const { radius } = useWebsiteTheme();
  const { variant } = useSectionStyle();
  const images = (content.images ?? []).filter((i) => i.src || i.alt);
  if (images.length === 0) return null;

  const r = radius === "none" ? 4 : radius === "sm" ? 8 : 16;

  /* Square — compact social-feed tiles */
  if (variant === "square") {
    return (
      <SectionShell id="gallery">
        <SectionHeading title={content.title} subtitle={content.subtitle} center />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-6">
          {images.map((img, i) => (
            <figure key={img.src + i} className="group relative overflow-hidden" style={{ borderRadius: r }}>
              <SmartImage
                src={img.src}
                alt={img.alt || "Gallery image"}
                className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-[1.05]"
              />
            </figure>
          ))}
        </div>
      </SectionShell>
    );
  }

  const mosaic = variant === "mosaic";
  return (
    <SectionShell id="gallery">
      <SectionHeading title={content.title} subtitle={content.subtitle} center />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
        {images.map((img, i) => (
          <figure
            key={img.src + i}
            className={`group relative overflow-hidden ${
              mosaic && i === 0 ? "col-span-2 row-span-2 md:col-span-2" : ""
            }`}
            style={{ borderRadius: r }}
          >
            <SmartImage
              src={img.src}
              alt={img.alt || "Gallery image"}
              className={`w-full object-cover transition-transform duration-300 group-hover:scale-[1.04] ${
                mosaic && i === 0 ? "aspect-[4/3] h-full" : "aspect-[4/3]"
              }`}
            />
            {img.caption && (
              <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 pb-3 pt-8 text-[13px] font-medium text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                {img.caption}
              </figcaption>
            )}
          </figure>
        ))}
      </div>
    </SectionShell>
  );
}

export function ReservationSection({ content }: { content: ReservationContent }) {
  const { brand, radius } = useWebsiteTheme();
  const wa = brand.whatsapp ? `https://wa.me/${brand.whatsapp.replace(/\D/g, "")}` : null;
  return (
    <section
      className="relative overflow-hidden py-16 md:py-20"
      style={{ background: "var(--wp-primary)", color: "#fff" }}
    >
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <p className="text-[13px] font-semibold uppercase tracking-[0.16em] opacity-80">{content.subtitle}</p>
            <h2 className="mt-2 text-3xl font-bold md:text-4xl" style={{ fontFamily: "var(--wp-font-heading)" }}>
              {content.title}
            </h2>
            {content.note && <p className="mt-4 max-w-lg text-[15px] leading-relaxed opacity-90">{content.note}</p>}
            <div className="mt-7 flex flex-wrap gap-3">
              {wa && (
                <a
                  href={wa}
                  target="_blank"
                  rel="noreferrer"
                  className={`inline-flex items-center justify-center gap-2 px-6 py-3 text-[15px] font-semibold text-white shadow-md transition-transform hover:-translate-y-0.5 ${radius}`}
                  style={{ background: "rgba(0,0,0,0.28)" }}
                >
                  <WhatsAppGlyph className="h-[18px] w-[18px]" />
                  Book via WhatsApp
                </a>
              )}
              {brand.phone && (
                <a
                  href={`tel:${brand.phone.replace(/\s/g, "")}`}
                  className={`inline-flex items-center justify-center gap-2 border px-6 py-3 text-[15px] font-semibold transition-transform hover:-translate-y-0.5 ${radius}`}
                  style={{ borderColor: "rgba(255,255,255,0.45)" }}
                >
                  Call {brand.phone}
                </a>
              )}
            </div>
          </div>
          <div
            className="p-6"
            style={{ background: "rgba(0,0,0,0.2)", borderRadius: radius === "none" ? 4 : radius === "sm" ? 8 : 20 }}
          >
            <p className="text-sm font-semibold uppercase tracking-wider opacity-80">Reservation</p>
            <p className="mt-2 text-2xl font-bold" style={{ fontFamily: "var(--wp-font-heading)" }}>
              {brand.tagline || "Book your table"}
            </p>
            <p className="mt-1 text-sm opacity-85">Fast confirmation · Free cancellation 2h before</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function LocationSection({ content, mapsEnabled = true }: { content: LocationContent; mapsEnabled?: boolean }) {
  const { radius } = useWebsiteTheme();
  const showMap = mapsEnabled && Boolean(content.mapQuery);
  return (
    <SectionShell id="location" tone="alt">
      <div className="grid items-center gap-10 lg:grid-cols-2">
        <div>
          <SectionHeading title={content.title} subtitle={content.subtitle} />
          {(content.hours ?? []).length > 0 && (
            <div className="space-y-2.5">
              <p className="text-[13px] font-semibold uppercase tracking-wider" style={{ color: "var(--wp-text-muted)" }}>
                Opening Hours
              </p>
              {content.hours.map((h) => (
                <p key={h} className="text-[15px] font-medium" style={{ color: "var(--wp-text)" }}>
                  {h}
                </p>
              ))}
            </div>
          )}
          {showMap && (
            <div
              className="mt-6 overflow-hidden border"
              style={{ borderRadius: radius === "none" ? 4 : radius === "sm" ? 8 : 16, borderColor: "color-mix(in srgb, var(--wp-text) 10%, transparent)" }}
            >
              <iframe
                title="Location map"
                src={`https://www.google.com/maps?q=${encodeURIComponent(content.mapQuery)}&output=embed`}
                className="h-64 w-full"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          )}
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center gap-4 p-5"
              style={{
                background: "var(--wp-surface)",
                borderRadius: radius === "none" ? 4 : radius === "sm" ? 8 : 16,
                border: "1px solid color-mix(in srgb, var(--wp-text) 8%, transparent)",
              }}
            >
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ background: "var(--wp-primary)" }}
              >
                {i}
              </span>
              <p className="text-[14px] leading-relaxed" style={{ color: "var(--wp-text-muted)" }}>
                {i === 1
                  ? "Easily reachable from anywhere in the city — see the map for directions."
                  : i === 2
                    ? "Free parking available for guests right outside."
                    : "Delivery available across the city during opening hours."}
              </p>
            </div>
          ))}
        </div>
      </div>
    </SectionShell>
  );
}

/* ---------- WhatsApp glyph (inline, no external assets) ---------- */

export function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12.04 2c-5.46 0-9.9 4.44-9.9 9.9 0 1.75.46 3.45 1.32 4.95L2 22l5.3-1.39a9.87 9.87 0 0 0 4.74 1.21h.01c5.46 0 9.9-4.44 9.9-9.9 0-2.64-1.03-5.13-2.9-7A9.85 9.85 0 0 0 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23Zm4.52-6.16c-.25-.13-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.14.16-.29.18-.54.06-.25-.13-1.05-.39-2-1.23-.73-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.51.11-.11.25-.29.37-.43.13-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.13-.56-1.35-.77-1.84-.2-.48-.4-.42-.56-.43h-.48c-.16 0-.43.06-.66.31-.22.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.13.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.1-.23-.16-.48-.29Z" />
    </svg>
  );
}
