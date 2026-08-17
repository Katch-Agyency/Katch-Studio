import type { DeploymentConfig, Project } from "@/types";
import { pageHashes } from "./fingerprint";

/* ============================================================
   Commit messages — generated from the project action so the
   GitHub history reads like a human wrote it:

     first deploy  → "Initial Katch Studio deployment"
     home changed  → "Update Looky Cakes homepage"
     other content → "Update website content"
   ============================================================ */

export function describeCommit(project: Project, deployment?: DeploymentConfig): string {
  if (!deployment?.lastCommitId || !deployment.lastContentHash) {
    return "Initial Katch Studio deployment";
  }
  const home = project.config.pages[0];
  if (home && deployment.lastPageHashes?.[home.id] !== pageHashes(project)[home.id]) {
    return `Update ${home.name || "Home"} homepage`;
  }
  return "Update website content";
}
