/**
 * P2P lending loan-data reset — scoped to fire_lending module only.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createSeedStore } from "../src/lib/fire-lending/seed.ts";
import { resetUserLoanData } from "../src/lib/fire-lending/storage.ts";

describe("resetUserLoanData", () => {
  it("clears loans, payments, installments, requests, agreements, and activity", () => {
    const seed = createSeedStore();
    assert.ok(seed.loans.length > 0);
    assert.ok(seed.payments.length > 0);
    assert.ok(seed.installments.length > 0);
    assert.ok(seed.agreements.length > 0);
    assert.ok(seed.parties.length > 1);

    const next = resetUserLoanData(seed);

    assert.equal(next.loans.length, 0);
    assert.equal(next.payments.length, 0);
    assert.equal(next.installments.length, 0);
    assert.equal(next.requests.length, 0);
    assert.equal(next.agreements.length, 0);
    assert.equal(next.notifications.length, 0);
    assert.equal(next.documents.length, 0);
  });

  it("preserves the current user lending profile identity (no missing profile)", () => {
    const seed = createSeedStore();
    const before = seed.parties.find((p) => p.id === seed.currentUserId);
    assert.ok(before);

    const next = resetUserLoanData(seed);
    assert.equal(next.parties.length, 1);
    assert.equal(next.currentUserId, before.id);
    assert.equal(next.parties[0].id, before.id);
    assert.equal(next.parties[0].fireNepalId, before.fireNepalId);
    assert.equal(next.parties[0].name, before.name);
    assert.equal(next.parties[0].mobile, before.mobile);
    // Lending-specific counters reset
    assert.equal(next.parties[0].onTimePayments, 0);
    assert.equal(next.parties[0].latePayments, 0);
    assert.equal(next.parties[0].loansCompleted, 0);
  });

  it("removes borrower/demo counterparties but never leaves an empty parties list", () => {
    const emptyIsh = {
      currentUserId: "party_me",
      parties: [],
      loans: [{ id: "loan_1" }],
      payments: [{ id: "pay_1" }],
      installments: [{ id: "emi_1" }],
      requests: [{ id: "req_1" }],
      agreements: [{ id: "agr_1" }],
      notifications: [{ id: "ntf_1" }],
      documents: [{ id: "doc_1" }],
    };
    const next = resetUserLoanData(emptyIsh);
    assert.equal(next.parties.length, 1);
    assert.equal(next.parties[0].id, "party_me");
    assert.equal(next.loans.length, 0);
    assert.ok(next.parties[0].fireNepalId);
  });

  it("does not invent finance/membership fields — only returns fire_lending store shape", () => {
    const next = resetUserLoanData(createSeedStore());
    const keys = Object.keys(next).sort();
    assert.deepEqual(keys, [
      "agreements",
      "currentUserId",
      "documents",
      "installments",
      "loans",
      "notifications",
      "parties",
      "payments",
      "requests",
    ]);
  });
});
