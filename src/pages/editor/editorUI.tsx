import { createContext, useContext } from "react";
import type { DeviceMode } from "@/types";

/* ============================================================
   Editor UI context — which page/section/element is selected,
   device mode, edit/preview mode, active tabs. Lives inside the
   Editor page only.
   ============================================================ */

export type EditorMode = "edit" | "preview";

export type InspectorTab = "design" | "content" | "brand" | "features" | "seo" | "deploy";

export interface EditorUIState {
  activePageId: string;
  setActivePageId: (id: string) => void;
  selectedSectionId: string | null;
  setSelectedSectionId: (id: string | null) => void;
  /** Content-editor anchor to highlight (from the layers tree) */
  focusedElement: string | null;
  setFocusedElement: (anchor: string | null) => void;
  device: DeviceMode;
  setDevice: (d: DeviceMode) => void;
  tab: InspectorTab;
  setTab: (t: InspectorTab) => void;
  mode: EditorMode;
  setMode: (m: EditorMode) => void;
  mobileView: "edit" | "preview";
  setMobileView: (v: "edit" | "preview") => void;
}

export const EditorUIContext = createContext<EditorUIState | null>(null);

export function useEditorUI(): EditorUIState {
  const ctx = useContext(EditorUIContext);
  if (!ctx) throw new Error("useEditorUI outside provider");
  return ctx;
}
