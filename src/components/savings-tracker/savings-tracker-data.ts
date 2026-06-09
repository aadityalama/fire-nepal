/** Local-first savings tracker defaults — empty until user data is wired in. */

export type SavingsMonthPoint = {
  key: string;
  label: string;
  /** Monthly savings in NPR */
  savingsNpr: number;
};

export const MONTHLY_SAVINGS_SERIES: SavingsMonthPoint[] = [
  { key: "jun", label: "Jun", savingsNpr: 0 },
  { key: "jul", label: "Jul", savingsNpr: 0 },
  { key: "aug", label: "Aug", savingsNpr: 0 },
  { key: "sep", label: "Sep", savingsNpr: 0 },
  { key: "oct", label: "Oct", savingsNpr: 0 },
  { key: "nov", label: "Nov", savingsNpr: 0 },
  { key: "dec", label: "Dec", savingsNpr: 0 },
  { key: "jan", label: "Jan", savingsNpr: 0 },
  { key: "feb", label: "Feb", savingsNpr: 0 },
  { key: "mar", label: "Mar", savingsNpr: 0 },
  { key: "apr", label: "Apr", savingsNpr: 0 },
  { key: "may", label: "May", savingsNpr: 0 },
];

export const YEARLY_GROWTH = [{ year: String(new Date().getFullYear()), cumulativeNpr: 0 }];

/** Corpus trajectory placeholder — populate from user goals when available. Amounts in NPR. */
export const FIRE_PROGRESS_SERIES = [
  { month: "M1", actual: 0, projected: 0 },
  { month: "M3", actual: 0, projected: 0 },
  { month: "M6", actual: 0, projected: 0 },
  { month: "M9", actual: 0, projected: 0 },
  { month: "M12", actual: 0, projected: 0 },
];

export const SAVINGS_DASH_META = {
  totalSavingsNpr: 0,
  monthlySavingsNpr: 0,
  growthPctVsLastMonth: 0,
  goalCompletionPct: 0,
  fireTargetProgressPct: 0,
  monthlyRhythmPct: 0,
  fireTargetNpr: 0,
  bestMonthLabel: "—",
  bestMonthNpr: 0,
  avgMonthlyNpr: 0,
  savingsStreakMonths: 0,
  fireYearsEarlier: 0,
} as const;

export const AI_INSIGHTS: Array<{ id: string; title: string; body: string; tone: "positive" | "neutral" }> = [];
