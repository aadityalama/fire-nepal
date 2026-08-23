import type { EconomyFetchOutcome } from "@/lib/economy/types";
import { fetchNepalFenegosidaBoardRates } from "@/services/market/fenegosida-nepal-rates";

const FENEGOSIDA_URL = "https://www.fenegosida.org/";

function formatNpr(value: number) {
  return `रु ${Math.round(value).toLocaleString("en-US")}`;
}

/**
 * Nepal bullion board (FENEGOSIDA) — primary metals source.
 * Reuses the shared portfolio metals parser (never invents prices).
 */
export async function fetchFenegosidaMetalMetrics(): Promise<EconomyFetchOutcome[]> {
  try {
    const board = await fetchNepalFenegosidaBoardRates();
    if (!board) {
      return [
        { ok: false, key: "gold", error: "FENEGOSIDA board unavailable or unparseable", via: "primary" },
        { ok: false, key: "silver", error: "FENEGOSIDA board unavailable or unparseable", via: "primary" },
      ];
    }

    const publishedAt = new Date().toISOString();
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
          source: "FENEGOSIDA",
          sourceUrl: FENEGOSIDA_URL,
          period: "Nepal bullion board · Fine Gold 9999",
          publishedAt,
          frequency: "daily",
          valueKind: "actual",
          liveCapable: true,
          tone: "neutral",
          raw: {
            goldNprPer10Gram: board.goldNprPer10Gram,
            goldNprPerTola: board.goldNprPerTola,
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
          source: "FENEGOSIDA",
          sourceUrl: FENEGOSIDA_URL,
          period: "Nepal bullion board · Silver",
          publishedAt,
          frequency: "daily",
          valueKind: "actual",
          liveCapable: true,
          tone: "neutral",
          raw: {
            silverNprPer10Gram: board.silverNprPer10Gram,
            silverNprPerTola: board.silverNprPerTola,
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
