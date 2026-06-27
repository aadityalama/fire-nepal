"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useFireTheme } from "@/contexts/FireThemeContext";
import { FireAiChatHeader } from "@/components/fire-nepal-ai/FireAiChatHeader";
import { FireAiChatInput } from "@/components/fire-nepal-ai/FireAiChatInput";
import { FireAiChatMessageBubble } from "@/components/fire-nepal-ai/FireAiChatMessageBubble";
import { FireAiSuggestedPrompts } from "@/components/fire-nepal-ai/FireAiSuggestedPrompts";
import {
  createOptimisticUserMessage,
  createStreamingAssistantMessage,
  deleteFireAiConversation,
  fetchFireAiConversation,
  fetchFireAiConversations,
  renameFireAiConversation,
  streamFireAiChat,
} from "@/lib/fire-nepal-ai/conversation-api";
import type { FireAiChatMessage, FireAiConversationSummary } from "@/lib/fire-nepal-ai/types";

function ChatLoadingSkeleton() {
  const light = useFireTheme().resolvedTheme === "light";
  return (
    <div className="space-y-4 px-1 py-6">
      <div className={`ml-auto h-14 w-3/4 animate-pulse rounded-2xl ${light ? "bg-emerald-100/40" : "bg-emerald-900/30"}`} />
      <div className={`h-20 w-4/5 animate-pulse rounded-2xl ${light ? "bg-emerald-100/25" : "bg-emerald-900/20"}`} />
    </div>
  );
}

