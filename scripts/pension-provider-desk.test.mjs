/**
 * Pension provider desk — personal balances never fabricated.
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import { buildProviderDesks, ledgerFieldLabel } from "../src/lib/pension/provider-desk.ts";

test("provider desks expose Not Connected / Not Synced instead of invented balances", () => {
  const desks = buildProviderDesks();
  assert.equal(desks.length, 4);
  for (const desk of desks) {
    assert.equal(desk.balance.kind, "not_connected");
    assert.equal(desk.monthlyContribution.kind, "not_synced");
    assert.equal(desk.contributionMonths.kind, "not_synced");
    assert.equal(desk.lastContribution.kind, "not_synced");
    assert.equal(ledgerFieldLabel(desk.balance), "Not Connected");
    assert.equal(ledgerFieldLabel(desk.monthlyContribution), "Not Synced");
    assert.ok(desk.payHref?.startsWith("https://"));
    assert.ok(desk.loginHref?.startsWith("https://"));
  }
  const gov = desks.find((d) => d.id === "government_pension");
  assert.ok(gov?.verifiedPolicyRateLabel?.includes("6%"));
});
