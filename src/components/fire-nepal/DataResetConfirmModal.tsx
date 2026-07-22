"use client";

import { useEffect, useId, useRef } from "react";
import { useFocusTrap } from "@/hooks/useFocusTrap";

export type DataResetConfirmModalProps = {
  open: boolean;
  title: string;
  body: string;
  /** Shown under body — always includes irreversibility per product copy. */
  irreversibleNote?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

/**
 * Destructive-action confirmation — matches portfolio / dashboard glass styling.
 */
export function DataResetConfirmModal({
  open,
  title,
  body,
  irreversibleNote = "This action cannot be undone.",
  confirmLabel = "Delete data",
  cancelLabel = "Cancel",
  busy = false,
  onCancel,
  onConfirm,
}: DataResetConfirmModalProps) {
  const titleId = useId();
  const bodyId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useFocusTrap(open, panelRef);

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

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-emerald-950/70 p-3 backdrop-blur-md sm:items-center sm:p-6"
      role="presentation"
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
        className="w-full max-w-md rounded-2xl border border-white/10 bg-[#04140f]/95 p-5 shadow-2xl shadow-black/50 backdrop-blur-xl sm:p-6"
      >
        <h2 id={titleId} className="text-lg font-black text-white sm:text-xl">
          {title}
        </h2>
        <p id={bodyId} className="mt-3 text-sm font-semibold leading-relaxed text-emerald-100/80">
          {body}
        </p>
        <p className="mt-3 rounded-xl border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-100/95">
          {irreversibleNote}
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="rounded-full border border-white/15 px-4 py-2 text-xs font-black text-emerald-100/90 transition hover:bg-white/10 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={busy}
            aria-busy={busy}
            data-autofocus
            onClick={onConfirm}
            className="rounded-full bg-gradient-to-r from-rose-600 to-rose-500 px-4 py-2 text-xs font-black text-white shadow-lg shadow-rose-900/30 transition hover:brightness-110 disabled:opacity-60"
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
