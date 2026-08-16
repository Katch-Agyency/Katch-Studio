import {
  ArrowRightCircle,
  BarChart3,
  Briefcase,
  CalendarCheck,
  Factory,
  FolderKanban,
  Gauge,
  Grid2x2,
  Handshake,
  HelpCircle,
  Image,
  Info,
  LayoutGrid,
  ListOrdered,
  Mail,
  MapPin,
  Megaphone,
  MessageCircle,
  Milestone,
  Navigation,
  PanelBottom,
  Quote,
  Send,
  ShoppingBag,
  Sparkles,
  Tag,
  Utensils,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { SectionType } from "@/types";

/* ============================================================
   Section type → Lucide icon (shared across the studio UI)
   ============================================================ */

const MAP: Record<SectionType, LucideIcon> = {
  navbar: Navigation,
  announcement: Megaphone,
  hero: Sparkles,
  about: Info,
  services: Wrench,
  features: LayoutGrid,
  stats: BarChart3,
  process: ListOrdered,
  testimonials: Quote,
  faq: HelpCircle,
  menu: Utensils,
  gallery: Image,
  reservation: CalendarCheck,
  location: MapPin,
  team: Users,
  caseStudies: Briefcase,
  industries: Factory,
  projects: FolderKanban,
  skills: Gauge,
  experience: Milestone,
  clients: Handshake,
  cta: ArrowRightCircle,
  contact: Mail,
  newsletter: Send,
  whatsapp: MessageCircle,
  footer: PanelBottom,
  products: ShoppingBag,
  categories: Grid2x2,
  pricing: Tag,
};

export function SectionIcon({ type, className = "h-4 w-4" }: { type: SectionType; className?: string }) {
  const Icon = MAP[type] ?? Sparkles;
  return <Icon className={className} aria-hidden />;
}
