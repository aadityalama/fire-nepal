import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { getSupabaseAnonKey, getSupabaseUrl, isSupabaseConfigured } from "@/lib/supabase/config";
import {
  CASHFLOW_TABLE,
  ensureCashflowSnapshotsSchema,
  getCashflowSupabaseMeta,
} from "@/services/ensure-cashflow-schema";
import { CASHFLOW_FIRE_GOALS_MARKER } from "@/services/cashflow-supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type HttpVerifyResult = {
  ok: boolean;
  via: "cashflow_snapshots" | "fire_goals" | "unknown";
  getStatus?: number;
  putStatus?: number;
  getOk?: boolean;
  putOk?: boolean;
  error?: string;
};

/**
 * Public diagnostic + schema ensure for Cashflow.
 * Creates public.cashflow_snapshots if missing (requires SUPABASE_DB_URL or SUPABASE_ACCESS_TOKEN).
 * Until the table exists, /api/cashflow falls back to public.fire_goals.
 *
 * Pass ?httpVerify=1 to create a temporary user and exercise GET/PUT /api/cashflow with a Bearer token.
 */
export async function GET(req: Request) {
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
  const wantHttpVerify = new URL(req.url).searchParams.get("httpVerify") === "1";

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

  let httpVerify: HttpVerifyResult | null = null;
  if (wantHttpVerify && admin) {
    httpVerify = await runHttpVerify(req, admin, tableExists);
  } else if (wantHttpVerify) {
    httpVerify = { ok: false, via: "unknown", error: "SUPABASE_SERVICE_ROLE_KEY missing" };
  }

  return NextResponse.json({
    ok: tableExists || Boolean(httpVerify?.ok),
    ensure,
    tableExists,
    probeError,
    probeStatus,
    httpVerify,
    meta: {
      ...ensure.meta,
      hasAccessToken: Boolean((process.env.SUPABASE_ACCESS_TOKEN ?? "").trim()),
    },
    note:
      "Preferred table: public.cashflow_snapshots. Until present, /api/cashflow uses public.fire_goals as a compatible cloud fallback.",
  });
}

async function runHttpVerify(
  req: Request,
  admin: NonNullable<ReturnType<typeof createSupabaseServiceRoleClient>>,
  tableExists: boolean,
): Promise<HttpVerifyResult> {
  const testEmail = `cashflow-http-verify-${Date.now()}@firenepal.test`;
  const testPassword = "CashflowVerify!23456";
  let userId: string | null = null;

  try {
    const created = await admin.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
    });
    if (created.error || !created.data.user?.id) {
      return {
        ok: false,
        via: "unknown",
        error: `createUser failed: ${created.error?.message ?? "unknown"}`,
      };
    }
    userId = created.data.user.id;

    const userClient = createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const signedIn = await userClient.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });
    if (signedIn.error || !signedIn.data.session?.access_token) {
      return {
        ok: false,
        via: "unknown",
        error: `signIn failed: ${signedIn.error?.message ?? "no session"}`,
      };
    }

    const origin = new URL(req.url).origin;
    const token = signedIn.data.session.access_token;
    const sampleState = {
      income: { salary: 120000 },
      incomeEntries: [],
      expenses: { rent: 30000 },
      emergencyCashReserve: 75000,
    };

    const putRes = await fetch(`${origin}/api/cashflow`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ state: sampleState }),
    });
    const putJson = (await putRes.json().catch(() => null)) as { ok?: boolean; error?: string } | null;

    const getRes = await fetch(`${origin}/api/cashflow`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const getJson = (await getRes.json().catch(() => null)) as {
      ok?: boolean;
      snapshot?: { state?: { income?: { salary?: number } } } | null;
      error?: string;
    } | null;

    const putOk = putRes.status === 200 && putJson?.ok === true;
    const getOk =
      getRes.status === 200 &&
      getJson?.ok === true &&
      Number(getJson?.snapshot?.state?.income?.salary ?? 0) === 120000;

    return {
      ok: putOk && getOk,
      via: tableExists ? "cashflow_snapshots" : "fire_goals",
      getStatus: getRes.status,
      putStatus: putRes.status,
      getOk,
      putOk,
      error: putOk && getOk ? undefined : putJson?.error || getJson?.error || "GET/PUT verify failed",
    };
  } catch (error) {
    return {
      ok: false,
      via: "unknown",
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    if (userId) {
      try {
        if (tableExists) {
          await admin.from(CASHFLOW_TABLE).delete().eq("user_id", userId);
        } else {
          await admin.from("fire_goals").delete().eq("user_id", userId).eq("notes", CASHFLOW_FIRE_GOALS_MARKER);
        }
      } catch {
        /* ignore cleanup errors */
      }
      try {
        await admin.auth.admin.deleteUser(userId);
      } catch {
        /* ignore */
      }
    }
  }
}
