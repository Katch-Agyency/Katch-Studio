import type { PageConfig, Project } from "@/types";
import { collectAssets } from "./assets";
import { STANDALONE_SOURCES } from "./generatedSources";
import type { ExportOptions, GeneratedProject, ProgressCallback } from "./types";

function stableHash(value: string): string {
  let hash = 2166136261;
  for (const char of value) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return (hash >>> 0).toString(36).slice(0, 6);
}

export function safeProjectSlug(name: string): string {
  const ascii = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 56)
    .replace(/-+$/g, "");
  return ascii || `website-${stableHash(name || "website")}`;
}

function componentName(page: PageConfig, index: number): string {
  const words = page.name.normalize("NFKD").replace(/[^a-zA-Z0-9]+/g, " ").trim().split(/\s+/).filter(Boolean);
  const base = words.map((word) => word[0]!.toUpperCase() + word.slice(1)).join("") || `Page${index + 1}`;
  return /^\d/.test(base) ? `Page${base}${index + 1}` : `${base}Page${index + 1}`;
}

function routePath(page: PageConfig, index: number): string {
  if (index === 0 || page.path === "/") return "/";
  const raw = page.path.trim().split(/[?#]/)[0] || `/${safeProjectSlug(page.name)}`;
  return `/${raw.replace(/^\/+|\/+$/g, "")}`;
}

function htmlEscape(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function makePageSource(page: PageConfig, index: number): string {
  const name = componentName(page, index);
  const title = page.seo.title || page.name;
  const description = page.seo.description || "";
  return `import { useEffect } from "react";
import WebsiteRenderer from "@/website/WebsiteRenderer";
import { site } from "@/data/site";

export default function ${name}() {
  useEffect(() => {
    document.title = ${JSON.stringify(title)};
    const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (meta) meta.content = ${JSON.stringify(description)};
  }, []);
  return <WebsiteRenderer project={site} pageId=${JSON.stringify(page.id)} />;
}
`;
}

function makeAppSource(pages: PageConfig[]): string {
  const used = new Set<string>();
  const records = pages.map((page, index) => {
    let file = safeProjectSlug(page.name) || `page-${index + 1}`;
    while (used.has(file)) file = `${file}-${index + 1}`;
    used.add(file);
    return { page, index, file, component: componentName(page, index), path: routePath(page, index) };
  });
  const imports = records.map((item) => `import ${item.component} from "@/pages/${item.file}";`).join("\n");
  const routes = records.map((item) => `        <Route path=${JSON.stringify(item.path)} element={<${item.component} />} />`).join("\n");
  return `import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
${imports}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
${routes}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
`;
}

const SECTION_GROUPS: Record<string, { file: string; imports: string[] }> = {
  Global: { file: "Global.tsx", imports: ["AnnouncementBar", "FooterSection", "NavbarSection"] },
  Hero: { file: "Hero.tsx", imports: ["HeroSection"] },
  Content: { file: "Content.tsx", imports: ["AboutSection", "FaqSection", "FeaturesSection", "ProcessSection", "ServicesSection", "StatsSection", "TestimonialsSection"] },
  Restaurant: { file: "Restaurant.tsx", imports: ["GallerySection", "LocationSection", "MenuSection", "ReservationSection"] },
  Business: { file: "Business.tsx", imports: ["CaseStudiesSection", "IndustriesSection", "TeamSection"] },
  Portfolio: { file: "Portfolio.tsx", imports: ["ClientsSection", "ExperienceSection", "ProjectsSection", "SkillsSection"] },
  Conversion: { file: "Conversion.tsx", imports: ["ContactSection", "CtaSection", "NewsletterSection", "WhatsappFloat"] },
  Ecommerce: { file: "Ecommerce.tsx", imports: ["CategoriesSection", "PricingSection", "ProductsSection"] },
};

const SECTION_META: Record<string, { group: keyof typeof SECTION_GROUPS; component: string; expression?: string }> = {
  navbar: { group: "Global", component: "NavbarSection" }, announcement: { group: "Global", component: "AnnouncementBar" }, footer: { group: "Global", component: "FooterSection" },
  hero: { group: "Hero", component: "HeroSection" },
  about: { group: "Content", component: "AboutSection" }, services: { group: "Content", component: "ServicesSection" }, features: { group: "Content", component: "FeaturesSection" }, stats: { group: "Content", component: "StatsSection" }, process: { group: "Content", component: "ProcessSection" }, testimonials: { group: "Content", component: "TestimonialsSection" }, faq: { group: "Content", component: "FaqSection" },
  menu: { group: "Restaurant", component: "MenuSection" }, gallery: { group: "Restaurant", component: "GallerySection" }, reservation: { group: "Restaurant", component: "ReservationSection", expression: "features.booking ? <ReservationSection content={content as never} /> : null" }, location: { group: "Restaurant", component: "LocationSection", expression: "<LocationSection content={content as never} mapsEnabled={features.maps} />" },
  team: { group: "Business", component: "TeamSection" }, caseStudies: { group: "Business", component: "CaseStudiesSection" }, industries: { group: "Business", component: "IndustriesSection" },
  projects: { group: "Portfolio", component: "ProjectsSection" }, skills: { group: "Portfolio", component: "SkillsSection" }, experience: { group: "Portfolio", component: "ExperienceSection" }, clients: { group: "Portfolio", component: "ClientsSection" },
  cta: { group: "Conversion", component: "CtaSection" }, contact: { group: "Conversion", component: "ContactSection", expression: "<ContactSection content={content as never} features={features} />" }, newsletter: { group: "Conversion", component: "NewsletterSection" }, whatsapp: { group: "Conversion", component: "WhatsappFloat", expression: "features.whatsapp ? <WhatsappFloat content={content as never} /> : null" },
  products: { group: "Ecommerce", component: "ProductsSection" }, categories: { group: "Ecommerce", component: "CategoriesSection" }, pricing: { group: "Ecommerce", component: "PricingSection" },
};

function makeSectionRendererSource(sectionTypes: string[]): { source: string; groupFiles: Set<string> } {
  const selected = [...new Set(sectionTypes)].filter((type) => SECTION_META[type]);
  const groups = new Set(selected.map((type) => SECTION_META[type]!.group));
  // Conversion imports the reusable WhatsApp glyph from Restaurant.
  if (groups.has("Conversion")) groups.add("Restaurant");
  const imports = [...groups].map((group) => {
    const definition = SECTION_GROUPS[group]!;
    const used = definition.imports.filter((component) => selected.some((type) => SECTION_META[type]!.component === component));
    if (group === "Restaurant" && groups.has("Conversion") && !used.includes("WhatsAppGlyph")) used.push("WhatsAppGlyph");
    return used.length ? `import { ${used.join(", ")} } from "./${group}";` : "";
  }).filter(Boolean).join("\n");
  const cases = selected.map((type) => {
    const meta = SECTION_META[type]!;
    const expression = meta.expression ?? `<${meta.component} content={content as never} />`;
    return `    case ${JSON.stringify(type)}:\n      return ${expression};`;
  }).join("\n");
  const source = `import type { ProjectConfig, SectionInstance, SectionType } from "@/types";\nimport { resolveSection, resolveSectionStyles, SectionStyleProvider, visibilityClass } from "../renderer";\nimport { getSectionDefinition } from "@/features/sections/registry";\n${imports}\n\nconst UNWRAPPED: SectionType[] = ["navbar", "footer", "whatsapp"];\n\nexport function SectionRenderer({ section, project }: { section: SectionInstance; project: ProjectConfig }) {\n  const content = resolveSection(section, project.brand);\n  const features = {\n    contactForm: project.features.find((f) => f.id === "contactForm")?.enabled ?? true,\n    whatsapp: project.features.find((f) => f.id === "whatsapp")?.enabled ?? false,\n    booking: project.features.find((f) => f.id === "booking")?.enabled ?? false,\n    maps: project.features.find((f) => f.id === "maps")?.enabled ?? false,\n    ordering: project.features.find((f) => f.id === "ordering")?.enabled ?? false,\n  };\n  const body = renderBody(section, content, features);\n  if (UNWRAPPED.includes(section.type)) return body;\n  const { styles } = resolveSectionStyles(section);\n  return <SectionStyleProvider section={section}><div className={visibilityClass(styles.visibility)}>{body}</div></SectionStyleProvider>;\n}\n\nfunction renderBody(section: SectionInstance, content: ReturnType<typeof resolveSection>, features: { contactForm: boolean; whatsapp: boolean; booking: boolean; maps: boolean; ordering: boolean }) {\n  switch (section.type) {\n${cases}\n    default: {\n      const definition = getSectionDefinition(section.type as SectionType);\n      return <div className="mx-auto max-w-6xl px-8 py-10 text-center text-sm" role="alert">Section “{definition?.name ?? section.type}” is not supported by this export.</div>;\n    }\n  }\n}\n`;
  return { source, groupFiles: new Set([...groups].map((group) => `src/website/sections/${SECTION_GROUPS[group]!.file}`)) };
}

function standaloneFiles(project: Project, options: ExportOptions): Map<string, string> {
  const config = project.config;
  const slug = safeProjectSlug(config.projectInfo.name);
  const packageName = `${slug}-website`.slice(0, 80);
  const files = new Map<string, string>();
  const dispatcher = makeSectionRendererSource(config.sections.map((section) => section.type));
  const alwaysCopy = new Set([
    "src/website/WebsiteRenderer.tsx", "src/website/renderer.tsx", "src/features/sections/registry.ts",
    "src/data/palette.ts", "src/data/fonts.ts", "src/components/ui/ui.tsx", "src/utils/helpers.ts",
    "src/types/theme.ts", "src/types/sections.ts", "src/types/project.ts",
  ]);
  for (const [path, source] of Object.entries(STANDALONE_SOURCES)) {
    if (alwaysCopy.has(path) || dispatcher.groupFiles.has(path)) files.set(path, source);
  }
  files.set("src/website/sections/SectionRenderer.tsx", dispatcher.source);
  files.set("src/types/index.ts", `export * from "./theme";\nexport * from "./sections";\nexport * from "./project";\n`);
  files.set("src/data/site.ts", `import type { ProjectConfig } from "@/types";\n\nexport const site = ${JSON.stringify(config, null, 2)} as ProjectConfig;\n`);
  files.set("src/App.tsx", makeAppSource(config.pages));
  files.set("src/main.tsx", `import React from "react";\nimport ReactDOM from "react-dom/client";\nimport App from "./App";\nimport "./styles/index.css";\n\nReactDOM.createRoot(document.getElementById("root")!).render(\n  <React.StrictMode><App /></React.StrictMode>\n);\n`);

  const pageNames = new Set<string>();
  config.pages.forEach((page, index) => {
    let file = safeProjectSlug(page.name) || `page-${index + 1}`;
    while (pageNames.has(file)) file = `${file}-${index + 1}`;
    pageNames.add(file);
    files.set(`src/pages/${file}.tsx`, makePageSource(page, index));
  });

  files.set("src/styles/index.css", `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n\n:root { color-scheme: ${config.theme.mode}; }\nhtml { scroll-behavior: smooth; }\nbody { margin: 0; min-width: 320px; min-height: 100vh; background: ${config.theme.colors.background}; }\n* { box-sizing: border-box; }\nimg { max-width: 100%; }\nbutton, input, textarea, select { font: inherit; }\n`);
  files.set("index.html", `<!doctype html>\n<html lang="${config.projectInfo.language}" dir="${config.projectInfo.language === "ar" ? "rtl" : "ltr"}">\n<head>\n  <meta charset="UTF-8" />\n  <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n  <meta name="description" content="${htmlEscape(config.projectInfo.description || config.brand.description || "")}" />\n  <title>${htmlEscape(config.projectInfo.name)}</title>\n</head>\n<body>\n  <div id="root"></div>\n  <script type="module" src="/src/main.tsx"></script>\n</body>\n</html>\n`);
  files.set("package.json", JSON.stringify({
    name: packageName,
    private: true,
    version: "1.0.0",
    type: "module",
    scripts: { dev: "vite", build: "tsc --noEmit && vite build", preview: "vite preview" },
    dependencies: { "lucide-react": "^0.441.0", react: "^18.3.1", "react-dom": "^18.3.1", "react-router-dom": "^7.18.2" },
    devDependencies: { "@types/react": "^18.3.8", "@types/react-dom": "^18.3.0", "@vitejs/plugin-react": "^4.6.0", autoprefixer: "^10.4.20", postcss: "^8.4.47", tailwindcss: "^3.4.12", typescript: "^5.6.2", vite: "^6.4.3" },
  }, null, 2));
  files.set("tsconfig.json", JSON.stringify({ compilerOptions: { target: "ES2020", useDefineForClassFields: true, lib: ["ES2020", "DOM", "DOM.Iterable"], module: "ESNext", skipLibCheck: true, moduleResolution: "bundler", resolveJsonModule: true, isolatedModules: true, noEmit: true, jsx: "react-jsx", strict: true, baseUrl: ".", paths: { "@/*": ["src/*"] } }, include: ["src"] }, null, 2));
  files.set("vite.config.ts", `import { defineConfig } from "vite";\nimport react from "@vitejs/plugin-react";\nimport { fileURLToPath, URL } from "node:url";\n\nexport default defineConfig({ plugins: [react()], resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } } });\n`);
  files.set("tailwind.config.ts", `import type { Config } from "tailwindcss";\nexport default { content: ["./index.html", "./src/**/*.{ts,tsx}"], theme: { extend: {} }, plugins: [] } satisfies Config;\n`);
  files.set("postcss.config.js", `export default { plugins: { tailwindcss: {}, autoprefixer: {} } };\n`);
  files.set(".gitignore", `node_modules\ndist\n.env\n.env.local\n.DS_Store\n`);
  files.set(".env.example", `# This generated website currently requires no environment variables.\n# Add only public VITE_* values here; never commit secrets.\n`);
  files.set("public/_redirects", `/* /index.html 200\n`);
  files.set("vercel.json", JSON.stringify({ rewrites: [{ source: "/(.*)", destination: "/index.html" }] }, null, 2));

  if (options.includeReadme) {
    files.set("README.md", `# ${config.projectInfo.name}\n\nGenerated by Katch Studio as a standalone React/Vite website.\n\n## Setup\n\n\`\`\`bash\nnpm install\n\`\`\`\n\n## Development\n\n\`\`\`bash\nnpm run dev\n\`\`\`\n\n## Production build\n\n\`\`\`bash\nnpm run build\nnpm run preview\n\`\`\`\n\n## Environment variables\n\nNo environment variables are required by default. See \`.env.example\` before adding integrations. Never put private server credentials in Vite client variables.\n\n## Routing\n\nThis is a browser-routed SPA. The included \`vercel.json\` and \`public/_redirects\` provide deep-link fallbacks for Vercel and Netlify-compatible hosts.\n`);
  }
  return files;
}

export async function generateStandaloneProject(project: Project, options: ExportOptions, onProgress?: ProgressCallback): Promise<GeneratedProject> {
  const total = 6;
  onProgress?.({ phase: "pages", label: "Preparing pages", completed: 1, total });
  await Promise.resolve();
  onProgress?.({ phase: "sections", label: "Preparing sections", completed: 2, total });
  await Promise.resolve();
  onProgress?.({ phase: "assets", label: "Preparing assets", completed: 3, total });
  const assets = await collectAssets(project, options.includeAssets);
  onProgress?.({ phase: "source", label: "Generating source code", completed: 4, total });
  const textFiles = standaloneFiles(assets.project, options);
  const files = new Map<string, string | Uint8Array>(textFiles);
  for (const [path, bytes] of assets.files) files.set(path, bytes);
  const rootName = safeProjectSlug(project.config.projectInfo.name);
  return { rootName, archiveName: `${rootName}.zip`, files, warnings: assets.warnings, project: assets.project };
}
