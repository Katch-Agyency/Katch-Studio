import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { Button } from "./ui";
import { cn } from "@/utils/helpers";

/* ============================================================
   Modal — accessible dialog with focus trap & ESC handling
   ============================================================ */

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.activeElement as HTMLElement | null;
    // Focus the panel
    requestAnimationFrame(() => panelRef.current?.focus());
    return () => {
      document.removeEventListener("keydown", onKey);
      prev?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  const sizes = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="absolute inset-0 animate-fade-in bg-black/60 backdrop-blur-[2px]" onClick={onClose} />
      <div
        ref={panelRef}
        tabIndex={-1}
        className={cn(
          "relative z-10 flex max-h-[92vh] w-full animate-scale-in flex-col overflow-hidden rounded-t-2xl border border-line bg-surface-1 shadow-pop outline-none sm:rounded-2xl",
          sizes[size]
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
            {description && <p className="mt-0.5 text-[13px] text-ink-muted">{description}</p>}
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close dialog">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 border-t border-line bg-surface-0/40 px-5 py-3.5">{footer}</div>}
      </div>
    </div>
  );
}

/* ============================================================
   Confirm dialog
   ============================================================ */

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Delete",
  danger = true,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  danger?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant={danger ? "danger" : "primary"}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-sm leading-relaxed text-ink-muted">{message}</div>
    </Modal>
  );
}
