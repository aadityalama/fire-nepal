"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useProductAuth } from "@/contexts/ProductAuthContext";
import { useUnifiedFireSummary } from "@/lib/fire-nepal/use-unified-fire-summary";
import { loadDashboardState, emptyExpenseDashboardState } from "@/lib/expense-storage";
import type { DashboardPersistedState } from "@/lib/expense-storage";
import { computeFinancialHealthScore } from "@/lib/fire-nepal-ai/financial-health-score";
import { buildTodayInsight } from "@/lib/fire-nepal-ai/today-insight";
import { buildExpenseInsightMetrics } from "@/lib/fire-nepal-ai/expense-insights-data";
import { buildFireGuidance } from "@/lib/fire-nepal-ai/fire-guidance-data";
import { fetchFireAiConversations } from "@/lib/fire-nepal-ai/conversation-api";
import type { FireAiConversationSummary } from "@/lib/fire-nepal-ai/types";

export function useFireAiData() {
  const { user, loading: authLoading } = useProductAuth();
  const { summary, ratesLoading, resync } = useUnifiedFireSummary();
  const [expenseState, setExpenseState] = useState<DashboardPersistedState>(emptyExpenseDashboardState);
  const [expenseHydrated, setExpenseHydrated] = useState(false);
  const [conversations, setConversations] = useState<FireAiConversationSummary[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);

  const refreshExpenses = useCallback(() => {
    setExpenseState(loadDashboardState() ?? emptyExpenseDashboardState());
    setExpenseHydrated(true);
  }, []);

  const refreshConversations = useCallback(async () => {
    if (!user?.id) {
      setConversations([]);
      setConversationsLoading(false);
      return;
    }
    setConversationsLoading(true);
    try {
      const list = await fetchFireAiConversations();
      setConversations(list);
    } catch {
      setConversations([]);
    } finally {
      setConversationsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    refreshExpenses();
  }, [refreshExpenses]);

  useEffect(() => {
    void refreshConversations();
  }, [refreshConversations]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key?.includes("expense-dashboard")) refreshExpenses();
    };
    const onVis = () => {
      if (document.visibilityState === "visible") {
        refreshExpenses();
        resync();
        void refreshConversations();
      }
    };
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [refreshExpenses, resync, refreshConversations]);

  const healthScore = useMemo(() => computeFinancialHealthScore(summary), [summary]);
  const todayInsight = useMemo(() => buildTodayInsight(summary, expenseState), [summary, expenseState]);
  const expenseInsights = useMemo(
    () => buildExpenseInsightMetrics(expenseState, summary),
    [expenseState, summary],
  );
  const fireGuidance = useMemo(() => buildFireGuidance(summary), [summary]);

  const hydrated = !authLoading && expenseHydrated && !ratesLoading && !conversationsLoading;

  return {
    user,
    summary,
    expenseState,
    healthScore,
    todayInsight,
    expenseInsights,
    fireGuidance,
    conversations,
    hydrated,
    refreshConversations,
  };
}
