/* ============================================================
   generate-catalogue — snapshots the website layer's source
   files into a JSON catalogue (src/features/export/catalogue.json).
   The standalone-project generator (src/lib/scaffold.ts) embeds
   these exact files into the exported client project, so the
   generated site is byte-identical to the studio preview.

   The dependency closure of src/website/** is small and stable:
   react, lucide-react, @/components/ui/ui, @/data/{palette,fonts},
   @/features/sections/registry, @/types, @/utils/helpers.
   ============================================================ */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const FILES = [
  "src/website/WebsiteRenderer.tsx",
  "src/website/renderer.tsx",
  "src/website/sections/SectionRenderer.tsx",
  "src/website/sections/Global.tsx",
  "src/website/sections/Hero.tsx",
  "src/website/sections/Content.tsx",
  "src/website/sections/Restaurant.tsx",
  "src/website/sections/Business.tsx",
  "src/website/sections/Portfolio.tsx",
  "src/website/sections/Conversion.tsx",
  "src/website/sections/Ecommerce.tsx",
  "src/features/sections/registry.ts",
  "src/data/palette.ts",
  "src/data/fonts.ts",
  "src/utils/helpers.ts",
  "src/components/ui/ui.tsx",
  "src/types/theme.ts",
  "src/types/sections.ts",
  "src/types/project.ts",
];

const catalogue = {};
for (const file of FILES) {
  const abs = path.join(root, file);
  catalogue[file] = readFileSync(abs, "utf8");
}

const outDir = path.join(root, "src/features/export");
const outFile = path.join(outDir, "catalogue.json");
mkdirSync(outDir, { recursive: true });
writeFileSync(outFile, JSON.stringify(catalogue));
console.log(`✓ Export source catalogue generated (${FILES.length} files, ${Math.round(outFile.length / 1024)} KB)`);
