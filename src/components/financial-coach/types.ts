/** STEP 5B — AI Financial Coach (mock / deterministic intelligence). */

export type CoachSeverity = "info" | "success" | "warning" | "critical";

export type CoachCategory =
  | "savings"
  | "spending"
  | "income"
  | "passive"
  | "portfolio"
  | "fire"
  | "emergency"
  | "behavior";

export type CoachInsight = {
  id: string;
  title: string;
  body: string;
  severity: CoachSeverity;
  category: CoachCategory;
  /** Optional chip for UI */
  badge?: string;
};

export type CoachNotification = {
  id: string;
  label: string;
  detail?: string;
  tone: "neutral" | "positive" | "alert" | "milestone";
  priority: number;
};

export type CoachRecommendation = {
  id: string;
  title: string;
  body: string;
  impact: "high" | "medium" | "low";
};

export type BehavioralAnalytics = {
  /** Heuristic 0–100 from savings stability + NW momentum */
  savingsDisciplineScore: number;
  /** Heuristic 0–100 */
  investmentDisciplineScore: number;
  /** vs average of prior NW deltas when history allows */
  portfolioMomentumVs12m: "up" | "flat" | "down" | "unknown";
  /** Food share of category burn */
  diningPressure: "low" | "moderate" | "high" | "unknown";
  /** Narrative line */
  habitSummary: string;
};

export type FinancialCoachSnapshot = {
  hydrated: boolean;
  netWorthNpr: number;
  monthDeltaNpr: number | null;
  netWorthHistoryLen: number;
  fireScore: number;
  passiveMonthlyNpr: number;
  investableNpr: number;
  liquidNpr: number;
  liabilitiesNpr: number;
  totalAssetsNpr: number;
  savingsRatePct: number | null;
  totalIncomeNpr: number;
  monthlyBurnNpr: number;
  investableCashflowNpr: number;
  coverageMonths: number | null;
  emergencyReserveNpr: number | null;
  foodExpenseNpr: number;
  rentExpenseNpr: number;
  entertainmentExpenseNpr: number;
  insuranceExpenseNpr: number;
  salaryNpr: number;
  overtimeNpr: number;
  dividendNpr: number;
  krwPerNpr: number;
  /** Optional payslip trend */
  payslipGrossMoM_pct: number | null;
  /** FIRE engine (baseline desk model) */
  fireYearsToFi: number | null;
  fireAge: number | null;
  monthsToFi: number | null;
  /** Years shaved (positive) when adding ₩800k/mo invest in the desk model */
  yearsSavedByInvestKrw800k: number | null;
  /** 0–100 from marketCrashSimulation resilience */
  portfolioResilienceScore: number;
  /** Recent average month-on-month NW change (NPR) */
  avgNwDeltaNpr: number | null;
  /** Latest month-on-month NW change (NPR) */
  lastNwDeltaNpr: number | null;
};

export type FinancialCoachModel = {
  insights: CoachInsight[];
  notifications: CoachNotification[];
  recommendations: CoachRecommendation[];
  behavioral: BehavioralAnalytics;
};
