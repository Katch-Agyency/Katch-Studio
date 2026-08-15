import { createContext, useContext } from "react";
import type { DeviceMode, EditorTab } from "@/types";

/* ============================================================
   Editor UI context — which page/section is selected, device
   mode, active tab. Lives inside the Editor page only.
   ============================================================ */

export interface EditorUIState {
  activePageId: string;
  setActivePageId: (id: string) => void;
  selectedSectionId: string | null;
  setSelectedSectionId: (id: string | null) => void;
  device: DeviceMode;
  setDevice: (d: DeviceMode) => void;
  tab: EditorTab;
  setTab: (t: EditorTab) => void;
  mobileView: "edit" | "preview";
  setMobileView: (v: "edit" | "preview") => void;
}

export const EditorUIContext = createContext<EditorUIState | null>(null);

export function useEditorUI(): EditorUIState {
  const ctx = useContext(EditorUIContext);
  if (!ctx) throw new Error("useEditorUI outside provider");
  return ctx;
}
