"use client";

import { useFireTheme } from "@/contexts/FireThemeContext";
import { FIRE_AI_SUGGESTED_PROMPTS } from "@/lib/fire-nepal-ai/suggested-prompts";

type FireAiSuggestedPromptsProps = {
  onSelect: (prompt: string) => void;
  disabled?: boolean;
};

export function FireAiSuggestedPrompts({ onSelect, disabled }: FireAiSuggestedPromptsProps) {
  const light = useFireTheme().resolvedTheme === "light";

  return (
    <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
      <div
        className={`mb-4 grid h-16 w-16 place-items-center rounded-3xl text-3xl ${
          light ? "bg-emerald-100/80" : "bg-emerald-500/15"
        }`}
        aria-hidden
      >
        ✨
      </div>
      <h2 className={`text-xl font-black tracking-tight ${light ? "text-slate-900" : "text-white"}`}>
        Ask FIRE AI anything
      </h2>
      <p
        className={`mt-2 max-w-sm text-sm font-medium leading-relaxed ${
          light ? "text-slate-500" : "text-emerald-200/60"
        }`}
      >
        Your AI Financial Copilot for FIRE, budgeting, investments, and life abroad — in Nepali or English.
      </p>
      <div className="mt-8 grid w-full max-w-md gap-2.5">
        {FIRE_AI_SUGGESTED_PROMPTS.map((prompt) => (
          <button
            key={prompt.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(prompt.label)}
            className={`flex min-h-[52px] items-center gap-3 rounded-2xl border px-4 py-3.5 text-left text-sm font-bold transition active:scale-[0.98] disabled:opacity-50 ${
              light
                ? "border-emerald-200/80 bg-white/90 text-emerald-900 shadow-sm hover:border-emerald-300 hover:bg-emerald-50/80"
                : "border-emerald-400/20 bg-emerald-950/40 text-emerald-100 hover:border-emerald-400/35 hover:bg-emerald-950/60"
            }`}
          >
            <span className="text-lg" aria-hidden>
              {prompt.emoji}
            </span>
            <span>{prompt.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
