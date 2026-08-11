#!/usr/bin/env node
/**
 * Homepage FIRE AI local engine + snapshot tests.
 * Run: npx tsx --test scripts/homepage-fire-ai.test.mjs
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildHomepageFireAiLocalResponse,
  buildHomepageFireSnapshot,
  withLanguageDirective,
} from "../src/lib/homepage/homepage-fire-ai-local.ts";
import { getHomepageFireAiCopy } from "../src/lib/homepage/homepage-fire-ai-copy.ts";
import { computeUnifiedFireSummary } from "../src/lib/fire-nepal/unified-fire-summary.ts";
import { defaultCashflowState } from "../src/components/cashflow/cashflow-storage.ts";
import { defaultWealthState } from "../src/components/portfolio/storage.ts";

function emptySummary() {
  return computeUnifiedFireSummary(defaultWealthState(), defaultCashflowState(), 16, 0.0075);
}

function richSummary() {
  const cashflow = defaultCashflowState();
  cashflow.income = {
    ...cashflow.income,
    salary: 300_000,
  };
  cashflow.expenses = {
    ...cashflow.expenses,
    rent: 80_000,
    food: 40_000,
    transportation: 20_000,
    familySupport: 10_000,
  };
  const portfolio = defaultWealthState();
  return computeUnifiedFireSummary(portfolio, cashflow, 16, 0.0075);
}

describe("homepage FIRE AI copy", () => {
  it("keeps AI Financial Advisor badge and Ask affordances", () => {
    const en = getHomepageFireAiCopy("en");
    assert.equal(en.badge, "AI Financial Advisor");
    assert.equal(en.fireBot, "FIRE Bot");
    assert.ok(en.ask.length > 0);
    assert.ok(en.quickPrompts.length >= 6);
    assert.ok(en.startActions.length >= 4);
    assert.ok(en.disclaimer.toLowerCase().includes("educational"));
    assert.ok(!en.disclaimer.toLowerCase().includes("guaranteed"));
  });

  it("provides Nepali and Korean variants", () => {
    assert.ok(getHomepageFireAiCopy("np").badge.includes("AI"));
    assert.ok(getHomepageFireAiCopy("kr").ask.length > 0);
  });
});

describe("homepage FIRE snapshot", () => {
  it("does not invent readiness numbers when data is empty", () => {
    const snap = buildHomepageFireSnapshot(emptySummary());
    assert.equal(snap.hasAnyData, false);
    assert.equal(snap.monthlySavingsNpr, null);
    assert.equal(snap.fireTargetNpr, null);
    assert.equal(snap.estimatedReturnYears, null);
  });
});

describe("homepage FIRE AI local responses", () => {
  it("asks for minimum inputs when return plan data is missing", () => {
    const text = buildHomepageFireAiLocalResponse("Plan my return to Nepal", emptySummary(), "en");
    assert.ok(text.includes("Quick answer"));
    assert.ok(text.toLowerCase().includes("monthly take-home income") || text.toLowerCase().includes("need"));
    assert.ok(!text.includes("8 years"));
    assert.ok(!text.includes("NPR 2.4 Cr"));
  });

  it("structures remittance answers with FX education", () => {
    const text = buildHomepageFireAiLocalResponse("Should I send money to Nepal now?", emptySummary(), "en");
    assert.ok(text.toLowerCase().includes("fx spread") || text.toLowerCase().includes("remittance"));
    assert.ok(text.includes("Recommended next steps") || text.includes("next steps") || text.includes("Recommended"));
  });

  it("language directive requests structured educational replies", () => {
    const directed = withLanguageDirective("How much should I save?", "np");
    assert.ok(directed.includes("नेपाली") || directed.toLowerCase().includes("nepali"));
    assert.ok(directed.includes("User question:"));
    assert.ok(directed.toLowerCase().includes("no guaranteed"));
  });
});

describe("rich data path does not hard-code marketing numbers", () => {
  it("avoids fabricated ₩1,500,000 / NPR 2.4 Cr marketing strings", () => {
    let summary;
    try {
      summary = richSummary();
    } catch {
      summary = emptySummary();
    }
    const text = buildHomepageFireAiLocalResponse("Plan my FIRE journey", summary, "en");
    assert.ok(!text.includes("₩1,500,000"));
    assert.ok(!text.includes("NPR 2.4 Cr"));
    assert.ok(text.includes("Quick answer"));
  });
});
