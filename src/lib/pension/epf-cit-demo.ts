/** Placeholder EPF / CIT desk shapes until payroll + fund APIs populate real balances. */

export const EPF_DEMO = {
  memberBalanceNpr: 0,
  employerShareNpr: 0,
  employeeShareNpr: 0,
  interestAccruedNpr: 0,
  lastCreditLabel: "",
  voluntaryTopUpNpr: 0,
  vestingPct: 0,
  monthlyContributionNpr: 0,
} as const;

export const CIT_DEMO = {
  totalUnitsNpr: 0,
  schemes: [] as { id: string; name: string; balanceNpr: number; lockYears: number; taxSavedNpr: number }[],
  annualCeilingNpr: 0,
  fyLabel: "",
} as const;
