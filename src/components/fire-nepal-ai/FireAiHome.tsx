"use client";

import { useFireAiData } from "@/lib/fire-nepal-ai/use-fire-ai-data";
import { getTimeGreeting, firstName } from "@/lib/fire-nepal-ai/utils";
import { useFireTheme } from "@/contexts/FireThemeContext";
import { FireAiHealthScoreCard } from "@/components/fire-nepal-ai/FireAiHealthScoreCard";
import { FireAiTodayInsightCard } from "@/components/fire-nepal-ai/FireAiTodayInsightCard";
import { FireAiQuickActions } from "@/components/fire-nepal-ai/FireAiQuickActions";
import { FireAiRecentConversations } from "@/components/fire-nepal-ai/FireAiRecentConversations";
import { FireAiSmartSuggestions } from "@/components/fire-nepal-ai/FireAiSmartSuggestions";

export function FireAiHome() {
  const light = useFireTheme().resolvedTheme === "light";
  const { user, healthScore, todayInsight, conversations, hydrated } = useFireAiData();
  const greeting = getTimeGreeting();
  const name = firstName(user?.name, user?.email);

  return (
    <div className="space-y-4">
      <header>
        <p className={`text-sm font-semibold ${light ? "text-slate-500" : "text-emerald-300/70"}`}>{greeting}</p>
        <h2 className={`text-2xl font-black tracking-tight ${light ? "text-slate-900" : "text-white"}`}>
          {name} 👋
        </h2>
      </header>

      <FireAiHealthScoreCard health={healthScore} loading={!hydrated} />
      <FireAiTodayInsightCard insight={todayInsight} loading={!hydrated} />
      <FireAiQuickActions />
      <FireAiRecentConversations conversations={conversations} />
      <FireAiSmartSuggestions />
    </div>
  );
}
