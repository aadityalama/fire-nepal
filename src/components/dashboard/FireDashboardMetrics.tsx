"use client";

import { useEffect, useMemo, useState } from "react";
import { loadCashflowState } from "@/components/cashflow/cashflow-storage";
import type { CashflowDashboardState } from "@/components/cashflow/types";
import {
  computeWealthTotals,
  fireReadinessScore,
  passiveIncomeMonthlyNpr,
} from "@/components/portfolio/calculations";
import { loadWealthPortfolioState } from "@/components/portfolio/storage";
import { FALLBACK_KRW_PER_NPR } from "@/lib/exchange-rate";
import { amountToNpr, FALLBACK_USD_PER_NPR, fetchNprCrossRates } from "@/lib/portfolio-convert";
import type { GoldSilverPriceResponse } from "@/types/market/bullion";

function sumIncome(cf: CashflowDashboardState): number {
  return Object.values(cf.income).reduce<number>((a, v) => a + (typeof v === "number" && v > 0 ? v : 0), 0);
}

function sumExpenses(cf: CashflowDashboardState): number {
  return Object.values(cf.expenses).reduce<number>((a, v) => a + (typeof v === "number" && v > 0 ? v : 0), 0);
}

function fmtNpr(n: number): string {
  return new Intl.NumberFormat("en-NP", { maximumFractionDigits: 0 }).format(Math.round(n));
}

function fmtPct(n: number): string {
  return `${n.toFixed(1)}%`;
}

type FireDashboardMetricsProps = {
  fireGoalAmount: number;
  fireGoalCurrency: "NPR" | "KRW" | "USD";
  monthlyInvestmentTarget: number;
  /** Bump after local saves so widgets refresh in the same tab. */
  refreshKey?: number;
};

export function FireDashboardMetrics({
  fireGoalAmount,
  fireGoalCurrency,
  monthlyInvestmentTarget,
  refreshKey = 0,
}: FireDashboardMetricsProps) {
  const [krwPerNpr, setKrwPerNpr] = useState(FALLBACK_KRW_PER_NPR);
  const [usdPerNpr, setUsdPerNpr] = useState(FALLBACK_USD_PER_NPR);
  const [tick, setTick] = useState(0);
  const [bullionSpot, setBullionSpot] = useState<GoldSilverPriceResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchNprCrossRates().then((r) => {
      if (!cancelled) {
        setKrwPerNpr(r.krwPerNpr);
        setUsdPerNpr(r.usdPerNpr);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/market/gold-price?_t=${Date.now()}`, { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const j = (await res.json()) as GoldSilverPriceResponse;
        if (cancelled) return;
        if (
          typeof j.goldPerGramNPR === "number" &&
          typeof j.silverPerGramNPR === "number" &&
          j.goldPerGramNPR > 0 &&
          j.silverPerGramNPR > 0
        ) {
          setBullionSpot(j);
        }
      } catch {
        /* keep prior / fallback inside computeWealthTotals */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tick, refreshKey]);

  useEffect(() => {
    const onStorage = () => setTick((t) => t + 1);
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const totals = useMemo(() => {
    void tick;
    void refreshKey;
    const state = loadWealthPortfolioState();
    const bullionGramRatesNpr = bullionSpot
      ? { goldNprPerGram: bullionSpot.goldPerGramNPR, silverNprPerGram: bullionSpot.silverPerGramNPR }
      : null;
    return computeWealthTotals(state, krwPerNpr, usdPerNpr, { bullionGramRatesNpr });
  }, [krwPerNpr, usdPerNpr, tick, refreshKey, bullionSpot]);

  const cashflow = useMemo(() => {
    void tick;
    void refreshKey;
    return loadCashflowState();
  }, [tick, refreshKey]);

  const income = useMemo(() => sumIncome(cashflow), [cashflow]);
  const expenses = useMemo(() => sumExpenses(cashflow), [cashflow]);
  const savingsRate = useMemo(() => {
    if (income <= 0) return null;
    return Math.max(0, Math.min(100, ((income - expenses) / income) * 100));
  }, [income, expenses]);

  const fireGoalNpr = useMemo(
    () => amountToNpr(fireGoalAmount, fireGoalCurrency, krwPerNpr, usdPerNpr),
    [fireGoalAmount, fireGoalCurrency, krwPerNpr, usdPerNpr],
  );

  const fireProgress = useMemo(() => {
    if (fireGoalNpr <= 0) return 0;
    return Math.max(0, Math.min(100, (totals.netWorthNpr / fireGoalNpr) * 100));
  }, [totals.netWorthNpr, fireGoalNpr]);

  const passive = useMemo(
    () =>
      passiveIncomeMonthlyNpr(totals.investableNpr, {
        monthlyFixedDepositInterestNpr: totals.fixedDepositsEstimatedMonthlyIncomeNpr,
      }),
    [totals.investableNpr, totals.fixedDepositsEstimatedMonthlyIncomeNpr],
  );

  const fireScore = useMemo(() => fireReadinessScore(totals), [totals]);

  const monthlyInvNpr = useMemo(
    () => amountToNpr(monthlyInvestmentTarget, fireGoalCurrency, krwPerNpr, usdPerNpr),
    [monthlyInvestmentTarget, fireGoalCurrency, krwPerNpr, usdPerNpr],
  );

  const trackerPct = useMemo(() => {
    if (monthlyInvNpr <= 0) return 0;
    const contrib = totals.retirementNpr > 0 ? Math.min(monthlyInvNpr, totals.retirementNpr * 0.02) : monthlyInvNpr * 0.35;
    return Math.min(100, (contrib / monthlyInvNpr) * 100);
  }, [monthlyInvNpr, totals.retirementNpr]);

  const cards = [
    { label: "Net worth", value: `NPR ${fmtNpr(totals.netWorthNpr)}`, hint: "Assets − liabilities" },
    { label: "Portfolio value", value: `NPR ${fmtNpr(totals.totalAssetsNpr)}`, hint: "Total assets (NPR)" },
    { label: "FIRE progress", value: fmtPct(fireProgress), hint: "Vs your goal (NPR)" },
    { label: "FIRE readiness", value: `${fireScore}`, hint: "Composite 0–100" },
    {
      label: "Savings rate",
      value: savingsRate == null ? "—" : fmtPct(savingsRate),
      hint: "From cashflow module",
    },
    {
      label: "Monthly investments",
      value: fmtPct(trackerPct),
      hint: "Plan vs activity proxy",
    },
    {
      label: "Passive income (est.)",
      value: `NPR ${fmtNpr(passive)}`,
      hint: "4% rule + FD interest",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.02] p-4 shadow-[0_16px_50px_rgba(0,0,0,0.35)] backdrop-blur-xl"
          >
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-300/55">{c.label}</p>
            <p className="mt-2 font-mono text-xl font-black tracking-tight text-white">{c.value}</p>
            <p className="mt-1 text-[11px] font-medium text-zinc-500">{c.hint}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-emerald-500/15 bg-[#04140f]/80 p-5 backdrop-blur-xl">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-400/70">Currency conversion summary</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs font-semibold text-zinc-400">KRW per 1 NPR</p>
            <p className="mt-1 font-mono text-sm font-bold text-emerald-100">{krwPerNpr.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-zinc-400">USD per 1 NPR</p>
            <p className="mt-1 font-mono text-sm font-bold text-emerald-100">{usdPerNpr.toExponential(3)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-zinc-400">1 USD in NPR</p>
            <p className="mt-1 font-mono text-sm font-bold text-emerald-100">{fmtNpr(1 / usdPerNpr)} NPR</p>
          </div>
        </div>
      </div>
    </div>
  );
}
