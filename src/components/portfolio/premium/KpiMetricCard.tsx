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
  /** Tighter Bloomberg-style card (wealth dashboard default). */
  compact?: boolean;
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
  compact = true,
}: KpiMetricCardProps) {
  const hasProgress = typeof progressPct === "number";

  return (
    <PremiumGlassCard
      className={
        compact
          ? "flex min-h-[130px] w-full min-w-0 flex-col p-3 sm:min-h-[134px] xl:min-h-[136px]"
          : "flex min-h-[150px] w-full min-w-0 flex-col p-3 sm:min-h-[156px] xl:min-h-[160px]"
      }
    >
      <div className="relative z-10 flex min-h-0 flex-col">
        <div
          className={
            compact
              ? "grid min-h-0 auto-rows-auto grid-rows-[auto_auto_auto] gap-1"
              : "grid min-h-0 auto-rows-auto grid-rows-[auto_auto_auto] gap-1.5"
          }
        >
          {/* Header: label + icon | spark */}
          <div className="flex items-start justify-between gap-2">
            <div className={`flex min-w-0 flex-1 items-start ${compact ? "gap-1.5" : "gap-2"}`}>
              <div
                className={
                  compact
                    ? "grid h-7 w-7 shrink-0 place-items-center rounded-md bg-emerald-500/15 text-emerald-300 shadow-[0_0_14px_-4px_rgba(52,211,153,0.4)] ring-1 ring-emerald-400/22 sm:h-8 sm:w-8"
                    : "grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-500/15 text-emerald-300 shadow-[0_0_18px_-4px_rgba(52,211,153,0.45)] ring-1 ring-emerald-400/25 sm:h-9 sm:w-9"
                }
              >
                <Icon
                  className={compact ? "h-3.5 w-3.5 sm:h-4 sm:w-4" : "h-4 w-4 sm:h-[18px] sm:w-[18px]"}
                  strokeWidth={2}
                />
              </div>
              <p
                className={
                  compact
                    ? "min-w-0 pt-0.5 text-[8px] font-semibold uppercase leading-snug tracking-[0.1em] text-zinc-500 sm:text-[9px]"
                    : "min-w-0 pt-0.5 text-[9px] font-semibold uppercase leading-snug tracking-[0.12em] text-zinc-500 sm:text-[10px]"
                }
              >
                {label}
              </p>
            </div>
            <div className="shrink-0 pt-0.5">
              <div className={compact ? "h-6 w-[64px] sm:h-7 sm:w-[76px]" : "h-8 w-[84px] sm:h-9 sm:w-[92px]"}>
                <MiniSparkline data={sparkline} variant={sparkVariant} className="opacity-90" />
              </div>
            </div>
          </div>

          {/* Value block: vertically centered in the flexible middle row */}
          <div className={`flex min-h-0 flex-col justify-center ${compact ? "gap-0.5" : "gap-1"}`}>
            <p
              className={
                compact
                  ? "min-w-0 text-[1.05rem] font-black leading-[1.08] tracking-tight text-white sm:text-[1.12rem] xl:text-[1.1rem]"
                  : "min-w-0 text-[1.16rem] font-black leading-[1.1] tracking-tight text-white sm:text-[1.24rem] xl:text-[1.2rem]"
              }
            >
              {value}
            </p>

            {/* Reserve one line so cards align whether or not USD is shown */}
            <div className={compact ? "min-h-[0.75rem] sm:min-h-[0.875rem]" : "min-h-[0.875rem] sm:min-h-[1rem]"}>
              {usdHint ? (
                <p
                  className={
                    compact
                      ? "min-w-0 truncate text-[8px] font-semibold leading-none text-zinc-500 sm:text-[9px]"
                      : "min-w-0 truncate text-[9px] font-semibold leading-none text-zinc-500 sm:text-[10px]"
                  }
                >
                  ≈ {usdHint}
                </p>
              ) : null}
            </div>

            {/* Reserve progress row height for consistent rhythm */}
            <div className={`flex items-center ${compact ? "min-h-[10px] sm:min-h-[12px]" : "min-h-[14px] sm:min-h-[16px]"}`}>
              {hasProgress ? (
                <div className="w-full space-y-0.5">
                  <div
                    className={
                      compact
                        ? "h-1 overflow-hidden rounded-full bg-white/[0.06] ring-1 ring-white/[0.06]"
                        : "h-1.5 overflow-hidden rounded-full bg-white/[0.06] ring-1 ring-white/[0.06]"
                    }
                  >
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-lime-400 shadow-[0_0_16px_rgba(52,211,153,0.5)] transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(0, progressPct))}%` }}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          </div>
          <div
            className={
              compact
                ? "flex flex-col gap-0.5 border-t border-white/[0.06] pt-1"
                : "flex flex-col gap-1 border-t border-white/[0.06] pt-1.5"
            }
          >
            {deltaLabel ? (
              <p
                className={`inline-flex items-center gap-1 font-bold leading-snug ${
                  compact ? "text-[9px] sm:text-[10px]" : "text-[10px] sm:text-[11px]"
                } ${deltaPositive ? "text-emerald-400/95" : "text-rose-400/95"}`}
              >
                <TrendingUp
                  className={`shrink-0 ${deltaPositive ? "" : "rotate-180"} ${
                    compact ? "h-2.5 w-2.5 sm:h-3 sm:w-3" : "h-3 w-3 sm:h-3.5 sm:w-3.5"
                  }`}
                />
                <span className="min-w-0 line-clamp-2">{deltaLabel}</span>
              </p>
            ) : (
              <div className={compact ? "h-2.5 sm:h-3" : "h-3.5 sm:h-4"} aria-hidden />
            )}
            <div
              className={
                compact
                  ? "min-h-[1.1rem] text-[8px] font-semibold leading-snug text-zinc-500 sm:min-h-[1.25rem] sm:text-[9px]"
                  : "min-h-[1.5rem] text-[9px] font-semibold leading-snug text-zinc-500 sm:min-h-[1.75rem] sm:text-[10px]"
              }
            >
              {footer ?? <div className={compact ? "min-h-[0.875rem]" : "min-h-[1.125rem] sm:min-h-[1.25rem]"} aria-hidden />}
            </div>
          </div>
        </div>
      </div>
    </PremiumGlassCard>
  );
}
