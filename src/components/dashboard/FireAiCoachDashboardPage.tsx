"use client";

import { Activity, Brain, Gauge, Orbit, Sparkles, Target, TrendingUp, Zap } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CASHFLOW_EXTERNAL_SYNC_EVENT } from "@/components/cashflow/portfolio-dividend-sync";
import { replaceDepositInterestIncomeFromPortfolioNpr } from "@/components/cashflow/portfolio-fd-cashflow-sync";
import { aggregateFdMonthlyInterestNpr } from "@/components/portfolio/banking-fd";
import { CASHFLOW_STORAGE_KEY, defaultCashflowState, loadCashflowState } from "@/components/cashflow/cashflow-storage";
import {
  allocationPercents,
  computeWealthTotals,
  fireReadinessScore,
  passiveIncomeMonthlyNpr,
  monthlyWealthGrowthNpr,
} from "@/components/portfolio/calculations";
import { AiFinancialCoachSection } from "@/components/financial-coach/AiFinancialCoachSection";
import {
  buildDeskWealthSimulationParams,
  buildFinancialCoachSnapshot,
} from "@/components/financial-coach/coach-snapshot";
import { buildFinancialCoachModel } from "@/components/financial-coach/financial-coach-intelligence";
import { computePayslipTrendAnalytics } from "@/components/payslip-import/payslip-analytics";
import { loadPayslipHistoryState, PAYSLIP_HISTORY_SYNC_EVENT } from "@/components/payslip-import/payslip-history-storage";
import {
  defaultWealthState,
  loadWealthPortfolioState,
  STORAGE_KEY_V2,
} from "@/components/portfolio/storage";
import type { WealthPortfolioStateV2 } from "@/components/portfolio/types";
import { FireFeatureGate } from "@/components/membership/FireFeatureGate";
import { useFireMembership } from "@/contexts/FireMembershipContext";
import { useProductAuth } from "@/contexts/ProductAuthContext";
import {
  buildAiKoreaWorkerIntel,
  buildAiPortfolioIntel,
  buildAiWealthAlerts,
  buildAiWealthWidgets,
  koreaVsNepalScenario,
} from "@/lib/fire-ai-wealth-intelligence";
import { FALLBACK_USD_PER_NPR, fetchNprCrossRates } from "@/lib/portfolio-convert";
import { FALLBACK_KRW_PER_NPR } from "@/lib/exchange-rate";
import type { ScenarioId } from "@/components/portfolio/simulation/wealth-simulation-engine";
import { scenarioDeltaYearsToFi } from "@/components/portfolio/simulation/wealth-simulation-engine";

const SCENARIO_DECK: { id: ScenarioId; headline: string }[] = [
  { id: "invest_plus_20pct", headline: "What if I invest ~20% more each month?" },
  { id: "spend_cut_12pct", headline: "Retire earlier? (spend −12% proxy)" },
  { id: "inflation_6", headline: "Inflation stress @ 6% CPI" },
  { id: "salary_boost", headline: "Salary growth +2% / year" },
  { id: "passive_double", headline: "Passive income doubles" },
  { id: "market_crash_35", headline: "−35% market shock (simplified)" },
];

function neonCard(extra: string) {
  return [
    "relative overflow-hidden rounded-2xl border border-emerald-400/20",
    "bg-gradient-to-br from-emerald-500/[0.08] via-[#04140f]/90 to-black/50",
    "shadow-[0_0_0_1px_rgba(52,211,153,0.06)_inset,0_20px_50px_-24px_rgba(0,0,0,0.65)]",
    "backdrop-blur-xl transition duration-500 hover:border-emerald-300/35",
    extra,
  ].join(" ");
}

