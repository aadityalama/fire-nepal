import {
  DEFAULT_NEPAL_COST_CITIES,
  type NepalCostLocation,
  type NepalCostLocationId,
} from "@/lib/nepal-cost-data";
import { locationById, retirementScore } from "@/lib/nepal-cost-of-living";

export type ColLifestyleId = "budget" | "standard" | "comfortable" | "luxury";

export type ColFamilyPlan = {
  adults: number;
  children: number;
  parents: number;
};

export type ColExpenseCategoryId =
  | "home"
  | "food"
  | "transportation"
  | "utilities"
  | "internet"
  | "healthcare"
  | "education"
  | "entertainment"
  | "clothing"
  | "miscellaneous";

export type ColExpenseAmounts = Record<ColExpenseCategoryId, number>;

export type ColExpenseItem = {
  id: ColExpenseCategoryId;
  label: string;
  amount: number;
  pct: number;
};

export type ColPlanState = {
  cityId: NepalCostLocationId;
  province: string;
  lifestyle: ColLifestyleId;
  family: ColFamilyPlan;
  /** User-provided monthly income in NPR; savings is hidden until this is set. */
  monthlyIncomeNpr: number | null;
  /** Korea-side monthly spend in NPR (for savings comparison). */
  monthlyKoreaSpendNpr: number;
  /** User-editable monthly amounts per category — total is always their sum. */
  expenses: ColExpenseAmounts;
};

export const COL_PLAN_STORAGE_KEY = "fire-nepal-col-plan-v3";

export const COL_LIFESTYLE_OPTIONS: Array<{
  id: ColLifestyleId;
  label: string;
  multiplier: number;
}> = [
  { id: "budget", label: "Budget", multiplier: 0.72 },
  { id: "standard", label: "Standard", multiplier: 1 },
  { id: "comfortable", label: "Comfortable", multiplier: 1.35 },
  { id: "luxury", label: "Luxury", multiplier: 1.85 },
];

export const COL_EXPENSE_META: Array<{ id: ColExpenseCategoryId; label: string }> = [
  { id: "home", label: "Home" },
  { id: "food", label: "Food" },
  { id: "transportation", label: "Transportation" },
  { id: "utilities", label: "Utilities" },
  { id: "internet", label: "Internet" },
  { id: "healthcare", label: "Healthcare" },
  { id: "education", label: "Education" },
  { id: "entertainment", label: "Entertainment" },
  { id: "clothing", label: "Clothing" },
  { id: "miscellaneous", label: "Miscellaneous" },
];

const CITY_PROVINCES: Record<string, string> = {
  kathmandu: "Bagmati Province",
  lalitpur: "Bagmati Province",
  bhaktapur: "Bagmati Province",
  pokhara: "Gandaki Province",
  chitwan: "Bagmati Province",
  hetauda: "Bagmati Province",
  butwal: "Lumbini Province",
  dharan: "Koshi Province",
  biratnagar: "Koshi Province",
  itahari: "Koshi Province",
  janakpur: "Madhesh Province",
  nepalgunj: "Lumbini Province",
  dhangadhi: "Sudurpashchim Province",
  birgunj: "Madhesh Province",
  tulsipur: "Lumbini Province",
  surkhet: "Karnali Province",
  bharatpur: "Bagmati Province",
  "rural-nepal": "Provincial / Rural",
};

export function provinceForCity(cityId: string): string {
  return CITY_PROVINCES[cityId] ?? "Nepal";
}

export function emptyExpenseAmounts(): ColExpenseAmounts {
  return Object.fromEntries(COL_EXPENSE_META.map((meta) => [meta.id, 0])) as ColExpenseAmounts;
}

function clampExpense(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(n));
}

export function itemsFromExpenses(expenses: ColExpenseAmounts): { items: ColExpenseItem[]; total: number } {
  const amounts = COL_EXPENSE_META.reduce<ColExpenseAmounts>((acc, meta) => {
    acc[meta.id] = clampExpense(expenses[meta.id]);
    return acc;
  }, emptyExpenseAmounts());

  const total = COL_EXPENSE_META.reduce((sum, meta) => sum + amounts[meta.id], 0);
  const items = COL_EXPENSE_META.map((meta) => ({
    ...meta,
    amount: amounts[meta.id],
    pct: total > 0 ? (amounts[meta.id] / total) * 100 : 0,
  }));

  return { items, total };
}

