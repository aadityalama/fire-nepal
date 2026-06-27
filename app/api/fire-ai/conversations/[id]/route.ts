import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { conversationRowToSummary } from "@/lib/fire-nepal-ai/db-mapper";
import {
  formatFireAiDbError,
  getFireAiConversationWithMessages,
} from "@/services/fire-ai-conversations";

function bad(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: RouteContext) {
  if (!isSupabaseConfigured()) return bad("Supabase is not configured", 503);
  const { id } = await ctx.params;
  if (!id) return bad("Missing conversation id");

  try {
    const sb = await createServerSupabaseClient();
    const { data: u } = await sb.auth.getUser();
    if (!u.user) return bad("Unauthorized", 401);

    const conversation = await getFireAiConversationWithMessages(id, u.user.id);
    if (!conversation) return bad("Conversation not found", 404);

    return NextResponse.json({ ok: true, conversation });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "Server error", 500);
  }
}

export async function PATCH(req: Request, ctx: RouteContext) {
  if (!isSupabaseConfigured()) return bad("Supabase is not configured", 503);
  const { id } = await ctx.params;
  if (!id) return bad("Missing conversation id");

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return bad("Invalid JSON");
  }

  const title = typeof (raw as { title?: unknown }).title === "string" ? (raw as { title: string }).title.trim() : "";
  if (!title) return bad("Title is required");

  try {
    const sb = await createServerSupabaseClient();
    const { data: u } = await sb.auth.getUser();
    if (!u.user) return bad("Unauthorized", 401);

    const { data, error } = await sb
      .from("fire_ai_conversations")
      .update({ title: title.slice(0, 120), updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", u.user.id)
      .select("id, title, preview, updated_at")
      .maybeSingle();

    if (error) return bad(formatFireAiDbError(error.message), 500);
    if (!data) return bad("Conversation not found", 404);

    return NextResponse.json({ ok: true, conversation: conversationRowToSummary(data as never) });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "Server error", 500);
  }
}

export async function DELETE(_req: Request, ctx: RouteContext) {
  if (!isSupabaseConfigured()) return bad("Supabase is not configured", 503);
  const { id } = await ctx.params;
  if (!id) return bad("Missing conversation id");

  try {
    const sb = await createServerSupabaseClient();
    const { data: u } = await sb.auth.getUser();
    if (!u.user) return bad("Unauthorized", 401);

    const { error } = await sb.from("fire_ai_conversations").delete().eq("id", id).eq("user_id", u.user.id);

    if (error) return bad(formatFireAiDbError(error.message), 500);

    return NextResponse.json({ ok: true });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "Server error", 500);
  }
}
