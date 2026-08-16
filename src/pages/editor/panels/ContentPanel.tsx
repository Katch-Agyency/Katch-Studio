import { useMemo } from "react";
import { MousePointerClick } from "lucide-react";
import { useEditor } from "../editorStore";
import { useEditorUI } from "../editorUI";
import { SectionIcon } from "@/components/SectionIcon";
import { Select } from "@/components/ui/Fields";
import { SECTION_DEFINITIONS } from "@/features/sections/registry";
import { deepMerge } from "@/utils/helpers";
import type { SectionInstance } from "@/types";
import {
  CTAFields,
  ImageField,
  KeyValueField,
  StringField,
  StringListField,
} from "./EditorFields";

/* ============================================================
   Content panel — edit the selected section's content with
   typed, in-place field editors. Fast agency production:
   click a section in the list, edit, watch the live preview.
   ============================================================ */

interface MenuItemLike {
  name: string;
  description: string;
  price: string;
}
interface MenuCategoryLike {
  name: string;
  items: MenuItemLike[];
}
interface FooterLinkLike {
  label: string;
  href: string;
}
interface FooterColumnLike {
  title: string;
  links: FooterLinkLike[];
}

export default function ContentPanel() {
  const { project, update } = useEditor();
  const { activePageId, selectedSectionId, setSelectedSectionId } = useEditorUI();

  const page = project.config.pages.find((p) => p.id === activePageId);
  const pageSections = useMemo(
    () =>
      (page?.sections ?? [])
        .map((id) => project.config.sections.find((s) => s.id === id))
        .filter((s): s is SectionInstance => Boolean(s)),
    [page, project.config.sections]
  );

  const section = pageSections.find((s) => s.id === selectedSectionId) ?? pageSections[0] ?? null;

  const setContent = (patch: Record<string, unknown>) => {
    if (!section) return;
    const id = section.id;
    update((p) => {
      const s = p.config.sections.find((x) => x.id === id);
      if (s) s.content = deepMerge(s.content, patch);
    });
  };

  if (!section) {
    return (
      <div className="flex flex-col items-center rounded-lg border border-dashed border-line-strong px-4 py-12 text-center">
        <MousePointerClick className="mb-3 h-6 w-6 text-ink-faint" aria-hidden />
        <p className="text-[13.5px] font-medium text-ink">Select a section to edit its content</p>
        <p className="mt-1 max-w-xs text-xs leading-relaxed text-ink-faint">
          Pick a section in the Sections tab (or from the dropdown above the preview), then edit its
          headlines, buttons, images and lists here.
        </p>
      </div>
    );
  }

  const def = SECTION_DEFINITIONS[section.type];
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const c = section.content as Record<string, any>;
  const brand = project.config.brand;

  return (
    <div className="space-y-5">
      {/* Section picker */}
      <div>
        <label className="label" htmlFor="content-section-picker">
          Editing section
        </label>
        <Select
          id="content-section-picker"
          value={section.id}
          onChange={(e) => setSelectedSectionId(e.target.value)}
        >
          {pageSections.map((s) => (
            <option key={s.id} value={s.id}>
              {SECTION_DEFINITIONS[s.type].name}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex items-center gap-2.5 rounded-lg border border-line bg-surface-0/50 px-3 py-2.5">
        <SectionIcon type={section.type} className="h-4 w-4 text-brand-hover" />
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-semibold text-ink">{def.name}</p>
          <p className="text-[11.5px] text-ink-faint">{def.description}</p>
        </div>
      </div>

      {/* ---------- Per-type fields ---------- */}
      {section.type === "navbar" && (
        <>
          <p className="label">Menu links</p>
          <KeyValueField
            label=""
            items={c.nav ?? []}
            onChange={(nav) => setContent({ nav })}
            newItem={() => ({ label: "New Link", href: "#" })}
            addLabel="Add link"
            renderItem={(item, update, remove) => (
              <div className="grid gap-2">
                <div className="flex items-center gap-1.5">
                  <input
                    className="input h-8 text-[13px]"
                    placeholder="Label"
                    value={item.label}
                    onChange={(e) => update({ label: e.target.value })}
                    aria-label="Link label"
                  />
                  <input
                    className="input h-8 text-[13px]"
                    placeholder="#href"
                    value={item.href}
                    onChange={(e) => update({ href: e.target.value })}
                    aria-label="Link href"
                  />
                  <button className="btn-icon-sm" onClick={remove} aria-label="Remove link">
                    <span className="text-danger">✕</span>
                  </button>
                </div>
              </div>
            )}
          />
          <CTAFields label="Navbar button" cta={c.cta ?? { label: "", href: "#", variant: "primary" }} onChange={(cta) => setContent({ cta })} />
        </>
      )}

      {section.type === "announcement" && (
        <StringField label="Announcement text" value={c.text ?? ""} onChange={(text) => setContent({ text })} />
      )}

      {section.type === "hero" && (
        <>
          <StringField label="Headline" value={c.title ?? ""} onChange={(title) => setContent({ title })} placeholder={`Welcome to ${brand.businessName}`} />
          <StringField label="Eyebrow (small line above the headline)" value={c.subtitle ?? ""} onChange={(subtitle) => setContent({ subtitle })} />
          <StringField label="Description" value={c.description ?? ""} onChange={(description) => setContent({ description })} area />
          <CTAFields label="Primary button" cta={c.primaryCTA ?? { label: "", href: "#", variant: "primary" }} onChange={(primaryCTA) => setContent({ primaryCTA })} />
          <CTAFields label="Secondary button" cta={c.secondaryCTA ?? { label: "", href: "#", variant: "secondary" }} onChange={(secondaryCTA) => setContent({ secondaryCTA })} />
          <ImageField
            label="Hero image"
            value={c.image ?? ""}
            alt={c.imageAlt ?? ""}
            onChange={(image) => setContent({ image })}
            onAltChange={(imageAlt) => setContent({ imageAlt })}
            hint="Leave empty for a text-only hero."
          />
          <div>
            <p className="label">Alignment</p>
            <div className="seg">
              {(["left", "center"] as const).map((a) => (
                <button key={a} className={(c.alignment ?? "left") === a ? "seg-item-active" : "seg-item"} onClick={() => setContent({ alignment: a })}>
                  {a === "left" ? "Left / split" : "Centered"}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {section.type === "about" && (
        <>
          <StringField label="Title" value={c.title ?? ""} onChange={(title) => setContent({ title })} />
          <StringField label="Eyebrow" value={c.subtitle ?? ""} onChange={(subtitle) => setContent({ subtitle })} />
          <StringField label="Story" value={c.text ?? ""} onChange={(text) => setContent({ text })} area />
          <ImageField label="Image" value={c.image ?? ""} alt={c.imageAlt ?? ""} onChange={(image) => setContent({ image })} onAltChange={(imageAlt) => setContent({ imageAlt })} />
          <StringListField label="Highlights" items={c.points ?? []} onChange={(points) => setContent({ points })} placeholder="e.g. Fresh-baked every morning" />
        </>
      )}

      {(section.type === "services" || section.type === "features") && (
        <>
          <StringField label="Title" value={c.title ?? ""} onChange={(title) => setContent({ title })} />
          <StringField label="Eyebrow" value={c.subtitle ?? ""} onChange={(subtitle) => setContent({ subtitle })} />
          <KeyValueField
            label="Items"
            items={c.items ?? []}
            onChange={(items) => setContent({ items })}
            newItem={() => ({ icon: "sparkles", title: "New item", text: "" })}
            addLabel="Add item"
            renderItem={(item, update, remove) => (
              <div className="grid gap-2">
                <div className="flex items-center gap-1.5">
                  <input className="input h-8 flex-1 text-[13px]" placeholder="Title" value={item.title} onChange={(e) => update({ title: e.target.value })} aria-label="Item title" />
                  <input className="input h-8 w-36 text-[13px]" placeholder="Icon name" value={item.icon} onChange={(e) => update({ icon: e.target.value })} aria-label="Item icon" />
                  <button className="btn-icon-sm" onClick={remove} aria-label="Remove item">
                    <span className="text-danger">✕</span>
                  </button>
                </div>
                <textarea className="textarea min-h-[64px] text-[13px]" placeholder="Description" value={item.text} onChange={(e) => update({ text: e.target.value })} aria-label="Item description" />
              </div>
            )}
          />
        </>
      )}

      {section.type === "stats" && (
        <KeyValueField
          label="Stats"
          items={c.items ?? []}
          onChange={(items) => setContent({ items })}
          newItem={() => ({ value: "100+", label: "Something great" })}
          addLabel="Add stat"
          renderItem={(item, update, remove) => (
            <div className="grid grid-cols-[110px_1fr_auto] items-center gap-1.5">
              <input className="input h-8 text-[13px]" placeholder="Value" value={item.value} onChange={(e) => update({ value: e.target.value })} aria-label="Stat value" />
              <input className="input h-8 text-[13px]" placeholder="Label" value={item.label} onChange={(e) => update({ label: e.target.value })} aria-label="Stat label" />
              <button className="btn-icon-sm" onClick={remove} aria-label="Remove stat">
                <span className="text-danger">✕</span>
              </button>
            </div>
          )}
        />
      )}

      {section.type === "process" && (
        <>
          <StringField label="Title" value={c.title ?? ""} onChange={(title) => setContent({ title })} />
          <StringField label="Eyebrow" value={c.subtitle ?? ""} onChange={(subtitle) => setContent({ subtitle })} />
          <KeyValueField
            label="Steps"
            items={c.steps ?? []}
            onChange={(steps) => setContent({ steps })}
            newItem={() => ({ title: "New step", text: "" })}
            addLabel="Add step"
            renderItem={(item, update, remove) => (
              <div className="grid gap-2">
                <div className="flex items-center gap-1.5">
                  <input className="input h-8 flex-1 text-[13px]" placeholder="Step title" value={item.title} onChange={(e) => update({ title: e.target.value })} aria-label="Step title" />
                  <button className="btn-icon-sm" onClick={remove} aria-label="Remove step">
                    <span className="text-danger">✕</span>
                  </button>
                </div>
                <textarea className="textarea min-h-[60px] text-[13px]" placeholder="Description" value={item.text} onChange={(e) => update({ text: e.target.value })} aria-label="Step description" />
              </div>
            )}
          />
        </>
      )}

      {section.type === "testimonials" && (
        <>
          <StringField label="Title" value={c.title ?? ""} onChange={(title) => setContent({ title })} />
          <StringField label="Eyebrow" value={c.subtitle ?? ""} onChange={(subtitle) => setContent({ subtitle })} />
          <KeyValueField
            label="Testimonials"
            items={c.items ?? []}
            onChange={(items) => setContent({ items })}
            newItem={() => ({ name: "Client Name", role: "Customer", quote: "", rating: 5 })}
            addLabel="Add testimonial"
            renderItem={(item, update, remove) => (
              <div className="grid gap-2">
                <div className="grid grid-cols-2 gap-1.5">
                  <input className="input h-8 text-[13px]" placeholder="Name" value={item.name} onChange={(e) => update({ name: e.target.value })} aria-label="Client name" />
                  <input className="input h-8 text-[13px]" placeholder="Role" value={item.role} onChange={(e) => update({ role: e.target.value })} aria-label="Client role" />
                </div>
                <textarea className="textarea min-h-[64px] text-[13px]" placeholder="Quote" value={item.quote} onChange={(e) => update({ quote: e.target.value })} aria-label="Quote" />
                <div className="flex items-center justify-between">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        onClick={() => update({ rating: n })}
                        className={`text-base leading-none ${item.rating >= n ? "text-accent" : "text-ink-faint"}`}
                        aria-label={`${n} star${n > 1 ? "s" : ""}`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                  <button className="btn-icon-sm" onClick={remove} aria-label="Remove testimonial">
                    <span className="text-danger">✕</span>
                  </button>
                </div>
              </div>
            )}
          />
        </>
      )}

      {section.type === "faq" && (
        <>
          <StringField label="Title" value={c.title ?? ""} onChange={(title) => setContent({ title })} />
          <StringField label="Eyebrow" value={c.subtitle ?? ""} onChange={(subtitle) => setContent({ subtitle })} />
          <KeyValueField
            label="Questions"
            items={c.items ?? []}
            onChange={(items) => setContent({ items })}
            newItem={() => ({ q: "New question?", a: "" })}
            addLabel="Add question"
            renderItem={(item, update, remove) => (
              <div className="grid gap-2">
                <div className="flex items-center gap-1.5">
                  <input className="input h-8 flex-1 text-[13px]" placeholder="Question" value={item.q} onChange={(e) => update({ q: e.target.value })} aria-label="Question" />
                  <button className="btn-icon-sm" onClick={remove} aria-label="Remove question">
                    <span className="text-danger">✕</span>
                  </button>
                </div>
                <textarea className="textarea min-h-[60px] text-[13px]" placeholder="Answer" value={item.a} onChange={(e) => update({ a: e.target.value })} aria-label="Answer" />
              </div>
            )}
          />
        </>
      )}

      {section.type === "menu" && (
        <>
          <StringField label="Title" value={c.title ?? ""} onChange={(title) => setContent({ title })} />
          <StringField label="Eyebrow" value={c.subtitle ?? ""} onChange={(subtitle) => setContent({ subtitle })} />
          <KeyValueField<MenuCategoryLike>
            label="Categories"
            items={(c.categories ?? []) as MenuCategoryLike[]}
            onChange={(categories) => setContent({ categories })}
            newItem={() => ({ name: "New Category", items: [] })}
            addLabel="Add category"
            renderItem={(cat, updateCat, removeCat) => (
              <div className="grid gap-2">
                <div className="flex items-center gap-1.5">
                  <input className="input h-8 flex-1 text-[13px] font-medium" placeholder="Category name" value={cat.name} onChange={(e) => updateCat({ name: e.target.value })} aria-label="Category name" />
                  <button className="btn-icon-sm" onClick={removeCat} aria-label="Remove category">
                    <span className="text-danger">✕</span>
                  </button>
                </div>
                {(cat.items ?? []).map((mi: { name: string; description: string; price: string }, j: number) => (
                  <div key={j} className="grid grid-cols-[1fr_1fr_90px_auto] items-center gap-1.5">
                    <input className="input h-8 text-[13px]" placeholder="Item" value={mi.name} onChange={(e) => updateCat({ items: cat.items.map((x: typeof mi, k: number) => (k === j ? { ...x, name: e.target.value } : x)) })} aria-label="Menu item name" />
                    <input className="input h-8 text-[13px]" placeholder="Description" value={mi.description} onChange={(e) => updateCat({ items: cat.items.map((x: typeof mi, k: number) => (k === j ? { ...x, description: e.target.value } : x)) })} aria-label="Menu item description" />
                    <input className="input h-8 text-[13px]" placeholder="Price" value={mi.price} onChange={(e) => updateCat({ items: cat.items.map((x: typeof mi, k: number) => (k === j ? { ...x, price: e.target.value } : x)) })} aria-label="Menu item price" />
                    <button className="btn-icon-sm" onClick={() => updateCat({ items: cat.items.filter((_: typeof mi, k: number) => k !== j) })} aria-label="Remove menu item">
                      <span className="text-danger">✕</span>
                    </button>
                  </div>
                ))}
                <button
                  className="btn-ghost btn-sm w-fit text-xs"
                  onClick={() => updateCat({ items: [...(cat.items ?? []), { name: "New item", description: "", price: "" }] })}
                >
                  + Add dish
                </button>
              </div>
            )}
          />
        </>
      )}

      {section.type === "gallery" && (
        <>
          <StringField label="Title" value={c.title ?? ""} onChange={(title) => setContent({ title })} />
          <StringField label="Eyebrow" value={c.subtitle ?? ""} onChange={(subtitle) => setContent({ subtitle })} />
          <KeyValueField
            label="Images"
            items={c.images ?? []}
            onChange={(images) => setContent({ images })}
            newItem={() => ({ src: "", alt: "Photo" })}
            addLabel="Add image"
            renderItem={(item, update, remove) => (
              <div className="grid gap-2">
                <div className="flex items-start gap-2">
                  <div className="h-14 w-20 shrink-0 overflow-hidden rounded-md border border-line bg-surface-2">
                    {item.src && <img src={item.src} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <div className="grid flex-1 gap-1.5">
                    <input className="input h-8 text-[13px]" placeholder="Image URL or upload" value={item.src.startsWith("data:") ? "(uploaded)" : item.src} onChange={(e) => update({ src: e.target.value })} aria-label="Image URL" />
                    <input className="input h-8 text-[13px]" placeholder="Alt text" value={item.alt} onChange={(e) => update({ alt: e.target.value })} aria-label="Image alt" />
                  </div>
                  <button className="btn-icon-sm" onClick={remove} aria-label="Remove image">
                    <span className="text-danger">✕</span>
                  </button>
                </div>
              </div>
            )}
          />
        </>
      )}

      {section.type === "reservation" && (
        <>
          <StringField label="Title" value={c.title ?? ""} onChange={(title) => setContent({ title })} />
          <StringField label="Eyebrow" value={c.subtitle ?? ""} onChange={(subtitle) => setContent({ subtitle })} />
          <StringField label="Note" value={c.note ?? ""} onChange={(note) => setContent({ note })} area hint="Booking goes through WhatsApp / phone — set the number in the Brand panel." />
        </>
      )}

      {section.type === "location" && (
        <>
          <StringField label="Title" value={c.title ?? ""} onChange={(title) => setContent({ title })} />
          <StringField label="Eyebrow" value={c.subtitle ?? ""} onChange={(subtitle) => setContent({ subtitle })} />
          <StringListField label="Opening hours" items={c.hours ?? []} onChange={(hours) => setContent({ hours })} placeholder="Monday – Friday · 10:00 – 22:00" />
          <StringField label="Map search query" value={c.mapQuery ?? ""} onChange={(mapQuery) => setContent({ mapQuery })} placeholder="Mohandiseen, Giza, Egypt" hint="Used for the embedded Google Map." />
        </>
      )}

      {section.type === "team" && (
        <>
          <StringField label="Title" value={c.title ?? ""} onChange={(title) => setContent({ title })} />
          <StringField label="Eyebrow" value={c.subtitle ?? ""} onChange={(subtitle) => setContent({ subtitle })} />
          <KeyValueField
            label="Members"
            items={c.members ?? []}
            onChange={(members) => setContent({ members })}
            newItem={() => ({ name: "Team Member", role: "Role", image: "" })}
            addLabel="Add member"
            renderItem={(item, update, remove) => (
              <div className="grid grid-cols-[1fr_1fr_auto] items-center gap-1.5">
                <input className="input h-8 text-[13px]" placeholder="Name" value={item.name} onChange={(e) => update({ name: e.target.value })} aria-label="Member name" />
                <input className="input h-8 text-[13px]" placeholder="Role" value={item.role} onChange={(e) => update({ role: e.target.value })} aria-label="Member role" />
                <button className="btn-icon-sm" onClick={remove} aria-label="Remove member">
                  <span className="text-danger">✕</span>
                </button>
              </div>
            )}
          />
          <p className="text-xs text-ink-faint">Members without a photo get an elegant initials avatar.</p>
        </>
      )}

      {section.type === "caseStudies" && (
        <>
          <StringField label="Title" value={c.title ?? ""} onChange={(title) => setContent({ title })} />
          <StringField label="Eyebrow" value={c.subtitle ?? ""} onChange={(subtitle) => setContent({ subtitle })} />
          <KeyValueField
            label="Cases"
            items={c.items ?? []}
            onChange={(items) => setContent({ items })}
            newItem={() => ({ client: "Client", title: "Project", result: "+100% growth" })}
            addLabel="Add case"
            renderItem={(item, update, remove) => (
              <div className="grid gap-1.5">
                <div className="grid grid-cols-2 gap-1.5">
                  <input className="input h-8 text-[13px]" placeholder="Client" value={item.client} onChange={(e) => update({ client: e.target.value })} aria-label="Case client" />
                  <input className="input h-8 text-[13px]" placeholder="Title" value={item.title} onChange={(e) => update({ title: e.target.value })} aria-label="Case title" />
                </div>
                <div className="grid grid-cols-[1fr_auto] items-center gap-1.5">
                  <input className="input h-8 text-[13px]" placeholder="Result, e.g. +40% inquiries" value={item.result} onChange={(e) => update({ result: e.target.value })} aria-label="Case result" />
                  <button className="btn-icon-sm" onClick={remove} aria-label="Remove case">
                    <span className="text-danger">✕</span>
                  </button>
                </div>
              </div>
            )}
          />
        </>
      )}

      {section.type === "industries" && (
        <>
          <StringField label="Title" value={c.title ?? ""} onChange={(title) => setContent({ title })} />
          <StringField label="Eyebrow" value={c.subtitle ?? ""} onChange={(subtitle) => setContent({ subtitle })} />
          <StringListField label="Industries" items={c.items ?? []} onChange={(items) => setContent({ items })} placeholder="e.g. Retail" />
        </>
      )}

      {section.type === "projects" && (
        <>
          <StringField label="Title" value={c.title ?? ""} onChange={(title) => setContent({ title })} />
          <StringField label="Eyebrow" value={c.subtitle ?? ""} onChange={(subtitle) => setContent({ subtitle })} />
          <KeyValueField
            label="Projects"
            items={c.items ?? []}
            onChange={(items) => setContent({ items })}
            newItem={() => ({ title: "New Project", category: "Category", image: "" })}
            addLabel="Add project"
            renderItem={(item, update, remove) => (
              <div className="grid gap-1.5">
                <div className="grid grid-cols-[1fr_1fr_auto] items-center gap-1.5">
                  <input className="input h-8 text-[13px]" placeholder="Title" value={item.title} onChange={(e) => update({ title: e.target.value })} aria-label="Project title" />
                  <input className="input h-8 text-[13px]" placeholder="Category" value={item.category} onChange={(e) => update({ category: e.target.value })} aria-label="Project category" />
                  <button className="btn-icon-sm" onClick={remove} aria-label="Remove project">
                    <span className="text-danger">✕</span>
                  </button>
                </div>
                <input className="input h-8 text-[13px]" placeholder="Image URL" value={item.image.startsWith("data:") ? "(uploaded)" : item.image} onChange={(e) => update({ image: e.target.value })} aria-label="Project image" />
              </div>
            )}
          />
        </>
      )}

      {section.type === "skills" && (
        <>
          <StringField label="Title" value={c.title ?? ""} onChange={(title) => setContent({ title })} />
          <StringField label="Eyebrow" value={c.subtitle ?? ""} onChange={(subtitle) => setContent({ subtitle })} />
          <KeyValueField
            label="Skills"
            items={c.items ?? []}
            onChange={(items) => setContent({ items })}
            newItem={() => ({ name: "Skill", level: 80 })}
            addLabel="Add skill"
            renderItem={(item, update, remove) => (
              <div className="grid grid-cols-[1fr_auto] items-center gap-2">
                <input className="input h-8 text-[13px]" placeholder="Skill name" value={item.name} onChange={(e) => update({ name: e.target.value })} aria-label="Skill name" />
                <div className="flex items-center gap-2">
                  <input type="range" min={0} max={100} value={item.level} onChange={(e) => update({ level: Number(e.target.value) })} className="h-1.5 w-20 cursor-pointer appearance-none rounded-full bg-surface-3 accent-[var(--ks-brand)]" aria-label="Skill level" />
                  <span className="w-8 text-right text-xs font-semibold text-ink">{item.level}</span>
                  <button className="btn-icon-sm" onClick={remove} aria-label="Remove skill">
                    <span className="text-danger">✕</span>
                  </button>
                </div>
              </div>
            )}
          />
        </>
      )}

      {section.type === "experience" && (
        <>
          <StringField label="Title" value={c.title ?? ""} onChange={(title) => setContent({ title })} />
          <StringField label="Eyebrow" value={c.subtitle ?? ""} onChange={(subtitle) => setContent({ subtitle })} />
          <KeyValueField
            label="Experience"
            items={c.items ?? []}
            onChange={(items) => setContent({ items })}
            newItem={() => ({ role: "Role", company: "Company", period: "2024 — Present", text: "" })}
            addLabel="Add position"
            renderItem={(item, update, remove) => (
              <div className="grid gap-1.5">
                <div className="grid grid-cols-2 gap-1.5">
                  <input className="input h-8 text-[13px]" placeholder="Role" value={item.role} onChange={(e) => update({ role: e.target.value })} aria-label="Role" />
                  <input className="input h-8 text-[13px]" placeholder="Company" value={item.company} onChange={(e) => update({ company: e.target.value })} aria-label="Company" />
                </div>
                <div className="grid grid-cols-[1fr_auto] items-center gap-1.5">
                  <input className="input h-8 text-[13px]" placeholder="Period" value={item.period} onChange={(e) => update({ period: e.target.value })} aria-label="Period" />
                  <button className="btn-icon-sm" onClick={remove} aria-label="Remove position">
                    <span className="text-danger">✕</span>
                  </button>
                </div>
                <textarea className="textarea min-h-[56px] text-[13px]" placeholder="Summary" value={item.text} onChange={(e) => update({ text: e.target.value })} aria-label="Position summary" />
              </div>
            )}
          />
        </>
      )}

      {section.type === "clients" && (
        <>
          <StringField label="Title" value={c.title ?? ""} onChange={(title) => setContent({ title })} />
          <StringField label="Eyebrow" value={c.subtitle ?? ""} onChange={(subtitle) => setContent({ subtitle })} />
          <StringListField label="Client names" items={c.logos ?? []} onChange={(logos) => setContent({ logos })} placeholder="Client name" />
        </>
      )}

      {section.type === "cta" && (
        <>
          <StringField label="Title" value={c.title ?? ""} onChange={(title) => setContent({ title })} />
          <StringField label="Text" value={c.text ?? ""} onChange={(text) => setContent({ text })} area />
          <CTAFields label="Primary button" cta={c.primaryCTA ?? { label: "", href: "#", variant: "primary" }} onChange={(primaryCTA) => setContent({ primaryCTA })} />
          <CTAFields label="Secondary button" cta={c.secondaryCTA ?? { label: "", href: "#", variant: "secondary" }} onChange={(secondaryCTA) => setContent({ secondaryCTA })} />
        </>
      )}

      {section.type === "contact" && (
        <>
          <StringField label="Title" value={c.title ?? ""} onChange={(title) => setContent({ title })} />
          <StringField label="Eyebrow" value={c.subtitle ?? ""} onChange={(subtitle) => setContent({ subtitle })} />
          <div className="rounded-lg border border-line bg-surface-0/40 p-3">
            <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-ink-faint">Contact details</p>
            <div className="grid gap-2.5">
              <StringField label="Email" value={c.info?.email ?? ""} onChange={(email) => setContent({ info: { ...c.info, email } })} />
              <div className="grid grid-cols-2 gap-2.5">
                <StringField label="Phone" value={c.info?.phone ?? ""} onChange={(phone) => setContent({ info: { ...c.info, phone } })} />
                <StringField label="WhatsApp" value={c.info?.whatsapp ?? ""} onChange={(whatsapp) => setContent({ info: { ...c.info, whatsapp } })} />
              </div>
              <StringField label="Address" value={c.info?.address ?? ""} onChange={(address) => setContent({ info: { ...c.info, address } })} />
              <StringListField label="Hours" items={c.info?.hours ?? []} onChange={(hours) => setContent({ info: { ...c.info, hours } })} placeholder="Every day · 09:00 – 21:00" />
            </div>
          </div>
        </>
      )}

      {section.type === "newsletter" && (
        <>
          <StringField label="Title" value={c.title ?? ""} onChange={(title) => setContent({ title })} />
          <StringField label="Subtitle" value={c.subtitle ?? ""} onChange={(subtitle) => setContent({ subtitle })} />
        </>
      )}

      {section.type === "whatsapp" && (
        <>
          <StringField label="Button label" value={c.cta?.label ?? ""} onChange={(label) => setContent({ cta: { ...(c.cta ?? { href: "", variant: "primary" as const }), label } })} />
          <StringField label="WhatsApp number" value={c.number ?? ""} onChange={(number) => setContent({ number })} hint="Falls back to the brand WhatsApp number." />
          <div>
            <p className="label">Position</p>
            <div className="seg">
              {(["right", "left"] as const).map((pos) => (
                <button key={pos} className={c.position === pos ? "seg-item-active" : "seg-item"} onClick={() => setContent({ position: pos })}>
                  {pos === "right" ? "Bottom right" : "Bottom left"}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {section.type === "footer" && (
        <>
          <StringField label="Copyright text" value={c.text ?? ""} onChange={(text) => setContent({ text })} />
          <KeyValueField<FooterColumnLike>
            label="Link columns"
            items={(c.columns ?? []) as FooterColumnLike[]}
            onChange={(columns) => setContent({ columns })}
            newItem={() => ({ title: "Column", links: [] })}
            addLabel="Add column"
            renderItem={(col, updateCol, removeCol) => (
              <div className="grid gap-2">
                <div className="flex items-center gap-1.5">
                  <input className="input h-8 flex-1 text-[13px]" placeholder="Column title" value={col.title} onChange={(e) => updateCol({ title: e.target.value })} aria-label="Column title" />
                  <button className="btn-icon-sm" onClick={removeCol} aria-label="Remove column">
                    <span className="text-danger">✕</span>
                  </button>
                </div>
                {(col.links ?? []).map((l: { label: string; href: string }, j: number) => (
                  <div key={j} className="grid grid-cols-[1fr_1fr_auto] items-center gap-1.5">
                    <input className="input h-8 text-[13px]" placeholder="Label" value={l.label} onChange={(e) => updateCol({ links: col.links.map((x: typeof l, k: number) => (k === j ? { ...x, label: e.target.value } : x)) })} aria-label="Link label" />
                    <input className="input h-8 text-[13px]" placeholder="#href" value={l.href} onChange={(e) => updateCol({ links: col.links.map((x: typeof l, k: number) => (k === j ? { ...x, href: e.target.value } : x)) })} aria-label="Link href" />
                    <button className="btn-icon-sm" onClick={() => updateCol({ links: col.links.filter((_: typeof l, k: number) => k !== j) })} aria-label="Remove link">
                      <span className="text-danger">✕</span>
                    </button>
                  </div>
                ))}
                <button className="btn-ghost btn-sm w-fit text-xs" onClick={() => updateCol({ links: [...(col.links ?? []), { label: "Link", href: "#" }] })}>
                  + Add link
                </button>
              </div>
            )}
          />
        </>
      )}
    </div>
  );
}
