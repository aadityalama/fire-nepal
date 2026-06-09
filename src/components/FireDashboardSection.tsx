"use client";

import { LineChart } from "lucide-react";
import { FireCalculatorInputs, FireRetirementProjection, FIRE_CALCULATOR_PANEL_CLASS } from "@/components/FireCalculator";
import { FireCalculatorProvider, useFireCalculator } from "@/components/FireCalculatorContext";
import { SavingsChart } from "@/components/SavingsChart";

function SavingsGrowthHeader() {
  const { horizonGrowthPct, result } = useFireCalculator();
  const badge =
    horizonGrowthPct === null
      ? "—"
      : `${horizonGrowthPct >= 0 ? "+" : ""}${horizonGrowthPct.toFixed(1)}%`;
  return (
    <div className="mb-4 flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
      <div className="min-w-0 text-left">
        <h2 id="fire-wealth-simulator-heading" className="text-lg font-black leading-snug text-emerald-950 sm:text-xl">
          Wealth lifecycle simulator
        </h2>
        <p className="text-[11px] leading-relaxed text-slate-500 sm:text-xs">
          Green = growth; orange = drawdown. FIRE ~{result.fireAge} · amounts in NPR (millions on axis).
        </p>
      </div>
      <span className="shrink-0 self-start rounded-full border border-emerald-100/80 bg-emerald-50/95 px-2.5 py-0.5 text-[11px] font-black text-emerald-700 shadow-[0_1px_0_rgba(255,255,255,0.7)_inset] sm:self-center sm:px-3 sm:py-1 sm:text-xs">
        Horizon {badge}
      </span>
    </div>
  );
}

function WealthSimulatorAlerts() {
  const { wealthResult, legacyMode } = useFireCalculator();
  const depletion = wealthResult.depletionAge;
  const solvent = wealthResult.solventThroughAge;

  return (
    <div className="space-y-1.5">
      {depletion !== null ? (
        <p className="rounded-xl border border-orange-200 bg-orange-50/90 px-3 py-2 text-xs font-bold text-orange-950">
          Wealth may run out around age <span className="font-black">{Math.round(depletion)}</span> in this scenario
          (inflation + withdrawals).
        </p>
      ) : (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50/90 px-3 py-2 text-xs font-bold text-emerald-950">
          Sustainable through about age <span className="font-black">{Math.round(solvent)}</span> in the simulator
          horizon (balance stays positive).
        </p>
      )}
      {legacyMode === "perpetual" && wealthResult.perpetualShortfall ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50/90 px-3 py-2 text-xs font-bold text-amber-950">
          Perpetual mode: inflation-tracked spending often exceeds the SWR cap — draws are capped, so the orange line
          reflects constrained spending.
        </p>
      ) : null}
      <p className="text-[11px] font-bold leading-relaxed text-slate-500">
        Dashed verticals: teal = FIRE achieved, amber = peak wealth, red = modelled depletion. Not financial advice.
      </p>
    </div>
  );
}

export function FireDashboardSection() {
  return (
    <FireCalculatorProvider>
      <div
        id="calculator"
        className="grid min-w-0 grid-cols-1 gap-4 sm:gap-5 md:gap-6 lg:auto-rows-fr lg:grid-cols-3 lg:items-stretch lg:gap-5 xl:gap-6"
      >
        <div className="flex h-full min-h-0 min-w-0">
          <FireCalculatorInputs />
        </div>
        <div className="flex h-full min-h-0 min-w-0">
          <FireRetirementProjection />
        </div>
        <div className="flex h-full min-h-0 min-w-0">
          <section
            aria-labelledby="fire-wealth-simulator-heading"
            className={`${FIRE_CALCULATOR_PANEL_CLASS} flex h-full min-h-0 w-full flex-col p-5 sm:p-6`}
          >
            <SavingsGrowthHeader />
            <div className="flex min-h-[12rem] flex-1 flex-col items-center justify-center py-2 sm:min-h-[13rem] sm:py-3">
              <div className="relative aspect-[16/9] w-full max-w-full min-h-[10.5rem] max-h-[17.5rem] sm:max-h-[19rem] lg:max-h-[20rem]">
                <div className="absolute inset-0 min-h-0">
                  <SavingsChart />
                </div>
              </div>
            </div>
            <div className="mt-auto flex shrink-0 flex-col gap-3">
              <WealthSimulatorAlerts />
              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/65 bg-gradient-to-b from-white/85 to-emerald-50/40 py-2.5 text-sm font-black text-emerald-800 shadow-[0_1px_0_rgba(255,255,255,0.85)_inset,0_6px_22px_rgba(0,63,47,0.06)] backdrop-blur transition hover:border-emerald-200/80 hover:bg-emerald-50/75 sm:py-3"
              >
                <LineChart size={15} /> How Compound Interest Works?
              </button>
            </div>
          </section>
        </div>
      </div>
    </FireCalculatorProvider>
  );
}
