/* ============================================================
   Demo photography — imported as modules so Vite fingerprints
   and ships them in the production build. ~1.4 MB total.
   ============================================================ */

import cakesHero from "@/assets/demo/cakes-hero.jpg";
import hawawshi from "@/assets/demo/hawawshi.jpg";
import fineDining from "@/assets/demo/fine-dining.jpg";
import businessTeam from "@/assets/demo/business-team.jpg";
import cafeInterior from "@/assets/demo/cafe-interior.jpg";
import landingDashboard from "@/assets/demo/landing-dashboard.jpg";
import portfolioWork from "@/assets/demo/portfolio-work.jpg";
import gallery1 from "@/assets/demo/gallery-1.jpg";
import gallery2 from "@/assets/demo/gallery-2.jpg";
import gallery3 from "@/assets/demo/gallery-3.jpg";

export const DEMO_IMAGES = {
  cakesHero,
  hawawshi,
  fineDining,
  businessTeam,
  cafeInterior,
  landingDashboard,
  portfolioWork,
  gallery1,
  gallery2,
  gallery3,
} as const;
