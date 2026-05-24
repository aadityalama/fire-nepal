import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { TrendingUp } from "lucide-react";
import { PremiumGlassCard } from "@/components/portfolio/premium/PremiumGlassCard";
import { MiniSparkline } from "@/components/portfolio/premium/MiniSparkline";

type KpiMetricCardProps = {
  label: string;
  icon: LucideIcon;
  value: string;
  usdHint?: string;
  deltaLabel?: string;
  deltaPositive?: boolean;
  sparkline: number[];
  sparkVariant?: "emerald" | "violet" | "amber";
  footer?: ReactNode;
  /** Optional progress bar 0–100 */
  progressPct?: number;
};

export function KpiMetricCard({
  label,
  icon: Icon,
  value,
  usdHint,
  deltaLabel,
  deltaPositive = true,
  sparkline,
  sparkVariant = "emerald",
  footer,
  progressPct,
}: KpiMetricCardProps) {
  const hasProgress = typeof progressPct === "number";

  return (
    <PremiumGlassCard className="flex min-h-[148px] w-full min-w-0 flex-col p-3.5 sm:min-h-[152px] sm:p-4 xl:min-h-[156px] xl:p-4">
      <div className="relative z-10 flex min-h-0 flex-col">
        <div className="grid min-h-0 auto-rows-auto grid-rows-[auto_auto_auto] gap-2.5 sm:gap-3">
          {/* Header: label + icon | spark */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-start gap-2.5 sm:gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-emerald-500/15 text-emerald-300 shadow-[0_0_20px_-4px_rgba(52,211,153,0.45)] ring-1 ring-emerald-400/25 sm:h-11 sm:w-11 sm:rounded-xl">
                <Icon className="h-[18px] w-[18px] sm:h-5 sm:w-5" strokeWidth={2} />
              </div>
              <p className="min-w-0 pt-0.5 text-[10px] font-semibold uppercase leading-snug tracking-[0.14em] text-zinc-500 sm:text-[11px]">
                {label}
              </p>
            </div>
            <div className="shrink-0 pt-0.5">
              <div className="h-10 w-[92px] sm:h-11 sm:w-[100px]">
                <MiniSparkline data={sparkline} variant={sparkVariant} className="opacity-90" />
              </div>
            </div>
          </div>

          {/* Value block: vertically centered in the flexible middle row */}
          <div className="flex min-h-0 flex-col justify-center gap-2">
            <p className="text-[1.14rem] font-black leading-[1.12] tracking-tight text-white sm:text-[1.22rem] xl:text-[1.18rem] xl:leading-tight">{value}</p>

            {/* Reserve one line so cards align whether or not USD is shown */}
            <div className="min-h-[1rem] sm:min-h-[1.125rem]">
              {usdHint ? <p className="text-[10px] font-semibold leading-none text-zinc-500 sm:text-[11px]">≈ {usdHint}</p> : null}
            </div>

            {/* Reserve progress row height for consistent rhythm */}
            <div className="flex min-h-[18px] items-center sm:min-h-[20px]">
              {hasProgress ? (
                <div className="w-full space-y-1">
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06] ring-1 ring-white/[0.06] sm:h-2">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-lime-400 shadow-[0_0_16px_rgba(52,211,153,0.5)] transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(0, progressPct))}%` }}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          </div>
          <div className="flex flex-col gap-1.5 border-t border-white/[0.06] pt-2.5 sm:gap-1.5 sm:pt-3">
            {deltaLabel ? (
              <p
                className={`inline-flex items-center gap-1.5 text-[10px] font-bold leading-snug sm:text-[11px] ${
                  deltaPositive ? "text-emerald-400/95" : "text-rose-400/95"
                }`}
              >
                <TrendingUp className={`h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5 ${deltaPositive ? "" : "rotate-180"}`} />
                <span className="min-w-0">{deltaLabel}</span>
              </p>
            ) : (
              <div className="h-3.5 sm:h-4" aria-hidden />
            )}
            <div className="min-h-[2rem] text-[9px] font-semibold leading-snug text-zinc-500 sm:min-h-[2.25rem] sm:text-[10px]">
              {footer ?? <div className="min-h-[1.125rem] sm:min-h-[1.25rem]" aria-hidden />}
            </div>
          </div>
        </div>
      </div>
    </PremiumGlassCard>
  );
}
