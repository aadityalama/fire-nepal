import type { RealEstateRow } from "@/components/portfolio/types";
import {
  reInsightCopy,
  reInsightInflationGuardrail,
  reInsightLowGrowthVsTime,
} from "@/components/portfolio/re-wealth-insights-bilingual";

/** Rough long-run CPI-style guardrail for “vs inflation” copy (planning, not official data). */
export const REAL_ESTATE_INFLATION_PROXY_PCT = 6.5;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseIsoDate(iso: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
  return dt;
}

/** Whole calendar months between acquired and as-of (inclusive-style; stable for “held” display). */
export function reCalendarMonthsHeld(acquiredIso: string | undefined, asOfIso = todayIso()): number | null {
  if (!acquiredIso) return null;
  const a = parseIsoDate(acquiredIso);
  const b = parseIsoDate(asOfIso);
  if (!a || !b || b < a) return null;
  let months = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  if (b.getDate() < a.getDate()) months -= 1;
  return Math.max(0, months);
}

export function reHoldingYrMo(acquiredIso: string | undefined, asOfIso = todayIso()): { years: number; months: number } | null {
  const total = reCalendarMonthsHeld(acquiredIso, asOfIso);
  if (total == null) return null;
  return { years: Math.floor(total / 12), months: total % 12 };
}

export function reFractionalYearsHeld(acquiredIso: string | undefined, asOfIso = todayIso()): number | null {
  if (!acquiredIso) return null;
  const a = parseIsoDate(acquiredIso);
  const b = parseIsoDate(asOfIso);
  if (!a || !b || b <= a) return null;
  const ms = b.getTime() - a.getTime();
  const years = ms / (365.25 * 24 * 3600 * 1000);
  return Math.max(years, 1e-6);
}

/** ROI %: ((current − purchase) / purchase) × 100 */
export function reRoiPct(purchase: number | undefined, current: number | undefined): number | null {
  const p = purchase ?? 0;
  const c = current ?? 0;
  if (p <= 0 || !Number.isFinite(p) || !Number.isFinite(c)) return null;
  return ((c - p) / p) * 100;
}

export function reProfitAmount(purchase: number | undefined, current: number | undefined): number | null {
  const p = purchase ?? 0;
  const c = current ?? 0;
  if (!Number.isFinite(p) || !Number.isFinite(c)) return null;
  if (p <= 0) return null;
  return c - p;
}

/** CAGR-style implied average annual growth from purchase → current over fractional years. */
export function reImpliedAnnualGrowthPct(
  purchase: number | undefined,
  current: number | undefined,
  acquiredIso: string | undefined,
  asOfIso = todayIso(),
): number | null {
  const p = purchase ?? 0;
  const c = current ?? 0;
  if (p <= 0 || c <= 0 || !Number.isFinite(p) || !Number.isFinite(c)) return null;
  const months = reCalendarMonthsHeld(acquiredIso, asOfIso);
  if (months == null || months < 1) return null;
  const years = reFractionalYearsHeld(acquiredIso, asOfIso);
  if (years == null) return null;
  return (Math.pow(c / p, 1 / years) - 1) * 100;
}

export type ReWealthInsight = {
  tone: "positive" | "neutral" | "caution";
  textEn: string;
  textNe: string;
};

function bi(tone: ReWealthInsight["tone"], en: string, ne: string): ReWealthInsight {
  return { tone, textEn: en, textNe: ne };
}

