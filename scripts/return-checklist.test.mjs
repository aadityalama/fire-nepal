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