export function defaultColPlan(): ColPlanState {
  const cityId = "pokhara";
  const lifestyle: ColLifestyleId = "comfortable";
  const family: ColFamilyPlan = { adults: 2, children: 1, parents: 1 };
  const location = locationById(cityId);
  return {
    cityId,
    province: provinceForCity(cityId),
    lifestyle,
    family,
    monthlyIncomeNpr: null,
    monthlyKoreaSpendNpr: 150_000,
    expenses: computeSuggestedExpenses(location, lifestyle, family),
  };
}

export function sanitizeColPlan(raw: unknown): ColPlanState {
  const base = defaultColPlan();
  if (!raw || typeof raw !== "object") return base;
  const input = raw as Partial<ColPlanState> & { expenses?: Partial<ColExpenseAmounts> };
  const lifestyle = COL_LIFESTYLE_OPTIONS.some((item) => item.id === input.lifestyle)
    ? input.lifestyle!
    : base.lifestyle;
  const familyRaw = input.family;
  const family: ColFamilyPlan = {
    adults: clampCount(familyRaw?.adults, 1, 6, base.family.adults),
    children: clampCount(familyRaw?.children, 0, 6, base.family.children),
    parents: clampCount(familyRaw?.parents, 0, 4, base.family.parents),
  };
  const cityId =
    typeof input.cityId === "string" && DEFAULT_NEPAL_COST_CITIES.some((city) => city.id === input.cityId)
      ? input.cityId
      : base.cityId;
  const location = locationById(cityId);

  const hasStoredExpenses =
    input.expenses &&
    typeof input.expenses === "object" &&
    COL_EXPENSE_META.every((meta) => Number.isFinite(Number(input.expenses?.[meta.id])));

  const expenses = hasStoredExpenses
    ? COL_EXPENSE_META.reduce<ColExpenseAmounts>((acc, meta) => {
        acc[meta.id] = clampExpense(input.expenses?.[meta.id]);
        return acc;
      }, emptyExpenseAmounts())
    : computeSuggestedExpenses(location, lifestyle, family);

  return {
    cityId,
    province: typeof input.province === "string" && input.province.trim() ? input.province.trim() : provinceForCity(cityId),
    lifestyle,
    family,
    monthlyIncomeNpr: sanitizeOptionalMoney(input.monthlyIncomeNpr),
    monthlyKoreaSpendNpr: clampNumber(input.monthlyKoreaSpendNpr, 40_000, 800_000, base.monthlyKoreaSpendNpr),
    expenses,
  };
}

/** Recompute category suggestions when city, lifestyle, or family changes. */
export function applyPlanSettings(
  current: ColPlanState,
  patch: Partial<Omit<ColPlanState, "expenses">>,
  cities: NepalCostLocation[] = DEFAULT_NEPAL_COST_CITIES,
): ColPlanState {
  const next: ColPlanState = {
    ...current,
    ...patch,
    expenses: current.expenses,
  };
  if (patch.cityId) {
    next.province = provinceForCity(patch.cityId);
  }
  const location = locationById(next.cityId, cities);
  next.expenses = computeSuggestedExpenses(location, next.lifestyle, next.family);
  return next;
}

export function patchExpenseAmount(
  current: ColPlanState,
  categoryId: ColExpenseCategoryId,
  amount: number,
): ColPlanState {
  return {
    ...current,
    expenses: {
      ...current.expenses,
      [categoryId]: clampExpense(amount),
    },
  };
}

function clampCount(value: unknown, min: number, max: number, fallback: number): number {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function sanitizeOptionalMoney(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.round(n));
}

function lifestyleMultiplier(id: ColLifestyleId): number {
  return COL_LIFESTYLE_OPTIONS.find((item) => item.id === id)?.multiplier ?? 1;
}

