import { NextResponse } from "next/server";
import { sanitizeCashflowState } from "@/components/cashflow/cashflow-storage";
import { createMutationTimer, withApiRouteTiming } from "@/lib/mutation-perf";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { loadCashflowFromSupabase, saveCashflowToSupabase } from "@/services/cashflow-supabase";

function bad(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}

async function getCashflowHandler() {
  if (!isSupabaseConfigured()) return bad("Supabase is not configured", 503);
  const timer = createMutationTimer("api:cashflow:get:handler");
  try {
    const sb = await timer.track("auth", () => createServerSupabaseClient());
    const { data } = await timer.track("auth", () => sb.auth.getUser());
    if (!data.user) return bad("Unauthorized", 401);

    const snapshot = await timer.track("database", () => loadCashflowFromSupabase(sb, data.user.id));
    const response = timer.trackSync("serialization", () => NextResponse.json({ ok: true, snapshot }));
    timer.flush({ status: response.status });
    return response;
  } catch (e) {
    timer.flush({ error: e instanceof Error ? e.message : "unknown" });
    return bad(e instanceof Error ? e.message : "Server error", 500);
  }
}

async function putCashflowHandler(req: Request) {
  if (!isSupabaseConfigured()) return bad("Supabase is not configured", 503);
  const timer = createMutationTimer("api:cashflow:put:handler");

  let raw: unknown;
  try {
    raw = await timer.track("serialization", () => req.json());
  } catch {
    return bad("Invalid JSON");
  }

  try {
    const sb = await timer.track("auth", () => createServerSupabaseClient());
    const { data } = await timer.track("auth", () => sb.auth.getUser());
    if (!data.user) return bad("Unauthorized", 401);

    const state = timer.trackSync("serialization", () => sanitizeCashflowState((raw as { state?: unknown })?.state));
    const result = await timer.track("database", () => saveCashflowToSupabase(sb, data.user.id, state));
    if (!result.ok) return bad(result.error, 500);
    const response = timer.trackSync("serialization", () => NextResponse.json({ ok: true, updatedAt: result.updatedAt }));
    timer.flush({ status: response.status });
    return response;
  } catch (e) {
    timer.flush({ error: e instanceof Error ? e.message : "unknown" });
    return bad(e instanceof Error ? e.message : "Server error", 500);
  }
}

export const GET = withApiRouteTiming("cashflow:GET", getCashflowHandler);
export const PUT = withApiRouteTiming("cashflow:PUT", putCashflowHandler);
