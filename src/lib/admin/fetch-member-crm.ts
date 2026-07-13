import "server-only";

import { differenceInCalendarDays, parseISO } from "date-fns";
import type { User } from "@supabase/supabase-js";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { formatMembershipReminderType } from "@/lib/membership-renewal-reminders/reminder-next";
import { effectiveMembershipPeriodEnd } from "@/lib/membership-effective-period-end";
import { membershipUiBucket } from "@/lib/membership-profile-status";

export type MemberCrmMemberScore = "vip" | "regular" | "new_member" | "inactive";

export type MemberCrmPaymentRow = {
  id: string;
  source: "revenue_ledger" | "membership_request";
  paymentDate: string;
  planPurchased: string | null;
  amount: number;
  currency: string;
  paymentMethod: string | null;
  approvalStatus: string;
  transactionReference: string | null;
  proofUrl: string | null;
};

export type MemberCrmTimelineRow = {
  id: string;
  occurredAt: string;
  title: string;
  subtitle: string | null;
  tone: "neutral" | "success" | "warning" | "danger" | "info";
};

export type MemberCrmNoteRow = {
  id: string;
  body: string;
  authorId: string | null;
  authorLabel: string;
  createdAt: string;
  updatedAt: string;
};

export type MemberCrmPayload = {
  userId: string;
  fullName: string;
  email: string;
  planType: "free" | "premium" | "elite";
  membershipStatus: string;
  joinedAt: string | null;
  expiryAt: string | null;
  daysLeftLabel: string | null;
  country: string;
  region: string;
  timezone: string;
  lastLoginAt: string | null;
  lastActiveAt: string | null;
  accountCreatedAt: string | null;
  deviceHint: string | null;
  browserHint: string | null;
  loginCountryHint: string | null;
  memberScore: MemberCrmMemberScore;
  ltv: {
    totalRevenueNpr: number;
    totalPayments: number;
    currentPlan: string;
    membershipDurationDays: number | null;
    avgRevenuePerRenewalNpr: number | null;
  };
  isArchived: boolean;
  payments: MemberCrmPaymentRow[];
  timeline: MemberCrmTimelineRow[];
  notes: MemberCrmNoteRow[];
};

function unknownOr(v: string | null | undefined): string {
  const t = v?.trim();
  return t ? t : "Unknown";
}

function paymentMethodLabel(m: string | null): string | null {
  if (!m) return null;
  const map: Record<string, string> = {
    khalti_qr: "Khalti QR",
    esewa_qr: "eSewa QR",
    global_ime_qr: "Global IME QR",
  };
  return map[m] ?? m;
}

function shortActor(id: string | null): string {
  if (!id) return "System";
  return `${id.slice(0, 8)}…`;
}

function computeScore(input: {
  planType: "free" | "premium" | "elite";
  accountAgeDays: number;
  daysSinceLastSignIn: number | null;
  totalRevenueNpr: number;
  renewalLikeCount: number;
}): MemberCrmMemberScore {
  if (input.accountAgeDays >= 0 && input.accountAgeDays <= 14) return "new_member";
  if (input.daysSinceLastSignIn !== null && input.daysSinceLastSignIn > 60) return "inactive";
  if (input.planType === "elite" || input.totalRevenueNpr >= 50_000 || input.renewalLikeCount >= 4) return "vip";
  return "regular";
}

