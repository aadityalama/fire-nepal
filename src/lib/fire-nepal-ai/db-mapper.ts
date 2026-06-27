import type { FireAiChatMessage, FireAiConversation } from "@/lib/fire-nepal-ai/types";
import type { Database } from "@/types/supabase-database";

type ConversationRow = Database["public"]["Tables"]["fire_ai_conversations"]["Row"];
type MessageRow = Database["public"]["Tables"]["fire_ai_messages"]["Row"];

export function messageRowToChat(row: MessageRow): FireAiChatMessage {
  return {
    id: row.id,
    role: row.role as "user" | "assistant",
    content: row.content,
    timestamp: row.created_at,
    status: "complete",
  };
}

export function conversationRowToSummary(row: ConversationRow): Omit<FireAiConversation, "messages"> {
  return {
    id: row.id,
    title: row.title,
    preview: row.preview,
    updatedAt: row.updated_at,
  };
}

export function buildConversationWithMessages(
  row: ConversationRow,
  messages: MessageRow[],
): FireAiConversation {
  return {
    ...conversationRowToSummary(row),
    messages: messages.map(messageRowToChat),
  };
}

export function truncatePreview(text: string, max = 120): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}
