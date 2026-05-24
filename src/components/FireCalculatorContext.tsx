"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { FALLBACK_KRW_PER_NPR, fetchLiveExchangeRate, type ExchangeRateSnapshot } from "@/lib/exchange-rate";
import {
  calculateFireProjection,
  simulateWealthLifecycle,
  type FireProjectionParams,
  type FireProjectionResult,
  type WealthLegacyMode,
  type WealthLifecycleResult,
  type WealthSimulationParams,
} from "@/lib/fire-calculator-model";

export type FireDisplayCurrency = "KRW" | "NPR";

type FireCalculatorContextValue = {
  currency: FireDisplayCurrency;
  setCurrency: (c: FireDisplayCurrency) => void;
  krwPerNpr: number;
  rateLoading: boolean;
  currentSavingsNpr: number | undefined;
  setCurrentSavingsNpr: (n: number | undefined) => void;
  monthlySavingsNpr: number | undefined;
  setMonthlySavingsNpr: (n: number | undefined) => void;
  currentAge: number | undefined;
  setCurrentAge: (n: number | undefined) => void;
  annualReturnPct: number | undefined;
  setAnnualReturnPct: (n: number | undefined) => void;
  monthlyExpenseNpr: number | undefined;
  setMonthlyExpenseNpr: (n: number | undefined) => void;
  expenseInflationAnnualPct: number | undefined;
  setExpenseInflationAnnualPct: (n: number | undefined) => void;
  safeWithdrawalRatePct: number | undefined;
  setSafeWithdrawalRatePct: (n: number | undefined) => void;
  legacyMode: WealthLegacyMode;
  setLegacyMode: (m: WealthLegacyMode) => void;
  spenddownTargetAge: number | undefined;
  setSpenddownTargetAge: (n: number | undefined) => void;
  /** Resolved numeric params for charts and FIRE math (empty inputs coalesced for simulation only). */
  projection: FireProjectionParams;
  wealthParams: WealthSimulationParams;
  result: FireProjectionResult;
  wealthResult: WealthLifecycleResult;
  horizonGrowthPct: number | null;
  toNprFromKrw: (krw: number) => number;
  fromNprToKrw: (npr: number) => number;
  formatMoney: (npr: number) => string;
};

const FireCalculatorContext = createContext<FireCalculatorContextValue | null>(null);

export function useFireCalculator(): FireCalculatorContextValue {
  const ctx = useContext(FireCalculatorContext);
  if (!ctx) throw new Error("useFireCalculator must be used within FireCalculatorProvider");
  return ctx;
}

function resolveFireInputs(
  currentSavingsNpr: number | undefined,
  monthlySavingsNpr: number | undefined,
  currentAge: number | undefined,
  annualReturnPct: number | undefined,
  monthlyExpenseNpr: number | undefined,
): FireProjectionParams {
  return {
    currentSavingsNpr: currentSavingsNpr ?? 0,
    monthlySavingsNpr: monthlySavingsNpr ?? 0,
    currentAge: currentAge ?? 30,
    annualReturnPct: annualReturnPct ?? 10,
    monthlyExpenseNpr: monthlyExpenseNpr ?? 0,
  };
}

export function FireCalculatorProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState<FireDisplayCurrency>("KRW");
  const [krwPerNpr, setKrwPerNpr] = useState(FALLBACK_KRW_PER_NPR);
  const [rateLoading, setRateLoading] = useState(true);

  const [currentSavingsNpr, setCurrentSavingsNpr] = useState<number | undefined>(undefined);
  const [monthlySavingsNpr, setMonthlySavingsNpr] = useState<number | undefined>(undefined);
  const [currentAge, setCurrentAge] = useState<number | undefined>(undefined);
  const [annualReturnPct, setAnnualReturnPct] = useState<number | undefined>(undefined);
  const [monthlyExpenseNpr, setMonthlyExpenseNpr] = useState<number | undefined>(undefined);
  const [expenseInflationAnnualPct, setExpenseInflationAnnualPct] = useState<number | undefined>(undefined);
  const [safeWithdrawalRatePct, setSafeWithdrawalRatePct] = useState<number | undefined>(undefined);
  const [legacyMode, setLegacyMode] = useState<WealthLegacyMode>("default");
  const [spenddownTargetAge, setSpenddownTargetAge] = useState<number | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    setRateLoading(true);
    void fetchLiveExchangeRate()
      .then((snap: ExchangeRateSnapshot) => {
        if (cancelled) return;
        setKrwPerNpr(snap.krwPerNpr);
      })
      .finally(() => {
        if (!cancelled) setRateLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const toNprFromKrw = useCallback((krw: number) => krw / krwPerNpr, [krwPerNpr]);
  const fromNprToKrw = useCallback((npr: number) => npr * krwPerNpr, [krwPerNpr]);

  const projection = useMemo<FireProjectionParams>(
    () =>
      resolveFireInputs(
        currentSavingsNpr,
        monthlySavingsNpr,
        currentAge,
        annualReturnPct,
        monthlyExpenseNpr,
      ),
    [annualReturnPct, currentAge, currentSavingsNpr, monthlyExpenseNpr, monthlySavingsNpr],
  );

  const wealthParams = useMemo<WealthSimulationParams>(
    () => ({
      ...projection,
      expenseInflationAnnualPct: expenseInflationAnnualPct ?? 3,
      safeWithdrawalRatePct: safeWithdrawalRatePct ?? 4,
      legacyMode,
      spenddownTargetAge: Math.max(projection.currentAge + 2, spenddownTargetAge ?? 92),
    }),
    [
      projection,
      expenseInflationAnnualPct,
      safeWithdrawalRatePct,
      legacyMode,
      spenddownTargetAge,
    ],
  );

  const result = useMemo(() => calculateFireProjection(projection), [projection]);

  const wealthResult = useMemo(() => simulateWealthLifecycle(wealthParams), [wealthParams]);

  const horizonGrowthPct = useMemo(() => {
    const y = wealthResult.yearly;
    if (y.length < 2) return null;
    const a = y[0]?.balanceActualNpr ?? 0;
    const b = y[y.length - 1]?.balanceActualNpr ?? 0;
    if (a <= 0) return null;
    return ((b - a) / a) * 100;
  }, [wealthResult.yearly]);

  const formatMoney = useCallback(
    (npr: number) => {
      if (currency === "NPR") {
        return `रु ${Math.round(npr).toLocaleString("en-IN")}`;
      }
      const krw = fromNprToKrw(npr);
      return `₩ ${Math.round(krw).toLocaleString("en-US")}`;
    },
    [currency, fromNprToKrw],
  );

  const value = useMemo<FireCalculatorContextValue>(
    () => ({
      currency,
      setCurrency,
      krwPerNpr,
      rateLoading,
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
      projection,
      wealthParams,
      result,
      wealthResult,
      horizonGrowthPct,
      toNprFromKrw,
      fromNprToKrw,
      formatMoney,
    }),
    [
      currency,
      krwPerNpr,
      rateLoading,
      currentSavingsNpr,
      monthlySavingsNpr,
      currentAge,
      annualReturnPct,
      monthlyExpenseNpr,
      expenseInflationAnnualPct,
      safeWithdrawalRatePct,
      legacyMode,
      spenddownTargetAge,
      projection,
      wealthParams,
      result,
      wealthResult,
      horizonGrowthPct,
      toNprFromKrw,
      fromNprToKrw,
      formatMoney,
    ],
  );

  return <FireCalculatorContext.Provider value={value}>{children}</FireCalculatorContext.Provider>;
}
