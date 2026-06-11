import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { TrendingUp } from "lucide-react";
import { PremiumGlassCard } from "@/components/portfolio/premium/PremiumGlassCard";

type KpiMetricCardProps = {
  label: string;
  icon: LucideIcon;
  value: string;
  usdHint?: string;
  secondaryValue?: string;
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
  secondaryValue,
  deltaLabel,
  deltaPositive = true,
  footer,
  progressPct,
  compact = true,
}: KpiMetricCardProps) {
  const hasProgress = typeof progressPct === "number";
  const labelLines = kpiLabelLines(label);
  const secondaryText = secondaryValue ?? (usdHint ? `≈ ${usdHint}` : undefined);
  const trendText = deltaLabel ?? (hasProgress ? "Progress line" : "Live portfolio snapshot");

  return (
    <PremiumGlassCard
      clip={false}
      className={
        compact
          ? "flex h-[136px] w-full min-w-0 p-3.5 sm:h-[140px] lg:min-w-[240px] xl:h-[148px]"
          : "flex h-[140px] w-full min-w-0 p-4 lg:min-w-[240px] xl:h-[150px]"
      }
    >
      <div className="relative z-10 flex h-full flex-col">
        <div
          className={
            compact
              ? "grid h-full grid-rows-[auto_minmax(2.55rem,1fr)_auto] gap-2"
              : "grid h-full grid-rows-[auto_minmax(2.75rem,1fr)_auto] gap-2.5"
          }
        >
          {/* Top: icon + full title. */}
          <div className="flex min-w-0 items-start">
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
                  <span key={line} className="block whitespace-normal break-normal [overflow-wrap:normal] [word-break:normal]">
                    {line}
                  </span>
                ))}
              </p>
            </div>
          </div>

          {/* Middle: primary metric remains the visual focus and gets guaranteed vertical space. */}
          <div className={`flex flex-col justify-center ${compact ? "gap-1" : "gap-1.5"}`}>
            <p
              className={
                compact
                  ? "min-w-0 whitespace-nowrap text-2xl font-semibold leading-[1.02] tracking-[-0.04em] text-white lg:text-3xl"
                  : "min-w-0 whitespace-nowrap text-2xl font-semibold leading-[1.02] tracking-[-0.04em] text-white lg:text-3xl"
              }
              title={value}
            >
              {value}
            </p>

            <div className={compact ? "min-h-[0.8rem] sm:min-h-[0.95rem]" : "min-h-[0.95rem]"}>
              {secondaryText ? (
                <p
                  className={
                    compact
                      ? "min-w-0 whitespace-nowrap text-[10px] font-semibold leading-none text-[#A7B4C4]"
                      : "min-w-0 whitespace-nowrap text-[11px] font-semibold leading-none text-[#A7B4C4]"
                  }
                >
                  {secondaryText}
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
                ? "flex flex-col gap-0.5 border-t border-white/[0.06] pt-1"
                : "flex flex-col gap-1 border-t border-white/[0.06] pt-1.5"
            }
          >
            <p
              className={`inline-flex min-w-0 items-center gap-1 font-bold leading-none ${
                compact ? "text-[10px]" : "text-[11px]"
              } ${deltaLabel ? (deltaPositive ? "text-[#38F2A0]" : "text-rose-300") : "text-[#A7B4C4]"}`}
            >
              <TrendingUp
                className={`shrink-0 ${deltaLabel && !deltaPositive ? "rotate-180" : ""} ${
                  compact ? "h-2.5 w-2.5 sm:h-3 sm:w-3" : "h-3 w-3 sm:h-3.5 sm:w-3.5"
                }`}
              />
              <span className="min-w-0 whitespace-nowrap">{trendText}</span>
            </p>
            <div
              className={
                compact
                  ? "min-h-[0.9rem] whitespace-nowrap text-[10px] font-semibold leading-none text-[#A7B4C4]"
                  : "min-h-[1rem] whitespace-nowrap text-[11px] font-semibold leading-none text-[#A7B4C4]"
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
