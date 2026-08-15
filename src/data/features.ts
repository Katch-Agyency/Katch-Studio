import type { TemplateFeature, WebsiteCategory } from "@/types";

/* ============================================================
   Website categories + optional feature catalog.
   E-commerce & SaaS are architected but flagged unavailable
   for the MVP — no dead ends, no fake flows.
   ============================================================ */

export const WEBSITE_CATEGORIES: WebsiteCategory[] = [
  {
    id: "restaurant",
    label: "Restaurant",
    description: "Menus, galleries, reservations and location",
    icon: "utensils-crossed",
    available: true,
  },
  {
    id: "business",
    label: "Business",
    description: "Corporate sites with services, team and results",
    icon: "briefcase",
    available: true,
  },
  {
    id: "landing",
    label: "Landing Page",
    description: "Focused pages built to convert",
    icon: "rocket",
    available: true,
  },
  {
    id: "portfolio",
    label: "Portfolio",
    description: "Personal showcases for creatives and freelancers",
    icon: "palette",
    available: true,
  },
  {
    id: "ecommerce",
    label: "E-commerce",
    description: "Online stores with products and checkout",
    icon: "shopping-bag",
    available: false,
  },
  {
    id: "saas",
    label: "SaaS",
    description: "Product sites with features and pricing",
    icon: "layers",
    available: false,
  },
];

export function getCategory(id: string): WebsiteCategory | undefined {
  return WEBSITE_CATEGORIES.find((c) => c.id === id);
}

export const TEMPLATE_FEATURES: TemplateFeature[] = [
  {
    id: "whatsapp",
    name: "WhatsApp CTA",
    description: "Floating WhatsApp button for instant chat",
    icon: "message-circle",
    categories: "all",
  },
  {
    id: "contactForm",
    name: "Contact Form",
    description: "Message form in the contact section",
    icon: "mail",
    categories: "all",
  },
  {
    id: "maps",
    name: "Google Maps",
    description: "Embedded map in the location section",
    icon: "map-pin",
    categories: "all",
  },
  {
    id: "booking",
    name: "Booking",
    description: "Reservation section for restaurants and services",
    icon: "calendar-check",
    categories: ["restaurant", "business"],
  },
  {
    id: "ordering",
    name: "Online Ordering",
    description: "Order buttons on menu items",
    icon: "shopping-bag",
    categories: ["restaurant"],
  },
  {
    id: "instagram",
    name: "Instagram",
    description: "Instagram feed block and social links",
    icon: "instagram",
    categories: "all",
  },
  {
    id: "analytics",
    name: "Analytics",
    description: "GA4 / Plausible tracking snippet in the export",
    icon: "bar-chart-3",
    categories: "all",
  },
  {
    id: "seo",
    name: "SEO",
    description: "Meta tags, Open Graph and sitemap basics",
    icon: "search",
    categories: "all",
  },
  {
    id: "newsletter",
    name: "Newsletter",
    description: "Email capture section",
    icon: "send",
    categories: "all",
  },
  {
    id: "testimonials",
    name: "Testimonials",
    description: "Client reviews section",
    icon: "quote",
    categories: "all",
  },
  {
    id: "gallery",
    name: "Gallery",
    description: "Photo gallery section",
    icon: "image",
    categories: "all",
  },
];

export function getFeature(id: string): TemplateFeature | undefined {
  return TEMPLATE_FEATURES.find((f) => f.id === id);
}

export function featuresForCategory(categoryId: string): TemplateFeature[] {
  return TEMPLATE_FEATURES.filter(
    (f) => f.categories === "all" || f.categories.includes(categoryId as never)
  );
}
