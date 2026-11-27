"use client";

import { useState } from "react";
import { LineChart } from "lucide-react";

const RANGES = ["1M", "3M", "6M", "1Y", "All"] as const;

/**
 * Portfolio Value Trend for metals.
 * No metals-specific historical valuation series exists in the product today.
 * Renders an accurate empty state — does not invent chart points.
 */
export function GoldSilverValueTrendChart({
  hasGold,
  hasSilver,
}: {
  hasGold: boolean;
  hasSilver: boolean;
}) {
  const [range, setRange] = useState<(typeof RANGES)[number]>("1Y");
  const empty = !hasGold && !hasSilver;

  return (
    <section
      className="gs-glass rounded-2xl border border-[#D4AF37]/20 p-3 sm:p-4"
      aria-labelledby="gs-value-trend-title"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg border border-[#D4AF37]/30 bg-[#D4AF37]/10 text-[#F4D06F]">
            <LineChart size={16} aria-hidden />
          </span>
          <h3 id="gs-value-trend-title" className="text-xs font-black uppercase tracking-[0.1em] text-[#F8FAFC] sm:text-sm">
            Portfolio Value Trend
          </h3>
        </div>
        <div className="flex flex-wrap gap-1" role="tablist" aria-label="Chart date range">
          {RANGES.map((r) => {
            const active = r === range;
            return (
              <button
                key={r}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setRange(r)}
                className={`min-h-9 min-w-9 rounded-lg px-2.5 text-[11px] font-bold transition ${
                  active
                    ? "border border-[#D4AF37]/50 bg-[#D4AF37]/20 text-[#F4D06F] shadow-[0_0_16px_-6px_rgba(212,175,55,0.55)]"
                    : "border border-white/10 bg-black/25 text-[#CBD5E1]/75 hover:border-white/20 hover:text-[#F8FAFC]"
                }`}
              >
                {r}
              </button>
            );
          })}
        </div>
      </div>

      <div className="relative mt-3 flex min-h-[11rem] items-center justify-center overflow-hidden rounded-xl border border-white/[0.06] bg-gradient-to-b from-[#062B24]/40 to-[#03100F]/80 sm:min-h-[13rem]">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(203,213,225,0.35) 1px, transparent 1px), linear-gradient(to top, rgba(203,213,225,0.35) 1px, transparent 1px)",
            backgroundSize: "20% 25%",
          }}
          aria-hidden
        />
        <div className="relative z-[1] max-w-sm px-4 text-center">
          <p className="text-sm font-bold text-[#F8FAFC]">
            {empty ? "No metal holdings yet" : "Historical metals valuation unavailable"}
          </p>
          <p className="mt-1.5 text-[11px] font-semibold leading-relaxed text-[#CBD5E1]/75">
            {empty
              ? "Add gold or silver via Quick Actions to start tracking portfolio value."
              : "A metals-only historical value series is not stored yet. This chart will use genuine portfolio valuation history when that data is available — fictional points are never shown."}
          </p>
          {(hasGold || hasSilver) && (
            <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-[#CBD5E1]/45">
              Range: {range}
              {hasGold ? " · Gold" : ""}
              {hasSilver ? " · Silver" : ""}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
