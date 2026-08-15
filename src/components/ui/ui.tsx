import React from "react";
import { cn } from "@/utils/helpers";

/* ============================================================
   UI kit — Button, Badge, Kbd, Avatar
   ============================================================ */

type BtnVariant = "primary" | "secondary" | "ghost" | "danger" | "dark-brand";
type BtnSize = "sm" | "md" | "lg" | "icon" | "icon-sm";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant;
  size?: BtnSize;
}

const VARIANT: Record<BtnVariant, string> = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  ghost: "btn-ghost",
  danger: "btn-danger",
  "dark-brand": "btn-dark-brand",
};

const SIZE: Record<BtnSize, string> = {
  sm: "btn-sm",
  md: "btn-md",
  lg: "btn-lg",
  icon: "btn-icon",
  "icon-sm": "btn-icon-sm",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "secondary", size = "md", className, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(VARIANT[variant], SIZE[size], className)}
      {...props}
    />
  )
);
Button.displayName = "Button";

export function Badge({
  children,
  className,
  tone = "neutral",
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "neutral" | "brand" | "accent" | "danger" | "info";
}) {
  const tones: Record<string, string> = {
    neutral: "border-line-strong bg-surface-2 text-ink-muted",
    brand: "border-brand/30 bg-brand-muted text-brand-hover",
    accent: "border-accent/30 bg-accent-muted text-accent",
    danger: "border-danger/30 bg-danger-muted text-danger",
    info: "border-info/30 bg-info/10 text-info",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium leading-4",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="kbd">{children}</kbd>;
}

const AVATAR_PALETTES = [
  "from-emerald-400 to-teal-600",
  "from-amber-400 to-orange-600",
  "from-sky-400 to-indigo-600",
  "from-rose-400 to-pink-600",
  "from-violet-400 to-purple-600",
  "from-lime-400 to-green-600",
];

export function Avatar({
  name,
  size = 32,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
  const hash = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const palette = AVATAR_PALETTES[hash % AVATAR_PALETTES.length]!;
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-full bg-gradient-to-br font-semibold text-white",
        palette,
        className
      )}
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.36) }}
    >
      {initials}
    </span>
  );
}
