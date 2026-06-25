"use client";

import Link from "next/link";
import { useFireTheme } from "@/contexts/FireThemeContext";
import { FireAiGlassCard } from "@/components/fire-nepal-ai/ui/FireAiGlassCard";

const ACTIONS = [
  { href: "/fire-ai/chat", emoji: "💬", title: "Ask FIRE AI", subtitle: "Chat with your assistant" },
  { href: "/fire-ai/expense-insights", emoji: "📊", title: "Expense Insights", subtitle: "Spending analysis" },
  { href: "/fire-ai/fire-guidance", emoji: "🔥", title: "FIRE Guidance", subtitle: "Personalized tips" },
  { href: "/fire-ai/wealth-summary", emoji: "📈", title: "Wealth Summary", subtitle: "Net worth & progress" },
] as const;

export function FireAiQuickActions() {
  const light = useFireTheme().resolvedTheme === "light";

  return (
    <div className="grid grid-cols-2 gap-3">
      {ACTIONS.map((action) => (
        <Link
          key={action.href}
          href={action.href}
          className="touch-manipulation active:scale-[0.98]"
        >
          <FireAiGlassCard className="flex min-h-[108px] flex-col justify-between transition duration-200 hover:-translate-y-0.5 hover:shadow-lg">
            <span className="text-2xl" aria-hidden>
              {action.emoji}
            </span>
            <div>
              <p className={`text-sm font-black ${light ? "text-slate-900" : "text-white"}`}>{action.title}</p>
              <p className={`mt-0.5 text-[11px] font-semibold ${light ? "text-slate-500" : "text-emerald-200/60"}`}>
                {action.subtitle}
              </p>
            </div>
          </FireAiGlassCard>
        </Link>
      ))}
    </div>
  );
}
