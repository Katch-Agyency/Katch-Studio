import { useState } from "react";
import { AppWindow, Cloud, Database, Download, HardDrive, Moon, Palette, RefreshCw, Sun, Trash2 } from "lucide-react";
import { InstallButton } from "@/components/layout/PwaStatus";
import { useStore } from "@/app/store";
import { useStudioTheme } from "@/app/theme";
import { useToast } from "@/app/toast";
import { Button } from "@/components/ui/ui";
import { ConfirmDialog } from "@/components/ui/Modal";
import { Segmented } from "@/components/ui/Fields";
import { downloadFile } from "@/utils/helpers";

/* ============================================================
   Settings — workspace, appearance and data management.
   ============================================================ */

const ROADMAP = [
  { label: "Firebase Auth (anonymous) + Firestore sync", status: "Live" },
  { label: "Standalone React/Vite project export (real code generation)", status: "Live" },
  { label: "Template lifecycle — duplicate, create from project, delete custom", status: "Live" },
  { label: "Client review link (read-only preview, shareable on any device)", status: "Live" },
  { label: "Sentry error monitoring (env-gated via VITE_SENTRY_DSN)", status: "Live" },
  { label: "Automated deployment (generated project → GitHub → Vercel)", status: "Next phase" },
  { label: "Client feedback & approval on the review link", status: "Next phase" },
  { label: "Team accounts with Google sign-in & per-member roles", status: "Next phase" },
  { label: "AI content & structure suggestions", status: "Next phase" },
];

