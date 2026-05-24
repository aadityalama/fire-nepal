import type { InvestmentKind } from "@/components/portfolio/types";
import type { MasterInstrument } from "@/lib/investment-market/types";
import { instrumentSearchBlob } from "@/lib/investment-market/types";
import { instrumentsForKind } from "@/lib/investment-market/instruments-by-kind";

/** True if all characters of `needle` appear in order within `hay` (fuzzy typing). */
export function isSubsequenceIgnoreCase(needle: string, hay: string): boolean {
  if (needle.length === 0) return true;
  const h = hay.toLowerCase();
  const n = needle.toLowerCase();
  let j = 0;
  for (let i = 0; i < h.length && j < n.length; i++) {
    if (h[i] === n[j]) j++;
  }
  return j === n.length;
}

function primarySearchToken(inst: MasterInstrument): string {
  switch (inst.universe) {
    case "nepse":
      return inst.symbol.toLowerCase();
    case "open_end_mf":
      return inst.fundName.toLowerCase();
    case "closed_end_mf":
      return inst.ticker.toLowerCase();
    case "us_stock":
      return inst.symbol.toLowerCase();
    case "etf":
      return inst.symbol.toLowerCase();
    default:
      return "";
  }
}

/**
 * Ranked match score for autocomplete (higher = better).
 * Supports ticker, full name, partial substring, and subsequence fuzzy.
 */
export function scoreInstrumentQuery(inst: MasterInstrument, rawQuery: string): number {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return 1;

  const blob = instrumentSearchBlob(inst);
  const sym =
    inst.universe === "nepse" || inst.universe === "us_stock" || inst.universe === "etf"
      ? inst.symbol.toLowerCase()
      : "";
  const primary = primarySearchToken(inst);

  if (q.length === 1) {
    if (sym && sym.startsWith(q)) return 520;
    if (primary.startsWith(q)) return 480;
    return 0;
  }

  if (sym && sym === q) return 2000;
  if (sym && sym.startsWith(q)) return 1600;
  if (blob.startsWith(q)) return 1200;
  if (blob.includes(q)) return 900 + Math.min(120, Math.floor((q.length / Math.max(blob.length, 1)) * 120));

  if (sym && isSubsequenceIgnoreCase(q, sym)) return 720;
  if (isSubsequenceIgnoreCase(q, blob)) return 580;

  const words = blob.split(/[\s,./|·&-]+/).filter(Boolean);
  for (const w of words) {
    if (w.startsWith(q)) return 640;
    if (isSubsequenceIgnoreCase(q, w)) return 420;
  }

  return 0;
}

/** Fuzzy ranked search — API-ready: prepend remote hits at call-site later. */
export function rankMasterInstruments(kind: InvestmentKind, query: string, limit = 60): MasterInstrument[] {
  const base = instrumentsForKind(kind);
  if (base.length === 0) return [];
  const q = query.trim();
  if (!q) return [...base].slice(0, limit);

  return [...base]
    .map((inst) => ({ inst, score: scoreInstrumentQuery(inst, q) }))
    .filter((x) => x.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        primarySearchToken(a.inst).localeCompare(primarySearchToken(b.inst)),
    )
    .map((x) => x.inst)
    .slice(0, limit);
}

/** Substring-only filter (simple callers / tests). */
export function filterMasterInstrumentsSubstring(kind: InvestmentKind, query: string): MasterInstrument[] {
  const base = instrumentsForKind(kind);
  if (base.length === 0) return [];
  const q = query.trim().toLowerCase();
  if (!q) return [...base];
  return base.filter((i) => instrumentSearchBlob(i).includes(q));
}
