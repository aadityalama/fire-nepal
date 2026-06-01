"use client";

import { Sparkles } from "lucide-react";
import { useFireTheme } from "@/contexts/FireThemeContext";
import { AI_INSIGHTS } from "@/components/savings-tracker/savings-tracker-data";

export function SavingsInsightsPanel() {
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";

  return (
    <section
      className={`relative flex h-full min-h-0 flex-col overflow-hidden rounded-[1.35rem] border p-4 shadow-[0_18px_50px_-28px_rgba(0,0,0,0.35)] backdrop-blur-2xl transition-[border-color,box-shadow] duration-500 sm:rounded-[1.5rem] sm:p-5 ${
        light
          ? "border-emerald-200/70 bg-gradient-to-br from-white/95 via-emerald-50/40 to-slate-50/90 ring-1 ring-emerald-950/[0.04]"
          : "border-white/[0.08] bg-gradient-to-br from-emerald-950/40 via-[#041a14]/90 to-black/55 ring-1 ring-white/[0.04]"
      }`}
    >
      <div aria-hidden className="pointer-events-none absolute -left-20 top-0 h-40 w-40 rounded-full bg-lime-400/10 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-16 right-0 h-36 w-36 rounded-full bg-emerald-400/10 blur-3xl" />

      <div className="relative mb-4 flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-500/20 dark:text-emerald-200 dark:ring-emerald-400/25">
          <Sparkles size={18} strokeWidth={2.25} />
        </span>
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-700/90 dark:text-emerald-300/80">AI insights</p>
          <h2 className="text-base font-black tracking-tight text-slate-900 dark:text-white sm:text-lg">Signals you can act on</h2>
        </div>
      </div>

      <ul className="relative flex min-h-0 flex-1 flex-col gap-3">
        {AI_INSIGHTS.length === 0 ? (
          <li
            className={`flex flex-1 flex-col justify-center rounded-2xl border px-4 py-6 text-center ${
              light ? "border-emerald-200/80 bg-white/80" : "border-white/[0.08] bg-white/[0.04]"
            }`}
          >
            <p className="text-sm font-semibold leading-relaxed text-slate-600 dark:text-zinc-400">
              Insights appear when your savings rhythm and goals have enough history. Start by logging monthly deposits.
            </p>
          </li>
        ) : (
          AI_INSIGHTS.map((item) => (
            <li
              key={item.id}
              className={`motion-safe:group flex flex-1 flex-col justify-center rounded-2xl border px-4 py-3.5 motion-safe:transition-[transform,box-shadow,border-color] motion-safe:duration-300 motion-safe:ease-out motion-safe:hover:-translate-y-0.5 ${
                light
                  ? "border-white/80 bg-white/80 shadow-[0_1px_0_rgba(255,255,255,0.9)_inset] motion-safe:hover:border-emerald-200 motion-safe:hover:shadow-[0_14px_40px_-18px_rgba(16,185,129,0.18)]"
                  : "border-white/[0.06] bg-white/[0.04] shadow-[0_1px_0_rgba(255,255,255,0.04)_inset] motion-safe:hover:border-emerald-400/25 motion-safe:hover:shadow-[0_16px_44px_-20px_rgba(0,0,0,0.45)]"
              }`}
            >
              <p className="text-[11px] font-black uppercase tracking-wide text-emerald-700 dark:text-emerald-300/90">{item.title}</p>
              <p className="mt-1.5 text-sm font-semibold leading-relaxed text-slate-600 dark:text-zinc-300">{item.body}</p>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
