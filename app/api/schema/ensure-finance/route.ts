import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { ensureAllFinanceSotSchema, getFinanceSotMeta } from "@/services/ensure-finance-sot-schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

/**
 * Apply + probe finance source-of-truth schema on production.
 * Optional auth: Authorization: Bearer ${CRON_SECRET} when CRON_SECRET is set.
 */
export async function GET(req: Request) {
  const cronSecret = (process.env.CRON_SECRET ?? "").trim();
  if (cronSecret) {
    const auth = req.headers.get("authorization") ?? "";
    const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
    if (token !== cronSecret) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: "Supabase is not configured", meta: getFinanceSotMeta() }, { status: 503 });
  }

  const ensure = await ensureAllFinanceSotSchema();
  const admin = createSupabaseServiceRoleClient();
  const probes: Record<string, { exists: boolean; error: string | null }> = {};

  if (admin) {
    // Give PostgREST a moment after notify reload.
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

  return NextResponse.json({
    ok: ensure.ok && missingRequired.length === 0,
    ensure,
    probes,
    missingRequired,
    meta: getFinanceSotMeta(),
    note:
      missingRequired.length === 0
        ? "Required finance SoT tables are visible to PostgREST."
        : "Set SUPABASE_DB_URL (or SUPABASE_ACCESS_TOKEN) on Vercel Production, redeploy, then re-hit this endpoint.",
  });
}
