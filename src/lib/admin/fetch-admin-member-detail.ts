import "server-only";

import { parseISO, startOfDay } from "date-fns";
import type { AutoReminderType } from "@/lib/membership-renewal-reminders/reminder-eligibility";
import {
  formatMembershipReminderType,
  MEMBERSHIP_AUTO_REMINDER_TYPES,
  nextUnsentAutoReminder,
} from "@/lib/membership-renewal-reminders/reminder-next";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { getMembershipByUserId } from "@/services/membership-service";

export type AdminMemberNoteRow = {
  id: string;
  user_id: string;
  body: string;
  author_id: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminMemberReminderRow = {
  id: string;
  reminder_type: string;
  sent_at: string;
  delivery_status: string;
  membership_plan: string;
  expires_at: string;
  subject: string | null;
};

export type AdminMemberReminderSummary = {
  lastSentAt: string | null;
  lastReminderTypeLabel: string | null;
  nextReminderLabel: string | null;
  nextReminderDueDay: string | null;
};

export type AdminMemberDetail = {
  userId: string;
  email: string;
  name: string;
  createdAt: string | null;
  planType: "free" | "premium" | "elite";
  membershipActivatedAt: string | null;
  expiresAt: string | null;
  suspendedAt: string | null;
  archivedAt: string | null;
  subscription: {
    plan: "premium" | "elite" | null;
    status: string | null;
    current_period_end: string | null;
  } | null;
  notes: AdminMemberNoteRow[];
  reminders: AdminMemberReminderRow[];
  reminderSummary: AdminMemberReminderSummary;
};

export async function fetchAdminMemberDetail(userId: string): Promise<AdminMemberDetail | null> {
  const admin = createSupabaseServiceRoleClient();
  if (!admin) return null;

  const { data: authData, error: authErr } = await admin.auth.admin.getUserById(userId);
  if (authErr || !authData?.user) {
    return null;
  }
  const u = authData.user;
  const { data: up } = await admin.from("user_profiles").select("full_name").eq("id", userId).maybeSingle();
  const display = up?.full_name?.trim();
  const name = display || "—";

  // Plan / expiry / suspend / archive — ONLY from public.user_profiles (MembershipService).
  const membership = await getMembershipByUserId(admin, userId);
  const planType: AdminMemberDetail["planType"] = membership.plan;
  const expiresAt = membership.membershipExpiry;
  const membershipActivatedAt = membership.membershipStart;
  const suspendedAt = membership.suspendedAt;
  const archivedAt = membership.archivedAt;

  const { data: sub } = await admin
    .from("subscriptions")
    .select("plan, status, current_period_end, current_period_start")
    .eq("user_id", userId)
    .maybeSingle();

  const { data: notes, error: nErr } = await admin
    .from("admin_member_notes")
    .select("id, user_id, body, author_id, created_at, updated_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  const noteRows: AdminMemberNoteRow[] =
    !nErr && notes ? (notes as AdminMemberNoteRow[]) : [];

  const { data: remRows, error: remErr } = await admin
    .from("membership_reminder_emails")
    .select("id, reminder_type, sent_at, delivery_status, membership_plan, expires_at, subject")
    .eq("user_id", userId)
    .order("sent_at", { ascending: false })
    .limit(80);

  const reminders: AdminMemberReminderRow[] =
    !remErr && remRows
      ? remRows.map((r) => ({
          id: r.id,
          reminder_type: r.reminder_type,
          sent_at: r.sent_at,
          delivery_status: r.delivery_status,
          membership_plan: r.membership_plan,
          expires_at: r.expires_at,
          subject: r.subject ?? null,
        }))
      : [];

  const lastSent = reminders.find((r) => r.delivery_status === "sent");
  let nextReminderLabel: string | null = null;
  let nextReminderDueDay: string | null = null;
  const summaryExpiresIso = expiresAt;
  if (
    summaryExpiresIso &&
    (planType === "premium" || planType === "elite") &&
    !suspendedAt &&
    !archivedAt
  ) {
    const expDt = parseISO(summaryExpiresIso);
    if (!Number.isNaN(expDt.getTime())) {
      const sentTypes = new Set<AutoReminderType>();
      const autoList = MEMBERSHIP_AUTO_REMINDER_TYPES as readonly string[];
      for (const r of reminders) {
        if (
          r.expires_at === summaryExpiresIso &&
          r.delivery_status === "sent" &&
          autoList.includes(r.reminder_type)
        ) {
          sentTypes.add(r.reminder_type as AutoReminderType);
        }
      }
      const next = nextUnsentAutoReminder(expDt, new Date(), sentTypes, 180);
      if (next) {
        nextReminderLabel = formatMembershipReminderType(next.kind);
        nextReminderDueDay = startOfDay(next.on).toISOString().slice(0, 10);
      }
    }
  }

  return {
    userId,
    email: u.email ?? "—",
    name,
    createdAt: u.created_at ?? null,
    planType,
    membershipActivatedAt,
    expiresAt,
    suspendedAt,
    archivedAt,
    subscription: sub
      ? {
          plan: sub.plan,
          status: sub.status,
          current_period_end: sub.current_period_end,
        }
      : null,
    notes: noteRows,
    reminders,
    reminderSummary: {
      lastSentAt: lastSent?.sent_at ?? null,
      lastReminderTypeLabel: lastSent ? formatMembershipReminderType(lastSent.reminder_type) : null,
      nextReminderLabel,
      nextReminderDueDay,
    },
  };
}