function familyScale(family: ColFamilyPlan): number {
  return (
    1 +
    Math.max(0, family.adults - 2) * 0.12 +
    family.children * 0.18 +
    family.parents * 0.14
  );
}

/** Starting-point amounts when city / lifestyle / family changes — user can edit afterward. */
export function computeSuggestedExpenses(
  location: NepalCostLocation,
  lifestyle: ColLifestyleId,
  family: ColFamilyPlan,
): ColExpenseAmounts {
  const lifestyleMult = lifestyleMultiplier(lifestyle);
  const famMult = familyScale(family);
  const base = location.costs;

  const housing = Math.round(base.housing * lifestyleMult * famMult);
  const food = Math.round(base.food * lifestyleMult * (famMult + family.children * 0.08));
  const transportation = Math.round(base.transport * lifestyleMult * (1 + (family.adults + family.parents) * 0.06));
  const utilities = Math.round(base.utilities * lifestyleMult * famMult);
  const healthcare = Math.round(
    base.healthcare * lifestyleMult * (1 + family.parents * 0.2 + family.children * 0.08),
  );
  const entertainment = Math.round(base.entertainment * lifestyleMult * (1 + family.children * 0.05));
  const education = Math.round(family.children * 9_200 * lifestyleMult);
  const internet = Math.round(utilities * 0.38 + 1_200 * lifestyleMult);
  const clothing = Math.round(food * 0.11);

  const preMisc =
    housing + food + transportation + utilities + healthcare + entertainment + education + internet + clothing;
  const miscellaneous = Math.round(preMisc * 0.055);

  return {
    home: housing,
    food,
    transportation,
    utilities,
    internet,
    healthcare,
    education,
    entertainment,
    clothing,
    miscellaneous,
  };
}

export function computeColSnapshot(plan: ColPlanState, cities: NepalCostLocation[] = DEFAULT_NEPAL_COST_CITIES) {
  const location = locationById(plan.cityId, cities);
  const lifestyle = COL_LIFESTYLE_OPTIONS.find((item) => item.id === plan.lifestyle)!;
  const { items, total } = itemsFromExpenses(plan.expenses);
  const monthlySavings = plan.monthlyIncomeNpr === null ? null : plan.monthlyIncomeNpr - total;
  const savingsPct =
    plan.monthlyIncomeNpr && plan.monthlyIncomeNpr > 0 && monthlySavings !== null
      ? (monthlySavings / plan.monthlyIncomeNpr) * 100
      : null;
  const readiness = retirementScore(location, total);

  const trend = Array.from({ length: 8 }, (_, index) => ({
    month: index === 0 ? "Now" : `+${index}M`,
    value: Math.round(total * (1 + index * 0.0045)),
  }));

  const compareCities = ["kathmandu", "pokhara", "chitwan"].map((id) => {
    const city = locationById(id, cities);
    const suggested = computeSuggestedExpenses(city, plan.lifestyle, plan.family);
    const cityTotal = itemsFromExpenses(suggested).total;
    return { id, label: city.label, total: cityTotal };
  });

  const koreaSpend = plan.monthlyKoreaSpendNpr;
  const aiMessage =
    monthlySavings === null
      ? `Enter monthly income to calculate your savings in ${location.label}.`
      : `Living in ${location.label} with your ${lifestyle.label.toLowerCase()} lifestyle leaves NPR ${monthlySavings.toLocaleString("en-IN")} after monthly expenses.`;

  return {
    location,
    lifestyle,
    items,
    total,
    monthlySavings,
    savingsPct,
    readiness,
    trend,
    compareCities,
    koreaSpend,
    aiMessage,
    donutData: items
      .filter((item) => item.amount > 0)
      .map((item, index) => ({
        name: item.label,
        value: item.amount,
        fill: COL_CHART_COLORS[index % COL_CHART_COLORS.length],
      })),
  };
}

/** Emerald-only palette for charts — consistent fintech branding. */
export const COL_CHART_COLORS = [
  "#10B981",
  "#059669",
  "#34D399",
  "#047857",
  "#6EE7B7",
  "#065F46",
  "#A7F3D0",
  "#064E3B",
  "#D1FAE5",
  "#022C22",
];
