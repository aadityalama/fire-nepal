"use client";

import { Brain, Shield } from "lucide-react";
import { useMemo } from "react";
import { buildAiReminderInsights, type AiInsightTone } from "@/lib/smart-reminders/ai-insights";
import type { Reminder } from "@/lib/smart-reminders/types";
import { useFireTheme } from "@/contexts/FireThemeContext";

function toneShell(tone: AiInsightTone, light: boolean): string {
  if (tone === "risk") {
    return light
      ? "border-red-200/80 bg-gradient-to-br from-red-50/90 to-white/90"
      : "border-red-500/20 bg-gradient-to-br from-red-950/35 to-black/20";
  }
  if (tone === "watch") {
    return light
      ? "border-amber-200/80 bg-gradient-to-br from-amber-50/90 to-white/90"
      : "border-amber-400/18 bg-gradient-to-br from-amber-950/25 to-black/20";
  }
  if (tone === "family") {
    return light
      ? "border-sky-200/80 bg-gradient-to-br from-sky-50/80 to-white/90"
      : "border-sky-400/18 bg-gradient-to-br from-sky-950/25 to-black/20";
  }
  return light
    ? "border-emerald-200/80 bg-gradient-to-br from-emerald-50/80 to-white/90"
    : "border-emerald-400/15 bg-gradient-to-br from-emerald-950/25 to-black/20";
}

export function AiReminderInsightsCard({
  reminders,
  upcomingWithinDays,
  historyCount,
}: {
  reminders: Reminder[];
  upcomingWithinDays: number;
  historyCount: number;
}) {
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const items = useMemo(
    () =>
      buildAiReminderInsights({
        reminders,
        upcomingWithinDays,
        historyCountLast30Approx: historyCount > 0 ? 1 : 0,
      }),
    [reminders, upcomingWithinDays, historyCount],
  );

  return (
    <section
      className={`wealth-glass relative overflow-hidden p-4 sm:p-5 motion-safe:transition motion-safe:duration-300 ${
        light ? "shadow-sm" : "shadow-[0_18px_50px_-28px_rgba(0,0,0,0.55)]"
      }`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-24 mx-auto h-56 w-[120%] rounded-full bg-gradient-to-r from-emerald-400/10 via-amber-300/10 to-emerald-400/10 blur-3xl dark:from-emerald-400/8 dark:via-amber-300/8 dark:to-emerald-400/8"
      />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em] text-emerald-700/90 dark:text-emerald-300/75">
            <Brain size={14} className="text-emerald-600 dark:text-emerald-300" />
            AI reminder insights
          </p>
          <h3 className="mt-1 text-lg font-black tracking-tight text-slate-900 dark:text-white">Household signals</h3>
          <p className="mt-1 text-xs font-semibold text-slate-600 dark:text-zinc-400">
            Rule-based coaching tuned for Nepali families abroad — not a live model call.
          </p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/25 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-50">
          <Shield size={12} />
          Local-first
        </span>
      </div>

      <div className="relative mt-4 grid gap-2 sm:grid-cols-2">
        {items.map((it) => (
          <div key={it.id} className={`rounded-2xl border p-3 sm:p-4 ${toneShell(it.tone, light)}`}>
            <p className="text-sm font-black text-slate-900 dark:text-white">{it.title}</p>
            <p className="mt-2 text-xs font-semibold leading-relaxed text-slate-700 dark:text-zinc-300">{it.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
