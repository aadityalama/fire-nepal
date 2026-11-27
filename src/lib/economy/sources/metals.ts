import type { EconomyFetchOutcome } from "@/lib/economy/types";
import {
  fetchHamroPatroNepalRates,
  HAMRO_PATRO_GOLD_SOURCE_URL,
} from "@/services/market/hamropatro-nepal-rates";

function formatNpr(value: number) {
  return `रु ${Math.round(value).toLocaleString("en-US")}`;
}

/**
 * Nepal bullion — Hamro Patro Hallmark gold & silver (same domestic source as portfolio).
 * Reuses the shared Hamro Patro public-page parser (never invents prices).
 */
export async function fetchFenegosidaMetalMetrics(): Promise<EconomyFetchOutcome[]> {
  try {
    const board = await fetchHamroPatroNepalRates();
    if (!board) {
      return [
        { ok: false, key: "gold", error: "Hamro Patro gold page unavailable or unparseable", via: "primary" },
        { ok: false, key: "silver", error: "Hamro Patro gold page unavailable or unparseable", via: "primary" },
      ];
    }

    const publishedAt = `${board.publishedDate}T00:00:00+05:45`;
    return [
      {
        ok: true,
        via: "primary",
        metric: {
          key: "gold",
          value: board.goldNprPerTola,
          displayValue: formatNpr(board.goldNprPerTola),
          unit: "NPR per tola",
          currency: "NPR",
          source: "Hamro Patro",
          sourceUrl: HAMRO_PATRO_GOLD_SOURCE_URL,
          period: "Nepal market · Hallmark Gold",
          publishedAt,
          frequency: "daily",
          valueKind: "actual",
          liveCapable: true,
          tone: "neutral",
          raw: {
            goldNprPer10Gram: board.goldNprPer10Gram,
            goldNprPerTola: board.goldNprPerTola,
            publishedDate: board.publishedDate,
            goldDailyChangeNpr: board.goldDailyChangeNpr,
          },
        },
      },
      {
        ok: true,
        via: "primary",
        metric: {
          key: "silver",
          value: board.silverNprPerTola,
          displayValue: formatNpr(board.silverNprPerTola),
          unit: "NPR per tola",
          currency: "NPR",
          source: "Hamro Patro",
          sourceUrl: HAMRO_PATRO_GOLD_SOURCE_URL,
          period: "Nepal market · Silver",
          publishedAt,
          frequency: "daily",
          valueKind: "actual",
          liveCapable: true,
          tone: "neutral",
          raw: {
            silverNprPer10Gram: board.silverNprPer10Gram,
            silverNprPerTola: board.silverNprPerTola,
            publishedDate: board.publishedDate,
            silverDailyChangeNpr: board.silverDailyChangeNpr,
          },
        },
      },
    ];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return [
      { ok: false, key: "gold", error: message, via: "primary" },
      { ok: false, key: "silver", error: message, via: "primary" },
    ];
  }
}
