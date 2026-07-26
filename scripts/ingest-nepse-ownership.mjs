#!/usr/bin/env node
/**
 * Ingest official NEPSE promoter/public ownership into nepse_company_profiles.
 * Usage: node scripts/ingest-nepse-ownership.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadDotEnvLocal } from "./load-dotenv-local.mjs";

loadDotEnvLocal();

const ROOT = "https://www.nepalstock.com.np";
const __dirname = dirname(fileURLToPath(import.meta.url));
const wasmPath = join(__dirname, "../src/services/market/nepse-auth/nepse-auth.wasm");
const wasmBytes = readFileSync(wasmPath);

const DUMMY_DATA = [
  147, 117, 239, 143, 157, 312, 161, 612, 512, 804, 411, 527, 170, 511, 421, 667, 764, 621, 301, 106,
  133, 793, 411, 511, 312, 423, 344, 346, 653, 758, 342, 222, 236, 811, 711, 611, 122, 447, 128, 199,
  183, 135, 489, 703, 800, 745, 152, 863, 134, 211, 142, 564, 375, 793, 212, 153, 138, 153, 648, 611,
  151, 649, 318, 143, 117, 756, 119, 141, 717, 113, 112, 146, 162, 660, 693, 261, 362, 354, 251, 641,
  157, 178, 631, 192, 734, 445, 192, 883, 187, 122, 591, 731, 852, 384, 565, 596, 451, 772, 624, 691,
];

const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim().replace(/\/+$/, "");
const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

async function fetchJson(u, init = {}, retries = 3) {
  let last;
  for (let i = 0; i < retries; i += 1) {
    try {
      const res = await fetch(u, {
        ...init,
        headers: {
          "user-agent": "FIRENepal-OwnershipBot/1.0",
          accept: "application/json",
          ...(init.headers ?? {}),
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      last = e;
      await new Promise((r) => setTimeout(r, 400 * (i + 1)));
    }
  }
  throw last;
}

const { instance } = await WebAssembly.instantiate(wasmBytes);
const { cdx, rdx, bdx, ndx, mdx } = instance.exports;
const prove = await fetchJson(`${ROOT}/api/authenticate/prove`);
const n = cdx(prove.salt1, prove.salt2, prove.salt3, prove.salt4, prove.salt5);
const l = rdx(prove.salt1, prove.salt2, prove.salt4, prove.salt3, prove.salt5);
const o = bdx(prove.salt1, prove.salt2, prove.salt4, prove.salt3, prove.salt5);
const p = ndx(prove.salt1, prove.salt2, prove.salt4, prove.salt3, prove.salt5);
const q = mdx(prove.salt1, prove.salt2, prove.salt4, prove.salt3, prove.salt5);
const a = prove.accessToken;
const access = a.slice(0, n) + a.slice(n + 1, l) + a.slice(l + 1, o) + a.slice(o + 1, p) + a.slice(p + 1, q) + a.slice(q + 1);
const authorization = `Salter ${access}`;
const market = await fetchJson(`${ROOT}/api/nots/nepse-data/market-open`, { headers: { authorization } });
const payloadId = DUMMY_DATA[market.id] + market.id + 2 * new Date().getDate();
const list = await fetchJson(`${ROOT}/api/nots/security?nonDelisting=true`, { headers: { authorization } });
const active = list.filter((x) => x?.symbol && x.activeStatus !== "D");

console.log(`Fetching ownership for ${active.length} securities (payloadId=${payloadId})…`);
const rows = [];
const concurrency = 4;
for (let i = 0; i < active.length; i += concurrency) {
  const chunk = active.slice(i, i + concurrency);
  const part = await Promise.all(
    chunk.map(async (sec) => {
      try {
        const detail = await fetchJson(`${ROOT}/api/nots/security/${sec.id}`, {
          method: "POST",
          headers: { authorization, "content-type": "application/json" },
          body: JSON.stringify({ id: payloadId }),
        });
        const promoter = typeof detail.promoterShares === "number" ? detail.promoterShares : null;
        const pub = typeof detail.publicShares === "number" ? detail.publicShares : null;
        const listed = typeof detail.stockListedShares === "number" ? detail.stockListedShares : null;
        if (promoter == null && pub == null && listed == null) return null;
        return {
          symbol: String(sec.symbol).toUpperCase(),
          promoter_shares: promoter,
          public_shares: pub,
          listed_shares: listed,
          source: "nepse:security-detail",
          updated_at: new Date().toISOString(),
        };
      } catch {
        return null;
      }
    }),
  );
  for (const row of part) if (row) rows.push(row);
  if ((i / concurrency) % 25 === 0) console.log(`  progress ${Math.min(i + concurrency, active.length)}/${active.length} · kept ${rows.length}`);
}

let persisted = 0;
for (let i = 0; i < rows.length; i += 200) {
  const chunk = rows.slice(i, i + 200);
  const { error } = await sb.from("nepse_company_profiles").upsert(chunk, { onConflict: "symbol" });
  if (error) throw new Error(error.message);
  persisted += chunk.length;
}

const targets = ["NABIL", "CIT", "STC", "SAHAS", "VLBS", "UPPER"];
const sample = Object.fromEntries(rows.filter((r) => targets.includes(r.symbol)).map((r) => [r.symbol, r]));
console.log(
  JSON.stringify(
    {
      ok: true,
      persisted,
      symbols: rows.length,
      withPromoter: rows.filter((r) => r.promoter_shares != null).length,
      withPublic: rows.filter((r) => r.public_shares != null).length,
      sample,
    },
    null,
    2,
  ),
);
