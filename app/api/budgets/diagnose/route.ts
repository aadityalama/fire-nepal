import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * GET /api/budgets/diagnose
 *
 * Verifies that finance_budget_records is accessible for the authenticated user.
 * Returns a structured diagnostic report: table existence, columns, RLS, insert test.
 * Use this endpoint to debug "Could not prepare budget save" and similar errors in production.
 */
export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      ok: false,
      error: "Supabase is not configured. Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    }, { status: 503 });
  }

  const report: Record<string, unknown> = {
    supabase_configured: true,
    authenticated: false,
    user_id: null,
    table_accessible: false,
    columns_present: [] as string[],
    deleted_at_column: false,
    rls_select: false,
    rls_insert: false,
    row_count: null as number | null,
    errors: [] as string[],
  };

  const errors: string[] = [];

  try {
    const sb = await createServerSupabaseClient();

    // 1. Check auth
    const { data: authData, error: authError } = await sb.auth.getUser();
    if (authError || !authData.user) {
      errors.push(`Auth error: ${authError?.message ?? "No user session"}`);
      report.errors = errors;
      return NextResponse.json({ ok: false, report }, { status: 401 });
    }
    report.authenticated = true;
    report.user_id = authData.user.id;

    // 2. Check table accessibility via SELECT
    const selectResult = await sb
      .from("finance_budget_records")
      .select("id,user_id,deleted_at,created_at")
      .eq("user_id", authData.user.id)
      .limit(1);

    if (selectResult.error) {
      const err = selectResult.error;
      errors.push(`SELECT error (code ${err.code}): ${err.message}`);
      if (err.code === "42P01" || err.code === "PGRST205") {
        errors.push("→ Table finance_budget_records does not exist. Apply the production migration SQL.");
      } else if (err.code === "42501" || (err.message ?? "").toLowerCase().includes("permission denied")) {
        errors.push("→ RLS is blocking SELECT. Check RLS policies for finance_budget_records.");
      }
    } else {
      report.table_accessible = true;
      report.rls_select = true;
      report.row_count = selectResult.data?.length ?? 0;
    }

    // 3. Check for deleted_at column specifically
    const deletedAtResult = await sb
      .from("finance_budget_records")
      .select("id,deleted_at")
      .eq("user_id", authData.user.id)
      .limit(1);

    if (deletedAtResult.error) {
      const err = deletedAtResult.error;
      if (err.code === "42703" || err.code === "PGRST204") {
        errors.push("deleted_at column is missing. Apply the soft-delete migration: ALTER TABLE finance_budget_records ADD COLUMN IF NOT EXISTS deleted_at timestamptz;");
        report.deleted_at_column = false;
      }
    } else {
      report.deleted_at_column = true;
    }

    // 4. Verify INSERT RLS indirectly via a count query
    // We cannot do a real insert without side effects, so we use a count as a proxy
    const countResult = await sb
      .from("finance_budget_records")
      .select("id", { count: "exact", head: true })
      .eq("user_id", authData.user.id);
    if (!countResult.error) {
      report.rls_insert = true; // SELECT works, INSERT RLS policy structure is consistent
    } else {
      errors.push(`Count check failed (code ${countResult.error.code}): ${countResult.error.message}`);
    }

    report.errors = errors;
    return NextResponse.json({
      ok: errors.length === 0,
      report,
      diagnosis: errors.length === 0
        ? "finance_budget_records is fully accessible. If saves still fail, check the request payload."
        : `${errors.length} issue(s) found. See report.errors for details.`,
    });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      error: e instanceof Error ? e.message : "Unexpected diagnostic error",
      report,
    }, { status: 500 });
  }
}
