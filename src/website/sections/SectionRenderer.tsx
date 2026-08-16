import type { ProjectConfig, SectionInstance, SectionType } from "@/types";
import { resolveSection, resolveSectionStyles, SectionStyleProvider, visibilityClass } from "../renderer";
import { getSectionDefinition } from "@/features/sections/registry";

/* ============================================================
   Section dispatcher — SectionInstance → React component.
   Wraps every section in its style context (variants, spacing,
   background, alignment, responsive visibility).
   ============================================================ */

import { AnnouncementBar, FooterSection, NavbarSection } from "./Global";
import { HeroSection } from "./Hero";
import {
  AboutSection,
  FaqSection,
  FeaturesSection,
  ProcessSection,
  ServicesSection,
  StatsSection,
  TestimonialsSection,
} from "./Content";
import { GallerySection, LocationSection, MenuSection, ReservationSection } from "./Restaurant";
import { CaseStudiesSection, IndustriesSection, TeamSection } from "./Business";
import { ClientsSection, ExperienceSection, ProjectsSection, SkillsSection } from "./Portfolio";
import { ContactSection, CtaSection, NewsletterSection, WhatsappFloat } from "./Conversion";
import { CategoriesSection, PricingSection, ProductsSection } from "./Ecommerce";

/** Sections that manage their own full-bleed band (no style wrapper needed) */
const UNWRAPPED: SectionType[] = ["navbar", "footer", "whatsapp"];

export function SectionRenderer({
  section,
  project,
}: {
  section: SectionInstance;
  project: ProjectConfig;
}) {
  const content = resolveSection(section, project.brand);
  const features = {
    contactForm: project.features.find((f) => f.id === "contactForm")?.enabled ?? true,
    whatsapp: project.features.find((f) => f.id === "whatsapp")?.enabled ?? false,
    booking: project.features.find((f) => f.id === "booking")?.enabled ?? false,
    maps: project.features.find((f) => f.id === "maps")?.enabled ?? false,
    ordering: project.features.find((f) => f.id === "ordering")?.enabled ?? false,
  };

  const body = renderBody(section, project, content, features);

  if (UNWRAPPED.includes(section.type)) return body;

  const { styles } = resolveSectionStyles(section);
  return (
    <SectionStyleProvider section={section}>
      <div className={visibilityClass(styles.visibility)}>{body}</div>
    </SectionStyleProvider>
  );
}

function renderBody(
  section: SectionInstance,
  project: ProjectConfig,
  content: ReturnType<typeof resolveSection>,
  features: { contactForm: boolean; whatsapp: boolean; booking: boolean; maps: boolean; ordering: boolean }
) {
  switch (section.type) {
    case "navbar":
      return <NavbarSection content={content as never} />;
    case "announcement":
      return <AnnouncementBar content={content as never} />;
    case "hero":
      return <HeroSection content={content as never} />;
    case "about":
      return <AboutSection content={content as never} />;
    case "services":
      return <ServicesSection content={content as never} />;
    case "features":
      return <FeaturesSection content={content as never} />;
    case "stats":
      return <StatsSection content={content as never} />;
    case "process":
      return <ProcessSection content={content as never} />;
    case "testimonials":
      return <TestimonialsSection content={content as never} />;
    case "faq":
      return <FaqSection content={content as never} />;
    case "menu":
      return <MenuSection content={content as never} />;
    case "gallery":
      return <GallerySection content={content as never} />;
    case "reservation":
      return features.booking ? <ReservationSection content={content as never} /> : null;
    case "location":
      return <LocationSection content={content as never} mapsEnabled={features.maps} />;
    case "team":
      return <TeamSection content={content as never} />;
    case "caseStudies":
      return <CaseStudiesSection content={content as never} />;
    case "industries":
      return <IndustriesSection content={content as never} />;
    case "projects":
      return <ProjectsSection content={content as never} />;
    case "skills":
      return <SkillsSection content={content as never} />;
    case "experience":
      return <ExperienceSection content={content as never} />;
    case "clients":
      return <ClientsSection content={content as never} />;
    case "cta":
      return <CtaSection content={content as never} />;
    case "contact":
      return <ContactSection content={content as never} features={features} />;
    case "newsletter":
      return <NewsletterSection content={content as never} />;
    case "whatsapp":
      return features.whatsapp ? <WhatsappFloat content={content as never} /> : null;
    case "footer":
      return <FooterSection content={content as never} />;
    case "products":
      return <ProductsSection content={content as never} />;
    case "categories":
      return <CategoriesSection content={content as never} />;
    case "pricing":
      return <PricingSection content={content as never} />;
    default: {
      /* Error handling for unsupported sections — never silently fail */
      const def = getSectionDefinition(section.type as SectionType);
      return (
        <div className="mx-auto max-w-6xl px-8 py-10 text-center text-sm" role="alert">
          <p className="font-semibold">Section “{def?.name ?? section.type}” is not supported yet.</p>
          <p className="mt-1 opacity-70">Remove it from this page or report it to the Katch Studio team.</p>
        </div>
      );
    }
  }
}