export function reWealthInsights(row: RealEstateRow, asOfIso = todayIso()): ReWealthInsight[] {
  const purchase = row.purchaseValue;
  const current = row.estimatedValue;
  const roi = reRoiPct(purchase, current);
  const implied = reImpliedAnnualGrowthPct(purchase, current, row.acquiredDate, asOfIso);
  const monthsHeld = reCalendarMonthsHeld(row.acquiredDate, asOfIso);
  const yearsHeld = monthsHeld != null ? monthsHeld / 12 : null;
  const assumed = row.annualAppreciationEstimatePct;

  const out: ReWealthInsight[] = [];

  if ((purchase ?? 0) <= 0 || (current ?? 0) <= 0) {
    out.push(bi("neutral", reInsightCopy.unlockInputs.en, reInsightCopy.unlockInputs.ne));
    return out;
  }

  if (roi != null && roi >= 40) {
    out.push(bi("positive", reInsightCopy.strongBookGain.en, reInsightCopy.strongBookGain.ne));
  } else if (roi != null && roi >= 15 && roi < 40) {
    out.push(bi("positive", reInsightCopy.solidCumulative.en, reInsightCopy.solidCumulative.ne));
  }

  if (implied != null && implied >= 10) {
    out.push(bi("positive", reInsightCopy.impliedRobust.en, reInsightCopy.impliedRobust.ne));
  }

  if (implied != null && implied >= REAL_ESTATE_INFLATION_PROXY_PCT) {
    const ig = reInsightInflationGuardrail(REAL_ESTATE_INFLATION_PROXY_PCT);
    out.push(bi("positive", ig.en, ig.ne));
  }

  if (yearsHeld != null && yearsHeld >= 2 && roi != null && roi < 5) {
    const lg = reInsightLowGrowthVsTime();
    out.push(bi("caution", lg.en, lg.ne));
  } else if (yearsHeld != null && yearsHeld >= 2 && roi != null && roi < 12) {
    out.push(bi("neutral", reInsightCopy.modestCumulative.en, reInsightCopy.modestCumulative.ne));
  }

  if (implied != null && implied < 2 && yearsHeld != null && yearsHeld >= 1) {
    out.push(bi("caution", reInsightCopy.impliedMuted.en, reInsightCopy.impliedMuted.ne));
  }

  if (typeof assumed === "number" && implied != null) {
    if (implied + 1 >= assumed) {
      out.push(bi("positive", reInsightCopy.trackingAboveEstimate.en, reInsightCopy.trackingAboveEstimate.ne));
    } else if (implied + 3 < assumed) {
      out.push(bi("neutral", reInsightCopy.belowAnnualEstimate.en, reInsightCopy.belowAnnualEstimate.ne));
    }
  }

  if (!out.length) {
    out.push(bi("neutral", reInsightCopy.balancedDefault.en, reInsightCopy.balancedDefault.ne));
  }

  return out.slice(0, 5);
}

/** Max years used in compound exponent (sanity cap). */
const RE_PROJECTION_MAX_YEARS = 120;

export type ReAppreciationTargetProjection = {
  /** Fractional years from acquired date → as-of (same basis as `reFractionalYearsHeld`). */
  fractionalYearsHeld: number;
  /** Purchase × (1 + r)^t at user target annual % `r`. */
  targetFutureValue: number;
  /** `targetFutureValue − purchase`. */
  futureProfitVsPurchase: number;
  /** User-entered compound assumption (equals CAGR of the target path from purchase). */
  targetCompoundAnnualPct: number;
  /** CAGR implied by purchase → current estimate over the same hold (if estimable). */
  impliedCagrFromMarketPct: number | null;
};

/**
 * Compound projection: if book value grew at `annualAppreciationEstimatePct` every year
 * for the fractional years held since `acquiredDate`, what value would you reach today?
 */
export function reAppreciationTargetProjection(
  row: Pick<RealEstateRow, "purchaseValue" | "estimatedValue" | "acquiredDate" | "annualAppreciationEstimatePct">,
  asOfIso = todayIso(),
): ReAppreciationTargetProjection | null {
  const pct = row.annualAppreciationEstimatePct;
  const purchase = row.purchaseValue ?? 0;
  if (pct == null || !Number.isFinite(pct) || pct < 0) return null;
  if (purchase <= 0 || !Number.isFinite(purchase)) return null;

  const years = reFractionalYearsHeld(row.acquiredDate, asOfIso);
  if (years == null || !Number.isFinite(years) || years <= 0) return null;

  const t = Math.min(years, RE_PROJECTION_MAX_YEARS);
  const r = Math.min(80, Math.max(0, pct)) / 100;
  const fv = purchase * (1 + r) ** t;
  const implied = reImpliedAnnualGrowthPct(purchase, row.estimatedValue, row.acquiredDate, asOfIso);

  return {
    fractionalYearsHeld: years,
    targetFutureValue: fv,
    futureProfitVsPurchase: fv - purchase,
    targetCompoundAnnualPct: pct,
    impliedCagrFromMarketPct: implied,
  };
}
