/** Return to Nepal Planner — shared types (client-safe). */

export type NepalCityId = "kathmandu" | "pokhara" | "chitwan" | "dharan" | "butwal" | "village";

export type LifestyleMode = "basic" | "comfortable" | "premium" | "luxury";

export type PlannerSectionId =
  | "overview"
  | "timeline"
  | "col"
  | "house"
  | "passive"
  | "korea"
  | "family"
  | "business"
  | "gap"
  | "tax"
  | "ai"
  | "heart";

export type ConstructionPhaseId = "land" | "foundation" | "structure" | "roof" | "interior" | "handover";

export type SettlementChecklistId =
  | "schoolAdmissions"
  | "healthNepal"
  | "housingNepal"
  | "nprBanking"
  | "spouseTransition"
  | "migrationDocs";

export type ReturnToNepalPlannerState = {
  /** KRW already accumulated abroad */
  koreaSavingsKrw: number;
  /** NPR already in Nepal banks / assets */
  nepalLiquidNpr: number;
  /** Monthly salary KRW (gross-ish, for modelling) */
  monthlySalaryKrw: number;
  /** Assumed annual real salary growth while in Korea */
  salaryGrowthPct: number;
  /** Monthly amount saved KRW */
  monthlySavingsKrw: number;
  /** Years already worked in Korea */
  koreaYearsWorked: number;
  /** Planned additional years in Korea */
  plannedKoreaYearsRemaining: number;
  /** NPR/KRW for projections */
  nprPerKrw: number;
  /** Annual inflation assumption for Nepal expenses */
  nepalInflationPct: number;
  /** Target return calendar year (user anchor) */
  targetReturnYear: number;
  /** Household */
  adults: number;
  children: number;
  city: NepalCityId;
  lifestyle: LifestyleMode;
  /** House build */
  landBudgetNpr: number;
  constructionBudgetNpr: number;
  interiorBudgetNpr: number;
  furnitureBudgetNpr: number;
  homeLoanPrincipalNpr: number;
  homeLoanAprPct: number;
  homeLoanYears: number;
  houseProgressPct: number;
  completedPhases: ConstructionPhaseId[];
  /** Passive income (monthly NPR at today’s terms — engine inflates for future display where noted) */
  pensionMonthlyNpr: number;
  dividendMonthlyNpr: number;
  fdMonthlyNpr: number;
  rentalMonthlyNpr: number;
  swpMonthlyNpr: number;
  /** Korea severance / pension maturity (optional manual overrides; 0 = auto-estimate) */
  severanceOverrideKrw: number;
  nationalPensionMaturityOverrideKrw: number;
  /** Family resettlement */
  schoolFeesMonthlyNpr: number;
  relocationOneTimeNpr: number;
  parentSupportMonthlyNpr: number;
  healthcareMonthlyNpr: number;
  emergencyMonthsTarget: number;
  /** Business */
  businessCapitalNpr: number;
  expectedRentalYieldPct: number;
  /** Tax & checklist progress (0–100) */
  taxReadinessPct: number;
  bankingChecklistPct: number;
  propertyDocsPct: number;
  migrationChecklistPct: number;
  /** Family settlement checklist — completed item ids */
  settlementChecklist: SettlementChecklistId[];
};

export const NEPAL_CITY_LABELS: Record<NepalCityId, string> = {
  kathmandu: "Kathmandu",
  pokhara: "Pokhara",
  chitwan: "Chitwan",
  dharan: "Dharan",
  butwal: "Butwal",
  village: "Village lifestyle",
};

export const LIFESTYLE_LABELS: Record<LifestyleMode, string> = {
  basic: "Basic",
  comfortable: "Comfortable",
  premium: "Premium",
  luxury: "Luxury",
};

export const CONSTRUCTION_PHASES: { id: ConstructionPhaseId; label: string }[] = [
  { id: "land", label: "Land & permits" },
  { id: "foundation", label: "Foundation" },
  { id: "structure", label: "Structure" },
  { id: "roof", label: "Roof & envelope" },
  { id: "interior", label: "Interior & MEP" },
  { id: "handover", label: "Handover" },
];

export const SETTLEMENT_CHECKLIST_ITEMS: { id: SettlementChecklistId; label: string }[] = [
  { id: "schoolAdmissions", label: "Children — school admissions plan" },
  { id: "healthNepal", label: "Healthcare — Nepal coverage mapped" },
  { id: "housingNepal", label: "Housing — interim + long-term locked" },
  { id: "nprBanking", label: "Banking — NPR accounts & remittance rails" },
  { id: "spouseTransition", label: "Spouse — career / visa transition" },
  { id: "migrationDocs", label: "Documents — migration & property file" },
];
