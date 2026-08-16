import { Monitor, MousePointerClick, Smartphone, Tablet } from "lucide-react";
import { useState } from "react";
import { useEditor } from "../editorStore";
import { useEditorUI } from "../editorUI";
import { SectionIcon } from "@/components/SectionIcon";
import { Segmented, Toggle } from "@/components/ui/Fields";
import { Badge } from "@/components/ui/ui";
import { SECTION_DEFINITIONS } from "@/features/sections/registry";
import { SPACING_SCALE } from "@/types";
import type { DeviceMode, SectionBackground, SectionMaxWidth, SectionStyles, SpacingScale } from "@/types";
import { cn } from "@/utils/helpers";

/* ============================================================
   Design panel — contextual section inspector.
   Variant · spacing · background · alignment · max width ·
   responsive visibility (per breakpoint). Only visible controls
   that actually change the rendered website.
   ============================================================ */

export default function DesignPanel() {
  const { project, update } = useEditor();
  const { activePageId, selectedSectionId } = useEditorUI();
  const [device, setDevice] = useState<DeviceMode>("desktop");

  const page = project.config.pages.find((p) => p.id === activePageId);
  const section = (page?.sections ?? [])
    .map((id) => project.config.sections.find((s) => s.id === id))
    .filter((s): s is NonNullable<typeof s> => Boolean(s))
    .find((s) => s.id === selectedSectionId) ?? null;

  if (!section) {
    return (
      <div className="flex flex-col items-center rounded-lg border border-dashed border-line-strong px-4 py-12 text-center">
        <MousePointerClick className="mb-3 h-6 w-6 text-ink-faint" aria-hidden />
        <p className="text-[13.5px] font-medium text-ink">Select a section to design it</p>
        <p className="mt-1 max-w-xs text-xs leading-relaxed text-ink-faint">
          Pick a section in the Layers panel (or the dropdown above the preview) to change its
          variant, spacing, background and responsive visibility.
        </p>
      </div>
    );
  }

  const def = SECTION_DEFINITIONS[section.type];
  const styles: SectionStyles = {
    spacing: "md",
    background: "transparent",
    align: "left",
    maxWidth: "xl",
    visibility: { desktop: true, tablet: true, mobile: true },
    ...(section.styles ?? {}),
  };
  const visibility = styles.visibility ?? { desktop: true, tablet: true, mobile: true };

  const setStyles = (patch: Partial<SectionStyles>) => {
    const id = section.id;
    update((p) => {
      const s = p.config.sections.find((x) => x.id === id);
      if (s) s.styles = { ...(s.styles ?? {}), ...patch };
    });
  };

  const variants = def.variants ?? [];
  const currentVariant = section.variant ?? "default";
  const variantLabel =
    variants.find((v) => v.id === currentVariant)?.name ??
    (currentVariant === "default" ? "Default" : currentVariant);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2.5 rounded-lg border border-line bg-surface-0/50 px-3 py-2.5">
        <SectionIcon type={section.type} className="h-4 w-4 text-brand-hover" />
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-semibold text-ink">{def.name}</p>
          <p className="text-[11.5px] text-ink-faint">Section settings</p>
        </div>
        {section.hidden && <Badge tone="danger">Hidden</Badge>}
      </div>

      {/* Variant */}
      {variants.length > 0 && (
        <div>
          <p className="label">Variant</p>
          <div className="grid gap-1.5">
            {variants.map((v) => (
              <button
                key={v.id}
                onClick={() => update((p) => {
                  const s = p.config.sections.find((x) => x.id === section.id);
                  if (s) s.variant = v.id;
                })}
                className={cn(
                  "flex items-start gap-2.5 rounded-lg border p-2.5 text-left transition-colors",
                  currentVariant === v.id
                    ? "border-brand-ring bg-brand-muted/60"
                    : "border-line bg-surface-1 hover:border-line-strong"
                )}
                aria-pressed={currentVariant === v.id}
              >
                <span
                  className={cn(
                    "mt-0.5 h-2 w-2 shrink-0 rounded-full",
                    currentVariant === v.id ? "bg-brand" : "bg-surface-3"
                  )}
                  aria-hidden
                />
                <span className="min-w-0">
                  <span className="block text-[13px] font-medium text-ink">{v.name}</span>
                  {v.description && (
                    <span className="mt-0.5 block text-[11px] leading-4 text-ink-faint">{v.description}</span>
                  )}
                </span>
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[11px] text-ink-faint">Current: {variantLabel} — content stays the same, only the layout changes.</p>
        </div>
      )}

      {/* Spacing */}
      <div>
        <p className="label">Section spacing</p>
        <div className="seg flex-wrap">
          {SPACING_SCALE.map((s) => (
            <button
              key={s.id}
              className={styles.spacing === s.id ? "seg-item-active" : "seg-item"}
              onClick={() => setStyles({ spacing: s.id as SpacingScale })}
              aria-pressed={styles.spacing === s.id}
              title={s.label}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Background */}
      <div>
        <p className="label">Background</p>
        <Segmented
          ariaLabel="Section background"
          value={styles.background}
          onChange={(background) => setStyles({ background: background as SectionBackground })}
          options={[
            { value: "transparent", label: "None" },
            { value: "surface", label: "Surface" },
            { value: "subtle", label: "Tint" },
            { value: "dark", label: "Dark" },
          ]}
        />
      </div>

      {/* Alignment */}
      <div>
        <p className="label">Content alignment</p>
        <Segmented
          ariaLabel="Content alignment"
          value={styles.align}
          onChange={(align) => setStyles({ align })}
          options={[
            { value: "left", label: "Left" },
            { value: "center", label: "Center" },
          ]}
        />
      </div>

      {/* Max width */}
      <div>
        <p className="label">Max width</p>
        <Segmented
          ariaLabel="Section max width"
          value={styles.maxWidth}
          onChange={(maxWidth) => setStyles({ maxWidth: maxWidth as SectionMaxWidth })}
          options={[
            { value: "sm", label: "S" },
            { value: "md", label: "M" },
            { value: "lg", label: "L" },
            { value: "xl", label: "XL" },
            { value: "full", label: "Full" },
          ]}
        />
      </div>

      {/* Responsive visibility */}
      <div>
        <p className="label">Responsive visibility</p>
        <div className="mb-2.5 flex items-center gap-1.5 rounded-lg border border-line bg-surface-0/50 p-1">
          {(["desktop", "tablet", "mobile"] as const).map((d) => {
            const Icon = d === "desktop" ? Monitor : d === "tablet" ? Tablet : Smartphone;
            return (
              <button
                key={d}
                className={cn(
                  "flex h-7 flex-1 items-center justify-center gap-1.5 rounded-md text-[11.5px] font-medium capitalize transition-colors",
                  device === d ? "bg-surface-3 text-ink" : "text-ink-faint hover:text-ink-muted"
                )}
                onClick={() => setDevice(d)}
                aria-pressed={device === d}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
                {d}
              </button>
            );
          })}
        </div>
        <div className="space-y-2">
          {(["desktop", "tablet", "mobile"] as const).map((d) => {
            const visible = visibility[d];
            return (
              <div
                key={d}
                className={cn(
                  "flex items-center justify-between rounded-lg border p-2.5 transition-opacity",
                  device === d ? "border-line-strong bg-surface-1" : "border-line bg-surface-0/40 opacity-50"
                )}
              >
                <span className="text-[13px] font-medium capitalize text-ink">
                  {d === "desktop" ? "Desktop" : d === "tablet" ? "Tablet" : "Mobile"}
                  <span className="ml-1.5 text-[11px] font-normal text-ink-faint">
                    {d === "desktop" ? "≥ 1024px" : d === "tablet" ? "768–1023px" : "< 768px"}
                  </span>
                </span>
                <Toggle
                  checked={visible}
                  onChange={(v) =>
                    setStyles({ visibility: { ...visibility, [d]: v } })
                  }
                  label={`Show on ${d}`}
                />
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] leading-4 text-ink-faint">
          Hidden sections keep their content — they just don't render on that breakpoint.
        </p>
      </div>
    </div>
  );
}
