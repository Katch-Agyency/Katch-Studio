import { useMemo } from "react";
import { Palette, Type } from "lucide-react";
import { useEditor } from "../editorStore";
import { useToast } from "@/app/toast";
import { Badge, Button } from "@/components/ui/ui";
import { ColorInput, Field, ImagePicker, Select, Segmented, TextArea, TextInput } from "@/components/ui/Fields";
import { THEME_PRESETS, getThemePreset } from "@/data/palette";
import { ARABIC_FONT_PAIRS, FONT_PAIRS } from "@/data/fonts";
import type { BrandConfig, RadiusScale, ThemeConfig, ThemeColors } from "@/types";

type ThemePatch = Partial<Omit<ThemeConfig, "colors" | "fonts">> & {
  colors?: Partial<ThemeColors>;
  fonts?: Partial<ThemeConfig["fonts"]>;
};

/* ============================================================
   Brand panel — business identity, colors, typography, style.
   Every change reflects in the live preview instantly.
   ============================================================ */

export default function BrandPanel() {
  const { project, update } = useEditor();
  const { toast } = useToast();
  const { brand, theme } = project.config;
  const isArabic = project.config.projectInfo.language === "ar";

  const setBrand = (patch: Partial<BrandConfig>) =>
    update((p) => {
      p.config.brand = { ...p.config.brand, ...patch };
    });

  const setTheme = (patch: ThemePatch) =>
    update((p) => {
      p.config.theme = {
        ...p.config.theme,
        ...patch,
        colors: { ...p.config.theme.colors, ...(patch.colors ?? {}) },
        fonts: { ...p.config.theme.fonts, ...(patch.fonts ?? {}) },
      };
    });

  const setColor = (key: keyof ThemeConfig["colors"], value: string) =>
    setTheme({ colors: { [key]: value } as Partial<ThemeColors> });

  const applyPreset = (presetId: string) => {
    const p = getThemePreset(presetId);
    setTheme({
      mode: p.mode,
      colors: { ...p.colors },
      radius: p.radius,
      buttonStyle: p.buttonStyle,
      cardStyle: p.cardStyle,
      density: p.density,
    });
    toast("info", `“${p.name}” theme applied — tweak any value below.`);
  };

  const fontOptions = useMemo(
    () => (isArabic ? ARABIC_FONT_PAIRS : FONT_PAIRS),
    [isArabic]
  );

  return (
    <div className="space-y-7">
      {/* ---------- Identity ---------- */}
      <section aria-labelledby="brand-identity">
        <PanelTitle id="brand-identity" icon={<Palette className="h-3.5 w-3.5" />} title="Identity" />
        <div className="mt-3 space-y-3.5">
          <div className="grid gap-3.5 sm:grid-cols-2">
            <Field label="Business Name">
              <TextInput value={brand.businessName} onChange={(e) => setBrand({ businessName: e.target.value })} placeholder="e.g. Looky Cakes" />
            </Field>
            <Field label="Tagline">
              <TextInput value={brand.tagline} onChange={(e) => setBrand({ tagline: e.target.value })} placeholder="e.g. Sweet moments, crafted daily" />
            </Field>
          </div>
          <Field label="Description" hint="Shown in the footer and used for site metadata.">
            <TextArea value={brand.description} onChange={(e) => setBrand({ description: e.target.value })} />
          </Field>
          <Field label="Logo text / wordmark">
            <TextInput value={brand.logoText} onChange={(e) => setBrand({ logoText: e.target.value })} />
          </Field>
          <ImagePicker value={brand.logoUrl} onChange={(logoUrl) => setBrand({ logoUrl })} label="Logo image" ratio="aspect-[4/1.5]" />
        </div>
      </section>

      {/* ---------- Contact ---------- */}
      <section aria-labelledby="brand-contact">
        <PanelTitle id="brand-contact" icon={<Type className="h-3.5 w-3.5" />} title="Contact & Social" />
        <div className="mt-3 grid gap-3.5 sm:grid-cols-2">
          <Field label="Email">
            <TextInput type="email" value={brand.email} onChange={(e) => setBrand({ email: e.target.value })} />
          </Field>
          <Field label="Phone">
            <TextInput value={brand.phone} onChange={(e) => setBrand({ phone: e.target.value })} />
          </Field>
          <Field label="WhatsApp" hint="Drives the WhatsApp CTA feature.">
            <TextInput value={brand.whatsapp} onChange={(e) => setBrand({ whatsapp: e.target.value })} />
          </Field>
          <Field label="Address">
            <TextInput value={brand.address} onChange={(e) => setBrand({ address: e.target.value })} />
          </Field>
        </div>
        <div className="mt-3.5 space-y-2">
          {brand.social.map((s, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <input
                className="input h-8 w-28 text-[13px]"
                placeholder="Label"
                value={s.label}
                onChange={(e) =>
                  setBrand({ social: brand.social.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })
                }
                aria-label={`Social label ${i + 1}`}
              />
              <input
                className="input h-8 flex-1 text-[13px]"
                placeholder="https://…"
                value={s.url}
                onChange={(e) =>
                  setBrand({ social: brand.social.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)) })
                }
                aria-label={`Social URL ${i + 1}`}
              />
              <button
                className="btn-icon-sm"
                onClick={() => setBrand({ social: brand.social.filter((_, j) => j !== i) })}
                aria-label="Remove social link"
              >
                <span className="text-danger">✕</span>
              </button>
            </div>
          ))}
          <Button variant="secondary" size="sm" onClick={() => setBrand({ social: [...brand.social, { label: "New", url: "" }] })}>
            + Add social link
          </Button>
        </div>
      </section>

      {/* ---------- Theme presets ---------- */}
      <section aria-labelledby="brand-presets">
        <PanelTitle id="brand-presets" icon={<Palette className="h-3.5 w-3.5" />} title="Theme Presets" />
        <div className="mt-3 flex flex-wrap gap-2">
          {THEME_PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => applyPreset(p.id)}
              className="card card-hover flex items-center gap-2 px-3 py-2 text-[13px] font-medium text-ink"
              title={p.description}
            >
              <span className="flex gap-1">
                <span className="h-3.5 w-3.5 rounded-full border border-black/10" style={{ background: p.colors.primary }} />
                <span className="h-3.5 w-3.5 rounded-full border border-black/10" style={{ background: p.colors.accent }} />
                <span className="h-3.5 w-3.5 rounded-full border border-black/10" style={{ background: p.colors.background }} />
              </span>
              {p.name}
            </button>
          ))}
        </div>
      </section>

      {/* ---------- Colors ---------- */}
      <section aria-labelledby="brand-colors">
        <PanelTitle id="brand-colors" icon={<Palette className="h-3.5 w-3.5" />} title="Colors" />
        <div className="mt-3 space-y-3">
          <div className="flex items-center justify-between">
            <p className="label mb-0">Mode</p>
            <Segmented
              ariaLabel="Theme mode"
              value={theme.mode}
              onChange={(mode) => setTheme({ mode })}
              options={[
                { value: "light", label: "Light" },
                { value: "dark", label: "Dark" },
              ]}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <ColorInput label="Primary" value={theme.colors.primary} onChange={(v) => setColor("primary", v)} />
            <ColorInput label="Secondary" value={theme.colors.secondary} onChange={(v) => setColor("secondary", v)} />
            <ColorInput label="Accent" value={theme.colors.accent} onChange={(v) => setColor("accent", v)} />
            <ColorInput label="Background" value={theme.colors.background} onChange={(v) => setColor("background", v)} />
            <ColorInput label="Surface" value={theme.colors.surface} onChange={(v) => setColor("surface", v)} />
            <ColorInput label="Text" value={theme.colors.text} onChange={(v) => setColor("text", v)} />
          </div>
          <p className="text-xs text-ink-faint">Muted text is derived automatically for contrast.</p>
        </div>
      </section>

      {/* ---------- Typography ---------- */}
      <section aria-labelledby="brand-type">
        <PanelTitle id="brand-type" icon={<Type className="h-3.5 w-3.5" />} title="Typography" />
        <div className="mt-3 grid gap-3.5 sm:grid-cols-2">
          <Field label={isArabic ? "Arabic font" : "Heading font"}>
            <Select
              value={isArabic ? theme.fonts.arabic : theme.fonts.heading}
              onChange={(e) =>
                isArabic
                  ? setTheme({ fonts: { arabic: e.target.value, heading: e.target.value, body: e.target.value } })
                  : setTheme({ fonts: { heading: e.target.value } })
              }
            >
              {fontOptions.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </Select>
          </Field>
          {!isArabic && (
            <Field label="Body font">
              <Select value={theme.fonts.body} onChange={(e) => setTheme({ fonts: { body: e.target.value } })}>
                {FONT_PAIRS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          {isArabic && (
            <div className="flex items-end">
              <Badge tone="accent">RTL project — Arabic font applied to headings &amp; body</Badge>
            </div>
          )}
        </div>
        <p className="mt-2 text-xs text-ink-faint">
          Fonts load from Google Fonts in the preview and in the exported site.
        </p>
      </section>

      {/* ---------- Style ---------- */}
      <section aria-labelledby="brand-style">
        <PanelTitle id="brand-style" icon={<Palette className="h-3.5 w-3.5" />} title="Style" />
        <div className="mt-3 space-y-3.5">
          <div>
            <p className="label">Border radius</p>
            <Segmented
              ariaLabel="Border radius"
              value={theme.radius}
              onChange={(radius) => setTheme({ radius: radius as RadiusScale })}
              options={[
                { value: "none", label: "None" },
                { value: "sm", label: "Small" },
                { value: "md", label: "Medium" },
                { value: "lg", label: "Large" },
                { value: "xl", label: "XLarge" },
                { value: "full", label: "Pill" },
              ]}
            />
          </div>
          <div>
            <p className="label">Button style</p>
            <Segmented
              ariaLabel="Button style"
              value={theme.buttonStyle}
              onChange={(buttonStyle) => setTheme({ buttonStyle })}
              options={[
                { value: "solid", label: "Solid" },
                { value: "outline", label: "Outline" },
                { value: "pill", label: "Pill" },
              ]}
            />
          </div>
          <div>
            <p className="label">Card style</p>
            <Segmented
              ariaLabel="Card style"
              value={theme.cardStyle}
              onChange={(cardStyle) => setTheme({ cardStyle })}
              options={[
                { value: "flat", label: "Flat" },
                { value: "elevated", label: "Elevated" },
                { value: "outlined", label: "Outlined" },
              ]}
            />
          </div>
          <div>
            <p className="label">Spacing density</p>
            <Segmented
              ariaLabel="Spacing density"
              value={theme.density}
              onChange={(density) => setTheme({ density })}
              options={[
                { value: "compact", label: "Compact" },
                { value: "comfortable", label: "Comfortable" },
                { value: "spacious", label: "Spacious" },
              ]}
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function PanelTitle({ id, icon, title }: { id: string; icon: React.ReactNode; title: string }) {
  return (
    <h3 id={id} className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wider text-ink-muted">
      <span className="flex h-5 w-5 items-center justify-center rounded bg-brand-muted text-brand-hover">{icon}</span>
      {title}
    </h3>
  );
}
