import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import type { Toast, ToastKind } from "@/types";
import { uid } from "@/utils/helpers";

/* ============================================================
   Toast system — lightweight, accessible, self-dismissing
   ============================================================ */

interface ToastApi {
  toast: (kind: ToastKind, message: string) => void;
}

const ToastContext = createContext<ToastApi>({ toast: () => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (kind: ToastKind, message: string) => {
      const id = uid();
      setToasts((prev) => [...prev.slice(-3), { id, kind, message }]);
      window.setTimeout(() => dismiss(id), kind === "error" ? 6000 : 3500);
    },
    [dismiss]
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 left-1/2 z-[100] flex w-full max-w-sm -translate-x-1/2 flex-col items-center gap-2 px-4 sm:left-auto sm:right-4 sm:translate-x-0 sm:items-end"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

const ICONS: Record<ToastKind, React.ReactNode> = {
  success: <CheckCircle2 className="h-4 w-4 text-ok" aria-hidden />,
  error: <XCircle className="h-4 w-4 text-danger" aria-hidden />,
  info: <Info className="h-4 w-4 text-info" aria-hidden />,
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  return (
    <div
      role="status"
      className="pointer-events-auto flex w-full animate-toast-in items-center gap-2.5 rounded-xl border border-line-strong bg-surface-1/95 px-3.5 py-3 shadow-pop backdrop-blur"
    >
      {ICONS[toast.kind]}
      <p className="flex-1 text-sm text-ink">{toast.message}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="btn-icon-sm"
        aria-label="Dismiss notification"
      >
        <X className="h-3.5 w-3.5" aria-hidden />
      </button>
    </div>
  );
}

export function useToast(): ToastApi {
  return useContext(ToastContext);
}
