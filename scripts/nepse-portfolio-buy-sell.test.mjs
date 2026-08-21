/**
 * NEPSE Portfolio Buy/Sell ledger tracking (FIFO avg cost, oversell guard, realized P/L).
 * Run: npx tsx --test scripts/nepse-portfolio-buy-sell.test.mjs
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { defaultWealthState } from "../src/components/portfolio/storage.ts";
import {
  estimateInvestmentSellRealized,
  recordInvestmentBuy,
  recordInvestmentSell,
} from "../src/components/portfolio/portfolio-ledger.ts";
import { ensureNepseHoldingRow } from "../src/components/portfolio/nepse-portfolio/ensure-nepse-holding.ts";
import { buildNepsePortfolioSummary } from "../src/components/portfolio/nepse-portfolio/nepse-portfolio-metrics.ts";
import { resolveInvestmentQuantity } from "../src/services/portfolio/investment-aggregation.ts";
import { filterMasterInstruments } from "../src/lib/investment-market/registry.ts";

const FX = { krwPerNpr: 10, usdPerNpr: 0.0075 };

function seedHolding(name = "STC") {
  const state = defaultWealthState();
  const rowId = "holding-stc";
  state.investments = [
    {
      id: rowId,
      kind: "nepse",
      name,
      quantity: undefined,
      buyPrice: undefined,
      currency: "NPR",
      instrumentKey: "nepse:STC",
      purchaseDate: "2024-01-10",
    },
  ];
  return { state, rowId };
}

describe("NEPSE portfolio buy/sell tracking", () => {
  it("exposes real NEPSE companies in the master registry for Add Stock search", () => {
    const hits = filterMasterInstruments("nepse", "STC");
    assert.ok(hits.length > 0);
    assert.ok(hits.some((h) => h.universe === "nepse" && "symbol" in h && String(h.symbol).includes("STC")));
  });

  it("ensureNepseHoldingRow creates a zero-qty watch row then buy populates holdings", () => {
    const state = defaultWealthState();
    const ensured = ensureNepseHoldingRow(state, {
      instrumentKey: "nepse:NABIL",
      name: "Nabil Bank Limited",
      currency: "NPR",
    });
    assert.ok(ensured);
    assert.equal(resolveInvestmentQuantity(ensured.next.investments[0]), 0);

    const afterBuy = recordInvestmentBuy(
      ensured.next,
      ensured.rowId,
      { quantity: 10, unitPrice: 900, currency: "NPR", tradeDate: "2024-02-01" },
      FX,
    );
    assert.ok(afterBuy);
    const summary = buildNepsePortfolioSummary(
      afterBuy.investments,
      afterBuy.ledger,
      FX.krwPerNpr,
      FX.usdPerNpr,
      null,
      null,
    );
    const open = summary.holdings.filter((h) => h.currentUnits > 0);
    assert.equal(open.length, 1);
    assert.equal(open[0].currentUnits, 10);
  });

  it("ensureNepseHoldingRow reuses an existing holding by instrument key", () => {
    const { state, rowId } = seedHolding("STC");
    const again = ensureNepseHoldingRow(state, {
      instrumentKey: "nepse:STC",
      name: "STC",
      currency: "NPR",
    });
    assert.ok(again);
    assert.equal(again.rowId, rowId);
    assert.equal(again.next.investments.length, 1);
  });

  it("buy updates quantity, average cost, invested amount, and ledger", () => {
    const { state, rowId } = seedHolding();
    const after = recordInvestmentBuy(
      state,
      rowId,
      {
        quantity: 100,
        unitPrice: 400,
        currency: "NPR",
        tradeDate: "2024-02-01",
        fees: 50,
        brokerage: 40,
        otherCharges: 10,
        portfolioTrackingOnly: true,
      },
      FX,
    );
    assert.ok(after);
    const row = after.investments.find((r) => r.id === rowId);
    assert.equal(resolveInvestmentQuantity(row), 100);
    assert.equal(row.buyPrice, 400);
    assert.equal(after.ledger.length, 1);
    assert.equal(after.ledger[0].txType, "buy");
    assert.equal(after.ledger[0].fees, 50);
    assert.equal(after.ledger[0].meta?.portfolioTrackingOnly, true);
    assert.equal(after.ledger[0].meta?.brokerage, 40);

    const summary = buildNepsePortfolioSummary(after.investments, after.ledger, FX.krwPerNpr, FX.usdPerNpr, null, null);
    const h = summary.holdings.find((x) => x.row.id === rowId);
    assert.ok(h);
    assert.equal(h.currentUnits, 100);
    assert.equal(h.avgCostNpr, 400);
    assert.equal(h.costNpr, 40000);
  });

  it("weighted average cost updates after a second buy", () => {
    const { state, rowId } = seedHolding();
    let next = recordInvestmentBuy(
      state,
      rowId,
      { quantity: 100, unitPrice: 400, currency: "NPR", tradeDate: "2024-02-01" },
      FX,
    );
    assert.ok(next);
    next = recordInvestmentBuy(
      next,
      rowId,
      { quantity: 100, unitPrice: 500, currency: "NPR", tradeDate: "2024-03-01" },
      FX,
    );
    assert.ok(next);
    const row = next.investments.find((r) => r.id === rowId);
    assert.equal(resolveInvestmentQuantity(row), 200);
    assert.equal(row.buyPrice, 450);
  });

  it("sell reduces holding and records realized P/L", () => {
    const { state, rowId } = seedHolding();
    let next = recordInvestmentBuy(
      state,
      rowId,
      { quantity: 100, unitPrice: 400, currency: "NPR", tradeDate: "2024-02-01" },
      FX,
    );
    assert.ok(next);
    next = recordInvestmentSell(
      next,
      rowId,
      {
        quantity: 40,
        unitPrice: 480,
        currency: "NPR",
        tradeDate: "2024-04-01",
        fees: 20,
        portfolioTrackingOnly: true,
      },
      FX,
    );
    assert.ok(next);
    const row = next.investments.find((r) => r.id === rowId);
    assert.equal(resolveInvestmentQuantity(row), 60);
    const sell = next.ledger.find((e) => e.txType === "sell");
    assert.ok(sell);
    // proceeds 19200 - cost 16000 - fees 20 = 3180
    assert.equal(sell.realizedGainNpr, 3180);

    const summary = buildNepsePortfolioSummary(next.investments, next.ledger, FX.krwPerNpr, FX.usdPerNpr, null, null);
    const h = summary.holdings.find((x) => x.row.id === rowId);
    assert.ok(h);
    assert.equal(h.currentUnits, 60);
    assert.equal(h.realizedGainNpr, 3180);
    assert.equal(h.soldUnits, 40);
  });

  it("rejects selling more than available quantity", () => {
    const { state, rowId } = seedHolding();
    const bought = recordInvestmentBuy(
      state,
      rowId,
      { quantity: 50, unitPrice: 300, currency: "NPR", tradeDate: "2024-02-01" },
      FX,
    );
    assert.ok(bought);
    const oversell = recordInvestmentSell(
      bought,
      rowId,
      { quantity: 51, unitPrice: 350, currency: "NPR", tradeDate: "2024-05-01" },
      FX,
    );
    assert.equal(oversell, null);

    const preview = estimateInvestmentSellRealized(
      bought.investments[0],
      { quantity: 51, unitPrice: 350, currency: "NPR" },
      FX,
    );
    assert.ok(preview);
    assert.equal(preview.availableQty, 50);
    assert.equal(preview.realizedGainNpr, 0);
  });

  it("estimateInvestmentSellRealized matches recorded sell P/L", () => {
    const { state, rowId } = seedHolding();
    const bought = recordInvestmentBuy(
      state,
      rowId,
      { quantity: 80, unitPrice: 250, currency: "NPR", tradeDate: "2024-02-01" },
      FX,
    );
    assert.ok(bought);
    const input = { quantity: 30, unitPrice: 310, currency: "NPR", fees: 15, tradeDate: "2024-06-01" };
    const preview = estimateInvestmentSellRealized(bought.investments[0], input, FX);
    const sold = recordInvestmentSell(bought, rowId, input, FX);
    assert.ok(preview);
    assert.ok(sold);
    assert.equal(sold.ledger.at(-1).realizedGainNpr, preview.realizedGainNpr);
  });
});
