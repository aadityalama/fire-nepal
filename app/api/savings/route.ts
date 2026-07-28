import { NextResponse } from "next/server";
import { sanitizeSavingsWorkspaceState } from "@/lib/savings/savings-storage";
import { createMutationTimer, withApiRouteTiming } from "@/lib/mutation-perf";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { loadSavingsWorkspaceForUser, saveSavingsWorkspaceForUser } from "@/services/savings-supabase";

function bad(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}

async function getSavingsHandler() {
  if (!isSupabaseConfigured()) return bad("Supabase is not configured", 503);
  const timer = createMutationTimer("api:savings:get:handler");
  try {
    const sb = await timer.track("auth", () => createServerSupabaseClient());
    const { data } = await timer.track("auth", () => sb.auth.getUser());
    if (!data.user) return bad("Please sign in to view your savings workspace.", 401);

    const snapshot = await timer.track("database", () => loadSavingsWorkspaceForUser(sb, data.user.id));
    const response = timer.trackSync("serialization", () => NextResponse.json({ ok: true, snapshot }));
    timer.flush({ status: response.status });
    return response;
  } catch (e) {
    timer.flush({ error: e instanceof Error ? e.message : "unknown" });
    return bad(e instanceof Error ? e.message : "Could not load savings workspace.", 500);
  }
}

async function putSavingsHandler(req: Request) {
  if (!isSupabaseConfigured()) return bad("Supabase is not configured", 503);
  const timer = createMutationTimer("api:savings:put:handler");
  try {
    const sb = await timer.track("auth", () => createServerSupabaseClient());
    const { data } = await timer.track("auth", () => sb.auth.getUser());
    if (!data.user) return bad("Please sign in to save your savings workspace.", 401);

    const body = await timer.track("serialization", () => req.json());
    const state = timer.trackSync("serialization", () => sanitizeSavingsWorkspaceState((body as { state?: unknown })?.state));
    const snapshot = await timer.track("database", () => saveSavingsWorkspaceForUser(sb, data.user.id, state));
    const response = timer.trackSync("serialization", () => NextResponse.json({ ok: true, snapshot }));
    timer.flush({ status: response.status });
    return response;
  } catch (e) {
    timer.flush({ error: e instanceof Error ? e.message : "unknown" });
    return bad(e instanceof Error ? e.message : "Could not save savings workspace.", 500);
  }
}

export const GET = withApiRouteTiming("savings:GET", getSavingsHandler);
export const PUT = withApiRouteTiming("savings:PUT", putSavingsHandler);
