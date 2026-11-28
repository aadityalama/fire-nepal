#!/usr/bin/env node
/**
 * Nepal Return Planner ↔ Emergency Fund 3.0 synchronization regression tests.
 * Pure / mocked unit tests (no live database).
 *
 * Run: npx tsx --test scripts/return-planner-emergency-fund-sync.test.mjs
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { defaultCashflowState } from "../src/components/cashflow/cashflow-storage.ts";
import { defaultEmergencyFundSettings } from "../src/lib/emergency-fund/settings.ts";
import {
  computeCanonicalEmergencyFundForReturn,
  deriveCanonicalEmergencyFundStatus,
  formatCanonicalRunwayMonths,
  formatEmergencyRunwayDetail,
} from "../src/lib/return-to-nepal/canonical-emergency-fund.ts";
import { computeReturnChecklist } from "../src/lib/return-to-nepal/return-checklist.ts";
import { DEFAULT_RETURN_PLANNER_STATE } from "../src/lib/return-to-nepal/default-planner-state.ts";
import { computeReturnReadinessScores } from "../src/lib/return-to-nepal/return-readiness-scores.ts";
import { computeReturnRoadmap } from "../src/lib/return-to-nepal/return-roadmap.ts";

function budget({ id, name = id, category = "Other", period = "Monthly", amountNpr }) {
  return {
    id,
    name,
    icon: "💼",
    category,
    period,
    amountNpr,
    monthlyBudgetNpr: period === "Yearly" ? Math.round(amountNpr / 12) : amountNpr,
    monthlySpentNpr: 0,
    daysRemaining: period === "Yearly" ? 365 : 30,
    gradient: "from-emerald-300 to-lime-300",
    notes: "",
    notificationSettings: {
      "50% used": true,
      "75% used": true,
      "90% used": true,
      "100% used": true,
      "Overspend Alert": true,
    },
    aiRecommendation: null,
    sortOrder: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

/** Reported production-shaped fixture (regression examples — not hardcoded product values). */
const FIXTURE_BASIS = 109_000;
const FIXTURE_RESERVE_FULL = 2_242_000;
const FIXTURE_RESERVE_HALF = 654_000;
const FIXTURE_RESERVE_EXACT = 1_308_000;
const FIXTURE_TARGET_12 = FIXTURE_BASIS * 12;

function settingsWithReserve(reserveNpr, overrides = {}) {
  return {
    ...defaultEmergencyFundSettings(),
    protectionMode: "full_lifestyle",
    protectionMonths: overrides.workspaceProtectionMonths ?? 6,
    openingReserveNpr: reserveNpr,
    transactions: [],
    linkedSavingsGoalIds: [],
    lastSuccessfulSyncAt: "2026-11-28T02:00:00.000Z",
    ...overrides,
  };
}

function budgetsForBasis(monthlyNpr = FIXTURE_BASIS) {
  return [budget({ id: "m-life", name: "Lifestyle", amountNpr: monthlyNpr })];
}

function cashflowWith(reserve) {
  const cf = defaultCashflowState();
  return { ...cf, emergencyCashReserve: reserve };
}

function approx(actual, expected, tol = 0.02) {
  assert.ok(
    Math.abs(actual - expected) <= tol,
    `expected ${expected} ±${tol}, got ${actual}`,
  );
}

function baseInsuranceInputs() {
  return {
    monthlyIncomeNpr: 200_000,
    monthlyExpenseNpr: 100_000,
    totalSavingsNpr: 500_000,
    investableNpr: 1_000_000,
    emergencyFundMonths: 3,
    fireGoalNpr: 0,
    fireProgressPct: 20,
    age: 32,
    adults: 2,
    children: 1,
    ssfMonthlyContributionNpr: 0,
    yearsToReturn: 5,
    returnReadinessPct: 40,
  };
}

