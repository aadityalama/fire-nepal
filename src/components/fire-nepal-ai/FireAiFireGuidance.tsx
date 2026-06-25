"use client";

import Link from "next/link";
import { ArrowRight, Flame } from "lucide-react";
import { useFireTheme } from "@/contexts/FireThemeContext";
import { useFireAiData } from "@/lib/fire-nepal-ai/use-fire-ai-data";
import { FireAiGlassCard } from "@/components/fire-nepal-ai/ui/FireAiGlassCard";

const PRIORITY_STYLES = {
  high: { light: "border-l-amber-500", dark: "border-l-amber-400" },
  medium: { light: "border-l-emerald-500", dark: "border-l-emerald-400" },
  low: { light: "border-l-slate-300", dark: "border-l-emerald-600" },
} as const;

export function FireAiFireGuidance() {
  const light = useFireTheme().resolvedTheme === "light";
  const { fireGuidance, hydrated } = useFireAiData();

  if (!hydrated) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-emerald-100/30" />
        ))}
      </div>
    );
  }

  if (!fireGuidance.hasData) {
    return (
      <FireAiGlassCard className="text-center">
        <div
          className={`mx-auto grid h-14 w-14 place-items-center rounded-2xl ${
            light ? "bg-emerald-50 text-emerald-700" : "bg-emerald-500/15 text-emerald-300"
          }`}
        >
          <Flame size={24} />
        </div>
        <h2 className={`mt-4 text-lg font-black ${light ? "text-slate-900" : "text-white"}`}>Guidance unavailable</h2>
        <p className={`mt-2 text-sm font-medium leading-relaxed ${light ? "text-slate-500" : "text-emerald-200/60"}`}>
          {fireGuidance.missingDataHint ??
            "Add your financial data to receive personalized FIRE guidance."}
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/cashflow-dashboard"
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-600"
          >
            Set up Cashflow
            <ArrowRight size={16} />
          </Link>
          <Link
            href="/portfolio"
            className={`inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border px-5 py-3 text-sm font-bold transition ${
              light
                ? "border-emerald-200 text-emerald-800 hover:bg-emerald-50"
                : "border-emerald-400/25 text-emerald-100 hover:bg-emerald-950/50"
            }`}
          >
            Add Portfolio
          </Link>
        </div>
      </FireAiGlassCard>
    );
  }

  return (
    <div className="space-y-3">
      {fireGuidance.items.map((item) => (
        <FireAiGlassCard
          key={item.id}
          className={`border-l-4 ${light ? PRIORITY_STYLES[item.priority].light : PRIORITY_STYLES[item.priority].dark}`}
        >
          <h3 className={`text-base font-black ${light ? "text-slate-900" : "text-white"}`}>{item.title}</h3>
          <p className={`mt-1.5 text-sm font-medium leading-relaxed ${light ? "text-slate-600" : "text-emerald-100/80"}`}>
            {item.body}
          </p>
        </FireAiGlassCard>
      ))}
    </div>
  );
}
