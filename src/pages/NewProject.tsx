import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Check,
  Info,
  Layers,
  Palette,
  Rocket,
  ShoppingBag,
  Sparkles,
  UtensilsCrossed,
  Wand2,
} from "lucide-react";
import { useStore } from "@/app/store";
import { useToast } from "@/app/toast";
import { Button, Badge } from "@/components/ui/ui";
import { Field, TextInput, TextArea, Select, Toggle } from "@/components/ui/Fields";
import { Modal } from "@/components/ui/Modal";
import { WEBSITE_CATEGORIES, TEMPLATE_FEATURES, getCategory } from "@/data/features";
import { THEME_PRESETS, getThemePreset } from "@/data/palette";
import { SECTION_DEFINITIONS, SECTION_TYPES } from "@/features/sections/registry";
import { SECTION_GROUPS } from "@/types";
import type { WebsiteCategory, WebsiteTemplate } from "@/types";
import { cn } from "@/utils/helpers";

/* ============================================================
   New Project — the 4-step production flow:
   1. Project info → 2. Template → 3. Brand & theme → 4. Build
   ============================================================ */

type WizardDraft = {
  name: string;
  client: string;
  category: string;
  description: string;
  audience: string;
  language: "en" | "ar";
  templateId: string | null;
  businessName: string;
  tagline: string;
  themePresetId: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  sections: string[];
  features: string[];
};

const STEPS = ["Project Info", "Template", "Brand & Theme", "Sections & Features"];

