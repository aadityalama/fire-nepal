import "server-only";

import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { FIRE_AI_QUOTAS, type FireAiMembershipPlan } from "@/services/fire-ai-usage";

export type AiAnalyticsPoint = { label: string; requests: number; cost: number; tokens: number };

export type AiAnalyticsRow = {
  id: string;
  label: string;
  detail: string;
  membership: FireAiMembershipPlan;
  requests: number;
  tokens: number;
  cost: number;
  lastActivity: string | null;
};

export type AiFeatureAnalytics = {
  id: string;
  label: string;
  requests: number;
  tokens: number;
  cost: number;
};

export type AiLogRow = {
  id: string;
  userId: string;
  userLabel: string;
  membership: FireAiMembershipPlan;
  aiFeature: string;
  model: string;
  tokens: number;
  cost: number;
  durationMs: number;
  status: "success" | "failed" | "blocked_quota";
  errorMessage: string | null;
  createdAt: string;
};

export type AiBudgetSettings = {
  monthlyBudgetUsd: number;
  warn50: boolean;
  warn80: boolean;
  warn100: boolean;
};

export type AdminAiAnalyticsSnapshot = {
  configured: boolean;
  serviceRoleConfigured: boolean;
  loadError: string | null;
  budget: AiBudgetSettings;
  kpis: {
    totalRequests: number;
    activeAiUsers: number;
    requestsToday: number;
    requestsThisMonth: number;
    costToday: number;
    costThisWeek: number;
    costThisMonth: number;
    lifetimeCost: number;
    averageResponseTimeMs: number;
    totalTokensUsed: number;
    failedRequests: number;
    errorRatePct: number;
    streamingSuccessRatePct: number;
  };
  membership: Record<FireAiMembershipPlan, {
    users: number;
    requests: number;
    tokens: number;
    cost: number;
    averageCostPerUser: number;
    remainingQuota: number;
  }>;
  charts: {
    daily: AiAnalyticsPoint[];
    monthly: AiAnalyticsPoint[];
  };
  topUsers: AiAnalyticsRow[];
  costPerUser: AiAnalyticsRow[];
  features: AiFeatureAnalytics[];
  logs: AiLogRow[];
};

type UsageRow = {
  id: string;
  user_id: string;
  conversation_id: string | null;
  model: string;
  membership_plan: FireAiMembershipPlan;
  ai_feature?: string | null;
  status?: "success" | "failed" | "blocked_quota" | null;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  estimated_cost: number;
  response_time: number;
  error_message?: string | null;
  created_at: string;
};

const FEATURE_LABELS: Record<string, string> = {
  ai_chat: "AI Chat",
  expense_insights: "Expense Insights",
  wealth_summary: "Wealth Summary",
  fire_guidance: "FIRE Guidance",
  cashflow_ai: "Cashflow AI",
  ocr_payslip_ai: "OCR Payslip AI",
  portfolio_ai: "Portfolio AI",
  return_planner_ai: "Return Planner AI",
};

function emptyBudget(): AiBudgetSettings {
  return { monthlyBudgetUsd: 25, warn50: true, warn80: true, warn100: true };
}

