import { useState } from "react";
import { useParams } from "react-router-dom";
import { ArrowLeft, Monitor, Smartphone, Tablet } from "lucide-react";
import WebsiteRenderer from "@/website/WebsiteRenderer";
import { useStore } from "@/app/store";
import { Button } from "@/components/ui/ui";
import type { DeviceMode } from "@/types";

/* ============================================================
   Full-screen preview — the real rendered website in a clean
   window with device controls. Useful for client reviews
   before the export phase.
   ============================================================ */

const DEVICES: { id: DeviceMode; label: string; icon: React.ComponentType<{ className?: string }>; width?: number }[] = [
  { id: "desktop", label: "Desktop", icon: Monitor },
  { id: "tablet", label: "Tablet", icon: Tablet, width: 768 },
  { id: "mobile", label: "Mobile", icon: Smartphone, width: 390 },
];

export default function PreviewPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { getProject, drafts } = useStore();
  const [device, setDevice] = useState<DeviceMode>("desktop");

  const project = (projectId && (getProject(projectId) ?? drafts[projectId])) || null;

  if (!project) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-[15px] font-semibold text-ink">Project not found.</p>
        <Button variant="secondary" onClick={() => window.history.back()}>
          <ArrowLeft className="h-4 w-4" /> Go back
        </Button>
      </div>
    );
  }

  const width = device === "desktop" ? undefined : DEVICES.find((d) => d.id === device)?.width;

  return (
    <div className="flex min-h-screen flex-col bg-surface-0">
      <div className="sticky top-0 z-50 flex items-center gap-2 border-b border-line bg-surface-1/85 px-4 py-2.5 backdrop-blur">
        <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Editor
        </Button>
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">
          Preview · {project.config.projectInfo.name}
        </span>
        <div className="seg" role="tablist" aria-label="Preview device">
          {DEVICES.map((d) => (
            <button
              key={d.id}
              role="tab"
              aria-selected={device === d.id}
              className={device === d.id ? "seg-item-active" : "seg-item"}
              onClick={() => setDevice(d.id)}
              title={d.label}
            >
              <d.icon className="h-3.5 w-3.5" />
            </button>
          ))}
        </div>
        <span className="hidden rounded-md border border-line-strong bg-surface-2 px-2 py-0.5 text-[11px] text-ink-faint sm:block">
          {project.config.projectInfo.language === "ar" ? "RTL" : "LTR"} ·{" "}
          {project.config.projectInfo.category}
        </span>
      </div>
      <div className="min-h-0 flex-1">
        <div
          className="mx-auto min-h-full bg-white transition-all duration-300 md:my-4 md:rounded-lg md:border md:border-line md:shadow-pop"
          style={{ maxWidth: width }}
        >
          <WebsiteRenderer project={project.config} />
        </div>
      </div>
    </div>
  );
}