export default function Settings() {
  const { projects, resetDemoData, clearAllData, storageKind, storageLabel } = useStore();
  const { theme, toggle } = useStudioTheme();
  const { toast } = useToast();
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const exportAll = () => {
    downloadFile("katch-studio-all-projects.json", JSON.stringify(projects, null, 2));
    toast("success", `Exported ${projects.length} projects.`);
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 md:px-8">
      <div className="animate-fade-up">
        <h1 className="text-2xl font-bold tracking-tight text-ink">Settings</h1>
        <p className="mt-1 text-sm text-ink-muted">Workspace preferences and data management.</p>
      </div>

      {/* Workspace */}
      <section className="card mt-7 p-5">
        <h2 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wider text-ink-muted">
          <Database className="h-4 w-4" /> Workspace
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="label">Workspace name</p>
            <p className="rounded-lg border border-line bg-surface-0/50 px-3 py-2 text-sm font-medium text-ink">
              Katch Studio — Production Workspace
            </p>
          </div>
          <div>
            <p className="label">Member</p>
            <p className="rounded-lg border border-line bg-surface-0/50 px-3 py-2 text-sm text-ink">
              Katch Team <span className="text-ink-faint">(workspace admin)</span>
            </p>
          </div>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-ink-faint">
          Single-user for the MVP. The store is isolated behind one interface so Firebase Auth + Firestore can
          be introduced without touching the UI.
        </p>
      </section>

      {/* Appearance */}
      <section className="card mt-4 p-5">
        <h2 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wider text-ink-muted">
          <Palette className="h-4 w-4" /> Appearance
        </h2>
        <div className="mt-4 flex items-center justify-between">
          <div>
            <p className="text-[14px] font-medium text-ink">Studio theme</p>
            <p className="text-xs text-ink-faint">Dark-first by design — light mode for bright rooms.</p>
          </div>
          <Segmented
            ariaLabel="Studio theme"
            value={theme}
            onChange={(v) => {
              if (v !== theme) toggle();
            }}
            options={[
              { value: "dark", label: <><Moon className="h-3.5 w-3.5" /> Dark</> },
              { value: "light", label: <><Sun className="h-3.5 w-3.5" /> Light</> },
            ]}
          />
        </div>
      </section>

      {/* Storage & sync */}
      <section className="card mt-4 p-5">
        <h2 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wider text-ink-muted">
          {storageKind === "firestore" ? <Cloud className="h-4 w-4" /> : <HardDrive className="h-4 w-4" />} Storage &amp; Sync
        </h2>
        <div className="mt-4">
          <p className="flex items-center gap-2 text-[14px] font-medium text-ink">
            <span
              className={`h-2 w-2 rounded-full ${storageKind === "firestore" ? "bg-ok" : "bg-zinc-400"}`}
              aria-hidden
            />
            {storageLabel}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-ink-faint">
            {storageKind === "firestore"
              ? "Projects, drafts and workspace state sync to Firestore — shared across the team and safe across browsers."
              : "Projects live in this browser only. Add Firebase variables to .env to sync to Firestore — full guide in docs/FIREBASE.md."}
          </p>
        </div>
      </section>

      {/* Install */}
      <section className="card mt-4 p-5">
        <h2 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wider text-ink-muted">
          <AppWindow className="h-4 w-4" /> Install App
        </h2>
        <div className="mt-4">
          <p className="text-[14px] font-medium text-ink">Run Katch Studio as a desktop app</p>
          <p className="mt-1 text-xs leading-relaxed text-ink-faint">
            Installs to your device with its own window, app icon and offline shell. The install button
            appears only when your browser supports it (Chrome / Edge / Safari on desktop and mobile).
          </p>
          <div className="mt-3">
            <InstallButton />
          </div>
        </div>
      </section>

      {/* Data */}
      <section className="card mt-4 p-5">
        <h2 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wider text-ink-muted">
          <Download className="h-4 w-4" /> Data
        </h2>
        <div className="mt-4 space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[14px] font-medium text-ink">Export all projects</p>
              <p className="text-xs text-ink-faint">One JSON file with every project configuration.</p>
            </div>
            <Button variant="secondary" size="sm" onClick={exportAll}>
              <Download className="h-3.5 w-3.5" /> Export {projects.length} projects
            </Button>
          </div>
          <div className="flex flex-col gap-3 border-t border-line pt-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[14px] font-medium text-ink">Restore demo data</p>
              <p className="text-xs text-ink-faint">Rebuild the Looky Cakes, Bta3 7awa4y and Katch demo projects.</p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setConfirmReset(true)}>
              <RefreshCw className="h-3.5 w-3.5" /> Restore demos
            </Button>
          </div>
          <div className="flex flex-col gap-3 border-t border-line pt-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[14px] font-medium text-danger">Clear all data</p>
              <p className="text-xs text-ink-faint">Removes every project from this browser.</p>
            </div>
            <Button variant="danger" size="sm" onClick={() => setConfirmClear(true)}>
              <Trash2 className="h-3.5 w-3.5" /> Clear everything
            </Button>
          </div>
        </div>
      </section>

      {/* Roadmap */}
      <section className="card mt-4 p-5">
        <h2 className="text-[13px] font-semibold uppercase tracking-wider text-ink-muted">Architecture Roadmap</h2>
        <p className="mt-1 text-xs text-ink-faint">
          The MVP keeps its scope tight — these are the phases the data model and renderer are already shaped for.
        </p>
        <ul className="mt-4 space-y-2.5">
          {ROADMAP.map((r) => (
            <li key={r.label} className="flex items-center justify-between gap-3 text-[13.5px]">
              <span className="text-ink">{r.label}</span>
              <span className="shrink-0 rounded-md border border-line-strong bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-ink-faint">
                {r.status}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-6 text-center text-xs text-ink-faint">Katch Studio · Website Production System · v1.0</p>

      <ConfirmDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={() => {
          resetDemoData();
          toast("success", "Demo projects restored.");
        }}
        title="Restore demo data"
        message="Your current projects will be replaced with the three demo projects (Looky Cakes, Bta3 7awa4y, Katch)."
        confirmLabel="Restore Demos"
      />
      <ConfirmDialog
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        onConfirm={() => {
          clearAllData();
          toast("success", "All data cleared from storage.");
        }}
        title="Clear all data"
        message="All projects will be permanently removed from the connected storage. Export first if you need a backup."
        confirmLabel="Clear Everything"
      />
    </div>
  );
}
