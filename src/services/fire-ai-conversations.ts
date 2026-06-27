import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  buildConversationWithMessages,
  conversationRowToSummary,
} from "@/lib/fire-nepal-ai/db-mapper";
import type { FireAiConversation, FireAiConversationSummary } from "@/lib/fire-nepal-ai/types";

export function formatFireAiDbError(message: string): string {
  if (message.includes("fire_ai_conversations") || message.includes("fire_ai_messages")) {
    return "FIRE AI storage is not ready. Apply the fire_ai_conversations migration.";
  }
  return message;
}

export async function listFireAiConversationsForUser(userId: string): Promise<FireAiConversationSummary[]> {
  const sb = await createServerSupabaseClient();
  const { data, error } = await sb
    .from("fire_ai_conversations")
    .select("id, title, preview, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) throw new Error(formatFireAiDbError(error.message));
  return (data ?? []).map((row) => conversationRowToSummary(row as never));
}

export async function getFireAiConversationWithMessages(
  conversationId: string,
  userId: string,
): Promise<FireAiConversation | null> {
  const sb = await createServerSupabaseClient();

  const { data: conv, error: convErr } = await sb
    .from("fire_ai_conversations")
    .select("*")
    .eq("id", conversationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (convErr) throw new Error(formatFireAiDbError(convErr.message));
  if (!conv) return null;

  const { data: messages, error: msgErr } = await sb
    .from("fire_ai_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (msgErr) throw new Error(formatFireAiDbError(msgErr.message));

  return buildConversationWithMessages(conv as never, (messages ?? []) as never);
}
