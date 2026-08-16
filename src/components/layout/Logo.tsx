import { cn } from "@/utils/helpers";
import katchLogo from "@/assets/brand/katch-logo.png";
import katchMark from "@/assets/brand/katch-mark.png";

/* ============================================================
   Katch brand — the official uploaded logo, used as-is on a
   white tile so it keeps its integrity on the dark-first UI.
   Never redrawn, recolored or distorted.
   ============================================================ */

export function LogoMark({ size = 30, className }: { size?: number; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[22%] bg-white shadow-sm ring-1 ring-black/10",
        className
      )}
      style={{ width: size, height: size }}
    >
      <img src={katchMark} alt="" className="h-full w-full object-contain" draggable={false} />
    </span>
  );
}

export function Logo({ compact = false, size = 32, className }: { compact?: boolean; size?: number; className?: string }) {
  if (compact) return <LogoMark size={size} className={className} />;
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark size={size} />
      <span className="flex flex-col leading-none">
        <span className="font-display text-[15px] font-bold tracking-tight text-ink">Katch Studio</span>
        <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-faint">
          Website Production
        </span>
      </span>
    </span>
  );
}

/** The complete uploaded logo (mark + wordmark) on a white tile — for hero moments. */
export function LogoFull({ size = 64, className }: { size?: number; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-soft ring-1 ring-black/10",
        className
      )}
      style={{ width: size, height: size }}
    >
      <img src={katchLogo} alt="" className="h-full w-full object-contain" draggable={false} />
    </span>
  );
}
