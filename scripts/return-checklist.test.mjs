#!/usr/bin/env node
/**
 * Return Checklist canonical data-source tests.
 * Run: npx tsx --test scripts/return-checklist.test.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  computeReturnChecklist,
  RETURN_CHECKLIST_FALLBACK_EMERGENCY_MONTHS,
  RETURN_CHECKLIST_FALLBACK_INVESTMENT_TARGET_NPR,
} from "../src/lib/return-to-nepal/return-checklist.ts";
import {
  findBusinessCapitalGoal,
  findHouseSavingsGoal,
  findInvestmentSavingsGoal,
  houseProgressPctFromGoal,
} from "../src/lib/return-to-nepal/checklist-goal-matchers.ts";
import { DEFAULT_RETURN_PLANNER_STATE } from "../src/lib/return-to-nepal/default-planner-state.ts";

function baseInsuranceInputs(overrides = {}) {
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
    ...overrides,
  };
}

function baseSources(overrides = {}) {
  return {
    state: { ...DEFAULT_RETURN_PLANNER_STATE },
    emergencyCashReserveNpr: null,
    emergencyMonthlyBurnNpr: 100_000,
    emergencyMonthsTarget: 0,
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
  };
}

function byId(items, id) {
  const item = items.find((row) => row.id === id);
  assert.ok(item, `missing checklist item ${id}`);
  return item;
}

describe("goal matchers", () => {
  it("does not treat Investment Fund as business capital", () => {
    const goals = [
      {
        id: "1",
        templateId: "investment",
        name: "Investment Fund",
        category: "Investment",
        targetAmountNpr: 500_000,
        savedAmountNpr: 100_000,
      },
      {
        id: "2",
        templateId: "custom",
        name: "Business Startup Capital",
        category: "Custom",
        targetAmountNpr: 1_000_000,
        savedAmountNpr: 250_000,
      },
    ];
    assert.equal(findBusinessCapitalGoal(goals)?.id, "2");
    assert.equal(findInvestmentSavingsGoal(goals)?.id, "1");
  });

  it("prefers house template and computes shared progress %", () => {
    const goal = {
      id: "h",
      templateId: "house",
      name: "House / Land Fund",
      category: "Property",
      targetAmountNpr: 1_000_000,
      savedAmountNpr: 250_000,
    };
    assert.equal(findHouseSavingsGoal([goal])?.id, "h");
    assert.equal(houseProgressPctFromGoal(goal, 99), 25);
  });
});

describe("Return Checklist — Emergency Fund", () => {
  it("uses cashflow emergencyCashReserve runway vs months target (fallback 12)", () => {
    const items = computeReturnChecklist(
      baseSources({
        emergencyCashReserveNpr: 600_000,
        emergencyMonthlyBurnNpr: 100_000,
        emergencyMonthsTarget: 0,
      }),
    );
    const emergency = byId(items, "emergency");
    assert.equal(emergency.label, `Emergency Fund (${RETURN_CHECKLIST_FALLBACK_EMERGENCY_MONTHS} Months)`);
    assert.equal(emergency.detail, "6.0 mo runway");
    assert.equal(emergency.status, "in_progress");
  });

  it("marks missing when emergency reserve is not configured", () => {
    const emergency = byId(computeReturnChecklist(baseSources()), "emergency");
    assert.equal(emergency.status, "missing");
    assert.match(emergency.detail, /Set emergency reserve/i);
  });

  it("reaches completed at full runway target", () => {
    const emergency = byId(
      computeReturnChecklist(
        baseSources({
          emergencyCashReserveNpr: 1_200_000,
          emergencyMonthlyBurnNpr: 100_000,
          emergencyMonthsTarget: 12,
        }),
      ),
      "emergency",
    );
    assert.equal(emergency.status, "completed");
    assert.equal(emergency.detail, "12.0 mo runway");
  });
});

describe("Return Checklist — SSF", () => {
  it("uses live contribution and can reach completed (no 80% cap)", () => {
    const ssf = byId(
      computeReturnChecklist(
        baseSources({
          monthlySsfContributionNpr: 20_000,
          ssfContributionTargetNpr: 20_000,
        }),
      ),
      "ssf",
    );
    assert.equal(ssf.status, "completed");
    assert.match(ssf.detail, /20,000/);
  });

  it("shows setup prompt when contribution is zero", () => {
    const ssf = byId(computeReturnChecklist(baseSources()), "ssf");
    assert.equal(ssf.status, "missing");
    assert.match(ssf.detail, /SSF workspace/i);
  });
});

describe("Return Checklist — Investment", () => {
  it("keeps portfolio total and uses goal target when present", () => {
    const investment = byId(
      computeReturnChecklist(
        baseSources({
          totalInvestmentNpr: 2_440_288,
          investmentGoalTargetNpr: 2_440_288,
        }),
      ),
      "investment",
    );
    assert.equal(investment.status, "completed");
    assert.match(investment.detail, /2,440,288/);
  });

  it("falls back to 2M only when no investment goal exists", () => {
    const investment = byId(
      computeReturnChecklist(
        baseSources({
          totalInvestmentNpr: 1_000_000,
          investmentGoalTargetNpr: null,
        }),
      ),
      "investment",
    );
    assert.equal(investment.status, "in_progress");
    assert.equal(RETURN_CHECKLIST_FALLBACK_INVESTMENT_TARGET_NPR, 2_000_000);
  });
});

describe("Return Checklist — Passive Income", () => {
  it("shows modeled (KPI) and actual side by side", () => {
    const passive = byId(
      computeReturnChecklist(
        baseSources({
          modeledPassiveMonthlyNpr: 12_000,
          actualPassiveMonthlyNpr: 3_000,
          passiveTargetMonthlyNpr: 25_000,
        }),
      ),
      "passive",
    );
    assert.match(passive.detail, /12,000\/mo modeled/);
    assert.match(passive.detail, /3,000\/mo actual/);
    assert.equal(passive.status, "in_progress");
  });
});

describe("Return Checklist — Insurance", () => {
  it("marks health/life missing without policies", () => {
    const items = computeReturnChecklist(baseSources());
    assert.equal(byId(items, "health").status, "missing");
    assert.equal(byId(items, "life").status, "missing");
  });

  it("completes when coverage meets adequacy threshold", () => {
    const policies = [
      {
        id: "h1",
        type: "health",
        provider: "Test",
        coverageAmountNpr: 10_000_000,
        premiumNpr: 1000,
        paymentFrequency: "monthly",
        status: "active",
        sortOrder: 0,
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
      },
      {
        id: "l1",
        type: "life",
        provider: "Test",
        coverageAmountNpr: 50_000_000,
        premiumNpr: 2000,
        paymentFrequency: "monthly",
        status: "active",
        sortOrder: 1,
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
      },
    ];
    const items = computeReturnChecklist(baseSources({ insurancePolicies: policies }));
    assert.equal(byId(items, "health").status, "completed");
    assert.equal(byId(items, "life").status, "completed");
  });
});

describe("Return Checklist — House", () => {
  it("asks to choose a plan when housePlanStatus is unknown", () => {
    const house = byId(
      computeReturnChecklist(
        baseSources({
          housePlanStatus: "unknown",
          houseGoalConfigured: true,
          houseProgressPct: 40,
        }),
      ),
      "house",
    );
    assert.equal(house.status, "missing");
    assert.match(house.detail, /Choose your house plan/i);
    assert.match(house.href, /\/return-to-nepal\/house/);
  });

  it("uses the same progress % for detail and status when planning to buy/build", () => {
    const house = byId(
      computeReturnChecklist(
        baseSources({
          housePlanStatus: "plan_to_buy_build",
          houseGoalConfigured: true,
          houseProgressPct: 40,
        }),
      ),
      "house",
    );
    assert.equal(house.detail, "40% funded");
    assert.equal(house.status, "in_progress");
  });

  it("does not show MISSING/0% when already_own or not_needed", () => {
    const own = byId(
      computeReturnChecklist(baseSources({ housePlanStatus: "already_own", houseProgressPct: 0 })),
      "house",
    );
    assert.equal(own.status, "completed");
    assert.match(own.detail, /Already own/i);
    assert.doesNotMatch(own.detail, /0% funded/);

    const skip = byId(
      computeReturnChecklist(baseSources({ housePlanStatus: "not_needed", houseProgressPct: 0 })),
      "house",
    );
    assert.equal(skip.status, "completed");
    assert.equal(skip.badgeLabel, "Not Needed");
  });

  it("stays missing until a house goal exists when plan_to_buy_build", () => {
    const house = byId(
      computeReturnChecklist(
        baseSources({
          housePlanStatus: "plan_to_buy_build",
          houseGoalConfigured: false,
          houseProgressPct: 80,
        }),
      ),
      "house",
    );
    assert.equal(house.status, "missing");
    assert.match(house.detail, /Set house goal/i);
  });
});

describe("Return Checklist — navigation hrefs", () => {
  it("attaches real workspace hrefs to every card", () => {
    const items = computeReturnChecklist(baseSources());
    const expected = {
      emergency: "/emergency-fund",
      ssf: "/portfolio/pension/ssf",
      investment: "/portfolio/investments",
      passive: "/cashflow-dashboard",
      health: "/insurance",
      life: "/insurance",
      house: "/return-to-nepal/house",
      family: "/family",
      business: "/savings-tracker",
      debt: "/portfolio/liabilities",
    };
    for (const [id, path] of Object.entries(expected)) {
      const item = byId(items, id);
      assert.ok(item.href.includes(path), `${id} href ${item.href} should include ${path}`);
      assert.ok(item.href.includes("from=return-checklist"), `${id} should include from=return-checklist`);
    }
  });
});

describe("Return Checklist — rendered card wiring", () => {
  it("dashboard renders ReturnChecklistCard for every item", () => {
    const src = readFileSync(
      new URL("../src/components/return-to-nepal/ReturnToNepalPlannerDashboard.tsx", import.meta.url),
      "utf8",
    );
    assert.match(src, /id="return-checklist"/);
    assert.match(src, /ReturnChecklistCard/);
    assert.match(src, /checklist\.map\(\(item\) => \(\s*<ReturnChecklistCard/);
    assert.match(src, /Tap a card to open/);
    assert.doesNotMatch(src, /checklist\.map\(\(item\) => \(\s*<li key=\{item\.id\}>\s*<Link/);
  });

  it("ReturnChecklistCard is a real <a> covering the full card with visible chevron", () => {
    const src = readFileSync(
      new URL("../src/components/return-to-nepal/ReturnChecklistCard.tsx", import.meta.url),
      "utf8",
    );
    assert.match(src, /<a\s/);
    assert.match(src, /href=\{item\.href\}/);
    assert.match(src, /data-testid=\{`return-checklist-\$\{item\.id\}`\}/);
    assert.match(src, /data-href=\{item\.href\}/);
    assert.match(src, /absolute inset-0/);
    assert.match(src, /pointer-events-none/);
    assert.match(src, /touch-manipulation/);
    assert.match(src, /ChevronRight/);
    assert.match(src, /window\.location\.assign\(item\.href\)/);
    assert.match(src, /STATUS_LABELS/);
    assert.match(src, /Missing/);
    assert.match(src, /In Progress/);
    assert.match(src, /Completed/);
    // Chevron must not be low-contrast / hover-only
    assert.doesNotMatch(src, /text-white\/35/);
    assert.doesNotMatch(src, /group-hover:text-/);
  });

  it("every checklist item href matches the canonical route map exactly", () => {
    const items = computeReturnChecklist(baseSources());
    const expected = {
      emergency: "/emergency-fund?from=return-checklist",
      ssf: "/portfolio/pension/ssf?from=return-checklist",
      investment: "/portfolio/investments?from=return-checklist",
      passive: "/cashflow-dashboard?from=return-checklist",
      health: "/insurance?focus=health&from=return-checklist",
      life: "/insurance?focus=life&from=return-checklist",
      house: "/return-to-nepal/house?from=return-checklist",
      family: "/family?from=return-checklist",
      business: "/savings-tracker?from=return-checklist",
      debt: "/portfolio/liabilities?from=return-checklist",
    };
    assert.equal(items.length, 10);
    for (const [id, href] of Object.entries(expected)) {
      assert.equal(byId(items, id).href, href, `${id} href mismatch`);
    }
  });

  it("exposes stable href map for all ten checklist ids", async () => {
    const { RETURN_CHECKLIST_HREFS } = await import("../src/lib/return-to-nepal/return-checklist-routes.ts");
    assert.deepEqual(Object.keys(RETURN_CHECKLIST_HREFS).sort(), [
      "business",
      "debt",
      "emergency",
      "family",
      "health",
      "house",
      "investment",
      "life",
      "passive",
      "ssf",
    ]);
    assert.equal(RETURN_CHECKLIST_HREFS.emergency, "/emergency-fund?from=return-checklist");
    assert.equal(RETURN_CHECKLIST_HREFS.health, "/insurance?focus=health&from=return-checklist");
    assert.equal(RETURN_CHECKLIST_HREFS.life, "/insurance?focus=life&from=return-checklist");
  });
});

describe("Return Checklist — Family", () => {
  it("does not treat default COL household as confirmed", () => {
    const family = byId(
      computeReturnChecklist(
        baseSources({
          adults: 2,
          children: 1,
          householdConfigured: false,
        }),
      ),
      "family",
    );
    assert.match(family.detail, /Set household/i);
    assert.equal(family.status, "missing");
  });

  it("shows adults/children only when household is configured", () => {
    const family = byId(
      computeReturnChecklist(
        baseSources({
          adults: 2,
          children: 1,
          householdConfigured: true,
          familyCostSignalsConfigured: true,
          schoolFeesMonthlyNpr: 10_000,
          healthcareMonthlyNpr: 5_000,
          settlementChecklistLength: 2,
        }),
      ),
      "family",
    );
    assert.equal(family.detail, "2 adults · 1 children");
    assert.equal(family.status, "completed");
  });
});

describe("Return Checklist — Business Capital", () => {
  it("requires a matching business goal", () => {
    const missing = byId(
      computeReturnChecklist(
        baseSources({
          businessGoalConfigured: false,
          businessCapitalNpr: 999_999,
        }),
      ),
      "business",
    );
    assert.equal(missing.status, "missing");
    assert.match(missing.detail, /Set capital goal/i);

    const progressing = byId(
      computeReturnChecklist(
        baseSources({
          businessGoalConfigured: true,
          businessCapitalNpr: 500_000,
          businessCapitalTargetNpr: 1_000_000,
        }),
      ),
      "business",
    );
    assert.equal(progressing.status, "in_progress");
    assert.match(progressing.detail, /500,000/);
  });
});

describe("Return Checklist — Debt Free", () => {
  it("does not complete when liabilities were never configured", () => {
    const debt = byId(
      computeReturnChecklist(
        baseSources({
          liabilitiesConfigured: false,
          liabilitiesNpr: 0,
        }),
      ),
      "debt",
    );
    assert.equal(debt.status, "missing");
    assert.match(debt.detail, /Confirm liabilities/i);
  });

  it("completes when reviewed and liabilities are zero", () => {
    const debt = byId(
      computeReturnChecklist(
        baseSources({
          liabilitiesConfigured: true,
          liabilitiesNpr: 0,
        }),
      ),
      "debt",
    );
    assert.equal(debt.status, "completed");
    assert.equal(debt.detail, "No liabilities");
  });
});

describe("House plan flow — pure helpers", () => {
  it("merges selectable statuses into planner state", async () => {
    const { mergeHousePlanStatus, isSelectableHousePlanStatus, housePlanReturnHref } = await import(
      "../src/lib/return-to-nepal/house-plan-flow.ts"
    );
    const { DEFAULT_RETURN_PLANNER_STATE } = await import("../src/lib/return-to-nepal/default-planner-state.ts");

    for (const status of ["plan_to_buy_build", "already_own", "not_needed"]) {
      assert.ok(isSelectableHousePlanStatus(status));
      const merged = mergeHousePlanStatus(DEFAULT_RETURN_PLANNER_STATE, status);
      assert.equal(merged.housePlanStatus, status);
    }
    assert.equal(isSelectableHousePlanStatus("unknown"), false);
    assert.equal(isSelectableHousePlanStatus(null), false);
    assert.match(housePlanReturnHref(true), /\/return-to-nepal#return-checklist/);
    assert.match(housePlanReturnHref(false), /\/return-to-nepal#return-checklist/);
  });

  it("detects dirty selection vs saved plan", async () => {
    const { housePlanSelectionDirty } = await import("../src/lib/return-to-nepal/house-plan-flow.ts");
    assert.equal(housePlanSelectionDirty("unknown", "already_own"), true);
    assert.equal(housePlanSelectionDirty("already_own", "already_own"), false);
    assert.equal(housePlanSelectionDirty("already_own", null), false);
  });

  it("gates Save & Continue until a selectable plan is pending and not saving", async () => {
    const { canStartHousePlanSave } = await import("../src/lib/return-to-nepal/house-plan-flow.ts");
    assert.equal(canStartHousePlanSave({ pending: null, saving: false, hydrateError: null }), false);
    assert.equal(canStartHousePlanSave({ pending: "unknown", saving: false, hydrateError: null }), false);
    assert.equal(canStartHousePlanSave({ pending: "already_own", saving: true, hydrateError: null }), false);
    assert.equal(
      canStartHousePlanSave({ pending: "already_own", saving: false, hydrateError: "Load failed" }),
      false,
    );
    assert.equal(canStartHousePlanSave({ pending: "already_own", saving: false, hydrateError: null }), true);
  });
});

describe("House plan flow — persist + checklist reflection", () => {
  it("reflects each saved state on the Return Checklist", () => {
    const buy = byId(
      computeReturnChecklist(
        baseSources({
          housePlanStatus: "plan_to_buy_build",
          houseGoalConfigured: true,
          houseProgressPct: 40,
        }),
      ),
      "house",
    );
    assert.equal(buy.status, "in_progress");
    assert.equal(buy.detail, "40% funded");

    const own = byId(
      computeReturnChecklist(baseSources({ housePlanStatus: "already_own", houseProgressPct: 0 })),
      "house",
    );
    assert.equal(own.status, "completed");
    assert.equal(own.detail, "Already own a house");
    assert.equal(own.badgeLabel, "Completed");
    assert.doesNotMatch(own.detail, /Missing|0% funded/i);

    const skip = byId(
      computeReturnChecklist(baseSources({ housePlanStatus: "not_needed", houseProgressPct: 0 })),
      "house",
    );
    assert.equal(skip.status, "completed");
    assert.equal(skip.badgeLabel, "Not Needed");
    assert.doesNotMatch(skip.detail, /0% funded/i);
  });

  it("unknown state prompts user to choose a plan", () => {
    const house = byId(
      computeReturnChecklist(
        baseSources({
          housePlanStatus: "unknown",
          houseGoalConfigured: true,
          houseProgressPct: 80,
        }),
      ),
      "house",
    );
    assert.equal(house.status, "missing");
    assert.match(house.detail, /Choose your house plan/i);
  });

  it("sanitize preserves housePlanStatus round-trip", async () => {
    const { sanitizeReturnPlannerState } = await import("../src/lib/return-to-nepal/sanitize-planner-state.ts");
    for (const status of ["plan_to_buy_build", "already_own", "not_needed", "unknown"]) {
      const next = sanitizeReturnPlannerState({ housePlanStatus: status });
      assert.equal(next.housePlanStatus, status);
    }
  });
});

describe("House plan flow — save success, failure, timeout, double-tap", () => {
  it("awaits persistNow and returns saved state on success", async () => {
    const { runHousePlanSave, mergeHousePlanStatus } = await import(
      "../src/lib/return-to-nepal/house-plan-flow.ts"
    );
    const { DEFAULT_RETURN_PLANNER_STATE } = await import("../src/lib/return-to-nepal/default-planner-state.ts");
    let calls = 0;
    const result = await runHousePlanSave({
      pending: "already_own",
      state: DEFAULT_RETURN_PLANNER_STATE,
      persistNow: async (next) => {
        calls += 1;
        assert.equal(next.housePlanStatus, "already_own");
        return next;
      },
    });
    assert.equal(calls, 1);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.state.housePlanStatus, "already_own");
      assert.deepEqual(result.state, mergeHousePlanStatus(DEFAULT_RETURN_PLANNER_STATE, "already_own"));
    }
  });

  it("stops loading path and returns real error on persist failure", async () => {
    const { runHousePlanSave } = await import("../src/lib/return-to-nepal/house-plan-flow.ts");
    const { DEFAULT_RETURN_PLANNER_STATE } = await import("../src/lib/return-to-nepal/default-planner-state.ts");
    const result = await runHousePlanSave({
      pending: "not_needed",
      state: DEFAULT_RETURN_PLANNER_STATE,
      persistNow: async () => {
        throw new Error("Could not save return_to_nepal to Supabase.");
      },
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /Could not save return_to_nepal/);
    }
  });

  it("times out hung persist and clears the Saving path", async () => {
    const { runHousePlanSave, HOUSE_PLAN_SAVE_TIMEOUT_MESSAGE } = await import(
      "../src/lib/return-to-nepal/house-plan-flow.ts"
    );
    const { DEFAULT_RETURN_PLANNER_STATE } = await import("../src/lib/return-to-nepal/default-planner-state.ts");
    const result = await runHousePlanSave({
      pending: "plan_to_buy_build",
      state: DEFAULT_RETURN_PLANNER_STATE,
      timeoutMs: 40,
      persistNow: () => new Promise(() => {}),
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error, HOUSE_PLAN_SAVE_TIMEOUT_MESSAGE);
    }
  });

  it("withTimeout rejects after ms and clears timer", async () => {
    const { withTimeout } = await import("../src/lib/return-to-nepal/house-plan-flow.ts");
    await assert.rejects(
      () => withTimeout(new Promise(() => {}), 30, "boom"),
      /boom/,
    );
    const value = await withTimeout(Promise.resolve(7), 200, "boom");
    assert.equal(value, 7);
  });

  it("double-tap guard: canStartHousePlanSave is false while saving", async () => {
    const { canStartHousePlanSave } = await import("../src/lib/return-to-nepal/house-plan-flow.ts");
    // First tap flips saving=true; second tap must be rejected by the gate.
    assert.equal(canStartHousePlanSave({ pending: "already_own", saving: false, hydrateError: null }), true);
    assert.equal(canStartHousePlanSave({ pending: "already_own", saving: true, hydrateError: null }), false);
  });

  it("preserves housePlanStatus after reload via sanitize round-trip", async () => {
    const { sanitizeReturnPlannerState } = await import("../src/lib/return-to-nepal/sanitize-planner-state.ts");
    const { mergeHousePlanStatus } = await import("../src/lib/return-to-nepal/house-plan-flow.ts");
    const { DEFAULT_RETURN_PLANNER_STATE } = await import("../src/lib/return-to-nepal/default-planner-state.ts");
    const saved = mergeHousePlanStatus(DEFAULT_RETURN_PLANNER_STATE, "already_own");
    const reloaded = sanitizeReturnPlannerState(JSON.parse(JSON.stringify(saved)));
    assert.equal(reloaded.housePlanStatus, "already_own");
  });
});

describe("House plan flow — house decision page wiring", () => {
  it("uses Save & Continue with timed persistNow and does not navigate on option tap", () => {
    const src = readFileSync(
      new URL("../src/components/return-to-nepal/ReturnToNepalHouseDecisionPage.tsx", import.meta.url),
      "utf8",
    );
    assert.match(src, /Save & Continue/);
    assert.match(src, /data-testid="house-plan-save-continue"/);
    assert.match(src, /runHousePlanSave/);
    assert.match(src, /savingLockRef/);
    assert.match(src, /window\.location\.assign/);
    assert.match(src, /setPending\(option\.id\)/);
    assert.doesNotMatch(src, /onClick=\{\(\) => choose\(/);
    assert.match(src, /data-testid="house-plan-load-error"/);
    assert.match(src, /data-testid="house-plan-save-error"/);
    assert.match(src, /data-testid="house-plan-save-retry"/);
    assert.match(src, /Load failed/);
    assert.match(src, /retryHydrate/);
    assert.match(src, /aria-pressed=\{selected\}/);
    assert.match(src, /fixed inset-x-0 bottom-0/);
  });

  it("ReturnToNepalContext exposes hydrate + persist for canonical storage", () => {
    const src = readFileSync(new URL("../src/contexts/ReturnToNepalContext.tsx", import.meta.url), "utf8");
    assert.match(src, /moduleKey: "return_to_nepal"/);
    assert.match(src, /hydrateError/);
    assert.match(src, /persistNow/);
    assert.match(src, /retryHydrate/);
  });

  it("cloud document state surfaces hydrate failures and awaits PUT without hung re-fetch", () => {
    const src = readFileSync(new URL("../src/hooks/useCloudDocumentState.ts", import.meta.url), "utf8");
    assert.match(src, /hydrateError/);
    assert.match(src, /setHydrateError\(message\)/);
    assert.match(src, /retryHydrate/);
    assert.match(src, /await saveModuleSnapshotToCloud\(moduleKey, snapshot\)/);
    assert.doesNotMatch(
      src,
      /await saveModuleSnapshotToCloud\(moduleKey, snapshot\);\s*const remote = await fetchModuleSnapshot/,
    );
  });
});

describe("House plan flow — mobile selection fixture", () => {
  it("full-card tap selects option without navigating (Playwright)", async () => {
    const { chromium, devices } = await import("playwright");
    const { writeFileSync, mkdtempSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");

    const dir = mkdtempSync(join(tmpdir(), "house-plan-"));
    const htmlPath = join(dir, "index.html");
    writeFileSync(
      htmlPath,
      `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
body{margin:0;font-family:system-ui;background:#000805;color:#fff}
.card{display:block;width:100%;text-align:left;border:1px solid rgba(255,255,255,.1);background:#111;border-radius:16px;padding:16px;margin:12px 0}
.card[aria-pressed=true]{border-color:#34d399;background:rgba(16,185,129,.15)}
#save{position:fixed;left:16px;right:16px;bottom:16px;min-height:52px;border:0;border-radius:16px;background:#10b981;font-weight:800}
#save:disabled{opacity:.35}
#log{padding:12px;color:#6ee7b7;min-height:24px}
</style></head><body>
<div id="log">Tap a card</div>
<button class="card" data-testid="house-plan-already_own" aria-pressed="false">I already own a house</button>
<button class="card" data-testid="house-plan-not_needed" aria-pressed="false">Not needed</button>
<button id="save" data-testid="house-plan-save-continue" disabled>Save & Continue</button>
<script>
let pending=null; const log=document.getElementById('log'); const save=document.getElementById('save');
document.querySelectorAll('.card').forEach(btn=>btn.addEventListener('click',()=>{
  pending=btn.dataset.testid.replace('house-plan-','');
  document.querySelectorAll('.card').forEach(b=>b.setAttribute('aria-pressed', b===btn?'true':'false'));
  save.disabled=false; log.textContent='selected:'+pending;
}));
save.addEventListener('click',()=>{ if(pending) log.textContent='saved:'+pending; });
</script></body></html>`,
    );

    const browser = await chromium.launch({ headless: true, channel: "chrome" });
    const page = await browser.newContext({ ...devices["iPhone 12"] }).then((c) => c.newPage());
    await page.goto(`file://${htmlPath}`);
    await page.locator('[data-testid="house-plan-already_own"]').click({ position: { x: 20, y: 20 } });
    assert.equal(await page.locator('[data-testid="house-plan-already_own"]').getAttribute("aria-pressed"), "true");
    assert.equal(await page.locator("#save").isEnabled(), true);
    await page.locator("#save").click();
    assert.match(await page.locator("#log").innerText(), /saved:already_own/);
    await browser.close();
  });
});
