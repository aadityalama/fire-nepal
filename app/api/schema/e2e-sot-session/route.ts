import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { MODULE_SNAPSHOT_KEYS, type ModuleSnapshotKey } from "@/lib/module-snapshots/keys";
import { tolaUiToGrams } from "@/lib/portfolio/nepal-metal-ui-convert";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { getSupabaseAnonKey, getSupabaseUrl, isSupabaseConfigured } from "@/lib/supabase/config";
import { CASHFLOW_FIRE_GOALS_MARKER } from "@/services/cashflow-supabase";
import { fireGoalsMarkerForModule } from "@/services/module-snapshots-supabase";
import { SAVINGS_FIRE_GOALS_MARKER } from "@/services/savings-supabase";
import { ensureAuthenticatedWorkspace } from "@/services/workspace-supabase";
import type { Database, Json } from "@/types/supabase-database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const E2E_EMAIL_RE = /^finance-e2e-.*@firenepal\.test$/;
const E2E_PASSWORD = "FinanceE2EVerify!23456";

const CLEANUP_TABLES = [
  "cashflow_snapshots",
  "finance_savings_workspace",
  "user_module_snapshots",
  "finance_budget_records",
  "finance_insurance_policies",
  "bank_accounts",
  "investments",
  "gold_assets",
  "real_estate",
  "vehicles",
  "liabilities",
  "retirement_assets",
  "portfolio_extensions",
  "expense_transactions",
  "group_expenses",
  "group_members",
  "settlements",
  "fire_goals",
  "sales",
  "customers",
  "business_profiles",
] as const;

const RETURN_CITIES = ["kathmandu", "pokhara", "chitwan", "dharan", "butwal", "village"] as const;

type AdminClient = NonNullable<ReturnType<typeof createSupabaseServiceRoleClient>>;

