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
  /** Korea-side monthly spend in NPR (for savings comparison). */
  monthlyKoreaSpendNpr: number;
};

export const COL_PLAN_STORAGE_KEY = "fire-nepal-col-plan-v2";

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

export function defaultColPlan(): ColPlanState {
  return {
    cityId: "pokhara",
    province: provinceForCity("pokhara"),
    lifestyle: "comfortable",
    family: { adults: 2, children: 1, parents: 1 },
    monthlyKoreaSpendNpr: 150_000,
  };
}

export function sanitizeColPlan(raw: unknown): ColPlanState {
  const base = defaultColPlan();
  if (!raw || typeof raw !== "object") return base;
  const input = raw as Partial<ColPlanState>;
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
  return {
    cityId,
    province: typeof input.province === "string" && input.province.trim() ? input.province.trim() : provinceForCity(cityId),
    lifestyle,
    family,
    monthlyKoreaSpendNpr: clampNumber(input.monthlyKoreaSpendNpr, 40_000, 800_000, base.monthlyKoreaSpendNpr),
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

export function computeColBreakdown(
  location: NepalCostLocation,
  lifestyle: ColLifestyleId,
  family: ColFamilyPlan,
): { items: ColExpenseItem[]; total: number } {
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

  const amounts: Record<ColExpenseCategoryId, number> = {
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

  const total = Object.values(amounts).reduce((sum, value) => sum + value, 0);
  const items = COL_EXPENSE_META.map((meta) => ({
    ...meta,
    amount: amounts[meta.id],
    pct: total > 0 ? (amounts[meta.id] / total) * 100 : 0,
  }));

  return { items, total };
}

export function computeColSnapshot(plan: ColPlanState, cities: NepalCostLocation[] = DEFAULT_NEPAL_COST_CITIES) {
  const location = locationById(plan.cityId, cities);
  const lifestyle = COL_LIFESTYLE_OPTIONS.find((item) => item.id === plan.lifestyle)!;
  const { items, total } = computeColBreakdown(location, plan.lifestyle, plan.family);
  const monthlySavings = Math.max(0, plan.monthlyKoreaSpendNpr - total);
  const savingsPct = plan.monthlyKoreaSpendNpr > 0 ? (monthlySavings / plan.monthlyKoreaSpendNpr) * 100 : 0;
  const readiness = retirementScore(location, total);

  const trend = Array.from({ length: 8 }, (_, index) => ({
    month: index === 0 ? "Now" : `+${index}M`,
    value: Math.round(total * (1 + index * 0.0045)),
  }));

  const compareCities = ["kathmandu", "pokhara", "chitwan"].map((id) => {
    const city = locationById(id, cities);
    const cityTotal = computeColBreakdown(city, plan.lifestyle, plan.family).total;
    return { id, label: city.label, total: cityTotal };
  });

  const koreaSpend = plan.monthlyKoreaSpendNpr;
  const aiMessage = `Living in ${location.label} with your ${lifestyle.label.toLowerCase()} lifestyle allows you to save NPR ${monthlySavings.toLocaleString("en-IN")} every month compared to your Korea spend model.`;

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
    donutData: items.map((item, index) => ({
      name: item.label,
      value: item.amount,
      fill: COL_CHART_COLORS[index % COL_CHART_COLORS.length],
    })),
  };
}

export const COL_CHART_COLORS = [
  "#34d399",
  "#22d3ee",
  "#a78bfa",
  "#fbbf24",
  "#fb7185",
  "#60a5fa",
  "#4ade80",
  "#f472b6",
  "#94a3b8",
  "#2dd4bf",
];
