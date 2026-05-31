import type { SsfBenefitRow, SsfMonthlyContribution, SsfNotification, NomineeRow } from "@/lib/ssf-pension/types";

/** Illustrative SSF workspace — replace with employer API / CSV import. */
export const SSF_SUMMARY = {
  totalBalanceNpr: 2_842_000,
  estimatedMonthlyPensionNpr: 38_200,
  contributionMonths: 118,
  readinessScore: 72,
  nextContributionDue: "2026-06-05",
  nextContributionLabel: "Jun 2026 cycle",
} as const;

export function buildContributionSeries(): SsfMonthlyContribution[] {
  const rows: SsfMonthlyContribution[] = [];
  let bal = 0;
  for (let m = 0; m < 18; m++) {
    const d = new Date(2026, 3 - m, 1);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const employee = 9_250 + (m % 4) * 400;
    const employer = employee;
    const interest = Math.round((bal + employee + employer) * 0.0085);
    bal += employee + employer + interest;
    const status: SsfMonthlyContribution["status"] =
      m === 0 ? "pending" : m === 5 ? "missing" : "paid";
    rows.push({
      id: `${year}-${month}`,
      year,
      month,
      label: d.toLocaleString("en", { month: "short", year: "numeric" }),
      employeeNpr: employee,
      employerNpr: employer,
      interestNpr: interest,
      status,
    });
  }
  return rows;
}

export const SSF_GROWTH_CHART = buildContributionSeries()
  .slice()
  .reverse()
  .map((r, i, arr) => {
    const cumulative = arr.slice(0, i + 1).reduce((s, x) => s + x.employeeNpr + x.employerNpr + x.interestNpr, 0);
    return { label: r.label, balance: cumulative, month: r.label };
  });

export const SSF_BENEFITS: SsfBenefitRow[] = [
  { id: "1", label: "Medical claim eligibility", status: "eligible", detail: "Primary member · in-network hospitals" },
  { id: "2", label: "Accident insurance", status: "eligible", detail: "Coverage active while contributions current" },
  { id: "3", label: "Family protection", status: "review", detail: "Nominee split totals 100% — verify KYC" },
  { id: "4", label: "Maternity benefits", status: "locked", detail: "Unlocks after 9 consecutive paid months" },
  { id: "5", label: "Dependent support", status: "eligible", detail: "Up to 2 dependents on file" },
];

export const SSF_NOTIFICATIONS: SsfNotification[] = [
  {
    id: "n1",
    kind: "premium_due",
    title: "Premium due",
    body: "Employer deposit window closes in 5 days — keep pension + insurance continuous.",
    createdAt: "2026-05-26T08:00:00.000Z",
    read: false,
  },
  {
    id: "n2",
    kind: "pension_update",
    title: "Pension estimate refreshed",
    body: "Desk model synced with your latest contribution pattern (demo).",
    createdAt: "2026-05-24T12:30:00.000Z",
    read: true,
  },
  {
    id: "n3",
    kind: "employer_missing",
    title: "Employer deposit flagged",
    body: "One historical month shows missing employer match — request ledger from HR.",
    createdAt: "2026-05-20T09:15:00.000Z",
    read: false,
  },
  {
    id: "n4",
    kind: "milestone",
    title: "Retirement milestone",
    body: "You crossed 118 contribution months toward Nepal retirement readiness.",
    createdAt: "2026-05-18T16:00:00.000Z",
    read: true,
  },
];

export const SSF_NOMINEES: NomineeRow[] = [
  { id: "a", name: "Sita Sharma", relation: "Spouse", sharePct: 60 },
  { id: "b", name: "Aarav Sharma", relation: "Child", sharePct: 40 },
];
