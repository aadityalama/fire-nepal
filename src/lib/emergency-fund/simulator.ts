/**
 * Job-loss & emergency scenario simulator (read-only — never mutates records).
 */

export type EmergencyScenarioId =
  | "complete_income_loss"
  | "income_cut_25"
  | "income_cut_50"
  | "temporary_unemployment"
  | "medical"
  | "family"
  | "return_travel"
  | "custom";

export type EmergencyScenarioPreset = {
  id: EmergencyScenarioId;
  labelEn: string;
  incomeMultiplier: number;
  defaultOneTimeCostNpr: number;
  defaultExpenseAdjustmentNpr: number;
};

export const EMERGENCY_SCENARIO_PRESETS: EmergencyScenarioPreset[] = [
  {
    id: "complete_income_loss",
    labelEn: "Complete income loss",
    incomeMultiplier: 0,
    defaultOneTimeCostNpr: 0,
    defaultExpenseAdjustmentNpr: 0,
  },
  {
    id: "income_cut_25",
    labelEn: "25% income reduction",
    incomeMultiplier: 0.75,
    defaultOneTimeCostNpr: 0,
    defaultExpenseAdjustmentNpr: 0,
  },
  {
    id: "income_cut_50",
    labelEn: "50% income reduction",
    incomeMultiplier: 0.5,
    defaultOneTimeCostNpr: 0,
    defaultExpenseAdjustmentNpr: 0,
  },
  {
    id: "temporary_unemployment",
    labelEn: "Temporary unemployment",
    incomeMultiplier: 0,
    defaultOneTimeCostNpr: 0,
    defaultExpenseAdjustmentNpr: 0,
  },
  {
    id: "medical",
    labelEn: "Unexpected medical expenses",
    incomeMultiplier: 1,
    defaultOneTimeCostNpr: 150_000,
    defaultExpenseAdjustmentNpr: 25_000,
  },
  {
    id: "family",
    labelEn: "Unexpected family expenses",
    incomeMultiplier: 1,
    defaultOneTimeCostNpr: 100_000,
    defaultExpenseAdjustmentNpr: 20_000,
  },
  {
    id: "return_travel",
    labelEn: "Emergency return-to-Nepal travel",
    incomeMultiplier: 1,
    defaultOneTimeCostNpr: 200_000,
    defaultExpenseAdjustmentNpr: 0,
  },
  {
    id: "custom",
    labelEn: "Custom emergency scenario",
    incomeMultiplier: 1,
    defaultOneTimeCostNpr: 0,
    defaultExpenseAdjustmentNpr: 0,
  },
];

export type SimulatorInput = {
  currentReserveNpr: number;
  essentialMonthlyNpr: number;
  remainingMonthlyIncomeNpr: number;
  oneTimeEmergencyCostNpr: number;
  monthlyExpenseAdjustmentNpr?: number;
  horizonMonths?: number;
};

export type SimulatorMonthPoint = {
  monthIndex: number;
  label: string;
  reserveStart: number;
  reserveEnd: number;
  gap: number;
};

export type SimulatorResult = {
  availableReserveNpr: number;
  monthlyFundingGapNpr: number;
  safetyRunwayMonths: number | null;
  safetyRunwayDays: number | null;
  depletion: SimulatorMonthPoint[];
  expectedRemainingReserveNpr: number;
  financialShortfallNpr: number;
  suggestedExpenseCutNpr: number | null;
  zeroGap: boolean;
  isSimulation: true;
};

export function runEmergencySimulator(input: SimulatorInput): SimulatorResult {
  const essential = Math.max(0, input.essentialMonthlyNpr);
  const adjustment = Math.max(0, input.monthlyExpenseAdjustmentNpr ?? 0);
  const monthlyNeed = essential + adjustment;
  const remainingIncome = Math.max(0, input.remainingMonthlyIncomeNpr);
  const oneTime = Math.max(0, input.oneTimeEmergencyCostNpr);
  const availableReserveNpr = Math.max(0, Math.round(input.currentReserveNpr - oneTime));
  const monthlyFundingGapNpr = Math.max(0, Math.round(monthlyNeed - remainingIncome));
  const horizon = Math.max(1, Math.min(36, input.horizonMonths ?? 12));

  const zeroGap = monthlyFundingGapNpr <= 0;
  const safetyRunwayMonths =
    zeroGap ? null : availableReserveNpr / monthlyFundingGapNpr;
  const safetyRunwayDays =
    safetyRunwayMonths == null ? null : Math.round(safetyRunwayMonths * 30.44);

  const depletion: SimulatorMonthPoint[] = [];
  let reserve = availableReserveNpr;
  for (let i = 1; i <= horizon; i += 1) {
    const start = reserve;
    if (!zeroGap) {
      reserve = Math.max(0, reserve - monthlyFundingGapNpr);
    }
    depletion.push({
      monthIndex: i,
      label: `M${i}`,
      reserveStart: start,
      reserveEnd: reserve,
      gap: zeroGap ? 0 : monthlyFundingGapNpr,
    });
    if (reserve <= 0 && !zeroGap) break;
  }

  const expectedRemainingReserveNpr = reserve;
  const financialShortfallNpr = zeroGap
    ? 0
    : Math.max(0, monthlyFundingGapNpr * horizon - availableReserveNpr);

  const suggestedExpenseCutNpr =
    !zeroGap && remainingIncome > 0
      ? Math.max(0, Math.round(monthlyNeed - remainingIncome))
      : !zeroGap
        ? Math.round(monthlyNeed * 0.15)
        : null;

  return {
    availableReserveNpr,
    monthlyFundingGapNpr,
    safetyRunwayMonths:
      safetyRunwayMonths == null ? null : Math.round(safetyRunwayMonths * 100) / 100,
    safetyRunwayDays,
    depletion,
    expectedRemainingReserveNpr,
    financialShortfallNpr,
    suggestedExpenseCutNpr,
    zeroGap,
    isSimulation: true,
  };
}
