import "server-only";

import { parseISO, startOfDay, subDays } from "date-fns";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";
import type { AutoReminderType } from "@/lib/membership-renewal-reminders/reminder-eligibility";
import { autoReminderDue } from "@/lib/membership-renewal-reminders/reminder-eligibility";
import {
  MEMBERSHIP_AUTO_REMINDER_TYPES,
  nextUnsentAutoReminder,
} from "@/lib/membership-renewal-reminders/reminder-next";
import type { Database } from "@/types/supabase-database";

export type MembershipRenewalReminderActivityRow = {
  userId: string;
  email: string;
  reminderType: string;
  sentAt: string;
  deliveryStatus: string;
  membershipPlan: string;
  expiresAt: string;
};

export type MembershipRenewalReminderUpcomingRow = {
  userId: string;
  email: string;
  name: string;
  reminderType: string;
  expiresAt: string;
  dueDay: string;
};

export type MembershipRenewalReminderSnapshot = {
  renewalEmailsSentToday: number;
  upcomingRemindersCount: number;
  failedDeliveries7d: number;
  recentSentToday: MembershipRenewalReminderActivityRow[];
  recentFailed: MembershipRenewalReminderActivityRow[];
  upcomingSample: MembershipRenewalReminderUpcomingRow[];
  analytics: {
    reminderEmailsSent30d: number;
    pendingRemindersDueToday: number;
    renewalsGenerated30d: number;
    expiredMembersNotRenewed30dPlus: number;
  };
};

function displayName(_u: User, displayFromUserProfiles: string | null): string {
  const display = displayFromUserProfiles?.trim();
  return display || "—";
}

function sentKey(userId: string, reminderType: string, expiresAt: string): string {
  return `${userId}|${reminderType}|${expiresAt}`;
}

export function emptyMembershipRenewalReminderSnapshot(): MembershipRenewalReminderSnapshot {
  return {
    renewalEmailsSentToday: 0,
    upcomingRemindersCount: 0,
    failedDeliveries7d: 0,
    recentSentToday: [],
    recentFailed: [],
    upcomingSample: [],
    analytics: {
      reminderEmailsSent30d: 0,
      pendingRemindersDueToday: 0,
      renewalsGenerated30d: 0,
      expiredMembersNotRenewed30dPlus: 0,
    },
  };
}

