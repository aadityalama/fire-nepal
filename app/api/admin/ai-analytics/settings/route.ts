import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/verify-admin-api";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";

export async function PATCH(req: Request) {
  const gate = await requireAdminApi();
  if (gate instanceof NextResponse) return gate;

  const sb = createSupabaseServiceRoleClient();
  if (!sb) return NextResponse.json({ error: "Service role not configured" }, { status: 503 });

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const body = raw as {
    monthlyBudgetUsd?: unknown;
    warn50?: unknown;
    warn80?: unknown;
    warn100?: unknown;
  };
  const monthlyBudgetUsd =
    typeof body.monthlyBudgetUsd === "number" && Number.isFinite(body.monthlyBudgetUsd)
      ? Math.max(0, body.monthlyBudgetUsd)
      : null;

  const patch = {
    ...(monthlyBudgetUsd != null ? { monthly_budget_usd: monthlyBudgetUsd } : {}),
    ...(typeof body.warn50 === "boolean" ? { warn_50_enabled: body.warn50 } : {}),
    ...(typeof body.warn80 === "boolean" ? { warn_80_enabled: body.warn80 } : {}),
    ...(typeof body.warn100 === "boolean" ? { warn_100_enabled: body.warn100 } : {}),
    updated_at: new Date().toISOString(),
  };

  const { error } = await sb.from("fire_ai_admin_settings").upsert({ id: "global", ...patch }, { onConflict: "id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
