import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { CASHFLOW_FIRE_GOALS_MARKER } from "@/services/cashflow-supabase";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { getSupabaseAnonKey, getSupabaseUrl, isSupabaseConfigured } from "@/lib/supabase/config";
import { ensureAllFinanceSotSchema, getFinanceSotMeta } from "@/services/ensure-finance-sot-schema";
import { fireGoalsMarkerForModule } from "@/services/module-snapshots-supabase";
import { SAVINGS_FIRE_GOALS_MARKER } from "@/services/savings-supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PROBE_TABLES = [
  "cashflow_snapshots",
  "finance_savings_workspace",
  "finance_insurance_policies",
  "user_module_snapshots",
  "finance_budget_records",
  "group_members",
  "group_expenses",
  "bank_accounts",
  "investments",
  "gold_assets",
  "real_estate",
  "fire_goals",
] as const;

type ModuleCheck = {
  putStatus: number;
  getStatus: number;
  putOk: boolean;
  getOk: boolean;
  via: "preferred" | "fire_goals" | "unknown";
  preferredRowPresent: boolean;
  fireGoalsFallbackRowPresent: boolean;
  error?: string;
};

/**
 * Apply + probe finance source-of-truth schema on production.
 * Pass ?httpVerify=1 to create a temp user and exercise cashflow / savings /
 * user_module_snapshots GET+PUT, confirm preferred tables (not fire_goals),
 * and check RLS isolation between two users.
 */
export async function GET(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: "Supabase is not configured", meta: getFinanceSotMeta() }, { status: 503 });
  }

  const wantHttpVerify = new URL(req.url).searchParams.get("httpVerify") === "1";
  const ensure = await ensureAllFinanceSotSchema();
  const admin = createSupabaseServiceRoleClient();
  const probes: Record<string, { exists: boolean; error: string | null }> = {};

  if (admin) {
    if (ensure.ok) await new Promise((r) => setTimeout(r, 1500));
    for (const table of PROBE_TABLES) {
      const { error } = await admin.from(table).select("*").limit(1);
      if (!error) {
        probes[table] = { exists: true, error: null };
      } else {
        const msg = `${error.code ?? "error"}: ${error.message}`;
        const missing =
          error.code === "PGRST205" ||
          /does not exist|schema cache|could not find the table/i.test(error.message);
        probes[table] = { exists: !missing, error: msg };
      }
    }
  }

  const required = [
    "cashflow_snapshots",
    "finance_savings_workspace",
    "finance_insurance_policies",
    "user_module_snapshots",
    "finance_budget_records",
  ] as const;
  const missingRequired = required.filter((t) => probes[t] && !probes[t].exists);

  let httpVerify: Awaited<ReturnType<typeof runHttpVerify>> | null = null;
  if (wantHttpVerify) {
    if (!admin) {
      httpVerify = {
        ok: false,
        error: "SUPABASE_SERVICE_ROLE_KEY missing",
        tables: null,
        rls: null,
        cashflow: null,
        savings: null,
        modules: null,
        noFireGoalsFallback: false,
        browsers: null,
        browsersIdentical: false,
      };
    } else {
      httpVerify = await runHttpVerify(req, admin);
    }
  }

  const tablesOk = missingRequired.length === 0;
  const verifyOk = wantHttpVerify ? Boolean(httpVerify?.ok) : tablesOk;

  return NextResponse.json({
    ok: tablesOk && (!wantHttpVerify || verifyOk),
    ensure,
    probes,
    missingRequired,
    httpVerify,
    meta: getFinanceSotMeta(),
    note:
      missingRequired.length === 0
        ? "Required finance SoT tables are visible to PostgREST."
        : "Set SUPABASE_DB_URL (or SUPABASE_ACCESS_TOKEN) on Vercel Production, redeploy, then re-hit this endpoint.",
  });
}

