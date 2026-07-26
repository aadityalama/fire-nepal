/**
 * Official NEPSE ownership provider.
 *
 * Source: NEPSE company security-detail endpoint (`/api/nots/security/{id}`), the same
 * public capital-structure fields shown on nepalstock.com company pages:
 *   promoterShares, publicShares, promoterPercentage, publicPercentage, stockListedShares
 *
 * Auth uses NEPSE's public `authenticate/prove` challenge + the exchange's published
 * WASM salt decoder (vendored binary). Mutual-fund / institutional / foreign splits are
 * NOT published by NEPSE — those fields stay null and must never be estimated.
 */

import { createMemoryTtlCache } from "@/lib/api/memory-ttl-cache";
import { NEPSE_AUTH_WASM_BASE64 } from "@/services/market/nepse-auth/nepse-auth-wasm";

const ROOT = "https://www.nepalstock.com.np";
const TTL_MS = 6 * 60 * 60 * 1000;
const cache = createMemoryTtlCache();

/** Payload dummy table published by NEPSE's own frontend / open scrapers (yonepse). */
const DUMMY_DATA = [
  147, 117, 239, 143, 157, 312, 161, 612, 512, 804, 411, 527, 170, 511, 421, 667, 764, 621, 301, 106,
  133, 793, 411, 511, 312, 423, 344, 346, 653, 758, 342, 222, 236, 811, 711, 611, 122, 447, 128, 199,
  183, 135, 489, 703, 800, 745, 152, 863, 134, 211, 142, 564, 375, 793, 212, 153, 138, 153, 648, 611,
  151, 649, 318, 143, 117, 756, 119, 141, 717, 113, 112, 146, 162, 660, 693, 261, 362, 354, 251, 641,
  157, 178, 631, 192, 734, 445, 192, 883, 187, 122, 591, 731, 852, 384, 565, 596, 451, 772, 624, 691,
];

export type ProviderOwnership = {
  symbol: string;
  securityId: number;
  promoterShares: number | null;
  publicShares: number | null;
  promoterPct: number | null;
  publicPct: number | null;
  listedShares: number | null;
  updatedDate: string | null;
};

type WasmExports = {
  cdx: (...args: number[]) => number;
  rdx: (...args: number[]) => number;
  bdx: (...args: number[]) => number;
  ndx: (...args: number[]) => number;
  mdx: (...args: number[]) => number;
};

let wasmExports: WasmExports | null = null;

async function loadWasm(): Promise<WasmExports> {
  if (wasmExports) return wasmExports;
  const bytes = Buffer.from(NEPSE_AUTH_WASM_BASE64, "base64");
  const { instance } = await WebAssembly.instantiate(bytes, {});
  const exports = instance.exports as Record<string, unknown>;
  wasmExports = {
    cdx: exports.cdx as WasmExports["cdx"],
    rdx: exports.rdx as WasmExports["rdx"],
    bdx: exports.bdx as WasmExports["bdx"],
    ndx: exports.ndx as WasmExports["ndx"],
    mdx: exports.mdx as WasmExports["mdx"],
  };
  return wasmExports;
}

function parseAccessToken(tokenResponse: Record<string, unknown>, wasm: WasmExports): string {
  const salt1 = Number(tokenResponse.salt1);
  const salt2 = Number(tokenResponse.salt2);
  const salt3 = Number(tokenResponse.salt3);
  const salt4 = Number(tokenResponse.salt4);
  const salt5 = Number(tokenResponse.salt5);
  const access = String(tokenResponse.accessToken ?? "");
  const n = wasm.cdx(salt1, salt2, salt3, salt4, salt5);
  const l = wasm.rdx(salt1, salt2, salt4, salt3, salt5);
  const o = wasm.bdx(salt1, salt2, salt4, salt3, salt5);
  const p = wasm.ndx(salt1, salt2, salt4, salt3, salt5);
  const q = wasm.mdx(salt1, salt2, salt4, salt3, salt5);
  return access.slice(0, n) + access.slice(n + 1, l) + access.slice(l + 1, o) + access.slice(o + 1, p) + access.slice(p + 1, q) + access.slice(q + 1);
}

