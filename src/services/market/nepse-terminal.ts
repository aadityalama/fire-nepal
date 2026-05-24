import type { NepseSecurityTick, NepseTerminalSnapshot } from "@/types/market";

function asList(by: Record<string, NepseSecurityTick>): NepseSecurityTick[] {
  return Object.values(by);
}

function hasQuote(t: NepseSecurityTick): boolean {
  return Number.isFinite(t.ltpNpr) && t.ltpNpr > 0;
}

/**
 * Board-level analytics derived from the live NEPSE map (no hardcoded tickers).
 */
export function buildNepseTerminalSnapshot(bySymbol: Record<string, NepseSecurityTick>): NepseTerminalSnapshot {
  const list = asList(bySymbol).filter(hasQuote);
  const withPct = list.filter((t) => t.changePct != null && Number.isFinite(t.changePct));

  const topGainers = [...withPct]
    .sort((a, b) => (b.changePct ?? 0) - (a.changePct ?? 0))
    .slice(0, 12)
    .map((t) => ({ ...t }));

  const topLosers = [...withPct]
    .sort((a, b) => (a.changePct ?? 0) - (b.changePct ?? 0))
    .slice(0, 12)
    .map((t) => ({ ...t }));

  const mostActive = [...list]
    .filter((t) => (t.volume ?? 0) > 0)
    .sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0))
    .slice(0, 12)
    .map((t) => ({ ...t }));

  const turnoverLeaders = [...list]
    .filter((t) => (t.turnoverNpr ?? 0) > 0)
    .sort((a, b) => (b.turnoverNpr ?? 0) - (a.turnoverNpr ?? 0))
    .slice(0, 12)
    .map((t) => ({ ...t }));

  let adv = 0;
  let dec = 0;
  let flat = 0;
  for (const t of withPct) {
    const c = t.changePct ?? 0;
    if (c > 0.0005) adv++;
    else if (c < -0.0005) dec++;
    else flat++;
  }
  const denom = Math.max(dec, 1e-9);
  const advanceDeclineRatio = adv / denom;

  const sectorMap = new Map<
    string,
    { weight: number; wChange: number; count: number; turnover: number }
  >();

  for (const t of withPct) {
    const label = (t.sector ?? "").trim() || "Unclassified";
    const vol = t.volume ?? 0;
    const turnover = t.turnoverNpr ?? 0;
    const ch = t.changePct ?? 0;
    const row = sectorMap.get(label) ?? { weight: 0, wChange: 0, count: 0, turnover: 0 };
    row.count += 1;
    row.turnover += turnover;
    row.weight += vol;
    row.wChange += ch * Math.max(vol, 1);
    sectorMap.set(label, row);
  }

  const sectorPerformance = [...sectorMap.entries()]
    .map(([sector, agg]) => ({
      sector,
      avgChangePct: agg.weight > 0 ? agg.wChange / agg.weight : 0,
      constituents: agg.count,
      turnoverNpr: agg.turnover,
    }))
    .sort((a, b) => b.turnoverNpr - a.turnoverNpr)
    .slice(0, 14);

  const totalTurnoverNpr = list.reduce((a, t) => a + (t.turnoverNpr ?? 0), 0);

  return {
    topGainers,
    topLosers,
    mostActive,
    turnoverLeaders,
    sectorPerformance,
    breadth: {
      advancing: adv,
      declining: dec,
      unchanged: flat,
      advanceDeclineRatio,
    },
    totalsListed: list.length,
    totalTurnoverNpr,
  };
}