function checklistFromCanonical(canonical, overrides = {}) {
  return computeReturnChecklist({
    state: { ...DEFAULT_RETURN_PLANNER_STATE, emergencyMonthsTarget: 12 },
    emergencyCashReserveNpr: canonical.currentEmergencyReserveNpr,
    emergencyMonthlyBurnNpr: canonical.monthlyProtectionBasisNpr ?? 1,
    emergencyMonthsTarget: canonical.requiredProtectionMonths,
    canonicalEmergencyFund: canonical,
    monthlySsfContributionNpr: 0,
    ssfContributionTargetNpr: 20_000,
    totalInvestmentNpr: 0,
    investmentGoalTargetNpr: null,
    modeledPassiveMonthlyNpr: 0,
    actualPassiveMonthlyNpr: 0,
    passiveTargetMonthlyNpr: 80_000,
    insurancePolicies: [],
    insuranceInputs: baseInsuranceInputs(),
    houseProgressPct: 0,
    houseGoalConfigured: false,
    housePlanStatus: "unknown",
    adults: 2,
    children: 1,
    householdConfigured: false,
    schoolFeesMonthlyNpr: 0,
    healthcareMonthlyNpr: 0,
    familyCostSignalsConfigured: false,
    settlementChecklistLength: 0,
    businessCapitalNpr: 0,
    businessGoalConfigured: false,
    businessCapitalTargetNpr: 0,
    liabilitiesNpr: 0,
    liabilitiesConfigured: false,
    ...overrides,
  });
}

describe("Case A — fully funded (reported production mismatch)", () => {
  it("returns 20.57 mo runway, 171.4% progress, COMPLETED for 12-month Return requirement", () => {
    const snap = computeCanonicalEmergencyFundForReturn({
      settings: settingsWithReserve(FIXTURE_RESERVE_FULL, { workspaceProtectionMonths: 12 }),
      budgets: budgetsForBasis(),
      cashflow: cashflowWith(0),
      savingsGoals: [],
      requiredProtectionMonths: 12,
      loadState: "ready",
    });

    assert.equal(snap.loadState, "ready");
    assert.equal(snap.currentEmergencyReserveNpr, FIXTURE_RESERVE_FULL);
    assert.equal(snap.monthlyProtectionBasisNpr, FIXTURE_BASIS);
    assert.equal(snap.requiredProtectionMonths, 12);
    assert.equal(snap.emergencyFundTargetNpr, FIXTURE_TARGET_12);
    approx(snap.safetyRunwayMonths, 20.57, 0.01);
    approx(snap.fundingProgressPct, 171.4, 0.1);
    assert.equal(snap.excessReserveNpr, FIXTURE_RESERVE_FULL - FIXTURE_TARGET_12);
    assert.equal(snap.fundingGapNpr, 0);
    assert.equal(snap.isFullyFunded, true);
    assert.equal(snap.completionStatus, "completed");

    const emergency = checklistFromCanonical(snap).find((i) => i.id === "emergency");
    assert.equal(emergency.status, "completed");
    assert.equal(emergency.label, "Emergency Fund (12 Months)");
    assert.equal(emergency.detail, "20.57 mo runway");
    assert.match(emergency.href, /emergency-fund/);
  });
});

describe("Case B — partially funded", () => {
  it("returns 6 mo runway, 50% progress, IN PROGRESS", () => {
    const snap = computeCanonicalEmergencyFundForReturn({
      settings: settingsWithReserve(FIXTURE_RESERVE_HALF),
      budgets: budgetsForBasis(),
      cashflow: cashflowWith(null),
      savingsGoals: [],
      requiredProtectionMonths: 12,
      loadState: "ready",
    });
    approx(snap.safetyRunwayMonths, 6, 0.01);
    approx(snap.fundingProgressPct, 50, 0.05);
    assert.equal(snap.completionStatus, "in_progress");
    assert.equal(checklistFromCanonical(snap).find((i) => i.id === "emergency").status, "in_progress");
  });
});

describe("Case C — no funding", () => {
  it("marks MISSING when reserve is zero after successful load", () => {
    const snap = computeCanonicalEmergencyFundForReturn({
      settings: settingsWithReserve(0),
      budgets: budgetsForBasis(),
      cashflow: cashflowWith(0),
      savingsGoals: [],
      requiredProtectionMonths: 12,
      loadState: "ready",
    });
    assert.equal(snap.currentEmergencyReserveNpr, 0);
    assert.equal(snap.completionStatus, "missing");
    const emergency = checklistFromCanonical(snap).find((i) => i.id === "emergency");
    assert.equal(emergency.status, "missing");
  });
});

