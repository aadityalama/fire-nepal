import type {
  ClosedEndedMutualFund,
  MasterInstrument,
  NepseListedStock,
  OpenEndedMutualFund,
} from "@/lib/investment-market/types";
import { CDSC_CLOSED_ENDED_FUNDS, CDSC_OPEN_ENDED_FUNDS } from "@/lib/investment-market/data/mutual-funds-cdsc.generated";
import { NEPSE_LISTED_STOCKS } from "@/lib/investment-market/data/nepse";

/**
 * Single merged catalog for Nepal equities + Nepal mutual funds (search + demo quotes).
 * Regenerate slices: `node scripts/generate-investment-registry.mjs` (see `scripts/README.md`).
 */
export const ALL_MASTER_INSTRUMENTS: readonly MasterInstrument[] = [
  ...NEPSE_LISTED_STOCKS,
  ...CDSC_OPEN_ENDED_FUNDS,
  ...CDSC_CLOSED_ENDED_FUNDS,
];

const BY_KEY = new Map<string, MasterInstrument>(ALL_MASTER_INSTRUMENTS.map((i) => [i.key, i]));

/** Legacy sample keys used `closed_mf:` — resolve to CDSC `closed_end_mf:` keys. */
function normalizeLookupKey(key: string): string {
  if (key.startsWith("closed_mf:")) return `closed_end_mf:${key.slice("closed_mf:".length)}`;
  return key;
}

/** Dynamic instruments resolved from the live NEPSE directory (`/api/market/nepse/search`). */
function yonepseDynamicInstrument(normalizedKey: string): MasterInstrument | undefined {
  let m = /^yonepse:nepse:([A-Z0-9]+)$/i.exec(normalizedKey);
  if (m) {
    const symbol = m[1].toUpperCase();
    const row: NepseListedStock = {
      universe: "nepse",
      key: normalizedKey,
      symbol,
      companyName: symbol,
      sector: "Trading",
      searchKeywords: [],
      demoLastPriceNpr: 0,
    };
    return row;
  }
  m = /^yonepse:mf:([A-Z0-9]+)$/i.exec(normalizedKey);
  if (m) {
    const code = m[1].toUpperCase();
    const row: OpenEndedMutualFund = {
      universe: "open_end_mf",
      key: normalizedKey,
      fundName: code,
      fundManager: "Live directory",
      category: "Mutual fund",
      sipSupported: true,
      demoNavNpr: 0,
    };
    return row;
  }
  m = /^yonepse:cef:([A-Z0-9]+)$/i.exec(normalizedKey);
  if (m) {
    const ticker = m[1].toUpperCase();
    const row: ClosedEndedMutualFund = {
      universe: "closed_end_mf",
      key: normalizedKey,
      ticker,
      fundName: ticker,
      category: "Closed-end fund",
      demoLastPriceNpr: 0,
    };
    return row;
  }
  return undefined;
}

export function getInstrumentByKey(key: string | undefined): MasterInstrument | undefined {
  if (!key) return undefined;
  const normalized = key.trim();
  return (
    BY_KEY.get(normalized) ??
    BY_KEY.get(normalizeLookupKey(normalized)) ??
    yonepseDynamicInstrument(normalized)
  );
}
