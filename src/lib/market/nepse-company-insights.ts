import { formatCompactNpr } from "@/lib/market/nepse-hub";
import type { IndicatorReading } from "@/lib/market/technical-indicators";
import type { MarketSnapshot, NepseSecurityTick } from "@/types/market";

export type CompanyInsight = {
  stance: "Constructive" | "Cautious" | "Neutral" | "Insufficient data";
  summary: string;
  bullets: string[];
  peers: NepseSecurityTick[];
};

/** Deterministic session brief — never invents PE/EPS or buy/sell calls. */
export function buildCompanyInsight(
  tick: NepseSecurityTick | undefined,
  snapshot: MarketSnapshot | null,
  readings: IndicatorReading[],
): CompanyInsight {
  if (!tick) {
    return {
      stance: "Insufficient data",
      summary: "No live quote is available for this symbol in the current session feed.",
      bullets: ["Open a market service or retry after the feed refreshes."],
      peers: [],
    };
  }

  const bullish = readings.filter((r) => r.signal === "bullish").length;
  const bearish = readings.filter((r) => r.signal === "bearish").length;
  const change = tick.changePct ?? 0;
  const sector = snapshot?.nepseTerminal?.sectorPerformance.find((entry) => entry.sector === tick.sector);
  const peers = Object.values(snapshot?.nepseBySymbol ?? {})
    .filter((peer) => peer.symbol !== tick.symbol && peer.sector && peer.sector === tick.sector && peer.ltpNpr > 0)
    .sort((a, b) => Math.abs(b.changePct ?? 0) - Math.abs(a.changePct ?? 0))
    .slice(0, 5);

  const bullets: string[] = [];
  if (tick.ltpNpr > 0) {
    bullets.push(
      `Last traded at रु ${tick.ltpNpr.toLocaleString("en-IN")} (${change >= 0 ? "+" : ""}${change.toFixed(2)}% today).`,
    );
  }
  if (tick.volume != null || tick.turnoverNpr != null) {
    bullets.push(
      `Session activity: ${tick.volume?.toLocaleString("en-IN") ?? "—"} shares · ${formatCompactNpr(tick.turnoverNpr)} turnover${
        tick.trades != null ? ` · ${tick.trades.toLocaleString("en-IN")} trades` : ""
      }.`,
    );
  }
  if (sector) {
    const versus = change - sector.avgChangePct;
    bullets.push(
      `${tick.sector} peers average ${sector.avgChangePct >= 0 ? "+" : ""}${sector.avgChangePct.toFixed(2)}% — ${tick.symbol} is ${
        versus >= 0 ? "outperforming" : "lagging"
      } by ${Math.abs(versus).toFixed(2)} pts.`,
    );
  }
  if (readings.length) {
    bullets.push(`Indicative technicals (anchored series): ${bullish} bullish · ${bearish} bearish · ${readings.length - bullish - bearish} neutral.`);
  }
  bullets.push("Fundamental ratios, audited statements and ownership data appear once the company-data provider is connected — FIRE Nepal will not invent them.");

  let stance: CompanyInsight["stance"] = "Neutral";
  if (tick.ltpNpr <= 0) stance = "Insufficient data";
  else if (change > 1 && bullish >= bearish) stance = "Constructive";
  else if (change < -1 && bearish >= bullish) stance = "Cautious";

  const summary =
    stance === "Constructive"
      ? `${tick.symbol} shows a constructive session pulse relative to breadth and indicative technicals.`
      : stance === "Cautious"
        ? `${tick.symbol} is under session pressure; treat moves as flow-driven until fundamentals and news are confirmed.`
        : stance === "Insufficient data"
          ? `Live quote for ${tick.symbol} is incomplete for a confident session read.`
          : `${tick.symbol} is trading near a balanced session profile — no strong directional edge from live breadth alone.`;

  return { stance, summary, bullets, peers };
}
