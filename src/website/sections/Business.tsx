import { ArrowUpRight, TrendingUp } from "lucide-react";
import type { CaseStudiesContent, IndustriesContent, TeamContent } from "@/types";
import { Avatar } from "@/components/ui/ui";
import { SectionHeading, SectionShell, useWebsiteTheme } from "@/website/renderer";

/* ============================================================
   Business sections — Team, Case Studies, Industries
   ============================================================ */

export function TeamSection({ content }: { content: TeamContent }) {
  const { theme } = useWebsiteTheme();
  const members = content.members ?? [];
  if (members.length === 0) return null;
  return (
    <SectionShell id="team" tone="alt">
      <SectionHeading title={content.title} subtitle={content.subtitle} center />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {members.map((m) => (
          <div
            key={m.name}
            className="p-6 text-center"
            style={{
              background: "var(--wp-surface)",
              borderRadius: theme.radius === "none" ? 4 : theme.radius === "sm" ? 8 : 16,
              border: "1px solid color-mix(in srgb, var(--wp-text) 8%, transparent)",
              boxShadow: theme.cardStyle === "elevated" ? "0 12px 32px -18px rgba(0,0,0,0.35)" : undefined,
            }}
          >
            {m.image ? (
              <img
                src={m.image}
                alt={m.name}
                className="mx-auto h-20 w-20 rounded-full object-cover"
                onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
              />
            ) : (
              <div className="flex justify-center">
                <Avatar name={m.name} size={80} />
              </div>
            )}
            <h3 className="mt-4 text-[15.5px] font-semibold" style={{ color: "var(--wp-text)" }}>
              {m.name}
            </h3>
            <p className="mt-1 text-[13px]" style={{ color: "var(--wp-primary)" }}>
              {m.role}
            </p>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

export function CaseStudiesSection({ content }: { content: CaseStudiesContent }) {
  const { theme } = useWebsiteTheme();
  const items = content.items ?? [];
  if (items.length === 0) return null;
  return (
    <SectionShell id="case-studies">
      <SectionHeading title={content.title} subtitle={content.subtitle} center />
      <div className="grid gap-5 md:grid-cols-3">
        {items.map((c) => (
          <div
            key={c.client + c.title}
            className="group flex flex-col p-6 transition-transform duration-200 hover:-translate-y-1"
            style={{
              background: "var(--wp-surface)",
              borderRadius: theme.radius === "none" ? 4 : theme.radius === "sm" ? 8 : 16,
              border: "1px solid color-mix(in srgb, var(--wp-text) 8%, transparent)",
            }}
          >
            <p className="text-[12.5px] font-semibold uppercase tracking-wider" style={{ color: "var(--wp-primary)" }}>
              {c.client}
            </p>
            <h3 className="mt-2 text-[17px] font-semibold" style={{ fontFamily: "var(--wp-font-heading)" }}>
              {c.title}
            </h3>
            <p className="mt-4 flex items-center gap-2 text-[14.5px] font-semibold" style={{ color: "var(--wp-text)" }}>
              <TrendingUp className="h-4 w-4" style={{ color: "var(--wp-primary)" }} aria-hidden />
              {c.result}
            </p>
            <span className="mt-auto pt-4 text-[13px] font-medium opacity-0 transition-opacity group-hover:opacity-100" style={{ color: "var(--wp-primary)" }}>
              Read the story <ArrowUpRight className="inline h-3.5 w-3.5" aria-hidden />
            </span>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

export function IndustriesSection({ content }: { content: IndustriesContent }) {
  const items = content.items ?? [];
  if (items.length === 0) return null;
  return (
    <SectionShell id="industries" tone="alt">
      <SectionHeading title={content.title} subtitle={content.subtitle} center />
      <div className="flex flex-wrap justify-center gap-3">
        {items.map((item) => (
          <span
            key={item}
            className="rounded-full border px-5 py-2.5 text-[14px] font-medium transition-colors hover:border-transparent"
            style={{
              borderColor: "color-mix(in srgb, var(--wp-text) 15%, transparent)",
              color: "var(--wp-text)",
              background: "var(--wp-surface)",
            }}
          >
            {item}
          </span>
        ))}
      </div>
    </SectionShell>
  );
}