export function FireAiCoachDashboardPage() {
  const { user } = useProductAuth();
  const { tier } = useFireMembership();
  const [state, setState] = useState<WealthPortfolioStateV2>(defaultWealthState);
  const [hydrated, setHydrated] = useState(false);
  const [krwPerNpr, setKrwPerNpr] = useState(FALLBACK_KRW_PER_NPR);
  const [usdPerNpr, setUsdPerNpr] = useState(FALLBACK_USD_PER_NPR);
  const [ratesLoading, setRatesLoading] = useState(true);
  const [monthlyDividendNpr, setMonthlyDividendNpr] = useState(0);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const bump = () => setTick((t) => t + 1);
    window.addEventListener(CASHFLOW_EXTERNAL_SYNC_EVENT, bump);
    window.addEventListener(PAYSLIP_HISTORY_SYNC_EVENT, bump);
    return () => {
      window.removeEventListener(CASHFLOW_EXTERNAL_SYNC_EVENT, bump);
      window.removeEventListener(PAYSLIP_HISTORY_SYNC_EVENT, bump);
    };
  }, []);

  useEffect(() => {
    const readDividend = () => setMonthlyDividendNpr(loadCashflowState().income.dividendIncome ?? 0);
    readDividend();
    const onExternal = () => readDividend();
    const onStorage = (e: StorageEvent) => {
      if (e.key === CASHFLOW_STORAGE_KEY) readDividend();
    };
    window.addEventListener(CASHFLOW_EXTERNAL_SYNC_EVENT, onExternal);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(CASHFLOW_EXTERNAL_SYNC_EVENT, onExternal);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  useEffect(() => {
    setState(loadWealthPortfolioState());
    setHydrated(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setRatesLoading(true);
    void fetchNprCrossRates().then((r) => {
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
    if (!hydrated) return;
    const h = window.setTimeout(() => {
      replaceDepositInterestIncomeFromPortfolioNpr(
        aggregateFdMonthlyInterestNpr(state.fixedDeposits ?? [], krwPerNpr, usdPerNpr),
      );
    }, 400);
    return () => window.clearTimeout(h);
  }, [hydrated, state.fixedDeposits, krwPerNpr, usdPerNpr]);

  const cashflow = useMemo(() => {
    void tick;
    if (typeof window === "undefined" || !hydrated) return defaultCashflowState();
    return loadCashflowState();
  }, [hydrated, tick]);

  const totals = useMemo(() => computeWealthTotals(state, krwPerNpr, usdPerNpr), [state, krwPerNpr, usdPerNpr]);
  const allocation = useMemo(() => allocationPercents(totals), [totals]);
  const fireScore = useMemo(() => fireReadinessScore(totals), [totals]);
  const passiveMonthly = useMemo(
    () =>
      passiveIncomeMonthlyNpr(totals.investableNpr, {
        monthlyCashDividendNpr: monthlyDividendNpr,
        monthlyFixedDepositInterestNpr: totals.fixedDepositsEstimatedMonthlyIncomeNpr,
      }),
    [totals.investableNpr, totals.fixedDepositsEstimatedMonthlyIncomeNpr, monthlyDividendNpr],
  );
  const monthDelta = useMemo(() => monthlyWealthGrowthNpr(state.netWorthHistory), [state.netWorthHistory]);

  const payslipMoM = useMemo(
    () => computePayslipTrendAnalytics(loadPayslipHistoryState().entries).grossSalaryMoM_pct,
    [tick],
  );

  const snapshot = useMemo(
    () =>
      buildFinancialCoachSnapshot({
        hydrated,
        totals,
        cashflow,
        passiveMonthlyNpr: passiveMonthly,
        monthDeltaNpr: monthDelta,
        netWorthHistory: state.netWorthHistory,
        fireScore,
        krwPerNpr,
        globalRetirementAssets: state.globalRetirementAssets ?? [],
        payslipGrossMoM_pct: payslipMoM,
      }),
    [
      hydrated,
      totals,
      cashflow,
      passiveMonthly,
      monthDelta,
      state.netWorthHistory,
      fireScore,
      krwPerNpr,
      state.globalRetirementAssets,
      payslipMoM,
    ],
  );

  const baseParams = useMemo(
    () => buildDeskWealthSimulationParams({ totals, passiveMonthlyNpr: passiveMonthly, globalRetirementAssets: state.globalRetirementAssets ?? [] }),
    [totals, passiveMonthly, state.globalRetirementAssets],
  );

  const debtRatio = totals.totalAssetsNpr > 0 ? totals.liabilitiesNpr / totals.totalAssetsNpr : 0;
  const coachCtx = useMemo(() => ({ fireReadinessScore: fireScore, debtRatio }), [fireScore, debtRatio]);

  const simDeck = useMemo(
    () =>
      SCENARIO_DECK.map((row) => ({
        ...row,
        delta: scenarioDeltaYearsToFi(baseParams, row.id, krwPerNpr, coachCtx),
      })),
    [baseParams, krwPerNpr, coachCtx],
  );

  const widgets = useMemo(
    () => buildAiWealthWidgets(totals, allocation, snapshot, baseParams, fireScore),
    [totals, allocation, snapshot, baseParams, fireScore],
  );

  const portfolioIntel = useMemo(() => buildAiPortfolioIntel(totals, allocation, snapshot), [totals, allocation, snapshot]);
  const koreaIntel = useMemo(() => buildAiKoreaWorkerIntel(snapshot, krwPerNpr), [snapshot, krwPerNpr]);
  const alerts = useMemo(() => buildAiWealthAlerts(snapshot), [snapshot]);
  const coachModel = useMemo(() => buildFinancialCoachModel(snapshot), [snapshot]);
  const geo = useMemo(() => koreaVsNepalScenario(snapshot), [snapshot]);

  const monthlyHealth = useMemo(() => {
    const sr = snapshot.savingsRatePct ?? 0;
    return Math.round(
      Math.min(97, Math.max(14, fireScore * 0.52 + snapshot.portfolioResilienceScore * 0.33 + Math.min(sr, 35) * 0.4)),
    );
  }, [fireScore, snapshot.savingsRatePct, snapshot.portfolioResilienceScore]);

  const intelLimited = tier === "free";
  const intelShow = intelLimited ? portfolioIntel.slice(0, 2) : portfolioIntel;
  const alertsShow = intelLimited ? alerts.slice(0, 3) : alerts;
  const simShow = intelLimited ? simDeck.slice(0, 2) : simDeck;
  const koreaRows = tier === "free" ? koreaIntel.slice(0, 2) : koreaIntel;

  if (!user) {
    return <div className="py-20 text-center text-zinc-500">Loading…</div>;
  }

  return (
    <div className="space-y-10 pb-28 lg:pb-12">
      <div className="relative overflow-hidden rounded-[1.75rem] border border-emerald-500/20 bg-[#04140f]/80 p-6 shadow-[0_28px_80px_rgba(0,0,0,0.5)] backdrop-blur-2xl sm:p-8">
        <div className="pointer-events-none absolute -right-24 top-0 h-72 w-72 rounded-full bg-emerald-400/12 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300/70">
              <Brain className="text-emerald-400" size={16} aria-hidden />
              STEP 9 · AI Wealth Intelligence
            </p>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-4xl">AI Financial Coach</h1>
            <p className="mt-3 max-w-2xl text-sm font-medium text-emerald-100/55">
              Deterministic desk intelligence — same engines as portfolio simulation & coach. No external LLM; upgrade
              tiers unlock depth (STEP 8 gating).
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/portfolio"
                className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-black text-emerald-100 transition hover:bg-white/10"
              >
                Wealth data →
              </Link>
              <Link
                href="/cashflow-dashboard"
                className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-4 py-2 text-xs font-black text-emerald-50 transition hover:bg-emerald-500/20"
              >
                Cashflow desk →
              </Link>
              <Link
                href="/dashboard/membership"
                className="rounded-full border border-amber-400/25 bg-amber-500/10 px-4 py-2 text-xs font-black text-amber-50 transition hover:bg-amber-500/20"
              >
                Plans
              </Link>
            </div>
          </div>
          <div className={`${neonCard("min-w-[220px] p-5")}`}>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300/60">Monthly health score</p>
            <div className="mt-2 flex items-end gap-2">
              <span className="text-5xl font-black tabular-nums text-white">{monthlyHealth}</span>
              <span className="pb-1 text-sm font-bold text-emerald-200/80">/ 100</span>
            </div>
            <p className="mt-2 text-xs text-zinc-500">
              Blend of FIRE readiness, resilience, savings rate.{ratesLoading ? " Rates loading…" : ""}
            </p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-black/40">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-lime-400 to-cyan-400 shadow-[0_0_20px_rgba(52,211,153,0.45)] transition-all duration-700"
                style={{ width: `${monthlyHealth}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <section>
        <h2 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-[0.14em] text-emerald-300/70">
          <Gauge size={16} className="text-emerald-400" aria-hidden />
          Smart widgets
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div className={neonCard("p-5")}>
            <p className="text-[10px] font-black uppercase text-emerald-400/70">FIRE probability</p>
            <p className="mt-2 text-3xl font-black text-white">{widgets.fireProbabilityPct}%</p>
            <p className="mt-2 text-xs text-zinc-400">Display surface from desk model — not actuarial advice.</p>
          </div>
          <div className={neonCard("p-5")}>
            <p className="text-[10px] font-black uppercase text-emerald-400/70">Risk level</p>
            <p className="mt-2 text-2xl font-black text-emerald-100">{widgets.riskLevel}</p>
            <p className="mt-2 text-xs text-zinc-400">{widgets.riskSub}</p>
          </div>
          <div className={neonCard("p-5")}>
            <p className="text-[10px] font-black uppercase text-emerald-400/70">Wealth momentum</p>
            <p className="mt-2 text-2xl font-black text-cyan-100">{widgets.momentumLabel}</p>
            <p className="mt-2 text-xs text-zinc-400">{widgets.momentumSub}</p>
          </div>
          <div className={neonCard("p-5")}>
            <p className="text-[10px] font-black uppercase text-emerald-400/70">Passive income strength</p>
            <p className="mt-2 text-2xl font-black text-lime-100">{widgets.passiveStrength}</p>
            <p className="mt-2 text-xs text-zinc-400">{widgets.passiveSub}</p>
          </div>
          <div className={neonCard("p-5")}>
            <p className="text-[10px] font-black uppercase text-amber-200/70">Top weakness</p>
            <p className="mt-2 text-xl font-black text-amber-100">{widgets.topWeakness}</p>
            <p className="mt-2 text-xs text-zinc-400">{widgets.weaknessSub}</p>
          </div>
          <div className={neonCard("p-5")}>
            <p className="text-[10px] font-black uppercase text-emerald-400/70">Next milestone</p>
            <p className="mt-2 text-xl font-black text-white">{widgets.nextMilestone}</p>
            <p className="mt-2 text-xs text-zinc-400">{widgets.milestoneSub}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-[0.14em] text-emerald-300/70">
            <Activity size={16} className="text-emerald-400" aria-hidden />
            AI alerts
          </h2>
          <div className="space-y-2">
            {alertsShow.map((a) => (
              <div
                key={a.id}
                className={`rounded-xl border px-4 py-3 text-sm backdrop-blur-md ${
                  a.severity === "critical"
                    ? "border-rose-500/30 bg-rose-950/30 text-rose-50"
                    : a.severity === "warn"
                      ? "border-amber-400/25 bg-amber-950/20 text-amber-50"
                      : "border-cyan-500/20 bg-cyan-950/15 text-cyan-50"
                }`}
              >
                <p className="text-[10px] font-black uppercase tracking-wide opacity-80">{a.title}</p>
                <p className="mt-1 text-xs font-semibold leading-relaxed opacity-95">{a.body}</p>
              </div>
            ))}
          </div>
          {intelLimited ? (
            <p className="mt-3 text-xs text-zinc-500">
              Free tier shows a subset of alerts. <Link className="font-bold text-emerald-400 underline" href="/dashboard/membership">Upgrade</Link> for the full feed + coach deck.
            </p>
          ) : null}
        </div>
        <div>
          <h2 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-[0.14em] text-emerald-300/70">
            <Target size={16} className="text-emerald-400" aria-hidden />
            Action plan (AI-generated)
          </h2>
          {tier === "premium" || tier === "elite" ? (
            <div className="space-y-3">
              {coachModel.recommendations.slice(0, 5).map((r) => (
                <div key={r.id} className={neonCard("p-4")}>
                  <p className="text-xs font-black uppercase text-emerald-300/60">{r.impact} impact</p>
                  <p className="mt-1 text-sm font-black text-white">{r.title}</p>
                  <p className="mt-2 text-xs leading-relaxed text-zinc-400">{r.body}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
              <p className="text-xs font-bold text-zinc-400">
                Preview only on Free.{" "}
                <Link className="font-black text-emerald-400 underline" href="/dashboard/membership">
                  Upgrade to Premium
                </Link>{" "}
                for prioritized action plans.
              </p>
              <p className="mt-4 text-sm font-black text-white">{coachModel.recommendations[0]?.title ?? "Build runway"}</p>
              <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                {(coachModel.recommendations[0]?.body ?? "Connect portfolio + cashflow to personalize.").slice(0, 220)}
                …
              </p>
            </div>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-[0.14em] text-emerald-300/70">
          <TrendingUp size={16} className="text-emerald-400" aria-hidden />
          Smart portfolio intelligence
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          {intelShow.map((row) => (
            <div
              key={row.id}
              className={`${neonCard("p-4")} ${
                row.tone === "risk" ? "border-rose-400/25" : row.tone === "watch" ? "border-amber-400/20" : ""
              }`}
            >
              <p className="text-[10px] font-black uppercase text-zinc-500">{row.title}</p>
              <p className="mt-2 text-sm font-semibold leading-relaxed text-emerald-50/90">{row.detail}</p>
            </div>
          ))}
        </div>
        {intelLimited ? (
          <p className="mt-3 text-center text-xs text-zinc-500">
            +{portfolioIntel.length - intelShow.length} more intel cards on Premium.
          </p>
        ) : null}
      </section>

      <section>
        <h2 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-[0.14em] text-emerald-300/70">
          <Orbit size={16} className="text-emerald-400" aria-hidden />
          Korea worker intelligence
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          {koreaRows.map((row) => (
            <div key={row.id} className={neonCard("p-4")}>
              <p className="text-[10px] font-black uppercase text-cyan-300/60">{row.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-zinc-200">{row.detail}</p>
            </div>
          ))}
        </div>
        {tier === "free" ? (
          <p className="mt-3 text-xs text-zinc-500">
            Premium unlocks the full Korea desk (remittance windows, visa runway, OT drill-down).{" "}
            <Link className="font-bold text-emerald-400 underline" href="/dashboard/membership">
              View plans
            </Link>
          </p>
        ) : null}
      </section>

      <section>
        <h2 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-[0.14em] text-emerald-300/70">
          <Zap size={16} className="text-lime-300" aria-hidden />
          AI simulation engine
        </h2>
        <p className="mb-4 max-w-3xl text-sm text-zinc-400">
          Each card compares years-to-FI vs baseline using the same desk parameters as your coach snapshot (NPR engine,
          KRW FX {krwPerNpr.toFixed(2)}).
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          {simShow.map((s) => (
            <div key={s.id} className={neonCard("p-5")}>
              <p className="text-xs font-black uppercase tracking-wide text-emerald-300/70">{s.headline}</p>
              <p className="mt-3 font-mono text-lg font-bold text-white">
                Δ years to FI:{" "}
                <span className="text-lime-300">
                  {s.delta.deltaYears == null ? "—" : `${s.delta.deltaYears > 0 ? "+" : ""}${s.delta.deltaYears.toFixed(1)}`}
                </span>
              </p>
              <p className="mt-2 text-[11px] text-zinc-500">{s.delta.label}</p>
            </div>
          ))}
        </div>
        {intelLimited ? (
          <p className="mt-3 text-xs text-zinc-500">
            Free preview: first two scenarios. Premium shows the full deck; Elite adds strategy lab overlays below.
          </p>
        ) : null}

        <FireFeatureGate
          feature="ai_scenario_lab"
          title="Elite · AI scenario lab"
          description="Elite adds forward strategy overlays: multi-scenario sequencing, inflation sequencing, and export hooks (Stripe-gated later)."
        >
            <div className="mt-6 space-y-4">
            <div className={neonCard("border-amber-400/25 p-5")}>
              <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-amber-200/80">
                <Sparkles size={14} aria-hidden />
                Strategy engine · prototype
              </p>
              <p className="mt-3 text-sm leading-relaxed text-zinc-300">
                Stack <strong className="text-white">invest +20%</strong> with{" "}
                <strong className="text-white">passive ×2</strong> for non-linear FI compression — desk model rewards
                parallel levers, not single-variable heroics.
              </p>
              <div className="mt-4 grid gap-2 text-xs text-zinc-400 sm:grid-cols-2">
                <div className="rounded-lg border border-white/10 bg-black/30 p-3">
                  <p className="font-black text-emerald-200/80">Korea vs Nepal living</p>
                  <p className="mt-2 leading-relaxed">{geo.korea}</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-black/30 p-3">
                  <p className="font-black text-emerald-200/80">NPR home base</p>
                  <p className="mt-2 leading-relaxed">{geo.nepal}</p>
                </div>
              </div>
            </div>
          </div>
        </FireFeatureGate>
      </section>

      <FireFeatureGate
        feature="ai_financial_coach"
        title="Full AI Financial Coach deck"
        description="Premium unlocks the live notification rail + coaching cards wired to your portfolio and cashflow."
      >
        <AiFinancialCoachSection snapshot={snapshot} />
      </FireFeatureGate>

      <p className="text-center text-[11px] text-zinc-600">
        Data path: <code className="rounded bg-white/5 px-1.5 py-0.5 text-emerald-500/80">{STORAGE_KEY_V2}</code> + cashflow
        storage · refresh via portfolio / cashflow saves.
      </p>
    </div>
  );
}
