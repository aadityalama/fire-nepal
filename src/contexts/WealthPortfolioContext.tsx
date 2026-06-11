"use client";

import { useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState, createContext, type ReactNode } from "react";
import { CASHFLOW_EXTERNAL_SYNC_EVENT } from "@/components/cashflow/portfolio-dividend-sync";
import { replaceDepositInterestIncomeFromPortfolioNpr } from "@/components/cashflow/portfolio-fd-cashflow-sync";
import { aggregateFdMonthlyInterestNpr } from "@/components/portfolio/banking-fd";
import { cashflowStorageKey, defaultCashflowState, loadCashflowState } from "@/components/cashflow/cashflow-storage";
import {
  allocationPercents,
  computeRetirementDashboardSnapshot,
  computeWealthTotals,
  financialHealthFromScore,
  fireReadinessScore,
  monthlyWealthGrowthNpr,
  passiveIncomeMonthlyNpr,
  type WealthTotals,
} from "@/components/portfolio/calculations";
import {
  appendNetWorthHistory,
  defaultWealthState,
  emptyInvestment,
  emptyLiability,
  emptyRealEstate,
  emptySimpleLine,
  emptyVehicle,
  emptyFixedDeposit,
  emptyGlobalRetirementAsset,
  loadWealthPortfolioState,
  portfolioStorageKey,
} from "@/components/portfolio/storage";
import type {
  FixedDepositRow,
  GlobalRetirementAssetRow,
  InvestmentRow,
  LiabilityRow,
  MetalRow,
  RealEstateRow,
  SimpleMoneyLine,
  VehicleRow,
  WealthPortfolioStateV2,
} from "@/components/portfolio/types";
import {
  buildFinancialIntelligenceModel,
  loadIntelMonthRollups,
  upsertCurrentMonthRollup,
  type FinancialIntelMonthRollup,
} from "@/components/financial-intelligence";
import { buildFinancialCoachSnapshot } from "@/components/financial-coach/coach-snapshot";
import type { FinancialCoachSnapshot } from "@/components/financial-coach/types";
import { computePayslipTrendAnalytics } from "@/components/payslip-import/payslip-analytics";
import { loadPayslipHistoryState, PAYSLIP_HISTORY_SYNC_EVENT } from "@/components/payslip-import/payslip-history-storage";
import { FALLBACK_USD_PER_NPR, fetchNprCrossRates } from "@/lib/portfolio-convert";
import { normalizeGoldSilverPriceResponse } from "@/lib/market/normalize-gold-silver-price-response";
import { FALLBACK_KRW_PER_NPR } from "@/lib/exchange-rate";
import type { GoldSilverPriceResponse } from "@/types/market/bullion";
import { WealthPortfolioCloudSync } from "@/hooks/WealthPortfolioCloudSync";
import { useProductAuth } from "@/contexts/ProductAuthContext";
import {
  FIRE_NEPAL_GLOBAL_WORKSPACE_RESET_EVENT,
  FIRE_NEPAL_PORTFOLIO_STORAGE_SYNC_EVENT,
} from "@/lib/fire-nepal/workspace-data-reset";

export type WealthPortfolioLedgerFx = { krwPerNpr: number; usdPerNpr: number };

export type BullionGramRatesNpr = { goldNprPerGram: number; silverNprPerGram: number };

