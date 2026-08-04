import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  CASHFLOW_TABLE,
  ensureCashflowSnapshotsSchema,
  getCashflowSupabaseMeta,
} from "@/services/ensure-cashflow-schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public diagnostic + schema ensure for Cashflow.
 * Creates public.cashflow_snapshots if missing (requires SUPABASE_DB_URL or SUPABASE_ACCESS_TOKEN).
 * Until the table exists, /api/cashflow falls back to public.fire_goals.
 */
export async function GET() {
  const meta = getCashflowSupabaseMeta();
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error: "Supabase is not configured",
        meta,
        tableExists: false,
      },
      { status: 503 },
    );
  }

  const ensure = await ensureCashflowSnapshotsSchema();

  let tableExists = false;
  let probeError: string | null = null;
  let probeStatus: number | null = null;
  const admin = createSupabaseServiceRoleClient();
  if (admin) {
    const probe = await admin.from(CASHFLOW_TABLE).select("user_id").limit(1);
    probeStatus = probe.error ? Number(probe.error.code === "PGRST205" ? 404 : 500) : 200;
    if (!probe.error) {
      tableExists = true;
    } else {
      probeError = `${probe.error.code ?? "error"}: ${probe.error.message}`;
      if (ensure.ok) {
        await new Promise((r) => setTimeout(r, 1200));
        const retry = await admin.from(CASHFLOW_TABLE).select("user_id").limit(1);
        if (!retry.error) {
          tableExists = true;
          probeError = null;
          probeStatus = 200;
        } else {
          probeError = `${retry.error.code ?? "error"}: ${retry.error.message}`;
        }
      }
    }
  } else {
    probeError = "SUPABASE_SERVICE_ROLE_KEY missing — could not probe table via PostgREST.";
  }

  return NextResponse.json({
    ok: tableExists,
    ensure,
    tableExists,
    probeError,
    probeStatus,
    meta: {
      ...ensure.meta,
      hasAccessToken: Boolean((process.env.SUPABASE_ACCESS_TOKEN ?? "").trim()),
    },
    note:
      "Preferred table: public.cashflow_snapshots. Until present, /api/cashflow uses public.fire_goals as a compatible cloud fallback.",
  });
}
