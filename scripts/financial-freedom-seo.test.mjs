import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FINANCIAL_FREEDOM_CANONICAL,
  FINANCIAL_FREEDOM_DESCRIPTION,
  FINANCIAL_FREEDOM_FAQ,
  FINANCIAL_FREEDOM_TITLE,
  FINANCIAL_FREEDOM_TOOLS,
  buildFinancialFreedomJsonLd,
} from "../src/lib/brand/financial-freedom-seo.ts";
import {
  FINANCIAL_FREEDOM_GUIDE_ARTICLES,
  getAllFinancialFreedomGuideSlugs,
} from "../src/data/financial-freedom-guides/articles.ts";

describe("Financial Freedom Nepal SEO foundation", () => {
  it("uses the target title, description, and canonical", () => {
    assert.match(FINANCIAL_FREEDOM_TITLE, /Financial Freedom Nepal/);
    assert.match(FINANCIAL_FREEDOM_DESCRIPTION, /financial freedom in Nepal/);
    assert.equal(FINANCIAL_FREEDOM_CANONICAL, "https://www.firenepal.com/financial-freedom-nepal");
  });

  it("exposes a public tool hub with natural CTAs", () => {
    assert.ok(FINANCIAL_FREEDOM_TOOLS.length >= 15);
    const titles = FINANCIAL_FREEDOM_TOOLS.map((t) => t.title);
    assert.ok(titles.includes("FIRE Calculator"));
    assert.ok(titles.includes("SIP Calculator Nepal"));
    assert.ok(titles.includes("SWP Calculator"));
    for (const tool of FINANCIAL_FREEDOM_TOOLS) {
      assert.ok(tool.href.startsWith("/") || tool.href.startsWith("/#"));
      assert.ok(tool.cta.length > 20);
      assert.equal(tool.public, true);
    }
  });

  it("emits WebPage, BreadcrumbList, and FAQPage JSON-LD", () => {
    const graphs = buildFinancialFreedomJsonLd();
    assert.deepEqual(
      graphs.map((g) => g["@type"]),
      ["WebPage", "BreadcrumbList", "FAQPage"],
    );
    const faq = graphs.find((g) => g["@type"] === "FAQPage");
    assert.equal(faq?.mainEntity?.length, FINANCIAL_FREEDOM_FAQ.length);
  });

  it("ships a 25-article Financial Freedom cluster linked to the hub", () => {
    assert.equal(FINANCIAL_FREEDOM_GUIDE_ARTICLES.length, 25);
    assert.equal(getAllFinancialFreedomGuideSlugs().length, 25);
    for (const article of FINANCIAL_FREEDOM_GUIDE_ARTICLES) {
      assert.ok(article.sections.length >= 5);
      assert.ok(article.relatedTools.length >= 2 && article.relatedTools.length <= 4);
      const blob = JSON.stringify(article);
      assert.match(blob, /\/financial-freedom-nepal/);
      assert.ok(article.description.length >= 140 && article.description.length <= 170);
      assert.doesNotMatch(blob.toLowerCase(), /returns are guaranteed|guaranteed return of/);
    }
  });
});