describe("Case D — exactly funded", () => {
  it("returns 12 mo runway, 100% progress, COMPLETED", () => {
    const snap = computeCanonicalEmergencyFundForReturn({
      settings: settingsWithReserve(FIXTURE_RESERVE_EXACT),
      budgets: budgetsForBasis(),
      cashflow: cashflowWith(null),
      savingsGoals: [],
      requiredProtectionMonths: 12,
      loadState: "ready",
    });
    approx(snap.safetyRunwayMonths, 12, 0.01);
    approx(snap.fundingProgressPct, 100, 0.05);
    assert.equal(snap.completionStatus, "completed");
    assert.equal(snap.isFullyFunded, true);
  });
});

describe("Case E — withdraw funds updates canonical reserve", () => {
  it("recomputes runway after a withdrawal transaction", () => {
    const before = computeCanonicalEmergencyFundForReturn({
      settings: settingsWithReserve(FIXTURE_RESERVE_FULL),
      budgets: budgetsForBasis(),
      cashflow: cashflowWith(FIXTURE_RESERVE_FULL),
      savingsGoals: [],
      requiredProtectionMonths: 12,
      loadState: "ready",
    });
    const afterSettings = {
      ...settingsWithReserve(FIXTURE_RESERVE_FULL),
      transactions: [
        {
          id: "w1",
          type: "withdrawal",
          amountNpr: FIXTURE_RESERVE_FULL - FIXTURE_RESERVE_HALF,
          date: "2026-11-28",
          note: "test withdraw",
          createdAt: "2026-11-28T03:00:00.000Z",
        },
      ],
    };
    const after = computeCanonicalEmergencyFundForReturn({
      settings: afterSettings,
      budgets: budgetsForBasis(),
      cashflow: cashflowWith(FIXTURE_RESERVE_HALF),
      savingsGoals: [],
      requiredProtectionMonths: 12,
      loadState: "ready",
    });
    assert.equal(before.completionStatus, "completed");
    assert.equal(after.currentEmergencyReserveNpr, FIXTURE_RESERVE_HALF);
    assert.equal(after.completionStatus, "in_progress");
    approx(after.safetyRunwayMonths, 6, 0.01);
  });
});

describe("Case F — Budget Planner basis change recalculates both modules consistently", () => {
  it("halving the monthly basis doubles runway and progress for the same reserve", () => {
    const snap = computeCanonicalEmergencyFundForReturn({
      settings: settingsWithReserve(FIXTURE_RESERVE_EXACT),
      budgets: budgetsForBasis(FIXTURE_BASIS / 2),
      cashflow: cashflowWith(null),
      savingsGoals: [],
      requiredProtectionMonths: 12,
      loadState: "ready",
    });
    assert.equal(snap.monthlyProtectionBasisNpr, FIXTURE_BASIS / 2);
    approx(snap.safetyRunwayMonths, 24, 0.01);
    approx(snap.fundingProgressPct, 200, 0.1);
    assert.equal(snap.completionStatus, "completed");
  });
});

describe("Case G — protection mode change synchronizes basis", () => {
  it("essential_survival with no essentials selected yields zero basis safely", () => {
    const snap = computeCanonicalEmergencyFundForReturn({
      settings: {
        ...settingsWithReserve(FIXTURE_RESERVE_FULL),
        protectionMode: "essential_survival",
        essentialRecordIds: [],
      },
      budgets: budgetsForBasis(),
      cashflow: cashflowWith(null),
      savingsGoals: [],
      requiredProtectionMonths: 12,
      loadState: "ready",
    });
    assert.equal(snap.monthlyProtectionBasisNpr, null);
    assert.equal(snap.safetyRunwayMonths, null);
    assert.equal(snap.hasReserveData, true);
    assert.equal(snap.completionStatus, "in_progress");
    assert.notEqual(formatEmergencyRunwayDetail(snap.safetyRunwayMonths), "Infinity mo runway");
  });

  it("essential_survival with selected essentials uses that basis", () => {
    const snap = computeCanonicalEmergencyFundForReturn({
      settings: {
        ...settingsWithReserve(FIXTURE_RESERVE_FULL),
        protectionMode: "essential_survival",
        essentialRecordIds: ["m-life"],
      },
      budgets: budgetsForBasis(),
      cashflow: cashflowWith(null),
      savingsGoals: [],
      requiredProtectionMonths: 12,
      loadState: "ready",
    });
    assert.equal(snap.monthlyProtectionBasisNpr, FIXTURE_BASIS);
    approx(snap.safetyRunwayMonths, 20.57, 0.01);
  });
});

