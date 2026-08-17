import { Badge } from "@/components/ui/ui";
import type { Project } from "@/types";

/* ============================================================
   DeployBadge — compact deployment status pill for project
   lists. Absent until a deployment exists; "Live" once the
   production URL is up.
   ============================================================ */

const META = {
  preparing: { label: "Preparing", tone: "info" as const },
  generating: { label: "Generating", tone: "info" as const },
  github: { label: "GitHub", tone: "info" as const },
  building: { label: "Building", tone: "accent" as const },
  deploying: { label: "Deploying", tone: "accent" as const },
  live: { label: "Live", tone: "brand" as const },
  failed: { label: "Deploy failed", tone: "danger" as const },
};

export default function DeployBadge({ project }: { project: Project }) {
  const d = project.deployment;
  if (!d || d.status === "not-deployed") return null;
  const meta = META[d.status];
  return (
    <Badge tone={meta.tone} className="shrink-0">
      {meta.label}
    </Badge>
  );
}