export type WealthPortfolioContextValue = {
  hydrated: boolean;
  ratesLoading: boolean;
  state: WealthPortfolioStateV2;
  krwPerNpr: number;
  usdPerNpr: number;
  ledgerFx: WealthPortfolioLedgerFx;
  /** NPR/g from `/api/market/gold-price` when loaded; feeds `computeWealthTotals` bullion marks. */
  bullionGramRatesNpr: BullionGramRatesNpr | null;
  bullionSpot: GoldSilverPriceResponse | null;
  bullionError: string | null;
  /** True while the first bullion quote is in flight (no payload yet). */
  bullionPriceLoading: boolean;
  /** True while re-fetching with an existing quote on screen. */
  bullionPriceRefreshing: boolean;
  totals: WealthTotals;
  allocation: ReturnType<typeof allocationPercents>;
  fireScore: number;
  health: ReturnType<typeof financialHealthFromScore>;
  passiveMonthly: number;
  monthDelta: number | null;
  topAlloc: { label: string; value: number; npr: number };
  retirementSnap: ReturnType<typeof computeRetirementDashboardSnapshot>;
  coachSnapshot: FinancialCoachSnapshot;
  intelModel: ReturnType<typeof buildFinancialIntelligenceModel>;
  applyPortfolioMutate: (fn: (s: WealthPortfolioStateV2) => WealthPortfolioStateV2 | null) => boolean;
  updateLiquid: (id: string, patch: Partial<SimpleMoneyLine>) => void;
  addLiquid: () => void;
  /** Insert or replace a liquid cash line by `id` (used by banking entry UX). */
  upsertLiquid: (line: SimpleMoneyLine) => void;
  removeLiquid: (id: string) => void;
  updateFd: (id: string, patch: Partial<FixedDepositRow>) => void;
  addFd: () => void;
  removeFd: (id: string) => void;
  updateInv: (id: string, patch: Partial<InvestmentRow>) => void;
  addInv: () => void;
  removeInv: (id: string) => void;
  updateMetal: (id: string, patch: Partial<MetalRow>) => void;
  removeMetal: (id: string) => void;
  updateRe: (id: string, patch: Partial<RealEstateRow>) => void;
  addRe: () => void;
  removeRe: (id: string) => void;
  updateVeh: (id: string, patch: Partial<VehicleRow>) => void;
  addVeh: () => void;
  removeVeh: (id: string) => void;
  updateLiab: (id: string, patch: Partial<LiabilityRow>) => void;
  addLiab: () => void;
  removeLiab: (id: string) => void;
  updateRetirement: (id: string, patch: Partial<GlobalRetirementAssetRow>) => void;
  addRetirement: () => void;
  removeRetirement: (id: string) => void;
};

const WealthPortfolioContext = createContext<WealthPortfolioContextValue | null>(null);