export async function fetchMemberCrmPayload(userId: string): Promise<MemberCrmPayload | null> {
  const admin = createSupabaseServiceRoleClient();
  if (!admin) return null;

  const { data: authData, error: authErr } = await admin.auth.admin.getUserById(userId);
  if (authErr || !authData?.user) return null;
  const u: User = authData.user;

  const { data: prof, error: pErr } = await admin.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (pErr || !prof) return null;

  const { data: sub } = await admin
    .from("subscriptions")
    .select("status, current_period_end, current_period_start")
    .eq("user_id", userId)
    .maybeSingle();

  const { data: up } = await admin.from("user_profiles").select("full_name").eq("id", userId).maybeSingle();

  const display = up?.full_name?.trim();
  const fullName = display || "—";

  const rawPlan = prof.plan_type;
  const planType: MemberCrmPayload["planType"] =
    rawPlan === "premium" || rawPlan === "elite" || rawPlan === "free" ? rawPlan : "free";

  const expiresAt = effectiveMembershipPeriodEnd(sub?.current_period_end, (prof as { expires_at?: string | null }).expires_at);
  const archivedAt = (prof as { archived_at?: string | null }).archived_at ?? null;
  const bucket = membershipUiBucket({
    planType,
    expiresAtIso: expiresAt,
    suspendedAtIso: prof.suspended_at,
    archivedAtIso: archivedAt,
  });
  const statusLabels: Record<string, string> = {
    active: "Active",
    expiring_soon: "Expiring soon",
    expired: "Expired",
    free: "Free",
    suspended: "Suspended",
    archived: "Archived",
  };
  const membershipStatus = statusLabels[bucket] ?? bucket;

  let daysLeftLabel: string | null = null;
  if (
    expiresAt &&
    (planType === "premium" || planType === "elite") &&
    !prof.suspended_at &&
    !archivedAt
  ) {
    const exp = parseISO(expiresAt);
    if (!Number.isNaN(exp.getTime())) {
      const d = differenceInCalendarDays(exp, new Date());
      if (d > 0) daysLeftLabel = `${d} day${d === 1 ? "" : "s"}`;
      else if (d === 0) daysLeftLabel = "Expires today";
      else daysLeftLabel = `${Math.abs(d)} day(s) past expiry`;
    }
  } else if (planType === "free") {
    daysLeftLabel = "—";
  }

  const lastSignIn = u.last_sign_in_at ?? null;
  if (lastSignIn) {
    const cur = prof.last_login_at as string | null | undefined;
    if (!cur || new Date(lastSignIn) > new Date(cur)) {
      await admin
        .from("profiles")
        .update({ last_login_at: lastSignIn, updated_at: new Date().toISOString() })
        .eq("id", userId);
    }
  }

  const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
  const metaCountry = typeof meta.country === "string" ? meta.country : null;
  const country = unknownOr(prof.country ?? metaCountry);
  const region = unknownOr(prof.region);
  const timezone = unknownOr(prof.timezone);

  const appMeta = (u.app_metadata ?? {}) as Record<string, unknown>;
  const providers = appMeta.providers;
  const deviceHint =
    Array.isArray(providers) && providers.length
      ? `Auth: ${providers.map(String).join(", ")}`
      : typeof appMeta.provider === "string"
        ? `Provider: ${appMeta.provider}`
        : null;
  const browserHint: string | null = null;
  const loginCountryHint = typeof meta.country_code === "string" ? meta.country_code : null;

  const joinedAt = u.created_at ?? null;
  const accountAgeDays = joinedAt ? Math.max(0, differenceInCalendarDays(new Date(), parseISO(joinedAt))) : 0;
  const daysSinceLastSignIn = lastSignIn
    ? Math.max(0, differenceInCalendarDays(new Date(), parseISO(lastSignIn)))
    : null;

  const [
    { data: revenueRows },
    { data: reqRows },
    { data: reminders },
    { data: crmEvents },
    { data: noteRows },
  ] = await Promise.all([
    admin.from("revenue_events").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(200),
    admin.from("membership_requests").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(100),
    admin
      .from("membership_reminder_emails")
      .select("id, reminder_type, sent_at, delivery_status, membership_plan")
      .eq("user_id", userId)
      .order("sent_at", { ascending: false })
      .limit(100),
    admin.from("admin_member_crm_events").select("*").eq("user_id", userId).order("occurred_at", { ascending: false }).limit(100),
    admin.from("admin_member_notes").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
  ]);

  const payments: MemberCrmPaymentRow[] = [];

  for (const r of revenueRows ?? []) {
    const ref = r.external_ref ?? (r.note ? r.note.slice(0, 120) : null);
    const approval =
      r.event_type === "membership_payment"
        ? "Recorded (membership)"
        : r.external_ref?.startsWith("admin_renew:")
          ? "Admin renewal"
          : r.kind === "adjustment"
            ? "Adjustment"
            : "Ledger";
    payments.push({
      id: `rev:${r.id}`,
      source: "revenue_ledger",
      paymentDate: r.created_at,
      planPurchased: r.plan_type,
      amount: Number(r.amount_npr) || 0,
      currency: "NPR",
      paymentMethod: paymentMethodLabel(r.payment_method),
      approvalStatus: approval,
      transactionReference: ref,
      proofUrl: null,
    });
  }

  for (const r of reqRows ?? []) {
    payments.push({
      id: `req:${r.id}`,
      source: "membership_request",
      paymentDate: r.created_at,
      planPurchased: r.plan_type,
      amount: r.amount_npr,
      currency: "NPR",
      paymentMethod: paymentMethodLabel(r.payment_method),
      approvalStatus: r.status === "pending" ? "Pending review" : r.status === "approved" ? "Approved" : "Rejected",
      transactionReference: r.reference,
      proofUrl: r.proof_url,
    });
  }

  payments.sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));

  let totalRevenueNpr = 0;
  let revenuePaymentCount = 0;
  for (const r of revenueRows ?? []) {
    const amt = Number(r.amount_npr) || 0;
    if (amt > 0) {
      totalRevenueNpr += amt;
      revenuePaymentCount += 1;
    }
  }

  const paidDates = (revenueRows ?? [])
    .filter((r) => (Number(r.amount_npr) || 0) > 0)
    .map((r) => r.created_at);
  const firstPaidIso =
    paidDates.length > 0 ? paidDates.reduce((a, b) => (a < b ? a : b)) : ((prof.membership_activated_at as string | null) ?? null);

  const membershipDurationDays = firstPaidIso
    ? Math.max(0, differenceInCalendarDays(new Date(), parseISO(firstPaidIso)))
    : prof.membership_activated_at
      ? Math.max(0, differenceInCalendarDays(new Date(), parseISO(prof.membership_activated_at as string)))
      : null;

  const avgRevenuePerRenewalNpr =
    revenuePaymentCount > 0 ? Math.round(totalRevenueNpr / revenuePaymentCount) : null;

  const memberScore = computeScore({
    planType,
    accountAgeDays,
    daysSinceLastSignIn,
    totalRevenueNpr,
    renewalLikeCount: revenuePaymentCount,
  });

  const timeline: MemberCrmTimelineRow[] = [];

  const act = prof.membership_activated_at as string | null;
  if (act) {
    timeline.push({
      id: `syn:activated:${act}`,
      occurredAt: act,
      title: `${planType === "elite" ? "Elite" : planType === "premium" ? "Premium" : "Membership"} activated`,
      subtitle: "From profile membership_activated_at",
      tone: "success",
    });
  }

  for (const e of crmEvents ?? []) {
    const et = e.event_type as string;
    const tone: MemberCrmTimelineRow["tone"] =
      et === "user_suspended" || et === "user_permanently_removed"
        ? "danger"
        : et === "user_reactivated" || et === "user_restored"
          ? "success"
          : et === "user_archived"
            ? "warning"
            : "info";
    timeline.push({
      id: `crm:${e.id}`,
      occurredAt: e.occurred_at,
      title: e.title,
      subtitle: e.body ?? `By ${shortActor(e.actor_id)}`,
      tone,
    });
  }

  for (const r of revenueRows ?? []) {
    const amt = Number(r.amount_npr) || 0;
    const isRenew =
      Boolean(r.external_ref?.startsWith("admin_renew:")) ||
      r.event_type === "membership_payment" ||
      (amt > 0 && (r.kind === "subscription" || r.kind === "one_time"));
    if (!isRenew) continue;
    const title = r.external_ref?.startsWith("admin_renew:")
      ? "Membership renewed (admin)"
      : r.event_type === "membership_payment"
        ? "Membership payment recorded"
        : "Revenue recorded";
    timeline.push({
      id: `tl:rev:${r.id}`,
      occurredAt: r.created_at,
      title,
      subtitle: [r.plan_type && `Plan: ${r.plan_type}`, amt > 0 && `NPR ${amt}`, r.note].filter(Boolean).join(" · ") || null,
      tone: "info",
    });
  }

  for (const r of reminders ?? []) {
    if (r.delivery_status !== "sent") continue;
    timeline.push({
      id: `tl:rem:${r.id}`,
      occurredAt: r.sent_at,
      title: `Renewal reminder: ${formatMembershipReminderType(r.reminder_type)}`,
      subtitle: `${r.membership_plan} plan`,
      tone: "neutral",
    });
  }

  for (const r of reqRows ?? []) {
    timeline.push({
      id: `tl:req:sub:${r.id}`,
      occurredAt: r.created_at,
      title: "Membership payment submitted",
      subtitle: `${r.plan_type} · ${r.status}`,
      tone: r.status === "approved" ? "success" : r.status === "rejected" ? "warning" : "neutral",
    });
    if (r.reviewed_at && (r.status === "approved" || r.status === "rejected")) {
      timeline.push({
        id: `tl:req:rev:${r.id}`,
        occurredAt: r.reviewed_at,
        title: r.status === "approved" ? "Membership request approved" : "Membership request rejected",
        subtitle: shortActor(r.reviewed_by),
        tone: r.status === "approved" ? "success" : "warning",
      });
    }
  }

  const notes: MemberCrmNoteRow[] = (noteRows ?? []).map((n) => ({
    id: n.id,
    body: n.body,
    authorId: n.author_id,
    authorLabel: shortActor(n.author_id),
    createdAt: n.created_at,
    updatedAt: n.updated_at,
  }));

  for (const n of notes) {
    timeline.push({
      id: `tl:note:${n.id}`,
      occurredAt: n.createdAt,
      title: "Admin note added",
      subtitle: n.body.length > 120 ? `${n.body.slice(0, 120)}…` : n.body,
      tone: "neutral",
    });
  }

  timeline.sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));

  const totalPaymentsAll = payments.filter((p) => p.amount > 0).length;

  return {
    userId,
    fullName,
    email: u.email ?? "—",
    planType,
    membershipStatus,
    isArchived: Boolean(archivedAt),
    joinedAt,
    expiryAt: expiresAt,
    daysLeftLabel,
    country,
    region,
    timezone,
    lastLoginAt: lastSignIn ?? (prof.last_login_at as string | null) ?? null,
    lastActiveAt: prof.last_active_at,
    accountCreatedAt: joinedAt,
    deviceHint,
    browserHint,
    loginCountryHint,
    memberScore,
    ltv: {
      totalRevenueNpr: totalRevenueNpr,
      totalPayments: totalPaymentsAll,
      currentPlan: planType,
      membershipDurationDays,
      avgRevenuePerRenewalNpr: avgRevenuePerRenewalNpr,
    },
    payments,
    timeline,
    notes,
  };
}
