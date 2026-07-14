import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { getMembershipByUserId } from "@/services/membership-service";
import type { Database } from "@/types/supabase-database";

export type FireAiMembershipPlan = "free" | "premium" | "elite";
export type FireAiQuotaScope = "day" | "month";

export type FireAiQuotaSnapshot = {
  plan: FireAiMembershipPlan;
  scope: FireAiQuotaScope;
  limit: number;
  used: number;
  remaining: number;
  resetAt: string;
  usageMonth: string;
  tokensUsedThisMonth: number;
  estimatedCostThisMonth: number;
};

export type FireAiUsageRecordInput = {
  userId: string;
  conversationId: string | null;
  model: string;
  aiFeature?: string;
  membershipPlan: FireAiMembershipPlan;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
  responseTimeMs: number;
};

export type FireAiFailureRecordInput = {
  userId: string;
  conversationId?: string | null;
  model?: string;
  aiFeature?: string;
  membershipPlan: FireAiMembershipPlan;
  status: "failed" | "blocked_quota";
  errorMessage: string;
  responseTimeMs?: number;
};

export const FIRE_AI_QUOTAS: Record<FireAiMembershipPlan, { scope: FireAiQuotaScope; messages: number }> = {
  free: { scope: "day", messages: 20 },
  premium: { scope: "month", messages: 500 },
  elite: { scope: "month", messages: 2000 },
};

const OPENAI_TOKEN_PRICING_USD_PER_1M: Record<string, { input: number; output: number }> = {
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
};

function usageMonth(date = new Date()): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthStartIso(date = new Date()): string {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)).toISOString();
}

function nextMonthStartIso(date = new Date()): string {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1)).toISOString();
}

function dayStartIso(date = new Date()): string {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())).toISOString();
}

function nextDayStartIso(date = new Date()): string {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1)).toISOString();
}

function normalizePlan(value: unknown): FireAiMembershipPlan {
  return value === "premium" || value === "elite" ? value : "free";
}

function serviceClient(): SupabaseClient<Database> {
  const sb = createSupabaseServiceRoleClient();
  if (!sb) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for FIRE AI usage enforcement.");
  return sb;
}

export function estimateOpenAiCostUsd(
  model: string,
  promptTokens: number,
  completionTokens: number,
): number {
  const pricing = OPENAI_TOKEN_PRICING_USD_PER_1M[model] ?? OPENAI_TOKEN_PRICING_USD_PER_1M["gpt-4o-mini"];
  const cost = (promptTokens / 1_000_000) * pricing.input + (completionTokens / 1_000_000) * pricing.output;
  return Number(cost.toFixed(8));
}

/** AI quotas — accessPlan from user_profiles only (MembershipService). */
export async function resolveFireAiMembershipPlan(userId: string): Promise<FireAiMembershipPlan> {
  const sb = serviceClient();
  try {
    const membership = await getMembershipByUserId(sb, userId);
    return normalizePlan(membership.accessPlan);
  } catch (e) {
    // Fail closed for quotas only — never write Free into user_profiles.
    console.error("[fire-ai] membership load failed; applying free quota without mutating SOT", e);
    return "free";
  }
}

