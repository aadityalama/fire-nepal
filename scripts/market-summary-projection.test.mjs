/**
 * Projection logic mirrored for a lightweight node:test (no TS loader required).
 * Keep in sync with src/services/market/project-market-snapshot.ts
 */
import assert from "node:assert/strict";
import { test } from "node:test";

function projectMarketSnapshot(snapshot, opts) {
  if (opts.board === "full") return snapshot;
  const out = {};
  for (const raw of opts.nepseSymbols) {
    const sym = String(raw).trim().toUpperCase();
    if (sym && snapshot.nepseBySymbol[sym]) out[sym] = snapshot.nepseBySymbol[sym];
  }
  return { ...snapshot, nepseBySymbol: out, nepseTerminal: undefined };
}

const base = {
  fetchedAt: "2026-08-16T00:00:00.000Z",
  partial: false,
  sourceStatus: { nepse: "ok" },
  forex: { krwPerNpr: 9.2, usdPerNpr: 0.0075, nprPerUsd: 133 },
  nepseIndex: { name: "NEPSE", value: 2800, changePct: 0.5 },
  nepseBySymbol: {
    NABIL: { symbol: "NABIL", ltpNpr: 1000 },
    NICA: { symbol: "NICA", ltpNpr: 500 },
    UPPER: { symbol: "UPPER", ltpNpr: 200 },
  },
  nepseTerminal: { totalsListed: 3 },
  usdEquities: {},
  krEquities: {},
  crypto: {},
  metalsUsdOz: { goldUsdPerOz: 2400, silverUsdPerOz: 30 },
};

test("full board projection is identity", () => {
  const out = projectMarketSnapshot(base, { board: "full", nepseSymbols: ["NABIL"] });
  assert.equal(Object.keys(out.nepseBySymbol).length, 3);
  assert.ok(out.nepseTerminal);
});

test("lite board filters symbols and drops terminal", () => {
  const out = projectMarketSnapshot(base, { board: "lite", nepseSymbols: ["NABIL", "MISSING"] });
  assert.deepEqual(Object.keys(out.nepseBySymbol), ["NABIL"]);
  assert.equal(out.nepseTerminal, undefined);
  assert.equal(out.nepseIndex.value, 2800);
});
