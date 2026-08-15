/**
 * Pension official policy layer — version resolution + no-fabrication rules.
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  computePolicyDrivenProjection,
  OFFICIAL_PENSION_PORTALS,
  PENSION_POLICY_CATALOG,
  resolvePolicyRule,
} from "../src/lib/pension-policy/index.ts";

test("policy catalog entries include required provenance fields", () => {
  assert.ok(PENSION_POLICY_CATALOG.length > 0);
  for (const rule of PENSION_POLICY_CATALOG) {
    assert.ok(rule.id);
    assert.ok(rule.institution);
    assert.ok(rule.policyServiceName);
    assert.ok(/^https:\/\//.test(rule.officialSourceUrl));
    assert.ok(rule.ruleCategory);
    assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(rule.effectiveDate));
    assert.ok(rule.version);
    assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(rule.lastVerifiedDate));
    assert.ok(["active", "expired", "superseded", "pending_verification"].includes(rule.status));
    assert.ok(rule.title);
    assert.ok(rule.summary);
  }
});

test("official portals are https government/institutional links only", () => {
  for (const portal of OFFICIAL_PENSION_PORTALS) {
    assert.equal(portal.verified, true);
    assert.ok(portal.href.startsWith("https://"));
    assert.ok(
      /ssf\.gov\.np|epf\.org\.np|nlk\.org\.np|login\.epf\.org\.np|eservice\.nlk\.org\.np|sosys\.ssf\.gov\.np/.test(
        portal.href,
      ),
      portal.href,
    );
    assert.ok(["Pay / Contribution", "Official Login", "Official Portal"].includes(portal.label));
  }
});

test("version resolver picks effective active contribution rule for government pension", () => {
  const resolved = resolvePolicyRule(PENSION_POLICY_CATALOG, {
    institution: "government_pension",
    category: "contribution",
    asOfDate: "2026-08-15",
  });
  assert.equal(resolved.ok, true);
  if (!resolved.ok) return;
  assert.equal(resolved.rule.parameters?.employeeContributionPctOfSalary, 6);
  assert.equal(resolved.rule.parameters?.governmentContributionPctOfSalary, 6);
});

test("pending verification contribution rules are never returned as active math", () => {
  const ssf = resolvePolicyRule(PENSION_POLICY_CATALOG, {
    institution: "ssf",
    category: "contribution",
    asOfDate: "2026-08-15",
  });
  assert.equal(ssf.ok, false);
  if (ssf.ok) return;
  assert.equal(ssf.reason, "Official policy information unavailable for verification.");
});

test("historical as-of before CPS effective date does not apply 2019 rates", () => {
  const before = resolvePolicyRule(PENSION_POLICY_CATALOG, {
    institution: "government_pension",
    category: "contribution",
    asOfDate: "2018-01-01",
  });
  assert.equal(before.ok, false);
});

test("policy-driven calculator uses 6%+6% for government pension without inventing annuity", () => {
  const result = computePolicyDrivenProjection({
    institution: "government_pension",
    age: 30,
    monthlySalaryNpr: 100000,
    monthlyEmployeeContributionNpr: 0,
    monthlyEmployerContributionNpr: 0,
    contributionMonths: 360,
    currentBalanceNpr: 0,
    expectedRetirementAge: 60,
    asOfDate: "2026-08-15",
  });
  assert.equal(result.monthlyEmployeeRatePct, 6);
  assert.equal(result.monthlyEmployerRatePct, 6);
  // 30 years * 12 * (6000+6000) = 4,320,000
  assert.equal(result.projectedBalanceNpr, 4_320_000);
  assert.equal(result.estimatedMonthlyBenefitNpr, null);
  assert.ok(result.narrative.includes("not verified") || result.warnings.length > 0);
});

test("SSF calculator does not fabricate when contribution rate is unverified", () => {
  const result = computePolicyDrivenProjection({
    institution: "ssf",
    age: 30,
    monthlySalaryNpr: 100000,
    monthlyEmployeeContributionNpr: 0,
    monthlyEmployerContributionNpr: 0,
    contributionMonths: 120,
    currentBalanceNpr: 0,
    expectedRetirementAge: 60,
    asOfDate: "2026-08-15",
  });
  assert.equal(result.unavailableMessage, "Official policy information unavailable for verification.");
  assert.equal(result.projectedBalanceNpr, null);
});
