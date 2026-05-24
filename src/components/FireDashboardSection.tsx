"use client";

import { LineChart } from "lucide-react";
import { FireCalculatorInputs, FireRetirementProjection } from "@/components/FireCalculator";
import { FireCalculatorProvider, useFireCalculator } from "@/components/FireCalculatorContext";
import { SavingsChart } from "@/components/SavingsChart";

function SavingsGrowthHeader() {
  const { horizonGrowthPct, result, currency } = useFireCalculator();
  const badge =
    horizonGrowthPct === null
      ? "—"
      : `${horizonGrowthPct >= 0 ? "+" : ""}${horizonGrowthPct.toFixed(1)}%`;
  return (
    <div className="mb-2 flex flex-col gap-1.5 sm:mb-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h2 className="text-lg font-black leading-snug text-emerald-950 sm:text-xl">Wealth lifecycle simulator</h2>
        <p className="text-[11px] leading-relaxed text-slate-500 sm:text-xs">
          Green = growth; orange = drawdown. FIRE ~{result.fireAge} · {currency} scale.
        </p>
      </div>
      <span className="shrink-0 self-start rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-black text-emerald-700 sm:px-3 sm:py-1 sm:text-xs">
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
    <div className="mt-2 space-y-1.5">
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
      <div id="calculator" className="grid min-w-0 grid-cols-1 gap-5 md:gap-6 lg:grid-cols-3 lg:items-start lg:gap-5 xl:gap-6">
        <div className="min-w-0">
          <FireCalculatorInputs />
        </div>
        <div className="min-w-0">
          <FireRetirementProjection />
        </div>
        <section className="glass-card soft-gradient-border hover-lift min-w-0 rounded-[1.7rem] p-4 sm:p-5">
          <SavingsGrowthHeader />
          <div className="h-[220px] w-full min-h-[200px] sm:h-[236px] lg:h-[248px]">
            <SavingsChart />
          </div>
          <WealthSimulatorAlerts />
          <button
            type="button"
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/60 bg-white/70 py-2.5 text-sm font-black text-emerald-800 shadow-sm backdrop-blur transition hover:bg-emerald-50 sm:mt-3.5 sm:py-3"
          >
            <LineChart size={15} /> How Compound Interest Works?
          </button>
        </section>
      </div>
    </FireCalculatorProvider>
  );
}
