/**
 * Response shape for `/api/market/gold-price` (spot bullion in NPR per gram).
 */
export type GoldSilverPriceResponse = {
  goldPerGramNPR: number;
  silverPerGramNPR: number;
  /** NPR per tola as published on the Nepal domestic source. */
  goldPerTolaNPR: number;
  silverPerTolaNPR: number;
  /** Official Nepal board line: gold / silver per 10 g (when domestic primary). */
  goldNepalPer10GramNPR?: number;
  silverNepalPer10GramNPR?: number;
  /**
   * International reference spot in USD per troy oz.
   * When `nepalDomesticPrimary` is true, portfolio NPR/g comes from Nepal domestic source;
   * these are secondary reference only — never a silent domestic substitute.
   */
  goldUsdPerTroyOz: number;
  silverUsdPerTroyOz: number;
  source: string;
  /** Last successful FIRE Nepal synchronization time (ISO). */
  updatedAt: string;
  /** True when serving a stale quote after a failed refresh. */
  degraded?: boolean;
  /** NPR/g and NPR/tola follow Nepal domestic market (Hamro Patro) rather than FX-converted international spot. */
  nepalDomesticPrimary?: boolean;
  /** Short label for the international USD/oz feed (when Nepal is primary). */
  internationalRefSource?: string;
  /** Canonical public source page. */
  sourceUrl?: string;
  /** Actual market publication date `YYYY-MM-DD` (Asia/Kathmandu calendar), not sync day. */
  publishedDate?: string;
  /** Published local time label when available (e.g. `10:45 am`). */
  publishedTimeLocal?: string;
  /** Optional BS publication label (e.g. `Mangsir 10`). */
  publishedBsLabel?: string;
  /** Daily NPR change vs previous published day (signed). */
  goldDailyChangeNpr?: number | null;
  silverDailyChangeNpr?: number | null;
  /** Daily percent change vs previous published day (signed). */
  goldDailyChangePct?: number | null;
  silverDailyChangePct?: number | null;
  /** Domestic provider id when nepalDomesticPrimary. */
  domesticProvider?: "hamro_patro" | "fenegosida" | "unavailable";
};