function emptySnapshot(loadError: string | null, serviceRoleConfigured: boolean): AdminAiAnalyticsSnapshot {
  return {
    configured: isSupabaseConfigured(),
    serviceRoleConfigured,
    loadError,
    budget: emptyBudget(),
    kpis: {
      totalRequests: 0,
      activeAiUsers: 0,
      requestsToday: 0,
      requestsThisMonth: 0,
      costToday: 0,
      costThisWeek: 0,
      costThisMonth: 0,
      lifetimeCost: 0,
      averageResponseTimeMs: 0,
      totalTokensUsed: 0,
      failedRequests: 0,
      errorRatePct: 0,
      streamingSuccessRatePct: 100,
    },
    membership: {
      free: { users: 0, requests: 0, tokens: 0, cost: 0, averageCostPerUser: 0, remainingQuota: 0 },
      premium: { users: 0, requests: 0, tokens: 0, cost: 0, averageCostPerUser: 0, remainingQuota: 0 },
      elite: { users: 0, requests: 0, tokens: 0, cost: 0, averageCostPerUser: 0, remainingQuota: 0 },
    },
    charts: { daily: [], monthly: [] },
    topUsers: [],
    costPerUser: [],
    features: Object.entries(FEATURE_LABELS).map(([id, label]) => ({ id, label, requests: 0, tokens: 0, cost: 0 })),
    logs: [],
  };
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function monthKey(d: Date): string {
  return d.toISOString().slice(0, 7);
}

function plan(value: unknown): FireAiMembershipPlan {
  return value === "premium" || value === "elite" ? value : "free";
}

function roundCost(n: number): number {
  return Number(n.toFixed(8));
}

export async function fetchAdminAiAnalyticsSnapshot(): Promise<AdminAiAnalyticsSnapshot> {
  if (!isSupabaseConfigured()) return emptySnapshot("Supabase is not configured.", false);
  const sb = createSupabaseServiceRoleClient();
  if (!sb) return emptySnapshot("SUPABASE_SERVICE_ROLE_KEY is not set.", false);

  const now = new Date();
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const weekStart = new Date(todayStart);
  weekStart.setUTCDate(weekStart.getUTCDate() - 6);
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const thirtyAgo = new Date(todayStart);
  thirtyAgo.setUTCDate(thirtyAgo.getUTCDate() - 29);

  let loadError: string | null = null;
  const { data: eventsRaw, error } = await sb
    .from("fire_ai_usage_events")
    .select("id,user_id,conversation_id,model,membership_plan,ai_feature,status,prompt_tokens,completion_tokens,total_tokens,estimated_cost,response_time,error_message,created_at")
    .order("created_at", { ascending: false })
    .limit(50000);

  if (error) return emptySnapshot(error.message, true);

  const events = (eventsRaw ?? []) as UsageRow[];
  const userIds = Array.from(new Set(events.map((event) => event.user_id)));

  const profileByUser = new Map<string, { name: string; email: string }>();
  if (userIds.length > 0) {
    const { data: profiles, error: profileErr } = await sb
      .from("user_profiles")
      .select("id, display_name")
      .in("id", userIds.slice(0, 1000));
    if (profileErr) loadError = profileErr.message;
    for (const row of profiles ?? []) {
      profileByUser.set(row.id, { name: row.display_name ?? row.id.slice(0, 8), email: row.id });
    }
  }

  const settingsRes = await sb.from("fire_ai_admin_settings").select("*").eq("id", "global").maybeSingle();
  const settings = settingsRes.data;
  const budget: AiBudgetSettings = settings
    ? {
        monthlyBudgetUsd: Number(settings.monthly_budget_usd) || 25,
        warn50: settings.warn_50_enabled,
        warn80: settings.warn_80_enabled,
        warn100: settings.warn_100_enabled,
      }
    : emptyBudget();

  const dailyMap = new Map<string, AiAnalyticsPoint>();
  for (let i = 29; i >= 0; i -= 1) {
    const d = new Date(todayStart);
    d.setUTCDate(d.getUTCDate() - i);
    dailyMap.set(dayKey(d), { label: dayKey(d).slice(5), requests: 0, cost: 0, tokens: 0 });
  }

  const monthlyMap = new Map<string, AiAnalyticsPoint>();
  for (let i = 11; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    monthlyMap.set(monthKey(d), { label: monthKey(d), requests: 0, cost: 0, tokens: 0 });
  }

  const snapshot = emptySnapshot(loadError, true);
  snapshot.budget = budget;
  const usersByPlan: Record<FireAiMembershipPlan, Set<string>> = { free: new Set(), premium: new Set(), elite: new Set() };
  const byUser = new Map<string, AiAnalyticsRow>();
  const features = new Map<string, AiFeatureAnalytics>(snapshot.features.map((f) => [f.id, f]));
  let responseTotal = 0;
  let responseCount = 0;

  for (const event of events) {
    const created = new Date(event.created_at);
    const status = event.status ?? "success";
    const cost = Number(event.estimated_cost ?? 0);
    const tokens = Number(event.total_tokens ?? 0);
    const membership = plan(event.membership_plan);
    const featureId = event.ai_feature || "ai_chat";
    const isSuccess = status === "success";

    snapshot.kpis.totalRequests += 1;
    snapshot.kpis.lifetimeCost += cost;
    snapshot.kpis.totalTokensUsed += tokens;
    if (status === "failed") snapshot.kpis.failedRequests += 1;
    if (created >= todayStart) {
      snapshot.kpis.requestsToday += 1;
      snapshot.kpis.costToday += cost;
    }
    if (created >= weekStart) snapshot.kpis.costThisWeek += cost;
    if (created >= monthStart) {
      snapshot.kpis.requestsThisMonth += 1;
      snapshot.kpis.costThisMonth += cost;
    }
    if (event.response_time > 0) {
      responseTotal += event.response_time;
      responseCount += 1;
    }

    usersByPlan[membership].add(event.user_id);
    const membershipBucket = snapshot.membership[membership];
    membershipBucket.requests += 1;
    membershipBucket.tokens += tokens;
    membershipBucket.cost += cost;

    const userProfile = profileByUser.get(event.user_id);
    const userRow = byUser.get(event.user_id) ?? {
      id: event.user_id,
      label: userProfile?.name ?? event.user_id.slice(0, 8),
      detail: userProfile?.email ?? event.user_id,
      membership,
      requests: 0,
      tokens: 0,
      cost: 0,
      lastActivity: null,
    };
    userRow.requests += 1;
    userRow.tokens += tokens;
    userRow.cost += cost;
    if (!userRow.lastActivity || event.created_at > userRow.lastActivity) userRow.lastActivity = event.created_at;
    byUser.set(event.user_id, userRow);

    const feature = features.get(featureId) ?? { id: featureId, label: FEATURE_LABELS[featureId] ?? featureId, requests: 0, tokens: 0, cost: 0 };
    feature.requests += 1;
    feature.tokens += tokens;
    feature.cost += cost;
    features.set(featureId, feature);

    const day = dailyMap.get(dayKey(created));
    if (day) {
      day.requests += 1;
      day.cost += cost;
      day.tokens += tokens;
    }
    const month = monthlyMap.get(monthKey(created));
    if (month) {
      month.requests += 1;
      month.cost += cost;
      month.tokens += tokens;
    }

    if (snapshot.logs.length < 250) {
      snapshot.logs.push({
        id: event.id,
        userId: event.user_id,
        userLabel: userProfile?.name ?? event.user_id.slice(0, 8),
        membership,
        aiFeature: featureId,
        model: event.model,
        tokens,
        cost,
        durationMs: event.response_time,
        status,
        errorMessage: event.error_message ?? null,
        createdAt: event.created_at,
      });
    }
  }

  snapshot.kpis.activeAiUsers = byUser.size;
  snapshot.kpis.averageResponseTimeMs = responseCount ? Math.round(responseTotal / responseCount) : 0;
  snapshot.kpis.errorRatePct = snapshot.kpis.totalRequests ? Math.round((snapshot.kpis.failedRequests / snapshot.kpis.totalRequests) * 1000) / 10 : 0;
  const successCount = events.filter((e) => (e.status ?? "success") === "success").length;
  snapshot.kpis.streamingSuccessRatePct = snapshot.kpis.totalRequests ? Math.round((successCount / snapshot.kpis.totalRequests) * 1000) / 10 : 100;
  snapshot.kpis.costToday = roundCost(snapshot.kpis.costToday);
  snapshot.kpis.costThisWeek = roundCost(snapshot.kpis.costThisWeek);
  snapshot.kpis.costThisMonth = roundCost(snapshot.kpis.costThisMonth);
  snapshot.kpis.lifetimeCost = roundCost(snapshot.kpis.lifetimeCost);

  (["free", "premium", "elite"] as FireAiMembershipPlan[]).forEach((p) => {
    const bucket = snapshot.membership[p];
    bucket.users = usersByPlan[p].size;
    bucket.cost = roundCost(bucket.cost);
    bucket.averageCostPerUser = bucket.users ? roundCost(bucket.cost / bucket.users) : 0;
    const quota = FIRE_AI_QUOTAS[p].messages;
    bucket.remainingQuota = Math.max(0, quota * Math.max(1, bucket.users) - bucket.requests);
  });

  snapshot.charts.daily = Array.from(dailyMap.values()).map((p) => ({ ...p, cost: roundCost(p.cost) }));
  snapshot.charts.monthly = Array.from(monthlyMap.values()).map((p) => ({ ...p, cost: roundCost(p.cost) }));
  snapshot.topUsers = Array.from(byUser.values()).sort((a, b) => b.requests - a.requests).slice(0, 50).map((row) => ({ ...row, cost: roundCost(row.cost) }));
  snapshot.costPerUser = Array.from(byUser.values()).sort((a, b) => b.cost - a.cost).slice(0, 50).map((row) => ({ ...row, cost: roundCost(row.cost) }));
  snapshot.features = Array.from(features.values()).map((f) => ({ ...f, cost: roundCost(f.cost) })).sort((a, b) => b.requests - a.requests);

  return snapshot;
}
