/**
 * Response shape for `/api/market/gold-price` (spot bullion in NPR per gram).
 */
export type GoldSilverPriceResponse = {
  goldPerGramNPR: number;
  silverPerGramNPR: number;
  source: string;
  updatedAt: string;
  /** True when serving a stale quote after a failed refresh. */
  degraded?: boolean;
};
