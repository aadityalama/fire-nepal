"use client";

import type { FireAiChatMessage, FireAiConversation, FireAiConversationSummary } from "@/lib/fire-nepal-ai/types";

type ApiError = { ok: false; error: string };
type ApiOk<T> = { ok: true } & T;

async function parseJson<T>(res: Response): Promise<T> {
  return (await res.json()) as T;
}

export async function fetchFireAiConversations(): Promise<FireAiConversationSummary[]> {
  const res = await fetch("/api/fire-ai/conversations", { credentials: "include", cache: "no-store" });
  const json = await parseJson<ApiOk<{ conversations: FireAiConversationSummary[] }> | ApiError>(res);
  if (!json.ok) throw new Error(json.error);
  return json.conversations;
}

export async function fetchFireAiConversation(id: string): Promise<FireAiConversation> {
  const res = await fetch(`/api/fire-ai/conversations/${encodeURIComponent(id)}`, {
    credentials: "include",
    cache: "no-store",
  });
  const json = await parseJson<ApiOk<{ conversation: FireAiConversation }> | ApiError>(res);
  if (!json.ok) throw new Error(json.error);
  return json.conversation;
}

export async function createFireAiConversation(): Promise<FireAiConversationSummary> {
  const res = await fetch("/api/fire-ai/conversations", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  const json = await parseJson<ApiOk<{ conversation: FireAiConversationSummary }> | ApiError>(res);
  if (!json.ok) throw new Error(json.error);
  return json.conversation;
}

export async function renameFireAiConversation(id: string, title: string): Promise<FireAiConversationSummary> {
  const res = await fetch(`/api/fire-ai/conversations/${encodeURIComponent(id)}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  const json = await parseJson<ApiOk<{ conversation: FireAiConversationSummary }> | ApiError>(res);
  if (!json.ok) throw new Error(json.error);
  return json.conversation;
}

export async function deleteFireAiConversation(id: string): Promise<void> {
  const res = await fetch(`/api/fire-ai/conversations/${encodeURIComponent(id)}`, {
    method: "DELETE",
    credentials: "include",
  });
  const json = await parseJson<ApiOk<Record<string, never>> | ApiError>(res);
  if (!json.ok) throw new Error(json.error);
}

export type FireAiStreamEvent =
  | { type: "conversation"; conversationId: string }
  | { type: "message"; messageId: string; role: "user" | "assistant" }
  | { type: "delta"; content: string }
  | { type: "title"; title: string }
  | { type: "done"; assistantMessageId: string; content: string }
  | { type: "error"; message: string };

export type StreamFireAiChatOptions = {
  conversationId?: string;
  message: string;
  regenerate?: boolean;
  signal?: AbortSignal;
  onEvent: (event: FireAiStreamEvent) => void;
};

/** Stream a chat message; parses SSE events from the API. */
export async function streamFireAiChat(opts: StreamFireAiChatOptions): Promise<void> {
  const res = await fetch("/api/fire-ai/chat", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      conversationId: opts.conversationId,
      message: opts.message,
      regenerate: opts.regenerate ?? false,
    }),
    signal: opts.signal,
  });

  if (!res.ok) {
    const json = (await res.json().catch(() => null)) as ApiError | null;
    throw new Error(json?.error ?? `Chat request failed (${res.status})`);
  }

  if (!res.body) throw new Error("No response stream");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data: ")) continue;
        const payload = trimmed.slice(6);
        if (payload === "[DONE]") continue;
        try {
          const event = JSON.parse(payload) as FireAiStreamEvent;
          opts.onEvent(event);
        } catch {
          /* skip malformed */
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export function createOptimisticUserMessage(content: string): FireAiChatMessage {
  return {
    id: `temp_${Date.now()}`,
    role: "user",
    content,
    timestamp: new Date().toISOString(),
    status: "complete",
  };
}

export function createStreamingAssistantMessage(): FireAiChatMessage {
  return {
    id: `stream_${Date.now()}`,
    role: "assistant",
    content: "",
    timestamp: new Date().toISOString(),
    status: "streaming",
  };
}
