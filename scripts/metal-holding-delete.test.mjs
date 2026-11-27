/**
 * Individual Holdings delete must remove a metal row with grams > 0
 * without inventing a sell / realized P/L, and must not touch other holdings.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

function removeMetal(state, id) {
  return {
    ...state,
    metals: state.metals.filter((r) => r.id !== id),
    ledger: state.ledger.filter((e) => !(e.bucket === "metal" && e.rowId === id)),
  };
}

describe("metal holding delete (grams > 0)", () => {
  const state = {
    metals: [
      {
        id: "dup-gold",
        metal: "gold",
        name: "Duplicate ring",
        grams: 81.62,
        totalCostBasisNpr: 420000,
        boughtDate: "2026-08-14",
      },
      {
        id: "keep-silver",
        metal: "silver",
        name: "Keep me",
        grams: 50,
        totalCostBasisNpr: 10000,
        boughtDate: "2024-01-10",
      },
    ],
    ledger: [
      {
        id: "tx-dup",
        txType: "buy",
        bucket: "metal",
        rowId: "dup-gold",
        assetLabel: "Duplicate ring",
        metal: "gold",
        quantity: 81.62,
        unitPrice: 5145.8,
        currency: "NPR",
        tradeDate: "2026-08-14",
        fees: 0,
      },
      {
        id: "tx-keep",
        txType: "buy",
        bucket: "metal",
        rowId: "keep-silver",
        assetLabel: "Keep me",
        metal: "silver",
        quantity: 50,
        unitPrice: 200,
        currency: "NPR",
        tradeDate: "2024-01-10",
        fees: 0,
      },
    ],
  };

  it("deletes a holding with positive grams without creating a sell", () => {
    const next = removeMetal(state, "dup-gold");
    assert.equal(next.metals.length, 1);
    assert.equal(next.metals[0].id, "keep-silver");
    assert.equal(next.ledger.length, 1);
    assert.equal(next.ledger[0].id, "tx-keep");
    assert.equal(
      next.ledger.some((e) => e.txType === "sell"),
      false,
    );
    assert.equal(
      next.ledger.some((e) => e.rowId === "dup-gold"),
      false,
    );
  });

  it("does not alter remaining holding quantities or basis", () => {
    const next = removeMetal(state, "dup-gold");
    assert.equal(next.metals[0].grams, 50);
    assert.equal(next.metals[0].totalCostBasisNpr, 10000);
  });
});
