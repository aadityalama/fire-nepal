import type { InvestmentRow } from "@/components/portfolio/types";
import { getInstrumentByKey } from "@/lib/investment-market/catalog";
import type { MarketSnapshot } from "@/types/market";

function cryptoIdFromRow(row: InvestmentRow): string | undefined {
  const k = (row.instrumentKey ?? "").toLowerCase();
  if (k.includes("bitcoin") || k.includes("btc")) return "bitcoin";
  if (k.includes("ethereum") || k.includes("eth")) return "ethereum";
  const n = row.name.toLowerCase();
  if (n.includes("btc") || n.includes("bitcoin")) return "bitcoin";
  if (n.includes("eth") || n.includes("ethereum")) return "ethereum";
  return undefined;
}

function krxFromRow(row: InvestmentRow): string | undefined {
  const fromName = /\b(\d{6}\.KS)\b/i.exec(row.name)?.[1];
  if (fromName) return fromName.toUpperCase();
  const fromKey = /\b(\d{6}\.KS)\b/i.exec(row.instrumentKey ?? "")?.[1];
  if (fromKey) return fromKey.toUpperCase();
  return undefined;
}

/**
 * NPR per share/unit when `snapshot` contains a usable quote for this row.
 */
export function resolveLiveUnitNprFromSnapshot(
  row: InvestmentRow,
  snap: MarketSnapshot,
  krwPerNpr: number,
  usdPerNpr: number,
): number | undefined {
  const inst = getInstrumentByKey(row.instrumentKey);

  if (row.kind === "crypto") {
    const id = cryptoIdFromRow(row);
    const px = id ? snap.crypto[id]?.lastUsd : undefined;
    if (px == null || !Number.isFinite(px)) return undefined;
    return px / Math.max(usdPerNpr, 1e-12);
  }

  if (inst?.universe === "nepse") {
    const tick = snap.nepseBySymbol[inst.symbol.toUpperCase()];
    if (tick && Number.isFinite(tick.ltpNpr)) return tick.ltpNpr;
    return undefined;
  }

  if (inst?.universe === "open_end_mf") {
    const code = inst.key.includes(":") ? inst.key.split(":").pop()?.toUpperCase() : undefined;
    if (code) {
      const tick = snap.nepseBySymbol[code];
      if (tick && Number.isFinite(tick.ltpNpr)) return tick.ltpNpr;
    }
    return undefined;
  }

  if (inst?.universe === "closed_end_mf") {
    const tick = snap.nepseBySymbol[inst.ticker.toUpperCase()];
    if (tick && Number.isFinite(tick.ltpNpr)) return tick.ltpNpr;
    return undefined;
  }

  if (inst?.universe === "us_stock" || inst?.universe === "etf") {
    const sym = inst.symbol.toUpperCase();
    const q = snap.usdEquities[sym];
    if (!q || !Number.isFinite(q.lastUsd)) return undefined;
    return q.lastUsd / Math.max(usdPerNpr, 1e-12);
  }

  const ks = krxFromRow(row);
  if (ks) {
    const q = snap.krEquities[ks];
    if (!q || !Number.isFinite(q.lastKrw)) return undefined;
    return q.lastKrw / Math.max(krwPerNpr, 1e-12);
  }

  return undefined;
}
