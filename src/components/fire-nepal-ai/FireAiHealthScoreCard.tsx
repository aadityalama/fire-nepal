"use client";

import { useFireTheme } from "@/contexts/FireThemeContext";
import type { FireAiHealthScore } from "@/lib/fire-nepal-ai/types";
import { FireAiGlassCard } from "@/components/fire-nepal-ai/ui/FireAiGlassCard";
import { CircularProgress } from "@/components/fire-nepal-ai/ui/CircularProgress";

type FireAiHealthScoreCardProps = {
  health: FireAiHealthScore;
  loading?: boolean;
};

export function FireAiHealthScoreCard({ health, loading }: FireAiHealthScoreCardProps) {
  const light = useFireTheme().resolvedTheme === "light";

  return (
    <FireAiGlassCard>
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className={`text-[10px] font-black uppercase tracking-[0.18em] ${light ? "text-emerald-600" : "text-emerald-400/80"}`}>
            Financial Health Score
          </p>
          {loading ? (
            <div className="mt-3 h-8 w-32 animate-pulse rounded-lg bg-emerald-100/40" />
          ) : health.score !== null ? (
            <p className={`mt-1 text-3xl font-black tracking-tight ${light ? "text-slate-900" : "text-white"}`}>
              {health.score}
              <span className={`text-lg font-bold ${light ? "text-slate-400" : "text-emerald-300/60"}`}>
                {" "}
                / {health.maxScore}
              </span>
            </p>
          ) : (
            <p className={`mt-2 text-sm font-semibold leading-snug ${light ? "text-slate-500" : "text-emerald-200/60"}`}>
              {health.statusLabel}
            </p>
          )}
          {!loading && health.score !== null ? (
            <p
              className={`mt-2 text-sm font-bold ${
                health.status === "excellent"
                  ? light
                    ? "text-emerald-700"
                    : "text-emerald-300"
                  : light
                    ? "text-amber-700"
                    : "text-amber-300"
              }`}
            >
              {health.statusLabel}
            </p>
          ) : null}
        </div>
        <CircularProgress value={loading ? null : health.score} max={health.maxScore} />
      </div>
    </FireAiGlassCard>
  );
}
