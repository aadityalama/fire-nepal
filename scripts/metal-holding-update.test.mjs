/**
 * Individual Holdings edit: updateMetalHolding updates MetalRow by id (no duplicates).
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

async function load() {
  return import("../src/components/portfolio/portfolio-ledger.ts");
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

describe("updateMetalHolding", () => {
  it("renames and updates qty/price for a single-buy holding in place", async () => {
    const { recordMetalBuy, updateMetalHolding } = await load();
    let s = emptyState();
    s = recordMetalBuy(s, {
      metal: "gold",
      itemName: "Gold ring",
      grams: 81.62,
      tradeDate: "2026-08-14",
      buyPriceNpr: 60000,
      buyPriceUnit: "tola",
      feesNpr: 0,
      notes: "seed",
    });
    assert.ok(s);
    const rowId = s.metals[0].id;
    const entryId = s.ledger[0].id;
    const next = updateMetalHolding(s, rowId, {
      name: "Gold Ring Deluxe",
      tradeDate: "2026-08-10",
      grams: 81.62,
      buyPriceNpr: 242800,
      buyPriceUnit: "tola",
      feesNpr: 500,
      notes: "corrected",
    });
    assert.ok(next);
    assert.equal(next.metals.length, 1);
    assert.equal(next.metals[0].id, rowId);
    assert.equal(next.metals[0].name, "Gold Ring Deluxe");
    assert.equal(next.ledger.length, 1);
    assert.equal(next.ledger[0].id, entryId);
    assert.equal(next.ledger[0].assetLabel, "Gold Ring Deluxe");
    assert.ok(Math.abs(next.metals[0].grams - 81.62) < 1e-9);
    // 7 tola × 242,800/tola + 500 fees
    assert.ok(Math.abs(next.metals[0].totalCostBasisNpr - (7 * 242800 + 500)) < 0.05);
    assert.equal(next.metals[0].boughtDate, "2026-08-10");
  });

  it("updates orphan holding without creating ledger rows", async () => {
    const { updateMetalHolding } = await load();
    let s = emptyState();
    s.metals = [{ id: "orphan-1", metal: "silver", name: "TIKADANI", grams: 1000, totalCostBasisNpr: 1400000, boughtDate: "2023-11-26" }];
    const next = updateMetalHolding(s, "orphan-1", {
      name: "Tikadani Set",
      tradeDate: "2023-11-20",
      grams: 900,
      buyPriceNpr: 1500,
      buyPriceUnit: "gram",
      feesNpr: 0,
    });
    assert.ok(next);
    assert.equal(next.metals[0].id, "orphan-1");
    assert.equal(next.metals[0].name, "Tikadani Set");
    assert.equal(next.metals[0].grams, 900);
    assert.equal(next.ledger.length, 0);
    assert.ok(Math.abs(next.metals[0].totalCostBasisNpr - 1_350_000) < 0.05);
  });

  it("rejects qty edit that would break later sells", async () => {
    const { recordMetalBuy, recordMetalSell, updateMetalHolding } = await load();
    let s = emptyState();
    s = recordMetalBuy(s, {
      metal: "gold",
      itemName: "Bar",
      grams: 20,
      tradeDate: "2026-01-01",
      buyPriceNpr: 20000,
      buyPriceUnit: "gram",
    });
    s = recordMetalSell(s, s.metals[0].id, {
      grams: 12,
      unitPriceNprPerGram: 21000,
      tradeDate: "2026-02-01",
    });
    const rowId = s.metals[0].id;
    // Desired net 5g => buy would need 17g (>=12 sold) — OK
    const ok = updateMetalHolding(s, rowId, {
      name: "Bar",
      tradeDate: "2026-01-01",
      grams: 5,
      buyPriceNpr: 20000,
      buyPriceUnit: "gram",
    });
    assert.ok(ok);
    assert.ok(Math.abs(ok.metals[0].grams - 5) < 1e-9);

    // Desired net 0 with sold 12 is fine (buy=12). Desired negative not allowed by validation.
    const bad = updateMetalHolding(s, rowId, {
      name: "Bar",
      tradeDate: "2026-01-01",
      grams: -1,
      buyPriceNpr: 20000,
      buyPriceUnit: "gram",
    });
    assert.equal(bad, null);
  });

  it("does not create a duplicate metal row", async () => {
    const { recordMetalBuy, updateMetalHolding } = await load();
    let s = emptyState();
    s = recordMetalBuy(s, {
      metal: "silver",
      itemName: "Coin",
      grams: 100,
      tradeDate: "2026-05-01",
      buyPriceNpr: 250,
      buyPriceUnit: "gram",
    });
    const before = s.metals.length;
    const next = updateMetalHolding(s, s.metals[0].id, {
      name: "Silver Coin",
      tradeDate: "2026-05-01",
      grams: 110,
      buyPriceNpr: 260,
      buyPriceUnit: "gram",
    });
    assert.ok(next);
    assert.equal(next.metals.length, before);
  });
});
