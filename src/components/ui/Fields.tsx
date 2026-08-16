import React from "react";
import { ChevronDown, ImagePlus, Upload, X } from "lucide-react";
import { cn } from "@/utils/helpers";
import { Button } from "./ui";

/* ============================================================
   Form controls — Label, TextInput, TextArea, Select, Color,
   Segmented, Toggle, ImagePicker
   ============================================================ */

export function Field({
  label,
  hint,
  children,
  className,
  id,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <label htmlFor={id} className="label">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-ink-faint">{hint}</p>}
    </div>
  );
}

export const TextInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn("input", className)} {...props} />
));
TextInput.displayName = "TextInput";

export const TextArea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn("textarea", className)} {...props} />
));
TextArea.displayName = "TextArea";

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        className={cn("input appearance-none pr-8", className)}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint"
        aria-hidden
      />
    </div>
  );
}

export function ColorInput({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="relative h-9 w-9 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-line-strong" style={{ backgroundColor: value }}>
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          aria-label={`${label} color`}
        />
      </label>
      <TextInput
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="font-mono text-xs uppercase"
        aria-label={`${label} color hex value`}
      />
    </div>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: {
  options: { value: T; label: React.ReactNode; title?: string }[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <div className={cn("seg", className)} role="tablist" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          title={o.title}
          className={value === o.value ? "seg-item-active" : "seg-item"}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-[22px] w-10 shrink-0 rounded-full border transition-colors duration-200 disabled:opacity-40",
        checked ? "border-transparent bg-brand" : "border-line-strong bg-surface-3"
      )}
    >
      <span
        className={cn(
          "absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full shadow transition-all duration-200",
          checked ? "left-[22px] bg-katch-ink" : "left-[3px] bg-white"
        )}
      />
    </button>
  );
}

/* ---------- Image picker (asset-lite: URL / upload / gallery) ---------- */

const MAX_UPLOAD_BYTES = 2.5 * 1024 * 1024;
const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.82;

/** Downscale + recompress uploads on a canvas so project configs stay small
 *  (localStorage quota and Firestore's 1 MiB/document limit). */
function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas unavailable");
        ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL("image/jpeg", JPEG_QUALITY));
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read the image"));
    };
    img.src = url;
  });
}

export function ImagePicker({
  value,
  onChange,
  label,
  ratio = "aspect-[16/10]",
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  ratio?: string;
}) {
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [error, setError] = React.useState("");

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setError("");
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError("Image is larger than 2.5 MB — please pick a smaller file.");
      return;
    }
    try {
      const dataUrl = await compressImage(file);
      onChange(dataUrl);
    } catch {
      setError("Could not process that image — try a JPG or PNG.");
    }
  };

  return (
    <div>
      <span className="label">{label}</span>
      <div className="flex gap-3">
        <div className={cn("relative w-28 shrink-0 overflow-hidden rounded-lg border border-line-strong bg-surface-2", ratio === "aspect-[16/10]" ? "aspect-[16/10]" : ratio)}>
          {value ? (
            <img src={value} alt="" className="h-full w-full object-cover" onError={() => setError("This image could not be loaded.")} />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-ink-faint">
              <ImagePlus className="h-5 w-5" aria-hidden />
            </div>
          )}
          {value && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="absolute right-1 top-1 rounded-md bg-black/60 p-1 text-white hover:bg-black/80"
              aria-label="Remove image"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
            <Upload className="h-3.5 w-3.5" /> Upload
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onFile}
            aria-label={`Upload ${label.toLowerCase()}`}
          />
          <TextInput
            value={value.startsWith("data:") ? "(uploaded image)" : value}
            placeholder="…or paste an image URL"
            onChange={(e) => onChange(e.target.value)}
            className="h-8 text-xs"
          />
          <p className="text-[11px] leading-4 text-ink-faint">
            Uploads are auto-optimized (≤1600px, JPEG). Assets stay in the project config — ready to move to
            Firebase Storage or Cloudinary later.
          </p>
          {error && <p className="text-[11px] text-danger">{error}</p>}
        </div>
      </div>
    </div>
  );
}
