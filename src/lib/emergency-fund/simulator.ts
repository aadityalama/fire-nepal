/**
 * Budget-based Emergency Fund job-loss / shock simulator.
 * Simulations never mutate financial records.
 */

import {
  approximateProtectionDays,
  finiteNonNeg,
  safeDivide,
} from "@/lib/emergency-fund/math";
import type {
  EmergencySimulationInput,
  EmergencySimulationResult,
} from "@/lib/emergency-fund/types";

export const SIMULATOR_SCENARIOS = [
  {
    id: "income_interruption",
    label: "Complete income interruption",
    defaultOneTimeCostNpr: 0,
    expenseMultiplier: 1,
  },
  {
    id: "temporary_unemployment",
    label: "Temporary unemployment",
    defaultOneTimeCostNpr: 0,
    expenseMultiplier: 1,
  },
  {
    id: "medical",
    label: "Unexpected medical expenses",
    defaultOneTimeCostNpr: 50_000,
    expenseMultiplier: 1.1,
  },
  {
    id: "family",
    label: "Unexpected family expenses",
    defaultOneTimeCostNpr: 40_000,
    expenseMultiplier: 1.05,
  },
  {
    id: "return_travel",
    label: "Emergency return-to-Nepal travel",
    defaultOneTimeCostNpr: 75_000,
    expenseMultiplier: 1,
  },
  {
    id: "reduced_spending",
    label: "Temporary reduction in planned spending",
    defaultOneTimeCostNpr: 0,
    expenseMultiplier: 0.7,
  },
  {
    id: "custom",
    label: "Custom emergency scenario",
    defaultOneTimeCostNpr: 0,
    expenseMultiplier: 1,
  },
] as const;

export type SimulatorScenarioId = (typeof SIMULATOR_SCENARIOS)[number]["id"];

export function runEmergencySimulation(
  input: EmergencySimulationInput,
): EmergencySimulationResult {
  const reserve = finiteNonNeg(input.currentReserveNpr);
  const oneTime = finiteNonNeg(input.oneTimeEmergencyCostNpr);
  const monthly = finiteNonNeg(input.simulatedMonthlyBudgetNpr);

  const availableSimulatedReserveNpr = Math.max(0, reserve - oneTime);
  const uncoveredOneTimeCostNpr = Math.max(0, oneTime - reserve);

  const simulatedSafetyRunwayMonths = safeDivide(availableSimulatedReserveNpr, monthly);
  const days = approximateProtectionDays(simulatedSafetyRunwayMonths);

  const monthByMonth: Array<{ month: number; remainingNpr: number }> = [];
  if (monthly <= 0) {
    monthByMonth.push({ month: 0, remainingNpr: availableSimulatedReserveNpr });
  } else {
    let remaining = availableSimulatedReserveNpr;
    monthByMonth.push({ month: 0, remainingNpr: remaining });
    const maxMonths = Math.min(36, Math.ceil(availableSimulatedReserveNpr / monthly) + 1);
    for (let m = 1; m <= maxMonths && remaining > 0; m += 1) {
      remaining = Math.max(0, remaining - monthly);
      monthByMonth.push({ month: m, remainingNpr: remaining });
    }
  }

  return {
    availableSimulatedReserveNpr,
    uncoveredOneTimeCostNpr,
    simulatedSafetyRunwayMonths,
    approximateProtectionDays: days,
    monthByMonth,
  };
}