export async function buildMembershipRenewalReminderSnapshot(
  sb: SupabaseClient<Database>,
  input: {
    users: User[];
    profileByUser: Map<
      string,
      {
        plan_type: string;
        suspended_at: string | null;
        archived_at: string | null;
      }
    >;
    subEndByUser: Map<string, string | null>;
    userProfilesName: Map<string, string | null>;
    todayStart: Date;
    todayEnd: Date;
    thirtyAgo: Date;
    sevenAgo: Date;
  },
  onLoadError: (msg: string) => void,
): Promise<MembershipRenewalReminderSnapshot> {
  const empty = emptyMembershipRenewalReminderSnapshot();
  const autoTypes = [...MEMBERSHIP_AUTO_REMINDER_TYPES];

  const { data: sentRows, error: sentErr } = await sb
    .from("membership_reminder_emails")
    .select("user_id, reminder_type, expires_at")
    .eq("delivery_status", "sent")
    .in("reminder_type", autoTypes)
    .gte("expires_at", subDays(new Date(), 450).toISOString());
  if (sentErr) onLoadError(sentErr.message);

  const sentGlobal = new Set<string>();
  for (const r of sentRows ?? []) {
    sentGlobal.add(sentKey(r.user_id, r.reminder_type, r.expires_at));
  }

  const { count: sent30, error: c30Err } = await sb
    .from("membership_reminder_emails")
    .select("*", { count: "exact", head: true })
    .eq("delivery_status", "sent")
    .gte("sent_at", input.thirtyAgo.toISOString());
  if (c30Err) onLoadError(c30Err.message);
  empty.analytics.reminderEmailsSent30d = sent30 ?? 0;

  const { count: failed7, error: f7Err } = await sb
    .from("membership_reminder_emails")
    .select("*", { count: "exact", head: true })
    .eq("delivery_status", "failed")
    .gte("sent_at", input.sevenAgo.toISOString());
  if (f7Err) onLoadError(f7Err.message);
  empty.failedDeliveries7d = failed7 ?? 0;

  const { data: todayRows, error: tErr } = await sb
    .from("membership_reminder_emails")
    .select("user_id, email, reminder_type, sent_at, delivery_status, membership_plan, expires_at")
    .gte("sent_at", input.todayStart.toISOString())
    .lte("sent_at", input.todayEnd.toISOString())
    .order("sent_at", { ascending: false })
    .limit(40);
  if (tErr) onLoadError(tErr.message);
  empty.renewalEmailsSentToday = (todayRows ?? []).filter((r) => r.delivery_status === "sent").length;
  empty.recentSentToday = (todayRows ?? []).slice(0, 12).map((r) => ({
    userId: r.user_id,
    email: r.email,
    reminderType: r.reminder_type,
    sentAt: r.sent_at,
    deliveryStatus: r.delivery_status,
    membershipPlan: r.membership_plan,
    expiresAt: r.expires_at,
  }));

  const { data: failRows, error: failErr } = await sb
    .from("membership_reminder_emails")
    .select("user_id, email, reminder_type, sent_at, delivery_status, membership_plan, expires_at")
    .eq("delivery_status", "failed")
    .order("sent_at", { ascending: false })
    .limit(12);
  if (failErr) onLoadError(failErr.message);
  empty.recentFailed = (failRows ?? []).map((r) => ({
    userId: r.user_id,
    email: r.email,
    reminderType: r.reminder_type,
    sentAt: r.sent_at,
    deliveryStatus: r.delivery_status,
    membershipPlan: r.membership_plan,
    expiresAt: r.expires_at,
  }));

  let pendingToday = 0;
  let upcoming = 0;
  const upcomingAcc: MembershipRenewalReminderUpcomingRow[] = [];
  const now = new Date();

  for (const u of input.users) {
    const prof = input.profileByUser.get(u.id);
    if (!prof) continue;
    if (prof.archived_at) continue;
    if (prof.plan_type !== "premium" && prof.plan_type !== "elite") continue;
    if (prof.suspended_at) continue;
    // subEndByUser is populated from user_profiles.membership_expiry (MembershipService).
    const expiresIso = input.subEndByUser.get(u.id) ?? null;
    if (!expiresIso) continue;
    const exp = parseISO(expiresIso);
    if (Number.isNaN(exp.getTime())) continue;
    const email = u.email?.trim();
    if (!email) continue;

    const dueToday = autoReminderDue(exp, now);
    if (dueToday) {
      if (!sentGlobal.has(sentKey(u.id, dueToday, expiresIso))) pendingToday += 1;
    }

    const sentTypesForPeriod = new Set<AutoReminderType>();
    for (const t of MEMBERSHIP_AUTO_REMINDER_TYPES) {
      if (sentGlobal.has(sentKey(u.id, t, expiresIso))) sentTypesForPeriod.add(t);
    }

    const next = nextUnsentAutoReminder(exp, now, sentTypesForPeriod, 14);
    if (next) {
      upcoming += 1;
      if (upcomingAcc.length < 15) {
        upcomingAcc.push({
          userId: u.id,
          email,
          name: displayName(u, input.userProfilesName.get(u.id) ?? null),
          reminderType: next.kind,
          expiresAt: expiresIso,
          dueDay: startOfDay(next.on).toISOString().slice(0, 10),
        });
      }
    }
  }

  empty.analytics.pendingRemindersDueToday = pendingToday;
  empty.upcomingRemindersCount = upcoming;
  empty.upcomingSample = upcomingAcc;

  const { data: revRows, error: revErr } = await sb
    .from("revenue_events")
    .select("event_type, external_ref, created_at")
    .gte("created_at", input.thirtyAgo.toISOString());
  if (revErr) onLoadError(revErr.message);
  let renewals = 0;
  for (const r of revRows ?? []) {
    if (r.event_type === "membership_payment") renewals += 1;
    else if (typeof r.external_ref === "string" && r.external_ref.startsWith("admin_renew:")) renewals += 1;
  }
  empty.analytics.renewalsGenerated30d = renewals;

  const expiredCutoff = subDays(startOfDay(now), 30).toISOString();
  let expiredLong = 0;
  for (const [uid, prof] of input.profileByUser) {
    if (prof.archived_at) continue;
    if (prof.suspended_at) continue;
    if (prof.plan_type !== "premium" && prof.plan_type !== "elite") continue;
    const ex = input.subEndByUser.get(uid) ?? null;
    if (!ex) continue;
    if (ex < expiredCutoff) expiredLong += 1;
  }
  empty.analytics.expiredMembersNotRenewed30dPlus = expiredLong;

  return empty;
}
