#!/usr/bin/env node
/**
 * Backfill nepse_eod_prices from the public ShareSansar history archive.
 * Usage:
 *   node scripts/backfill-nepse-eod.mjs
 *   node scripts/backfill-nepse-eod.mjs --limit=80 --priority=NABIL,NICA,HDL
 *   node scripts/backfill-nepse-eod.mjs --symbols=NABIL --min-bars=1
 */
import { createClient } from "@supabase/supabase-js";
import { loadDotEnvLocal } from "./load-dotenv-local.mjs";

loadDotEnvLocal();

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const m = arg.match(/^--([^=]+)=(.*)$/);
    return m ? [m[1], m[2]] : [arg.replace(/^--/, ""), "true"];
  }),
);

const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim().replace(/\/+$/, "");
const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const HISTORY_BASE = "https://omitnomis.github.io/ShareSansarScraper/api";
const symbolLimit = Math.min(Math.max(Number(args.limit) || 60, 1), 400);
const minBars = Math.max(Number(args["min-bars"]) || 60, 1);
const priority = String(args.priority ?? "NABIL,NICA,HDL,UPPER,SHIVM,SANIMA,GBIME")
  .split(",")
  .map((s) => s.trim().toUpperCase())
  .filter(Boolean);
const only = args.symbols
  ? String(args.symbols)
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean)
  : null;

const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

async function fetchJson(u) {
  const res = await fetch(u, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${u}`);
  return res.json();
}

async function upsertRows(rows) {
  let persisted = 0;
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    const { error } = await sb.from("nepse_eod_prices").upsert(chunk, { onConflict: "symbol,trade_date" });
    if (error) throw new Error(error.message);
    persisted += chunk.length;
  }
  return persisted;
}

function mapBars(symbol, payload) {
  const cols = payload.cols ?? [];
  const rows = payload.rows ?? [];
  const idx = Object.fromEntries(cols.map((c, i) => [c, i]));
  if (idx.d == null || idx.c == null) return [];
  const bars = [];
  for (const row of rows) {
    if (!Array.isArray(row)) continue;
    const tradeDate = String(row[idx.d] ?? "").slice(0, 10);
    const close = Number(row[idx.c] ?? row[idx.ltp]);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(tradeDate) || !Number.isFinite(close) || close <= 0) continue;
    bars.push({
      trade_date: tradeDate,
      open_npr: Number.isFinite(Number(row[idx.o])) ? Number(row[idx.o]) : null,
      high_npr: Number.isFinite(Number(row[idx.h])) ? Number(row[idx.h]) : null,
      low_npr: Number.isFinite(Number(row[idx.l])) ? Number(row[idx.l]) : null,
      close_npr: close,
      volume: Number.isFinite(Number(row[idx.vol])) ? Math.round(Number(row[idx.vol])) : null,
      turnover_npr: Number.isFinite(Number(row[idx.to])) ? Number(row[idx.to]) : null,
      change_pct: Number.isFinite(Number(row[idx.dp])) ? Number(row[idx.dp]) : null,
      previous_close_npr: null,
      trades: null,
      sector: null,
      symbol,
    });
  }
  bars.sort((a, b) => a.trade_date.localeCompare(b.trade_date));
  for (let i = 0; i < bars.length; i++) {
    if (i > 0) bars[i].previous_close_npr = bars[i - 1].close_npr;
    if (bars[i].open_npr == null) bars[i].open_npr = bars[i].previous_close_npr ?? bars[i].close_npr;
    if (bars[i].high_npr == null) bars[i].high_npr = Math.max(bars[i].open_npr ?? bars[i].close_npr, bars[i].close_npr);
    if (bars[i].low_npr == null) bars[i].low_npr = Math.min(bars[i].open_npr ?? bars[i].close_npr, bars[i].close_npr);
  }
  return bars;
}

const archiveSymbols = only ?? (await fetchJson(`${HISTORY_BASE}/symbols.json`));
const symbols = [...new Set([...(only ? [] : priority), ...archiveSymbols.map((s) => String(s).toUpperCase())])];

console.log(`Backfill start · candidates=${symbols.length} · limit=${symbolLimit} · minBars=${minBars}`);

let processed = 0;
let barsWritten = 0;
const failures = [];

for (const symbol of symbols) {
  if (processed >= symbolLimit) break;
  const { count } = await sb.from("nepse_eod_prices").select("*", { count: "exact", head: true }).eq("symbol", symbol);
  if ((count ?? 0) >= minBars) continue;
  processed += 1;
  try {
    const payload = await fetchJson(`${HISTORY_BASE}/history/${encodeURIComponent(symbol)}.json`);
    const rows = mapBars(symbol, payload);
    if (!rows.length) {
      failures.push(`${symbol}: empty`);
      console.log(`SKIP ${symbol} empty history`);
      continue;
    }
    const n = await upsertRows(rows);
    barsWritten += n;
    console.log(`OK   ${symbol} rows=${n} (had ${count ?? 0})`);
  } catch (err) {
    failures.push(`${symbol}: ${err instanceof Error ? err.message : String(err)}`);
    console.log(`FAIL ${symbol}: ${err instanceof Error ? err.message : String(err)}`);
  }
}

const { count: total } = await sb.from("nepse_eod_prices").select("*", { count: "exact", head: true });
const { data: nabil } = await sb
  .from("nepse_eod_prices")
  .select("trade_date, open_npr, high_npr, low_npr, close_npr, volume")
  .eq("symbol", "NABIL")
  .order("trade_date", { ascending: false })
  .limit(3);

await sb.from("nepse_ingestion_runs").insert({
  kind: "eod",
  status: failures.length && barsWritten === 0 ? "error" : failures.length ? "partial" : "ok",
  items: barsWritten,
  message: `CLI backfill wrote ${barsWritten} bars across ${processed} symbols`.slice(0, 500),
  started_at: new Date().toISOString(),
});

console.log(
  JSON.stringify(
    {
      processed,
      barsWritten,
      totalRows: total,
      failures: failures.slice(0, 10),
      nabilSample: nabil,
    },
    null,
    2,
  ),
);

process.exit(barsWritten > 0 || failures.length === 0 ? 0 : 1);