describe("Case H — load failure is DATA UNAVAILABLE (not MISSING)", () => {
  it("marks data_unavailable when EF load fails", () => {
    const snap = computeCanonicalEmergencyFundForReturn({
      settings: defaultEmergencyFundSettings(),
      budgets: [],
      cashflow: defaultCashflowState(),
      savingsGoals: [],
      requiredProtectionMonths: 12,
      loadState: "unavailable",
    });
    assert.equal(snap.completionStatus, "data_unavailable");
    const emergency = checklistFromCanonical(snap).find((i) => i.id === "emergency");
    assert.equal(emergency.status, "data_unavailable");
    assert.equal(emergency.badgeLabel, "Data Unavailable");
    assert.match(emergency.detail, /Could not verify/i);
  });
});

describe("Case J — Return Planner keeps 12-month requirement when EF workspace period differs", () => {
  it("does not use workspace protectionMonths=3 for the Return target", () => {
    const snap = computeCanonicalEmergencyFundForReturn({
      settings: settingsWithReserve(FIXTURE_RESERVE_EXACT, { workspaceProtectionMonths: 3 }),
      budgets: budgetsForBasis(),
      cashflow: cashflowWith(null),
      savingsGoals: [],
      requiredProtectionMonths: 12,
      loadState: "ready",
    });
    assert.equal(snap.workspaceProtectionMonths, 3);
    assert.equal(snap.requiredProtectionMonths, 12);
    assert.equal(snap.emergencyFundTargetNpr, FIXTURE_TARGET_12);
    // 1,308,000 / 109,000 = 12 months runway — still COMPLETED vs 12-month Return target
    assert.equal(snap.completionStatus, "completed");
  });
});

describe("Status helper + formatting guards", () => {
  it("uses unrounded comparisons for completion", () => {
    assert.equal(
      deriveCanonicalEmergencyFundStatus({
        loadState: "ready",
        currentEmergencyReserveNpr: FIXTURE_TARGET_12,
        emergencyFundTargetNpr: FIXTURE_TARGET_12,
        hasReserveData: true,
      }),
      "completed",
    );
    assert.equal(
      deriveCanonicalEmergencyFundStatus({
        loadState: "ready",
        currentEmergencyReserveNpr: FIXTURE_TARGET_12 - 0.01,
        emergencyFundTargetNpr: FIXTURE_TARGET_12,
        hasReserveData: true,
      }),
      "in_progress",
    );
  });

  it("never formats Infinity or NaN runway labels", () => {
    assert.equal(formatCanonicalRunwayMonths(Number.POSITIVE_INFINITY), "—");
    assert.equal(formatCanonicalRunwayMonths(Number.NaN), "—");
    assert.equal(formatEmergencyRunwayDetail(null), "Runway unavailable");
  });
});

