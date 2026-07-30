import { NextResponse } from "next/server";
import { sanitizeInsurancePolicyInput } from "@/lib/insurance/insurance-sanitize";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createInsurancePolicyForUser, listInsurancePoliciesForUser } from "@/services/insurance-supabase";

function bad(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}

export async function GET() {
  if (!isSupabaseConfigured()) return bad("Supabase is not configured", 503);
  try {
    const sb = await createServerSupabaseClient();
    const { data } = await sb.auth.getUser();
    if (!data.user) return bad("Please sign in to view your insurance policies.", 401);

    const policies = await listInsurancePoliciesForUser(sb, data.user.id);
    return NextResponse.json({ ok: true, policies });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "Could not load insurance policies.", 500);
  }
}

export async function POST(req: Request) {
  if (!isSupabaseConfigured()) return bad("Supabase is not configured", 503);
  try {
    const sb = await createServerSupabaseClient();
    const { data } = await sb.auth.getUser();
    if (!data.user) return bad("Please sign in to save an insurance policy.", 401);

    const body = await req.json();
    const input = sanitizeInsurancePolicyInput(body);
    if (!input) return bad("Please check insurance type, provider, and coverage amount.");

    const policy = await createInsurancePolicyForUser(sb, data.user.id, input);
    return NextResponse.json({ ok: true, policy });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "Could not save insurance policy.", 500);
  }
}
