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

function kpiLabelLines(label: string): string[] {
  const normalized = label.trim().toLowerCase();
  switch (normalized) {
    case "total net worth":
      return ["TOTAL NET", "WORTH"];
    case "monthly passive income":
      return ["MONTHLY PASSIVE", "INCOME"];
    case "fire progress":
      return ["FIRE", "PROGRESS"];
    case "fire number":
      return ["FIRE", "NUMBER"];
    case "estimated fire date":
      return ["ESTIMATED FIRE", "DATE"];
    default:
      return [label.toUpperCase()];
  }
}

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
  const labelLines = kpiLabelLines(label);

  return (
    <PremiumGlassCard
      className={
        compact
          ? "flex h-[122px] w-full min-w-0 flex-col p-3.5 sm:h-[128px] xl:h-[132px]"
          : "flex h-[136px] w-full min-w-0 flex-col p-4 xl:h-[140px]"
      }
    >
      <div className="relative z-10 flex h-full min-h-0 flex-col">
        <div
          className={
            compact
              ? "grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] gap-1.5"
              : "grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] gap-2"
          }
        >
          {/* Header: label + icon | spark */}
          <div className="flex min-w-0 items-start justify-between gap-2">
            <div className={`flex min-w-0 flex-1 items-center ${compact ? "gap-1.5" : "gap-2"}`}>
              <div
                className={
                  compact
                    ? "grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#38F2A0]/10 text-[#38F2A0] ring-1 ring-[#38F2A0]/20 sm:h-8 sm:w-8"
                    : "grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#38F2A0]/10 text-[#38F2A0] ring-1 ring-[#38F2A0]/20 sm:h-9 sm:w-9"
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
                    ? "min-w-0 text-[9px] font-bold uppercase leading-[1.08] tracking-wider text-white/65 sm:text-[10px]"
                    : "min-w-0 text-[10px] font-bold uppercase leading-[1.1] tracking-wider text-white/65 sm:text-[11px]"
                }
                title={label}
              >
                {labelLines.map((line) => (
                  <span key={line} className="block whitespace-nowrap break-normal [overflow-wrap:normal]">
                    {line}
                  </span>
                ))}
              </p>
            </div>
            <div className="hidden shrink-0 pt-0.5 2xl:block">
              <div className={compact ? "h-6 w-[54px] lg:w-[62px]" : "h-8 w-[76px] lg:w-[86px]"}>
                <MiniSparkline data={sparkline} variant={sparkVariant} className="opacity-90" />
              </div>
            </div>
          </div>

          {/* Value block: vertically centered in the flexible middle row */}
          <div className={`flex min-h-0 flex-col justify-center ${compact ? "gap-1" : "gap-1.5"}`}>
            <p
              className={
                compact
                  ? "min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-xl font-bold leading-none tracking-[-0.035em] text-white sm:text-2xl xl:text-3xl"
                  : "min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-2xl font-bold leading-none tracking-[-0.035em] text-white xl:text-3xl"
              }
              title={value}
            >
              {value}
            </p>

            {/* Reserve one line so cards align whether or not USD is shown */}
            <div className={compact ? "min-h-[0.8rem] sm:min-h-[0.95rem]" : "min-h-[0.95rem]"}>
              {usdHint ? (
                <p
                  className={
                    compact
                      ? "min-w-0 truncate text-[10px] font-semibold leading-none text-[#A7B4C4]"
                      : "min-w-0 truncate text-[11px] font-semibold leading-none text-[#A7B4C4]"
                  }
                >
                  ≈ {usdHint}
                </p>
              ) : null}
            </div>

            {/* Reserve progress row height for consistent rhythm */}
            <div className={`flex items-center ${compact ? "min-h-[8px] sm:min-h-[10px]" : "min-h-[12px]"}`}>
              {hasProgress ? (
                <div className="w-full space-y-0.5">
                  <div
                    className={
                      compact
                        ? "h-1 overflow-hidden rounded-full bg-white/[0.07] ring-1 ring-white/[0.04]"
                        : "h-1.5 overflow-hidden rounded-full bg-white/[0.07] ring-1 ring-white/[0.04]"
                    }
                  >
                    <div
                      className="h-full rounded-full bg-[#38F2A0] transition-all duration-500"
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
                ? "flex min-h-0 flex-col gap-0.5 border-t border-white/[0.06] pt-1"
                : "flex min-h-0 flex-col gap-1 border-t border-white/[0.06] pt-1.5"
            }
          >
            {deltaLabel ? (
              <p
                className={`inline-flex min-w-0 items-center gap-1 overflow-hidden font-bold leading-none ${
                  compact ? "text-[10px]" : "text-[11px]"
                } ${deltaPositive ? "text-[#38F2A0]" : "text-rose-300"}`}
              >
                <TrendingUp
                  className={`shrink-0 ${deltaPositive ? "" : "rotate-180"} ${
                    compact ? "h-2.5 w-2.5 sm:h-3 sm:w-3" : "h-3 w-3 sm:h-3.5 sm:w-3.5"
                  }`}
                />
                <span className="min-w-0 truncate">{deltaLabel}</span>
              </p>
            ) : (
              <div className={compact ? "h-3" : "h-3.5"} aria-hidden />
            )}
            <div
              className={
                compact
                  ? "min-h-[0.9rem] truncate text-[10px] font-semibold leading-none text-[#A7B4C4]"
                  : "min-h-[1rem] truncate text-[11px] font-semibold leading-none text-[#A7B4C4]"
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
