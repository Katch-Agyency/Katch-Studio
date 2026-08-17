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
import ecomFashion from "@/assets/demo/ecom-fashion.jpg";
import ecomBeauty from "@/assets/demo/ecom-beauty.jpg";
import ecomElectronics from "@/assets/demo/ecom-electronics.jpg";
import ecomHome from "@/assets/demo/ecom-home.jpg";

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
  ecomFashion,
  ecomBeauty,
  ecomElectronics,
  ecomHome,
} as const;

/** Stable source paths written into branch project.json exports. Client mode
 * resolves these through import.meta.glob, so production builds do not depend
 * on a previous deployment's hashed asset URLs. */
export const DEMO_IMAGE_SOURCE_PATHS: Record<keyof typeof DEMO_IMAGES, string> = {
  cakesHero: "/src/assets/demo/cakes-hero.jpg",
  hawawshi: "/src/assets/demo/hawawshi.jpg",
  fineDining: "/src/assets/demo/fine-dining.jpg",
  businessTeam: "/src/assets/demo/business-team.jpg",
  cafeInterior: "/src/assets/demo/cafe-interior.jpg",
  landingDashboard: "/src/assets/demo/landing-dashboard.jpg",
  portfolioWork: "/src/assets/demo/portfolio-work.jpg",
  gallery1: "/src/assets/demo/gallery-1.jpg",
  gallery2: "/src/assets/demo/gallery-2.jpg",
  gallery3: "/src/assets/demo/gallery-3.jpg",
  ecomFashion: "/src/assets/demo/ecom-fashion.jpg",
  ecomBeauty: "/src/assets/demo/ecom-beauty.jpg",
  ecomElectronics: "/src/assets/demo/ecom-electronics.jpg",
  ecomHome: "/src/assets/demo/ecom-home.jpg",
};

export function projectForClientBranch<T>(value: T): T {
  const replacements = new Map(
    (Object.keys(DEMO_IMAGES) as Array<keyof typeof DEMO_IMAGES>)
      .map((key) => [DEMO_IMAGES[key], DEMO_IMAGE_SOURCE_PATHS[key]])
  );
  const walk = (item: unknown): unknown => {
    if (typeof item === "string") return replacements.get(item) ?? item;
    if (Array.isArray(item)) return item.map(walk);
    if (item && typeof item === "object") {
      return Object.fromEntries(Object.entries(item as Record<string, unknown>).map(([key, child]) => [key, walk(child)]));
    }
    return item;
  };
  return walk(value) as T;
}
