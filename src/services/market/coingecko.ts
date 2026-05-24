import { fetchJson } from "@/lib/api/fetch-json";

export async function fetchCoingeckoUsd(ids: string[]): Promise<Record<string, number>> {
  const uniq = [...new Set(ids.map((s) => s.trim().toLowerCase()).filter(Boolean))];
  if (!uniq.length) return {};
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(uniq.join(","))}&vs_currencies=usd`;
  try {
    const data = await fetchJson<Record<string, { usd?: number }>>(url, { timeoutMs: 12_000, retries: 1 });
    const out: Record<string, number> = {};
    for (const id of uniq) {
      const u = data[id]?.usd;
      if (typeof u === "number" && Number.isFinite(u)) out[id] = u;
    }
    return out;
  } catch {
    return {};
  }
}
