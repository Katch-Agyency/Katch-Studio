import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Field, ImagePicker, Select, Segmented, TextArea, TextInput } from "@/components/ui/Fields";
import { Button } from "@/components/ui/ui";
import type { CTA } from "@/types";

/* ============================================================
   Content field editors — small typed inputs reused across the
   content panel. Values come from the project draft; onChange
   mutates it (immutably via the editor store).
   ============================================================ */

export function StringField({
  label,
  value,
  onChange,
  area,
  hint,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  area?: boolean;
  hint?: string;
  placeholder?: string;
}) {
  return (
    <Field label={label} hint={hint}>
      {area ? (
        <TextArea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      ) : (
        <TextInput value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      )}
    </Field>
  );
}

export function CTAFields({
  label,
  cta,
  onChange,
}: {
  label: string;
  cta: CTA;
  onChange: (cta: CTA) => void;
}) {
  return (
    <div className="rounded-lg border border-line bg-surface-0/40 p-3">
      <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-ink-faint">{label}</p>
      <div className="grid gap-2.5 sm:grid-cols-2">
        <TextInput
          placeholder="Button label"
          value={cta.label}
          onChange={(e) => onChange({ ...cta, label: e.target.value })}
          aria-label={`${label} label`}
        />
        <TextInput
          placeholder="Link (#contact or URL)"
          value={cta.href}
          onChange={(e) => onChange({ ...cta, href: e.target.value })}
          aria-label={`${label} link`}
        />
      </div>
      <div className="mt-2.5">
        <Segmented
          ariaLabel={`${label} style`}
          value={cta.variant}
          onChange={(v) => onChange({ ...cta, variant: v })}
          options={[
            { value: "primary", label: "Primary" },
            { value: "secondary", label: "Secondary" },
          ]}
        />
      </div>
    </div>
  );
}

export function StringListField({
  label,
  items,
  onChange,
  placeholder,
  addLabel = "Add item",
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  addLabel?: string;
}) {
  return (
    <div>
      <p className="label">{label}</p>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <TextInput
              value={item}
              placeholder={placeholder}
              onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))}
              aria-label={`${label} ${i + 1}`}
            />
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              aria-label={`Remove item ${i + 1}`}
            >
              <Trash2 className="h-3.5 w-3.5 text-danger" />
            </Button>
          </div>
        ))}
      </div>
      <Button variant="secondary" size="sm" className="mt-2" onClick={() => onChange([...items, ""])}>
        <Plus className="h-3.5 w-3.5" /> {addLabel}
      </Button>
    </div>
  );
}

export function KeyValueField<T>({
  label,
  items,
  onChange,
  renderItem,
  addLabel = "Add item",
  newItem,
}: {
  label: string;
  items: T[];
  onChange: (items: T[]) => void;
  renderItem: (item: T, update: (patch: Partial<T>) => void, remove: () => void) => React.ReactNode;
  addLabel?: string;
  newItem: () => T;
}) {
  return (
    <div>
      <p className="label">{label}</p>
      <div className="space-y-2.5">
        {items.map((item, i) => (
          <div key={i} className="rounded-lg border border-line bg-surface-0/40 p-3">
            {renderItem(
              item,
              (patch) => onChange(items.map((x, j) => (j === i ? { ...x, ...patch } : x))),
              () => onChange(items.filter((_, j) => j !== i))
            )}
          </div>
        ))}
      </div>
      <Button variant="secondary" size="sm" className="mt-2" onClick={() => onChange([...items, newItem()])}>
        <Plus className="h-3.5 w-3.5" /> {addLabel}
      </Button>
    </div>
  );
}

export function ImageField({
  label,
  value,
  alt,
  onChange,
  onAltChange,
  hint,
}: {
  label: string;
  value: string;
  alt: string;
  onChange: (v: string) => void;
  onAltChange: (v: string) => void;
  hint?: string;
}) {
  return (
    <div className="space-y-2.5">
      <ImagePicker value={value} onChange={onChange} label={label} />
      <TextInput value={alt} onChange={(e) => onAltChange(e.target.value)} placeholder="Image alt text (accessibility)" aria-label={`${label} alt text`} />
      {hint && <p className="text-xs text-ink-faint">{hint}</p>}
    </div>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-surface-3 accent-[var(--ks-brand)]"
          aria-label={label}
        />
        <span className="w-10 text-right text-sm font-semibold text-ink">{value}</span>
      </div>
    </Field>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <Field label={label}>
      <Select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
    </Field>
  );
}
