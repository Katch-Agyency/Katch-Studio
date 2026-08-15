import type { BrandConfig, SectionDefinition, SectionType } from "@/types";

/* ============================================================
   Section registry — every reusable website section in one place.
   `defaults(brand)` returns generic starter content (never
   client-specific); templates & projects layer their own content
   on top via deep merge.
   ============================================================ */

const brandName = (b: BrandConfig) => b.businessName || "Your Business";
const wa = (b: BrandConfig) =>
  b.whatsapp ? `https://wa.me/${b.whatsapp.replace(/\D/g, "")}` : "#contact";

export const SECTION_DEFINITIONS: Record<SectionType, SectionDefinition> = {
  navbar: {
    type: "navbar",
    name: "Navbar",
    group: "global",
    description: "Site navigation with logo and call-to-action",
    icon: "navigation",
    categories: "all",
    defaults: (b) => ({
      nav: [
        { label: "Home", href: "#home" },
        { label: "About", href: "#about" },
        { label: "Services", href: "#services" },
        { label: "Contact", href: "#contact" },
      ],
      cta: { label: "Contact Us", href: "#contact", variant: "primary" },
    }),
  },
  announcement: {
    type: "announcement",
    name: "Announcement Bar",
    group: "global",
    description: "A slim bar above the navbar for offers and notices",
    icon: "megaphone",
    categories: "all",
    defaults: () => ({
      text: "Special offer this month — 20% off all services. Limited time only.",
    }),
  },
  hero: {
    type: "hero",
    name: "Hero",
    group: "hero",
    description: "The opening statement of the page",
    icon: "sparkles",
    categories: "all",
    defaults: (b) => ({
      title: `Welcome to ${brandName(b)}`,
      subtitle: "",
      description: "We craft exceptional experiences, thoughtfully designed and built to perform.",
      primaryCTA: { label: "Get Started", href: "#contact", variant: "primary" },
      secondaryCTA: { label: "Learn More", href: "#about", variant: "secondary" },
      image: "",
      imageAlt: "",
      alignment: "left",
    }),
  },
  about: {
    type: "about",
    name: "About",
    group: "content",
    description: "Company story with image and highlights",
    icon: "info",
    categories: "all",
    defaults: (b) => ({
      title: `About ${brandName(b)}`,
      subtitle: "Our story",
      text: "We are a passionate team dedicated to quality, creativity and service. Every project is an opportunity to do something remarkable.",
      image: "",
      imageAlt: "",
      points: ["Experienced team", "Quality you can trust", "Customer-first approach"],
    }),
  },
  services: {
    type: "services",
    name: "Services",
    group: "content",
    description: "A grid of what the business offers",
    icon: "wrench",
    categories: "all",
    defaults: () => ({
      title: "Our Services",
      subtitle: "What we do",
      items: [
        { icon: "sparkles", title: "Service One", text: "A short description of this service and the value it brings." },
        { icon: "shield-check", title: "Service Two", text: "A short description of this service and the value it brings." },
        { icon: "zap", title: "Service Three", text: "A short description of this service and the value it brings." },
      ],
    }),
  },
  features: {
    type: "features",
    name: "Features",
    group: "content",
    description: "Highlight key product or business advantages",
    icon: "layout-grid",
    categories: "all",
    defaults: () => ({
      title: "Why Choose Us",
      subtitle: "What sets us apart",
      items: [
        { icon: "award", title: "Premium quality", text: "Everything we ship meets the highest standards." },
        { icon: "clock", title: "On-time delivery", text: "We respect deadlines as much as you do." },
        { icon: "heart-handshake", title: "Real support", text: "A team that answers, helps, and follows up." },
      ],
    }),
  },
  stats: {
    type: "stats",
    name: "Stats",
    group: "content",
    description: "Key numbers that build trust",
    icon: "bar-chart-3",
    categories: "all",
    defaults: () => ({
      items: [
        { value: "10+", label: "Years of experience" },
        { value: "250+", label: "Happy clients" },
        { value: "98%", label: "Client satisfaction" },
      ],
    }),
  },
  process: {
    type: "process",
    name: "Process",
    group: "content",
    description: "How the work gets done, step by step",
    icon: "list-ordered",
    categories: "all",
    defaults: () => ({
      title: "How It Works",
      subtitle: "Our process",
      steps: [
        { title: "Discover", text: "We listen to your goals and understand your needs." },
        { title: "Design", text: "We craft a solution tailored to your business." },
        { title: "Deliver", text: "We ship, test, and support what we build." },
      ],
    }),
  },
  testimonials: {
    type: "testimonials",
    name: "Testimonials",
    group: "content",
    description: "Social proof from real clients",
    icon: "quote",
    categories: "all",
    defaults: () => ({
      title: "What Clients Say",
      subtitle: "Testimonials",
      items: [
        { name: "Client Name", role: "Customer", quote: "A wonderful experience from start to finish. Highly recommended.", rating: 5 },
        { name: "Client Name", role: "Customer", quote: "Professional, fast and truly caring about the details.", rating: 5 },
        { name: "Client Name", role: "Customer", quote: "The results exceeded our expectations. We will be back.", rating: 5 },
      ],
    }),
  },
  faq: {
    type: "faq",
    name: "FAQ",
    group: "content",
    description: "Common questions, answered",
    icon: "help-circle",
    categories: "all",
    defaults: () => ({
      title: "Frequently Asked Questions",
      subtitle: "FAQ",
      items: [
        { q: "How do I get started?", a: "Simply reach out through the contact section and we will guide you through the next steps." },
        { q: "What are your working hours?", a: "We are available every day. Check the opening hours section or contact us directly." },
        { q: "Do you offer custom packages?", a: "Yes — every project is tailored to your needs and budget." },
      ],
    }),
  },
  menu: {
    type: "menu",
    name: "Menu",
    group: "restaurant",
    description: "Food menu with categories and prices",
    icon: "utensils",
    categories: ["restaurant"],
    defaults: () => ({
      title: "Our Menu",
      subtitle: "Made fresh every day",
      categories: [
        {
          name: "Starters",
          items: [
            { name: "Signature Starter", description: "Fresh ingredients, house recipe.", price: "60 EGP" },
            { name: "Soup of the Day", description: "Made fresh each morning.", price: "45 EGP" },
          ],
        },
        {
          name: "Mains",
          items: [
            { name: "Chef's Special", description: "The dish everyone comes back for.", price: "180 EGP" },
            { name: "Grilled Selection", description: "Char-grilled to perfection.", price: "220 EGP" },
          ],
        },
        {
          name: "Desserts",
          items: [
            { name: "House Dessert", description: "The perfect ending to your meal.", price: "75 EGP" },
            { name: "Seasonal Fruit", description: "Fresh and light.", price: "55 EGP" },
          ],
        },
      ],
    }),
  },
  gallery: {
    type: "gallery",
    name: "Gallery",
    group: "restaurant",
    description: "A visual tour of the space and the work",
    icon: "image",
    categories: ["restaurant", "portfolio", "business"],
    defaults: () => ({
      title: "Gallery",
      subtitle: "A look inside",
      images: [
        { src: "", alt: "Photo 1" },
        { src: "", alt: "Photo 2" },
        { src: "", alt: "Photo 3" },
      ],
    }),
  },
  reservation: {
    type: "reservation",
    name: "Reservation",
    group: "restaurant",
    description: "Book a table via WhatsApp or phone",
    icon: "calendar-check",
    categories: ["restaurant"],
    defaults: (b) => ({
      title: "Reserve a Table",
      subtitle: "We'd love to host you",
      note: `Call us on ${b.phone || "+20 100 000 0000"} or message us on WhatsApp to book your table.`,
    }),
  },
  location: {
    type: "location",
    name: "Location & Hours",
    group: "restaurant",
    description: "Address, hours and a map",
    icon: "map-pin",
    categories: "all",
    defaults: (b) => ({
      title: "Find Us",
      subtitle: "Visit us today",
      hours: [
        "Monday – Friday · 10:00 – 22:00",
        "Saturday – Sunday · 12:00 – 23:00",
      ],
      mapQuery: b.address || "Cairo",
    }),
  },
  team: {
    type: "team",
    name: "Team",
    group: "business",
    description: "The people behind the business",
    icon: "users",
    categories: ["business", "portfolio", "saas"],
    defaults: () => ({
      title: "Meet the Team",
      subtitle: "The people behind the work",
      members: [
        { name: "Team Member", role: "Founder", image: "" },
        { name: "Team Member", role: "Lead Designer", image: "" },
        { name: "Team Member", role: "Lead Developer", image: "" },
      ],
    }),
  },
  caseStudies: {
    type: "caseStudies",
    name: "Case Studies",
    group: "business",
    description: "Results you have delivered for clients",
    icon: "briefcase",
    categories: ["business", "saas"],
    defaults: () => ({
      title: "Case Studies",
      subtitle: "Results that speak",
      items: [
        { client: "Client A", title: "Website redesign", result: "+40% inquiries in 60 days" },
        { client: "Client B", title: "Brand identity", result: "2× social engagement" },
        { client: "Client C", title: "Marketing site", result: "Top-3 organic ranking" },
      ],
    }),
  },
  industries: {
    type: "industries",
    name: "Industries",
    group: "business",
    description: "The sectors you serve",
    icon: "factory",
    categories: ["business"],
    defaults: () => ({
      title: "Industries We Serve",
      subtitle: "Deep experience across sectors",
      items: ["Retail", "Healthcare", "Real Estate", "Education", "Technology", "Hospitality"],
    }),
  },
  projects: {
    type: "projects",
    name: "Projects",
    group: "portfolio",
    description: "Selected work showcase",
    icon: "folder-kanban",
    categories: ["portfolio", "business"],
    defaults: () => ({
      title: "Selected Work",
      subtitle: "Projects we're proud of",
      items: [
        { title: "Project One", category: "Branding", image: "" },
        { title: "Project Two", category: "Web Design", image: "" },
        { title: "Project Three", category: "Development", image: "" },
      ],
    }),
  },
  skills: {
    type: "skills",
    name: "Skills",
    group: "portfolio",
    description: "Capabilities with proficiency levels",
    icon: "gauge",
    categories: ["portfolio", "business"],
    defaults: () => ({
      title: "Skills",
      subtitle: "What I'm great at",
      items: [
        { name: "Skill One", level: 90 },
        { name: "Skill Two", level: 85 },
        { name: "Skill Three", level: 75 },
      ],
    }),
  },
  experience: {
    type: "experience",
    name: "Experience",
    group: "portfolio",
    description: "Career timeline",
    icon: "milestone",
    categories: ["portfolio"],
    defaults: () => ({
      title: "Experience",
      subtitle: "Where I've worked",
      items: [
        { role: "Role", company: "Company", period: "2022 — Present", text: "A short summary of responsibilities and achievements." },
        { role: "Role", company: "Company", period: "2019 — 2022", text: "A short summary of responsibilities and achievements." },
      ],
    }),
  },
  clients: {
    type: "clients",
    name: "Clients",
    group: "portfolio",
    description: "Logos of brands you've worked with",
    icon: "handshake",
    categories: ["portfolio", "business"],
    defaults: () => ({
      title: "Trusted By",
      subtitle: "Companies I've worked with",
      logos: ["Client A", "Client B", "Client C", "Client D", "Client E"],
    }),
  },
  cta: {
    type: "cta",
    name: "Call to Action",
    group: "conversion",
    description: "A focused prompt to take the next step",
    icon: "arrow-right-circle",
    categories: "all",
    defaults: (b) => ({
      title: `Ready to work with ${brandName(b)}?`,
      text: "Let's talk about your next project — we're one message away.",
      primaryCTA: { label: "Contact Us", href: "#contact", variant: "primary" },
      secondaryCTA: { label: wa(b) === "#contact" ? "See Our Work" : "WhatsApp Us", href: wa(b) === "#contact" ? "#projects" : wa(b), variant: "secondary" },
    }),
  },
  contact: {
    type: "contact",
    name: "Contact",
    group: "conversion",
    description: "Contact details and a message form",
    icon: "mail",
    categories: "all",
    defaults: (b) => ({
      title: "Get in Touch",
      subtitle: "We'd love to hear from you",
      info: {
        email: b.email || "hello@yourbusiness.com",
        phone: b.phone || "+20 100 000 0000",
        whatsapp: b.whatsapp || "",
        address: b.address || "",
        hours: ["Every day · 09:00 – 21:00"],
      },
    }),
  },
  newsletter: {
    type: "newsletter",
    name: "Newsletter",
    group: "conversion",
    description: "Email capture for updates and offers",
    icon: "send",
    categories: "all",
    defaults: () => ({
      title: "Stay in the Loop",
      subtitle: "Get the latest news and offers, straight to your inbox.",
    }),
  },
  whatsapp: {
    type: "whatsapp",
    name: "WhatsApp CTA",
    group: "conversion",
    description: "A floating WhatsApp chat button",
    icon: "message-circle",
    categories: "all",
    defaults: (b) => ({
      title: "Chat with us",
      text: "We usually reply within minutes.",
      cta: { label: "Start Chat", href: wa(b), variant: "primary" },
      number: b.whatsapp || "",
      position: "right",
    }),
  },
  footer: {
    type: "footer",
    name: "Footer",
    group: "global",
    description: "Closing block with links and contact",
    icon: "panel-bottom",
    categories: "all",
    defaults: (b) => ({
      text: `© ${new Date().getFullYear()} ${brandName(b)}. All rights reserved.`,
      columns: [
        { title: "Explore", links: [
          { label: "Home", href: "#home" },
          { label: "About", href: "#about" },
          { label: "Contact", href: "#contact" },
        ]},
        { title: "Services", links: [
          { label: "Our Services", href: "#services" },
          { label: "Pricing", href: "#pricing" },
        ]},
      ],
    }),
  },
};

export const SECTION_TYPES = Object.keys(SECTION_DEFINITIONS) as SectionType[];

export function getSectionDefinition(type: SectionType): SectionDefinition {
  return SECTION_DEFINITIONS[type];
}

/** Full default content for a section type */
export function sectionDefaults(type: SectionType, brand: BrandConfig) {
  return SECTION_DEFINITIONS[type].defaults(brand);
}
