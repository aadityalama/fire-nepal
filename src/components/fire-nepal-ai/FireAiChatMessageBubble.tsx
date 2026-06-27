"use client";

import { useCallback, useState } from "react";
import { Check, Copy, RefreshCw, RotateCcw } from "lucide-react";
import { useFireTheme } from "@/contexts/FireThemeContext";
import { FireAiChatMarkdown } from "@/components/fire-nepal-ai/FireAiChatMarkdown";
import type { FireAiChatMessage } from "@/lib/fire-nepal-ai/types";

type FireAiChatMessageBubbleProps = {
  message: FireAiChatMessage;
  isLastAssistant?: boolean;
  isGenerating?: boolean;
  onRegenerate?: () => void;
  onRetry?: () => void;
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function FireAiChatMessageBubble({
  message,
  isLastAssistant,
  isGenerating,
  onRegenerate,
  onRetry,
}: FireAiChatMessageBubbleProps) {
  const light = useFireTheme().resolvedTheme === "light";
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";
  const failed = message.status === "failed";
  const streaming = message.status === "streaming";

  const copy = useCallback(async () => {
    if (!message.content) return;
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }, [message.content]);

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[88%] sm:max-w-[85%] ${isUser ? "" : "group relative"}`}>
        <div
          className={`rounded-2xl px-4 py-3 ${
            isUser
              ? light
                ? "bg-emerald-700 text-white"
                : "bg-emerald-600 text-white"
              : failed
                ? light
                  ? "border border-red-200 bg-red-50 text-red-900"
                  : "border border-red-400/30 bg-red-950/30 text-red-100"
                : light
                  ? "border border-emerald-100 bg-white text-slate-800 shadow-sm"
                  : "border border-emerald-400/15 bg-emerald-950/50 text-emerald-50"
          }`}
        >
          {failed ? (
            <p className="text-sm font-medium">Failed to generate a response.</p>
          ) : streaming && !message.content ? (
            <div className="flex gap-1.5 py-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className={`h-2 w-2 animate-bounce rounded-full ${light ? "bg-emerald-400" : "bg-emerald-400/80"}`}
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </div>
          ) : (
            <FireAiChatMarkdown content={message.content} isUser={isUser} />
          )}

          <div
            className={`mt-1.5 flex items-center gap-2 text-[10px] font-semibold ${
              isUser ? "text-emerald-100/70" : light ? "text-slate-400" : "text-emerald-300/50"
            }`}
          >
            <span>{formatTime(message.timestamp)}</span>
            {streaming && isGenerating ? <span className="animate-pulse">Generating…</span> : null}
          </div>
        </div>

        {!isUser && message.content && !streaming ? (
          <div className="mt-1 flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
            <button
              type="button"
              onClick={() => void copy()}
              className={`flex min-h-[36px] items-center gap-1 rounded-xl px-2.5 text-[11px] font-bold transition active:scale-95 ${
                light ? "text-slate-500 hover:bg-emerald-50" : "text-emerald-300/70 hover:bg-emerald-950/50"
              }`}
              aria-label="Copy response"
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? "Copied" : "Copy"}
            </button>
            {isLastAssistant && onRegenerate && !isGenerating ? (
              <button
                type="button"
                onClick={onRegenerate}
                className={`flex min-h-[36px] items-center gap-1 rounded-xl px-2.5 text-[11px] font-bold transition active:scale-95 ${
                  light ? "text-slate-500 hover:bg-emerald-50" : "text-emerald-300/70 hover:bg-emerald-950/50"
                }`}
                aria-label="Regenerate response"
              >
                <RefreshCw size={13} />
                Regenerate
              </button>
            ) : null}
          </div>
        ) : null}

        {failed && onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className={`mt-2 flex min-h-[40px] items-center gap-1.5 rounded-xl px-3 text-xs font-bold transition active:scale-95 ${
              light ? "bg-red-100 text-red-700" : "bg-red-900/40 text-red-200"
            }`}
          >
            <RotateCcw size={14} />
            Retry
          </button>
        ) : null}
      </div>
    </div>
  );
}
