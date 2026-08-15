import type { SectionType, WebsiteTemplate } from "@/types";

/* ============================================================
   Template library — compositions of reusable sections.
   A template is NEVER edited by a project; projects deep-clone
   a template's structure into their own configuration.
   ============================================================ */

import { DEMO_IMAGES } from "@/data/demoImages";
export { DEMO_IMAGES };

export const TEMPLATES: WebsiteTemplate[] = [
  /* ---------------- Restaurant ---------------- */
  {
    id: "tpl-rest-elegant",
    name: "Elegant Restaurant",
    category: "restaurant",
    style: "Elegant",
    description: "Warm, refined dining experience with menu, gallery and reservation.",
    previewImage: DEMO_IMAGES.cakesHero,
    accentColor: "#d4a017",
    defaultSections: ["navbar", "hero", "about", "menu", "stats", "gallery", "testimonials", "reservation", "location", "cta", "footer"],
    pages: [
      { name: "Home", path: "/", sections: ["navbar", "hero", "about", "menu", "stats", "gallery", "testimonials", "reservation", "location", "cta", "footer"] },
      { name: "Menu", path: "/menu", sections: ["navbar", "menu", "cta", "footer"] },
      { name: "Gallery", path: "/gallery", sections: ["navbar", "gallery", "footer"] },
      { name: "Contact", path: "/contact", sections: ["navbar", "contact", "location", "footer"] },
    ],
    themePresetId: "elegant",
    features: ["whatsapp", "booking", "maps", "instagram", "analytics", "seo", "gallery", "testimonials"],
    featured: true,
  },
  {
    id: "tpl-rest-modern",
    name: "Modern Food",
    category: "restaurant",
    style: "Modern",
    description: "Clean, fast-food energy with bold imagery and online ordering.",
    previewImage: DEMO_IMAGES.hawawshi,
    accentColor: "#f97316",
    defaultSections: ["navbar", "hero", "menu", "gallery", "stats", "testimonials", "location", "cta", "footer"],
    pages: [
      { name: "Home", path: "/", sections: ["navbar", "hero", "menu", "gallery", "stats", "testimonials", "location", "cta", "footer"] },
      { name: "Menu", path: "/menu", sections: ["navbar", "menu", "cta", "footer"] },
      { name: "Contact", path: "/contact", sections: ["navbar", "contact", "location", "footer"] },
    ],
    themePresetId: "bold",
    features: ["whatsapp", "ordering", "maps", "seo", "gallery", "testimonials"],
    featured: false,
  },
  {
    id: "tpl-rest-premium",
    name: "Premium Dining",
    category: "restaurant",
    style: "Luxury",
    description: "Dark, editorial fine-dining experience for high-end venues.",
    previewImage: DEMO_IMAGES.fineDining,
    accentColor: "#d4af37",
    defaultSections: ["navbar", "hero", "about", "menu", "gallery", "testimonials", "reservation", "location", "footer"],
    pages: [
      { name: "Home", path: "/", sections: ["navbar", "hero", "about", "menu", "gallery", "testimonials", "reservation", "location", "footer"] },
      { name: "Menu", path: "/menu", sections: ["navbar", "menu", "footer"] },
      { name: "Reservations", path: "/reservations", sections: ["navbar", "reservation", "footer"] },
      { name: "Contact", path: "/contact", sections: ["navbar", "contact", "location", "footer"] },
    ],
    themePresetId: "luxury",
    features: ["whatsapp", "booking", "maps", "seo", "gallery", "testimonials"],
    featured: false,
  },

  /* ---------------- Business ---------------- */
  {
    id: "tpl-biz-corporate",
    name: "Corporate Modern",
    category: "business",
    style: "Corporate",
    description: "Trustworthy corporate site with services, team and case studies.",
    previewImage: DEMO_IMAGES.businessTeam,
    accentColor: "#1d4ed8",
    defaultSections: ["navbar", "hero", "stats", "services", "about", "features", "caseStudies", "team", "testimonials", "cta", "contact", "footer"],
    pages: [
      { name: "Home", path: "/", sections: ["navbar", "hero", "stats", "services", "about", "features", "caseStudies", "team", "testimonials", "cta", "contact", "footer"] },
      { name: "About", path: "/about", sections: ["navbar", "about", "stats", "team", "footer"] },
      { name: "Services", path: "/services", sections: ["navbar", "services", "industries", "cta", "footer"] },
      { name: "Contact", path: "/contact", sections: ["navbar", "contact", "footer"] },
    ],
    themePresetId: "corporate",
    features: ["whatsapp", "contactForm", "maps", "analytics", "seo", "testimonials"],
    featured: true,
  },
  {
    id: "tpl-biz-professional",
    name: "Professional Business",
    category: "business",
    style: "Minimal",
    description: "Polished, no-nonsense site for professional services firms.",
    previewImage: DEMO_IMAGES.cafeInterior,
    accentColor: "#18181b",
    defaultSections: ["navbar", "hero", "about", "services", "process", "stats", "testimonials", "contact", "footer"],
    pages: [
      { name: "Home", path: "/", sections: ["navbar", "hero", "about", "services", "process", "stats", "testimonials", "contact", "footer"] },
      { name: "About", path: "/about", sections: ["navbar", "about", "team", "footer"] },
      { name: "Contact", path: "/contact", sections: ["navbar", "contact", "location", "footer"] },
    ],
    themePresetId: "minimal",
    features: ["contactForm", "seo", "testimonials"],
    featured: false,
  },
  {
    id: "tpl-biz-agency",
    name: "Creative Agency",
    category: "business",
    style: "Bold",
    description: "Expressive agency site for studios and creative teams.",
    previewImage: DEMO_IMAGES.portfolioWork,
    accentColor: "#f43f5e",
    defaultSections: ["announcement", "navbar", "hero", "clients", "services", "projects", "stats", "process", "testimonials", "cta", "contact", "footer"],
    pages: [
      { name: "Home", path: "/", sections: ["announcement", "navbar", "hero", "clients", "services", "projects", "stats", "process", "testimonials", "cta", "contact", "footer"] },
      { name: "Work", path: "/work", sections: ["navbar", "projects", "caseStudies", "footer"] },
      { name: "About", path: "/about", sections: ["navbar", "about", "team", "footer"] },
      { name: "Contact", path: "/contact", sections: ["navbar", "contact", "footer"] },
    ],
    themePresetId: "bold",
    features: ["whatsapp", "contactForm", "analytics", "seo", "testimonials", "gallery"],
    featured: true,
  },

  /* ---------------- Landing ---------------- */
  {
    id: "tpl-land-product",
    name: "Product Launch",
    category: "landing",
    style: "Bold",
    description: "High-converting launch page with features, stats and CTA.",
    previewImage: DEMO_IMAGES.landingDashboard,
    accentColor: "#f43f5e",
    defaultSections: ["navbar", "hero", "features", "stats", "testimonials", "faq", "cta", "footer"],
    pages: [
      { name: "Home", path: "/", sections: ["navbar", "hero", "features", "stats", "testimonials", "faq", "cta", "footer"] },
    ],
    themePresetId: "bold",
    features: ["whatsapp", "analytics", "seo", "newsletter"],
    featured: true,
  },
  {
    id: "tpl-land-conversion",
    name: "Conversion Landing",
    category: "landing",
    style: "Modern",
    description: "Focused single goal: one clear offer, one clear action.",
    previewImage: DEMO_IMAGES.landingDashboard,
    accentColor: "#10b981",
    defaultSections: ["navbar", "hero", "stats", "about", "testimonials", "faq", "cta", "footer"],
    pages: [
      { name: "Home", path: "/", sections: ["navbar", "hero", "stats", "about", "testimonials", "faq", "cta", "footer"] },
    ],
    themePresetId: "modern",
    features: ["whatsapp", "contactForm", "analytics", "seo", "newsletter"],
    featured: false,
  },
  {
    id: "tpl-land-service",
    name: "Premium Service",
    category: "landing",
    style: "Elegant",
    description: "Upscale single page for premium service offerings.",
    previewImage: DEMO_IMAGES.cafeInterior,
    accentColor: "#a16207",
    defaultSections: ["navbar", "hero", "about", "services", "process", "testimonials", "faq", "cta", "contact", "footer"],
    pages: [
      { name: "Home", path: "/", sections: ["navbar", "hero", "about", "services", "process", "testimonials", "faq", "cta", "contact", "footer"] },
    ],
    themePresetId: "elegant",
    features: ["whatsapp", "contactForm", "seo", "testimonials"],
    featured: false,
  },

  /* ---------------- Portfolio ---------------- */
  {
    id: "tpl-port-creative",
    name: "Creative Portfolio",
    category: "portfolio",
    style: "Modern",
    description: "Bold personal showcase for designers and creatives.",
    previewImage: DEMO_IMAGES.portfolioWork,
    accentColor: "#10b981",
    defaultSections: ["navbar", "hero", "projects", "skills", "stats", "testimonials", "clients", "cta", "contact", "footer"],
    pages: [
      { name: "Home", path: "/", sections: ["navbar", "hero", "projects", "skills", "stats", "testimonials", "clients", "cta", "contact", "footer"] },
      { name: "Work", path: "/work", sections: ["navbar", "projects", "footer"] },
      { name: "About", path: "/about", sections: ["navbar", "about", "experience", "footer"] },
      { name: "Contact", path: "/contact", sections: ["navbar", "contact", "footer"] },
    ],
    themePresetId: "modern",
    features: ["whatsapp", "contactForm", "seo", "testimonials", "gallery"],
    featured: true,
  },
  {
    id: "tpl-port-developer",
    name: "Developer Portfolio",
    category: "portfolio",
    style: "Minimal",
    description: "Dark, sharp portfolio for engineers and makers.",
    previewImage: DEMO_IMAGES.landingDashboard,
    accentColor: "#38bdf8",
    defaultSections: ["navbar", "hero", "skills", "projects", "experience", "contact", "footer"],
    pages: [
      { name: "Home", path: "/", sections: ["navbar", "hero", "skills", "projects", "experience", "contact", "footer"] },
      { name: "Projects", path: "/projects", sections: ["navbar", "projects", "footer"] },
    ],
    themePresetId: "luxury",
    features: ["contactForm", "seo"],
    featured: false,
  },
  {
    id: "tpl-port-minimal",
    name: "Minimal Portfolio",
    category: "portfolio",
    style: "Minimal",
    description: "Quiet, gallery-led portfolio that lets the work speak.",
    previewImage: DEMO_IMAGES.gallery1,
    accentColor: "#18181b",
    defaultSections: ["navbar", "hero", "projects", "about", "testimonials", "cta", "footer"],
    pages: [
      { name: "Home", path: "/", sections: ["navbar", "hero", "projects", "about", "testimonials", "cta", "footer"] },
      { name: "Gallery", path: "/gallery", sections: ["navbar", "gallery", "footer"] },
    ],
    themePresetId: "minimal",
    features: ["seo", "gallery"],
    featured: false,
  },
];

export function getTemplate(id: string): WebsiteTemplate | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

export function templatesForCategory(category: string): WebsiteTemplate[] {
  return TEMPLATES.filter((t) => t.category === category);
}

export function templateSections(tpl: WebsiteTemplate): SectionType[] {
  return tpl.defaultSections;
}
