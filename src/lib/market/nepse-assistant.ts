import { formatCompactNpr } from "@/lib/market/nepse-hub";
import type { MarketSnapshot } from "@/types/market";

/**
 * Deterministic market Q&A over the live snapshot — no fabrication, no advice.
 * Handles the common NEPSE Hub intents (sector strength, symbol briefs, leaders,
 * market overview) and defers open-ended questions to FIRE AI chat.
 */

export type AssistantAnswer = {
  title: string;
  lines: string[];
  /** Symbols referenced by the answer, for deep links. */
  symbols: string[];
  deferToFireAi: boolean;
};

function pct(value: number | undefined | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function findSymbol(query: string, snapshot: MarketSnapshot): string | null {
  const words = query.toUpperCase().match(/[A-Z]{2,12}/g) ?? [];
  const stop = new Set(["WHY", "DID", "THE", "TODAY", "SHOW", "AND", "FOR", "ANALYZE", "ANALYSE", "SHOULD", "HOLD", "BUY", "SELL", "RISE", "FALL", "ABOUT", "WHAT", "HOW", "STOCK"]);
  for (const word of words) {
    if (stop.has(word)) continue;
    if (snapshot.nepseBySymbol[word]) return word;
  }
  return null;
}

function symbolBrief(symbol: string, snapshot: MarketSnapshot): AssistantAnswer {
  const tick = snapshot.nepseBySymbol[symbol];
  const lines: string[] = [];
  const positive = (tick.changePct ?? 0) >= 0;
  if (tick.ltpNpr > 0) {
    lines.push(`${symbol} (${tick.companyName ?? "NEPSE listed"}) last traded at रु ${tick.ltpNpr.toLocaleString("en-IN")}, ${pct(tick.changePct)} today.`);
  } else {
    lines.push(`${symbol} has no usable quote in the current session feed.`);
  }
  if (tick.highNpr != null && tick.lowNpr != null) {
    lines.push(`Intraday range: रु ${tick.lowNpr.toLocaleString("en-IN")} – रु ${tick.highNpr.toLocaleString("en-IN")}${tick.intradayRangePct != null ? ` (${tick.intradayRangePct.toFixed(2)}% of previous close)` : ""}.`);
  }
  if (tick.volume != null || tick.turnoverNpr != null) {
    lines.push(`Activity: ${tick.volume?.toLocaleString("en-IN") ?? "—"} shares, ${formatCompactNpr(tick.turnoverNpr)} turnover${tick.trades != null ? `, ${tick.trades.toLocaleString("en-IN")} trades` : ""}.`);
  }
  const sector = snapshot.nepseTerminal?.sectorPerformance.find((entry) => entry.sector === tick.sector);
  if (sector) {
    const versus = (tick.changePct ?? 0) - sector.avgChangePct;
    lines.push(`Its ${sector.sector} sector averages ${pct(sector.avgChangePct)} today, so ${symbol} is ${versus >= 0 ? "outperforming" : "lagging"} its peers by ${Math.abs(versus).toFixed(2)} points.`);
  }
  lines.push(positive ? "Today's move is supported by the session data above — deeper causes (news, fundamentals) need the research tabs." : "The decline reflects session flows above — check company news and fundamentals for context.");
  return { title: `${symbol} — session brief`, lines, symbols: [symbol], deferToFireAi: false };
}

export function answerMarketQuestion(rawQuery: string, snapshot: MarketSnapshot | null): AssistantAnswer {
  const query = rawQuery.trim();
  if (!snapshot) {
    return {
      title: "Market data still loading",
      lines: ["The live snapshot has not arrived yet. Try again in a few seconds."],
      symbols: [],
      deferToFireAi: false,
    };
  }
  const lower = query.toLowerCase();
  const term = snapshot.nepseTerminal;

  if (/(strongest|best|top).*(sector)|sector.*(strongest|best|leading)/.test(lower)) {
    const ranked = [...(term?.sectorPerformance ?? [])].sort((a, b) => b.avgChangePct - a.avgChangePct);
    if (!ranked.length) return { title: "Sector data unavailable", lines: ["Sector performance has not loaded yet."], symbols: [], deferToFireAi: false };
    const [top, ...rest] = ranked;
    return {
      title: `Strongest sector: ${top.sector}`,
      lines: [
        `${top.sector} leads with ${pct(top.avgChangePct)} average change across ${top.constituents} companies (${formatCompactNpr(top.turnoverNpr)} turnover).`,
        ...rest.slice(0, 3).map((sector, index) => `${index + 2}. ${sector.sector}: ${pct(sector.avgChangePct)} (${sector.constituents} companies)`),
      ],
      symbols: [],
      deferToFireAi: false,
    };
  }

  if (/(weakest|worst).*(sector)|sector.*(weakest|worst)/.test(lower)) {
    const ranked = [...(term?.sectorPerformance ?? [])].sort((a, b) => a.avgChangePct - b.avgChangePct);
    if (!ranked.length) return { title: "Sector data unavailable", lines: ["Sector performance has not loaded yet."], symbols: [], deferToFireAi: false };
    return {
      title: `Weakest sector: ${ranked[0].sector}`,
      lines: ranked.slice(0, 4).map((sector, index) => `${index + 1}. ${sector.sector}: ${pct(sector.avgChangePct)} (${sector.constituents} companies)`),
      symbols: [],
      deferToFireAi: false,
    };
  }

  if (/top.*(gainer|loser|turnover|volume)|gainer|loser/.test(lower)) {
    const losers = /loser/.test(lower);
    const byTurnover = /turnover/.test(lower);
    const byVolume = /volume/.test(lower);
    const rows = byTurnover ? term?.turnoverLeaders : byVolume ? term?.mostActive : losers ? term?.topLosers : term?.topGainers;
    const label = byTurnover ? "Turnover leaders" : byVolume ? "Volume leaders" : losers ? "Top losers" : "Top gainers";
    if (!rows?.length) return { title: `${label} unavailable`, lines: ["Leaderboard rows have not loaded yet."], symbols: [], deferToFireAi: false };
    return {
      title: label,
      lines: rows.slice(0, 5).map((tick, index) => `${index + 1}. ${tick.symbol}: रु ${tick.ltpNpr.toLocaleString("en-IN")} (${pct(tick.changePct)}, ${formatCompactNpr(tick.turnoverNpr)})`),
      symbols: rows.slice(0, 5).map((tick) => tick.symbol),
      deferToFireAi: false,
    };
  }

  if (/should i (hold|buy|sell)/.test(lower)) {
    const symbol = findSymbol(query, snapshot);
    const brief = symbol ? symbolBrief(symbol, snapshot) : null;
    return {
      title: "FIRE Nepal doesn't give buy/sell calls",
      lines: [
        ...(brief ? brief.lines : []),
        "Decisions stay with you: review the company's technical and fundamental tabs, and ask FIRE AI for a structured pros/cons discussion.",
      ],
      symbols: brief?.symbols ?? [],
      deferToFireAi: true,
    };
  }

  const symbol = findSymbol(query, snapshot);
  if (symbol) return symbolBrief(symbol, snapshot);

  if (/market|nepse|index|today|summary|overview/.test(lower)) {
    const breadth = term?.breadth;
    return {
      title: "Market overview",
      lines: [
        `NEPSE is at ${snapshot.nepseIndex?.value.toLocaleString("en-IN", { minimumFractionDigits: 2 }) ?? "—"} (${pct(snapshot.nepseIndex?.changePct)}).`,
        breadth ? `Breadth: ${breadth.advancing} advancing, ${breadth.declining} declining, ${breadth.unchanged} unchanged.` : "Breadth data is loading.",
        `Session turnover ${formatCompactNpr(term?.totalTurnoverNpr)} across ${term?.totalsListed?.toLocaleString("en-IN") ?? "—"} listed instruments.`,
      ],
      symbols: [],
      deferToFireAi: false,
    };
  }

  return {
    title: "I can answer from live market data",
    lines: [
      'Try: "Show today\'s strongest sector", "Top gainers", "Analyze NABIL", or "Why did SHIVM fall today?"',
      "For open-ended research, FIRE AI chat has the full context.",
    ],
    symbols: [],
    deferToFireAi: true,
  };
}
