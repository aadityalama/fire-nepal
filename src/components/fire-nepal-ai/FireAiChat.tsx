"use client";

import { Send } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useFireTheme } from "@/contexts/FireThemeContext";
import { useProductAuth } from "@/contexts/ProductAuthContext";
import { useFireAiData } from "@/lib/fire-nepal-ai/use-fire-ai-data";
import {
  buildFireAiChatResponse,
  FIRE_AI_SUGGESTED_PROMPTS,
} from "@/lib/fire-nepal-ai/chat-responses";
import {
  createFireAiConversationId,
  createFireAiMessageId,
  getFireAiConversation,
  saveFireAiConversation,
} from "@/lib/fire-nepal-ai/conversation-storage";
import type { FireAiChatMessage, FireAiConversation } from "@/lib/fire-nepal-ai/types";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function FireAiChat() {
  const light = useFireTheme().resolvedTheme === "light";
  const { user } = useProductAuth();
  const { summary, expenseState, hydrated, refreshConversations } = useFireAiData();
  const searchParams = useSearchParams();
  const convIdParam = searchParams.get("id");
  const promptParam = searchParams.get("prompt");

  const [conversationId, setConversationId] = useState(() => convIdParam ?? createFireAiConversationId());
  const [messages, setMessages] = useState<FireAiChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const bootedRef = useRef(false);

  useEffect(() => {
    if (convIdParam) {
      const existing = getFireAiConversation(convIdParam, user?.id);
      if (existing) {
        setConversationId(existing.id);
        setMessages(existing.messages);
      }
    }
  }, [convIdParam, user?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const persist = useCallback(
    (msgs: FireAiChatMessage[], title?: string) => {
      const conv: FireAiConversation = {
        id: conversationId,
        title: title ?? msgs.find((m) => m.role === "user")?.content.slice(0, 40) ?? "New conversation",
        preview: msgs[msgs.length - 1]?.content.slice(0, 80) ?? "",
        updatedAt: new Date().toISOString(),
        messages: msgs,
      };
      saveFireAiConversation(conv, user?.id);
      refreshConversations();
    },
    [conversationId, user?.id, refreshConversations],
  );

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || typing) return;

      const userMsg: FireAiChatMessage = {
        id: createFireAiMessageId(),
        role: "user",
        content: trimmed,
        timestamp: new Date().toISOString(),
      };
      const next = [...messages, userMsg];
      setMessages(next);
      setInput("");
      setTyping(true);

      await new Promise((r) => setTimeout(r, 600 + Math.random() * 400));

      const reply = buildFireAiChatResponse(trimmed, summary, expenseState);
      const assistantMsg: FireAiChatMessage = {
        id: createFireAiMessageId(),
        role: "assistant",
        content: reply,
        timestamp: new Date().toISOString(),
      };
      const final = [...next, assistantMsg];
      setMessages(final);
      setTyping(false);
      persist(final, trimmed.slice(0, 40));
    },
    [typing, messages, summary, expenseState, persist],
  );

  useEffect(() => {
    if (!hydrated || bootedRef.current || !promptParam) return;
    bootedRef.current = true;
    void sendMessage(promptParam);
  }, [hydrated, promptParam, sendMessage]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendMessage(input);
  };

  const empty = messages.length === 0 && !typing;

  return (
    <div className="flex min-h-[calc(100dvh-10rem)] flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto pb-4">
        {empty ? (
          <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
            <p className={`text-4xl`} aria-hidden>
              💬
            </p>
            <h2 className={`mt-4 text-lg font-black ${light ? "text-slate-900" : "text-white"}`}>
              Ask FIRE AI anything
            </h2>
            <p className={`mt-2 max-w-xs text-sm font-medium leading-relaxed ${light ? "text-slate-500" : "text-emerald-200/60"}`}>
              Get answers about your savings, spending, settlement, and FIRE progress — based on your real data.
            </p>
            <div className="mt-6 flex w-full flex-col gap-2">
              {FIRE_AI_SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => void sendMessage(prompt)}
                  className={`min-h-[48px] rounded-2xl border px-4 py-3 text-left text-sm font-bold transition active:scale-[0.98] ${
                    light
                      ? "border-emerald-200/80 bg-white/90 text-emerald-800 hover:bg-emerald-50"
                      : "border-emerald-400/20 bg-emerald-950/40 text-emerald-100 hover:bg-emerald-950/60"
                  }`}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                    msg.role === "user"
                      ? light
                        ? "bg-emerald-700 text-white"
                        : "bg-emerald-600 text-white"
                      : light
                        ? "border border-emerald-100 bg-white text-slate-800"
                        : "border border-emerald-400/15 bg-emerald-950/50 text-emerald-50"
                  }`}
                >
                  <p className="whitespace-pre-wrap text-sm font-medium leading-relaxed">{msg.content}</p>
                  <p
                    className={`mt-1.5 text-[10px] font-semibold ${
                      msg.role === "user" ? "text-emerald-100/70" : light ? "text-slate-400" : "text-emerald-300/50"
                    }`}
                  >
                    {formatTime(msg.timestamp)}
                  </p>
                </div>
              </div>
            ))}
            {typing ? (
              <div className="flex justify-start">
                <div
                  className={`rounded-2xl px-4 py-3 ${
                    light ? "border border-emerald-100 bg-white" : "border border-emerald-400/15 bg-emerald-950/50"
                  }`}
                >
                  <div className="flex gap-1.5">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className={`h-2 w-2 animate-bounce rounded-full ${light ? "bg-emerald-400" : "bg-emerald-400/80"}`}
                        style={{ animationDelay: `${i * 150}ms` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={handleSubmit}
        className={`sticky bottom-0 flex gap-2 border-t pt-3 ${
          light ? "border-emerald-100 bg-[#f4fbf6]/95" : "border-emerald-400/10 bg-[#030806]/95"
        }`}
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your finances…"
          className={`min-h-[48px] flex-1 rounded-2xl border px-4 text-sm font-medium outline-none transition focus:ring-2 ${
            light
              ? "border-emerald-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-emerald-400 focus:ring-emerald-100"
              : "border-emerald-400/20 bg-emerald-950/50 text-white placeholder:text-emerald-300/40 focus:border-emerald-400/50 focus:ring-emerald-500/20"
          }`}
          aria-label="Message FIRE AI"
        />
        <button
          type="submit"
          disabled={!input.trim() || typing}
          className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-700 text-white transition hover:bg-emerald-600 disabled:opacity-40"
          aria-label="Send message"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
