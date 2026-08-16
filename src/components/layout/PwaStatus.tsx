import { useEffect, useState } from "react";
import { ArrowDownToLine, RefreshCw, WifiOff, X } from "lucide-react";
import { getPWAState, subscribePWA, type PWAState } from "@/app/pwa";
import { Button } from "@/components/ui/ui";

/* ============================================================
   PWA status surfaces — offline notice + update banner.
   Subtle, dismissible, and only visible when relevant.
   ============================================================ */

export default function PwaStatus() {
  const [pwa, setPwa] = useState<PWAState>(getPWAState());
  const [updateDismissed, setUpdateDismissed] = useState(false);
  const [offlineDismissed, setOfflineDismissed] = useState(false);

  useEffect(() => subscribePWA(setPwa), []);

  if (!pwa) return null;

  return (
    <>
      {/* Offline notice */}
      {!pwa.online && !offlineDismissed && (
        <div
          role="status"
          className="flex items-center gap-2.5 border-b border-warn/25 bg-warn/10 px-4 py-2 text-[12.5px] text-ink"
        >
          <WifiOff className="h-4 w-4 shrink-0 text-warn" aria-hidden />
          <p className="min-w-0 flex-1 leading-relaxed">
            You're offline — the app keeps working and changes stay saved locally until you're back.
          </p>
          <button className="btn-icon-sm shrink-0" onClick={() => setOfflineDismissed(true)} aria-label="Dismiss offline notice">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Update available */}
      {pwa.updateReady && !updateDismissed && (
        <div
          role="status"
          className="flex items-center gap-2.5 border-b border-brand/25 bg-brand-muted px-4 py-2 text-[12.5px] text-ink"
        >
          <RefreshCw className="h-4 w-4 shrink-0 text-brand-hover" aria-hidden />
          <p className="min-w-0 flex-1 leading-relaxed">A new version of Katch Studio is available.</p>
          <Button variant="primary" size="sm" onClick={() => pwa.applyUpdate()}>
            Update
          </Button>
          <button className="btn-icon-sm shrink-0" onClick={() => setUpdateDismissed(true)} aria-label="Dismiss update notice">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </>
  );
}

/* ---------- Install button (header / settings) ---------- */

export function InstallButton({ compact = false }: { compact?: boolean }) {
  const [pwa, setPwa] = useState<PWAState>(getPWAState());
  const [done, setDone] = useState(false);

  useEffect(() => subscribePWA(setPwa), []);

  if (!pwa.canInstall || done) return null;

  return (
    <Button
      variant="secondary"
      size={compact ? "sm" : "md"}
      onClick={async () => {
        if (pwa.install) {
          await pwa.install();
          setDone(true);
        }
      }}
    >
      <ArrowDownToLine className="h-4 w-4" />
      {compact ? "Install" : "Install Katch Studio"}
    </Button>
  );
}
