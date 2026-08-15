import { cn } from "@/utils/helpers";

/* ============================================================
   Katch wordmark — the "K" checkmark mark + wordmark
   ============================================================ */

export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <rect width="32" height="32" rx="8.5" fill="var(--ks-brand)" />
      <path
        d="M9 13.2 15.8 20 23 12.8"
        stroke="#071012"
        strokeWidth="3.4"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({ compact = false, className }: { compact?: boolean; className?: string }) {
  if (compact) return <LogoMark size={30} className={className} />;
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark size={30} />
      <span className="flex flex-col leading-none">
        <span className="font-display text-[15px] font-bold tracking-tight text-ink">Katch Studio</span>
        <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-faint">
          Website Production
        </span>
      </span>
    </span>
  );
}
