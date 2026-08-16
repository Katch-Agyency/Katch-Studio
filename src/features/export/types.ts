import type { Project } from "@/types";

export type ExportPhase =
  | "idle"
  | "validating"
  | "pages"
  | "sections"
  | "assets"
  | "source"
  | "zip"
  | "ready"
  | "error";

export interface ExportProgress {
  phase: ExportPhase;
  label: string;
  completed: number;
  total: number;
}

export interface ExportOptions {
  includeAssets: boolean;
  includeReadme: boolean;
}

export type GeneratedFileContent = string | Uint8Array;

export interface GeneratedProject {
  rootName: string;
  archiveName: string;
  files: Map<string, GeneratedFileContent>;
  warnings: string[];
  project: Project;
}

export interface ExportResult {
  archiveName: string;
  blob: Blob;
  warnings: string[];
  fileCount: number;
}

export type ProgressCallback = (progress: ExportProgress) => void;
