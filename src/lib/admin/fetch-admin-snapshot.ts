import "server-only";

import { endOfDay, formatISO, startOfDay, subDays } from "date-fns";
import type { User } from "@supabase/supabase-js";
import { listAllAuthUsers } from "@/lib/admin/list-all-auth-users";
import { buildMembershipRenewalSnapshot, type AdminMembershipRenewalSnapshot } from "@/lib/admin/membership-renewal-snapshot";
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

export type AdminSnapshot = {
  configured: boolean;
  serviceRoleConfigured: boolean;
  /** When service role or listUsers fails, partial UI still renders. */
  loadError: string | null;
  membershipRenewal: AdminMembershipRenewalSnapshot;
  membershipRequestsSummary: AdminMembershipRequestsSummary;
  metrics: {
    totalUsers: number;
    newUsersToday: number;
    activeUsers7d: number;
    premiumUsers: number;
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
      membershipRequestsSummary: emptyMembershipRequestsSummary(),
      metrics: {
        totalUsers: 0,
        newUsersToday: 0,
        activeUsers7d: 0,
        premiumUsers: 0,
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
    { plan_type: string; last_active_at: string | null; expires_at: string | null; suspended_at: string | null }
  >();
  if (sb) {
    const { data: profiles, error: pErr } = await sb
      .from("profiles")
      .select("id, plan_type, last_active_at, expires_at, suspended_at");
    if (pErr) loadError = loadError ?? pErr.message;
    for (const row of profiles ?? []) {
      profileByUser.set(row.id, {
        plan_type: row.plan_type,
        last_active_at: row.last_active_at,
        expires_at: row.expires_at,
        suspended_at: row.suspended_at,
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
    const { data: ups, error: uErr } = await sb.from("user_profiles").select("id, display_name");
    if (uErr) loadError = loadError ?? uErr.message;
    for (const row of ups ?? []) {
      userProfilesName.set(row.id, row.display_name);
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
  const activeUsers7d = users.filter(
    (u) => u.last_sign_in_at && new Date(u.last_sign_in_at) >= sevenAgo,
  ).length;
  const premiumUsers = users.filter((u) => {
    const p = profileByUser.get(u.id)?.plan_type;
    return p === "premium" || p === "elite";
  }).length;

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
    const denom = signedByEnd.length;
    const num = signedByEnd.filter((u) => {
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
      const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
      const nameFromMeta =
        (typeof meta.name === "string" && meta.name) ||
        (typeof meta.full_name === "string" && meta.full_name) ||
        "";
      const display = userProfilesName.get(u.id);
      const name = (display && display.trim()) || nameFromMeta || "—";
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
  if (sb) {
    const { data: health, error: healthErr } = await sb
      .from("system_health")
      .select("*")
      .eq("id", "scheduled_reminders_cron")
      .maybeSingle();
    if (healthErr) {
      lastCronStatus = `system_health read failed: ${healthErr.message}`.slice(0, 220);
    } else {
      lastCronAt = health?.last_run_at ?? null;
      lastCronStatus = health?.last_status ?? null;
    }
  }

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
    membershipRequestsSummary: {
      pending: pendingMembershipRequests,
      approvedToday: approvedMembershipToday,
      rejectedToday: rejectedMembershipToday,
    },
    metrics: {
      totalUsers,
      newUsersToday,
      activeUsers7d,
      premiumUsers,
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
      lastDeploymentSha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
      lastDeploymentAt: process.env.VERCEL_DEPLOYMENT_CREATED_AT ?? null,
    },
  };
}
