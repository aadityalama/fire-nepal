import type { NepseSecurityTick, NepseTerminalSnapshot } from "@/types/market";

export const NEPSE_TIMEFRAMES = ["1D", "1W", "1M", "3M", "6M", "1Y", "5Y", "ALL"] as const;
export type NepseTimeframe = (typeof NEPSE_TIMEFRAMES)[number];

export type NepseChartMode = "line" | "area" | "candlestick";

export const NEPSE_NEWS_SOURCES = [
  { name: "Mero Lagani", url: "https://merolagani.com" },
  { name: "ShareSansar", url: "https://www.sharesansar.com" },
  { name: "Nepali Paisa", url: "https://nepalipaisa.com" },
  { name: "Artha Kendra", url: "https://arthakendra.com" },
  { name: "Bajarko Chirfar", url: "https://bajarkochirfar.com" },
  { name: "NEPSE", url: "https://www.nepalstock.com" },
  { name: "SEBON", url: "https://www.sebon.gov.np" },
] as const;

export const NEPSE_SERVICE_ITEMS = [
  { slug: "top-gainers", label: "Top Gainers", description: "Session leaders", icon: "TrendingUp" },
  { slug: "top-losers", label: "Top Losers", description: "Largest declines", icon: "TrendingDown" },
  { slug: "top-turnover", label: "Top Turnover", description: "Value leaders", icon: "BadgeDollarSign" },
  { slug: "top-volume", label: "Top Volume", description: "Most traded", icon: "BarChart3" },
  { slug: "floorsheet", label: "Floorsheet", description: "Trade ledger", icon: "ListFilter" },
  { slug: "market-depth", label: "Market Depth", description: "Bid & ask levels", icon: "Layers3" },
  { slug: "heat-map", label: "Heat Map", description: "Visual breadth", icon: "Grid3X3" },
  { slug: "sector-performance", label: "Sector Performance", description: "Industry momentum", icon: "PieChart" },
  { slug: "live-trades", label: "Live Trades", description: "Latest executions", icon: "Zap" },
  { slug: "market-indices", label: "Market Indices", description: "All benchmarks", icon: "Activity" },
  { slug: "terminal", label: "Pro Terminal", description: "Full market board", icon: "Landmark" },
  { slug: "ipo-results", label: "IPO Results", description: "Issue outcomes", icon: "TicketCheck" },
  { slug: "corporate-actions", label: "Corporate Actions", description: "Dividend & rights", icon: "Landmark" },
  { slug: "screener", label: "Stock Screener", description: "Filter the market", icon: "SlidersHorizontal" },
  { slug: "top-brokers", label: "Top Brokers", description: "Broker activity", icon: "Users" },
  { slug: "ai-assistant", label: "AI Assistant", description: "Ask the market", icon: "Bot" },
] as const;

export type NepseServiceSlug = (typeof NEPSE_SERVICE_ITEMS)[number]["slug"];

export function isNepseServiceSlug(value: string): value is NepseServiceSlug {
  return NEPSE_SERVICE_ITEMS.some((item) => item.slug === value);
}

export function formatCompactNpr(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  if (abs >= 10_000_000_000) return `रु ${(value / 10_000_000_000).toFixed(2)} Ar`;
  if (abs >= 10_000_000) return `रु ${(value / 10_000_000).toFixed(2)} Cr`;
  if (abs >= 100_000) return `रु ${(value / 100_000).toFixed(2)} L`;
  return `रु ${Math.round(value).toLocaleString("en-IN")}`;
}

/** Official NEPSE continuous trading window (Kathmandu): 11:00–15:00, Sun–Thu. */
export const NEPSE_MARKET_OPEN_LABEL = "Opens at 11:00 AM";
export const NEPSE_MARKET_CLOSE_LABEL = "Open until 3:00 PM";
export const NEPSE_SESSION_OPEN_TIME = "11:00 AM";
export const NEPSE_SESSION_CLOSE_TIME = "3:00 PM";

function kathmanduParts(now: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kathmandu",
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "0";
  return {
    weekday: get("weekday"),
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
    second: Number(get("second")),
  };
}

function formatDurationHm(totalMinutes: number): string {
  const safe = Math.max(0, Math.floor(totalMinutes));
  const hours = Math.floor(safe / 60);
  const minutes = safe % 60;
  return `${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m`;
}

/** Next continuous-session open (11:00 NPT on a Sun–Thu). */
function minutesUntilNextOpen(now: Date): number {
  const k = kathmanduParts(now);
  const minutesNow = k.hour * 60 + k.minute;
  const openMinutes = 11 * 60;
  const weekdayOrder = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
  let weekdayIndex = weekdayOrder.indexOf(k.weekday as (typeof weekdayOrder)[number]);
  if (weekdayIndex < 0) weekdayIndex = 0;

  for (let offset = 0; offset <= 7; offset += 1) {
    const dayIndex = (weekdayIndex + offset) % 7;
    const name = weekdayOrder[dayIndex]!;
    if (name === "Fri" || name === "Sat") continue;
    if (offset === 0 && minutesNow >= openMinutes) continue;
    const dayMinutes = offset === 0 ? openMinutes - minutesNow : offset * 24 * 60 - minutesNow + openMinutes;
    return dayMinutes;
  }
  return 0;
}

