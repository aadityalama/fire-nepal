/**
 * Dedupes localStorage → cloud insurance imports via import_fingerprint.
 */
import assert from "node:assert/strict";
import test from "node:test";

// Mirror of buildInsuranceImportFingerprint (kept in sync with src/lib/insurance/insurance-mapper.ts)
function buildInsuranceImportFingerprint(input) {
  const safeTrim = (value) => (typeof value === "string" ? value.trim() : "");
  return [
    input.type || "other",
    safeTrim(input.provider).toLowerCase(),
    Math.round(Number(input.coverageAmountNpr) || 0),
    Math.round(Number(input.premiumNpr) || 0),
    input.startDate || "",
    safeTrim(input.policyNumber).toLowerCase(),
  ].join("|");
}

test("fingerprint is stable across browser casing/whitespace", () => {
  const a = buildInsuranceImportFingerprint({
    type: "health",
    provider: "  Nepal Life ",
    coverageAmountNpr: 1000000,
    premiumNpr: 12000.4,
    startDate: "2024-01-01",
    policyNumber: " PL-1 ",
  });
  const b = buildInsuranceImportFingerprint({
    type: "health",
    provider: "nepal life",
    coverageAmountNpr: 1000000,
    premiumNpr: 12000,
    startDate: "2024-01-01",
    policyNumber: "pl-1",
  });
  assert.equal(a, b);
});

test("fingerprint differs when coverage changes", () => {
  const a = buildInsuranceImportFingerprint({
    type: "life",
    provider: "ABC",
    coverageAmountNpr: 1,
    premiumNpr: 100,
    startDate: "2025-01-01",
    policyNumber: "x",
  });
  const b = buildInsuranceImportFingerprint({
    type: "life",
    provider: "ABC",
    coverageAmountNpr: 2,
    premiumNpr: 100,
    startDate: "2025-01-01",
    policyNumber: "x",
  });
  assert.notEqual(a, b);
});

test("sync skip set prevents duplicate uploads in-memory", () => {
  const remoteByFp = new Set();
  const locals = [
    { type: "health", provider: "A", coverageAmountNpr: 1, premiumNpr: 1, startDate: "2024-01-01", policyNumber: "1" },
    { type: "health", provider: "A", coverageAmountNpr: 1, premiumNpr: 1, startDate: "2024-01-01", policyNumber: "1" },
    { type: "life", provider: "B", coverageAmountNpr: 2, premiumNpr: 2, startDate: "2024-02-01", policyNumber: "2" },
  ];
  const uploaded = [];
  const skipped = [];
  for (const row of locals) {
    const fp = buildInsuranceImportFingerprint(row);
    if (remoteByFp.has(fp)) {
      skipped.push(fp);
      continue;
    }
    uploaded.push(fp);
    remoteByFp.add(fp);
  }
  assert.equal(uploaded.length, 2);
  assert.equal(skipped.length, 1);
});
