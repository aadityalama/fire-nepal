/** Demo dataset — local-first premium UI (no backend). */

export const NPR_PER_KRW = 0.1029;

export type SavingsMonthPoint = {
  key: string;
  label: string;
  savingsKrw: number;
};

export const MONTHLY_SAVINGS_SERIES: SavingsMonthPoint[] = [
  { key: "jun", label: "Jun", savingsKrw: 980_000 },
  { key: "jul", label: "Jul", savingsKrw: 1_020_000 },
  { key: "aug", label: "Aug", savingsKrw: 1_050_000 },
  { key: "sep", label: "Sep", savingsKrw: 1_100_000 },
  { key: "oct", label: "Oct", savingsKrw: 1_080_000 },
  { key: "nov", label: "Nov", savingsKrw: 1_120_000 },
  { key: "dec", label: "Dec", savingsKrw: 1_150_000 },
  { key: "jan", label: "Jan", savingsKrw: 1_180_000 },
  { key: "feb", label: "Feb", savingsKrw: 1_210_000 },
  { key: "mar", label: "Mar", savingsKrw: 2_100_000 },
  { key: "apr", label: "Apr", savingsKrw: 1_240_000 },
  { key: "may", label: "May", savingsKrw: 1_280_000 },
];

export const YEARLY_GROWTH = [
  { year: "2022", cumulativeKrw: 42_000_000 },
  { year: "2023", cumulativeKrw: 71_500_000 },
  { year: "2024", cumulativeKrw: 98_200_000 },
  { year: "2025", cumulativeKrw: 118_400_000 },
  { year: "2026", cumulativeKrw: 127_500_000 },
];

/** Modelled corpus trajectory toward FIRE target (KRW). */
export const FIRE_PROGRESS_SERIES = [
  { month: "M1", actual: 108_000_000, projected: 108_000_000 },
  { month: "M3", actual: 112_400_000, projected: 114_200_000 },
  { month: "M6", actual: 118_900_000, projected: 121_000_000 },
  { month: "M9", actual: 122_600_000, projected: 127_800_000 },
  { month: "M12", actual: 127_500_000, projected: 134_500_000 },
];

export const SAVINGS_DASH_META = {
  totalSavingsKrw: 127_500_000,
  monthlySavingsKrw: 1_280_000,
  growthPctVsLastMonth: 12.4,
  goalCompletionPct: 68,
  fireTargetProgressPct: 52.7,
  /** Pace vs your personal monthly savings baseline (demo). */
  monthlyRhythmPct: 82,
  fireTargetKrw: 242_000_000,
  bestMonthLabel: "Mar 2026",
  bestMonthKrw: 2_100_000,
  avgMonthlyKrw: 1_150_000,
  savingsStreakMonths: 7,
  fireYearsEarlier: 2.8,
} as const;

export const AI_INSIGHTS = [
  {
    id: "pace",
    title: "Momentum",
    body: "You are saving 12.4% faster than last month — compounding is working in your favor.",
    tone: "positive" as const,
  },
  {
    id: "fire",
    title: "FIRE trajectory",
    body: "At this pace you could reach independence roughly 2.8 years earlier than your baseline plan.",
    tone: "positive" as const,
  },
  {
    id: "currency",
    title: "KRW → NPR window",
    body: "Pairing strong months with favorable remittance timing can stretch every won sent home.",
    tone: "neutral" as const,
  },
] as const;
