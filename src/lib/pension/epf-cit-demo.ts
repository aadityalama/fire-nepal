/** Demo balances for EPF / CIT desks — replace with payroll + fund APIs. */

export const EPF_DEMO = {
  memberBalanceNpr: 1_842_000,
  employerShareNpr: 1_105_200,
  employeeShareNpr: 736_800,
  interestAccruedNpr: 128_400,
  lastCreditLabel: "Chaitra 2081",
  voluntaryTopUpNpr: 240_000,
  vestingPct: 78,
  monthlyContributionNpr: 22_400,
} as const;

export const CIT_DEMO = {
  totalUnitsNpr: 980_000,
  schemes: [
    { id: "1", name: "CIT retirement fund", balanceNpr: 620_000, lockYears: 7, taxSavedNpr: 62_000 },
    { id: "2", name: "CIT growth sleeve", balanceNpr: 360_000, lockYears: 5, taxSavedNpr: 36_000 },
  ],
  annualCeilingNpr: 500_000,
  fyLabel: "2081/82",
} as const;