async function runHttpVerify(
  req: Request,
  admin: NonNullable<ReturnType<typeof createSupabaseServiceRoleClient>>,
) {
  const stamp = Date.now();
  const emailA = `finance-sot-a-${stamp}@firenepal.test`;
  const emailB = `finance-sot-b-${stamp}@firenepal.test`;
  const password = "FinanceSotVerify!23456";
  let userA: string | null = null;
  let userB: string | null = null;
  const origin = new URL(req.url).origin;

  try {
    const createdA = await admin.auth.admin.createUser({
      email: emailA,
      password,
      email_confirm: true,
    });
    if (createdA.error || !createdA.data.user?.id) {
      return fail(`createUser A failed: ${createdA.error?.message ?? "unknown"}`);
    }
    userA = createdA.data.user.id;

    const createdB = await admin.auth.admin.createUser({
      email: emailB,
      password,
      email_confirm: true,
    });
    if (createdB.error || !createdB.data.user?.id) {
      return fail(`createUser B failed: ${createdB.error?.message ?? "unknown"}`);
    }
    userB = createdB.data.user.id;

    const anon = getSupabaseAnonKey();
    const url = getSupabaseUrl();
    const clientA = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
    const clientB = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });

    const signA = await clientA.auth.signInWithPassword({ email: emailA, password });
    const signB = await clientB.auth.signInWithPassword({ email: emailB, password });
    if (!signA.data.session?.access_token) {
      return fail(`signIn A failed: ${signA.error?.message ?? "no session"}`);
    }
    if (!signB.data.session?.access_token) {
      return fail(`signIn B failed: ${signB.error?.message ?? "no session"}`);
    }
    const tokenA = signA.data.session.access_token;
    const tokenB = signB.data.session.access_token;

    const cashflowState = {
      income: {},
      incomeEntries: [
        {
          id: `verify-income-${stamp}`,
          name: "SoT Verify Salary",
          amount: 250000,
          incomeType: "salary",
          frequency: "monthly",
          date: "2026-08-01",
          createdAt: "2026-08-01T00:00:00.000Z",
        },
      ],
      expenses: { rent: 40000 },
      emergencyCashReserve: 99000,
    };
    const savingsState = {
      version: 1,
      goals: [
        {
          id: `goal-${stamp}`,
          name: "SoT Verify Goal",
          targetAmountNpr: 1000000,
          savedAmountNpr: 750000,
          monthlyContributionNpr: 25000,
          status: "active",
          sortOrder: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      transactions: [],
      balanceHidden: false,
    };
    const moduleState = {
      version: 1,
      lentMoney: 333333,
      borrowedMoney: 0,
      interestIncome: 0,
      profiles: [],
      documents: [],
    };

    const cashflow = await exerciseEndpoint({
      origin,
      token: tokenA,
      path: "/api/cashflow",
      state: cashflowState,
      assertGet: (json) => {
        const entries = json?.snapshot?.state?.incomeEntries ?? [];
        return entries.some((e: { id?: string; amount?: number }) => e.id === `verify-income-${stamp}` && Number(e.amount) === 250000);
      },
      checkPreferred: async () => {
        const pref = await admin.from("cashflow_snapshots").select("user_id").eq("user_id", userA!).maybeSingle();
        const fb = await admin
          .from("fire_goals")
          .select("id")
          .eq("user_id", userA!)
          .eq("notes", CASHFLOW_FIRE_GOALS_MARKER)
          .limit(1);
        return {
          preferredRowPresent: Boolean(pref.data && !pref.error),
          fireGoalsFallbackRowPresent: Boolean(fb.data && fb.data.length > 0 && !fb.error),
        };
      },
    });

    const savings = await exerciseEndpoint({
      origin,
      token: tokenA,
      path: "/api/savings",
      state: savingsState,
      assertGet: (json) => {
        const goals = json?.snapshot?.state?.goals ?? [];
        return goals.some((g: { id?: string; savedAmountNpr?: number }) => g.id === `goal-${stamp}` && Number(g.savedAmountNpr) === 750000);
      },
      checkPreferred: async () => {
        const pref = await admin.from("finance_savings_workspace").select("user_id").eq("user_id", userA!).maybeSingle();
        const fb = await admin
          .from("fire_goals")
          .select("id")
          .eq("user_id", userA!)
          .eq("notes", SAVINGS_FIRE_GOALS_MARKER)
          .limit(1);
        return {
          preferredRowPresent: Boolean(pref.data && !pref.error),
          fireGoalsFallbackRowPresent: Boolean(fb.data && fb.data.length > 0 && !fb.error),
        };
      },
    });

    const modules = await exerciseEndpoint({
      origin,
      token: tokenA,
      path: "/api/module-snapshots/smart_loan",
      state: moduleState,
      assertGet: (json) => Number(json?.snapshot?.state?.lentMoney ?? 0) === 333333,
      checkPreferred: async () => {
        const pref = await admin
          .from("user_module_snapshots")
          .select("user_id, module_key")
          .eq("user_id", userA!)
          .eq("module_key", "smart_loan")
          .maybeSingle();
        const fb = await admin
          .from("fire_goals")
          .select("id")
          .eq("user_id", userA!)
          .eq("notes", fireGoalsMarkerForModule("smart_loan"))
          .limit(1);
        return {
          preferredRowPresent: Boolean(pref.data && !pref.error),
          fireGoalsFallbackRowPresent: Boolean(fb.data && fb.data.length > 0 && !fb.error),
        };
      },
    });

    // RLS isolation: user B must not read user A's preferred rows via authenticated client.
    const rlsCash = await clientB.from("cashflow_snapshots").select("user_id").eq("user_id", userA!).maybeSingle();
    const rlsSav = await clientB.from("finance_savings_workspace").select("user_id").eq("user_id", userA!).maybeSingle();
    const rlsMod = await clientB
      .from("user_module_snapshots")
      .select("user_id")
      .eq("user_id", userA!)
      .eq("module_key", "smart_loan")
      .maybeSingle();

    const rls = {
      cashflowIsolated: !rlsCash.data,
      savingsIsolated: !rlsSav.data,
      modulesIsolated: !rlsMod.data,
      details: {
        cashflow: rlsCash.error?.message ?? (rlsCash.data ? "leaked" : "blocked"),
        savings: rlsSav.error?.message ?? (rlsSav.data ? "leaked" : "blocked"),
        modules: rlsMod.error?.message ?? (rlsMod.data ? "leaked" : "blocked"),
      },
    };

    // Cross-browser simulation: same Bearer session read from 5 user-agent profiles
    // (API SoT — all real browsers hydrate from these same endpoints).
    const browserAgents = [
      { name: "chrome", ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36" },
      { name: "safari", ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15" },
      { name: "firefox", ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14.5; rv:127.0) Gecko/20100101 Firefox/127.0" },
      { name: "edge", ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0" },
      { name: "mobile", ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1" },
    ];

    const browsers: Record<string, { cashflowOk: boolean; savingsOk: boolean; modulesOk: boolean; income: number; savings: number; lent: number }> = {};
    for (const agent of browserAgents) {
      const [cRes, sRes, mRes] = await Promise.all([
        fetch(`${origin}/api/cashflow`, {
          headers: { Authorization: `Bearer ${tokenA}`, "User-Agent": agent.ua },
          cache: "no-store",
        }).then(async (r) => ({ status: r.status, json: await r.json().catch(() => null) })),
        fetch(`${origin}/api/savings`, {
          headers: { Authorization: `Bearer ${tokenA}`, "User-Agent": agent.ua },
          cache: "no-store",
        }).then(async (r) => ({ status: r.status, json: await r.json().catch(() => null) })),
        fetch(`${origin}/api/module-snapshots/smart_loan`, {
          headers: { Authorization: `Bearer ${tokenA}`, "User-Agent": agent.ua },
          cache: "no-store",
        }).then(async (r) => ({ status: r.status, json: await r.json().catch(() => null) })),
      ]);
      const income = (cRes.json?.snapshot?.state?.incomeEntries ?? []).reduce(
        (sum: number, e: { amount?: number }) => sum + (Number(e.amount) || 0),
        0,
      );
      const savingsTotal = (sRes.json?.snapshot?.state?.goals ?? []).reduce(
        (sum: number, g: { savedAmountNpr?: number }) => sum + (Number(g.savedAmountNpr) || 0),
        0,
      );
      const lent = Number(mRes.json?.snapshot?.state?.lentMoney ?? 0);
      browsers[agent.name] = {
        cashflowOk: cRes.status === 200 && cRes.json?.ok === true && income === 250000,
        savingsOk: sRes.status === 200 && sRes.json?.ok === true && savingsTotal === 750000,
        modulesOk: mRes.status === 200 && mRes.json?.ok === true && lent === 333333,
        income,
        savings: savingsTotal,
        lent,
      };
    }

    const noFireGoalsFallback =
      cashflow.via === "preferred" &&
      savings.via === "preferred" &&
      modules.via === "preferred" &&
      !cashflow.fireGoalsFallbackRowPresent &&
      !savings.fireGoalsFallbackRowPresent &&
      !modules.fireGoalsFallbackRowPresent;

    const browsersIdentical = Object.values(browsers).every(
      (b) => b.cashflowOk && b.savingsOk && b.modulesOk && b.income === 250000 && b.savings === 750000 && b.lent === 333333,
    );

    const ok =
      cashflow.putOk &&
      cashflow.getOk &&
      cashflow.via === "preferred" &&
      savings.putOk &&
      savings.getOk &&
      savings.via === "preferred" &&
      modules.putOk &&
      modules.getOk &&
      modules.via === "preferred" &&
      rls.cashflowIsolated &&
      rls.savingsIsolated &&
      rls.modulesIsolated &&
      noFireGoalsFallback &&
      browsersIdentical;

    return {
      ok,
      error: ok ? undefined : "One or more finance SoT checks failed",
      tables: {
        cashflow_snapshots: true,
        finance_savings_workspace: true,
        user_module_snapshots: true,
      },
      rls,
      cashflow,
      savings,
      modules,
      noFireGoalsFallback,
      browsers,
      browsersIdentical,
    };
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  } finally {
    if (userA) {
      try {
        await admin.from("cashflow_snapshots").delete().eq("user_id", userA);
      } catch {
        /* ignore */
      }
      try {
        await admin.from("finance_savings_workspace").delete().eq("user_id", userA);
      } catch {
        /* ignore */
      }
      try {
        await admin.from("user_module_snapshots").delete().eq("user_id", userA);
      } catch {
        /* ignore */
      }
      try {
        await admin.from("fire_goals").delete().eq("user_id", userA);
      } catch {
        /* ignore */
      }
      try {
        await admin.auth.admin.deleteUser(userA);
      } catch {
        /* ignore */
      }
    }
    if (userB) {
      try {
        await admin.auth.admin.deleteUser(userB);
      } catch {
        /* ignore */
      }
    }
  }
}

function fail(error: string) {
  return {
    ok: false,
    error,
    tables: null,
    rls: null,
    cashflow: null,
    savings: null,
    modules: null,
    noFireGoalsFallback: false,
    browsers: null,
    browsersIdentical: false,
  };
}

async function exerciseEndpoint(args: {
  origin: string;
  token: string;
  path: string;
  state: unknown;
  assertGet: (json: any) => boolean;
  checkPreferred: () => Promise<{ preferredRowPresent: boolean; fireGoalsFallbackRowPresent: boolean }>;
}): Promise<ModuleCheck> {
  const putRes = await fetch(`${args.origin}${args.path}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${args.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ state: args.state }),
  });
  const putJson = await putRes.json().catch(() => null);

  const getRes = await fetch(`${args.origin}${args.path}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${args.token}` },
    cache: "no-store",
  });
  const getJson = await getRes.json().catch(() => null);

  const storage = await args.checkPreferred();
  const putOk = putRes.status === 200 && putJson?.ok === true;
  const getOk = getRes.status === 200 && getJson?.ok === true && args.assertGet(getJson);
  const via: ModuleCheck["via"] = storage.preferredRowPresent
    ? "preferred"
    : storage.fireGoalsFallbackRowPresent
      ? "fire_goals"
      : "unknown";

  return {
    putStatus: putRes.status,
    getStatus: getRes.status,
    putOk,
    getOk,
    via,
    preferredRowPresent: storage.preferredRowPresent,
    fireGoalsFallbackRowPresent: storage.fireGoalsFallbackRowPresent,
    error: putOk && getOk ? undefined : putJson?.error || getJson?.error || "round-trip failed",
  };
}
