/**
 * Hamro Patro Nepal gold/silver parser + valuation regression.
 * Fixture prices are historical (Nov 26, 2026) — never hardcode them in production.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
const __dirname = dirname(fileURLToPath(import.meta.url));

// Load TS modules via tsx when available; otherwise duplicate pure helpers for node --test.
async function loadParser() {
  try {
    const mod = await import("../src/services/market/hamropatro-nepal-rates.ts");
    return mod;
  } catch {
    // Fallback: run with npx tsx --test
    throw new Error("Run with: npx tsx --test scripts/hamropatro-nepal-rates.test.mjs");
  }
}

const NEPAL_UI_GRAMS_PER_TOLA = 11.66;

function roiPct(cost, value) {
  if (cost <= 0 || !Number.isFinite(value)) return null;
  return ((value - cost) / cost) * 100;
}

describe("hamropatro nepal rates", () => {
  it("parses Nov 26 2026 fixture Hallmark gold & silver with daily changes", async () => {
    const { parseHamroPatroNepalRatesFromHtml, nprPerGramFromHamroPatroTola, resolveNepalMarketFreshness, kathmanduDateKey } =
      await loadParser();
    const html = readFileSync(join(__dirname, "fixtures/hamropatro-gold-2026-11-26.html"), "utf8");
    const parsed = parseHamroPatroNepalRatesFromHtml(html);
    assert.ok(parsed);
    assert.equal(parsed.goldNprPerTola, 242800);
    assert.equal(parsed.silverNprPerTola, 3075);
    assert.equal(parsed.publishedDate, "2026-11-26");
    assert.equal(parsed.goldNprPer10Gram, 208160);
    assert.equal(parsed.silverNprPer10Gram, 2636.5);
    assert.equal(parsed.goldDailyChangeNpr, 1400);
    assert.equal(parsed.silverDailyChangeNpr, 35);
    assert.ok(parsed.goldDailyChangePct != null && Math.abs(parsed.goldDailyChangePct - 0.6) < 0.05);
    assert.ok(parsed.silverDailyChangePct != null && Math.abs(parsed.silverDailyChangePct - 1.2) < 0.05);
    assert.equal(parsed.publishedTimeLocal, "10:45 am");
    assert.equal(parsed.publishedBsLabel, "Mangsir 10");

    // Freshness: published yesterday vs “today” Nov 27 NPT → last_published
    const freshness = resolveNepalMarketFreshness({
      publishedDate: parsed.publishedDate,
      hasPrice: true,
      now: new Date("2026-11-27T06:00:00+05:45"),
    });
    assert.equal(freshness, "last_published");
    assert.equal(kathmanduDateKey(new Date("2026-11-26T12:00:00+05:45")), "2026-11-26");

    // 7 tola gold valuation regression (UI grams convention)
    const grams = 7 * NEPAL_UI_GRAMS_PER_TOLA;
    assert.ok(Math.abs(grams - 81.62) < 1e-9);
    const perGram = nprPerGramFromHamroPatroTola(parsed.goldNprPerTola);
    const current = grams * perGram;
    assert.ok(Math.abs(current - 1_699_600) < 1e-6);
    const cost = 420_000;
    const profit = current - cost;
    assert.ok(Math.abs(profit - 1_279_600) < 1e-6);
    const roi = roiPct(cost, current);
    assert.ok(roi != null && Math.abs(roi - 304.67) < 0.005);
  });

  it("rejects empty / invalid HTML", async () => {
    const { parseHamroPatroNepalRatesFromHtml } = await loadParser();
    assert.equal(parseHamroPatroNepalRatesFromHtml(""), null);
    assert.equal(parseHamroPatroNepalRatesFromHtml("<html>no prices</html>"), null);
  });

  it("adaptive TTL is shorter during NPT morning publication window", async () => {
    const { hamroPatroCacheTtlMs } = await loadParser();
    const morning = hamroPatroCacheTtlMs(new Date("2026-11-27T10:30:00+05:45"));
    const night = hamroPatroCacheTtlMs(new Date("2026-11-27T22:00:00+05:45"));
    assert.equal(morning, 15 * 60 * 1000);
    assert.ok(night >= 30 * 60 * 1000);
  });
});
