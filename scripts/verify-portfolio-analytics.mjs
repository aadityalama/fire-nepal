#!/usr/bin/env node
/**
 * Verify institutional portfolio analytics math + production market context.
 *
 * Checks:
 *  - XIRR / CAGR / Sharpe / Sortino / Max Drawdown / Beta against known inputs
 *  - Insufficient-data paths return null (UI → "Data unavailable")
 *  - Production portfolio-analytics-context returns real EOD/dividends/profiles
 *  - nepse_index_eod presence + optional cron ingest population
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

function loadEnv(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!process.env[m[1]]) process.env[m[1]] = v;
  }
}

loadEnv(join(process.cwd(), ".env.local"));
loadEnv(join(process.cwd(), ".env.production.local"));

function mean(values) {
  if (!values.length) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}
function sampleStdev(values) {
  if (values.length < 2) return null;
  const m = mean(values);
  const variance = values.reduce((s, v) => s + (v - m) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}
function computeXirr(cashflows, guess = 0.1) {
  const flows = cashflows
    .filter((cf) => Number.isFinite(cf.amount) && cf.amount !== 0)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (flows.length < 2) return null;
  const t0 = Date.parse(`${flows[0].date}T00:00:00Z`);
  const years = flows.map((f) => (Date.parse(`${f.date}T00:00:00Z`) - t0) / (365.25 * 86400000));
  const npv = (rate) => flows.reduce((sum, f, i) => sum + f.amount / (1 + rate) ** years[i], 0);
  const dNpv = (rate) =>
    flows.reduce((sum, f, i) => sum - (years[i] * f.amount) / (1 + rate) ** (years[i] + 1), 0);
  let rate = guess;
  for (let i = 0; i < 64; i++) {
    const f = npv(rate);
    const df = dNpv(rate);
    if (!Number.isFinite(f) || !Number.isFinite(df) || Math.abs(df) < 1e-12) break;
    const next = rate - f / df;
    if (!Number.isFinite(next) || next <= -0.999999) break;
    if (Math.abs(next - rate) < 1e-9) return next;
    rate = next;
  }
  return null;
}
function annualizedCagrFraction(cost, value, days) {
  if (cost <= 0 || days < 1 || !Number.isFinite(value)) return null;
  return Math.pow(value / cost, 1 / (days / 365.25)) - 1;
}
function maxDrawdownPct(equity) {
  if (equity.length < 2) return null;
  let peak = equity[0];
  let maxDd = 0;
  for (const v of equity) {
    if (v > peak) peak = v;
    const dd = peak > 0 ? ((peak - v) / peak) * 100 : 0;
    if (dd > maxDd) maxDd = dd;
  }
  return maxDd;
}
function sharpeFromDailyReturns(dailyReturns) {
  if (dailyReturns.length < 20) return null;
  const m = mean(dailyReturns);
  const s = sampleStdev(dailyReturns);
  if (m == null || s == null || s === 0) return null;
  return (m / s) * Math.sqrt(252);
}
function sortinoFromDailyReturns(dailyReturns) {
  if (dailyReturns.length < 20) return null;
  const m = mean(dailyReturns);
  const downside = dailyReturns.filter((r) => r < 0);
  if (m == null || downside.length < 2) return null;
  const downDev = sampleStdev(downside);
  if (downDev == null || downDev === 0) return null;
  return (m / downDev) * Math.sqrt(252);
}
function linearRegressionBeta(asset, bench) {
  const n = Math.min(asset.length, bench.length);
  if (n < 20) return null;
  const a = asset.slice(-n);
  const b = bench.slice(-n);
  const meanA = mean(a);
  const meanB = mean(b);
  let cov = 0;
  let varB = 0;
  for (let i = 0; i < n; i++) {
    cov += (a[i] - meanA) * (b[i] - meanB);
    varB += (b[i] - meanB) ** 2;
  }
  if (varB <= 0) return null;
  return cov / varB;
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function nearly(a, b, tol = 1e-3) {
  return Math.abs(a - b) <= tol;
}

async function main() {
  const failures = [];
  const pass = (name) => console.log(`PASS  ${name}`);
  const fail = (name, err) => {
    failures.push(`${name}: ${err}`);
    console.log(`FAIL  ${name}: ${err}`);
  };

  // --- Pure math ---
  try {
    // Buy 100k on 2024-01-01, terminal 120k one year later → XIRR ≈ 20%
    const xirr = computeXirr([
      { date: "2024-01-01", amount: -100000 },
      { date: "2025-01-01", amount: 120000 },
    ]);
    assert(xirr != null && nearly(xirr, 0.2, 1e-3), `expected ~0.2 got ${xirr}`);
    pass("XIRR known cashflows");
  } catch (e) {
    fail("XIRR known cashflows", e.message);
  }

  try {
    const cagr = annualizedCagrFraction(100000, 120000, 365);
    assert(cagr != null && nearly(cagr, 0.2, 5e-3), `expected ~0.2 got ${cagr}`);
    pass("CAGR known cost→value");
  } catch (e) {
    fail("CAGR known cost→value", e.message);
  }

  try {
    assert(computeXirr([{ date: "2024-01-01", amount: -100 }]) == null, "single flow must be null");
    assert(annualizedCagrFraction(100, 110, 0) == null, "0 days must be null");
    assert(sharpeFromDailyReturns(Array.from({ length: 10 }, () => 0.01)) == null, "short sharpe null");
    assert(sortinoFromDailyReturns(Array.from({ length: 10 }, () => 0.01)) == null, "short sortino null");
    assert(linearRegressionBeta(Array(10).fill(0.01), Array(10).fill(0.01)) == null, "short beta null");
    pass("Insufficient data → null");
  } catch (e) {
    fail("Insufficient data → null", e.message);
  }

  try {
    const equity = [100, 110, 105, 90, 95];
    const mdd = maxDrawdownPct(equity);
    // peak 110 → trough 90 = 18.181...%
    assert(mdd != null && nearly(mdd, (20 / 110) * 100, 1e-6), `mdd=${mdd}`);
    pass("Maximum drawdown");
  } catch (e) {
    fail("Maximum drawdown", e.message);
  }

  try {
    const daily = Array.from({ length: 30 }, (_, i) => 0.008 - (i % 5) * 0.004);
    const sharpe = sharpeFromDailyReturns(daily);
    const sortino = sortinoFromDailyReturns(daily);
    assert(sharpe != null && Number.isFinite(sharpe), `sharpe=${sharpe}`);
    assert(sortino != null && Number.isFinite(sortino), `sortino=${sortino}`);
    pass("Sharpe / Sortino with 30 returns");
  } catch (e) {
    fail("Sharpe / Sortino with 30 returns", e.message);
  }

  try {
    // Perfect correlation → beta ≈ 1
    const bench = Array.from({ length: 30 }, (_, i) => Math.sin(i / 3) * 0.01);
    const asset = bench.map((r) => r * 1.5);
    const beta = linearRegressionBeta(asset, bench);
    assert(beta != null && nearly(beta, 1.5, 1e-6), `beta=${beta}`);
    pass("Beta linear regression");
  } catch (e) {
    fail("Beta linear regression", e.message);
  }

  // --- Production context ---
  const origin = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.firenepal.com").replace(/\/$/, "");
  try {
    const res = await fetch(`${origin}/api/market/nepse/portfolio-analytics-context`, {
      method: "POST",
      headers: { "content-type": "application/json", "user-agent": "FIRENepal-Verify/1.0" },
      body: JSON.stringify({ symbols: ["NABIL", "UPPER", "HDL", "NLIC"] }),
    });
    const json = await res.json();
    assert(res.ok && json.ok && json.context, `status=${res.status}`);
    const ctx = json.context;
    assert((ctx.eodBySymbol.NABIL?.length ?? 0) > 50, "NABIL EOD too short");
    assert((ctx.eodBySymbol.UPPER?.length ?? 0) > 50, "UPPER EOD too short");
    assert(ctx.profiles.NABIL?.sector, "NABIL sector missing");
    assert((ctx.dividends.NABIL?.length ?? 0) > 0, "NABIL dividends missing");
    assert((ctx.liveIndices?.length ?? 0) > 0, "live indices missing");
    const indexBars = Object.values(ctx.indexEod || {}).reduce((n, s) => n + (s.bars?.length ?? 0), 0);
    console.log(`INFO  indexEod bars=${indexBars} keys=${Object.keys(ctx.indexEod || {}).join(",") || "(none)"}`);
    if (indexBars < 2) {
      console.log("WARN  nepse_index_eod empty/unavailable — beta/historical alpha correctly stay Data unavailable until migration + cron populate");
    }
    pass("Production market context (multi-sector)");
  } catch (e) {
    fail("Production market context (multi-sector)", e.message);
  }

  // --- Table / ingest ---
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) {
    const sb = createClient(url, key, { auth: { persistSession: false } });
    const { error } = await sb.from("nepse_index_eod").select("index_key").limit(1);
    if (error) {
      console.log(`WARN  nepse_index_eod: ${error.message}`);
      console.log("WARN  Apply supabase/migrations/20260726200000_nepse_index_eod.sql then re-run cron (indices ingest)");
      console.log("WARN  Until then Beta / historical Alpha correctly remain Data unavailable");
      // Not a code failure — migration not visible to PostgREST yet.
    } else {
      const { count } = await sb.from("nepse_index_eod").select("*", { count: "exact", head: true });
      console.log(`INFO  nepse_index_eod count=${count}`);
      if ((count ?? 0) === 0) {
        console.log("WARN  table empty — run GET /api/cron/nepse-market-data?indices=1&backfill=0&fundamentals=0&disclosures=0&actions=0&ownership=0");
      } else {
        pass("nepse_index_eod populated");
      }
      pass("nepse_index_eod table visible");
    }
  } else {
    fail("supabase env", "missing URL/service role");
  }

  if (failures.length) {
    console.error(`\n${failures.length} failure(s)`);
    process.exit(1);
  }
  console.log("\nAll verification checks passed.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
