/**
 * Free-float analytics from published ownership + session volume.
 * Never invents shares — null when required inputs are missing.
 */

export type FreeFloatInputs = {
  listedShares: number | null | undefined;
  promoterShares: number | null | undefined;
  publicShares: number | null | undefined;
  promoterPct: number | null | undefined;
  publicPct: number | null | undefined;
  todayVolume: number | null | undefined;
};

export type FreeFloatAnalytics = {
  listedShares: number | null;
  promoterShares: number | null;
  publicShares: number | null;
  /** Tradable shares available in the market (public float when published). */
  freeFloatShares: number | null;
  freeFloatPct: number | null;
  lockedShares: number | null;
  tradableShares: number | null;
  todayTradedShares: number | null;
  todayTradedPctOfFreeFloat: number | null;
  todayTradedPctOfListed: number | null;
  promoterOwnershipPct: number | null;
  publicOwnershipPct: number | null;
  /** Alias of today's traded % of free float for the participation card. */
  marketParticipationPct: number | null;
};

function finite(value: number | null | undefined): number | null {
  return value != null && Number.isFinite(value) && value >= 0 ? value : null;
}

function pct(numerator: number | null, denominator: number | null): number | null {
  if (numerator == null || denominator == null || denominator <= 0) return null;
  return (numerator / denominator) * 100;
}

/**
 * Free float = public shares when published.
 * Otherwise listed − promoter when both are published.
 */
export function deriveFreeFloatShares(
  listedShares: number | null,
  promoterShares: number | null,
  publicShares: number | null,
): number | null {
  if (publicShares != null && publicShares > 0) return publicShares;
  if (listedShares != null && promoterShares != null) {
    const derived = listedShares - promoterShares;
    return derived >= 0 ? derived : null;
  }
  return null;
}

export function buildFreeFloatAnalytics(input: FreeFloatInputs): FreeFloatAnalytics {
  const listedShares = finite(input.listedShares);
  const promoterShares = finite(input.promoterShares);
  const publicShares = finite(input.publicShares);
  const todayTradedShares = finite(input.todayVolume);

  const freeFloatShares = deriveFreeFloatShares(listedShares, promoterShares, publicShares);
  const lockedShares =
    promoterShares != null
      ? promoterShares
      : listedShares != null && freeFloatShares != null
        ? Math.max(listedShares - freeFloatShares, 0)
        : null;

  const freeFloatPct = pct(freeFloatShares, listedShares);
  const promoterOwnershipPct =
    finite(input.promoterPct) ?? pct(promoterShares, listedShares);
  const publicOwnershipPct = finite(input.publicPct) ?? pct(publicShares, listedShares) ?? freeFloatPct;

  const todayTradedPctOfFreeFloat = pct(todayTradedShares, freeFloatShares);
  const todayTradedPctOfListed = pct(todayTradedShares, listedShares);

  return {
    listedShares,
    promoterShares,
    publicShares,
    freeFloatShares,
    freeFloatPct,
    lockedShares,
    tradableShares: freeFloatShares,
    todayTradedShares,
    todayTradedPctOfFreeFloat,
    todayTradedPctOfListed,
    promoterOwnershipPct,
    publicOwnershipPct,
    marketParticipationPct: todayTradedPctOfFreeFloat,
  };
}