export async function syncFireAiMonthlyUsage(
  userId: string,
  plan: FireAiMembershipPlan,
): Promise<{ messages: number; tokens: number; cost: number }> {
  const sb = serviceClient();
  const month = usageMonth();
  const from = monthStartIso();
  const quota = FIRE_AI_QUOTAS[plan];

  const { data, error } = await sb
    .from("fire_ai_usage_events")
    .select("total_tokens, estimated_cost")
    .eq("user_id", userId)
    .eq("status", "success")
    .gte("created_at", from);

  if (error) throw new Error(formatFireAiUsageDbError(error.message));

  const rows = data ?? [];
  const messages = rows.length;
  const tokens = rows.reduce((sum, row) => sum + (row.total_tokens ?? 0), 0);
  const cost = Number(rows.reduce((sum, row) => sum + Number(row.estimated_cost ?? 0), 0).toFixed(8));
  const remaining =
    quota.scope === "month" ? Math.max(0, quota.messages - messages) : Math.max(0, quota.messages - (await countToday(userId)));

  const { error: upsertError } = await sb.from("fire_ai_monthly_usage").upsert(
    {
      user_id: userId,
      usage_month: month,
      ai_messages_used: messages,
      tokens_used: tokens,
      estimated_openai_cost: cost,
      current_membership: plan,
      remaining_quota: remaining,
      reset_at: nextMonthStartIso(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,usage_month" },
  );

  if (upsertError) throw new Error(formatFireAiUsageDbError(upsertError.message));
  return { messages, tokens, cost };
}

async function countToday(userId: string): Promise<number> {
  const sb = serviceClient();
  const { count, error } = await sb
    .from("fire_ai_usage_events")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "success")
    .gte("created_at", dayStartIso());
  if (error) throw new Error(formatFireAiUsageDbError(error.message));
  return count ?? 0;
}

export async function getFireAiQuotaSnapshot(userId: string): Promise<FireAiQuotaSnapshot> {
  const plan = await resolveFireAiMembershipPlan(userId);
  const quota = FIRE_AI_QUOTAS[plan];
  const monthly = await syncFireAiMonthlyUsage(userId, plan);
  const used = quota.scope === "day" ? await countToday(userId) : monthly.messages;

  return {
    plan,
    scope: quota.scope,
    limit: quota.messages,
    used,
    remaining: Math.max(0, quota.messages - used),
    resetAt: quota.scope === "day" ? nextDayStartIso() : nextMonthStartIso(),
    usageMonth: usageMonth(),
    tokensUsedThisMonth: monthly.tokens,
    estimatedCostThisMonth: monthly.cost,
  };
}

export async function assertFireAiQuota(userId: string): Promise<FireAiQuotaSnapshot> {
  const quota = await getFireAiQuotaSnapshot(userId);
  if (quota.remaining <= 0) {
    throw new FireAiQuotaExceededError(quota);
  }
  return quota;
}

export class FireAiQuotaExceededError extends Error {
  constructor(public readonly quota: FireAiQuotaSnapshot) {
    super("AI usage limit reached");
    this.name = "FireAiQuotaExceededError";
  }
}

export async function recordFireAiUsage(input: FireAiUsageRecordInput): Promise<FireAiQuotaSnapshot> {
  const sb = serviceClient();
  const { error } = await sb.from("fire_ai_usage_events").insert({
    user_id: input.userId,
    conversation_id: input.conversationId,
    model: input.model,
    ai_feature: input.aiFeature ?? "ai_chat",
    membership_plan: input.membershipPlan,
    status: "success",
    prompt_tokens: input.promptTokens,
    completion_tokens: input.completionTokens,
    total_tokens: input.totalTokens,
    estimated_cost: input.estimatedCost,
    response_time: Math.max(0, Math.round(input.responseTimeMs)),
  });

  if (error) throw new Error(formatFireAiUsageDbError(error.message));
  return getFireAiQuotaSnapshot(input.userId);
}

export async function recordFireAiRequestFailure(input: FireAiFailureRecordInput): Promise<void> {
  const sb = serviceClient();
  const { error } = await sb.from("fire_ai_usage_events").insert({
    user_id: input.userId,
    conversation_id: input.conversationId ?? null,
    model: input.model ?? "gpt-4o-mini",
    ai_feature: input.aiFeature ?? "ai_chat",
    membership_plan: input.membershipPlan,
    status: input.status,
    prompt_tokens: 0,
    completion_tokens: 0,
    total_tokens: 0,
    estimated_cost: 0,
    response_time: Math.max(0, Math.round(input.responseTimeMs ?? 0)),
    error_message: input.errorMessage.slice(0, 500),
  });
  if (error) {
    console.warn("[fire-ai-usage] failed request log skipped", error.message);
  }
}

export function formatFireAiUsageDbError(message: string): string {
  if (message.includes("fire_ai_usage_events") || message.includes("fire_ai_monthly_usage")) {
    return "FIRE AI usage tracking is not ready. Apply the fire_ai_usage_tracking migration.";
  }
  return message;
}
