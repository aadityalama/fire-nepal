/** Local-first savings tracker defaults — empty until user data is wired in. */

export const NPR_PER_KRW = 0.1029;

export type SavingsMonthPoint = {
  key: string;
  label: string;
  savingsKrw: number;
};

export const MONTHLY_SAVINGS_SERIES: SavingsMonthPoint[] = [
  { key: "jun", label: "Jun", savingsKrw: 0 },
  { key: "jul", label: "Jul", savingsKrw: 0 },
  { key: "aug", label: "Aug", savingsKrw: 0 },
  { key: "sep", label: "Sep", savingsKrw: 0 },
  { key: "oct", label: "Oct", savingsKrw: 0 },
  { key: "nov", label: "Nov", savingsKrw: 0 },
  { key: "dec", label: "Dec", savingsKrw: 0 },
  { key: "jan", label: "Jan", savingsKrw: 0 },
  { key: "feb", label: "Feb", savingsKrw: 0 },
  { key: "mar", label: "Mar", savingsKrw: 0 },
  { key: "apr", label: "Apr", savingsKrw: 0 },
  { key: "may", label: "May", savingsKrw: 0 },
];

export const YEARLY_GROWTH = [{ year: String(new Date().getFullYear()), cumulativeKrw: 0 }];

/** Corpus trajectory placeholder — populate from user goals when available. */
export const FIRE_PROGRESS_SERIES = [
  { month: "M1", actual: 0, projected: 0 },
  { month: "M3", actual: 0, projected: 0 },
  { month: "M6", actual: 0, projected: 0 },
  { month: "M9", actual: 0, projected: 0 },
  { month: "M12", actual: 0, projected: 0 },
];

export const SAVINGS_DASH_META = {
  totalSavingsKrw: 0,
  monthlySavingsKrw: 0,
  growthPctVsLastMonth: 0,
  goalCompletionPct: 0,
  fireTargetProgressPct: 0,
  monthlyRhythmPct: 0,
  fireTargetKrw: 0,
  bestMonthLabel: "—",
  bestMonthKrw: 0,
  avgMonthlyKrw: 0,
  savingsStreakMonths: 0,
  fireYearsEarlier: 0,
} as const;

export const AI_INSIGHTS: Array<{ id: string; title: string; body: string; tone: "positive" | "neutral" }> = [];
