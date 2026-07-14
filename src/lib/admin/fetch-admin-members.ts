import "server-only";

import type { User } from "@supabase/supabase-js";
import { listAllAuthUsers } from "@/lib/admin/list-all-auth-users";
import {
  membershipUiBucket,
  type MembershipUiBucket,
  type PlanType,
} from "@/lib/membership-profile-status";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { getMembershipMapByUserIds } from "@/services/membership-service";

export type AdminMemberRow = {
  id: string;
  name: string;
  email: string;
  joinedAt: string;
  planType: PlanType;
  membershipActivatedAt: string | null;
  expiresAt: string | null;
  suspendedAt: string | null;
  archivedAt: string | null;
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

  const userIds = users.map((u) => u.id);
  const membershipBy = await getMembershipMapByUserIds(sb, userIds);

  const { data: names, error: nErr } = await sb.from("user_profiles").select("id, full_name");
  if (nErr) {
    return { members: [], error: nErr.message };
  }
  const nameBy = new Map((names ?? []).map((r) => [r.id, r.full_name]));

  // Subscription status is billing mirror only — never used for planType display.
  const { data: subs } = await sb.from("subscriptions").select("user_id, status, current_period_end");
  const subBy = new Map((subs ?? []).map((r) => [r.user_id, r]));

  const members: AdminMemberRow[] = users.map((u: User) => {
    const display = nameBy.get(u.id);
    const name = (display && display.trim()) || "—";
    const m = membershipBy.get(u.id);
    const planType: PlanType = m?.plan ?? "free";
    const expiresAt = m?.membershipExpiry ?? null;
    const membershipActivatedAt = m?.membershipStart ?? null;
    const suspendedAt = m?.suspendedAt ?? null;
    const archivedAt = m?.archivedAt ?? null;
    const uiBucket = membershipUiBucket({
      planType,
      expiresAtIso: expiresAt,
      suspendedAtIso: suspendedAt,
      archivedAtIso: archivedAt,
    });
    const sub = subBy.get(u.id);
    return {
      id: u.id,
      name,
      email: u.email ?? "—",
      joinedAt: u.created_at ?? "",
      planType,
      membershipActivatedAt,
      expiresAt,
      suspendedAt,
      archivedAt,
      subscriptionStatus: sub?.status ?? null,
      subscriptionPeriodEnd: sub?.current_period_end ?? null,
      uiBucket,
    };
  });

  members.sort((a, b) => (b.joinedAt || "").localeCompare(a.joinedAt || ""));
  return { members, error: null };
}