export function FireAiChat() {
  const light = useFireTheme().resolvedTheme === "light";
  const router = useRouter();
  const searchParams = useSearchParams();
  const convIdParam = searchParams.get("id");
  const promptParam = searchParams.get("prompt");

  const [conversations, setConversations] = useState<FireAiConversationSummary[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>(convIdParam ?? undefined);
  const [conversationTitle, setConversationTitle] = useState("Ask FIRE AI");
  const [messages, setMessages] = useState<FireAiChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingConversation, setLoadingConversation] = useState(Boolean(convIdParam));
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const bootedRef = useRef(false);

  const refreshConversations = useCallback(async () => {
    try {
      const list = await fetchFireAiConversations();
      setConversations(list);
    } catch {
      /* list may fail if migration not applied */
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  useEffect(() => {
    void refreshConversations();
  }, [refreshConversations]);

  const loadConversation = useCallback(async (id: string) => {
    setLoadingConversation(true);
    setError(null);
    try {
      const conv = await fetchFireAiConversation(id);
      setConversationId(conv.id);
      setConversationTitle(conv.title);
      setMessages(conv.messages);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load conversation");
      setMessages([]);
    } finally {
      setLoadingConversation(false);
    }
  }, []);

  useEffect(() => {
    if (convIdParam) void loadConversation(convIdParam);
    else {
      setConversationId(undefined);
      setConversationTitle("Ask FIRE AI");
      setMessages([]);
      setLoadingConversation(false);
    }
  }, [convIdParam, loadConversation]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isGenerating]);

  const updateUrl = useCallback(
    (id?: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (id) params.set("id", id);
      else params.delete("id");
      params.delete("prompt");
      const qs = params.toString();
      router.replace(qs ? `/fire-ai/chat?${qs}` : "/fire-ai/chat", { scroll: false });
    },
    [router, searchParams],
  );

  const sendMessage = useCallback(
    async (text: string, opts?: { regenerate?: boolean }) => {
      const trimmed = text.trim();
      if ((!trimmed && !opts?.regenerate) || isGenerating) return;

      setError(null);
      setIsGenerating(true);
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      let activeConvId = conversationId;
      let assistantLocalId = createStreamingAssistantMessage().id;

      if (!opts?.regenerate) {
        const userMsg = createOptimisticUserMessage(trimmed);
        const assistantMsg = createStreamingAssistantMessage();
        assistantLocalId = assistantMsg.id;
        setMessages((prev) => [...prev, userMsg, assistantMsg]);
        setInput("");
      } else {
        setMessages((prev) => {
          const lastAsstIdx = [...prev].reverse().findIndex((m) => m.role === "assistant");
          if (lastAsstIdx < 0) return prev;
          const cutFrom = prev.length - 1 - lastAsstIdx;
          const assistantMsg = createStreamingAssistantMessage();
          assistantLocalId = assistantMsg.id;
          return [...prev.slice(0, cutFrom), assistantMsg];
        });
      }

      try {
        await streamFireAiChat({
          conversationId: activeConvId,
          message: opts?.regenerate ? "" : trimmed,
          regenerate: opts?.regenerate,
          signal: controller.signal,
          onEvent: (event) => {
            if (event.type === "conversation") {
              activeConvId = event.conversationId;
              setConversationId(event.conversationId);
              updateUrl(event.conversationId);
            } else if (event.type === "message" && event.role === "assistant") {
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantLocalId ? { ...m, id: event.messageId } : m)),
              );
              assistantLocalId = event.messageId;
            } else if (event.type === "delta") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantLocalId ? { ...m, content: m.content + event.content, status: "streaming" } : m,
                ),
              );
            } else if (event.type === "title") {
              setConversationTitle(event.title);
            } else if (event.type === "done") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantLocalId
                    ? { ...m, id: event.assistantMessageId, content: event.content, status: "complete" }
                    : m,
                ),
              );
            } else if (event.type === "error") {
              setError(event.message);
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantLocalId ? { ...m, status: "failed", content: "" } : m)),
              );
            }
          },
        });
        void refreshConversations();
      } catch (e) {
        if (controller.signal.aborted) return;
        const msg = e instanceof Error ? e.message : "Failed to send message";
        setError(msg);
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantLocalId ? { ...m, status: "failed" } : m)),
        );
      } finally {
        setIsGenerating(false);
        abortRef.current = null;
      }
    },
    [conversationId, isGenerating, refreshConversations, updateUrl],
  );

  useEffect(() => {
    if (bootedRef.current || !promptParam || loadingConversation) return;
    bootedRef.current = true;
    void sendMessage(promptParam);
  }, [promptParam, loadingConversation, sendMessage]);

  const handleNewChat = useCallback(() => {
    abortRef.current?.abort();
    setIsGenerating(false);
    setMessages([]);
    setConversationId(undefined);
    setConversationTitle("Ask FIRE AI");
    setError(null);
    updateUrl(undefined);
  }, [updateUrl]);

  const handleSelectConversation = useCallback(
    (id: string) => {
      updateUrl(id);
    },
    [updateUrl],
  );

  const handleRename = useCallback(
    async (id: string, title: string) => {
      const updated = await renameFireAiConversation(id, title);
      setConversationTitle(updated.title);
      void refreshConversations();
    },
    [refreshConversations],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteFireAiConversation(id);
      if (id === conversationId) handleNewChat();
      void refreshConversations();
    },
    [conversationId, handleNewChat, refreshConversations],
  );

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
    setIsGenerating(false);
    setMessages((prev) =>
      prev.map((m) => (m.status === "streaming" ? { ...m, status: "complete" } : m)),
    );
  }, []);

  const handleRegenerate = useCallback(() => {
    void sendMessage("", { regenerate: true });
  }, [sendMessage]);

  const handleRetry = useCallback(() => {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (lastUser) void sendMessage(lastUser.content, { regenerate: true });
  }, [messages, sendMessage]);

  const lastAssistantIdx = [...messages].reverse().findIndex((m) => m.role === "assistant");
  const lastAssistantId = lastAssistantIdx >= 0 ? messages[messages.length - 1 - lastAssistantIdx]?.id : undefined;

  const empty = messages.length === 0 && !isGenerating && !loadingConversation;

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <FireAiChatHeader
        title={conversationTitle}
        conversations={conversations}
        currentConversationId={conversationId}
        onNewChat={handleNewChat}
        onSelectConversation={handleSelectConversation}
        onRenameConversation={handleRename}
        onDeleteConversation={handleDelete}
        loadingConversations={loadingConversations}
      />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-4">
          {loadingConversation ? (
            <ChatLoadingSkeleton />
          ) : empty ? (
            <FireAiSuggestedPrompts onSelect={(p) => void sendMessage(p)} disabled={isGenerating} />
          ) : (
            <div className="mx-auto max-w-2xl space-y-4">
              {messages.map((msg) => (
                <FireAiChatMessageBubble
                  key={msg.id}
                  message={msg}
                  isLastAssistant={msg.id === lastAssistantId}
                  isGenerating={isGenerating}
                  onRegenerate={handleRegenerate}
                  onRetry={msg.status === "failed" ? handleRetry : undefined}
                />
              ))}
            </div>
          )}
          {error ? (
            <div
              className={`mx-auto mt-4 max-w-2xl rounded-2xl border px-4 py-3 text-sm font-semibold ${
                light ? "border-red-200 bg-red-50 text-red-700" : "border-red-400/30 bg-red-950/30 text-red-200"
              }`}
              role="alert"
            >
              {error}
            </div>
          ) : null}
          <div ref={bottomRef} />
        </div>

        <FireAiChatInput
          value={input}
          onChange={setInput}
          onSubmit={() => void sendMessage(input)}
          onStop={handleStop}
          disabled={loadingConversation}
          isGenerating={isGenerating}
        />
      </div>
    </div>
  );
}
