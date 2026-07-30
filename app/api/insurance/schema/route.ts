import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  ensureFinanceInsurancePoliciesSchema,
  getInsuranceSupabaseMeta,
  INSURANCE_TABLE,
} from "@/services/ensure-insurance-schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public diagnostic + schema ensure for Insurance.
 * Creates public.finance_insurance_policies if missing (requires SUPABASE_DB_URL on the server).
 */
export async function GET() {
  const meta = getInsuranceSupabaseMeta();
  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      ok: false,
      error: "Supabase is not configured",
      meta,
      tableExists: false,
    }, { status: 503 });
  }

  const ensure = await ensureFinanceInsurancePoliciesSchema();

  let tableExists = false;
  let probeError: string | null = null;
  let probeStatus: number | null = null;
  const admin = createSupabaseServiceRoleClient();
  if (admin) {
    const probe = await admin.from(INSURANCE_TABLE).select("id").limit(1);
    probeStatus = probe.error ? Number(probe.error.code === "PGRST205" ? 404 : 500) : 200;
    if (!probe.error) {
      tableExists = true;
    } else {
      probeError = `${probe.error.code ?? "error"}: ${probe.error.message}`;
      if (ensure.ok) {
        await new Promise((r) => setTimeout(r, 1200));
        const retry = await admin.from(INSURANCE_TABLE).select("id").limit(1);
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
      "Single production table: public.finance_insurance_policies. No duplicate insurance_* tables are used.",
  });
}
