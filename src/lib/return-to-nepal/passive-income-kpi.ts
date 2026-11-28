import { formatNprInteger } from "@/components/savings-tracker/savings-currency";

/**
 * Dashboard Monthly Passive Income KPI — binds to the same resolved actual/modeled
 * pair as Return Checklist (never sums them; never substitutes modeled for actual).
 */
export function resolvePassiveIncomeKpiDisplay(args: {
  actualPassiveMonthlyNpr: number;
  modeledPassiveMonthlyNpr: number;
  cashflowLoading?: boolean;
  cashflowUnavailable?: boolean;
}): { value: string; hint: string; hintSecondary?: string; hintPositive: boolean } {
  const actual = Math.max(0, args.actualPassiveMonthlyNpr);
  const modeled = Math.max(0, args.modeledPassiveMonthlyNpr);
  const modeledLine = `Modeled: ${formatNprInteger(modeled)}/month`;

  if (args.cashflowUnavailable) {
    return {
      value: "—",
      hint: "Could not verify Cashflow income",
      hintSecondary: modeledLine,
      hintPositive: false,
    };
  }
  if (args.cashflowLoading && !(actual > 0)) {
    return {
      value: "…",
      hint: "Verifying Cashflow…",
      hintSecondary: modeledLine,
      hintPositive: false,
    };
  }
  return {
    value: formatNprInteger(actual),
    hint: actual > 0 ? "Actual · Cashflow synced" : "Actual · no Cashflow passive yet",
    hintSecondary: modeledLine,
    hintPositive: actual > 0,
  };
}
