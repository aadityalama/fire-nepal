/** Onboarding + generated FIRE profile (local-first, STEP 6A). */

export const PRODUCT_ONBOARDING_STORAGE_KEY = "fire-nepal-onboarding-v1";

export type FireTargetStyle = "lean_fire" | "traditional_fire" | "fat_fire";

export type ProductOnboardingState = {
  version: 1;
  completed: boolean;
  completedAt?: string;
  age: number;
  /** Monthly gross / take-home in NPR (single currency for MVP) */
  salaryMonthlyNpr: number;
  country: string;
  monthlySavingsNpr: number;
  fireTarget: FireTargetStyle;
  /** Derived at completion */
  generated?: {
    savingsRatePct: number;
    headline: string;
    estYearsToFiBand: string;
    runwayMonthsSuggested: number;
  };
};

export const DEFAULT_ONBOARDING: ProductOnboardingState = {
  version: 1,
  completed: false,
  age: 0,
  salaryMonthlyNpr: 0,
  country: "South Korea",
  monthlySavingsNpr: 0,
  fireTarget: "traditional_fire",
};

export function loadProductOnboarding(): ProductOnboardingState {
  if (typeof window === "undefined") return { ...DEFAULT_ONBOARDING };
  try {
    const raw = window.localStorage.getItem(PRODUCT_ONBOARDING_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_ONBOARDING };
    const o = JSON.parse(raw) as Partial<ProductOnboardingState>;
    if (o.version !== 1) return { ...DEFAULT_ONBOARDING };
    return {
      ...DEFAULT_ONBOARDING,
      ...o,
      generated: o.generated,
    };
  } catch {
    return { ...DEFAULT_ONBOARDING };
  }
}

export function saveProductOnboarding(state: ProductOnboardingState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PRODUCT_ONBOARDING_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* */
  }
}

export function generateFireProfileFromOnboarding(input: ProductOnboardingState): NonNullable<ProductOnboardingState["generated"]> {
  const inc = Math.max(0, input.salaryMonthlyNpr);
  const save = Math.max(0, input.monthlySavingsNpr);
  const sr = inc > 0 ? (save / inc) * 100 : 0;
  const targetAdj =
    input.fireTarget === "fat_fire" ? 1.25 : input.fireTarget === "lean_fire" ? 0.85 : 1;
  const spend = Math.max(0, inc - save);
  const runway = spend > 0 ? Math.round((save * 6) / spend) : 12;
  const bandLow = Math.max(6, Math.round((45 / Math.max(8, sr)) * targetAdj));
  const bandHigh = Math.min(42, Math.round(bandLow * 1.65));
  const label =
    input.fireTarget === "fat_fire" ? "fat FIRE" : input.fireTarget === "lean_fire" ? "lean FIRE" : "traditional FIRE";
  return {
    savingsRatePct: Math.round(sr * 10) / 10,
    headline: `At ~${Math.round(sr)}% savings vs income and a ${label} posture, you are building institutional-grade optionality for Nepal return.`,
    estYearsToFiBand: `${bandLow}–${bandHigh} yrs (desk estimate — refine in simulation)`,
    runwayMonthsSuggested: clamp(runway, 3, 24),
  };
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}
