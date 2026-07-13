"use client";

import { useFireAiData } from "@/lib/fire-nepal-ai/use-fire-ai-data";
import { getTimeGreeting, firstName } from "@/lib/fire-nepal-ai/utils";
import { useFireTheme } from "@/contexts/FireThemeContext";
import { FireAiFinancialIntelligenceDashboard } from "@/components/fire-nepal-ai/FireAiFinancialIntelligenceDashboard";
import { FireAiRecentConversations } from "@/components/fire-nepal-ai/FireAiRecentConversations";
import { FireAiSmartSuggestions } from "@/components/fire-nepal-ai/FireAiSmartSuggestions";
import { useCurrentUserProfile } from "@/hooks/useCurrentUserProfile";

export function FireAiHome() {
  const light = useFireTheme().resolvedTheme === "light";
  const { profile } = useCurrentUserProfile();
  const {
    summary,
    expenseInsights,
    fireGuidance,
    healthScore,
    todayInsight,
    conversations,
    hydrated,
  } = useFireAiData();
  const greeting = getTimeGreeting();
  const name = firstName(profile?.fullName);

  return (
    <div className="space-y-4 lg:space-y-6">
      <header className="flex items-end justify-between gap-3">
        <div>
          <p className={`text-xs font-black uppercase tracking-[0.16em] ${light ? "text-emerald-700" : "text-emerald-300/70"}`}>
            {greeting}
          </p>
          <h2 className={`text-2xl font-black tracking-tight sm:text-3xl ${light ? "text-slate-900" : "text-white"}`}>
            {name ? `${name} ` : ""}👋
          </h2>
        </div>
        <p className={`hidden max-w-sm text-right text-sm font-semibold leading-relaxed lg:block ${light ? "text-slate-500" : "text-emerald-200/60"}`}>
          Expense, wealth, and FIRE guidance in one responsive intelligence dashboard.
        </p>
      </header>

      <FireAiFinancialIntelligenceDashboard
        hydrated={hydrated}
        summary={summary}
        expenseInsights={expenseInsights}
        fireGuidance={fireGuidance}
        healthScore={healthScore}
        todayInsight={todayInsight}
      />

      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <FireAiRecentConversations conversations={conversations} />
        <FireAiSmartSuggestions />
      </div>
    </div>
  );
}
