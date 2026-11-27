/**
 * Integration test for buildMetalsPortfolioReportSnapshot (tsx).
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildMetalsPortfolioReportSnapshot,
  formatNepalDateKey,
  metalsReportFilename,
} from "../src/lib/metals-portfolio-report.ts";

const NEPAL_UI_GRAMS_PER_TOLA = 11.66;

describe("buildMetalsPortfolioReportSnapshot", () => {
  const generatedAt = new Date("2026-11-27T08:00:00+05:45");
  const gramRates = {
    goldNprPerGram: 242800 / NEPAL_UI_GRAMS_PER_TOLA,
    silverNprPerGram: 3075 / NEPAL_UI_GRAMS_PER_TOLA,
  };
  const tolaRates = { goldNprPerTola: 242800, silverNprPerTola: 3075 };

  const rows = [
    {
      id: "gold-1",
      metal: "gold",
      name: "Hallmark Chain",
      grams: 7 * NEPAL_UI_GRAMS_PER_TOLA,
      boughtDate: "2018-06-01",
      totalCostBasisNpr: 900000,
    },
    {
      id: "silver-1",
      metal: "silver",
      name: "Silver Coin",
      grams: 50,
      boughtDate: "2024-01-10",
      totalCostBasisNpr: 10000,
    },
  ];

  const ledger = [
    {
      id: "tx-buy-g",
      txType: "buy",
      bucket: "metal",
      rowId: "gold-1",
      assetLabel: "Hallmark Chain",
      metal: "gold",
      quantity: 7 * NEPAL_UI_GRAMS_PER_TOLA,
      unitPrice: 900000 / (7 * NEPAL_UI_GRAMS_PER_TOLA),
      currency: "NPR",
      tradeDate: "2018-06-01",
      fees: 500,
    },
    {
      id: "tx-buy-s",
      txType: "buy",
      bucket: "metal",
      rowId: "silver-1",
      assetLabel: "Silver Coin",
      metal: "silver",
      quantity: 50,
      unitPrice: 200,
      currency: "NPR",
      tradeDate: "2024-01-10",
      fees: 0,
    },
  ];

  it("builds complete report with dashboard-consistent valuation", () => {
    const snap = buildMetalsPortfolioReportSnapshot({
      rows,
      ledger,
      gramRates,
      tolaRates,
      bullionSpot: {
        goldPerGramNPR: gramRates.goldNprPerGram,
        silverPerGramNPR: gramRates.silverNprPerGram,
        goldPerTolaNPR: 242800,
        silverPerTolaNPR: 3075,
        goldUsdPerTroyOz: 0,
        silverUsdPerTroyOz: 0,
        source: "hamro_patro",
        updatedAt: "2026-11-26T10:00:00.000Z",
        nepalDomesticPrimary: true,
        domesticProvider: "hamro_patro",
        publishedDate: "2026-11-26",
        publishedTimeLocal: "10:45 am",
        sourceUrl: "https://www.hamropatro.com/gold",
      },
      netWorthNpr: 5_000_000,
      memberFullName: "Test Member",
      memberId: "FN-TEST-001",
      metalFilter: "all",
      generatedAt,
      referenceNumber: "FN-GS-TEST-001",
    });

    assert.equal(snap.reportTypeLabel, "Complete Gold & Silver Report");
    assert.equal(snap.memberFullName, "Test Member");
    assert.equal(snap.memberId, "FN-TEST-001");
    assert.equal(snap.currency, "NPR");
    assert.equal(Math.round(snap.summary.currentValueNpr), Math.round(7 * 242800 + 50 * gramRates.silverNprPerGram));
    assert.equal(snap.summary.totalInvestmentNpr, 910000);
    assert.equal(snap.summary.holdingsCount, 2);
    assert.ok(snap.summary.netWorthSharePct != null);
    assert.equal(snap.purchases.length, 2);
    assert.equal(snap.gold.holdings.length, 1);
    assert.equal(snap.gold.holdings[0].purchaseDate, "2018-06-01");
    assert.ok(snap.gold.cagrFraction != null);
    assert.equal(snap.market.sourceLabel, "Hamro Patro");
    assert.equal(snap.market.sourceUrl, "https://www.hamropatro.com/gold");
    assert.equal(snap.market.priceUnavailable, false);
  });

  it("gold-only report excludes silver holdings and txns", () => {
    const snap = buildMetalsPortfolioReportSnapshot({
      rows,
      ledger,
      gramRates,
      tolaRates,
      metalFilter: "gold",
      generatedAt,
      referenceNumber: "FN-GS-TEST-002",
    });
    assert.equal(snap.reportType, "gold");
    assert.equal(snap.summary.silverGrams, 0);
    assert.equal(snap.summary.holdingsCount, 1);
    assert.equal(snap.purchases.every((p) => p.metal === "gold"), true);
    assert.equal(snap.silver.holdings.length, 0);
  });

  it("reflects updated purchase date in holding duration / CAGR", () => {
    const recentRows = [
      {
        ...rows[0],
        boughtDate: "2026-10-01",
      },
    ];
    const recentLedger = [
      {
        ...ledger[0],
        tradeDate: "2026-10-01",
      },
    ];
    const older = buildMetalsPortfolioReportSnapshot({
      rows: [rows[0]],
      ledger: [ledger[0]],
      gramRates,
      tolaRates,
      metalFilter: "gold",
      generatedAt,
      referenceNumber: "A",
    });
    const newer = buildMetalsPortfolioReportSnapshot({
      rows: recentRows,
      ledger: recentLedger,
      gramRates,
      tolaRates,
      metalFilter: "gold",
      generatedAt,
      referenceNumber: "B",
    });
    assert.ok((older.gold.holdingDays ?? 0) > (newer.gold.holdingDays ?? 0));
    assert.ok(older.gold.cagrFraction != null && newer.gold.cagrFraction != null);
    assert.ok(newer.gold.cagrFraction > older.gold.cagrFraction);
    assert.equal(newer.gold.cagrIsAnnualizedShortPeriod, true);
  });

  it("marks Price Unavailable when domestic provider unavailable", () => {
    const snap = buildMetalsPortfolioReportSnapshot({
      rows,
      ledger,
      gramRates: { goldNprPerGram: 0, silverNprPerGram: 0 },
      tolaRates: { goldNprPerTola: 0, silverNprPerTola: 0 },
      bullionSpot: {
        goldPerGramNPR: 0,
        silverPerGramNPR: 0,
        goldPerTolaNPR: 0,
        silverPerTolaNPR: 0,
        goldUsdPerTroyOz: 2650,
        silverUsdPerTroyOz: 31,
        source: "unavailable",
        updatedAt: "2026-11-26T10:00:00.000Z",
        nepalDomesticPrimary: false,
        domesticProvider: "unavailable",
      },
      metalFilter: "all",
      generatedAt,
      referenceNumber: "FN-GS-TEST-UNAV",
    });
    assert.equal(snap.market.priceUnavailable, true);
    assert.equal(snap.market.goldPerGramNpr, null);
    assert.match(snap.market.statusLabel, /Unavailable/i);
  });

  it("filename uses Nepal calendar date", () => {
    assert.equal(metalsReportFilename(generatedAt), `FIRE-Nepal-Gold-Silver-Report-${formatNepalDateKey(generatedAt)}.pdf`);
  });

  it("empty portfolio still builds a valid snapshot", () => {
    const snap = buildMetalsPortfolioReportSnapshot({
      rows: [],
      ledger: [],
      gramRates,
      tolaRates,
      metalFilter: "all",
      generatedAt,
      referenceNumber: "EMPTY",
    });
    assert.equal(snap.summary.holdingsCount, 0);
    assert.equal(snap.summary.currentValueNpr, 0);
    assert.equal(snap.purchases.length, 0);
    assert.equal(snap.allocation.totalValueNpr, 0);
  });
});
