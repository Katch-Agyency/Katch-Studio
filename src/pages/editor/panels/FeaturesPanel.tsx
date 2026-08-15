import { AlertTriangle, Check, Sparkles } from "lucide-react";
import { useEditor } from "../editorStore";
import { Toggle } from "@/components/ui/Fields";
import { TEMPLATE_FEATURES } from "@/data/features";
import { SectionIcon } from "@/components/SectionIcon";
import { cn } from "@/utils/helpers";

/* ============================================================
   Features panel — enable / disable optional website features
   ============================================================ */

export default function FeaturesPanel() {
  const { project, update } = useEditor();
  const { brand, features } = project.config;

  const toggleFeature = (id: string, enabled: boolean) => {
    update((p) => {
      const f = p.config.features.find((x) => x.id === id);
      if (f) f.enabled = enabled;
      else p.config.features.push({ id, enabled });
    });
  };

  const whatsappEnabled = features.find((f) => f.id === "whatsapp")?.enabled;
  const hasSection = (type: string) => project.config.sections.some((s) => s.type === type);
  const whatsappWarning = whatsappEnabled && !brand.whatsapp;
  const hasWhatsappSection = hasSection("whatsapp");

  return (
    <div className="space-y-2">
      <p className="mb-1 text-xs leading-relaxed text-ink-faint">
        Features change how sections behave in the preview and the export — e.g. the WhatsApp CTA only renders
        when the feature and a WhatsApp number are both present.
      </p>

      {whatsappWarning && (
        <div className="flex items-start gap-2.5 rounded-lg border border-warn/30 bg-warn/10 p-3" role="alert">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warn" aria-hidden />
          <p className="text-[12.5px] leading-relaxed text-ink">
            WhatsApp CTA is enabled but no WhatsApp number is set.{" "}
            <span className="text-ink-muted">Add one in the Brand panel — the button won't appear until then.</span>
          </p>
        </div>
      )}

      {whatsappEnabled && brand.whatsapp && !hasWhatsappSection && (
        <div className="flex items-start gap-2.5 rounded-lg border border-info/30 bg-info/10 p-3">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-info" aria-hidden />
          <p className="text-[12.5px] leading-relaxed text-ink">
            Tip: add a <strong>WhatsApp CTA</strong> section to a page to show the floating chat button.
          </p>
        </div>
      )}

      {TEMPLATE_FEATURES.map((f) => {
        const enabled = features.find((x) => x.id === f.id)?.enabled ?? false;
        const categoryOk = f.categories === "all" || f.categories.includes(project.config.projectInfo.category);
        return (
          <div
            key={f.id}
            className={cn(
              "flex items-center gap-3 rounded-lg border p-3 transition-colors",
              enabled ? "border-brand/40 bg-brand-muted/60" : "border-line bg-surface-1",
              !categoryOk && "opacity-40"
            )}
          >
            <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-md", enabled ? "bg-brand-muted text-brand-hover" : "bg-surface-2 text-ink-muted")}>
              <FeatureGlyph id={f.id} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-medium text-ink">{f.name}</p>
              <p className="text-[11.5px] leading-4 text-ink-faint">{f.description}</p>
            </div>
            {enabled && <Check className="h-3.5 w-3.5 shrink-0 text-brand-hover" aria-hidden />}
            <Toggle checked={enabled} onChange={(v) => toggleFeature(f.id, v)} label={`Toggle ${f.name}`} />
          </div>
        );
      })}
    </div>
  );
}

function FeatureGlyph({ id }: { id: string }) {
  const map: Record<string, React.ReactNode> = {
    whatsapp: <SectionIcon type="whatsapp" className="h-4 w-4" />,
    contactForm: <SectionIcon type="contact" className="h-4 w-4" />,
    maps: <SectionIcon type="location" className="h-4 w-4" />,
    booking: <SectionIcon type="reservation" className="h-4 w-4" />,
    ordering: <SectionIcon type="menu" className="h-4 w-4" />,
    instagram: <SectionIcon type="gallery" className="h-4 w-4" />,
    analytics: <SectionIcon type="stats" className="h-4 w-4" />,
    seo: <SectionIcon type="faq" className="h-4 w-4" />,
    newsletter: <SectionIcon type="newsletter" className="h-4 w-4" />,
    testimonials: <SectionIcon type="testimonials" className="h-4 w-4" />,
    gallery: <SectionIcon type="gallery" className="h-4 w-4" />,
  };
  return map[id] ?? null;
}
