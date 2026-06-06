/**
 * Response shape for `/api/market/gold-price` (spot bullion in NPR per gram).
 */
export type GoldSilverPriceResponse = {
  goldPerGramNPR: number;
  silverPerGramNPR: number;
  /** NPR per tola (11.6638038 g), same spot as per-gram. */
  goldPerTolaNPR: number;
  silverPerTolaNPR: number;
  /**
   * International reference spot in USD per troy oz.
   * When `nepalDomesticPrimary` is true, portfolio NPR/g comes from Nepal board; these are secondary reference only.
   */
  goldUsdPerTroyOz: number;
  silverUsdPerTroyOz: number;
  source: string;
  updatedAt: string;
  /** True when serving a stale quote after a failed refresh. */
  degraded?: boolean;
  /** NPR/g and NPR/tola follow Nepal market board (FENEGOSIDA) rather than FX-converted international spot. */
  nepalDomesticPrimary?: boolean;
  /** Short label for the international USD/oz feed (when Nepal is primary). */
  internationalRefSource?: string;
};
