"use client";

import { Sparkles } from "lucide-react";
import { useFireTheme } from "@/contexts/FireThemeContext";
import type { FireAiTodayInsight } from "@/lib/fire-nepal-ai/types";
import { FireAiGlassCard } from "@/components/fire-nepal-ai/ui/FireAiGlassCard";

type FireAiTodayInsightCardProps = {
  insight: FireAiTodayInsight;
  loading?: boolean;
};

export function FireAiTodayInsightCard({ insight, loading }: FireAiTodayInsightCardProps) {
  const light = useFireTheme().resolvedTheme === "light";

  return (
    <FireAiGlassCard>
      <div className="flex items-start gap-3">
        <div
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
            light ? "bg-emerald-50 text-emerald-700" : "bg-emerald-500/15 text-emerald-300"
          }`}
        >
          <Sparkles size={18} strokeWidth={2.25} />
        </div>
        <div className="min-w-0">
          <p className={`text-[10px] font-black uppercase tracking-[0.18em] ${light ? "text-emerald-600" : "text-emerald-400/80"}`}>
            Today&apos;s AI Insight
          </p>
          {loading ? (
            <div className="mt-2 space-y-2">
              <div className="h-3 w-full animate-pulse rounded bg-emerald-100/40" />
              <div className="h-3 w-4/5 animate-pulse rounded bg-emerald-100/40" />
            </div>
          ) : (
            <p className={`mt-1.5 text-sm font-semibold leading-relaxed ${light ? "text-slate-700" : "text-emerald-50/90"}`}>
              {insight.text}
            </p>
          )}
        </div>
      </div>
    </FireAiGlassCard>
  );
}
