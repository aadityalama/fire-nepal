import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getFireAiQuotaSnapshot } from "@/services/fire-ai-usage";
import { withApiRouteTiming } from "@/lib/mutation-perf";


function bad(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}

async function GETHandler() {
  if (!isSupabaseConfigured()) return bad("Supabase is not configured", 503);

  try {
    const sb = await createServerSupabaseClient();
    const { data: authData } = await sb.auth.getUser();
    if (!authData.user) return bad("Unauthorized", 401);

    const quota = await getFireAiQuotaSnapshot(authData.user.id);
    return NextResponse.json({ ok: true, quota });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "Server error", 500);
  }
}

export const GET = withApiRouteTiming("fire-ai/usage:GET", GETHandler);
