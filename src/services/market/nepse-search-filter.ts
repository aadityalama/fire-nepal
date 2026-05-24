import type { NepseSecurityTick } from "@/types/market";

/**
 * Fast prefix + name substring search over an in-memory NEPSE map (server-side).
 */
export function filterNepseDirectory(
  bySymbol: Record<string, NepseSecurityTick>,
  rawQuery: string,
  limit = 28,
): NepseSecurityTick[] {
  const q = rawQuery.trim();
  if (!q) return [];
  const qu = q.toUpperCase();
  const ql = q.toLowerCase();
  const seen = new Set<string>();
  const out: NepseSecurityTick[] = [];

  const push = (t: NepseSecurityTick) => {
    if (seen.has(t.symbol)) return;
    seen.add(t.symbol);
    out.push(t);
  };

  for (const t of Object.values(bySymbol)) {
    if (t.symbol.startsWith(qu)) push(t);
    if (out.length >= limit) return out;
  }

  for (const t of Object.values(bySymbol)) {
    const name = (t.companyName ?? "").toLowerCase();
    if (name.includes(ql)) push(t);
    if (out.length >= limit) return out;
  }

  for (const t of Object.values(bySymbol)) {
    if (t.symbol.includes(qu)) push(t);
    if (out.length >= limit) return out;
  }

  return out;
}
