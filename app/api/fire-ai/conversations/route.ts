import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { conversationRowToSummary } from "@/lib/fire-nepal-ai/db-mapper";
import {

  formatFireAiDbError,
  listFireAiConversationsForUser,
} from "@/services/fire-ai-conversations";
import { withApiRouteTiming } from "@/lib/mutation-perf";

function bad(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}

async function GETHandler() {
  if (!isSupabaseConfigured()) return bad("Supabase is not configured", 503);
  try {
    const sb = await createServerSupabaseClient();
    const { data: u } = await sb.auth.getUser();
    if (!u.user) return bad("Unauthorized", 401);

    const conversations = await listFireAiConversationsForUser(u.user.id);
    return NextResponse.json({ ok: true, conversations });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "Server error", 500);
  }
}

async function POSTHandler() {
  if (!isSupabaseConfigured()) return bad("Supabase is not configured", 503);
  try {
    const sb = await createServerSupabaseClient();
    const { data: u } = await sb.auth.getUser();
    if (!u.user) return bad("Unauthorized", 401);

    const { data, error } = await sb
      .from("fire_ai_conversations")
      .insert({ user_id: u.user.id, title: "New conversation", preview: "" })
      .select("id, title, preview, updated_at")
      .single();

    if (error) return bad(formatFireAiDbError(error.message), 500);

    const conversation = conversationRowToSummary(data as never);
    return NextResponse.json({ ok: true, conversation });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "Server error", 500);
  }
}

export const GET = withApiRouteTiming("fire-ai/conversations:GET", GETHandler);
export const POST = withApiRouteTiming("fire-ai/conversations:POST", POSTHandler);
