"use client";

import { X } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";

type FamilyOverlayProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  light: boolean;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
};

export function FamilyOverlay({ open, onClose, title, description, light, children, footer, wide }: FamilyOverlayProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted || !open) return null;

  const panel = light
    ? "border-emerald-200/80 bg-gradient-to-b from-white via-white to-emerald-50/90 text-slate-900 shadow-[0_-12px_48px_-12px_rgba(0,0,0,0.12)] sm:shadow-[0_24px_64px_-12px_rgba(16,185,129,0.18)]"
    : "border-emerald-500/20 bg-gradient-to-b from-[#041a14]/98 via-[#030d0b]/98 to-black/95 text-zinc-100 shadow-[0_-16px_48px_-8px_rgba(0,0,0,0.55)] sm:shadow-[0_24px_80px_-12px_rgba(16,185,129,0.12)]";

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <button
        type="button"
        className="absolute inset-0 bg-black/55 backdrop-blur-[3px] transition-opacity duration-300 motion-reduce:transition-none"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        className={`relative z-[101] flex max-h-[min(92dvh,920px)] w-full flex-col overflow-hidden rounded-t-2xl border shadow-2xl transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] sm:rounded-2xl ${wide ? "sm:max-w-2xl" : "sm:max-w-lg"} ${panel}`}
      >
        <div
          className={`flex shrink-0 items-start justify-between gap-3 border-b px-4 py-4 sm:px-5 ${
            light ? "border-emerald-200/60" : "border-emerald-500/15"
          }`}
        >
          <div className="min-w-0">
            <h2 className="text-base font-black tracking-tight sm:text-lg">{title}</h2>
            {description ? (
              <p className={`mt-1 text-xs leading-relaxed sm:text-sm ${light ? "text-slate-600" : "text-zinc-400"}`}>{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border transition ${
              light
                ? "border-slate-200/90 text-slate-700 hover:bg-slate-100"
                : "border-white/10 text-emerald-200 hover:bg-white/10 hover:text-white"
            }`}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">{children}</div>
        {footer ? (
          <div
            className={`shrink-0 border-t px-4 py-3 sm:px-5 ${light ? "border-emerald-200/60 bg-white/80" : "border-emerald-500/12 bg-black/30"}`}
          >
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
