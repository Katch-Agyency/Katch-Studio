export * from "./theme";
export * from "./sections";
export * from "./project";
export * from "./storage";
export * from "./crm";

/** Utility types */
export type ToastKind = "success" | "error" | "info";
export interface Toast {
  id: string;
  kind: ToastKind;
  message: string;
}

export type DeviceMode = "desktop" | "tablet" | "mobile";
export type EditorTab = "pages" | "sections" | "content" | "brand" | "features" | "seo";

export const PROJECT_STATUSES = ["draft", "in_progress", "review", "ready", "delivered"] as const;

export interface StatusMeta {
  label: string;
  dot: string;
  chip: string;
}
