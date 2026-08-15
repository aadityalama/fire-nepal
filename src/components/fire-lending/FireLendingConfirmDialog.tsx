"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useFocusTrap } from "@/hooks/useFocusTrap";

/**
 * Clearance for FireLendingMobileBottomNav (pt-2 + ~52px items + pb), excluding
 * safe-area which is added separately via env(safe-area-inset-bottom).
 * Nav is `lg:hidden`, so overlays only need this offset below the lg breakpoint.
 */
export const FIRE_LENDING_MOBILE_BOTTOM_NAV_CLEARANCE = "4.75rem";

export type FireLendingConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  busy?: boolean;
  onCancel: () => void;
  /** Primary action (e.g. Send Request / Accept). */
  confirmLabel: string;
  onConfirm: () => void;
  confirmTestId?: string;
  /** Optional secondary action (e.g. Reject on the approval sheet). */
  secondaryLabel?: string;
  onSecondary?: () => void;
  secondaryTestId?: string;
  cancelLabel?: string;
  /** Dialog root test id. */
  testId?: string;
  /** Extra content below the description. */
  children?: ReactNode;
  /** Tone for the primary confirm button. */
  confirmTone?: "primary" | "danger";
  /** Busy label override while aria-busy. */
  busyLabel?: string;
};

/**
 * Mobile-first confirmation bottom sheet for Loan & P2P.
 * Portaled to document.body so it is not trapped under the module's z-10 page
 * column (which otherwise loses to the fixed z-40 bottom nav).
 * On viewports below `lg`, the sheet sits above the bottom nav + iOS safe area.
 */
export function FireLendingConfirmDialog({
  open,
  title,
  description,
  busy = false,
  onCancel,
  confirmLabel,
  onConfirm,
  confirmTestId,
  secondaryLabel,
  onSecondary,
  secondaryTestId,
  cancelLabel = "Cancel",
  testId = "fire-lending-confirm-dialog",
  children,
  confirmTone = "primary",
  busyLabel = "Working…",
}: FireLendingConfirmDialogProps) {
  const titleId = useId();
  const bodyId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useFocusTrap(open && mounted, panelRef);

  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onCancel, busy]);

  if (!mounted || !open) return null;

  const confirmClass =
    confirmTone === "danger"
      ? "rounded-full bg-gradient-to-r from-rose-600 to-rose-500 px-4 py-2.5 text-xs font-black text-white shadow-lg shadow-rose-900/30 transition hover:brightness-110 disabled:opacity-60"
      : "rounded-full bg-gradient-to-r from-emerald-600 to-lime-500 px-4 py-2.5 text-xs font-black text-emerald-950 shadow-lg shadow-emerald-900/30 transition hover:brightness-110 disabled:opacity-60";

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-emerald-950/70 px-3 pt-3 pb-[calc(4.75rem+env(safe-area-inset-bottom,0px))] backdrop-blur-md lg:items-center lg:p-6"
      role="presentation"
      data-testid={testId}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        className="flex w-full max-w-md max-h-[min(85dvh,calc(100dvh-6.5rem-env(safe-area-inset-bottom,0px)))] flex-col overflow-y-auto overscroll-contain rounded-2xl border border-white/10 bg-[#04140f]/95 p-5 shadow-2xl shadow-black/50 backdrop-blur-xl sm:max-h-[min(85dvh,920px)] sm:p-6 lg:max-h-[min(85dvh,920px)]"
      >
        <h2 id={titleId} className="shrink-0 text-lg font-black text-white sm:text-xl">
          {title}
        </h2>
        <p id={bodyId} className="mt-3 shrink-0 text-sm font-semibold leading-relaxed text-emerald-100/80">
          {description}
        </p>
        {children}
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="min-h-[44px] rounded-full border border-white/15 px-4 py-2.5 text-xs font-black text-emerald-100/90 transition hover:bg-white/10 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          {secondaryLabel && onSecondary ? (
            <button
              type="button"
              disabled={busy}
              data-testid={secondaryTestId}
              onClick={onSecondary}
              className="min-h-[44px] rounded-full border border-rose-400/40 bg-rose-500/15 px-4 py-2.5 text-xs font-black text-rose-100 transition hover:bg-rose-500/25 disabled:opacity-50"
            >
              {secondaryLabel}
            </button>
          ) : null}
          <button
            type="button"
            disabled={busy}
            aria-busy={busy}
            data-autofocus
            data-testid={confirmTestId}
            onClick={onConfirm}
            className={`min-h-[44px] ${confirmClass}`}
          >
            {busy ? busyLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
