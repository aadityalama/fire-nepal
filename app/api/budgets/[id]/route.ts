import { NextResponse } from "next/server";
import {
  BUDGET_NOTIFICATION_OPTIONS,
  defaultBudgetNotificationSettings,
  type BudgetAiRecommendation,
  type BudgetNotificationSettings,
  type BudgetPeriod,
  type CreateBudgetInput,
} from "@/lib/budget/types";
import { createMutationTimer, withApiRouteTiming } from "@/lib/mutation-perf";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  deleteBudgetRecordForUser,
  updateBudgetRecordForUser,
} from "@/services/budget-supabase";

function bad(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}

function sanitizePeriod(value: unknown): BudgetPeriod | null {
  return value === "Monthly" || value === "Yearly" ? value : null;
}

function sanitizeNotificationSettings(raw: unknown): BudgetNotificationSettings {
  const defaults = defaultBudgetNotificationSettings();
  if (!raw || typeof raw !== "object") return defaults;
  const source = raw as Record<string, unknown>;
  const out = { ...defaults };
  for (const key of BUDGET_NOTIFICATION_OPTIONS) {
    if (typeof source[key] === "boolean") out[key] = source[key];
  }
  return out;
}

function sanitizeAiRecommendation(raw: unknown): BudgetAiRecommendation | null {
  if (!raw || typeof raw !== "object") return null;
  const source = raw as Partial<BudgetAiRecommendation>;
  if (typeof source.title !== "string" || typeof source.message !== "string") return null;
  return {
    title: source.title,
    message: source.message,
    available: Boolean(source.available),
    recommendedMonthlyNpr:
      typeof source.recommendedMonthlyNpr === "number" ? source.recommendedMonthlyNpr : null,
    potentialSavingsNpr: typeof source.potentialSavingsNpr === "number" ? source.potentialSavingsNpr : null,
    confidence: typeof source.confidence === "number" ? source.confidence : null,
  };
}

function sanitizeCreateInput(raw: unknown): CreateBudgetInput | null {
  if (!raw || typeof raw !== "object") return null;
  const source = raw as Record<string, unknown>;
  const period = sanitizePeriod(source.period);
  const amountNpr = typeof source.amountNpr === "number" ? source.amountNpr : Number(source.amountNpr);
  const category = typeof source.category === "string" ? source.category.trim() : "";
  if (!period || !Number.isFinite(amountNpr) || amountNpr <= 0 || !category) return null;

  return {
    name: typeof source.name === "string" ? source.name.trim() : category,
    category,
    icon: typeof source.icon === "string" && source.icon.trim() ? source.icon.trim() : "💼",
    gradient:
      typeof source.gradient === "string" && source.gradient.trim()
        ? source.gradient.trim()
        : "from-emerald-300 to-lime-300",
    period,
    amountNpr: Math.round(amountNpr),
    notificationSettings: sanitizeNotificationSettings(source.notificationSettings),
    aiRecommendation: sanitizeAiRecommendation(source.aiRecommendation),
  };
}

type RouteContext = { params: Promise<{ id: string }> };

async function patchBudgetHandler(req: Request, { params }: RouteContext) {
  if (!isSupabaseConfigured()) return bad("Supabase is not configured", 503);
  const timer = createMutationTimer("api:budgets:id:patch:handler");

  const { id } = await timer.track("serialization", () => params);
  if (!id) return bad("Missing budget id");

  let raw: unknown;
  try {
    raw = await timer.track("serialization", () => req.json());
  } catch {
    return bad("Invalid JSON");
  }

  const input = timer.trackSync("serialization", () => sanitizeCreateInput(raw));
  if (!input) return bad("Invalid budget payload");

  try {
    const sb = await timer.track("auth", () => createServerSupabaseClient());
    const { data } = await timer.track("auth", () => sb.auth.getUser());
    if (!data.user) return bad("Please sign in to update your budget.", 401);

    const budget = await timer.track("database", () => updateBudgetRecordForUser(sb, data.user.id, id, input));
    const response = timer.trackSync("serialization", () => NextResponse.json({ ok: true, budget }));
    timer.flush({ status: response.status });
    return response;
  } catch (e) {
    timer.flush({ error: e instanceof Error ? e.message : "unknown" });
    return bad(e instanceof Error ? e.message : "Could not update budget.", 500);
  }
}

async function deleteBudgetHandler(_req: Request, { params }: RouteContext) {
  if (!isSupabaseConfigured()) return bad("Supabase is not configured", 503);
  const timer = createMutationTimer("api:budgets:id:delete:handler");

  const { id } = await timer.track("serialization", () => params);
  if (!id) return bad("Missing budget id");

  try {
    const sb = await timer.track("auth", () => createServerSupabaseClient());
    const { data } = await timer.track("auth", () => sb.auth.getUser());
    if (!data.user) return bad("Please sign in to delete your budget.", 401);

    await timer.track("database", () => deleteBudgetRecordForUser(sb, data.user.id, id));
    const response = timer.trackSync("serialization", () => NextResponse.json({ ok: true }));
    timer.flush({ status: response.status });
    return response;
  } catch (e) {
    timer.flush({ error: e instanceof Error ? e.message : "unknown" });
    return bad(e instanceof Error ? e.message : "Could not delete budget.", 500);
  }
}

export const PATCH = withApiRouteTiming<RouteContext>("budgets:id:PATCH", patchBudgetHandler);
export const DELETE = withApiRouteTiming<RouteContext>("budgets:id:DELETE", deleteBudgetHandler);