async function fetchJson<T>(url: string, init: RequestInit = {}, retries = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...init,
        headers: {
          "user-agent": "FIRENepal-OwnershipBot/1.0 (+https://firenepal.com)",
          accept: "application/json",
          ...(init.headers ?? {}),
        },
        signal: AbortSignal.timeout(25_000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status} ${url}`);
      return (await response.json()) as T;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 350 * (attempt + 1)));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("NEPSE ownership fetch failed");
}

function num(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

export async function authenticateNepsePublicApi(): Promise<{ authorization: string; payloadId: number }> {
  const wasm = await loadWasm();
  const prove = await fetchJson<Record<string, unknown>>(`${ROOT}/api/authenticate/prove`);
  const access = parseAccessToken(prove, wasm);
  const authorization = `Salter ${access}`;
  const market = await fetchJson<{ id: number }>(`${ROOT}/api/nots/nepse-data/market-open`, {
    headers: { authorization },
  });
  const givenId = Number(market.id);
  if (!Number.isFinite(givenId) || givenId < 0 || givenId >= DUMMY_DATA.length) {
    throw new Error(`Unexpected NEPSE market-open id: ${market.id}`);
  }
  const today = new Date().getDate();
  // stock-live payload path: no salt adjustment (matches NEPSE frontend / yonepse).
  const payloadId = DUMMY_DATA[givenId] + givenId + 2 * today;
  return { authorization, payloadId };
}

/**
 * Fetch promoter / public ownership for every active NEPSE security.
 * Returns only rows where at least one real ownership field is published.
 */
export async function getOwnershipBySymbol(options?: {
  concurrency?: number;
  symbolLimit?: number;
}): Promise<Map<string, ProviderOwnership>> {
  const key = `nepse-ownership-v1:${options?.symbolLimit ?? "all"}`;
  const hit = cache.get<Map<string, ProviderOwnership>>(key);
  if (hit) return hit;

  const { authorization, payloadId } = await authenticateNepsePublicApi();
  const securities = await fetchJson<{ id: number; symbol: string; activeStatus?: string }[]>(
    `${ROOT}/api/nots/security?nonDelisting=true`,
    { headers: { authorization } },
  );

  const active = (Array.isArray(securities) ? securities : [])
    .filter((row) => row?.symbol && row.activeStatus !== "D")
    .map((row) => ({ id: Number(row.id), symbol: String(row.symbol).toUpperCase() }))
    .filter((row) => Number.isFinite(row.id) && row.symbol);

  const limit = options?.symbolLimit && options.symbolLimit > 0 ? options.symbolLimit : active.length;
  const targets = active.slice(0, limit);
  const concurrency = Math.min(Math.max(options?.concurrency ?? 3, 1), 6);
  const bySymbol = new Map<string, ProviderOwnership>();

  for (let i = 0; i < targets.length; i += concurrency) {
    const chunk = targets.slice(i, i + concurrency);
    const rows = await Promise.all(
      chunk.map(async (sec) => {
        try {
          const detail = await fetchJson<Record<string, unknown>>(`${ROOT}/api/nots/security/${sec.id}`, {
            method: "POST",
            headers: {
              authorization,
              "content-type": "application/json",
            },
            body: JSON.stringify({ id: payloadId }),
          });
          const promoterShares = num(detail.promoterShares);
          const publicShares = num(detail.publicShares);
          const listedShares = num(detail.stockListedShares);
          const promoterPct = num(detail.promoterPercentage);
          const publicPct = num(detail.publicPercentage);
          if (
            promoterShares == null &&
            publicShares == null &&
            listedShares == null &&
            promoterPct == null &&
            publicPct == null
          ) {
            return null;
          }
          return {
            symbol: sec.symbol,
            securityId: sec.id,
            promoterShares,
            publicShares,
            promoterPct,
            publicPct,
            listedShares,
            updatedDate: typeof detail.updatedDate === "string" ? detail.updatedDate : null,
          } satisfies ProviderOwnership;
        } catch {
          return null;
        }
      }),
    );
    for (const row of rows) {
      if (row) bySymbol.set(row.symbol, row);
    }
    // Gentle pacing — NEPSE closes sockets under burst load.
    await new Promise((resolve) => setTimeout(resolve, 120));
  }

  cache.set(key, bySymbol, TTL_MS);
  return bySymbol;
}
