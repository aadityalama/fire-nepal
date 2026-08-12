#!/usr/bin/env node
/**
 * Return Checklist + House in Nepal decision tests.
 * Run: npx tsx --test scripts/return-checklist-house.test.mjs
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_RETURN_PLANNER_STATE } from "../src/lib/return-to-nepal/default-planner-state.ts";
import { checklistItemHref } from "../src/lib/return-to-nepal/checklist-nav.ts";
import {
  houseFundingNotRequired,
  resolveEffectiveHouseDecision,
  effectiveHouseFundingBudgetNpr,
} from "../src/lib/return-to-nepal/house-plan.ts";
import { computeReturnChecklist } from "../src/lib/return-to-nepal/return-checklist.ts";
import { computePlannerSnapshot } from "../src/lib/return-to-nepal/planner-engine.ts";
import { sanitizeReturnPlannerState } from "../src/lib/return-to-nepal/sanitize-planner-state.ts";

const insuranceInputs = {
  monthlyIncomeNpr: 200_000,
  monthlyExpenseNpr: 80_000,
  totalSavingsNpr: 500_000,
  investableNpr: 0,
  emergencyFundMonths: 3,
  fireGoalNpr: 20_000_000,
  fireProgressPct: 10,
  age: 35,
  adults: 2,
  children: 1,
  ssfMonthlyContributionNpr: 0,
  yearsToReturn: 5,
  returnReadinessPct: 40,
};

function snapshotFor(state) {
  return computePlannerSnapshot(state);
}

describe("house plan helpers", () => {
  it("does not require funding for already_own / not_needed", () => {
    assert.equal(houseFundingNotRequired("already_own"), true);
    assert.equal(houseFundingNotRequired("not_needed"), true);
    assert.equal(houseFundingNotRequired("plan_to_buy_build"), false);
    assert.equal(houseFundingNotRequired("unknown"), false);
  });

  it("resolves unknown + savings goal as plan_to_buy_build without writing state", () => {
    assert.equal(resolveEffectiveHouseDecision({ housePlanDecision: "unknown" }, true), "plan_to_buy_build");
    assert.equal(resolveEffectiveHouseDecision({ housePlanDecision: "unknown" }, false), "unknown");
    assert.equal(resolveEffectiveHouseDecision({ housePlanDecision: "already_own" }, true), "already_own");
  });

  it("zeros funding budget when house is not required", () => {
    assert.equal(effectiveHouseFundingBudgetNpr("already_own", 10_000_000), 0);
    assert.equal(effectiveHouseFundingBudgetNpr("not_needed", 10_000_000), 0);
    assert.equal(effectiveHouseFundingBudgetNpr("plan_to_buy_build", 10_000_000), 10_000_000);
  });
});

describe("sanitize house fields", () => {
  it("defaults missing house decision to unknown without inventing ownership", () => {
    const sanitized = sanitizeReturnPlannerState({ koreaSavingsKrw: 1 });
    assert.equal(sanitized.housePlanDecision, "unknown");
    assert.equal(sanitized.houseAcquireMode, null);
    assert.equal(sanitized.houseFullyOwned, null);
  });

  it("preserves explicit already_own and optional details", () => {
    const sanitized = sanitizeReturnPlannerState({
      ...DEFAULT_RETURN_PLANNER_STATE,
      housePlanDecision: "already_own",
      houseOwnedValueNpr: 8_000_000,
      houseLocation: "Pokhara",
      houseFullyOwned: true,
    });
    assert.equal(sanitized.housePlanDecision, "already_own");
    assert.equal(sanitized.houseOwnedValueNpr, 8_000_000);
    assert.equal(sanitized.houseLocation, "Pokhara");
    assert.equal(sanitized.houseFullyOwned, true);
  });
});

describe("checklist navigation", () => {
  it("maps every checklist item to an existing workspace with from=return-checklist", () => {
    const ids = [
      "emergency",
      "ssf",
      "investment",
      "passive",
      "health",
      "life",
      "house",
      "family",
      "business",
      "debt",
    ];
    for (const id of ids) {
      const href = checklistItemHref(id);
      assert.ok(href.includes("from=return-checklist"), id);
      assert.ok(href.startsWith("/"), id);
    }
    assert.ok(checklistItemHref("health").includes("type=health"));
    assert.ok(checklistItemHref("life").includes("type=life"));
    assert.ok(checklistItemHref("business").includes("focus=business"));
    assert.ok(checklistItemHref("house").includes("/return-to-nepal/house"));
  });
});

describe("computeReturnChecklist house states", () => {
  it("marks unknown without house goal as missing / needs setup", () => {
    const state = { ...DEFAULT_RETURN_PLANNER_STATE, housePlanDecision: "unknown", emergencyMonthsTarget: 12 };
    const items = computeReturnChecklist(state, snapshotFor(state), insuranceInputs, 0, 0, {
      hasHouseSavingsGoal: false,
    });
    const house = items.find((item) => item.id === "house");
    assert.ok(house);
    assert.equal(house.status, "missing");
    assert.equal(house.ctaLabel, "Set Up →");
    assert.ok(house.href.includes("/return-to-nepal/house"));
  });

  it("marks already_own as completed without 0% funded", () => {
    const state = {
      ...DEFAULT_RETURN_PLANNER_STATE,
      housePlanDecision: "already_own",
      houseProgressPct: 100,
      emergencyMonthsTarget: 12,
    };
    const items = computeReturnChecklist(state, snapshotFor(state), insuranceInputs, 0, 0);
    const house = items.find((item) => item.id === "house");
    assert.ok(house);
    assert.equal(house.status, "completed");
    assert.match(house.progressLabel, /No funding required/i);
    assert.ok(!house.detail.includes("0% funded"));
    assert.equal(house.ctaLabel, "View / Edit →");
  });

  it("marks not_needed as completed / not needed", () => {
    const state = {
      ...DEFAULT_RETURN_PLANNER_STATE,
      housePlanDecision: "not_needed",
      emergencyMonthsTarget: 12,
    };
    const items = computeReturnChecklist(state, snapshotFor(state), insuranceInputs, 0, 0);
    const house = items.find((item) => item.id === "house");
    assert.ok(house);
    assert.equal(house.status, "completed");
    assert.equal(house.statusHint, "Not needed");
  });

  it("shows buy/build funding progress from saved/target", () => {
    const state = {
      ...DEFAULT_RETURN_PLANNER_STATE,
      housePlanDecision: "plan_to_buy_build",
      houseAcquireMode: "buy",
      houseProgressPct: 20,
      landBudgetNpr: 3_500_000,
      constructionBudgetNpr: 4_500_000,
      interiorBudgetNpr: 1_200_000,
      furnitureBudgetNpr: 800_000,
      emergencyMonthsTarget: 12,
    };
    const snap = snapshotFor(state);
    assert.equal(snap.houseTotalBudgetNpr, 10_000_000);
    const items = computeReturnChecklist(state, snap, insuranceInputs, 0, 0, { hasHouseSavingsGoal: true });
    const house = items.find((item) => item.id === "house");
    assert.ok(house);
    assert.match(house.progressLabel, /20% funded/);
    assert.match(house.subtitle, /Plan to buy/i);
    // 20% is below the 35% in-progress threshold — still actionable, not falsely completed
    assert.equal(house.status, "missing");
    assert.equal(house.ctaLabel, "Set Up →");

    const halfway = computeReturnChecklist(
      { ...state, houseProgressPct: 40 },
      snap,
      insuranceInputs,
      0,
      0,
      { hasHouseSavingsGoal: true },
    ).find((item) => item.id === "house");
    assert.equal(halfway?.status, "in_progress");
    assert.equal(halfway?.ctaLabel, "Continue →");
  });

  it("does not create a house funding gap when already owning", () => {
    const owned = {
      ...DEFAULT_RETURN_PLANNER_STATE,
      housePlanDecision: "already_own",
      landBudgetNpr: 0,
      constructionBudgetNpr: 0,
      interiorBudgetNpr: 0,
      furnitureBudgetNpr: 0,
      nepalLiquidNpr: 500_000,
      emergencyMonthsTarget: 12,
    };
    const planning = {
      ...DEFAULT_RETURN_PLANNER_STATE,
      housePlanDecision: "plan_to_buy_build",
      landBudgetNpr: 5_000_000,
      constructionBudgetNpr: 5_000_000,
      interiorBudgetNpr: 0,
      furnitureBudgetNpr: 0,
      nepalLiquidNpr: 500_000,
      emergencyMonthsTarget: 12,
    };
    const ownedSnap = snapshotFor(owned);
    const planSnap = snapshotFor(planning);
    assert.ok(ownedSnap.targetSavingsGapNpr < planSnap.targetSavingsGapNpr);
    assert.equal(ownedSnap.houseTotalBudgetNpr, 0);
  });

  it("exposes actionable href + CTA on every checklist item", () => {
    const state = { ...DEFAULT_RETURN_PLANNER_STATE, emergencyMonthsTarget: 12 };
    const items = computeReturnChecklist(state, snapshotFor(state), insuranceInputs, 100_000, 50_000);
    assert.equal(items.length, 10);
    for (const item of items) {
      assert.ok(item.href.length > 1, item.id);
      assert.ok(item.ctaLabel.includes("→"), item.id);
      assert.ok(item.statusHint.length > 0, item.id);
      assert.ok(item.progressLabel.length > 0, item.id);
    }
  });
});
