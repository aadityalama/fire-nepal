/**
 * Unit tests for official NEPSE index atomic validation.
 * Run: npm run test:nepse-index-validation
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

const {
  OfficialIndexValidationError,
  resolveConsistentPreviousClose,
  validateOfficialIndexSnapshot,
} = await import("../src/services/market/nepse-official-index-validation.ts");

describe("official NEPSE index validation", () => {
  it("accepts today's official-shaped row (currentValue + change; previousClose may be reset)", () => {
    const validated = validateOfficialIndexSnapshot({
      name: "NEPSE Index",
      currentValue: 2696.67,
      close: 2701.32,
      previousClose: 2696.6777,
      change: -4.64,
      perChange: -0.17,
      high: 2705.8376,
      low: 2680.8779,
      generatedTime: "2026-07-28T15:20:06.66",
    });

    assert.equal(validated.currentIndex, 2696.67);
    assert.equal(validated.pointChange, -4.64);
    assert.equal(validated.percentageChange, -0.17);
    assert.ok(Math.abs(validated.previousClose + validated.pointChange - validated.currentIndex) <= 0.05);
    assert.ok(Math.abs(validated.previousClose - 2701.32) < 0.02);
  });

  it("accepts a live-session row where previousClose already matches", () => {
    const validated = validateOfficialIndexSnapshot({
      name: "NEPSE Index",
      currentValue: 2696.67,
      close: 2696.67,
      previousClose: 2701.31,
      change: -4.64,
      perChange: -0.17,
      high: null,
      low: null,
      generatedTime: null,
    });
    assert.equal(validated.previousClose, 2701.31);
    assert.equal(validated.currentIndex, 2696.67);
  });

  it("never treats session close as the displayed index when currentValue is present", () => {
    const validated = validateOfficialIndexSnapshot({
      name: "NEPSE Index",
      currentValue: 2696.67,
      close: 2701.32,
      previousClose: 2696.6777,
      change: -4.64,
      perChange: -0.17,
      high: null,
      low: null,
      generatedTime: null,
    });
    // Production bug was showing 2701.32 (close). Official website shows currentValue.
    assert.equal(validated.currentIndex, 2696.67);
    assert.notEqual(validated.currentIndex, 2701.32);
  });

  it("rejects when percentage cannot be reconciled with the same values", () => {
    assert.throws(
      () =>
        validateOfficialIndexSnapshot({
          name: "NEPSE Index",
          currentValue: 2696.67,
          close: 2701.32,
          previousClose: 2701.32,
          change: -4.64,
          perChange: -5.0,
          high: null,
          low: null,
          generatedTime: null,
        }),
      (error) => error instanceof OfficialIndexValidationError,
    );
  });

  it("resolveConsistentPreviousClose prefers published previousClose when valid", () => {
    const prev = resolveConsistentPreviousClose(2696.67, -4.64, 2701.31, 2701.32);
    assert.equal(prev, 2701.31);
  });
});
