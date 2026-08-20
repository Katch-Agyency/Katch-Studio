import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Check,
  Copy,
  ExternalLink,
  FileDown,
  FileJson,
  GitBranch,
  Link2,
  Rocket,
  TerminalSquare,
} from "lucide-react";
import { useEditor } from "./editorStore";
import { Modal } from "@/components/ui/Modal";
import { Badge, Button } from "@/components/ui/ui";
import { useToast } from "@/app/toast";
import { projectForClientBranch } from "@/data/demoImages";
import { downloadFile } from "@/utils/helpers";

export default function ExportModal({
  open,
  onClose,
  onOpenDeployment,
}: {
  open: boolean;
  onClose: () => void;
  onOpenDeployment?: () => void;
}) {
  const { project } = useEditor();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"export" | "deploy">("export");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState<"config" | "link" | null>(null);

  const branchProject = useMemo(() => projectForClientBranch(project), [project]);
  const branchJson = useMemo(() => JSON.stringify(branchProject, null, 2), [branchProject]);

  const downloadProject = () => {
    downloadFile("project.json", branchJson);
    toast("success", "project.json downloaded — add it to public/project.json on the client branch.");
  };

  const copyProject = async () => {
    try {
      await navigator.clipboard.writeText(branchJson);
      setCopied("config");
      window.setTimeout(() => setCopied(null), 1800);
      toast("success", "Project JSON copied.");
    } catch {
      toast("error", "Could not copy the JSON — download project.json instead.");
    }
  };

  const buildShareLink = () => setShareUrl(`${window.location.origin}/preview/${project.id}`);

  const copyShareLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied("link");
      window.setTimeout(() => setCopied(null), 1800);
      toast("success", "Review link copied.");
    } catch {
      toast("error", "Could not copy — select the link and copy it manually.");
    }
  };

  const openFullPreview = () => {
    navigate(`/preview/${project.id}`);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Export Project" description="Move this project into a dedicated client branch or share its current preview." size="lg">
      <div className="seg mb-5">
        <button className={tab === "export" ? "seg-item-active" : "seg-item"} onClick={() => setTab("export")} role="tab" aria-selected={tab === "export"}>Client Branch</button>
        <button className={tab === "deploy" ? "seg-item-active" : "seg-item"} onClick={() => setTab("deploy")} role="tab" aria-selected={tab === "deploy"}>Deployment</button>
      </div>

      {tab === "export" && (
        <div className="space-y-3">
          <ExportRow icon={<FileJson className="h-4 w-4" />} title="Client branch configuration" desc="The complete current project—pages, ordered sections, content, theme, features and language—in the exact format client mode reads." action={<div className="flex flex-wrap gap-2"><Button size="sm" variant="primary" onClick={downloadProject}><FileDown className="h-3.5 w-3.5" /> Download project.json</Button><Button size="sm" onClick={() => void copyProject()}>{copied === "config" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}{copied === "config" ? "Copied" : "Copy JSON"}</Button></div>} />
          <div className="rounded-xl border border-brand-ring bg-brand-muted/30 p-4">
            <p className="flex items-center gap-2 text-[13.5px] font-semibold text-ink"><GitBranch className="h-4 w-4 text-brand-hover" /> Client branch setup</p>
            <ol className="mt-3 space-y-2 text-[12.5px] leading-relaxed text-ink-muted"><li><strong className="text-ink">1.</strong> Create and switch to the client branch, for example <code className="rounded bg-surface-2 px-1.5 py-0.5">client/taza</code>.</li><li><strong className="text-ink">2.</strong> Put the downloaded file at <code className="rounded bg-surface-2 px-1.5 py-0.5">public/project.json</code>.</li><li><strong className="text-ink">3.</strong> In <code className="rounded bg-surface-2 px-1.5 py-0.5">katch.config.json</code>, set <code className="rounded bg-surface-2 px-1.5 py-0.5">"katch_visibility": false</code>.</li><li><strong className="text-ink">4.</strong> Commit and deploy the branch. Only the configured client website will boot.</li></ol>
            <pre className="mt-3 overflow-x-auto rounded-lg border border-line bg-surface-0/70 p-3 font-mono text-[11.5px] text-ink-muted">{`{
  "katch_visibility": false,
  "project_config_path": "/project.json"
}`}</pre>
          </div>
          <ExportRow icon={<Link2 className="h-4 w-4" />} title="Share current Studio preview" desc="Create a read-only preview link before preparing the client branch." action={<Button size="sm" onClick={buildShareLink}><Link2 className="h-3.5 w-3.5" /> Create link</Button>} />
          <ExportRow icon={<ExternalLink className="h-4 w-4" />} title="Full-screen preview" desc="Open the current rendered website in a clean review window." action={<Button size="sm" onClick={openFullPreview}><ExternalLink className="h-3.5 w-3.5" /> Open Preview</Button>} />
          {shareUrl && <div className="flex items-center gap-2 rounded-lg border border-brand-ring bg-brand-muted/40 p-3"><input className="input h-9 min-w-0 flex-1 font-mono text-[12px]" value={shareUrl} readOnly onFocus={(event) => event.target.select()} aria-label="Review link" /><Button size="sm" variant="primary" onClick={() => void copyShareLink()}>{copied === "link" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}{copied === "link" ? "Copied" : "Copy"}</Button></div>}
        </div>
      )}

      {tab === "deploy" && <div className="space-y-4"><div className="rounded-xl border border-line bg-surface-0/50 p-4"><div className="flex items-center justify-between gap-3"><p className="flex items-center gap-2 text-[13.5px] font-semibold text-ink"><Rocket className="h-4 w-4 text-brand-hover" /> Automated deployment</p><Badge tone="brand">Available</Badge></div><p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-muted">The existing Deploy tab can still create and update a repository automatically. The client-branch JSON workflow is the simpler manual alternative.</p><div className="mt-3 flex flex-wrap gap-2"><Button size="sm" variant="primary" onClick={() => { onClose(); onOpenDeployment?.(); }}><Rocket className="h-3.5 w-3.5" /> Open Deployment</Button><Button size="sm" onClick={onClose}>Close</Button></div></div><div className="rounded-xl border border-line bg-surface-0/50 p-4"><p className="flex items-center gap-2 text-[13.5px] font-semibold text-ink"><TerminalSquare className="h-4 w-4 text-brand-hover" /> One renderer, two modes</p><p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-muted">Studio mode boots the dashboard and editor. Client mode skips Firebase and Studio providers, loads public/project.json, and renders it through the same WebsiteRenderer used by the editor preview.</p></div></div>}
    </Modal>
  );
}

function ExportRow({ icon, title, desc, action }: { icon: React.ReactNode; title: string; desc: string; action: React.ReactNode }) {
  return <div className="flex flex-col gap-3 rounded-lg border border-line bg-surface-1 p-3.5 sm:flex-row sm:items-center"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-muted text-brand-hover">{icon}</span><div className="min-w-0 flex-1"><p className="text-[13.5px] font-semibold text-ink">{title}</p><p className="text-[12px] leading-relaxed text-ink-faint">{desc}</p></div><div className="shrink-0">{action}</div></div>;
}
