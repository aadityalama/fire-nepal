import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildSipCalculatorJsonLd,
  SIP_CALCULATOR_CANONICAL,
  SIP_CALCULATOR_DESCRIPTION,
  SIP_CALCULATOR_TITLE,
  SIP_FAQ_ITEMS,
} from "../src/lib/brand/sip-calculator-seo.ts";
import { runSipProjection, sipFutureValue } from "../src/lib/sip-calculator.ts";
import { getAllSipGuideSlugs, SIP_GUIDE_ARTICLES } from "../src/data/sip-guides/articles.ts";

describe("sipFutureValue classic formula", () => {
  it("matches closed-form annuity-due when step-up is 0", () => {
    const monthly = 5000;
    const annual = 12;
    const years = 10;
    const r = annual / 100 / 12;
    const n = years * 12;
    const closedForm = monthly * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
    const simulated = sipFutureValue(monthly, annual, years, 0);
    assert.ok(Math.abs(simulated - closedForm) < 0.01);
  });

  it("increases maturity when annual step-up is applied", () => {
    const base = sipFutureValue(5000, 12, 10, 0);
    const stepped = sipFutureValue(5000, 12, 10, 10);
    assert.ok(stepped > base);
  });
});

describe("runSipProjection", () => {
  it("returns invested, profit, maturity, yearly and monthly rows", () => {
    const result = runSipProjection({
      monthlyInvestment: 10_000,
      annualReturnPct: 12,
      years: 5,
      inflationPct: 5,
      annualStepUpPct: 0,
      currency: "NPR",
    });
    assert.equal(result.totalInvested, 10_000 * 12 * 5);
    assert.ok(result.futureValue > result.totalInvested);
    assert.equal(result.totalProfit, result.futureValue - result.totalInvested);
    assert.equal(result.yearlyRows.length, 6);
    assert.ok(result.monthlyRows.length > 0);
    assert.equal(result.annualStepUpPct, 0);
  });

  it("raises total invested with step-up", () => {
    const flat = runSipProjection({
      monthlyInvestment: 5_000,
      annualReturnPct: 10,
      years: 3,
      inflationPct: 0,
      annualStepUpPct: 0,
      currency: "NPR",
    });
    const step = runSipProjection({
      monthlyInvestment: 5_000,
      annualReturnPct: 10,
      years: 3,
      inflationPct: 0,
      annualStepUpPct: 10,
      currency: "NPR",
    });
    assert.ok(step.totalInvested > flat.totalInvested);
    assert.ok(step.futureValue > flat.futureValue);
  });
});

describe("SIP calculator SEO foundation", () => {
  it("uses the target title and meta description", () => {
    assert.match(SIP_CALCULATOR_TITLE, /SIP Calculator Nepal 2026/);
    assert.match(SIP_CALCULATOR_DESCRIPTION, /Free SIP Calculator Nepal/);
    assert.equal(SIP_CALCULATOR_CANONICAL, "https://www.firenepal.com/sip-calculator");
  });

  it("emits WebPage, WebApplication, BreadcrumbList, and FAQPage JSON-LD", () => {
    const graphs = buildSipCalculatorJsonLd();
    const types = graphs.map((g) => g["@type"]);
    assert.deepEqual(types, ["WebPage", "WebApplication", "BreadcrumbList", "FAQPage"]);
    const faq = graphs.find((g) => g["@type"] === "FAQPage");
    assert.equal(faq?.mainEntity?.length, SIP_FAQ_ITEMS.length);
    assert.equal(SIP_FAQ_ITEMS.length, 10);
  });

  it("ships a 10-article Nepal SIP guide cluster", () => {
    assert.equal(SIP_GUIDE_ARTICLES.length, 10);
    assert.equal(getAllSipGuideSlugs().length, 10);
    for (const article of SIP_GUIDE_ARTICLES) {
      assert.ok(article.sections.length >= 5);
      const blob = JSON.stringify(article);
      assert.match(blob, /\/sip-calculator/);
      assert.doesNotMatch(blob.toLowerCase(), /returns are guaranteed|guaranteed return of|guaranteed sip returns/);
    }
  });
});
