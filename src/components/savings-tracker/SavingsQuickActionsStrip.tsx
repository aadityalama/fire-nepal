"use client";

import { Download, Link2, PiggyBank, Target } from "lucide-react";
import { toast } from "sonner";
import { useFireTheme } from "@/contexts/FireThemeContext";

const ACTIONS = [
  { id: "add", label: "Add savings", icon: PiggyBank, hint: "Log a deposit or transfer" },
  { id: "export", label: "Export report", icon: Download, hint: "PDF / CSV snapshot" },
  { id: "goal", label: "Set goal", icon: Target, hint: "Nepal corpus timeline" },
  { id: "connect", label: "Connect account", icon: Link2, hint: "Bank read-only link" },
] as const;

export function SavingsQuickActionsStrip() {
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";

  return (
    <section
      className={`rounded-[1.35rem] border p-4 backdrop-blur-xl transition-colors duration-500 sm:rounded-[1.5rem] sm:p-5 ${
        light
          ? "border-emerald-200/70 bg-white/90 shadow-[0_12px_40px_-24px_rgba(15,23,42,0.08)]"
          : "border-emerald-500/12 bg-[#04140f]/75 shadow-[0_18px_48px_-26px_rgba(0,0,0,0.45)]"
      }`}
    >
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-700/90 dark:text-emerald-300/80">Quick actions</p>
          <h2 className="text-base font-black text-slate-900 dark:text-white sm:text-lg">Operate in seconds</h2>
        </div>
        <p className="text-xs font-semibold text-slate-500 dark:text-zinc-500">Local-first · no clutter</p>
      </div>
      <div className="grid auto-rows-fr gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {ACTIONS.map(({ id, label, icon: Icon, hint }) => (
          <button
            key={id}
            type="button"
            onClick={() => toast.message(label, { description: `${hint} — workspace preview.` })}
            className={`group flex h-full min-h-[4.5rem] flex-col items-start justify-center rounded-2xl border px-4 py-3 text-left motion-safe:transition-[transform,box-shadow,border-color,background-color] motion-safe:duration-300 motion-safe:active:scale-[0.99] ${
              light
                ? "border-slate-200/80 bg-slate-50/80 motion-safe:hover:-translate-y-0.5 motion-safe:hover:border-emerald-300/60 motion-safe:hover:bg-white motion-safe:hover:shadow-[0_14px_36px_-16px_rgba(16,185,129,0.2)]"
                : "border-white/[0.06] bg-white/[0.03] motion-safe:hover:-translate-y-0.5 motion-safe:hover:border-emerald-400/25 motion-safe:hover:bg-white/[0.06] motion-safe:hover:shadow-[0_16px_40px_-18px_rgba(0,0,0,0.5)]"
            }`}
          >
            <span className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/12 text-emerald-700 ring-1 ring-emerald-500/15 transition group-hover:bg-emerald-600 group-hover:text-white dark:text-emerald-200 dark:ring-emerald-400/20 dark:group-hover:bg-emerald-500 dark:group-hover:text-emerald-950">
              <Icon size={18} strokeWidth={2.25} />
            </span>
            <span className="text-sm font-black text-slate-900 dark:text-white">{label}</span>
            <span className="mt-0.5 text-[11px] font-semibold text-slate-500 dark:text-zinc-500">{hint}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
