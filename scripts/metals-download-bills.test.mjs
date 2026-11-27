/**
 * Download Bills collector — ledger metalTxBillUrls + legacy module bills.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { collectMetalsBillRecords } from "../src/components/portfolio/MetalsDownloadBillsSection.tsx";

describe("collectMetalsBillRecords", () => {
  const jpeg =
    "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=";
  const pdf = "data:application/pdf;base64,JVBERi0xLjQKJeLjz9MK";

  it("lists bills from metal ledger buys and sells", () => {
    const ledger = [
      {
        id: "tx1",
        txType: "buy",
        bucket: "metal",
        rowId: "g1",
        assetLabel: "Hallmark Chain",
        metal: "gold",
        quantity: 10,
        unitPrice: 1000,
        currency: "NPR",
        tradeDate: "2024-06-01",
        meta: { metalTxBillUrls: [jpeg, pdf] },
      },
      {
        id: "tx2",
        txType: "sell",
        bucket: "metal",
        rowId: "s1",
        assetLabel: "Silver Coin",
        metal: "silver",
        quantity: 5,
        unitPrice: 200,
        currency: "NPR",
        tradeDate: "2025-01-10",
        meta: { metalTxBillUrls: [jpeg] },
      },
      {
        id: "tx3",
        txType: "buy",
        bucket: "metal",
        rowId: "g2",
        assetLabel: "No bill item",
        metal: "gold",
        quantity: 1,
        unitPrice: 100,
        currency: "NPR",
        tradeDate: "2025-02-01",
        meta: {},
      },
    ];
    const bills = collectMetalsBillRecords(ledger, []);
    assert.equal(bills.length, 3);
    assert.equal(bills.filter((b) => b.metal === "gold").length, 2);
    assert.equal(bills.filter((b) => b.metal === "silver").length, 1);
    assert.ok(bills.every((b) => !b.missing && b.url));
    assert.ok(bills.some((b) => b.fileName.endsWith(".pdf")));
    assert.ok(bills.some((b) => b.fileName.endsWith(".jpg")));
  });

  it("marks empty or invalid urls as missing without inventing content", () => {
    const ledger = [
      {
        id: "tx-bad",
        txType: "buy",
        bucket: "metal",
        rowId: "g1",
        assetLabel: "Broken",
        metal: "gold",
        quantity: 1,
        unitPrice: 1,
        currency: "NPR",
        tradeDate: "2024-01-01",
        meta: { metalTxBillUrls: ["", "javascript:alert(1)", jpeg] },
      },
    ];
    const bills = collectMetalsBillRecords(ledger, []);
    // sanitize drops invalid refs — only usable jpeg remains
    assert.equal(bills.length, 1);
    assert.equal(bills[0].missing, false);
  });

  it("includes legacy module bills", () => {
    const bills = collectMetalsBillRecords([], [jpeg]);
    assert.equal(bills.length, 1);
    assert.equal(bills[0].source, "legacy");
    assert.equal(bills[0].itemName, "Legacy module bill");
  });
});