export function WealthPortfolioProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useProductAuth();
  const [state, setState] = useState<WealthPortfolioStateV2>(defaultWealthState);
  const [hydrated, setHydrated] = useState(false);
  const [krwPerNpr, setKrwPerNpr] = useState(FALLBACK_KRW_PER_NPR);
  const [usdPerNpr, setUsdPerNpr] = useState(FALLBACK_USD_PER_NPR);
  const [ratesLoading, setRatesLoading] = useState(true);
  const [bullionSpot, setBullionSpot] = useState<GoldSilverPriceResponse | null>(null);
  const [bullionError, setBullionError] = useState<string | null>(null);
  const [bullionFetchInFlight, setBullionFetchInFlight] = useState(false);
  const [monthlyDividendNpr, setMonthlyDividendNpr] = useState(0);
  const [coachDataTick, setCoachDataTick] = useState(0);
  const [intelRollups, setIntelRollups] = useState<FinancialIntelMonthRollup[]>([]);

  useEffect(() => {
    const bump = () => setCoachDataTick((t) => t + 1);
    window.addEventListener(CASHFLOW_EXTERNAL_SYNC_EVENT, bump);
    window.addEventListener(PAYSLIP_HISTORY_SYNC_EVENT, bump);
    return () => {
      window.removeEventListener(CASHFLOW_EXTERNAL_SYNC_EVENT, bump);
      window.removeEventListener(PAYSLIP_HISTORY_SYNC_EVENT, bump);
    };
  }, []);

  useLayoutEffect(() => {
    if (loading) return;
    setState(loadWealthPortfolioState(user?.id));
    setHydrated(true);
  }, [loading, user?.id]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== portfolioStorageKey(user?.id) || e.newValue == null) return;
      try {
        const parsed = JSON.parse(e.newValue) as WealthPortfolioStateV2;
        setState(parsed);
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [user?.id]);

  useEffect(() => {
    const reloadFromDisk = () => {
      setState(loadWealthPortfolioState(user?.id));
    };
    window.addEventListener(FIRE_NEPAL_PORTFOLIO_STORAGE_SYNC_EVENT, reloadFromDisk);
    window.addEventListener(FIRE_NEPAL_GLOBAL_WORKSPACE_RESET_EVENT, reloadFromDisk);
    return () => {
      window.removeEventListener(FIRE_NEPAL_PORTFOLIO_STORAGE_SYNC_EVENT, reloadFromDisk);
      window.removeEventListener(FIRE_NEPAL_GLOBAL_WORKSPACE_RESET_EVENT, reloadFromDisk);
    };
  }, [user?.id]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(portfolioStorageKey(user?.id), JSON.stringify(state));
    } catch {
      /* quota */
    }
  }, [state, hydrated, user?.id]);

  useEffect(() => {
    const readDividend = () => setMonthlyDividendNpr(loadCashflowState(user?.id).income.dividendIncome ?? 0);
    readDividend();
    const onExternal = () => readDividend();
    const onStorage = (e: StorageEvent) => {
      if (e.key === cashflowStorageKey(user?.id)) readDividend();
    };
    window.addEventListener(CASHFLOW_EXTERNAL_SYNC_EVENT, onExternal);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(CASHFLOW_EXTERNAL_SYNC_EVENT, onExternal);
      window.removeEventListener("storage", onStorage);
    };
  }, [user?.id, hydrated]);

  useEffect(() => {
    let cancelled = false;
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

  const loadBullion = useCallback(async () => {
    if (typeof window === "undefined") return;
    setBullionFetchInFlight(true);
    try {
      const res = await fetch(`/api/market/gold-price?_t=${Date.now()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw: unknown = await res.json();
      const j = normalizeGoldSilverPriceResponse(raw);
      if (!j) throw new Error("Invalid bullion payload");
      setBullionSpot(j);
      setBullionError(null);
    } catch (e) {
      setBullionError(e instanceof Error ? e.message : "Gold/silver feed failed");
    } finally {
      setBullionFetchInFlight(false);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const kick = window.setTimeout(() => void loadBullion(), 0);
    const id = window.setInterval(() => void loadBullion(), 6 * 60 * 1000);
    return () => {
      window.clearTimeout(kick);
      window.clearInterval(id);
    };
  }, [hydrated, loadBullion]);

  useEffect(() => {
    if (!hydrated) return;
    const h = window.setTimeout(() => {
      replaceDepositInterestIncomeFromPortfolioNpr(
        aggregateFdMonthlyInterestNpr(state.fixedDeposits ?? [], krwPerNpr, usdPerNpr),
        user?.id,
      );
    }, 450);
    return () => window.clearTimeout(h);
  }, [hydrated, state.fixedDeposits, krwPerNpr, usdPerNpr, user?.id]);

  const bullionGramRatesNpr = useMemo((): BullionGramRatesNpr | null => {
    if (!bullionSpot) return null;
    return {
      goldNprPerGram: bullionSpot.goldPerGramNPR,
      silverNprPerGram: bullionSpot.silverPerGramNPR,
    };
  }, [bullionSpot]);

  const bullionPriceLoading = useMemo(
    () => bullionFetchInFlight && bullionSpot == null,
    [bullionFetchInFlight, bullionSpot],
  );
  const bullionPriceRefreshing = useMemo(
    () => bullionFetchInFlight && bullionSpot != null,
    [bullionFetchInFlight, bullionSpot],
  );

  const totals = useMemo(
    () => computeWealthTotals(state, krwPerNpr, usdPerNpr, { bullionGramRatesNpr }),
    [state, krwPerNpr, usdPerNpr, bullionGramRatesNpr],
  );
  const retirementSnap = useMemo(() => computeRetirementDashboardSnapshot(totals), [totals]);
  const allocation = useMemo(() => allocationPercents(totals), [totals]);
  const fireScore = useMemo(() => fireReadinessScore(totals), [totals]);
  const health = useMemo(() => financialHealthFromScore(fireScore), [fireScore]);
  const passiveMonthly = useMemo(
    () =>
      passiveIncomeMonthlyNpr(totals.investableNpr, {
        monthlyCashDividendNpr: monthlyDividendNpr,
        monthlyFixedDepositInterestNpr: totals.fixedDepositsEstimatedMonthlyIncomeNpr,
      }),
    [totals.investableNpr, totals.fixedDepositsEstimatedMonthlyIncomeNpr, monthlyDividendNpr],
  );
  const monthDelta = useMemo(() => monthlyWealthGrowthNpr(state.netWorthHistory), [state.netWorthHistory]);

  const cashflowForCoach = useMemo(() => {
    void coachDataTick;
    if (typeof window === "undefined" || !hydrated) return defaultCashflowState();
    return loadCashflowState(user?.id);
  }, [hydrated, coachDataTick, user?.id]);

  const coachSnapshot = useMemo(() => {
    void coachDataTick;
    const payslipMoM = computePayslipTrendAnalytics(loadPayslipHistoryState().entries).grossSalaryMoM_pct;
    return buildFinancialCoachSnapshot({
      hydrated,
      totals,
      cashflow: cashflowForCoach,
      passiveMonthlyNpr: passiveMonthly,
      monthDeltaNpr: monthDelta,
      netWorthHistory: state.netWorthHistory,
      fireScore,
      krwPerNpr,
      globalRetirementAssets: state.globalRetirementAssets,
      payslipGrossMoM_pct: payslipMoM,
    });
  }, [
    hydrated,
    totals,
    cashflowForCoach,
    passiveMonthly,
    monthDelta,
    state.netWorthHistory,
    fireScore,
    krwPerNpr,
    state.globalRetirementAssets,
    coachDataTick,
  ]);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    upsertCurrentMonthRollup({ cashflow: cashflowForCoach, coach: coachSnapshot });
    queueMicrotask(() => {
      setIntelRollups(loadIntelMonthRollups());
    });
  }, [hydrated, coachDataTick, cashflowForCoach, coachSnapshot]);

  const intelModel = useMemo(
    () =>
      buildFinancialIntelligenceModel({
        cashflow: cashflowForCoach,
        coach: coachSnapshot,
        monthRollups: intelRollups,
        netWorthHistory: state.netWorthHistory,
      }),
    [cashflowForCoach, coachSnapshot, intelRollups, state.netWorthHistory],
  );

  const topAlloc = useMemo(() => {
    const sorted = [...allocation].sort((a, b) => b.value - a.value);
    return sorted[0] ?? { label: "—", value: 0, npr: 0 };
  }, [allocation]);

  useEffect(() => {
    if (!hydrated) return;
    queueMicrotask(() => {
      setState((prev) => ({
        ...prev,
        netWorthHistory: appendNetWorthHistory(prev.netWorthHistory, totals.netWorthNpr),
      }));
    });
  }, [hydrated, totals.netWorthNpr]);

  const updateLiquid = useCallback((id: string, patch: Partial<SimpleMoneyLine>) => {
    setState((s) => ({
      ...s,
      liquidCash: s.liquidCash.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));
  }, []);
  const addLiquid = useCallback(() => {
    setState((s) => ({ ...s, liquidCash: [...s.liquidCash, emptySimpleLine()] }));
  }, []);
  const upsertLiquid = useCallback((line: SimpleMoneyLine) => {
    setState((s) => {
      const idx = s.liquidCash.findIndex((r) => r.id === line.id);
      if (idx >= 0) {
        const next = [...s.liquidCash];
        next[idx] = { ...line };
        return { ...s, liquidCash: next };
      }
      return { ...s, liquidCash: [...s.liquidCash, { ...line }] };
    });
  }, []);
  const removeLiquid = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      liquidCash: s.liquidCash.filter((r) => r.id !== id),
    }));
  }, []);

  const updateFd = useCallback((id: string, patch: Partial<FixedDepositRow>) => {
    setState((s) => ({
      ...s,
      fixedDeposits: (s.fixedDeposits ?? []).map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));
  }, []);
  const addFd = useCallback(() => {
    setState((s) => ({ ...s, fixedDeposits: [...(s.fixedDeposits ?? []), emptyFixedDeposit()] }));
  }, []);
  const removeFd = useCallback((id: string) => {
    setState((s) => {
      const fd = s.fixedDeposits ?? [];
      return { ...s, fixedDeposits: fd.filter((r) => r.id !== id) };
    });
  }, []);

  const updateInv = useCallback((id: string, patch: Partial<InvestmentRow>) => {
    setState((s) => ({
      ...s,
      investments: s.investments.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));
  }, []);
  const addInv = useCallback(() => {
    setState((s) => ({ ...s, investments: [...s.investments, emptyInvestment("nepse")] }));
  }, []);
  const removeInv = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      investments: s.investments.filter((r) => r.id !== id),
    }));
  }, []);

  const updateMetal = useCallback((id: string, patch: Partial<MetalRow>) => {
    setState((s) => ({
      ...s,
      metals: s.metals.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));
  }, []);
  const removeMetal = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      metals: s.metals.filter((r) => r.id !== id),
      ledger: s.ledger.filter((e) => !(e.bucket === "metal" && e.rowId === id)),
    }));
  }, []);

  const updateRe = useCallback((id: string, patch: Partial<RealEstateRow>) => {
    setState((s) => ({
      ...s,
      realEstate: s.realEstate.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));
  }, []);
  const addRe = useCallback(() => {
    setState((s) => ({ ...s, realEstate: [...s.realEstate, emptyRealEstate("apartment")] }));
  }, []);
  const removeRe = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      realEstate: s.realEstate.filter((r) => r.id !== id),
    }));
  }, []);

  const updateVeh = useCallback((id: string, patch: Partial<VehicleRow>) => {
    setState((s) => ({
      ...s,
      vehicles: s.vehicles.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));
  }, []);
  const addVeh = useCallback(() => {
    setState((s) => ({ ...s, vehicles: [...s.vehicles, emptyVehicle("car")] }));
  }, []);
  const removeVeh = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      vehicles: s.vehicles.filter((r) => r.id !== id),
    }));
  }, []);

  const updateLiab = useCallback((id: string, patch: Partial<LiabilityRow>) => {
    setState((s) => ({
      ...s,
      liabilities: s.liabilities.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));
  }, []);
  const addLiab = useCallback(() => {
    setState((s) => ({ ...s, liabilities: [...s.liabilities, emptyLiability("loan")] }));
  }, []);
  const removeLiab = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      liabilities: s.liabilities.filter((r) => r.id !== id),
    }));
  }, []);

  const updateRetirement = useCallback((id: string, patch: Partial<GlobalRetirementAssetRow>) => {
    setState((s) => ({
      ...s,
      globalRetirementAssets: s.globalRetirementAssets.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));
  }, []);
  const addRetirement = useCallback(() => {
    setState((s) => ({
      ...s,
      globalRetirementAssets: [...s.globalRetirementAssets, emptyGlobalRetirementAsset("pension_savings")],
    }));
  }, []);
  const removeRetirement = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      globalRetirementAssets: s.globalRetirementAssets.filter((r) => r.id !== id),
    }));
  }, []);

  const ledgerFx = useMemo(() => ({ krwPerNpr, usdPerNpr }), [krwPerNpr, usdPerNpr]);

  const applyPortfolioMutate = useCallback((fn: (s: WealthPortfolioStateV2) => WealthPortfolioStateV2 | null): boolean => {
    const ref = { ok: false };
    setState((s) => {
      const n = fn(s);
      if (n) ref.ok = true;
      return n ?? s;
    });
    return ref.ok;
  }, []);

  const value = useMemo<WealthPortfolioContextValue>(
    () => ({
      hydrated,
      ratesLoading,
      state,
      krwPerNpr,
      usdPerNpr,
      ledgerFx,
      bullionGramRatesNpr,
      bullionSpot,
      bullionError,
      bullionPriceLoading,
      bullionPriceRefreshing,
      totals,
      allocation,
      fireScore,
      health,
      passiveMonthly,
      monthDelta,
      topAlloc,
      retirementSnap,
      coachSnapshot,
      intelModel,
      applyPortfolioMutate,
      updateLiquid,
      addLiquid,
      upsertLiquid,
      removeLiquid,
      updateFd,
      addFd,
      removeFd,
      updateInv,
      addInv,
      removeInv,
      updateMetal,
      removeMetal,
      updateRe,
      addRe,
      removeRe,
      updateVeh,
      addVeh,
      removeVeh,
      updateLiab,
      addLiab,
      removeLiab,
      updateRetirement,
      addRetirement,
      removeRetirement,
    }),
    [
      hydrated,
      ratesLoading,
      state,
      krwPerNpr,
      usdPerNpr,
      ledgerFx,
      bullionGramRatesNpr,
      bullionSpot,
      bullionError,
      bullionPriceLoading,
      bullionPriceRefreshing,
      totals,
      allocation,
      fireScore,
      health,
      passiveMonthly,
      monthDelta,
      topAlloc,
      retirementSnap,
      coachSnapshot,
      intelModel,
      applyPortfolioMutate,
      updateLiquid,
      addLiquid,
      upsertLiquid,
      removeLiquid,
      updateFd,
      addFd,
      removeFd,
      updateInv,
      addInv,
      removeInv,
      updateMetal,
      removeMetal,
      updateRe,
      addRe,
      removeRe,
      updateVeh,
      addVeh,
      removeVeh,
      updateLiab,
      addLiab,
      removeLiab,
      updateRetirement,
      addRetirement,
      removeRetirement,
    ],
  );

  return (
    <WealthPortfolioContext.Provider value={value}>
      <WealthPortfolioCloudSync key={user?.id ?? "guest"} hydrated={hydrated} state={state} setState={setState} />
      {children}
    </WealthPortfolioContext.Provider>
  );
}

export function useWealthPortfolio(): WealthPortfolioContextValue {
  const ctx = useContext(WealthPortfolioContext);
  if (!ctx) {
    throw new Error("useWealthPortfolio must be used within WealthPortfolioProvider");
  }
  return ctx;
}
