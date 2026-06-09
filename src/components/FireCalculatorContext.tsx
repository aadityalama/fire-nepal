"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  calculateFireProjection,
  simulateWealthLifecycle,
  type FireProjectionParams,
  type FireProjectionResult,
  type WealthLegacyMode,
  type WealthLifecycleResult,
  type WealthSimulationParams,
} from "@/lib/fire-calculator-model";

type FireCalculatorContextValue = {
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
  const [currentSavingsNpr, setCurrentSavingsNpr] = useState<number | undefined>(undefined);
  const [monthlySavingsNpr, setMonthlySavingsNpr] = useState<number | undefined>(undefined);
  const [currentAge, setCurrentAge] = useState<number | undefined>(undefined);
  const [annualReturnPct, setAnnualReturnPct] = useState<number | undefined>(undefined);
  const [monthlyExpenseNpr, setMonthlyExpenseNpr] = useState<number | undefined>(undefined);
  const [expenseInflationAnnualPct, setExpenseInflationAnnualPct] = useState<number | undefined>(undefined);
  const [safeWithdrawalRatePct, setSafeWithdrawalRatePct] = useState<number | undefined>(undefined);
  const [legacyMode, setLegacyMode] = useState<WealthLegacyMode>("default");
  const [spenddownTargetAge, setSpenddownTargetAge] = useState<number | undefined>(undefined);

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

  const formatMoney = useCallback((npr: number) => `रु ${Math.round(npr).toLocaleString("en-IN")}`, []);

  const value = useMemo<FireCalculatorContextValue>(
    () => ({
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
      formatMoney,
    }),
    [
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
      formatMoney,
    ],
  );

  return <FireCalculatorContext.Provider value={value}>{children}</FireCalculatorContext.Provider>;
}
