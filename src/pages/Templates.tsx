import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Layers, Lock, Sparkles } from "lucide-react";
import { Button, Badge } from "@/components/ui/ui";
import { TEMPLATES } from "@/data/templates";
import { WEBSITE_CATEGORIES } from "@/data/features";
import { SECTION_DEFINITIONS } from "@/features/sections/registry";
import { cn } from "@/utils/helpers";

/* ============================================================
   Template library — browse reusable starting points.
   Templates are immutable compositions; projects clone them.
   ============================================================ */

export default function Templates() {
  const [category, setCategory] = useState<string>("all");

  const list = useMemo(
    () => (category === "all" ? TEMPLATES : TEMPLATES.filter((t) => t.category === category)),
    [category]
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8">
      <div className="animate-fade-up">
        <h1 className="text-2xl font-bold tracking-tight text-ink">Template Library</h1>
        <p className="mt-1 max-w-xl text-sm leading-relaxed text-ink-muted">
          Reusable starting points built from the section system. A template is never edited by a project —
          projects are clones you can customize freely.
        </p>
      </div>

      {/* Category filter */}
      <div className="mt-6 flex flex-wrap gap-2">
        <button
          onClick={() => setCategory("all")}
          className={cn("seg-item", category === "all" && "seg-item-active")}
          aria-pressed={category === "all"}
        >
          All ({TEMPLATES.length})
        </button>
        {WEBSITE_CATEGORIES.filter((c) => TEMPLATES.some((t) => t.category === c.id)).map((c) => (
          <button
            key={c.id}
            onClick={() => setCategory(c.id)}
            className={cn("seg-item", category === c.id && "seg-item-active")}
            aria-pressed={category === c.id}
          >
            {c.label} ({TEMPLATES.filter((t) => t.category === c.id).length})
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {list.map((tpl, i) => {
          const cat = WEBSITE_CATEGORIES.find((c) => c.id === tpl.category);
          return (
            <div key={tpl.id} className="card card-hover group overflow-hidden animate-fade-up" style={{ animationDelay: `${i * 40}ms` }}>
              <div className="relative aspect-[16/8] overflow-hidden bg-surface-2">
                <img
                  src={tpl.previewImage}
                  alt={`${tpl.name} preview`}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent opacity-80" />
                <span className="absolute bottom-3 left-3 rounded-md bg-black/60 px-2 py-1 text-[11px] font-medium text-white backdrop-blur">
                  {cat?.label}
                </span>
                <span className="absolute bottom-3 right-3 rounded-md px-2 py-1 text-[11px] font-medium backdrop-blur" style={{ background: `${tpl.accentColor}33`, color: "#fff" }}>
                  {tpl.style}
                </span>
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-[15px] font-semibold text-ink">{tpl.name}</h3>
                  {tpl.featured && <Badge tone="brand">Featured</Badge>}
                </div>
                <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-ink-muted">{tpl.description}</p>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Badge tone="neutral"><Layers className="h-3 w-3" /> {tpl.defaultSections.length} sections</Badge>
                  <Badge tone="neutral">{tpl.pages.length} pages</Badge>
                  <Badge tone="neutral">{tpl.features.length} features</Badge>
                </div>

                <div className="mt-3 flex flex-wrap gap-1">
                  {tpl.defaultSections.slice(0, 4).map((s) => (
                    <span key={s} className="rounded bg-surface-2 px-1.5 py-0.5 text-[10.5px] text-ink-faint">
                      {SECTION_DEFINITIONS[s].name}
                    </span>
                  ))}
                  {tpl.defaultSections.length > 4 && (
                    <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[10.5px] text-ink-faint">
                      +{tpl.defaultSections.length - 4}
                    </span>
                  )}
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <Link to={`/projects/new?template=${tpl.id}`} className="flex-1">
                    <Button variant="primary" size="sm" className="w-full">
                      <Sparkles className="h-3.5 w-3.5" /> Use Template
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled
                    title="Template editing ships in the next phase — clone into a project for now"
                    className="shrink-0"
                  >
                    <Lock className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Future note */}
      <div className="mt-8 flex items-start gap-3 rounded-xl border border-line bg-surface-1 p-4">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-ink-faint" aria-hidden />
        <p className="text-[12.5px] leading-relaxed text-ink-muted">
          <strong className="text-ink">Create / edit / duplicate / archive templates</strong> is planned for the
          next phase. Today, the fastest path to a "custom template" is duplicating a finished project — it
          carries its sections, theme and features forward.
        </p>
      </div>
    </div>
  );
}
