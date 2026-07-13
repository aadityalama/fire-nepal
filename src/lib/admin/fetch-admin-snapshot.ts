import "server-only";

import { endOfDay, formatISO, startOfDay, subDays } from "date-fns";
import type { User } from "@supabase/supabase-js";
import { listAllAuthUsers } from "@/lib/admin/list-all-auth-users";
import { buildMembershipRenewalSnapshot, type AdminMembershipRenewalSnapshot } from "@/lib/admin/membership-renewal-snapshot";
import {
  buildMembershipRenewalReminderSnapshot,
  emptyMembershipRenewalReminderSnapshot,
  type MembershipRenewalReminderSnapshot,
} from "@/lib/admin/membership-renewal-reminder-snapshot";
import { effectiveMembershipPeriodEnd } from "@/lib/membership-effective-period-end";
import { membershipUiBucket, type PlanType } from "@/lib/membership-profile-status";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export type AdminSignupRow = {
  id: string;
  name: string;
  email: string;
  joinedAt: string;
  planType: "free" | "premium" | "elite";
};

export type AdminDailyPoint = { date: string; value: number };

export type AdminMembershipRequestsSummary = {
  pending: number;
  approvedToday: number;
  rejectedToday: number;
};

export type AdminAiAnalyticsRow = {
  id: string;
  label: string;
  detail: string;
  messages: number;
  tokens: number;
  cost: number;
};

export type AdminAiAnalytics = {
  totalCost: number;
  costToday: number;
  costThisMonth: number;
  tokensToday: number;
  tokensThisMonth: number;
  averageResponseTimeMs: number;
  mostActiveUsers: AdminAiAnalyticsRow[];
  costPerUser: AdminAiAnalyticsRow[];
  costPerMembership: AdminAiAnalyticsRow[];
  mostExpensiveConversations: AdminAiAnalyticsRow[];
};

export type AdminSnapshot = {
  configured: boolean;
  serviceRoleConfigured: boolean;
  /** When service role or listUsers fails, partial UI still renders. */
  loadError: string | null;
  membershipRenewal: AdminMembershipRenewalSnapshot;
  membershipRenewalReminders: MembershipRenewalReminderSnapshot;
  membershipRequestsSummary: AdminMembershipRequestsSummary;
  aiAnalytics: AdminAiAnalytics;
  metrics: {
    totalUsers: number;
    newUsersToday: number;
    activeUsers7d: number;
    premiumUsers: number;
    /** Paid + not expired + not suspended + not archived (membershipUiBucket active). */
    activeMembersCount: number;
    suspendedMembersCount: number;
    archivedMembersCount: number;
    totalRevenueNpr: number;
    reminderEmailsSent: number;
    totalRemindersCreated: number;
    upcomingReminders: number;
    overdueReminders: number;
  };
  reminderEngine: {
    emailsSentToday: number;
    emailsSentThisMonth: number;
    failedEmails: number;
    pendingReminders: number;
    upcomingScheduled: number;
  };
  recentSignups: AdminSignupRow[];
  charts: {
    userGrowth30d: AdminDailyPoint[];
    reminderActivity30d: AdminDailyPoint[];
    revenueTrend30d: AdminDailyPoint[];
    premiumConversion30d: AdminDailyPoint[];
  };
  systemHealth: {
    supabaseOk: boolean;
    supabaseMessage: string;
    resendOk: boolean | null;
    resendMessage: string;
    lastCronAt: string | null;
    lastCronStatus: string | null;
    membershipRenewalCronAt: string | null;
    membershipRenewalCronStatus: string | null;
    lastDeploymentSha: string | null;
    lastDeploymentAt: string | null;
  };
};

function dayKey(d: Date): string {
  return formatISO(d, { representation: "date" });
}

function bucketize(isoDates: string[], daysBack: number): AdminDailyPoint[] {
  const keys: string[] = [];
  for (let i = daysBack - 1; i >= 0; i--) {
    keys.push(dayKey(startOfDay(subDays(new Date(), i))));
  }
  const map = new Map(keys.map((k) => [k, 0]));
  for (const iso of isoDates) {
    const day = iso.slice(0, 10);
    if (map.has(day)) map.set(day, (map.get(day) ?? 0) + 1);
  }
  return keys.map((date) => ({ date, value: map.get(date) ?? 0 }));
}

