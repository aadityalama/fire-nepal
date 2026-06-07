import "server-only";

import type { User } from "@supabase/supabase-js";
import { listAllAuthUsers } from "@/lib/admin/list-all-auth-users";
import {
  membershipUiBucket,
  type MembershipUiBucket,
  type PlanType,
} from "@/lib/membership-profile-status";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";

export type AdminMemberRow = {
  id: string;
  name: string;
  email: string;
  joinedAt: string;
  planType: PlanType;
  membershipActivatedAt: string | null;
  expiresAt: string | null;
  suspendedAt: string | null;
  subscriptionStatus: string | null;
  subscriptionPeriodEnd: string | null;
  uiBucket: MembershipUiBucket;
};

export async function fetchAdminMembers(): Promise<{
  members: AdminMemberRow[];
  error: string | null;
}> {
  const sb = createSupabaseServiceRoleClient();
  if (!sb) {
    return { members: [], error: "SUPABASE_SERVICE_ROLE_KEY is not set." };
  }

  const { users, error: listErr } = await listAllAuthUsers();
  if (listErr) {
    return { members: [], error: listErr };
  }

  const { data: profiles, error: pErr } = await sb
    .from("profiles")
    .select("id, plan_type, membership_activated_at, expires_at, suspended_at");

  if (pErr) {
    return { members: [], error: pErr.message };
  }

  const { data: subs, error: sErr } = await sb
    .from("subscriptions")
    .select("user_id, status, current_period_end, current_period_start");

  if (sErr) {
    return { members: [], error: sErr.message };
  }

  const { data: names, error: nErr } = await sb.from("user_profiles").select("id, display_name");
  if (nErr) {
    return { members: [], error: nErr.message };
  }

  const profileBy = new Map((profiles ?? []).map((r) => [r.id, r]));
  const subBy = new Map((subs ?? []).map((r) => [r.user_id, r]));
  const nameBy = new Map((names ?? []).map((r) => [r.id, r.display_name]));

  const members: AdminMemberRow[] = users.map((u: User) => {
    const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
    const nameFromMeta =
      (typeof meta.name === "string" && meta.name) ||
      (typeof meta.full_name === "string" && meta.full_name) ||
      "";
    const display = nameBy.get(u.id);
    const name = (display && display.trim()) || nameFromMeta || "—";
    const prof = profileBy.get(u.id);
    const rawPlan = prof?.plan_type;
    const planType: PlanType =
      rawPlan === "premium" || rawPlan === "elite" || rawPlan === "free" ? rawPlan : "free";
    const sub = subBy.get(u.id);
    const expiresAt =
      (prof?.expires_at as string | null | undefined) ?? sub?.current_period_end ?? null;
    const membershipActivatedAt =
      (prof?.membership_activated_at as string | null | undefined) ??
      (sub?.current_period_start as string | null | undefined) ??
      null;
    const suspendedAt = (prof?.suspended_at as string | null | undefined) ?? null;
    const uiBucket = membershipUiBucket({
      planType,
      expiresAtIso: expiresAt,
      suspendedAtIso: suspendedAt,
    });
    return {
      id: u.id,
      name,
      email: u.email ?? "—",
      joinedAt: u.created_at ?? "",
      planType,
      membershipActivatedAt,
      expiresAt,
      suspendedAt,
      subscriptionStatus: sub?.status ?? null,
      subscriptionPeriodEnd: sub?.current_period_end ?? null,
      uiBucket,
    };
  });

  members.sort((a, b) => (b.joinedAt || "").localeCompare(a.joinedAt || ""));
  return { members, error: null };
}
