import React from "react";
import { cn } from "@/utils/helpers";
import { Button } from "./ui";

/* ============================================================
   Empty state — every empty state should be useful
   ============================================================ */

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void; icon?: React.ReactNode };
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-14 text-center", className)}>
      {icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-brand-ring bg-brand-muted text-brand-hover">
          {icon}
        </div>
      )}
      <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
      <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-ink-muted">{description}</p>
      {action && (
        <Button variant="primary" size="md" className="mt-5" onClick={action.onClick}>
          {action.icon}
          {action.label}
        </Button>
      )}
    </div>
  );
}

/* ---------- Status badge with dot ---------- */

export function StatusBadge({ status }: { status: string }) {
  const META: Record<string, { label: string; dot: string; chip: string }> = {
    draft: { label: "Draft", dot: "bg-zinc-400", chip: "bg-zinc-500/10 text-zinc-300 border-zinc-500/25" },
    in_progress: { label: "In Progress", dot: "bg-sky-400", chip: "bg-sky-500/10 text-sky-300 border-sky-500/25" },
    review: { label: "Review", dot: "bg-amber-400", chip: "bg-amber-500/10 text-amber-300 border-amber-500/25" },
    ready: { label: "Ready", dot: "bg-emerald-400", chip: "bg-emerald-500/10 text-emerald-300 border-emerald-500/25" },
    delivered: { label: "Delivered", dot: "bg-violet-400", chip: "bg-violet-500/10 text-violet-300 border-violet-500/25" },
  };
  const m = META[status] ?? META.draft!;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium", m.chip)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", m.dot)} aria-hidden />
      {m.label}
    </span>
  );
}
