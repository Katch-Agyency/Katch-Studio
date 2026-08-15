import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/ui";
import { SectionIcon } from "@/components/SectionIcon";
import { SECTION_DEFINITIONS, SECTION_TYPES } from "@/features/sections/registry";
import { SECTION_GROUPS } from "@/types";
import { TEMPLATES } from "@/data/templates";

/* ============================================================
   Sections — the reusable building-block library
   ============================================================ */

export default function Sections() {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const usage = useMemo(() => {
    const map: Record<string, number> = {};
    for (const tpl of TEMPLATES) {
      for (const s of new Set(tpl.defaultSections)) {
        map[s] = (map[s] ?? 0) + 1;
      }
    }
    return map;
  }, []);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8">
      <div className="animate-fade-up">
        <h1 className="text-2xl font-bold tracking-tight text-ink">Sections</h1>
        <p className="mt-1 max-w-xl text-sm leading-relaxed text-ink-muted">
          The reusable building blocks every template and project is made of. Each section is theme-aware,
          responsive, accessible and driven entirely by configuration.
        </p>
      </div>

      <div className="relative mt-6 max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden />
        <input className="input pl-9" placeholder="Search sections…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search sections" />
      </div>

      <div className="mt-6 space-y-8">
        {SECTION_GROUPS.map((group) => {
          const types = SECTION_TYPES.filter((t) => SECTION_DEFINITIONS[t].group === group.id);
          const filtered = types.filter(
            (t) =>
              !q ||
              SECTION_DEFINITIONS[t].name.toLowerCase().includes(q) ||
              SECTION_DEFINITIONS[t].description.toLowerCase().includes(q)
          );
          if (filtered.length === 0) return null;
          return (
            <section key={group.id} aria-labelledby={`group-${group.id}`}>
              <div className="mb-3 flex items-center gap-2">
                <h2 id={`group-${group.id}`} className="text-[15px] font-semibold text-ink">
                  {group.label}
                </h2>
                <span className="text-xs text-ink-faint">{filtered.length}</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((t) => {
                  const def = SECTION_DEFINITIONS[t];
                  const usedIn = usage[t] ?? 0;
                  return (
                    <div key={t} className="card card-hover flex items-start gap-3 p-4">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-muted text-brand-hover">
                        <SectionIcon type={t} className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-[13.5px] font-semibold text-ink">{def.name}</h3>
                          {usedIn > 0 && <Badge tone="brand">{usedIn} templates</Badge>}
                        </div>
                        <p className="mt-1 text-[12px] leading-relaxed text-ink-faint">{def.description}</p>
                        <p className="mt-1.5 text-[10.5px] uppercase tracking-wider text-ink-faint/70">
                          {def.categories === "all" ? "All categories" : def.categories.map((c) => c).join(" · ")}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
