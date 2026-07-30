import { NextResponse } from "next/server";
import { sanitizeInsurancePolicyInput } from "@/lib/insurance/insurance-sanitize";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { deleteInsurancePolicyForUser, updateInsurancePolicyForUser } from "@/services/insurance-supabase";

function bad(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, context: RouteContext) {
  if (!isSupabaseConfigured()) return bad("Supabase is not configured", 503);
  try {
    const { id } = await context.params;
    if (!id) return bad("Missing policy id.");

    const sb = await createServerSupabaseClient();
    const { data } = await sb.auth.getUser();
    if (!data.user) return bad("Please sign in to update an insurance policy.", 401);

    const body = await req.json();
    const input = sanitizeInsurancePolicyInput(body);
    if (!input) return bad("Please check insurance type, provider, and coverage amount.");

    const policy = await updateInsurancePolicyForUser(sb, data.user.id, id, input);
    return NextResponse.json({ ok: true, policy });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "Could not update insurance policy.", 500);
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  if (!isSupabaseConfigured()) return bad("Supabase is not configured", 503);
  try {
    const { id } = await context.params;
    if (!id) return bad("Missing policy id.");

    const sb = await createServerSupabaseClient();
    const { data } = await sb.auth.getUser();
    if (!data.user) return bad("Please sign in to delete an insurance policy.", 401);

    await deleteInsurancePolicyForUser(sb, data.user.id, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "Could not delete insurance policy.", 500);
  }
}
