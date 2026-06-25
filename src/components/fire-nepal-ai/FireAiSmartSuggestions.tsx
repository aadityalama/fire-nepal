"use client";

import Link from "next/link";
import { useFireTheme } from "@/contexts/FireThemeContext";
import { FIRE_AI_SMART_SUGGESTIONS } from "@/lib/fire-nepal-ai/utils";

export function FireAiSmartSuggestions() {
  const light = useFireTheme().resolvedTheme === "light";

  return (
    <section>
      <h2 className={`mb-3 text-sm font-black ${light ? "text-slate-900" : "text-white"}`}>Smart Suggestions</h2>
      <div className="flex flex-wrap gap-2">
        {FIRE_AI_SMART_SUGGESTIONS.map((s) => {
          const href = s.prompt ? `${s.href}?prompt=${encodeURIComponent(s.prompt)}` : s.href;
          return (
            <Link
              key={s.id}
              href={href}
              className={`inline-flex min-h-[48px] items-center rounded-full border px-4 py-2.5 text-sm font-bold transition active:scale-[0.98] ${
                light
                  ? "border-emerald-200/80 bg-white/90 text-emerald-800 hover:border-emerald-300 hover:bg-emerald-50"
                  : "border-emerald-400/20 bg-emerald-950/40 text-emerald-100 hover:border-emerald-400/40 hover:bg-emerald-950/60"
              }`}
            >
              {s.label}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
