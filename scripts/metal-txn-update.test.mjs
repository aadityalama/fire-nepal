/**
 * Regression: updateMetalTxn edits in place (same id), rebuilds holdings, rejects invalid sells.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

async function load() {
  const mod = await import("../src/components/portfolio/portfolio-ledger.ts");
  return mod;
}

function emptyState() {
  return {
    version: 2,
    metals: [],
    ledger: [],
    liquidCash: [],
    fixedDeposits: [],
    investments: [],
    realEstate: [],
    vehicles: [],
    liabilities: [],
    globalRetirementAssets: [],
    netWorthHistory: [],
    metalPurchaseBillUrls: {},
  };
}

describe("updateMetalTxn", () => {
  it("updates buy qty/price in place and refreshes cost basis", async () => {
    const { recordMetalBuy, updateMetalTxn } = await load();
    let s = emptyState();
    s = recordMetalBuy(s, {
      metal: "gold",
      itemName: "Hallmark Bar",
      grams: 11.66,
      tradeDate: "2026-08-01",
      buyPriceNpr: 200000,
      buyPriceUnit: "tola",
      feesNpr: 0,
    });
    assert.ok(s);
    const entryId = s.ledger[0].id;
    const rowId = s.metals[0].id;
    assert.equal(s.metals[0].grams, 11.66);
    assert.ok(Math.abs(s.metals[0].totalCostBasisNpr - 200000) < 0.02);

    const next = updateMetalTxn(s, entryId, {
      grams: 23.32,
      tradeDate: "2026-08-01",
      buyPriceNpr: 242800,
      buyPriceUnit: "tola",
      feesNpr: 100,
      notes: "Corrected qty",
    });
    assert.ok(next);
    assert.equal(next.ledger.length, 1);
    assert.equal(next.ledger[0].id, entryId);
    assert.equal(next.ledger[0].rowId, rowId);
    assert.equal(next.ledger[0].notes, "Corrected qty");
    assert.ok(Math.abs(next.metals[0].grams - 23.32) < 1e-9);
    // 2 tola * 242800 + 100 fees
    assert.ok(Math.abs(next.metals[0].totalCostBasisNpr - (242800 * 2 + 100)) < 0.05);
  });

  it("rejects edits that would make later sells exceed holdings", async () => {
    const { recordMetalBuy, recordMetalSell, updateMetalTxn } = await load();
    let s = emptyState();
    s = recordMetalBuy(s, {
      metal: "silver",
      itemName: "Silver Coin",
      grams: 100,
      tradeDate: "2026-01-01",
      buyPriceNpr: 200,
      buyPriceUnit: "gram",
    });
    s = recordMetalSell(s, s.metals[0].id, {
      grams: 60,
      unitPriceNprPerGram: 250,
      tradeDate: "2026-02-01",
    });
    assert.ok(s);
    const buyId = s.ledger.find((e) => e.txType === "buy").id;
    const bad = updateMetalTxn(s, buyId, {
      grams: 50,
      tradeDate: "2026-01-01",
      buyPriceNpr: 200,
      buyPriceUnit: "gram",
    });
    assert.equal(bad, null);
    // Original unchanged when mutator returns null (caller responsibility); function itself returns null
    assert.equal(s.metals[0].grams, 40);
  });

  it("updates sell price without creating a duplicate entry", async () => {
    const { recordMetalBuy, recordMetalSell, updateMetalTxn } = await load();
    let s = emptyState();
    s = recordMetalBuy(s, {
      metal: "gold",
      itemName: "Ring",
      grams: 10,
      tradeDate: "2026-03-01",
      buyPriceNpr: 20000,
      buyPriceUnit: "gram",
    });
    s = recordMetalSell(s, s.metals[0].id, {
      grams: 4,
      unitPriceNprPerGram: 22000,
      tradeDate: "2026-04-01",
      feesNpr: 50,
    });
    const sellId = s.ledger.find((e) => e.txType === "sell").id;
    const next = updateMetalTxn(s, sellId, {
      grams: 4,
      tradeDate: "2026-04-01",
      unitPriceNprPerGram: 25000,
      feesNpr: 50,
    });
    assert.ok(next);
    assert.equal(next.ledger.length, 2);
    assert.equal(next.ledger.filter((e) => e.id === sellId).length, 1);
    const sell = next.ledger.find((e) => e.id === sellId);
    assert.equal(sell.unitPrice, 25000);
    assert.ok(Math.abs(next.metals[0].grams - 6) < 1e-9);
  });
});
