import type {
  ClientsContent,
  ExperienceContent,
  ProjectsContent,
  SkillsContent,
} from "@/types";
import { SectionHeading, SectionShell, SmartImage, useWebsiteTheme } from "@/website/renderer";

/* ============================================================
   Portfolio sections — Projects, Skills, Experience, Clients
   ============================================================ */

export function ProjectsSection({ content }: { content: ProjectsContent }) {
  const { theme } = useWebsiteTheme();
  const items = content.items ?? [];
  if (items.length === 0) return null;
  return (
    <SectionShell id="projects">
      <SectionHeading title={content.title} subtitle={content.subtitle} center />
      <div className="grid gap-5 md:grid-cols-3">
        {items.map((p) => (
          <a
            key={p.title}
            href="#"
            className="group overflow-hidden transition-transform duration-200 hover:-translate-y-1"
            style={{
              background: "var(--wp-surface)",
              borderRadius: theme.radius === "none" ? 4 : theme.radius === "sm" ? 8 : 16,
              border: "1px solid color-mix(in srgb, var(--wp-text) 8%, transparent)",
            }}
          >
            <div className="aspect-[16/10] overflow-hidden">
              <SmartImage
                src={p.image}
                alt={p.title}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
              />
            </div>
            <div className="p-5">
              <p className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: "var(--wp-primary)" }}>
                {p.category}
              </p>
              <h3 className="mt-1 text-[16.5px] font-semibold" style={{ color: "var(--wp-text)" }}>
                {p.title}
              </h3>
            </div>
          </a>
        ))}
      </div>
    </SectionShell>
  );
}

export function SkillsSection({ content }: { content: SkillsContent }) {
  const items = content.items ?? [];
  if (items.length === 0) return null;
  return (
    <SectionShell id="skills" tone="alt">
      <SectionHeading title={content.title} subtitle={content.subtitle} />
      <div className="grid gap-x-12 gap-y-6 md:grid-cols-2">
        {items.map((s) => (
          <div key={s.name}>
            <div className="mb-2 flex items-center justify-between text-[14px] font-medium">
              <span>{s.name}</span>
              <span style={{ color: "var(--wp-text-muted)" }}>{s.level}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full" style={{ background: "color-mix(in srgb, var(--wp-text) 10%, transparent)" }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, Math.max(0, s.level))}%`, background: "var(--wp-primary)" }}
              />
            </div>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

export function ExperienceSection({ content }: { content: ExperienceContent }) {
  const items = content.items ?? [];
  if (items.length === 0) return null;
  return (
    <SectionShell id="experience">
      <SectionHeading title={content.title} subtitle={content.subtitle} />
      <ol className="relative space-y-8 border-s-2 ps-6" style={{ borderColor: "color-mix(in srgb, var(--wp-primary) 30%, transparent)" }}>
        {items.map((e) => (
          <li key={e.role + e.company} className="relative">
            <span
              className="absolute -start-[31px] top-1 h-3 w-3 rounded-full ring-4"
              style={{ background: "var(--wp-primary)", ["--tw-ring-color" as string]: "color-mix(in srgb, var(--wp-primary) 20%, transparent)" }}
              aria-hidden
            />
            <p className="text-[12.5px] font-semibold uppercase tracking-wider" style={{ color: "var(--wp-primary)" }}>
              {e.period}
            </p>
            <h3 className="mt-1 text-[17px] font-semibold" style={{ color: "var(--wp-text)" }}>
              {e.role} · <span style={{ color: "var(--wp-text-muted)" }}>{e.company}</span>
            </h3>
            <p className="mt-1.5 max-w-xl text-[14px] leading-relaxed" style={{ color: "var(--wp-text-muted)" }}>
              {e.text}
            </p>
          </li>
        ))}
      </ol>
    </SectionShell>
  );
}

export function ClientsSection({ content }: { content: ClientsContent }) {
  const { radius } = useWebsiteTheme();
  const logos = content.logos ?? [];
  if (logos.length === 0) return null;
  return (
    <SectionShell id="clients" tone="alt">
      <SectionHeading title={content.title} subtitle={content.subtitle} center />
      <div
        className="grid grid-cols-2 gap-4 md:grid-cols-5"
        style={{ borderRadius: radius === "none" ? 4 : 12 }}
      >
        {logos.map((logo) => (
          <div
            key={logo}
            className="flex items-center justify-center px-4 py-5 text-center text-[14px] font-bold tracking-tight opacity-70 transition-opacity hover:opacity-100"
            style={{ color: "var(--wp-text)", fontFamily: "var(--wp-font-heading)" }}
          >
            {logo}
          </div>
        ))}
      </div>
    </SectionShell>
  );
}