export default function NewProject() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { createProject, allTemplates } = useStore();
  const { toast } = useToast();

  /* Deep link from the Templates page: ?template=<id> */
  const deepTemplateId = searchParams.get("template");
  const deepTemplate = deepTemplateId ? allTemplates.find((t) => t.id === deepTemplateId) : undefined;

  const [step, setStep] = useState(deepTemplate ? 2 : 0);
  const [previewTpl, setPreviewTpl] = useState<WebsiteTemplate | null>(null);
  const [draft, setDraft] = useState<WizardDraft>(() => {
    /* Preselect the featured template of the default category so the
       highlighted category is honest and Continue is never a dead end. */
    const defaultCategory = deepTemplate?.category ?? "restaurant";
    const startTpl =
      deepTemplate ??
      allTemplates.filter((t) => t.category === defaultCategory).find((t) => t.featured) ??
      allTemplates.find((t) => t.category === defaultCategory) ??
      null;
    return {
      name: "",
      client: "",
      category: defaultCategory,
      description: "",
      audience: "",
      language: "en",
      templateId: startTpl?.id ?? null,
      businessName: "",
      tagline: "",
      themePresetId: startTpl?.themePresetId ?? "modern",
      phone: "",
      whatsapp: "",
      email: "",
      address: "",
      sections: startTpl ? [...startTpl.defaultSections] : [],
      features: startTpl ? [...startTpl.features] : [],
    };
  });

  const set = <K extends keyof WizardDraft>(key: K, value: WizardDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  /* Apply a deep-linked template if the URL changes while the wizard is open */
  useEffect(() => {
    if (deepTemplate) {
      pickTemplate(deepTemplate);
      setStep(2);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deepTemplate?.id]);

  const category = getCategory(draft.category)!;
  const templates = useMemo(() => allTemplates.filter((t) => t.category === draft.category), [draft.category, allTemplates]);
  const template = draft.templateId ? allTemplates.find((t) => t.id === draft.templateId) : undefined;

  /* When category changes, pick the first (featured) template */
  const pickCategory = (id: string) => {
    const list = allTemplates.filter((t) => t.category === id);
    const tpl = list.find((t) => t.featured) ?? list[0];
    set("category", id);
    set("templateId", tpl?.id ?? null);
    set("sections", tpl?.defaultSections ?? []);
    set("features", tpl?.features ?? []);
  };

  const pickTemplate = (tpl: WebsiteTemplate) => {
    set("templateId", tpl.id);
    set("sections", [...tpl.defaultSections]);
    set("features", [...tpl.features]);
    set("themePresetId", tpl.themePresetId);
  };

  const toggleSection = (type: string) =>
    set("sections", draft.sections.includes(type) ? draft.sections.filter((s) => s !== type) : [...draft.sections, type]);

  const toggleFeature = (id: string) =>
    set("features", draft.features.includes(id) ? draft.features.filter((f) => f !== id) : [...draft.features, id]);

  /* Validation per step */
  const stepValid = useMemo(() => {
    switch (step) {
      case 0:
        return draft.name.trim().length > 0 && draft.category !== "";
      case 1:
        return Boolean(draft.templateId);
      case 2:
        return true;
      case 3:
        return draft.sections.length > 0;
      default:
        return true;
    }
  }, [step, draft]);

  const finish = () => {
    if (!draft.templateId) return;
    if (!draft.name.trim()) {
      toast("error", "Please give the project a name first.");
      setStep(0);
      return;
    }
    const tpl = allTemplates.find((t) => t.id === draft.templateId);
    if (!tpl) {
      toast("error", "This template no longer exists — please pick another one.");
      setStep(1);
      return;
    }
    const preset = getThemePreset(draft.themePresetId);
    const project = createProject({
      templateId: draft.templateId,
      template: tpl,
      name: draft.name.trim(),
      client: draft.client.trim(),
      category: draft.category,
      description: draft.description,
      audience: draft.audience,
      language: draft.language,
      brand: {
        businessName: draft.businessName.trim() || draft.client.trim() || draft.name.trim() || "Your Brand",
        tagline: draft.tagline,
        logoText: draft.businessName.trim() || draft.client.trim() || draft.name.trim(),
        email: draft.email,
        phone: draft.phone,
        whatsapp: draft.whatsapp,
        address: draft.address,
      },
      theme: {
        mode: preset.mode,
        colors: { ...preset.colors },
        radius: preset.radius,
        buttonStyle: preset.buttonStyle,
        cardStyle: preset.cardStyle,
        density: preset.density,
      },
      sections: draft.sections,
      features: draft.features,
    });
    toast("success", `Project “${project.config.projectInfo.name}” created.`);
    navigate(`/editor/${project.id}`);
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 md:px-8">
      {/* Stepper */}
      <nav aria-label="New project steps" className="mb-8">
        <button className="mb-5 inline-flex items-center gap-1.5 text-[13px] text-ink-muted hover:text-ink" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>
        <ol className="flex items-center gap-2">
          {STEPS.map((label, i) => (
            <React.Fragment key={label}>
              <li className="flex items-center gap-2">
                <button
                  onClick={() => i < step && setStep(i)}
                  disabled={i > step}
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold transition-colors",
                    i < step
                      ? "cursor-pointer border-transparent bg-brand-muted text-brand-hover"
                      : i === step
                        ? "border-transparent bg-katch text-katch-ink"
                        : "cursor-default border-line-strong text-ink-faint"
                  )}
                  aria-current={i === step ? "step" : undefined}
                >
                  {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </button>
                <span className={cn("hidden text-[13px] font-medium sm:block", i === step ? "text-ink" : "text-ink-faint")}>
                  {label}
                </span>
              </li>
              {i < STEPS.length - 1 && (
                <li
                  className={cn("h-px w-6 sm:w-10", i < step ? "bg-brand-ring" : "bg-line-strong")}
                  aria-hidden
                />
              )}
            </React.Fragment>
          ))}
        </ol>
      </nav>

      {/* ---------- STEP 1: Project info ---------- */}
      {step === 0 && (
        <div className="animate-fade-up">
          <h2 className="text-xl font-bold tracking-tight text-ink">Tell us about the project</h2>
          <p className="mt-1 text-sm text-ink-muted">This information organizes the project inside Katch Studio.</p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Field label="Project Name" id="np-name">
              <TextInput
                id="np-name"
                placeholder="e.g. Looky Cakes Website"
                value={draft.name}
                onChange={(e) => set("name", e.target.value)}
                autoFocus
              />
            </Field>
            <Field label="Client Name" id="np-client">
              <TextInput
                id="np-client"
                placeholder="e.g. Looky Cakes"
                value={draft.client}
                onChange={(e) => set("client", e.target.value)}
              />
            </Field>
            <Field label="Project Description" className="sm:col-span-2" id="np-desc">
              <TextArea
                id="np-desc"
                placeholder="What is this website for? (internal note)"
                value={draft.description}
                onChange={(e) => set("description", e.target.value)}
              />
            </Field>
            <Field label="Target Audience" id="np-audience">
              <TextInput
                id="np-audience"
                placeholder="e.g. Families in Cairo looking for premium desserts"
                value={draft.audience}
                onChange={(e) => set("audience", e.target.value)}
              />
            </Field>
            <Field label="Website Language" id="np-lang">
              <Select id="np-lang" value={draft.language} onChange={(e) => set("language", e.target.value as "en" | "ar")}>
                <option value="en">English (LTR)</option>
                <option value="ar">العربية (RTL)</option>
              </Select>
            </Field>
          </div>

          <div className="mt-8">
            <h3 className="mb-3 flex items-center gap-2 text-[15px] font-semibold text-ink">
              <Sparkles className="h-4 w-4 text-brand-hover" /> What kind of website is this?
            </h3>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {WEBSITE_CATEGORIES.map((c) => (
                <CategoryCard key={c.id} category={c} selected={draft.category === c.id} onSelect={() => pickCategory(c.id)} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ---------- STEP 2: Template ---------- */}
      {step === 1 && (
        <div className="animate-fade-up">
          <h2 className="text-xl font-bold tracking-tight text-ink">Choose a starting template</h2>
          <p className="mt-1 text-sm text-ink-muted">
            {category.label} templates — every template is a composition of reusable sections you can customize later.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {templates.map((tpl) => (
              <div
                key={tpl.id}
                className={cn(
                  "card card-hover group overflow-hidden text-left transition-all",
                  draft.templateId === tpl.id && "border-brand-ring ring-2 ring-brand-ring"
                )}
              >
                {/* Preview button — opens the full preview dialog */}
                <button
                  type="button"
                  onClick={() => setPreviewTpl(tpl)}
                  className="relative block aspect-[16/8] w-full overflow-hidden bg-surface-2 text-left"
                  aria-label={`Preview ${tpl.name}`}
                >
                  <img
                    src={tpl.previewImage}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                  <span className="absolute left-3 top-3 rounded-md bg-black/60 px-2 py-1 text-[11px] font-medium text-white backdrop-blur">
                    {tpl.featured ? "Featured" : "Preview"}
                  </span>
                  {draft.templateId === tpl.id && (
                    <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-katch text-katch-ink">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                  )}
                </button>

                <div className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-[15px] font-semibold text-ink">{tpl.name}</h3>
                    <Badge tone="brand">{tpl.style}</Badge>
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-ink-muted">{tpl.description}</p>
                  <div className="mt-3 flex items-center gap-3 text-xs text-ink-faint">
                    <span>{tpl.defaultSections.length} sections</span>
                    <span aria-hidden>·</span>
                    <span>{tpl.pages.length} pages</span>
                    <span aria-hidden>·</span>
                    <span>{tpl.features.length} features</span>
                  </div>
                  <Button
                    variant={draft.templateId === tpl.id ? "secondary" : "primary"}
                    size="md"
                    className="mt-4 w-full"
                    onClick={() => pickTemplate(tpl)}
                  >
                    {draft.templateId === tpl.id ? (
                      <>
                        <Check className="h-4 w-4" /> Selected
                      </>
                    ) : (
                      "Use Template"
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---------- STEP 3: Brand & theme ---------- */}
      {step === 2 && template && (
        <div className="animate-fade-up">
          <h2 className="text-xl font-bold tracking-tight text-ink">Set up the brand</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Business details and a theme preset for <strong className="text-ink">{template.name}</strong> — you can fine-tune everything in the editor.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Field label="Business Name" id="np-biz">
              <TextInput
                id="np-biz"
                placeholder={draft.client || "e.g. Looky Cakes"}
                value={draft.businessName}
                onChange={(e) => set("businessName", e.target.value)}
              />
            </Field>
            <Field label="Tagline" id="np-tag">
              <TextInput
                id="np-tag"
                placeholder="e.g. Sweet moments, crafted daily"
                value={draft.tagline}
                onChange={(e) => set("tagline", e.target.value)}
              />
            </Field>
            <Field label="Phone" id="np-phone">
              <TextInput id="np-phone" placeholder="+20 100 000 0000" value={draft.phone} onChange={(e) => set("phone", e.target.value)} />
            </Field>
            <Field label="WhatsApp" id="np-wa" hint="Used by the WhatsApp CTA feature.">
              <TextInput id="np-wa" placeholder="+20 100 000 0000" value={draft.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} />
            </Field>
            <Field label="Email" className="sm:col-span-2" id="np-email">
              <TextInput id="np-email" placeholder="hello@business.com" type="email" value={draft.email} onChange={(e) => set("email", e.target.value)} />
            </Field>
          </div>

          <div className="mt-8">
            <h3 className="mb-3 flex items-center gap-2 text-[15px] font-semibold text-ink">
              <Wand2 className="h-4 w-4 text-brand-hover" /> Theme preset
            </h3>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {THEME_PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => set("themePresetId", p.id)}
                  className={cn(
                    "card card-hover p-3 text-left transition-all",
                    draft.themePresetId === p.id && "border-brand ring-2 ring-brand-ring"
                  )}
                  aria-pressed={draft.themePresetId === p.id}
                >
                  <div className="flex gap-1.5">
                    <span className="h-5 w-5 rounded-md border border-black/10" style={{ background: p.colors.primary }} />
                    <span className="h-5 w-5 rounded-md border border-black/10" style={{ background: p.colors.secondary }} />
                    <span className="h-5 w-5 rounded-md border border-black/10" style={{ background: p.colors.accent }} />
                    <span
                      className="h-5 w-5 rounded-md border border-black/10"
                      style={{ background: p.colors.background, borderColor: p.mode === "dark" ? "rgba(255,255,255,0.15)" : undefined }}
                    />
                  </div>
                  <p className="mt-2.5 text-[13.5px] font-semibold text-ink">{p.name}</p>
                  <p className="mt-0.5 line-clamp-2 text-[11.5px] leading-4 text-ink-faint">{p.description}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ---------- STEP 4: Sections & features ---------- */}
      {step === 3 && template && (
        <div className="animate-fade-up">
          <h2 className="text-xl font-bold tracking-tight text-ink">Choose the building blocks</h2>
          <p className="mt-1 text-sm text-ink-muted">
            {template.name} comes with {template.defaultSections.length} sections — toggle them on/off for your first page.
          </p>

          <div className="mt-6 space-y-4">
            {SECTION_GROUPS.map((group) => {
              const types = SECTION_TYPES.filter((t) => SECTION_DEFINITIONS[t].group === group.id);
              if (types.length === 0) return null;
              return (
                <div key={group.id}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-faint">{group.label}</p>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {types.map((t) => {
                      const def = SECTION_DEFINITIONS[t];
                      const on = draft.sections.includes(t);
                      const inTemplate = template.defaultSections.includes(t);
                      return (
                        <div
                          key={t}
                          onClick={() => toggleSection(t)}
                          className={cn(
                            "flex cursor-pointer select-none items-start gap-2.5 rounded-lg border p-3 text-left transition-all",
                            on
                              ? "border-brand-ring bg-brand-muted"
                              : "border-line bg-surface-1 hover:border-line-strong",
                            !inTemplate && !on && "opacity-40"
                          )}
                        >
                          {/* stopPropagation: the toggle is the accessible control;
                              the card itself is a convenience click target */}
                          <span onClick={(e) => e.stopPropagation()}>
                            <Toggle
                              checked={on}
                              onChange={() => toggleSection(t)}
                              label={`Toggle ${def.name}`}
                            />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[13.5px] font-medium text-ink">{def.name}</span>
                            <span className="mt-0.5 block text-[11.5px] leading-4 text-ink-faint">{def.description}</span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8">
            <h3 className="mb-3 flex items-center gap-2 text-[15px] font-semibold text-ink">
              <Sparkles className="h-4 w-4 text-brand-hover" /> Optional features
            </h3>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {TEMPLATE_FEATURES.filter((f) => f.categories === "all" || f.categories.includes(draft.category as never)).map((f) => {
                const on = draft.features.includes(f.id);
                return (
                  <div
                    key={f.id}
                    onClick={() => toggleFeature(f.id)}
                    className={cn(
                      "flex cursor-pointer select-none items-start gap-2.5 rounded-lg border p-3 text-left transition-all",
                      on ? "border-brand-ring bg-brand-muted" : "border-line bg-surface-1 hover:border-line-strong"
                    )}
                  >
                    <span onClick={(e) => e.stopPropagation()}>
                      <Toggle checked={on} onChange={() => toggleFeature(f.id)} label={`Toggle ${f.name}`} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13.5px] font-medium text-ink">{f.name}</span>
                      <span className="mt-0.5 block text-[11.5px] leading-4 text-ink-faint">{f.description}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Summary */}
          <div className="mt-8 rounded-xl border border-line bg-surface-1 p-4">
            <p className="flex items-center gap-2 text-[13px] font-semibold text-ink">
              <Info className="h-4 w-4 text-info" /> Ready to build
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">
              <strong className="text-ink">{draft.name || "Untitled"}</strong> · {category.label} · {template.name} ·{" "}
              {draft.sections.length} sections · {draft.features.length} features · {getThemePreset(draft.themePresetId).name} theme
              {draft.language === "ar" ? " · Arabic (RTL)" : " · English"}
            </p>
          </div>
        </div>
      )}

      {/* Template preview dialog */}
      <Modal
        open={Boolean(previewTpl)}
        onClose={() => setPreviewTpl(null)}
        title={previewTpl?.name ?? ""}
        description={previewTpl ? `${getCategory(previewTpl.category)?.label} · ${previewTpl.style}` : undefined}
        size="lg"
        footer={
          previewTpl ? (
            <>
              <Button variant="ghost" onClick={() => setPreviewTpl(null)}>
                Close
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  pickTemplate(previewTpl);
                  setPreviewTpl(null);
                }}
              >
                Use Template
              </Button>
            </>
          ) : undefined
        }
      >
        {previewTpl && (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-xl border border-line bg-surface-2">
              <img src={previewTpl.previewImage} alt="" className="aspect-[16/8] w-full object-cover" />
            </div>
            <p className="text-sm leading-relaxed text-ink-muted">{previewTpl.description}</p>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-faint">Sections</p>
              <div className="flex flex-wrap gap-1.5">
                {previewTpl.defaultSections.map((s) => (
                  <span key={s} className="rounded-md border border-line-strong bg-surface-2 px-2 py-1 text-[11.5px] text-ink-muted">
                    {SECTION_DEFINITIONS[s].name}
                  </span>
                ))}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-faint">Pages</p>
                <ul className="space-y-1 text-[13px] text-ink-muted">
                  {previewTpl.pages.map((p) => (
                    <li key={p.name}>{p.name}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-faint">Features</p>
                <div className="flex flex-wrap gap-1.5">
                  {previewTpl.features.map((fid) => (
                    <span key={fid} className="rounded-md border border-line-strong bg-surface-2 px-2 py-1 text-[11.5px] text-ink-muted">
                      {TEMPLATE_FEATURES.find((f) => f.id === fid)?.name ?? fid}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Footer nav */}
      <div className="mt-8 flex items-center justify-between border-t border-line pt-5">
        <Button variant="ghost" onClick={() => (step === 0 ? navigate(-1) : setStep(step - 1))}>
          <ArrowLeft className="h-4 w-4" /> {step === 0 ? "Cancel" : "Back"}
        </Button>
        {step < STEPS.length - 1 ? (
          <Button variant="primary" disabled={!stepValid} onClick={() => setStep(step + 1)}>
            Continue <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button variant="primary" disabled={!stepValid} onClick={finish}>
            <Sparkles className="h-4 w-4" /> Create Project
          </Button>
        )}
      </div>
      {!stepValid && (
        <p className="mt-2 text-right text-xs text-ink-faint">
          {step === 0 ? "A project name is required." : step === 3 ? "Keep at least one section." : ""}
        </p>
      )}
    </div>
  );
}

/* ---------- Category card ---------- */

function CategoryCard({
  category,
  selected,
  onSelect,
}: {
  category: WebsiteCategory;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      disabled={!category.available}
      className={cn(
        "card card-hover relative p-4 text-left transition-all",
        selected && "border-brand ring-2 ring-brand-ring",
        !category.available && "cursor-not-allowed opacity-45"
      )}
      aria-pressed={selected}
      title={category.available ? undefined : "Coming soon — architecture is ready"}
    >
      <div className="flex items-center justify-between">
        <span className={cn("flex h-9 w-9 items-center justify-center rounded-lg", selected ? "bg-brand-muted text-brand-hover" : "bg-surface-2 text-ink-muted")}>
          <CategoryIcon name={category.icon} />
        </span>
        {!category.available && <Badge tone="neutral">Soon</Badge>}
      </div>
      <p className="mt-3 text-[14px] font-semibold text-ink">{category.label}</p>
      <p className="mt-0.5 line-clamp-2 text-xs leading-4 text-ink-faint">{category.description}</p>
    </button>
  );
}

function CategoryIcon({ name }: { name: string }) {
  const props = { className: "h-[18px] w-[18px]", "aria-hidden": true };
  switch (name) {
    case "utensils-crossed":
      return <UtensilsCrossed {...props} />;
    case "briefcase":
      return <Briefcase {...props} />;
    case "rocket":
      return <Rocket {...props} />;
    case "palette":
      return <Palette {...props} />;
    case "shopping-bag":
      return <ShoppingBag {...props} />;
    default:
      return <Layers {...props} />;
  }
}
