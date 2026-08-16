import { useState } from "react";
import { Link } from "react-router-dom";
import { TriangleAlert, X } from "lucide-react";
import { useStore } from "@/app/store";

/* ============================================================
   CloudStatusBanner — surfaces a confusing but common state:
   a DEPLOYED build that is running without Firebase (env vars
   missing at build time). Data then lives in one browser only,
   so the app says so instead of staying silent.
   Never shows on localhost (local dev without Firebase is a
   legitimate setup) and never shows once Firestore is active.
   ============================================================ */

export default function CloudStatusBanner() {
  const { hydrated, storageKind } = useStore();
  const [dismissed, setDismissed] = useState(false);

  if (!hydrated) return null;

  const hostname = window.location.hostname;
  const isRemote = !["localhost", "127.0.0.1"].includes(hostname);

  if (!isRemote || storageKind !== "local" || dismissed) return null;

  return (
    <div
      role="note"
      className="flex items-center gap-2.5 border-b border-warn/25 bg-warn/10 px-4 py-2 text-[12.5px] text-ink"
    >
      <TriangleAlert className="h-4 w-4 shrink-0 text-warn" aria-hidden />
      <p className="min-w-0 flex-1 leading-relaxed">
        <strong className="font-semibold">Local mode</strong> — this build isn't connected to Firebase,
        so data lives in this browser only and won't appear on other devices.{" "}
        <Link
          to="/settings"
          className="font-medium underline decoration-warn/50 underline-offset-2 transition-colors hover:decoration-warn"
        >
          See how to connect
        </Link>
        .
      </p>
      <button
        className="btn-icon-sm shrink-0"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss warning"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
