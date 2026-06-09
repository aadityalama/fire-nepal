"use client";

import { Calculator, CircleDollarSign, Flame, PiggyBank, TrendingUp } from "lucide-react";
import { NumericMoneyInput } from "@/components/NumericMoneyInput";
import { useFireCalculator } from "@/components/FireCalculatorContext";

/** Shared shell for homepage FIRE trio (inputs · projection · chart). */
export const FIRE_CALCULATOR_PANEL_CLASS =
  "glass-card soft-gradient-border hover-lift fire-calculator-panel ring-1 ring-emerald-950/[0.045] transition-[box-shadow,transform,border-color] duration-300 ease-out dark:ring-emerald-500/12 rounded-[1.65rem]";

/** Left column: inputs + drawdown controls (desktop 3-column layout). */
export function FireCalculatorInputs() {
  const {
    currentSavingsNpr,
    setCurrentSavingsNpr,
    monthlySavingsNpr,
    setMonthlySavingsNpr,
    currentAge,
    setCurrentAge,
    annualReturnPct,
    setAnnualReturnPct,
    monthlyExpenseNpr,
    setMonthlyExpenseNpr,
    expenseInflationAnnualPct,
    setExpenseInflationAnnualPct,
    safeWithdrawalRatePct,
    setSafeWithdrawalRatePct,
    legacyMode,
    setLegacyMode,
    spenddownTargetAge,
    setSpenddownTargetAge,
  } = useFireCalculator();

  const nprPrefix = "रु";

  const savingsRateEstimate =
    (monthlyExpenseNpr ?? 0) > 0
      ? Math.min(
          100,
          Math.round(
            ((monthlySavingsNpr ?? 0) / ((monthlySavingsNpr ?? 0) + (monthlyExpenseNpr ?? 0))) * 100,
          ),
        )
      : 0;

  return (
    <section
      aria-labelledby="fire-calculator-heading"
      className={`${FIRE_CALCULATOR_PANEL_CLASS} flex h-full min-h-0 flex-col p-5 sm:p-6`}
    >
      <div className="mb-4 flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-2.5 sm:items-center">
          <Calculator className="mt-0.5 shrink-0 text-emerald-700 sm:mt-0" size={20} />
          <div className="min-w-0">
            <h2
              id="fire-calculator-heading"
              className="text-lg font-black leading-snug tracking-tight text-emerald-950 sm:text-xl"
            >
              FIRE Calculator
            </h2>
            <p className="text-xs font-bold leading-snug text-slate-500 sm:text-sm">Retirement planning for Nepal</p>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3.5 sm:gap-4">
        <NumericMoneyInput
          label="Current savings"
          prefix={nprPrefix}
          value={currentSavingsNpr}
          onChange={setCurrentSavingsNpr}
          placeholder="Enter amount"
          variant="amount"
        />
        <NumericMoneyInput
          label="Monthly savings"
          prefix={nprPrefix}
          value={monthlySavingsNpr}
          onChange={setMonthlySavingsNpr}
          placeholder="Enter amount"
          variant="amount"
        />
        <div className="grid gap-3.5 sm:grid-cols-2 sm:gap-4">
          <NumericMoneyInput
            label="Current age"
            value={currentAge}
            onChange={setCurrentAge}
            suffix="years"
            variant="integer"
            placeholder="Enter age"
          />
          <NumericMoneyInput
            label="Annual return"
            value={annualReturnPct}
            onChange={setAnnualReturnPct}
            suffix="%"
            variant="percent"
            placeholder="e.g. 10"
          />
        </div>
        <NumericMoneyInput
          label="Nepal monthly expense after retirement"
          prefix={nprPrefix}
          value={monthlyExpenseNpr}
          onChange={setMonthlyExpenseNpr}
          placeholder="Enter amount"
          variant="amount"
        />

        <div className="space-y-3 rounded-2xl border border-white/75 bg-gradient-to-br from-white/80 to-emerald-50/35 p-3.5 shadow-[0_1px_0_rgba(255,255,255,0.75)_inset,0_8px_28px_rgba(0,63,47,0.05)] backdrop-blur sm:space-y-4 sm:p-4">
          <p className="text-[11px] font-black uppercase tracking-wide text-emerald-900">Wealth simulator (drawdown)</p>
          <div className="grid gap-3.5 sm:grid-cols-2 sm:gap-4">
            <NumericMoneyInput
              label="Retirement expense inflation (annual)"
              value={expenseInflationAnnualPct}
              onChange={setExpenseInflationAnnualPct}
              suffix="%"
              variant="percent"
              placeholder="e.g. 3"
            />
            <NumericMoneyInput
              label="Safe withdrawal rate (planning)"
              value={safeWithdrawalRatePct}
              onChange={setSafeWithdrawalRatePct}
              suffix="% / yr"
              variant="percent"
              placeholder="e.g. 4"
            />
          </div>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-slate-500 sm:text-sm">Legacy mode</span>
            <select
              value={legacyMode}
              onChange={(e) => setLegacyMode(e.target.value as "default" | "perpetual" | "spenddown")}
              className="w-full rounded-2xl border border-white/70 bg-white/90 px-3 py-2.5 text-xs font-black text-emerald-950 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 sm:px-4 sm:py-3 sm:text-sm"
            >
              <option value="default">Default — full inflation-tracked spending</option>
              <option value="perpetual">Preserve — cap monthly draw to SWR × portfolio</option>
              <option value="spenddown">Spend down — raise draws to target emptying by age</option>
            </select>
          </label>
          {legacyMode === "spenddown" ? (
            <NumericMoneyInput
              label="Spend-down target age"
              value={spenddownTargetAge}
              onChange={(n) =>
                setSpenddownTargetAge(
                  n === undefined ? undefined : Math.round(Math.max((currentAge ?? 30) + 2, n)),
                )
              }
              suffix="years"
              variant="integer"
              placeholder="e.g. 92"
            />
          ) : null}
        </div>

        <div className="mt-auto shrink-0 rounded-2xl border border-emerald-100/75 bg-gradient-to-r from-emerald-50/90 via-white/50 to-lime-50/40 p-3 shadow-[0_1px_0_rgba(255,255,255,0.65)_inset] sm:p-3.5">
          <div className="mb-1.5 flex justify-between text-xs font-black text-emerald-900 sm:text-sm">
            <span>Estimated savings strength</span>
            <span>{savingsRateEstimate}%</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-white sm:h-3">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-700 to-lime-400 transition-all duration-700 ease-out"
              style={{ width: `${savingsRateEstimate}%` }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

/** Center column: FIRE age, 2×2 metrics, progress (desktop 3-column layout). */
export function FireRetirementProjection() {
  const { result, formatMoney, wealthParams } = useFireCalculator();
  const passiveMonthlyNpr = (result.projectedCorpusNpr * wealthParams.safeWithdrawalRatePct) / 100 / 12;

  return (
    <section className={`${FIRE_CALCULATOR_PANEL_CLASS} flex h-full min-h-0 flex-col p-5 text-center sm:p-6`}>
      <div className="flex min-h-0 w-full flex-1 flex-col gap-4">
        <p className="shrink-0 text-sm font-black leading-snug text-emerald-950 sm:text-base">Your Retirement Projection</p>

        <div className="shrink-0 rounded-2xl border border-white/65 bg-gradient-to-br from-emerald-50/92 via-white/78 to-white/60 p-3.5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_10px_36px_rgba(0,63,47,0.06)] backdrop-blur sm:p-4">
          <p className="text-xs font-bold text-slate-500 sm:text-sm">Dynamic FIRE age</p>
          <p className="mt-0.5 text-3xl font-black tracking-tight text-emerald-800 sm:text-4xl lg:text-[2.35rem] lg:leading-tight xl:text-4xl">
            {result.fireAge}{" "}
            <span className="text-sm font-bold text-slate-500 sm:text-base">years old</span>
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-600 sm:text-sm">
            {result.monthsToFire === 0
              ? "You are already at your FIRE corpus target."
              : `${result.yearsToFire.toFixed(1)} years until financial independence in Nepal.`}
          </p>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-2.5 sm:gap-3">
          {[
            ["Required corpus", formatMoney(result.requiredCorpusNpr), CircleDollarSign],
            ["Projected corpus", formatMoney(result.projectedCorpusNpr), TrendingUp],
            ["Monthly passive income (at SWR)", formatMoney(passiveMonthlyNpr), PiggyBank],
            ["Years until FIRE", result.monthsToFire === 0 ? "Ready now" : `${result.yearsToFire.toFixed(1)} years`, Flame],
          ].map(([label, value, Icon]) => {
            const MetricIcon = Icon as typeof CircleDollarSign;

            return (
              <div
                key={label as string}
                className="flex h-full min-h-0 flex-col rounded-xl border border-white/72 bg-gradient-to-b from-white/88 to-white/65 p-3 text-left shadow-[0_1px_0_rgba(255,255,255,0.8)_inset,0_6px_22px_rgba(0,63,47,0.05)] backdrop-blur transition-shadow hover:border-emerald-200/60 hover:shadow-[0_10px_32px_rgba(0,122,61,0.08)] sm:p-3.5"
              >
                <MetricIcon className="mb-1.5 shrink-0 text-emerald-700" size={16} />
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 sm:text-[11px]">{label as string}</p>
                <p className="mt-auto pt-1 text-sm font-black leading-tight text-emerald-950 sm:text-base">{value as string}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-auto shrink-0 rounded-xl border border-white/68 bg-gradient-to-br from-white/62 to-emerald-50/35 p-2.5 text-left shadow-[0_1px_0_rgba(255,255,255,0.75)_inset,0_8px_26px_rgba(0,63,47,0.05)] backdrop-blur sm:p-3">
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="text-[11px] font-black text-emerald-950 sm:text-xs">Progress toward FIRE</span>
            <span className="shrink-0 tabular-nums text-xs font-black text-emerald-800 sm:text-sm">{result.progressPct}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/85 ring-1 ring-emerald-950/5 sm:h-2">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-600/85 via-emerald-500/75 to-lime-300/90 transition-all duration-700 ease-out"
              style={{ width: `${result.progressPct}%` }}
            />
          </div>
          <p className="mt-1.5 text-[10px] leading-relaxed text-slate-500 sm:text-[11px]">
            Required corpus = annual Nepal retirement expense × 25. Chart uses inflation on expenses after FIRE and your
            SWR setting for passive-income display.
          </p>
        </div>
      </div>
    </section>
  );
}

/** Stacked calculator + projection (e.g. narrow viewports). */
export function FireCalculator() {
  return (
    <div className="flex min-w-0 flex-col gap-4 sm:gap-5 md:gap-6">
      <FireCalculatorInputs />
      <FireRetirementProjection />
    </div>
  );
}
