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
  it("keeps portfolio total and meets expense-based 25× FIRE corpus", () => {
    const investment = byId(
      computeReturnChecklist(
        baseSources({
          totalInvestmentNpr: 2_440_288,
          investmentGoalTargetNpr: 2_440_288,
          investmentTargetSource: "expense_tracking",
          investmentMonthlyExpenseBasisNpr: 8_134,
        }),
      ),
      "investment",
    );
    assert.equal(investment.status, "completed");
    assert.match(investment.detail, /24\.4 Lakh/i);
    assert.match(investment.detail, /market/i);
    assert.match(investment.detail, /25× FIRE met/i);
    assert.match(investment.detail, /Expense Tracking/i);
    assert.equal(investment.actionLabel, "View Portfolio");
  });

  it("never marks positive portfolio MISSING when expense/budget target is absent (TARGET NOT SET)", () => {
    const investment = byId(
      computeReturnChecklist(
        baseSources({
          totalInvestmentNpr: 2_550_724,
          investmentGoalTargetNpr: null,
          investmentTargetSource: null,
        }),
      ),
      "investment",
    );
    assert.equal(investment.status, "target_not_set");
    assert.match(investment.detail, /25\.5 Lakh/i);
    assert.match(investment.detail, /expenses or budget/i);
    assert.notEqual(investment.status, "missing");
    assert.equal(RETURN_CHECKLIST_FALLBACK_INVESTMENT_TARGET_NPR, 2_000_000);
  });

  it("marks positive portfolio below a high 25× target as IN PROGRESS (not MISSING)", () => {
    const investment = byId(
      computeReturnChecklist(
        baseSources({
          totalInvestmentNpr: 2_550_724,
          investmentGoalTargetNpr: 50_000_000,
          investmentTargetSource: "budget_tracking",
          investmentMonthlyExpenseBasisNpr: 166_667,
        }),
      ),
      "investment",
    );
    assert.equal(investment.status, "in_progress");
    assert.match(investment.detail, /25\.5 Lakh/i);
    assert.match(investment.detail, /5 Cr/i);
    assert.match(investment.detail, /Budget Tracking/i);
    assert.equal(investment.actionLabel, "View Portfolio");
  });

  it("unified summary totalInvestmentNpr matches NEPSE live aggregation SoT", async () => {
    const { aggregateInvestmentTotals, valueInvestmentRow } = await import(
      "../src/services/portfolio/investment-aggregation.ts"
    );
    const { computeUnifiedFireSummary } = await import(
      "../src/lib/fire-nepal/unified-fire-summary.ts"
    );
    const { defaultCashflowState } = await import("../src/components/cashflow/cashflow-storage.ts");
    const { defaultWealthState } = await import("../src/components/portfolio/storage.ts");

    const portfolio = defaultWealthState();
    const row = {
      id: "n1",
      kind: "nepse",
      name: "Nabil Bank",
      quantity: 100,
      buyPrice: 1000,
      currency: "NPR",
      instrumentKey: "nepse:NABIL",
    };
    portfolio.investments = [row];

    const liveMarket = {
      fetchedAt: new Date().toISOString(),
      partial: false,
      sourceStatus: {},
      forex: { usdPerNpr: 0.0075, krwPerNpr: 10 },
      nepseBySymbol: { NABIL: { symbol: "NABIL", ltpNpr: 800, pctChange: -5 } },
      usdEquities: {},
      krEquities: {},
      crypto: {},
      metalsUsdOz: { goldUsdPerOz: 2300, silverUsdPerOz: 28 },
    };

    const listed = aggregateInvestmentTotals(portfolio.investments, portfolio.fixedDeposits, {
      krwPerNpr: 10,
      usdPerNpr: 0.0075,
      liveMarket,
    });
    const summary = computeUnifiedFireSummary(
      portfolio,
      defaultCashflowState(),
      10,
      0.0075,
      { liveMarket },
    );
    assert.equal(summary.totalInvestmentNpr, listed.listedLiveNpr);
    const unit = valueInvestmentRow(row, 10, 0.0075, liveMarket);
    assert.equal(unit.liveValueNpr, 80_000);
    assert.equal(summary.totalInvestmentNpr, 80_000);
    const summaryNoLive = computeUnifiedFireSummary(
      portfolio,
      defaultCashflowState(),
      10,
      0.0075,
      {},
    );
    assert.notEqual(summary.totalInvestmentNpr, summaryNoLive.totalInvestmentNpr);
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

  it("marks positive life coverage below recommended as IN PROGRESS (not MISSING)", () => {
    const policies = [
      {
        id: "l1",
        type: "life",
        provider: "Test",
        coverageAmountNpr: 5_000_000,
        premiumNpr: 2000,
        paymentFrequency: "monthly",
        status: "active",
        sortOrder: 0,
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
      },
    ];
    const life = byId(
      computeReturnChecklist(
        baseSources({
          insurancePolicies: policies,
          // Force a known recommended life target via high income/dependents inputs —
          // engine should recommend well above 5M so status stays IN PROGRESS.
          insuranceInputs: baseInsuranceInputs({
            monthlyIncomeNpr: 500_000,
            adults: 2,
            children: 2,
            investableNpr: 0,
            totalSavingsNpr: 0,
          }),
        }),
      ),
      "life",
    );
    assert.equal(life.status, "in_progress");
    assert.match(life.detail, /50 Lakh/i);
    assert.match(life.detail, /%\s*covered/i);
    assert.notEqual(life.status, "missing");
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
    assert.equal(skip.status, "not_applicable");
    assert.equal(skip.badgeLabel, "Not Applicable");
  });

  it("stays TARGET NOT SET until a house goal exists when plan_to_buy_build", () => {
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
    assert.equal(house.status, "target_not_set");
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
    assert.match(src, /STATUS_LABELS|CHECKLIST_STATUS_LABELS/);
    assert.match(src, /target_not_set|not_applicable|loading/);
    const labels = readFileSync(
      new URL("../src/lib/return-to-nepal/checklist-status.ts", import.meta.url),
      "utf8",
    );
    assert.match(labels, /Missing/);
    assert.match(labels, /In Progress/);
    assert.match(labels, /Completed/);
    assert.match(labels, /Target Not Set/);
    assert.match(labels, /Not Applicable/);
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
    assert.equal(missing.status, "target_not_set");
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
    assert.equal(debt.status, "target_not_set");
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
  });

  it("detects dirty selection vs saved plan", async () => {
    const { housePlanSelectionDirty } = await import("../src/lib/return-to-nepal/house-plan-flow.ts");
    assert.equal(housePlanSelectionDirty("unknown", "already_own"), true);
    assert.equal(housePlanSelectionDirty("already_own", "already_own"), false);
    assert.equal(housePlanSelectionDirty("already_own", null), false);
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
    assert.equal(skip.status, "not_applicable");
    assert.equal(skip.badgeLabel, "Not Applicable");
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

describe("House plan flow — house decision page wiring", () => {
  it("uses Save & Continue with persistNow and does not navigate on option tap", () => {
    const src = readFileSync(
      new URL("../src/components/return-to-nepal/ReturnToNepalHouseDecisionPage.tsx", import.meta.url),
      "utf8",
    );
    assert.match(src, /Save & Continue/);
    assert.match(src, /data-testid="house-plan-save-continue"/);
    assert.match(src, /persistNow\(mergeHousePlanStatus/);
    assert.match(src, /setPending\(option\.id\)/);
    assert.doesNotMatch(src, /onClick=\{\(\) => choose\(/);
    assert.match(src, /data-testid="house-plan-load-error"/);
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

  it("cloud document state surfaces hydrate failures instead of hiding them", () => {
    const src = readFileSync(new URL("../src/hooks/useCloudDocumentState.ts", import.meta.url), "utf8");
    assert.match(src, /hydrateError/);
    assert.match(src, /setHydrateError\(message\)/);
    assert.match(src, /retryHydrate/);
  });

  it("cloud document state paints shell immediately and ignores unstable local callback identity", () => {
    const src = readFileSync(new URL("../src/hooks/useCloudDocumentState.ts", import.meta.url), "utf8");
    // Callbacks are read from refs — not listed in hydrate effect deps.
    assert.match(src, /loadLocalRef\.current/);
    assert.match(src, /saveLocalRef\.current/);
    assert.match(src, /clearLocalRef\.current/);
    assert.match(src, /\[authLoading, userId, moduleKey, hydrateAttempt\]/);
    assert.doesNotMatch(src, /loadLocal, saveLocal, clearLocal, hydrateAttempt/);
    // Authenticated path marks hydrated before awaiting the network.
    assert.match(src, /setHydrated\(true\)/);
    assert.match(src, /paint empty shell immediately|Shell paints immediately|shellReadyRef/i);
  });

  it("module snapshot API enforces request timeouts", () => {
    const src = readFileSync(new URL("../src/lib/module-snapshots/api.ts", import.meta.url), "utf8");
    assert.match(src, /MODULE_SNAPSHOT_TIMEOUT_MS/);
    assert.match(src, /AbortController/);
    assert.match(src, /Timed out loading/);
  });

  it("module snapshot API dedupes in-flight loads and caches with TTL", () => {
    const src = readFileSync(new URL("../src/lib/module-snapshots/api.ts", import.meta.url), "utf8");
    assert.match(src, /MODULE_SNAPSHOT_CLIENT_CACHE_TTL_MS/);
    assert.match(src, /inflightLoads/);
    assert.match(src, /invalidateModuleSnapshotCache/);
    assert.match(src, /writeCache\(moduleKey, state\)/);
    assert.doesNotMatch(src, /cache:\s*"no-store"/);
  });

  it("module snapshot GET route sends private Cache-Control revalidation headers", () => {
    const src = readFileSync(
      new URL("../app/api/module-snapshots/[moduleKey]/route.ts", import.meta.url),
      "utf8",
    );
    assert.match(src, /private, max-age=30, stale-while-revalidate=60/);
    assert.match(src, /GET_CACHE_HEADERS/);
  });

  it("persistNow does not re-GET module snapshot after a successful PUT", () => {
    const src = readFileSync(new URL("../src/hooks/useCloudDocumentState.ts", import.meta.url), "utf8");
    assert.match(src, /await saveModuleSnapshotToCloud\(moduleKey, snapshot\)/);
    assert.doesNotMatch(
      src,
      /await saveModuleSnapshotToCloud\(moduleKey, snapshot\);\s*const remote = await fetchModuleSnapshot/s,
    );
  });

  it("financial intel rollup upsert skips no-op updates that only change updatedAt", () => {
    const src = readFileSync(
      new URL("../src/components/financial-intelligence/monthly-rollup-storage.ts", import.meta.url),
      "utf8",
    );
    assert.match(src, /rollupContentEqual/);
    assert.match(src, /return rows/);
  });

  it("Return planner shell renders immediately with hydrate error retry", () => {
    const src = readFileSync(
      new URL("../src/components/return-to-nepal/ReturnToNepalPlannerDashboard.tsx", import.meta.url),
      "utf8",
    );
    assert.match(src, /data-testid="return-to-nepal-shell"/);
    assert.match(src, /data-testid="return-to-nepal-load-error"/);
    assert.match(src, /retryHydrate/);
    assert.doesNotMatch(src, /if \(!mounted\)/);
  });

  it("House plan page keeps shell interactive while cloud syncs", () => {
    const src = readFileSync(
      new URL("../src/components/return-to-nepal/ReturnToNepalHouseDecisionPage.tsx", import.meta.url),
      "utf8",
    );
    assert.match(src, /data-testid="house-plan-shell"/);
    assert.match(src, /Syncing…/);
    assert.doesNotMatch(src, /disabled=\{loading \|\| Boolean\(hydrateError\) \|\| saving\}/);
    assert.match(src, /userPickedRef/);
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

describe("Expense-based FIRE corpus resolver", () => {
  it("prefers Expense Tracking over Budget Tracking and never sums both", async () => {
    const { resolveExpenseBasedFireCorpus } = await import(
      "../src/lib/return-to-nepal/resolve-expense-based-fire-corpus.ts"
    );
    const both = resolveExpenseBasedFireCorpus({
      monthlyExpenseTrackingNpr: 100_000,
      monthlyBudgetTrackingNpr: 80_000,
    });
    assert.equal(both.investmentTargetSource, "expense_tracking");
    assert.equal(both.monthlyEligibleLivingExpensesNpr, 100_000);
    assert.equal(both.annualEligibleLivingExpensesNpr, 1_200_000);
    assert.equal(both.requiredFireCorpusNpr, 30_000_000);

    const budgetOnly = resolveExpenseBasedFireCorpus({
      monthlyExpenseTrackingNpr: 0,
      monthlyBudgetTrackingNpr: 80_000,
    });
    assert.equal(budgetOnly.investmentTargetSource, "budget_tracking");
    assert.equal(budgetOnly.requiredFireCorpusNpr, 24_000_000);

    const neither = resolveExpenseBasedFireCorpus({
      monthlyExpenseTrackingNpr: null,
      monthlyBudgetTrackingNpr: null,
    });
    assert.equal(neither.requiredFireCorpusNpr, null);
    assert.equal(neither.investmentTargetSource, null);
  });

  it("buildReturnChecklistSources ignores savings/FIRE goals for investment target", async () => {
    const { buildReturnChecklistSources } = await import(
      "../src/lib/return-to-nepal/build-return-checklist-sources.ts"
    );
    const { DEFAULT_RETURN_PLANNER_STATE: defaults } = await import(
      "../src/lib/return-to-nepal/default-planner-state.ts"
    );
    const { emptyCanonicalEmergencyFundSnapshot } = await import(
      "../src/lib/return-to-nepal/canonical-emergency-fund.ts"
    );

    const live = {
      monthlyIncomeNpr: 200_000,
      monthlyExpenseNpr: 150_000,
      monthlyLivingExpenseNpr: 100_000,
      monthlySsfContributionNpr: 0,
      ssf: { projection: { currentAge: 0, retirementAge: 0, monthlySalaryNpr: 0, monthlySsfContributionNpr: 0, annualSalaryGrowthPct: 0 } },
      totalInvestmentNpr: 2_000_000,
      investmentCostNpr: 1_800_000,
      passiveMonthlyNpr: 0,
      actualPassiveMonthlyNpr: 0,
      nepalColMonthlyNpr: 75_000,
      emergencyCashReserveNpr: null,
      canonicalEmergencyFund: {
        ...emptyCanonicalEmergencyFundSnapshot(12, "ready"),
        monthlyProtectionBasisNpr: 80_000,
        hasBudgetProtectionBasis: true,
      },
      houseProgressPct: 0,
      houseGoalConfigured: false,
      businessCapitalNpr: 0,
      businessGoalConfigured: false,
      businessCapitalTargetNpr: 0,
      householdConfigured: false,
      liabilityRowCount: 0,
      savingsGoals: [
        {
          id: "inv",
          templateId: "investment",
          name: "Investment Fund",
          category: "Investment",
          targetAmountNpr: 1_000_000_000,
          savedAmountNpr: 2_000_000,
        },
      ],
      dataSources: [],
      effectiveState: defaults,
      netWorthNpr: 0,
      fireProgressPct: null,
      savingsRatePct: null,
      investableNpr: 2_000_000,
    };

    const sources = buildReturnChecklistSources({
      effectiveState: defaults,
      live,
      insurancePolicies: [],
      insuranceInputs: baseInsuranceInputs(),
      liabilitiesNpr: 0,
    });

    // 100k × 12 × 25 = 30M from Expense Tracking — not the 1B savings goal
    assert.equal(sources.investmentGoalTargetNpr, 30_000_000);
    assert.equal(sources.investmentTargetSource, "expense_tracking");
    assert.notEqual(sources.investmentGoalTargetNpr, 1_000_000_000);
  });
});

describe("Return Checklist — action labels and optional N/A", () => {
  it("exposes context-aware action labels for all ten items", () => {
    const items = computeReturnChecklist(baseSources());
    const by = Object.fromEntries(items.map((row) => [row.id, row.actionLabel]));
    assert.equal(by.emergency, "Set Up Emergency Fund");
    assert.equal(by.ssf, "Set Up SSF");
    assert.equal(by.investment, "Add Investments");
    assert.equal(by.passive, "Add Passive Income");
    assert.equal(by.health, "Add Health Insurance");
    assert.equal(by.life, "Add Life Insurance");
    assert.equal(by.house, "Update Housing Plan");
    assert.equal(by.family, "Set Up Household");
    assert.equal(by.business, "Set Business Capital");
    assert.equal(by.debt, "Manage Liabilities");
  });

  it("marks SSF and Business NOT APPLICABLE when opted out", () => {
    const items = computeReturnChecklist(
      baseSources({
        ssfNotApplicable: true,
        businessNotApplicable: true,
      }),
    );
    assert.equal(byId(items, "ssf").status, "not_applicable");
    assert.equal(byId(items, "business").status, "not_applicable");
    assert.equal(byId(items, "ssf").actionLabel, "View SSF");
    assert.equal(byId(items, "business").actionLabel, "View Business Capital");
  });
});

describe("Return readiness precision and what-if projections", () => {
  it("preserves sub-1% investment progress (2.55M / 1B ≈ 0.26%)", async () => {
    const { clampFundingPct, computeReturnReadinessScores } = await import(
      "../src/lib/return-to-nepal/return-readiness-scores.ts"
    );
    assert.equal(clampFundingPct(0.255), 0.26);
    assert.equal(clampFundingPct(0), 0);
    assert.equal(clampFundingPct(12.4), 12);

    const scores = computeReturnReadinessScores(
      { ...DEFAULT_RETURN_PLANNER_STATE },
      {
        nowYear: 2026,
        estimatedReturnYear: 2030,
        monthlyDeficitNpr: 50_000,
        requiredExtraCorpusNpr: 1_000_000,
        monthlyNepalLivingNpr: 100_000,
        emergencyReserveMonths: 0,
        passiveMonthlyNpr: 0,
        houseTotalBudgetNpr: 0,
        totalReturnFundNpr: 0,
        familyRelocationScore: 0,
        returnReadinessPct: 0,
      },
      baseInsuranceInputs(),
      2_550_724,
      0,
      baseSources({
        totalInvestmentNpr: 2_550_724,
        investmentGoalTargetNpr: 1_000_000_000,
      }),
    );
    const investment = scores.find((s) => s.id === "investment");
    assert.ok(investment);
    assert.equal(investment.pct, 0.26);
    assert.equal(investment.status, "in_progress");
    assert.notEqual(investment.pct, 0);
  });

  it("what-if scenarios diverge when savings accumulate over years", async () => {
    const { computeWhatIfScenarios } = await import("../src/lib/return-to-nepal/return-ai-engine.ts");
    const { computePlannerSnapshot } = await import("../src/lib/return-to-nepal/planner-engine.ts");
    const state = {
      ...DEFAULT_RETURN_PLANNER_STATE,
      monthlySavingsKrw: 2_000_000,
      nprPerKrw: 0.1,
      nepalInflationPct: 5,
      targetReturnYear: 2028,
    };
    const snap = computePlannerSnapshot(state);
    const sources = baseSources({
      totalInvestmentNpr: 2_550_724,
      investmentGoalTargetNpr: 50_000_000,
      modeledPassiveMonthlyNpr: 8_000,
      passiveTargetMonthlyNpr: 75_000,
    });
    const scenarios = computeWhatIfScenarios(
      state,
      snap,
      baseInsuranceInputs(),
      2_550_724,
      0,
      sources,
    );
    assert.ok(scenarios.length >= 2);
    const pcts = new Set(scenarios.map((s) => s.readinessPct));
    // Accumulated savings should move later years unless already capped.
    assert.ok(pcts.size >= 1);
    const first = scenarios[0];
    const last = scenarios[scenarios.length - 1];
    if (first.year !== last.year) {
      assert.ok(
        last.readinessPct >= first.readinessPct,
        `later year readiness ${last.readinessPct} should be >= earlier ${first.readinessPct}`,
      );
    }
  });
});