function cumulativeSeries(daily: AdminDailyPoint[]): AdminDailyPoint[] {
  let acc = 0;
  return daily.map((p) => {
    acc += p.value;
    return { date: p.date, value: acc };
  });
}

function emptyMembershipRenewal(): AdminMembershipRenewalSnapshot {
  return {
    queue: { expiringIn7Days: 0, expiringIn30DaysExcluding7: 0, alreadyExpired: 0 },
    kpi: { expiringThisWeek: 0, expiredMembers: 0, pendingRenewals: 0 },
    expiringSoonWidget: [],
    expiredWidget: [],
  };
}

function emptyMembershipRequestsSummary(): AdminMembershipRequestsSummary {
  return { pending: 0, approvedToday: 0, rejectedToday: 0 };
}

function emptyAiAnalytics(): AdminAiAnalytics {
  return {
    totalCost: 0,
    costToday: 0,
    costThisMonth: 0,
    tokensToday: 0,
    tokensThisMonth: 0,
    averageResponseTimeMs: 0,
    mostActiveUsers: [],
    costPerUser: [],
    costPerMembership: [],
    mostExpensiveConversations: [],
  };
}

export async function fetchAdminSnapshot(): Promise<AdminSnapshot> {
  const emptyCharts = (): AdminSnapshot["charts"] => ({
    userGrowth30d: [],
    reminderActivity30d: [],
    revenueTrend30d: [],
    premiumConversion30d: [],
  });

  if (!isSupabaseConfigured()) {
    return {
      configured: false,
      serviceRoleConfigured: false,
      loadError: "Supabase is not configured.",
      membershipRenewal: emptyMembershipRenewal(),
      membershipRenewalReminders: emptyMembershipRenewalReminderSnapshot(),
      membershipRequestsSummary: emptyMembershipRequestsSummary(),
      aiAnalytics: emptyAiAnalytics(),
      metrics: {
        totalUsers: 0,
        newUsersToday: 0,
        activeUsers7d: 0,
        premiumUsers: 0,
        activeMembersCount: 0,
        suspendedMembersCount: 0,
        archivedMembersCount: 0,
        totalRevenueNpr: 0,
        reminderEmailsSent: 0,
        totalRemindersCreated: 0,
        upcomingReminders: 0,
        overdueReminders: 0,
      },
      reminderEngine: {
        emailsSentToday: 0,
        emailsSentThisMonth: 0,
        failedEmails: 0,
        pendingReminders: 0,
        upcomingScheduled: 0,
      },
      recentSignups: [],
      charts: emptyCharts(),
      systemHealth: {
        supabaseOk: false,
        supabaseMessage: "Not configured",
        resendOk: null,
        resendMessage: "Unknown",
        lastCronAt: null,
        lastCronStatus: null,
        membershipRenewalCronAt: null,
        membershipRenewalCronStatus: null,
        lastDeploymentSha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
        lastDeploymentAt: process.env.VERCEL_DEPLOYMENT_CREATED_AT ?? null,
      },
    };
  }

  const sb = createSupabaseServiceRoleClient();
  const serviceRoleConfigured = Boolean(sb);

  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());
  const sevenAgo = startOfDay(subDays(new Date(), 7));
  const thirtyAgo = startOfDay(subDays(new Date(), 30));
  const monthStart = startOfDay(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const todayStr = dayKey(new Date());

  let loadError: string | null = null;
  let users: User[] = [];
  if (sb) {
    const res = await listAllAuthUsers();
    users = res.users;
    loadError = res.error;
  } else {
    loadError = "SUPABASE_SERVICE_ROLE_KEY is not set — admin metrics need the service role on the server.";
  }

  const profileByUser = new Map<
    string,
    {
      plan_type: string;
      last_active_at: string | null;
      suspended_at: string | null;
      archived_at: string | null;
    }
  >();
  if (sb) {
    const { data: profiles, error: pErr } = await sb
      .from("profiles")
      .select("id, plan_type, last_active_at, suspended_at, archived_at");
    if (pErr) loadError = loadError ?? pErr.message;
    for (const row of profiles ?? []) {
      profileByUser.set(row.id, {
        plan_type: row.plan_type,
        last_active_at: row.last_active_at,
        suspended_at: row.suspended_at,
        archived_at: (row as { archived_at?: string | null }).archived_at ?? null,
      });
    }
  }

  const subEndByUser = new Map<string, string | null>();
  if (sb) {
    const { data: subs, error: sErr } = await sb.from("subscriptions").select("user_id, current_period_end");
    if (sErr) loadError = loadError ?? sErr.message;
    for (const row of subs ?? []) {
      subEndByUser.set(row.user_id, row.current_period_end);
    }
  }

  let pendingMembershipRequests = 0;
  let approvedMembershipToday = 0;
  let rejectedMembershipToday = 0;
  if (sb) {
    const { count: pendC, error: pendErr } = await sb
      .from("membership_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");
    if (pendErr) loadError = loadError ?? pendErr.message;
    pendingMembershipRequests = pendC ?? 0;

    const { data: reviewedToday, error: revErr } = await sb
      .from("membership_requests")
      .select("status, reviewed_at")
      .not("reviewed_at", "is", null)
      .gte("reviewed_at", todayStart.toISOString())
      .lte("reviewed_at", todayEnd.toISOString());
    if (revErr) loadError = loadError ?? revErr.message;
    for (const row of reviewedToday ?? []) {
      if (row.status === "approved") approvedMembershipToday += 1;
      if (row.status === "rejected") rejectedMembershipToday += 1;
    }
  }

  const userProfilesName = new Map<string, string | null>();
  if (sb) {
    const { data: ups, error: uErr } = await sb.from("user_profiles").select("id, full_name");
    if (uErr) loadError = loadError ?? uErr.message;
    for (const row of ups ?? []) {
      userProfilesName.set(row.id, row.full_name);
    }
  }

  const emailByUser = new Map(users.map((u) => [u.id, u.email ?? "—"]));
  const nameForUser = (userId: string): string => userProfilesName.get(userId)?.trim() || "—";
  const detailForUser = (userId: string): string => emailByUser.get(userId) ?? userId;

  let aiAnalytics = emptyAiAnalytics();
  if (sb) {
    const { data: events, error: aiErr } = await sb
      .from("fire_ai_usage_events")
      .select("user_id, conversation_id, membership_plan, total_tokens, estimated_cost, response_time, created_at")
      .order("created_at", { ascending: false })
      .limit(50000);

    if (aiErr) {
      if (!aiErr.message.includes("fire_ai_usage_events")) loadError = loadError ?? aiErr.message;
    } else {
      const rows = events ?? [];
      const conversationIds = Array.from(new Set(rows.map((r) => r.conversation_id).filter((id): id is string => Boolean(id))));
      const conversationTitleById = new Map<string, string>();
      if (conversationIds.length > 0) {
        const { data: convRows } = await sb
          .from("fire_ai_conversations")
          .select("id, title")
          .in("id", conversationIds.slice(0, 1000));
        for (const row of convRows ?? []) conversationTitleById.set(row.id, row.title);
      }

      const byUser = new Map<string, { messages: number; tokens: number; cost: number }>();
      const byPlan = new Map<string, { messages: number; tokens: number; cost: number }>();
      const byConversation = new Map<string, { messages: number; tokens: number; cost: number }>();
      let responseTotal = 0;
      let responseCount = 0;

      for (const row of rows) {
        const cost = Number(row.estimated_cost ?? 0);
        const tokens = Number(row.total_tokens ?? 0);
        const created = row.created_at ? new Date(row.created_at) : null;

        aiAnalytics.totalCost += cost;
        if (created && created >= todayStart) {
          aiAnalytics.costToday += cost;
          aiAnalytics.tokensToday += tokens;
        }
        if (created && created >= monthStart) {
          aiAnalytics.costThisMonth += cost;
          aiAnalytics.tokensThisMonth += tokens;
        }
        if (Number.isFinite(row.response_time) && row.response_time > 0) {
          responseTotal += row.response_time;
          responseCount += 1;
        }

        const userAgg = byUser.get(row.user_id) ?? { messages: 0, tokens: 0, cost: 0 };
        userAgg.messages += 1;
        userAgg.tokens += tokens;
        userAgg.cost += cost;
        byUser.set(row.user_id, userAgg);

        const plan = row.membership_plan ?? "free";
        const planAgg = byPlan.get(plan) ?? { messages: 0, tokens: 0, cost: 0 };
        planAgg.messages += 1;
        planAgg.tokens += tokens;
        planAgg.cost += cost;
        byPlan.set(plan, planAgg);

        if (row.conversation_id) {
          const convAgg = byConversation.get(row.conversation_id) ?? { messages: 0, tokens: 0, cost: 0 };
          convAgg.messages += 1;
          convAgg.tokens += tokens;
          convAgg.cost += cost;
          byConversation.set(row.conversation_id, convAgg);
        }
      }

      const toUserRow = ([id, agg]: [string, { messages: number; tokens: number; cost: number }]): AdminAiAnalyticsRow => ({
        id,
        label: nameForUser(id),
        detail: detailForUser(id),
        messages: agg.messages,
        tokens: agg.tokens,
        cost: Number(agg.cost.toFixed(8)),
      });
      const toGenericRow = ([id, agg]: [string, { messages: number; tokens: number; cost: number }]): AdminAiAnalyticsRow => ({
        id,
        label: id,
        detail: id,
        messages: agg.messages,
        tokens: agg.tokens,
        cost: Number(agg.cost.toFixed(8)),
      });
      const toConversationRow = ([id, agg]: [string, { messages: number; tokens: number; cost: number }]): AdminAiAnalyticsRow => ({
        id,
        label: conversationTitleById.get(id) ?? "Untitled conversation",
        detail: id,
        messages: agg.messages,
        tokens: agg.tokens,
        cost: Number(agg.cost.toFixed(8)),
      });

      aiAnalytics = {
        ...aiAnalytics,
        totalCost: Number(aiAnalytics.totalCost.toFixed(8)),
        costToday: Number(aiAnalytics.costToday.toFixed(8)),
        costThisMonth: Number(aiAnalytics.costThisMonth.toFixed(8)),
        averageResponseTimeMs: responseCount > 0 ? Math.round(responseTotal / responseCount) : 0,
        mostActiveUsers: Array.from(byUser.entries()).sort((a, b) => b[1].messages - a[1].messages).slice(0, 8).map(toUserRow),
        costPerUser: Array.from(byUser.entries()).sort((a, b) => b[1].cost - a[1].cost).slice(0, 8).map(toUserRow),
        costPerMembership: Array.from(byPlan.entries()).sort((a, b) => b[1].cost - a[1].cost).map(toGenericRow),
        mostExpensiveConversations: Array.from(byConversation.entries()).sort((a, b) => b[1].cost - a[1].cost).slice(0, 8).map(toConversationRow),
      };
    }
  }

  let totalRevenueNpr = 0;
  const revenueDays: string[] = [];
  if (sb) {
    const { data: rev, error: rErr } = await sb.from("revenue_events").select("amount_npr, created_at");
    if (rErr) loadError = loadError ?? rErr.message;
    for (const row of rev ?? []) {
      totalRevenueNpr += Number(row.amount_npr) || 0;
      if (row.created_at && new Date(row.created_at) >= thirtyAgo) {
        revenueDays.push(row.created_at);
      }
    }
  }

  let reminderEmailsSent = 0;
  const reminderSendTimes: string[] = [];
  if (sb) {
    const { count, error: cErr } = await sb
      .from("scheduled_reminder_email_sends")
      .select("*", { count: "exact", head: true });
    if (cErr) loadError = loadError ?? cErr.message;
    reminderEmailsSent = count ?? 0;

    const { data: sends, error: sErr } = await sb
      .from("scheduled_reminder_email_sends")
      .select("sent_at")
      .gte("sent_at", thirtyAgo.toISOString())
      .limit(20000);
    if (sErr) loadError = loadError ?? sErr.message;
    for (const row of sends ?? []) {
      if (row.sent_at) reminderSendTimes.push(row.sent_at);
    }
  }

  let totalReminders = 0;
  let upcomingReminders = 0;
  let overdueReminders = 0;
  let pendingReminders = 0;
  let upcomingScheduled = 0;
  if (sb) {
    const { count: tr, error: trErr } = await sb
      .from("scheduled_reminders")
      .select("*", { count: "exact", head: true });
    if (trErr) loadError = loadError ?? trErr.message;
    totalReminders = tr ?? 0;

    const { count: upc, error: upErr } = await sb
      .from("scheduled_reminders")
      .select("*", { count: "exact", head: true })
      .eq("is_completed", false)
      .gte("due_date", todayStr);
    if (upErr) loadError = loadError ?? upErr.message;
    upcomingReminders = upc ?? 0;
    upcomingScheduled = upc ?? 0;

    const { count: odc, error: odErr } = await sb
      .from("scheduled_reminders")
      .select("*", { count: "exact", head: true })
      .eq("is_completed", false)
      .lt("due_date", todayStr);
    if (odErr) loadError = loadError ?? odErr.message;
    overdueReminders = odc ?? 0;

    const { count: pnd, error: pnErr } = await sb
      .from("scheduled_reminders")
      .select("*", { count: "exact", head: true })
      .eq("is_completed", false);
    if (pnErr) loadError = loadError ?? pnErr.message;
    pendingReminders = pnd ?? 0;
  }

  let failedEmails = 0;
  let emailsSentToday = 0;
  let emailsSentThisMonth = 0;
  if (sb) {
    const { count: fe, error: feErr } = await sb
      .from("reminder_logs")
      .select("*", { count: "exact", head: true })
      .eq("event_type", "email_failed");
    if (feErr) loadError = loadError ?? feErr.message;
    failedEmails = fe ?? 0;

    const { data: todaySends, error: tErr } = await sb
      .from("scheduled_reminder_email_sends")
      .select("sent_at")
      .gte("sent_at", todayStart.toISOString())
      .lte("sent_at", todayEnd.toISOString());
    if (tErr) loadError = loadError ?? tErr.message;
    emailsSentToday = todaySends?.length ?? 0;

    const { data: monthSends, error: mErr } = await sb
      .from("scheduled_reminder_email_sends")
      .select("sent_at")
      .gte("sent_at", monthStart.toISOString());
    if (mErr) loadError = loadError ?? mErr.message;
    emailsSentThisMonth = monthSends?.length ?? 0;
  }

  const totalUsers = users.length;
  const newUsersToday = users.filter((u) => u.created_at && new Date(u.created_at) >= todayStart).length;
  const activeUsers7d = users.filter((u) => {
    if (profileByUser.get(u.id)?.archived_at) return false;
    return u.last_sign_in_at && new Date(u.last_sign_in_at) >= sevenAgo;
  }).length;
  const premiumUsers = users.filter((u) => {
    const p = profileByUser.get(u.id);
    if (p?.archived_at) return false;
    const plan = p?.plan_type;
    return plan === "premium" || plan === "elite";
  }).length;

  let activeMembersCount = 0;
  let suspendedMembersCount = 0;
  let archivedMembersCount = 0;
  for (const u of users) {
    const p = profileByUser.get(u.id);
    const archivedAt = p?.archived_at ?? null;
    if (archivedAt) {
      archivedMembersCount += 1;
      continue;
    }
    const suspendedAt = p?.suspended_at ?? null;
    if (suspendedAt) suspendedMembersCount += 1;
    const planRaw = p?.plan_type ?? "free";
    const planType: PlanType =
      planRaw === "premium" || planRaw === "elite" || planRaw === "free" ? planRaw : "free";
    const exp = effectiveMembershipPeriodEnd(subEndByUser.get(u.id), null);
    const bucket = membershipUiBucket({
      planType,
      expiresAtIso: exp,
      suspendedAtIso: suspendedAt,
      archivedAtIso: null,
    });
    if (bucket === "active") activeMembersCount += 1;
  }

  const createdTimes = users
    .map((u) => u.created_at)
    .filter((x): x is string => Boolean(x))
    .filter((iso) => new Date(iso) >= thirtyAgo);
  const userGrowth30d = cumulativeSeries(bucketize(createdTimes, 30));

  const reminderActivity30d = bucketize(reminderSendTimes, 30);
  const revenueTrend30d = bucketize(revenueDays, 30);

  const premiumConversion30d: AdminDailyPoint[] = [];
  for (let i = 29; i >= 0; i--) {
    const dayEnd = endOfDay(subDays(new Date(), i));
    const signedByEnd = users.filter((u) => u.created_at && new Date(u.created_at) <= dayEnd);
    const activeRoster = signedByEnd.filter((u) => !profileByUser.get(u.id)?.archived_at);
    const denom = activeRoster.length;
    const num = activeRoster.filter((u) => {
      const p = profileByUser.get(u.id)?.plan_type;
      return p === "premium" || p === "elite";
    }).length;
    const rate = denom > 0 ? Math.round((num / denom) * 1000) / 10 : 0;
    premiumConversion30d.push({ date: dayKey(startOfDay(subDays(new Date(), i))), value: rate });
  }

  const recentSignups: AdminSignupRow[] = [...users]
    .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""))
    .slice(0, 200)
    .map((u) => {
      const display = userProfilesName.get(u.id);
      const name = (display && display.trim()) || "—";
      const plan = profileByUser.get(u.id)?.plan_type;
      const planType =
        plan === "premium" || plan === "elite" || plan === "free" ? plan : "free";
      return {
        id: u.id,
        name,
        email: u.email ?? "—",
        joinedAt: u.created_at ?? "",
        planType,
      };
    });

  let supabaseOk = false;
  let supabaseMessage = "Unknown";
  if (sb) {
    const { error } = await sb.from("user_profiles").select("id").limit(1);
    supabaseOk = !error;
    supabaseMessage = error ? error.message : "Connected";
  }

  let resendOk: boolean | null = null;
  let resendMessage = "RESEND_API_KEY not set";
  const rk = process.env.RESEND_API_KEY?.trim();
  if (rk) {
    try {
      const res = await fetch("https://api.resend.com/domains", {
        headers: { Authorization: `Bearer ${rk}` },
        next: { revalidate: 120 },
      });
      resendOk = res.ok;
      resendMessage = res.ok ? "API reachable" : `HTTP ${res.status}`;
    } catch {
      resendOk = false;
      resendMessage = "Network error";
    }
  }

  let lastCronAt: string | null = null;
  let lastCronStatus: string | null = null;
  let membershipRenewalCronAt: string | null = null;
  let membershipRenewalCronStatus: string | null = null;
  if (sb) {
    const { data: healthRows, error: healthErr } = await sb
      .from("system_health")
      .select("id, last_run_at, last_status")
      .in("id", ["scheduled_reminders_cron", "membership_renewal_reminders_cron"]);
    if (healthErr) {
      lastCronStatus = `system_health read failed: ${healthErr.message}`.slice(0, 220);
    } else {
      for (const h of healthRows ?? []) {
        if (h.id === "scheduled_reminders_cron") {
          lastCronAt = h.last_run_at ?? null;
          lastCronStatus = h.last_status ?? null;
        }
        if (h.id === "membership_renewal_reminders_cron") {
          membershipRenewalCronAt = h.last_run_at ?? null;
          membershipRenewalCronStatus = h.last_status ?? null;
        }
      }
    }
  }

  const membershipRenewalReminders =
    sb && users.length > 0
      ? await buildMembershipRenewalReminderSnapshot(
          sb,
          {
            users,
            profileByUser,
            subEndByUser,
            userProfilesName,
            todayStart,
            todayEnd,
            thirtyAgo,
            sevenAgo,
          },
          (msg) => {
            loadError = loadError ?? msg;
          },
        )
      : emptyMembershipRenewalReminderSnapshot();

  const membershipRenewal =
    users.length > 0
      ? buildMembershipRenewalSnapshot(
          users,
          profileByUser,
          subEndByUser,
          userProfilesName,
          pendingMembershipRequests,
        )
      : emptyMembershipRenewal();

  return {
    configured: true,
    serviceRoleConfigured,
    loadError,
    membershipRenewal,
    membershipRenewalReminders,
    membershipRequestsSummary: {
      pending: pendingMembershipRequests,
      approvedToday: approvedMembershipToday,
      rejectedToday: rejectedMembershipToday,
    },
    aiAnalytics,
    metrics: {
      totalUsers,
      newUsersToday,
      activeUsers7d,
      premiumUsers,
      activeMembersCount,
      suspendedMembersCount,
      archivedMembersCount,
      totalRevenueNpr,
      reminderEmailsSent,
      totalRemindersCreated: totalReminders,
      upcomingReminders,
      overdueReminders,
    },
    reminderEngine: {
      emailsSentToday,
      emailsSentThisMonth,
      failedEmails,
      pendingReminders,
      upcomingScheduled,
    },
    recentSignups,
    charts: {
      userGrowth30d,
      reminderActivity30d,
      revenueTrend30d,
      premiumConversion30d,
    },
    systemHealth: {
      supabaseOk,
      supabaseMessage,
      resendOk,
      resendMessage,
      lastCronAt,
      lastCronStatus,
      membershipRenewalCronAt,
      membershipRenewalCronStatus,
      lastDeploymentSha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
      lastDeploymentAt: process.env.VERCEL_DEPLOYMENT_CREATED_AT ?? null,
    },
  };
}