export function getKathmanduMarketStatus(now = new Date()): {
  label: "Open" | "Closed" | "Pre-open";
  live: boolean;
} {
  const k = kathmanduParts(now);
  const minutes = k.hour * 60 + k.minute;
  const tradingDay = !["Fri", "Sat"].includes(k.weekday);
  if (tradingDay && minutes >= 10 * 60 + 30 && minutes < 11 * 60) {
    return { label: "Pre-open", live: false };
  }
  if (tradingDay && minutes >= 11 * 60 && minutes < 15 * 60) {
    return { label: "Open", live: true };
  }
  return { label: "Closed", live: false };
}

/** Premium hero panel status derived from official NEPSE trading hours. */
export function getKathmanduMarketPanelStatus(now = new Date()): {
  open: boolean;
  headline: "MARKET OPEN" | "MARKET CLOSED";
  detail: string;
  sessionLabel: string;
  sessionTime: string;
  countdownLabel: string;
  countdown: string;
} {
  const status = getKathmanduMarketStatus(now);
  const k = kathmanduParts(now);
  const minutesNow = k.hour * 60 + k.minute;

  if (status.live) {
    const remaining = 15 * 60 - minutesNow;
    return {
      open: true,
      headline: "MARKET OPEN",
      detail: NEPSE_MARKET_CLOSE_LABEL,
      sessionLabel: "Closes at",
      sessionTime: NEPSE_SESSION_CLOSE_TIME,
      countdownLabel: "Time Remaining",
      countdown: formatDurationHm(remaining),
    };
  }

  return {
    open: false,
    headline: "MARKET CLOSED",
    detail: NEPSE_MARKET_OPEN_LABEL,
    sessionLabel: "Next Session",
    sessionTime: NEPSE_SESSION_OPEN_TIME,
    countdownLabel: "Opens in",
    countdown: formatDurationHm(minutesUntilNextOpen(now)),
  };
}

export function countCircuitStocks(
  bySymbol: Record<string, NepseSecurityTick>,
): { upper: number; lower: number } {
  let upper = 0;
  let lower = 0;
  for (const tick of Object.values(bySymbol)) {
    const change = tick.changePct;
    if (change == null || !Number.isFinite(change)) continue;
    if (change >= 9.9) upper += 1;
    if (change <= -9.9) lower += 1;
  }
  return { upper, lower };
}

export function deriveMarketSentiment(term?: NepseTerminalSnapshot): {
  score: number;
  label: "Bullish" | "Neutral" | "Bearish";
  summary: string;
} {
  if (!term || term.totalsListed === 0) {
    return {
      score: 50,
      label: "Neutral",
      summary: "Live breadth is not available yet. Sentiment will update when the market feed responds.",
    };
  }
  const breadthTotal = term.breadth.advancing + term.breadth.declining + term.breadth.unchanged;
  const breadthScore = breadthTotal
    ? ((term.breadth.advancing + term.breadth.unchanged * 0.5) / breadthTotal) * 100
    : 50;
  const sectorScore = term.sectorPerformance.length
    ? (term.sectorPerformance.filter((sector) => sector.avgChangePct > 0).length /
        term.sectorPerformance.length) *
      100
    : 50;
  const score = Math.round(Math.max(0, Math.min(100, breadthScore * 0.72 + sectorScore * 0.28)));
  const label = score >= 60 ? "Bullish" : score <= 40 ? "Bearish" : "Neutral";
  const leadingSector = term.sectorPerformance[0]?.sector;
  return {
    score,
    label,
    summary:
      label === "Bullish"
        ? `Advancers are controlling market breadth${leadingSector ? `, with ${leadingSector} leading activity` : ""}. Momentum is constructive, but position sizing still matters.`
        : label === "Bearish"
          ? `Decliners dominate the session${leadingSector ? ` while ${leadingSector} leads turnover` : ""}. Momentum is defensive and risk controls deserve priority.`
          : `Breadth is balanced${leadingSector ? `, with ${leadingSector} drawing the most activity` : ""}. The market lacks a decisive directional signal.`,
  };
}

export function buildIndexSeries(
  anchor: number,
  timeframe: NepseTimeframe,
): { x: number; value: number; open: number; high: number; low: number; volume: number }[] {
  const countByRange: Record<NepseTimeframe, number> = {
    "1D": 40,
    "1W": 36,
    "1M": 42,
    "3M": 48,
    "6M": 52,
    "1Y": 56,
    "5Y": 64,
    ALL: 72,
  };
  const depthByRange: Record<NepseTimeframe, number> = {
    "1D": 0.012,
    "1W": 0.025,
    "1M": 0.055,
    "3M": 0.09,
    "6M": 0.13,
    "1Y": 0.2,
    "5Y": 0.38,
    ALL: 0.48,
  };
  const count = countByRange[timeframe];
  const depth = depthByRange[timeframe];
  const safeAnchor = anchor > 0 ? anchor : 2_650;
  const raw = Array.from({ length: count }, (_, index) => {
    const progress = index / Math.max(count - 1, 1);
    const wave =
      Math.sin(index * 0.66) * depth * 0.17 +
      Math.sin(index * 0.21 + 1.4) * depth * 0.12 +
      (progress - 1) * depth * 0.58;
    return safeAnchor * (1 + wave);
  });
  const adjustment = safeAnchor - raw[raw.length - 1];
  return raw.map((value, index) => {
    const close = value + adjustment * (index / Math.max(raw.length - 1, 1));
    const open = index === 0 ? close * 0.997 : raw[index - 1] + adjustment * ((index - 1) / (raw.length - 1));
    const spread = safeAnchor * depth * (0.018 + ((index * 7) % 5) * 0.004);
    return {
      x: index,
      value: close,
      open,
      high: Math.max(open, close) + spread,
      low: Math.min(open, close) - spread,
      volume: 35 + ((index * 29) % 61),
    };
  });
}
