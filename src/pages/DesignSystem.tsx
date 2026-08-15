import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { Badge, Button } from "@/components/ui/ui";
import { StatusBadge } from "@/components/ui/EmptyState";
import { TextInput } from "@/components/ui/Fields";

/* ============================================================
   Design System — the shared visual language of Katch Studio.
   Generated websites follow the same tokens & components.
   ============================================================ */

const SECTIONS = [
  {
    id: "typography",
    title: "Typography",
    body: (
      <div className="space-y-4">
        <p className="font-display text-4xl font-bold tracking-tight text-ink">H1 — Build faster, ship better</p>
        <p className="font-display text-2xl font-semibold text-ink">H2 — Section headings</p>
        <p className="font-display text-lg font-semibold text-ink">H3 — Card and panel titles</p>
        <p className="text-[15px] leading-relaxed text-ink">
          Body — The studio interface uses Inter with tight tracking, and generated sites inherit the pair you
          pick in Brand Settings.
        </p>
        <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-ink-faint">
          Caption — labels, meta and eyebrow text
        </p>
      </div>
    ),
  },
  {
    id: "buttons",
    title: "Buttons",
    body: (
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="danger">Destructive</Button>
        <Button variant="dark-brand">Dark brand</Button>
        <Button variant="primary" size="sm">Small</Button>
        <Button variant="secondary" size="lg">Large</Button>
        <Button variant="primary" disabled>Disabled</Button>
      </div>
    ),
  },
  {
    id: "cards",
    title: "Cards",
    body: (
      <div className="grid gap-4 sm:grid-cols-3">
        {["Flat", "Elevated", "Outlined"].map((label, i) => (
          <div
            key={label}
            className={
              i === 1 ? "card p-4 shadow-card" : "card p-4"
            }
            style={i === 2 ? { borderColor: "var(--ks-line-strong)" } : undefined}
          >
            <p className="text-[13.5px] font-semibold text-ink">{label} card</p>
            <p className="mt-1 text-xs leading-relaxed text-ink-muted">
              Cards hold projects, templates, stats and editor panels. One border, one radius, quiet shadow.
            </p>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "inputs",
    title: "Inputs",
    body: (
      <div className="grid max-w-md gap-4">
        <div>
          <label className="label" htmlFor="ds-input">Text input</label>
          <TextInput id="ds-input" placeholder="Placeholder text" />
        </div>
        <div>
          <label className="label" htmlFor="ds-select">Select</label>
          <select id="ds-select" className="input">
            <option>Option one</option>
            <option>Option two</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="ds-toggle">Toggle</label>
          <div className="flex items-center gap-2.5">
            <span className="relative h-[22px] w-10 rounded-full bg-brand">
              <span className="absolute left-[22px] top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white shadow" />
            </span>
            <span className="text-[13px] text-ink-muted">Enabled state</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "badges",
    title: "Badges & Status",
    body: (
      <div className="flex flex-wrap items-center gap-2.5">
        <Badge tone="neutral">Neutral</Badge>
        <Badge tone="brand">Brand</Badge>
        <Badge tone="accent">Accent</Badge>
        <Badge tone="info">Info</Badge>
        <Badge tone="danger">Danger</Badge>
        <StatusBadge status="draft" />
        <StatusBadge status="in_progress" />
        <StatusBadge status="review" />
        <StatusBadge status="ready" />
        <StatusBadge status="delivered" />
      </div>
    ),
  },
  {
    id: "alerts",
    title: "Alerts",
    body: (
      <div className="grid gap-3">
        <div className="flex items-start gap-2.5 rounded-lg border border-info/30 bg-info/10 p-3.5">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" />
          <p className="text-[13px] leading-relaxed text-ink">Informational message with context for the user.</p>
        </div>
        <div className="flex items-start gap-2.5 rounded-lg border border-ok/30 bg-ok/10 p-3.5">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-ok" />
          <p className="text-[13px] leading-relaxed text-ink">Success — the action completed as expected.</p>
        </div>
        <div className="flex items-start gap-2.5 rounded-lg border border-warn/30 bg-warn/10 p-3.5">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warn" />
          <p className="text-[13px] leading-relaxed text-ink">Warning — something needs your attention.</p>
        </div>
      </div>
    ),
  },
  {
    id: "nav",
    title: "Navigation",
    body: (
      <div className="rounded-lg border border-line bg-surface-1 p-2">
        <nav className="flex flex-wrap items-center gap-1" aria-label="Design system sample navigation">
          {["Dashboard", "Projects", "Templates", "Sections"].map((item, i) => (
            <span
              key={item}
              className={
                i === 1
                  ? "rounded-lg bg-brand-muted px-3 py-2 text-[13px] font-medium text-brand-hover"
                  : "rounded-lg px-3 py-2 text-[13px] font-medium text-ink-muted"
              }
            >
              {item}
            </span>
          ))}
        </nav>
      </div>
    ),
  },
];

export default function DesignSystem() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 md:px-8">
      <div className="animate-fade-up">
        <h1 className="text-2xl font-bold tracking-tight text-ink">Design System</h1>
        <p className="mt-1 max-w-xl text-sm leading-relaxed text-ink-muted">
          The shared visual language behind Katch Studio — and the token foundation that generated client
          websites inherit. Consistent components, one place.
        </p>
      </div>

      <div className="mt-8 space-y-8">
        {SECTIONS.map((s) => (
          <section key={s.id} aria-labelledby={`ds-${s.id}`} className="card p-5">
            <h2 id={`ds-${s.id}`} className="mb-5 text-[13px] font-semibold uppercase tracking-wider text-ink-muted">
              {s.title}
            </h2>
            {s.body}
          </section>
        ))}
      </div>
    </div>
  );
}
