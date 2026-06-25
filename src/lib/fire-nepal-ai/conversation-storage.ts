import type { FireAiConversation } from "@/lib/fire-nepal-ai/types";

const STORAGE_PREFIX = "fire-nepal-ai-conversations-v1";

function storageKey(userId?: string | null): string {
  return userId ? `${STORAGE_PREFIX}:${userId}` : `${STORAGE_PREFIX}:guest`;
}

function readAll(userId?: string | null): FireAiConversation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as FireAiConversation[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(userId: string | null | undefined, conversations: FireAiConversation[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(storageKey(userId), JSON.stringify(conversations));
}

export function listFireAiConversations(userId?: string | null): FireAiConversation[] {
  return readAll(userId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 20);
}

export function getFireAiConversation(id: string, userId?: string | null): FireAiConversation | null {
  return readAll(userId).find((c) => c.id === id) ?? null;
}

export function saveFireAiConversation(conversation: FireAiConversation, userId?: string | null): void {
  const all = readAll(userId);
  const idx = all.findIndex((c) => c.id === conversation.id);
  if (idx >= 0) all[idx] = conversation;
  else all.unshift(conversation);
  writeAll(userId, all.slice(0, 30));
}

export function createFireAiConversationId(): string {
  return `conv_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function createFireAiMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
