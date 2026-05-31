import {
  COST_CATEGORY_LABELS,
  DEFAULT_COMPARISON_CITY_IDS,
  DEFAULT_NEPAL_COST_CITIES,
  type CostCategory,
  type LifestyleCost,
  type NepalCostLocation,
  type NepalCostLocationId,
} from "@/lib/nepal-cost-data";

export type NepalLifestyleId = "village" | "city" | "premium";

export type LifestyleTemplate = {
  id: NepalLifestyleId;
  title: string;
  subtitle: string;
  accent: string;
  costMultiplier: number;
};

export type FireCalculatorInput = {
  currentAge: number;
  retirementAge: number;
  monthlyExpense: number;
  inflationRate: number;
  investmentReturn: number;
};

export type { CostCategory, LifestyleCost, NepalCostLocation, NepalCostLocationId };
export { COST_CATEGORY_LABELS, DEFAULT_COMPARISON_CITY_IDS, DEFAULT_NEPAL_COST_CITIES as NEPAL_COST_LOCATIONS };

export const NEPAL_LIFESTYLE_TEMPLATES: LifestyleTemplate[] = [
  {
    id: "village",
    title: "Village Life",
    subtitle: "Lean family base, local food, low rent",
    accent: "from-lime-300 to-emerald-400",
    costMultiplier: 0.72,
  },
  {
    id: "city",
    title: "City Life",
    subtitle: "Comfortable urban FIRE baseline",
    accent: "from-cyan-300 to-emerald-400",
    costMultiplier: 1,
  },
  {
    id: "premium",
    title: "Premium Lifestyle",
    subtitle: "International comfort, private services",
    accent: "from-amber-200 to-emerald-300",
    costMultiplier: 1.85,
  },
];

export function locationById(id: NepalCostLocationId, cities: NepalCostLocation[] = DEFAULT_NEPAL_COST_CITIES): NepalCostLocation {
  return cities.find((location) => location.id === id) ?? cities[0] ?? DEFAULT_NEPAL_COST_CITIES[0];
}

export function lifestyleById(id: NepalLifestyleId): LifestyleTemplate {
  return NEPAL_LIFESTYLE_TEMPLATES.find((lifestyle) => lifestyle.id === id) ?? NEPAL_LIFESTYLE_TEMPLATES[1];
}

export function scaledLifestyleCost(lifestyle: LifestyleTemplate, location: NepalCostLocation): LifestyleCost {
  return Object.fromEntries(
    Object.entries(location.costs).map(([key, value]) => [key, Math.round(value * lifestyle.costMultiplier)]),
  ) as LifestyleCost;
}

export function monthlyCost(costs: LifestyleCost): number {
  return Object.values(costs).reduce((sum, value) => sum + value, 0);
}

export function computeFirePlan(input: FireCalculatorInput) {
  const yearsRemaining = Math.max(0, input.retirementAge - input.currentAge);
  const annualExpense = Math.max(0, input.monthlyExpense * 12);
  const realReturn = (1 + input.investmentReturn / 100) / (1 + input.inflationRate / 100) - 1;
  const withdrawalRate = Math.min(0.045, Math.max(0.0325, realReturn * 0.55));
  const requiredCorpus = annualExpense / withdrawalRate;
  const monthlyReturn = Math.max(0, input.investmentReturn / 100 / 12);
  const months = yearsRemaining * 12;
  const monthlyInvestmentNeeded =
    months <= 0
      ? requiredCorpus
      : monthlyReturn <= 0
        ? requiredCorpus / months
        : requiredCorpus / (((1 + monthlyReturn) ** months - 1) / monthlyReturn);

  return {
    annualExpense,
    yearsRemaining,
    realReturn,
    withdrawalRate,
    requiredCorpus,
    monthlyInvestmentNeeded,
    safeWithdrawalAmount: (requiredCorpus * withdrawalRate) / 12,
  };
}

export function futureMonthlyCost(monthlyExpense: number, inflationRate: number, years: number): number {
  return monthlyExpense * (1 + inflationRate / 100) ** years;
}

export function futureFireCorpus(monthlyExpense: number, inflationRate: number, years: number, withdrawalRate = 0.04): number {
  return (futureMonthlyCost(monthlyExpense, inflationRate, years) * 12) / withdrawalRate;
}

export function retirementScore(location: NepalCostLocation, monthlyExpense: number): number {
  const kathmanduMonthly = monthlyCost(DEFAULT_NEPAL_COST_CITIES[0]?.costs ?? location.costs);
  const affordabilityRatio = monthlyExpense / Math.max(1, kathmanduMonthly);
  const affordabilityScore = Math.max(35, Math.min(100, (1.18 - affordabilityRatio) * 112));
  const qualityScore =
    location.healthcareScore * 0.28 + location.climateScore * 0.24 + location.connectivityScore * 0.24 + location.safetyScore * 0.24;
  const monthlyPressurePenalty = Math.max(0, (monthlyExpense - 75_000) / 2_500);
  return Math.round(Math.max(0, Math.min(100, affordabilityScore * 0.46 + qualityScore * 0.54 - monthlyPressurePenalty)));
}

export function cityCostSnapshot(location: NepalCostLocation, lifestyle: LifestyleTemplate, inflationRate = 6) {
  const costs = scaledLifestyleCost(lifestyle, location);
  const monthly = monthlyCost(costs);
  const annual = monthly * 12;
  const fireCorpus = annual * 25;
  const retirement = retirementScore(location, monthly);
  const benchmarkMonthly = monthlyCost(scaledLifestyleCost(lifestyle, DEFAULT_NEPAL_COST_CITIES[0] ?? location));
  const affordabilityIndex = Math.max(0, Math.min(1, 1 - monthly / Math.max(1, benchmarkMonthly) + 0.45));

  return {
    id: location.id,
    label: location.label,
    shortLabel: location.shortLabel,
    monthly,
    annual,
    fireCorpus,
    corpus5Year: futureFireCorpus(monthly, inflationRate, 5),
    corpus10Year: futureFireCorpus(monthly, inflationRate, 10),
    retirementScore: retirement,
    valueIndex: Math.round(retirement * 0.62 + affordabilityIndex * 38),
  };
}

export function costForecastSeries(monthlyExpense: number, inflationRate: number) {
  return Array.from({ length: 11 }, (_, year) => ({
    year: year === 0 ? "Today" : `${year}Y`,
    monthly: Math.round(futureMonthlyCost(monthlyExpense, inflationRate, year)),
    annual: Math.round(futureMonthlyCost(monthlyExpense, inflationRate, year) * 12),
    corpus: Math.round(futureFireCorpus(monthlyExpense, inflationRate, year)),
  }));
}
