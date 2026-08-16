import type { MarketSnapshot, NepseSecurityTick } from "@/types/market";

function pickNepseSymbols(
  bySymbol: Record<string, NepseSecurityTick>,
  wanted: string[],
): Record<string, NepseSecurityTick> {
  if (!wanted.length) return {};
  const out: Record<string, NepseSecurityTick> = {};
  for (const raw of wanted) {
    const sym = raw.trim().toUpperCase();
    if (!sym) continue;
    const tick = bySymbol[sym];
    if (tick) out[sym] = tick;
  }
  return out;
}

/**
 * Project a full market snapshot into a CDN/client-friendly shape.
 * - `board=full`: unchanged (hub / terminal consumers).
 * - `board=lite`: only requested NEPSE symbols + index/forex/equities; drops heavy board maps.
 */
export function projectMarketSnapshot(
  snapshot: MarketSnapshot,
  opts: { board: "full" | "lite"; nepseSymbols: string[] },
): MarketSnapshot {
  if (opts.board === "full") return snapshot;

  return {
    ...snapshot,
    nepseBySymbol: pickNepseSymbols(snapshot.nepseBySymbol, opts.nepseSymbols),
    // Terminal movers/heatmap duplicate the board — omit on portfolio/lite polls.
    nepseTerminal: undefined,
  };
}
