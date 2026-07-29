#!/usr/bin/env node
/**
 * Verify finance category hierarchy order, legacy mapping, and picker group coverage.
 */
import assert from "node:assert/strict";
import {
  FINANCE_CATEGORIES,
  FINANCE_CATEGORY_GROUPS,
  FINANCE_CATEGORY_IDS,
  getFinanceCategoriesForGroup,
  getFinanceCategoryGroup,
  getFinanceCategoryLabel,
  normalizeFinanceCategory,
} from "../src/lib/finance/categories.ts";

// Run with: node --experimental-strip-types scripts/verify-finance-category-hierarchy.mjs

const expectedGroups = [
  {
    id: "financial-priorities",
    label: "Financial Priorities",
    emoji: "🎯",
    labels: ["Emergency Funds", "Debt Repayment", "Insurance", "Investment", "Savings"],
    ids: ["Emergency", "Debt", "Insurance", "Investment", "Savings"],
  },
  {
    id: "essential-living",
    label: "Essential Living",
    emoji: "🏡",
    labels: ["Housing (Rent/Home Loan)", "Food", "Utilities", "Transport", "Healthcare"],
    ids: ["Rent", "Food", "Utilities", "Transport", "Health"],
  },
  {
    id: "growth-lifestyle",
    label: "Growth & Lifestyle",
    emoji: "🚀",
    labels: ["Education & Skill Development", "Travel", "Shopping", "Entertainment", "Gifts & Donations", "Other"],
    ids: ["Education", "Travel", "Shopping", "Entertainment", "Gifts", "Other"],
  },
];

assert.equal(FINANCE_CATEGORY_GROUPS.length, 3);
assert.deepEqual(
  FINANCE_CATEGORY_GROUPS.map((g) => g.id),
  expectedGroups.map((g) => g.id),
);

for (const expected of expectedGroups) {
  const group = FINANCE_CATEGORY_GROUPS.find((g) => g.id === expected.id);
  assert.ok(group);
  assert.equal(group.emoji, expected.emoji);
  assert.equal(group.label, expected.label);
  assert.deepEqual([...group.categoryIds], expected.ids);
  const children = getFinanceCategoriesForGroup(expected.id);
  assert.deepEqual(
    children.map((c) => c.label),
    expected.labels,
  );
  assert.deepEqual(
    children.map((c) => c.id),
    expected.ids,
  );
}

const preservedLegacyIds = ["Food", "Rent", "Transport", "Health", "Shopping", "Entertainment", "Education", "Utilities", "Investment", "Emergency", "Other"];
for (const id of preservedLegacyIds) {
  assert.ok(FINANCE_CATEGORY_IDS.includes(id), `missing preserved id ${id}`);
  assert.equal(normalizeFinanceCategory(id), id);
}

assert.equal(normalizeFinanceCategory("Healthcare"), "Health");
assert.equal(normalizeFinanceCategory("Housing (Rent/Home Loan)"), "Rent");
assert.equal(normalizeFinanceCategory("Emergency Funds"), "Emergency");
assert.equal(normalizeFinanceCategory("Education & Skill Development"), "Education");
assert.equal(normalizeFinanceCategory("Debt Repayment"), "Debt");
assert.equal(normalizeFinanceCategory("Gifts & Donations"), "Gifts");
assert.equal(normalizeFinanceCategory("Food/Mart"), "Food");
assert.equal(getFinanceCategoryLabel("Health"), "Healthcare");
assert.equal(getFinanceCategoryLabel("Rent"), "Housing (Rent/Home Loan)");
assert.equal(getFinanceCategoryGroup("Investment").id, "financial-priorities");
assert.equal(getFinanceCategoryGroup("Food").id, "essential-living");
assert.equal(getFinanceCategoryGroup("Travel").id, "growth-lifestyle");

const flatIds = FINANCE_CATEGORIES.map((c) => c.id);
assert.deepEqual(flatIds, FINANCE_CATEGORY_GROUPS.flatMap((g) => [...g.categoryIds]));

console.log("finance category hierarchy verification passed.");