describe("Dependent Return Planner features use canonical funding", () => {
  it("readiness Savings & Emergency uses funding progress, not cashflow burn", () => {
    const snap = computeCanonicalEmergencyFundForReturn({
      settings: settingsWithReserve(FIXTURE_RESERVE_FULL),
      budgets: budgetsForBasis(),
      cashflow: cashflowWith(50_000), // stale / wrong cashflow reserve must be ignored by canonical
      savingsGoals: [],
      requiredProtectionMonths: 12,
      loadState: "ready",
    });
    // Ledger opening wins over cashflow when opening is set.
    assert.equal(snap.currentEmergencyReserveNpr, FIXTURE_RESERVE_FULL);

    const scores = computeReturnReadinessScores(
      { ...DEFAULT_RETURN_PLANNER_STATE, emergencyMonthsTarget: 12 },
      {
        emergencyReserveMonths: 1.4,
        monthlyNepalLivingNpr: 80_000,
        passiveMonthlyNpr: 10_000,
        houseTotalBudgetNpr: 0,
        familyRelocationScore: 0,
        yearsToReturn: 5,
        returnReadinessPct: 40,
        monthlyDeficitNpr: 0,
        monthlySurplusNpr: 0,
        requiredExtraCorpusNpr: 0,
        sustainabilityYears: 1,
        estimatedReturnYear: 2030,
        nowYear: 2026,
        aiHeadline: "",
        totalReturnFundNpr: 100_000,
        emergencyStatusLabel: "critical",
        returnGoalProgressPct: 10,
        monthlyNepalLivingFutureNpr: 90_000,
      },
      baseInsuranceInputs(),
      1_000_000,
      0,
      {
        state: DEFAULT_RETURN_PLANNER_STATE,
        emergencyCashReserveNpr: snap.currentEmergencyReserveNpr,
        emergencyMonthlyBurnNpr: snap.monthlyProtectionBasisNpr,
        emergencyMonthsTarget: 12,
        canonicalEmergencyFund: snap,
        monthlySsfContributionNpr: 0,
        ssfContributionTargetNpr: 20_000,
        totalInvestmentNpr: 0,
        investmentGoalTargetNpr: null,
        modeledPassiveMonthlyNpr: 0,
        actualPassiveMonthlyNpr: 0,
        passiveTargetMonthlyNpr: 80_000,
        insurancePolicies: [],
        insuranceInputs: baseInsuranceInputs(),
        houseProgressPct: 0,
        houseGoalConfigured: false,
        housePlanStatus: "unknown",
        adults: 1,
        children: 0,
        householdConfigured: false,
        schoolFeesMonthlyNpr: 0,
        healthcareMonthlyNpr: 0,
        familyCostSignalsConfigured: false,
        settlementChecklistLength: 0,
        businessCapitalNpr: 0,
        businessGoalConfigured: false,
        businessCapitalTargetNpr: 0,
        liabilitiesNpr: 0,
        liabilitiesConfigured: false,
      },
    );
    const emergencyScore = scores.find((s) => s.id === "savingsEmergency");
    assert.ok(emergencyScore.pct >= 100);
  });

  it("roadmap drops outdated emergency savings-goal milestones when EF is completed", () => {
    const snap = computeCanonicalEmergencyFundForReturn({
      settings: settingsWithReserve(FIXTURE_RESERVE_FULL),
      budgets: budgetsForBasis(),
      cashflow: cashflowWith(null),
      savingsGoals: [],
      requiredProtectionMonths: 12,
      loadState: "ready",
    });
    const roadmap = computeReturnRoadmap(
      [
        {
          id: "g1",
          templateId: "emergency",
          name: "Emergency Fund",
          category: "Emergency",
          targetAmountNpr: 500_000,
          savedAmountNpr: 50_000,
          monthlyContributionNpr: 5_000,
          targetDate: "2027-06-01",
          status: "active",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
        {
          id: "g2",
          templateId: "house",
          name: "House Fund",
          category: "Property",
          targetAmountNpr: 5_000_000,
          savedAmountNpr: 100_000,
          monthlyContributionNpr: 20_000,
          targetDate: "2028-01-01",
          status: "active",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      {
        nowYear: 2026,
        estimatedReturnYear: 2030,
        emergencyReserveMonths: 1.4,
      },
      2030,
      snap,
    );
    assert.equal(roadmap.some((m) => /emergency/i.test(m.label)), false);
    assert.equal(roadmap.some((m) => /house/i.test(m.label)), true);
  });
});

describe("Case I — isolation shape (no cross-user fields in snapshot)", () => {
  it("canonical snapshot contains only numeric financial fields (no foreign user ids)", () => {
    const snap = computeCanonicalEmergencyFundForReturn({
      settings: settingsWithReserve(FIXTURE_RESERVE_FULL),
      budgets: budgetsForBasis(),
      cashflow: cashflowWith(null),
      savingsGoals: [],
      requiredProtectionMonths: 12,
      loadState: "ready",
    });
    const json = JSON.stringify(snap);
    assert.equal(/user[_-]?id/i.test(json), false);
    assert.equal(/service[_-]?role/i.test(json), false);
  });
});
