"use client";

import { Send, Square } from "lucide-react";
import { useCallback, useRef, useEffect } from "react";
import { useFireTheme } from "@/contexts/FireThemeContext";

type FireAiChatInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onStop?: () => void;
  disabled?: boolean;
  isGenerating?: boolean;
  placeholder?: string;
};

export function FireAiChatInput({
  value,
  onChange,
  onSubmit,
  onStop,
  disabled,
  isGenerating,
  placeholder = "Ask about your finances…",
}: FireAiChatInputProps) {
  const light = useFireTheme().resolvedTheme === "light";
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && !isGenerating && value.trim()) onSubmit();
    }
  };

  return (
    <div
      className={`shrink-0 border-t px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 ${
        light ? "border-emerald-100 bg-[#f4fbf6]/95 backdrop-blur-xl" : "border-emerald-400/10 bg-[#030806]/95 backdrop-blur-xl"
      }`}
    >
      <div className="mx-auto flex max-w-2xl gap-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          disabled={disabled}
          className={`max-h-40 min-h-[48px] flex-1 resize-none rounded-2xl border px-4 py-3 text-sm font-medium outline-none transition focus:ring-2 ${
            light
              ? "border-emerald-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-emerald-400 focus:ring-emerald-100"
              : "border-emerald-400/20 bg-emerald-950/50 text-white placeholder:text-emerald-300/40 focus:border-emerald-400/50 focus:ring-emerald-500/20"
          }`}
          aria-label="Message FIRE AI"
        />
        {isGenerating ? (
          <button
            type="button"
            onClick={onStop}
            className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl transition active:scale-95 ${
              light ? "bg-slate-800 text-white hover:bg-slate-700" : "bg-emerald-800 text-white hover:bg-emerald-700"
            }`}
            aria-label="Stop generating"
          >
            <Square size={16} fill="currentColor" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onSubmit}
            disabled={!value.trim() || disabled}
            className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-700 text-white transition hover:bg-emerald-600 disabled:opacity-40 active:scale-95"
            aria-label="Send message"
          >
            <Send size={18} />
          </button>
        )}
      </div>
    </div>
  );
}
