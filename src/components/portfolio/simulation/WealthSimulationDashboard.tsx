"use client";

import { ArrowLeft, FlaskConical, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { startTransition, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { CASHFLOW_EXTERNAL_SYNC_EVENT } from "@/components/cashflow/portfolio-dividend-sync";
import { CASHFLOW_STORAGE_KEY, loadCashflowState } from "@/components/cashflow/cashflow-storage";
import { readCashflowSalaryNprHint } from "@/components/payslip-import/apply-payslip-to-cashflow";
import { DashboardSectionHeader } from "@/components/DashboardSectionHeader";
import {
  computeWealthTotals,
  fireReadinessScore,
  passiveIncomeMonthlyNpr,
} from "@/components/portfolio/calculations";
import { defaultWealthState, loadWealthPortfolioState, STORAGE_KEY_V2 } from "@/components/portfolio/storage";
import { SimulationProjectionChart } from "@/components/portfolio/simulation/SimulationProjectionChart";
import {
  applyScenario,
  buildFireSimulation,
  defaultMonthlySpendFromPortfolio,
  dynamicFireProbability,
  fxSensitivityRange,
  inferDefaultAgeFromPortfolio,
  marketCrashSimulation,
  nprToCurrency,
  scenarioDeltaYearsToFi,
  type ScenarioId,
  type SimCurrency,
  type WealthSimulationParams,
} from "@/components/portfolio/simulation/wealth-simulation-engine";
import { buildSimulationInsights, scenarioHeadline } from "@/components/portfolio/simulation/wealth-simulation-insights";
import { WealthDashboardShell } from "@/components/portfolio/WealthDashboardShell";
import type { WealthPortfolioStateV2 } from "@/components/portfolio/types";
import { FALLBACK_USD_PER_NPR, fetchNprCrossRates } from "@/lib/portfolio-convert";
import { FALLBACK_KRW_PER_NPR } from "@/lib/exchange-rate";
import { formatMoney } from "@/lib/expense-utils";

function pct(n: number): string {
  if (!Number.isFinite(n)) return "0";
  return `${(n * 100).toFixed(1)}%`;
}

function glass(extra: string) {
  return [
    "relative min-w-0 max-w-full overflow-hidden rounded-[1.25rem] border border-emerald-400/14",
    "bg-gradient-to-br from-white/[0.06] via-emerald-950/12 to-black/35 backdrop-blur-xl",
    "shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset,0_18px_48px_-26px_rgba(0,0,0,0.5)]",
    "p-4 sm:p-5 lg:p-6",
    extra,
  ].join(" ");
}

function useNarrowViewport(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window === "undefined") return () => {};
      const mq = window.matchMedia("(max-width: 639px)");
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => (typeof window !== "undefined" ? window.matchMedia("(max-width: 639px)").matches : false),
    () => false,
  );
}