function bad(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

function stampUnit(stamp: number, salt: number, min: number, span: number): number {
  return min + ((stamp + salt * 9973) % span);
}

function reservedFireGoalsMarkers(): Set<string> {
  const markers = new Set<string>([CASHFLOW_FIRE_GOALS_MARKER, SAVINGS_FIRE_GOALS_MARKER]);
  for (const key of MODULE_SNAPSHOT_KEYS) {
    markers.add(fireGoalsMarkerForModule(key));
  }
  return markers;
}

function moduleStates(args: {
  stamp: number;
  smartLoanLent: number;
  nepalColSpend: number;
  returnCity: (typeof RETURN_CITIES)[number];
  familyMembersCount: number;
}): { states: Record<ModuleSnapshotKey, unknown>; modulesExpected: Record<string, unknown> } {
  const { stamp, smartLoanLent, nepalColSpend, returnCity, familyMembersCount } = args;
  const now = new Date().toISOString();

  const smartLoan = {
    version: 1,
    lentMoney: smartLoanLent,
    borrowedMoney: 0,
    interestIncome: 0,
    profiles: [],
    documents: [],
    stamp,
  };

  // nepal_col snapshot state is ColPlanState (see useColPlanState sanitize).
  const nepalCol = {
    cityId: "nepal-national-average",
    province: "Nepal",
    lifestyle: "comfortable" as const,
    family: { adults: 2, children: 1, parents: 0 },
    monthlyIncomeNpr: nepalColSpend * 2,
    monthlyKoreaSpendNpr: nepalColSpend,
    expenses: {
      home: Math.round(nepalColSpend * 0.35),
      food: Math.round(nepalColSpend * 0.25),
      transportation: Math.round(nepalColSpend * 0.1),
      utilities: Math.round(nepalColSpend * 0.08),
      internet: Math.round(nepalColSpend * 0.05),
      healthcare: Math.round(nepalColSpend * 0.05),
      education: Math.round(nepalColSpend * 0.05),
      entertainment: Math.round(nepalColSpend * 0.03),
      clothing: Math.round(nepalColSpend * 0.02),
      miscellaneous: Math.round(nepalColSpend * 0.02),
    },
  };

  const returnToNepal = {
    koreaSavingsKrw: stampUnit(stamp, 11, 10_000_000, 5_000_000),
    nepalLiquidNpr: stampUnit(stamp, 12, 500_000, 200_000),
    monthlySalaryKrw: stampUnit(stamp, 13, 3_000_000, 500_000),
    salaryGrowthPct: 3,
    monthlySavingsKrw: stampUnit(stamp, 14, 800_000, 200_000),
    koreaYearsWorked: 5,
    plannedKoreaYearsRemaining: 3,
    nprPerKrw: 0.1,
    nepalInflationPct: 5,
    targetReturnYear: 2030,
    adults: 2,
    children: 1,
    city: returnCity,
    lifestyle: "comfortable",
    landBudgetNpr: 0,
    constructionBudgetNpr: 0,
    interiorBudgetNpr: 0,
    furnitureBudgetNpr: 0,
    homeLoanPrincipalNpr: 0,
    homeLoanAprPct: 0,
    homeLoanYears: 0,
    houseProgressPct: 0,
    completedPhases: [],
    pensionMonthlyNpr: 0,
    dividendMonthlyNpr: 0,
    fdMonthlyNpr: 0,
    rentalMonthlyNpr: 0,
    swpMonthlyNpr: 0,
    severanceAutoCalculate: true,
    severanceOverrideKrw: 0,
    nationalPensionAutoCalculate: true,
    nationalPensionMaturityOverrideKrw: 0,
    settlementChecklist: [],
    stamp,
  };

  const familyHub = {
    stabilityScore: 70,
    upcomingBills: [],
    familyGoals: [],
    emergencyContacts: Array.from({ length: familyMembersCount }, (_, i) => ({
      id: `e2e-contact-${stamp}-${i}`,
      name: `E2E Member ${i + 1}`,
      relation: i === 0 ? "self" : "family",
      phone: `9800000${String(i).padStart(3, "0")}`,
    })),
    hubInsights: [],
    children: [],
    attendanceWeek: [],
    exam: { title: "", subject: "", examDate: now.slice(0, 10) },
    studyStreakDays: 0,
    activityMinutes: [],
    sleepQuality: { score: 0, deepHours: 0, bedTime: "", wakeTime: "", note: "" },
    homework: [],
    tuition: { term: "", paidNpr: 0, totalNpr: 0, nextInstallment: "" },
    gpa: { current: 0, target: 0, term: "" },
    subjects: [],
    educationFund: { monthlySipNpr: 0, yearsToUniversity: 0, projectedCorpusNpr: 0, gapNpr: 0 },
    medicineReminders: [],
    insurance: [],
    vaccinations: [],
    emergencyMedical: { bloodTypes: "", allergies: "", insurerCard: "" },
    calendarEvents: [],
    parentingNotes: [],
    parentingInsights: [],
    familyAlerts: [],
    behaviorInsights: [],
    smartRecommendations: [],
    feePaymentHistory: [],
    examResults: [],
    gpaHistory: [],
    subjectTrendPoints: [],
    vaultDocuments: [],
    vaultTimeline: [],
    documentReminders: [],
    vaultEducationInsights: [],
    schedulePeriods: [],
    examSchedule: [],
    teacherNotes: [],
    stamp,
    familyMembersCount,
  };

  const generic = (key: ModuleSnapshotKey, field: string, value: unknown) => ({
    version: 1,
    stamp,
    moduleKey: key,
    [field]: value,
  });

  const states: Record<ModuleSnapshotKey, unknown> = {
    smart_loan: smartLoan,
    nepal_col: nepalCol,
    return_to_nepal: returnToNepal,
    family_hub: familyHub,
    fire_lending: generic("fire_lending", "e2ePrincipal", stampUnit(stamp, 21, 100_000, 50_000)),
    ssf_pension: generic("ssf_pension", "e2eBalance", stampUnit(stamp, 22, 200_000, 80_000)),
    pension_slips: generic("pension_slips", "e2eSlipCount", stampUnit(stamp, 23, 1, 20)),
    payslip_history: generic("payslip_history", "e2eEntryCount", stampUnit(stamp, 24, 1, 30)),
    financial_intel_rollups: generic("financial_intel_rollups", "e2eNetWorth", stampUnit(stamp, 25, 1_000_000, 500_000)),
  };

  const modulesExpected: Record<string, unknown> = {
    smart_loan: smartLoanLent,
    nepal_col: nepalColSpend,
    return_to_nepal: returnCity,
    family_hub: familyMembersCount,
    fire_lending: (states.fire_lending as { e2ePrincipal: number }).e2ePrincipal,
    ssf_pension: (states.ssf_pension as { e2eBalance: number }).e2eBalance,
    pension_slips: (states.pension_slips as { e2eSlipCount: number }).e2eSlipCount,
    payslip_history: (states.payslip_history as { e2eEntryCount: number }).e2eEntryCount,
    financial_intel_rollups: (states.financial_intel_rollups as { e2eNetWorth: number }).e2eNetWorth,
  };

  return { states, modulesExpected };
}

async function bearerPut(origin: string, path: string, token: string, state: unknown) {
  const res = await fetch(`${origin}${path}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ state }),
    cache: "no-store",
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json, ok: res.status === 200 && json?.ok === true };
}

async function seedPhase(req: Request, admin: AdminClient) {
  const stamp = Date.now();
  const email = `finance-e2e-${stamp}@firenepal.test`;
  const password = E2E_PASSWORD;
  const origin = new URL(req.url).origin;

  const cashflowIncome = stampUnit(stamp, 1, 220_000, 70_000);
  const savingsSaved = stampUnit(stamp, 2, 310_000, 80_000);
  const budgetAmount = stampUnit(stamp, 3, 45_000, 40_000);
  const insuranceCoverage = stampUnit(stamp, 4, 1_200_000, 800_000);
  const smartLoanLent = stampUnit(stamp, 5, 330_000, 90_000);
  const nepalColSpend = stampUnit(stamp, 6, 75_000, 40_000);
  const returnCity = RETURN_CITIES[stamp % RETURN_CITIES.length]!;
  const familyMembersCount = 2 + (stamp % 3);
  const portfolioBankAmount = stampUnit(stamp, 7, 140_000, 90_000);
  const investmentQty = stampUnit(stamp, 8, 12, 80);
  const goldTola = 1 + (stamp % 5) + ((stamp % 100) / 100);
  const realEstateValue = stampUnit(stamp, 9, 4_500_000, 1_500_000);
  const expenseAmount = stampUnit(stamp, 10, 9_000, 12_000);
  const groupExpenseAmount = stampUnit(stamp, 15, 18_000, 20_000);
  const fireGoalTitle = `E2E FIRE Goal ${stamp}`;
  const businessName = `E2E Biz ${stamp}`;

  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (created.error || !created.data.user?.id) {
    return bad(`createUser failed: ${created.error?.message ?? "unknown"}`, 500);
  }
  const userId = created.data.user.id;

  try {
    const anon = getSupabaseAnonKey();
    const url = getSupabaseUrl();
    const userClient = createClient<Database>(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const signIn = await userClient.auth.signInWithPassword({ email, password });
    if (!signIn.data.session?.access_token) {
      throw new Error(`signIn failed: ${signIn.error?.message ?? "no session"}`);
    }
    const accessToken = signIn.data.session.access_token;

    const authed = createClient<Database>(url, anon, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const cashflowState = {
      income: {},
      incomeEntries: [
        {
          id: `e2e-income-${stamp}`,
          name: "E2E Salary",
          amount: cashflowIncome,
          incomeType: "salary",
          frequency: "monthly",
          date: "2026-08-01",
          createdAt: "2026-08-01T00:00:00.000Z",
        },
      ],
      expenses: { rent: 1 },
      emergencyCashReserve: 1,
    };
    const savingsState = {
      version: 1,
      goals: [
        {
          id: `e2e-goal-${stamp}`,
          name: "E2E Savings Goal",
          targetAmountNpr: savingsSaved * 2,
          savedAmountNpr: savingsSaved,
          monthlyContributionNpr: 5000,
          status: "active",
          sortOrder: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      transactions: [],
      balanceHidden: false,
    };

    const cashflowPut = await bearerPut(origin, "/api/cashflow", accessToken, cashflowState);
    if (!cashflowPut.ok) {
      throw new Error(`cashflow PUT failed: ${cashflowPut.json?.error ?? cashflowPut.status}`);
    }
    const savingsPut = await bearerPut(origin, "/api/savings", accessToken, savingsState);
    if (!savingsPut.ok) {
      throw new Error(`savings PUT failed: ${savingsPut.json?.error ?? savingsPut.status}`);
    }

    const { states: moduleStatesByKey, modulesExpected } = moduleStates({
      stamp,
      smartLoanLent,
      nepalColSpend,
      returnCity,
      familyMembersCount,
    });

    for (const key of MODULE_SNAPSHOT_KEYS) {
      const put = await bearerPut(origin, `/api/module-snapshots/${key}`, accessToken, moduleStatesByKey[key]);
      if (!put.ok) {
        // Prefer service-role upsert if Bearer path fails for any key.
        const { error } = await admin.from("user_module_snapshots").upsert(
          {
            user_id: userId,
            module_key: key,
            state: moduleStatesByKey[key] as Json,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,module_key" },
        );
        if (error) {
          throw new Error(`module snapshot ${key} failed: ${put.json?.error ?? put.status}; upsert: ${error.message}`);
        }
      }
    }

    // Budgets API is cookie-session oriented — seed via service role.
    const { error: budgetErr } = await admin.from("finance_budget_records").insert({
      user_id: userId,
      name: `E2E Budget ${stamp}`,
      category: "Living",
      icon: "💼",
      gradient: "from-emerald-300 to-lime-300",
      period: "Monthly",
      amount_npr: budgetAmount,
      monthly_budget_npr: budgetAmount,
      monthly_spent_npr: 0,
      days_remaining: 30,
      notes: `e2e-sot-${stamp}`,
      sort_order: 0,
    });
    if (budgetErr) {
      throw new Error(`budget insert failed: ${budgetErr.message}`);
    }

    const { error: insuranceErr } = await admin.from("finance_insurance_policies").insert({
      user_id: userId,
      insurance_type: "life",
      provider: `E2E Insurer ${stamp}`,
      coverage_amount_npr: insuranceCoverage,
      premium_npr: Math.round(insuranceCoverage / 100),
      payment_frequency: "yearly",
      policy_term_years: 20,
      notes: `e2e-sot-${stamp}`,
      sort_order: 0,
    });
    if (insuranceErr) {
      throw new Error(`insurance insert failed: ${insuranceErr.message}`);
    }

    const bankRowId = `e2e-bank-${stamp}`;
    const invRowId = `e2e-inv-${stamp}`;
    const goldRowId = `e2e-gold-${stamp}`;
    const reRowId = `e2e-re-${stamp}`;
    const goldGrams = Math.round(tolaUiToGrams(goldTola) * 100) / 100;

    const bankPayload = {
      id: bankRowId,
      name: `E2E Bank ${stamp}`,
      amount: portfolioBankAmount,
      currency: "NPR" as const,
    };
    const invPayload = {
      id: invRowId,
      kind: "nepse" as const,
      name: `E2E Stock ${stamp}`,
      quantity: investmentQty,
      buyPrice: 100,
      currency: "NPR" as const,
    };
    const goldPayload = {
      id: goldRowId,
      metal: "gold" as const,
      name: `E2E Gold ${stamp}`,
      grams: goldGrams,
    };
    const rePayload = {
      id: reRowId,
      propertyType: "apartment" as const,
      name: `E2E Flat ${stamp}`,
      purchaseValue: realEstateValue,
      estimatedValue: realEstateValue,
      currency: "NPR" as const,
    };

    const { error: bankErr } = await admin.from("bank_accounts").upsert(
      {
        user_id: userId,
        row_id: bankRowId,
        account_kind: "liquid",
        payload: bankPayload as unknown as Json,
      },
      { onConflict: "user_id,row_id" },
    );
    if (bankErr) throw new Error(`bank_accounts upsert failed: ${bankErr.message}`);

    const { error: invErr } = await admin.from("investments").upsert(
      {
        user_id: userId,
        row_id: invRowId,
        payload: invPayload as unknown as Json,
      },
      { onConflict: "user_id,row_id" },
    );
    if (invErr) throw new Error(`investments upsert failed: ${invErr.message}`);

    const { error: goldErr } = await admin.from("gold_assets").upsert(
      {
        user_id: userId,
        row_id: goldRowId,
        payload: goldPayload as unknown as Json,
      },
      { onConflict: "user_id,row_id" },
    );
    if (goldErr) throw new Error(`gold_assets upsert failed: ${goldErr.message}`);

    const { error: reErr } = await admin.from("real_estate").upsert(
      {
        user_id: userId,
        row_id: reRowId,
        payload: rePayload as unknown as Json,
      },
      { onConflict: "user_id,row_id" },
    );
    if (reErr) throw new Error(`real_estate upsert failed: ${reErr.message}`);

    const { error: extErr } = await admin.from("portfolio_extensions").upsert(
      {
        user_id: userId,
        ledger: [] as unknown as Json,
        net_worth_history: [] as unknown as Json,
        metal_purchase_bill_urls: [] as unknown as Json,
      },
      { onConflict: "user_id" },
    );
    if (extErr) throw new Error(`portfolio_extensions upsert failed: ${extErr.message}`);

    const workspace = await ensureAuthenticatedWorkspace(authed, userId, "e2e-sot-session");
    if (!workspace?.id) {
      throw new Error("Could not ensure authenticated workspace for expense seed");
    }

    const { error: expenseErr } = await admin.from("expense_transactions").insert({
      workspace_id: workspace.id,
      user_id: userId,
      transaction_type: "expense",
      description: `E2E Expense ${stamp}`,
      category: "food",
      amount: expenseAmount,
      currency: "NPR",
      transaction_date: new Date().toISOString().slice(0, 10),
      metadata: { stamp } as unknown as Json,
    });
    if (expenseErr) throw new Error(`expense_transactions insert failed: ${expenseErr.message}`);

    const memberInsert = await admin
      .from("group_members")
      .insert({
        workspace_id: workspace.id,
        user_id: userId,
        local_member_id: `e2e-member-${stamp}`,
        name: `E2E Member ${stamp}`,
        sort_order: 0,
      })
      .select("id")
      .single();
    if (memberInsert.error || !memberInsert.data?.id) {
      throw new Error(`group_members insert failed: ${memberInsert.error?.message ?? "no id"}`);
    }
    const memberId = memberInsert.data.id;

    const { error: groupExpErr } = await admin.from("group_expenses").insert({
      workspace_id: workspace.id,
      user_id: userId,
      title: `E2E Group Expense ${stamp}`,
      amount: groupExpenseAmount,
      payer_member_id: memberId,
      category: "food",
      split_equally: true,
      expense_date: new Date().toISOString().slice(0, 10),
      split_among: [memberId],
      amount_currency: "NPR",
      notes: `e2e-sot-${stamp}`,
    });
    if (groupExpErr) throw new Error(`group_expenses insert failed: ${groupExpErr.message}`);

    const markers = reservedFireGoalsMarkers();
    const goalNotes = `e2e-real-goal-${stamp}`;
    if (markers.has(goalNotes)) {
      throw new Error("Generated fire_goals notes collided with a reserved SoT marker");
    }
    const { error: goalErr } = await admin.from("fire_goals").insert({
      user_id: userId,
      title: fireGoalTitle,
      target_amount_npr: stampUnit(stamp, 16, 5_000_000, 2_000_000),
      notes: goalNotes,
      payload: { kind: "e2e_real_goal", stamp } as unknown as Json,
      updated_at: new Date().toISOString(),
    });
    if (goalErr) throw new Error(`fire_goals insert failed: ${goalErr.message}`);

    const { error: bizErr } = await admin.from("business_profiles").insert({
      user_id: userId,
      business_name: businessName,
      business_type: "retail",
      currency: "NPR",
      payload: { stamp } as unknown as Json,
    });
    if (bizErr) throw new Error(`business_profiles insert failed: ${bizErr.message}`);

    return NextResponse.json({
      ok: true,
      baseUrl: origin,
      email,
      password,
      accessToken,
      userId,
      stamp,
      expected: {
        cashflowIncome,
        savingsSaved,
        budgetAmount,
        insuranceCoverage,
        smartLoanLent,
        nepalColSpend,
        returnCity,
        familyMembersCount,
        portfolioBankAmount,
        investmentQty,
        goldTola,
        realEstateValue,
        expenseAmount,
        groupExpenseAmount,
        fireGoalTitle,
        businessName,
        modules: modulesExpected,
      },
    });
  } catch (error) {
    // Best-effort cleanup if seed fails mid-way.
    try {
      for (const table of CLEANUP_TABLES) {
        await admin.from(table).delete().eq("user_id", userId);
      }
      await admin.from("workspaces").delete().eq("user_id", userId);
      await admin.auth.admin.deleteUser(userId);
    } catch {
      /* ignore */
    }
    return bad(error instanceof Error ? error.message : String(error), 500);
  }
}

async function cleanupPhase(admin: AdminClient, userId: string) {
  if (!userId || !/^[0-9a-f-]{36}$/i.test(userId)) {
    return bad("Missing or invalid userId", 400);
  }

  const { data: userData, error: userErr } = await admin.auth.admin.getUserById(userId);
  if (userErr || !userData.user) {
    return bad(`User not found: ${userErr?.message ?? "unknown"}`, 404);
  }
  const email = userData.user.email ?? "";
  if (!E2E_EMAIL_RE.test(email)) {
    return bad("Refusing cleanup for non e2e user", 403);
  }

  for (const table of CLEANUP_TABLES) {
    try {
      await admin.from(table).delete().eq("user_id", userId);
    } catch {
      /* ignore missing tables */
    }
  }
  try {
    await admin.from("workspaces").delete().eq("user_id", userId);
  } catch {
    /* ignore */
  }

  const { error: delErr } = await admin.auth.admin.deleteUser(userId);
  if (delErr) {
    return bad(`deleteUser failed: ${delErr.message}`, 500);
  }

  return NextResponse.json({ ok: true });
}

/**
 * Production diagnostic: seed one authenticated finance e2e user across all
 * modules, return Playwright credentials, and support cleanup.
 *
 *   GET ?phase=seed (default)
 *   GET ?phase=cleanup&userId=<uuid>
 */
export async function GET(req: Request) {
  if (!isSupabaseConfigured()) {
    return bad("Supabase is not configured", 503);
  }

  const admin = createSupabaseServiceRoleClient();
  if (!admin) {
    return bad("SUPABASE_SERVICE_ROLE_KEY missing", 503);
  }

  const params = new URL(req.url).searchParams;
  const phase = (params.get("phase") ?? "seed").trim().toLowerCase();

  if (phase === "cleanup") {
    return cleanupPhase(admin, (params.get("userId") ?? "").trim());
  }

  if (phase !== "seed") {
    return bad("Unknown phase. Use phase=seed or phase=cleanup", 400);
  }

  return seedPhase(req, admin);
}
