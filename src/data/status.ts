import type { EmployeeStatus, LeadStatus, ProjectStatus, StatusMeta } from "@/types";

/* ============================================================
   Status metadata — single place where statuses get their look
   ============================================================ */

export const STATUS_META: Record<ProjectStatus, StatusMeta> = {
  draft: {
    label: "Draft",
    dot: "bg-zinc-400",
    chip: "bg-zinc-500/10 text-zinc-300 border-zinc-500/20",
  },
  in_progress: {
    label: "In Progress",
    dot: "bg-sky-400",
    chip: "bg-sky-500/10 text-sky-300 border-sky-500/20",
  },
  review: {
    label: "Review",
    dot: "bg-amber-400",
    chip: "bg-amber-500/10 text-amber-300 border-amber-500/20",
  },
  ready: {
    label: "Ready",
    dot: "bg-emerald-400",
    chip: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
  },
  delivered: {
    label: "Delivered",
    dot: "bg-violet-400",
    chip: "bg-violet-500/10 text-violet-300 border-violet-500/20",
  },
};

export const CATEGORY_ICONS: Record<string, string> = {
  restaurant: "utensils-crossed",
  business: "briefcase",
  landing: "rocket",
  portfolio: "palette",
  ecommerce: "shopping-bag",
  saas: "layers",
};

/* ---------- Employee (profile) status ---------- */

export const EMPLOYEE_STATUS_META: Record<EmployeeStatus, StatusMeta> = {
  active: {
    label: "Active",
    dot: "bg-emerald-400",
    chip: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/25",
  },
  inactive: {
    label: "Inactive",
    dot: "bg-zinc-400",
    chip: "bg-zinc-500/10 text-zinc-500 dark:text-zinc-300 border-zinc-500/25",
  },
};

/* ---------- Lead status ---------- */

export const LEAD_STATUS_META: Record<LeadStatus, StatusMeta> = {
  new: {
    label: "New",
    dot: "bg-sky-400",
    chip: "bg-sky-500/10 text-sky-600 dark:text-sky-300 border-sky-500/25",
  },
  contacted: {
    label: "Contacted",
    dot: "bg-amber-400",
    chip: "bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/25",
  },
  qualified: {
    label: "Qualified",
    dot: "bg-violet-400",
    chip: "bg-violet-500/10 text-violet-600 dark:text-violet-300 border-violet-500/25",
  },
  won: {
    label: "Won",
    dot: "bg-emerald-400",
    chip: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/25",
  },
  lost: {
    label: "Lost",
    dot: "bg-rose-400",
    chip: "bg-rose-500/10 text-rose-600 dark:text-rose-300 border-rose-500/25",
  },
};