export function WealthSimulationDashboard() {
  const narrow = useNarrowViewport();
  const [state, setState] = useState<WealthPortfolioStateV2>(defaultWealthState);
  const [hydrated, setHydrated] = useState(false);
  const [krwPerNpr, setKrwPerNpr] = useState(FALLBACK_KRW_PER_NPR);
  const [usdPerNpr, setUsdPerNpr] = useState(FALLBACK_USD_PER_NPR);
  const [ratesLoading, setRatesLoading] = useState(true);
  const [monthlyDividendNpr, setMonthlyDividendNpr] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [displayCurrency, setDisplayCurrency] = useState<SimCurrency>("NPR");
  const [activeScenario, setActiveScenario] = useState<ScenarioId>("baseline");
  const [cashflowSalaryNpr, setCashflowSalaryNpr] = useState(0);

  const [currentAge, setCurrentAge] = useState(35);
  const [monthlySpend, setMonthlySpend] = useState(120_000);
  const [monthlyContribution, setMonthlyContribution] = useState(45_000);
  const [nominalReturn, setNominalReturn] = useState(0.072);
  const [inflation, setInflation] = useState(0.055);
  const [salaryGrowth, setSalaryGrowth] = useState(0.03);
  const [passiveGrowth, setPassiveGrowth] = useState(0.02);
  const [swr, setSwr] = useState(0.04);

  const seededRef = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const sync = () => setCashflowSalaryNpr(readCashflowSalaryNprHint());
    sync();
    window.addEventListener(CASHFLOW_EXTERNAL_SYNC_EVENT, sync);
    return () => window.removeEventListener(CASHFLOW_EXTERNAL_SYNC_EVENT, sync);
  }, []);

  useEffect(() => {
    setState(loadWealthPortfolioState());
    setHydrated(true);
  }, []);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_V2) setState(loadWealthPortfolioState());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setRatesLoading(true);
    fetchNprCrossRates().then((r) => {
      if (cancelled) return;
      setKrwPerNpr(r.krwPerNpr);
      setUsdPerNpr(r.usdPerNpr);
      setRatesLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const read = () => setMonthlyDividendNpr(loadCashflowState().income.dividendIncome ?? 0);
    read();
    const onExternal = () => read();
    const onStorage = (e: StorageEvent) => {
      if (e.key === CASHFLOW_STORAGE_KEY) read();
    };
    window.addEventListener(CASHFLOW_EXTERNAL_SYNC_EVENT, onExternal);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(CASHFLOW_EXTERNAL_SYNC_EVENT, onExternal);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const totals = useMemo(() => computeWealthTotals(state, krwPerNpr, usdPerNpr), [state, krwPerNpr, usdPerNpr]);
  const passiveMonthly = useMemo(
    () =>
      passiveIncomeMonthlyNpr(totals.investableNpr, {
        monthlyCashDividendNpr: monthlyDividendNpr,
        monthlyFixedDepositInterestNpr: totals.fixedDepositsEstimatedMonthlyIncomeNpr,
      }),
    [totals.investableNpr, totals.fixedDepositsEstimatedMonthlyIncomeNpr, monthlyDividendNpr],
  );
  const fireScore = useMemo(() => fireReadinessScore(totals), [totals]);
  const debtRatio = useMemo(
    () => (totals.totalAssetsNpr > 0 ? totals.liabilitiesNpr / totals.totalAssetsNpr : 0),
    [totals],
  );
  const investableShare = useMemo(
    () => (totals.totalAssetsNpr > 0 ? totals.investableNpr / totals.totalAssetsNpr : 0),
    [totals],
  );

  useEffect(() => {
    if (!hydrated || seededRef.current) return;
    seededRef.current = true;
    setCurrentAge(inferDefaultAgeFromPortfolio(state.globalRetirementAssets));
    setMonthlySpend(defaultMonthlySpendFromPortfolio(totals, passiveMonthly));
    setMonthlyContribution(
      Math.round(Math.max(25_000, Math.min(400_000, totals.investableNpr * 0.004 + passiveMonthly * 0.25))),
    );
  }, [hydrated, state.globalRetirementAssets, totals, passiveMonthly]);

  const userBaseParams = useMemo(
    (): WealthSimulationParams => ({
      currentAge,
      monthlySpendNpr: Math.max(0, monthlySpend),
      swrAnnual: swr,
      startingNetWorthNpr: Math.max(0, totals.netWorthNpr),
      monthlyContributionNpr: Math.max(0, monthlyContribution),
      nominalReturnAnnual: nominalReturn,
      inflationAnnual: inflation,
      salaryGrowthAnnual: salaryGrowth,
      passiveMonthlyStartNpr: Math.max(0, passiveMonthly),
      passiveGrowthAnnual: passiveGrowth,
    }),
    [
      currentAge,
      monthlySpend,
      swr,
      totals.netWorthNpr,
      monthlyContribution,
      nominalReturn,
      inflation,
      salaryGrowth,
      passiveMonthly,
      passiveGrowth,
    ],
  );

  const effectiveParams = useMemo(
    () => applyScenario(userBaseParams, activeScenario, krwPerNpr),
    [userBaseParams, activeScenario, krwPerNpr],
  );

  const sim = useMemo(
    () =>
      buildFireSimulation(effectiveParams, {
        maxYears: 45,
        fireReadinessScore: fireScore,
        debtRatio,
      }),
    [effectiveParams, fireScore, debtRatio],
  );

  const baselineSim = useMemo(
    () =>
      buildFireSimulation(userBaseParams, {
        maxYears: 45,
        fireReadinessScore: fireScore,
        debtRatio,
      }),
    [userBaseParams, fireScore, debtRatio],
  );

  const crash = useMemo(
    () =>
      marketCrashSimulation({
        netWorthNpr: totals.netWorthNpr,
        monthlySpendNpr: Math.max(1, monthlySpend),
        investableShare: clamp01(investableShare),
        liquidMonthlyNpr: totals.liquidNpr + passiveMonthly * 2,
        monthlyContributionNpr: monthlyContribution,
        nominalReturnAnnual: nominalReturn,
        inflationAnnual: inflation,
        crashDrawdownPct: 0.35,
      }),
    [totals.netWorthNpr, totals.liquidNpr, monthlySpend, investableShare, passiveMonthly, monthlyContribution, nominalReturn, inflation],
  );

  const fmt = useCallback(
    (npr: number) => formatMoney(Math.round(nprToCurrency(npr, displayCurrency, krwPerNpr, usdPerNpr)), displayCurrency),
    [displayCurrency, krwPerNpr, usdPerNpr],
  );

  const displayFnChart = useCallback(
    (npr: number) => formatMoney(Math.round(nprToCurrency(npr, displayCurrency, krwPerNpr, usdPerNpr)), displayCurrency),
    [displayCurrency, krwPerNpr, usdPerNpr],
  );

  const insights = useMemo(
    () =>
      buildSimulationInsights({
        fireAge: sim.fireAge,
        yearsToFi: sim.yearsToFi,
        fireProbabilityPct: sim.fireProbabilityPct,
        corpusNpr: sim.corpusNpr,
        monthlyContributionNpr: effectiveParams.monthlyContributionNpr,
        passiveMonthlyNpr: effectiveParams.passiveMonthlyStartNpr,
        crash,
        activeScenario,
        displayCurrency,
      }),
    [sim, effectiveParams, crash, activeScenario, displayCurrency],
  );

  const headline = useMemo(
    () => scenarioHeadline(activeScenario, sim.fireAge, sim.yearsToFi),
    [activeScenario, sim.fireAge, sim.yearsToFi],
  );

  const scenarioChips: { id: ScenarioId; label: string }[] = [
    { id: "baseline", label: "Baseline" },
    { id: "invest_krw_800k", label: "+ ₩800k / mo" },
    { id: "invest_plus_20pct", label: "+20% invest" },
    { id: "spend_cut_12pct", label: "Spend −12%" },
    { id: "savings_rate_drop", label: "Savings −28%" },
    { id: "market_crash_35", label: "−35% shock" },
    { id: "inflation_6", label: "Inflation 6%" },
    { id: "passive_double", label: "Passive ×2" },
    { id: "salary_boost", label: "Salary +2% / yr" },
  ];

  const investScenarioDelta = useMemo(
    () => scenarioDeltaYearsToFi(userBaseParams, "invest_krw_800k", krwPerNpr, { fireReadinessScore: fireScore, debtRatio }),
    [userBaseParams, krwPerNpr, fireScore, debtRatio],
  );

  return (
    <WealthDashboardShell
      brand={{ tagline: "Future Engine", iconGradient: "from-cyan-400 to-emerald-400" }}
      footerNote={<>NPR engine · FX display via live NPR cross.{ratesLoading ? " Rates…" : ""}</>}
    >
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/portfolio"
            className="inline-flex min-h-[44px] w-fit items-center gap-2 rounded-full border border-emerald-400/18 bg-white/[0.06] px-3.5 py-2.5 text-xs font-black text-emerald-50/95 backdrop-blur-md transition duration-300 active:scale-[0.98] hover:border-emerald-300/35 hover:bg-white/10 sm:text-sm"
          >
            <ArrowLeft size={15} /> Portfolio
          </Link>
          <Link
            href="/"
            className="inline-flex min-h-[44px] w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-xs font-bold text-zinc-300 transition hover:border-white/20 hover:text-white sm:text-sm"
          >
            Home
          </Link>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-bold text-emerald-200/70 sm:text-xs">
          <FlaskConical size={14} className="text-cyan-300" />
          Wealth simulation
        </div>
      </div>

      <div className="flex min-w-0 max-w-full flex-col gap-7 sm:gap-8 lg:gap-10">
        <DashboardSectionHeader
          accent="teal"
          eyebrow="FIRE Nepal · forward engine"
          title="Model the next decade with institutional calm."
          subtitle="Deterministic projections from your stored portfolio—adjust assumptions, stress scenarios, and read the trade-offs in NPR, KRW, or USD."
        />

        <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">
          {(["NPR", "KRW", "USD"] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setDisplayCurrency(c)}
              className={`min-h-[44px] rounded-full border px-4 py-2 text-xs font-black uppercase tracking-wide transition ${
                displayCurrency === c
                  ? "border-cyan-400/40 bg-cyan-500/15 text-cyan-50"
                  : "border-white/10 bg-black/20 text-zinc-400 hover:border-white/20 hover:text-zinc-200"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="grid min-w-0 max-w-full grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
          {[
            {
              label: "FIRE age (model)",
              value: sim.fireAge != null ? String(Math.round(sim.fireAge)) : "Beyond horizon",
              hint: sim.yearsToFi != null ? `${sim.yearsToFi.toFixed(1)} years to target` : "Raise savings or return",
            },
            {
              label: "FIRE probability",
              value: `${sim.fireProbabilityPct}%`,
              hint: "Blended surface (not a guarantee)",
            },
            {
              label: "Corpus target",
              value: fmt(sim.corpusNpr),
              hint: `Spend ${fmt(monthlySpend)}/mo @ ${pct(swr)} SWR`,
            },
            {
              label: "Readiness vs corpus",
              value: `${Math.round(Math.min(199, sim.retirementReadyRatio * 100))}%`,
              hint: "Net worth ÷ modeled corpus",
            },
          ].map((k) => (
            <div key={k.label} className={glass("")}>
              <p className="text-[10px] font-black uppercase tracking-wide text-emerald-200/65">{k.label}</p>
              <p className="mt-2 break-words text-xl font-black tabular-nums text-white sm:text-2xl">{k.value}</p>
              <p className="mt-1 text-pretty text-[11px] font-semibold leading-snug text-zinc-500">{k.hint}</p>
            </div>
          ))}
        </div>

        <div className="grid min-w-0 max-w-full gap-5 lg:grid-cols-12">
          <div className={`${glass("lg:col-span-5")} flex min-w-0 flex-col gap-4`}>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200/70">Assumptions</p>
            <label className="block text-[11px] font-bold text-zinc-400">
              Current age
              <input
                type="number"
                min={18}
                max={80}
                value={currentAge}
                onChange={(e) => setCurrentAge(clampNum(Number(e.target.value), 18, 80))}
                className="mt-1.5 min-h-[44px] w-full min-w-0 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm font-semibold text-white outline-none focus:border-cyan-400/35"
              />
            </label>
            <label className="block text-[11px] font-bold text-zinc-400">
              Monthly spend (lifestyle)
              <input
                type="number"
                min={0}
                step={1000}
                value={Math.round(monthlySpend)}
                onChange={(e) => setMonthlySpend(Math.max(0, Number(e.target.value) || 0))}
                className="mt-1.5 min-h-[44px] w-full min-w-0 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm font-semibold text-white outline-none focus:border-cyan-400/35"
              />
            </label>
            <label className="block text-[11px] font-bold text-zinc-400">
              Monthly invest (add to NW)
              <input
                type="number"
                min={0}
                step={1000}
                value={Math.round(monthlyContribution)}
                onChange={(e) => setMonthlyContribution(Math.max(0, Number(e.target.value) || 0))}
                className="mt-1.5 min-h-[44px] w-full min-w-0 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm font-semibold text-white outline-none focus:border-cyan-400/35"
              />
            </label>
            {cashflowSalaryNpr > 0 ? (
              <p className="text-[10px] font-semibold leading-relaxed text-cyan-200/75">
                Cashflow salary (NPR/mo, after payslip import):{" "}
                <span className="font-black text-cyan-100">{fmt(cashflowSalaryNpr)}</span> ·{" "}
                <Link href="/cashflow-dashboard#payslip-import" className="font-bold text-cyan-300/90 underline-offset-2 hover:underline">
                  Update from Korean payslip
                </Link>
              </p>
            ) : null}
            <label className="block text-[11px] font-bold text-zinc-400">
              Nominal return / yr
              <input
                type="number"
                min={0}
                max={30}
                step={0.1}
                value={Number((nominalReturn * 100).toFixed(2))}
                onChange={(e) => setNominalReturn(clampNum((Number(e.target.value) || 0) / 100, 0, 0.25))}
                className="mt-1.5 min-h-[44px] w-full min-w-0 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm font-semibold text-white outline-none focus:border-cyan-400/35"
              />
            </label>
            <label className="block text-[11px] font-bold text-zinc-400">
              Inflation / yr
              <input
                type="number"
                min={0}
                max={20}
                step={0.1}
                value={Number((inflation * 100).toFixed(2))}
                onChange={(e) => setInflation(clampNum((Number(e.target.value) || 0) / 100, 0, 0.2))}
                className="mt-1.5 min-h-[44px] w-full min-w-0 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm font-semibold text-white outline-none focus:border-cyan-400/35"
              />
            </label>
            <label className="block text-[11px] font-bold text-zinc-400">
              Salary growth on contribution / yr
              <input
                type="number"
                min={0}
                max={15}
                step={0.1}
                value={Number((salaryGrowth * 100).toFixed(2))}
                onChange={(e) => setSalaryGrowth(clampNum((Number(e.target.value) || 0) / 100, 0, 0.15))}
                className="mt-1.5 min-h-[44px] w-full min-w-0 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm font-semibold text-white outline-none focus:border-cyan-400/35"
              />
            </label>
            <label className="block text-[11px] font-bold text-zinc-400">
              Passive income growth / yr
              <input
                type="number"
                min={0}
                max={15}
                step={0.1}
                value={Number((passiveGrowth * 100).toFixed(2))}
                onChange={(e) => setPassiveGrowth(clampNum((Number(e.target.value) || 0) / 100, 0, 0.15))}
                className="mt-1.5 min-h-[44px] w-full min-w-0 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm font-semibold text-white outline-none focus:border-cyan-400/35"
              />
            </label>
            <label className="block text-[11px] font-bold text-zinc-400">
              SWR (withdrawal rate)
              <input
                type="number"
                min={2}
                max={8}
                step={0.1}
                value={Number((swr * 100).toFixed(2))}
                onChange={(e) => setSwr(clampNum((Number(e.target.value) || 4) / 100, 0.02, 0.08))}
                className="mt-1.5 min-h-[44px] w-full min-w-0 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm font-semibold text-white outline-none focus:border-cyan-400/35"
              />
            </label>
            <p className="text-[10px] font-medium leading-relaxed text-zinc-500">
              Starting wealth uses your dashboard net worth ({fmt(totals.netWorthNpr)}). Passive starts from modeled passive income.
            </p>
          </div>

          <div className={`${glass("lg:col-span-7")} flex min-w-0 flex-col gap-4`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200/70">Projection</p>
              <span className="text-[10px] font-bold text-zinc-500">Nominal · real · flows · stress overlay</span>
            </div>
            <SimulationProjectionChart
              pathBundle={sim.pathBundle}
              params={effectiveParams}
              corpusNpr={sim.corpusNpr}
              monthsToFi={sim.monthsToFi}
              currentAge={currentAge}
              displayFn={displayFnChart}
              reducedMotion={reduceMotion}
              crash={crash}
              narrow={narrow}
            />
            {headline ? (
              <p className="rounded-lg border border-cyan-400/20 bg-cyan-950/25 px-3 py-2 text-sm font-semibold leading-snug text-cyan-50/95">
                {headline}
              </p>
            ) : null}
            {activeScenario === "invest_krw_800k" && investScenarioDelta.deltaYears != null ? (
              <p className="text-[12px] font-medium text-zinc-400">
                ₩800k/month scenario shifts modeled years-to-target by approximately{" "}
                <span className="font-black text-emerald-200/90">{investScenarioDelta.deltaYears.toFixed(1)}</span> years vs
                baseline (same other assumptions).
              </p>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {sim.horizons.map((h) => {
            const fx = fxSensitivityRange(h.nominalNpr, displayCurrency, krwPerNpr, usdPerNpr);
            return (
              <div key={h.years} className={glass("p-4 sm:p-5")}>
                <p className="text-[10px] font-black uppercase tracking-wide text-zinc-500">{h.years}-year horizon</p>
                <p className="mt-2 text-lg font-black text-white">{fmt(h.nominalNpr)}</p>
                <p className="text-[11px] font-semibold text-zinc-500">Nominal · converted</p>
                <p className="mt-3 text-sm font-bold text-zinc-200">{fmt(h.realNpr)}</p>
                <p className="text-[11px] font-semibold text-zinc-500">Real (today’s NPR)</p>
                {displayCurrency !== "NPR" ? (
                  <p className="mt-3 text-[10px] font-medium leading-relaxed text-zinc-500">
                    FX ±10% band: {formatMoney(Math.round(fx.low), displayCurrency)} – {formatMoney(Math.round(fx.high), displayCurrency)}
                  </p>
                ) : (
                  <p className="mt-3 text-[10px] text-zinc-500">Inflation impact embedded in real series.</p>
                )}
              </div>
            );
          })}
        </div>

        <div className={glass("p-5 sm:p-6")}>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200/70">Scenario lab</p>
          <p className="mt-2 text-sm font-medium text-zinc-400">
            Tap a preset. It layers on your current sliders—switch back to Baseline to compare cleanly.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {scenarioChips.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => startTransition(() => setActiveScenario(s.id))}
                className={`min-h-[44px] rounded-full border px-3.5 py-2 text-[11px] font-black uppercase tracking-wide transition-colors duration-200 ${
                  activeScenario === s.id
                    ? "border-emerald-400/45 bg-emerald-500/15 text-emerald-50"
                    : "border-white/10 bg-black/25 text-zinc-400 hover:border-white/20 hover:text-zinc-200"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className={glass("p-5 sm:p-6")}>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-amber-200/80">
              <ShieldAlert className="h-4 w-4" />
              Market stress (illustrative)
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-[10px] font-bold uppercase text-zinc-500">Resilience</dt>
                <dd className="font-black text-white">{crash.resilienceScore}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase text-zinc-500">Survival (heuristic)</dt>
                <dd className="font-black text-emerald-200">{crash.survivalProbabilityPct}%</dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase text-zinc-500">Recovery (nominal)</dt>
                <dd className="font-black text-white">{crash.recoveryMonths != null ? `${crash.recoveryMonths} mo` : "60+ mo"}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase text-zinc-500">Defensive strength</dt>
                <dd className="font-black text-cyan-100">{crash.defensiveStrength}</dd>
              </div>
            </dl>
            <p className="mt-4 text-[11px] font-medium leading-relaxed text-zinc-500">
              Shock applies roughly to investable-weighted net worth; recovery assumes unchanged contributions and nominal return.
            </p>
          </div>
          <div className={glass("p-5 sm:p-6")}>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200/70">Desk insights</p>
            <ul className="mt-3 space-y-2.5 text-sm font-medium leading-relaxed text-zinc-200/95">
              {insights.map((line, i) => (
                <li key={i} className="border-l-2 border-cyan-400/30 pl-3">
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="text-[11px] font-medium leading-relaxed text-zinc-500">
          Educational model only. Not tax, not sequence-of-returns Monte Carlo, not advice. Baseline dynamic probability (for comparison) at
          your sliders without scenario overlay:{" "}
          <span className="font-black text-zinc-300">
            {dynamicFireProbability(baselineSim.monthsToFi, baselineSim.retirementReadyRatio, fireScore, debtRatio)}%
          </span>
          .
        </p>
      </div>
    </WealthDashboardShell>
  );
}

function clampNum(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function clamp01(n: number): number {
  return clampNum(n, 0, 1);
}
