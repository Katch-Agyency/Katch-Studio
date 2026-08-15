/* ============================================================
   Section system — reusable, configuration-driven website sections
   ============================================================ */

import type { BrandConfig } from "./theme";

export interface CTA {
  label: string;
  href: string;
  variant: "primary" | "secondary";
}

export interface NavItem {
  label: string;
  href: string;
}

export interface ImageItem {
  src: string;
  alt: string;
  caption?: string;
}

export interface FeatureItem {
  icon: string;
  title: string;
  text: string;
}

export interface StatItem {
  value: string;
  label: string;
}

export interface StepItem {
  title: string;
  text: string;
}

export interface Testimonial {
  name: string;
  role: string;
  quote: string;
  rating: number;
}

export interface FaqItem {
  q: string;
  a: string;
}

export interface MenuCategory {
  name: string;
  items: { name: string; description: string; price: string }[];
}

export interface TeamMember {
  name: string;
  role: string;
  image: string;
}

export interface ContactInfo {
  email: string;
  phone: string;
  whatsapp: string;
  address: string;
  hours: string[];
}

/* ---------- Content per section type ---------- */

export interface NavbarContent {
  nav: NavItem[];
  cta: CTA;
}

export interface AnnouncementContent {
  text: string;
}

export interface HeroContent {
  title: string;
  subtitle?: string;
  description: string;
  primaryCTA: CTA;
  secondaryCTA?: CTA;
  image: string;
  imageAlt: string;
  alignment: "left" | "center";
}

export interface AboutContent {
  title: string;
  subtitle: string;
  text: string;
  image: string;
  imageAlt: string;
  points: string[];
}

export interface ServicesContent {
  title: string;
  subtitle: string;
  items: FeatureItem[];
}

export interface FeaturesContent {
  title: string;
  subtitle: string;
  items: FeatureItem[];
}

export interface StatsContent {
  items: StatItem[];
}

export interface ProcessContent {
  title: string;
  subtitle: string;
  steps: StepItem[];
}

export interface TestimonialsContent {
  title: string;
  subtitle: string;
  items: Testimonial[];
}

export interface FaqContent {
  title: string;
  subtitle: string;
  items: FaqItem[];
}

export interface MenuContent {
  title: string;
  subtitle: string;
  categories: MenuCategory[];
}

export interface GalleryContent {
  title: string;
  subtitle: string;
  images: ImageItem[];
}

export interface ReservationContent {
  title: string;
  subtitle: string;
  note: string;
}

export interface LocationContent {
  title: string;
  subtitle: string;
  hours: string[];
  mapQuery: string;
}

export interface TeamContent {
  title: string;
  subtitle: string;
  members: TeamMember[];
}

export interface CaseStudy {
  client: string;
  title: string;
  result: string;
}

export interface CaseStudiesContent {
  title: string;
  subtitle: string;
  items: CaseStudy[];
}

export interface IndustriesContent {
  title: string;
  subtitle: string;
  items: string[];
}

export interface ProjectsContent {
  title: string;
  subtitle: string;
  items: { title: string; category: string; image: string }[];
}

export interface SkillsContent {
  title: string;
  subtitle: string;
  items: { name: string; level: number }[];
}

export interface ExperienceItem {
  role: string;
  company: string;
  period: string;
  text: string;
}

export interface ExperienceContent {
  title: string;
  subtitle: string;
  items: ExperienceItem[];
}

export interface ClientsContent {
  title: string;
  subtitle: string;
  logos: string[];
}

export interface CtaContent {
  title: string;
  text: string;
  primaryCTA: CTA;
  secondaryCTA?: CTA;
}

export interface ContactContent {
  title: string;
  subtitle: string;
  info: ContactInfo;
}

export interface NewsletterContent {
  title: string;
  subtitle: string;
}

export interface WhatsappCtaContent {
  title: string;
  text: string;
  cta: CTA;
  number: string;
  position: "left" | "right";
}

export interface FooterContent {
  text: string;
  columns: { title: string; links: NavItem[] }[];
}

export type SectionContentMap = {
  navbar: NavbarContent;
  announcement: AnnouncementContent;
  hero: HeroContent;
  about: AboutContent;
  services: ServicesContent;
  features: FeaturesContent;
  stats: StatsContent;
  process: ProcessContent;
  testimonials: TestimonialsContent;
  faq: FaqContent;
  menu: MenuContent;
  gallery: GalleryContent;
  reservation: ReservationContent;
  location: LocationContent;
  team: TeamContent;
  caseStudies: CaseStudiesContent;
  industries: IndustriesContent;
  projects: ProjectsContent;
  skills: SkillsContent;
  experience: ExperienceContent;
  clients: ClientsContent;
  cta: CtaContent;
  contact: ContactContent;
  newsletter: NewsletterContent;
  whatsapp: WhatsappCtaContent;
  footer: FooterContent;
};

export type SectionType = keyof SectionContentMap;

export interface SectionInstance {
  /** Stable per-project id */
  id: string;
  type: SectionType;
  hidden: boolean;
  /** Deep-partial content — merged over the section's defaults */
  content: Partial<SectionContentMap[SectionType]>;
}

/* ---------- Registry (static, per section type) ---------- */

export type SectionGroup = "global" | "hero" | "content" | "restaurant" | "business" | "portfolio" | "conversion";

export interface SectionDefinition {
  type: SectionType;
  name: string;
  group: SectionGroup;
  description: string;
  icon: string;
  /** Sections available regardless of website category */
  categories: string[] | "all";
  /** Default content factory — takes brand so names stay generic */
  defaults: (brand: BrandConfig) => SectionContentMap[SectionType];
}

export const SECTION_GROUPS: { id: SectionGroup; label: string }[] = [
  { id: "global", label: "Global" },
  { id: "hero", label: "Hero" },
  { id: "content", label: "Content" },
  { id: "restaurant", label: "Restaurant" },
  { id: "business", label: "Business" },
  { id: "portfolio", label: "Portfolio" },
  { id: "conversion", label: "Conversion" },
];

/* ---------- Page ---------- */

export interface PageConfig {
  id: string;
  name: string;
  path: string;
  sections: string[]; // section instance ids, in order
  seo: {
    title: string;
    description: string;
    keywords: string;
    ogImage: string;
    index: boolean;
  };
}
