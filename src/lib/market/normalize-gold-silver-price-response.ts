import {
  DEFAULT_BULLION_USD_PER_TROY_OZ,
  nprPerTolaFromGram,
} from "@/lib/market/bullion-estimate";
import type { GoldSilverPriceResponse } from "@/types/market/bullion";

/** Parse `/api/market/gold-price` JSON; fills tola + USD fields when an older payload omits them. */
export function normalizeGoldSilverPriceResponse(raw: unknown): GoldSilverPriceResponse | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const gg = o.goldPerGramNPR;
  const sg = o.silverPerGramNPR;
  if (typeof gg !== "number" || typeof sg !== "number") return null;
  if (!Number.isFinite(gg) || !Number.isFinite(sg) || gg < 0 || sg < 0) return null;

  const unavailable = o.domesticProvider === "unavailable" || (gg === 0 && sg === 0 && o.degraded === true);

  const goldPerTolaNPR =
    typeof o.goldPerTolaNPR === "number" && Number.isFinite(o.goldPerTolaNPR) && o.goldPerTolaNPR > 0
      ? o.goldPerTolaNPR
      : gg > 0
        ? nprPerTolaFromGram(gg)
        : 0;
  const silverPerTolaNPR =
    typeof o.silverPerTolaNPR === "number" && Number.isFinite(o.silverPerTolaNPR) && o.silverPerTolaNPR > 0
      ? o.silverPerTolaNPR
      : sg > 0
        ? nprPerTolaFromGram(sg)
        : 0;

  const goldUsdPerTroyOz =
    typeof o.goldUsdPerTroyOz === "number" && Number.isFinite(o.goldUsdPerTroyOz) && o.goldUsdPerTroyOz > 0
      ? o.goldUsdPerTroyOz
      : DEFAULT_BULLION_USD_PER_TROY_OZ.goldUsdPerOz;
  const silverUsdPerTroyOz =
    typeof o.silverUsdPerTroyOz === "number" && Number.isFinite(o.silverUsdPerTroyOz) && o.silverUsdPerTroyOz > 0
      ? o.silverUsdPerTroyOz
      : DEFAULT_BULLION_USD_PER_TROY_OZ.silverUsdPerOz;

  const source = typeof o.source === "string" && o.source.trim() ? o.source : "Market data";
  const updatedAt = typeof o.updatedAt === "string" ? o.updatedAt : new Date().toISOString();
  const degraded = o.degraded === true;
  const nepalDomesticPrimary = o.nepalDomesticPrimary === true;
  const internationalRefSource =
    typeof o.internationalRefSource === "string" && o.internationalRefSource.trim()
      ? o.internationalRefSource.trim()
      : undefined;
  const sourceUrl =
    typeof o.sourceUrl === "string" && o.sourceUrl.trim() ? o.sourceUrl.trim() : undefined;
  const publishedDate =
    typeof o.publishedDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(o.publishedDate)
      ? o.publishedDate
      : undefined;
  const publishedTimeLocal =
    typeof o.publishedTimeLocal === "string" && o.publishedTimeLocal.trim()
      ? o.publishedTimeLocal.trim()
      : undefined;
  const publishedBsLabel =
    typeof o.publishedBsLabel === "string" && o.publishedBsLabel.trim()
      ? o.publishedBsLabel.trim()
      : undefined;

  const goldNepalPer10GramNPR =
    typeof o.goldNepalPer10GramNPR === "number" && Number.isFinite(o.goldNepalPer10GramNPR) && o.goldNepalPer10GramNPR > 0
      ? o.goldNepalPer10GramNPR
      : undefined;
  const silverNepalPer10GramNPR =
    typeof o.silverNepalPer10GramNPR === "number" &&
    Number.isFinite(o.silverNepalPer10GramNPR) &&
    o.silverNepalPer10GramNPR > 0
      ? o.silverNepalPer10GramNPR
      : undefined;

  const domesticProvider =
    o.domesticProvider === "hamro_patro" || o.domesticProvider === "fenegosida" || o.domesticProvider === "unavailable"
      ? o.domesticProvider
      : unavailable
        ? "unavailable"
        : nepalDomesticPrimary
          ? "hamro_patro"
          : undefined;

  const numOrNull = (v: unknown): number | null | undefined => {
    if (v === null) return null;
    if (typeof v === "number" && Number.isFinite(v)) return v;
    return undefined;
  };

  return {
    goldPerGramNPR: gg,
    silverPerGramNPR: sg,
    goldPerTolaNPR,
    silverPerTolaNPR,
    goldUsdPerTroyOz,
    silverUsdPerTroyOz,
    source,
    updatedAt,
    ...(degraded ? { degraded: true } : {}),
    ...(nepalDomesticPrimary ? { nepalDomesticPrimary: true } : {}),
    ...(internationalRefSource ? { internationalRefSource } : {}),
    ...(sourceUrl ? { sourceUrl } : {}),
    ...(publishedDate ? { publishedDate } : {}),
    ...(publishedTimeLocal ? { publishedTimeLocal } : {}),
    ...(publishedBsLabel ? { publishedBsLabel } : {}),
    ...(goldNepalPer10GramNPR != null ? { goldNepalPer10GramNPR } : {}),
    ...(silverNepalPer10GramNPR != null ? { silverNepalPer10GramNPR } : {}),
    ...(domesticProvider ? { domesticProvider } : {}),
    ...(numOrNull(o.goldDailyChangeNpr) !== undefined ? { goldDailyChangeNpr: numOrNull(o.goldDailyChangeNpr)! } : {}),
    ...(numOrNull(o.silverDailyChangeNpr) !== undefined
      ? { silverDailyChangeNpr: numOrNull(o.silverDailyChangeNpr)! }
      : {}),
    ...(numOrNull(o.goldDailyChangePct) !== undefined ? { goldDailyChangePct: numOrNull(o.goldDailyChangePct)! } : {}),
    ...(numOrNull(o.silverDailyChangePct) !== undefined
      ? { silverDailyChangePct: numOrNull(o.silverDailyChangePct)! }
      : {}),
  };
}
