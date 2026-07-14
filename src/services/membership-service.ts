/**
 * MembershipService — single source of truth for FIRE Nepal membership.
 *
 * ONLY reads/writes membership fields on `public.user_profiles`.
 * Do not read plan/expiry/suspend from profiles, subscriptions, or localStorage.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { FireMembershipTier } from "@/lib/fire-membership";
import {
  assertDisplayedPlanMatchesCanonical,
  deriveCanonicalMembership,
  normalizeMembershipPlan,
  type CanonicalMembership,
  type UserProfilesMembershipRow,
} from "@/lib/membership/canonical";
import type { Database } from "@/types/supabase-database";

export type { CanonicalMembership } from "@/lib/membership/canonical";
export { assertDisplayedPlanMatchesCanonical, normalizeMembershipPlan } from "@/lib/membership/canonical";

export const MEMBERSHIP_UPDATED_EVENT = "fn-membership-sot-updated";

type Client = SupabaseClient<Database>;

const MEMBERSHIP_SELECT =
  "id, membership_plan, membership_start, membership_expiry, membership_suspended_at, membership_archived_at" as const;

export type MembershipWritePatch = {
  plan?: FireMembershipTier;
  membershipStart?: string | null;
  membershipExpiry?: string | null;
  suspendedAt?: string | null;
  archivedAt?: string | null;
};

function toRow(data: Record<string, unknown> | null | undefined, userId: string): UserProfilesMembershipRow {
  return {
    id: (typeof data?.id === "string" ? data.id : userId) as string,
    membership_plan: typeof data?.membership_plan === "string" ? data.membership_plan : "free",
    membership_start: (data?.membership_start as string | null | undefined) ?? null,
    membership_expiry: (data?.membership_expiry as string | null | undefined) ?? null,
    membership_suspended_at: (data?.membership_suspended_at as string | null | undefined) ?? null,
    membership_archived_at: (data?.membership_archived_at as string | null | undefined) ?? null,
  };
}

/** Read canonical membership for one user from user_profiles only. */
export async function getMembershipByUserId(
  client: Client,
  userId: string,
  now: Date = new Date(),
): Promise<CanonicalMembership> {
  const { data, error } = await client
    .from("user_profiles")
    .select(MEMBERSHIP_SELECT)
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("[MembershipService] getMembershipByUserId failed:", error.message, { userId });
  }

  return deriveCanonicalMembership(toRow(data as Record<string, unknown> | null, userId), userId, now);
}

/** Batch-read membership rows for admin lists (user_profiles only). */
export async function getMembershipMapByUserIds(
  client: Client,
  userIds: string[],
  now: Date = new Date(),
): Promise<Map<string, CanonicalMembership>> {
  const map = new Map<string, CanonicalMembership>();
  if (userIds.length === 0) return map;

  const { data, error } = await client.from("user_profiles").select(MEMBERSHIP_SELECT).in("id", userIds);
  if (error) {
    console.error("[MembershipService] getMembershipMapByUserIds failed:", error.message);
  }

  for (const id of userIds) {
    map.set(id, deriveCanonicalMembership(null, id, now));
  }
  for (const row of data ?? []) {
    const r = row as Record<string, unknown>;
    const id = String(r.id);
    map.set(id, deriveCanonicalMembership(toRow(r, id), id, now));
  }
  return map;
}

/**
 * Write membership fields to user_profiles (SOT).
 * Callers may additionally mirror to profiles/subscriptions for legacy tooling,
 * but all app reads must go through getMembershipByUserId.
 */
export async function writeMembership(
  client: Client,
  userId: string,
  patch: MembershipWritePatch,
  now: Date = new Date(),
): Promise<CanonicalMembership> {
  const payload: Database["public"]["Tables"]["user_profiles"]["Insert"] = {
    id: userId,
    updated_at: now.toISOString(),
  };
  if (patch.plan !== undefined) payload.membership_plan = normalizeMembershipPlan(patch.plan);
  if (patch.membershipStart !== undefined) payload.membership_start = patch.membershipStart;
  if (patch.membershipExpiry !== undefined) payload.membership_expiry = patch.membershipExpiry;
  if (patch.suspendedAt !== undefined) payload.membership_suspended_at = patch.suspendedAt;
  if (patch.archivedAt !== undefined) payload.membership_archived_at = patch.archivedAt;

  const { error } = await client.from("user_profiles").upsert(payload, { onConflict: "id" });
  if (error) {
    throw new Error(`[MembershipService] writeMembership failed: ${error.message}`);
  }

  return getMembershipByUserId(client, userId, now);
}

/** Build a FireMembershipRecord-compatible access snapshot for gate helpers. */
export function toAccessRecord(canonical: CanonicalMembership): {
  tier: FireMembershipTier;
  status: "active" | "none";
  currentPeriodEnd: string | null;
} {
  const paid = canonical.accessPlan === "premium" || canonical.accessPlan === "elite";
  return {
    tier: canonical.accessPlan,
    status: paid ? "active" : "none",
    currentPeriodEnd: paid ? canonical.membershipExpiry : null,
  };
}

/** Client helper: broadcast SOT refresh after admin/user mutations. */
export function broadcastMembershipUpdated(userId?: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(MEMBERSHIP_UPDATED_EVENT, {
      detail: { userId: userId ?? null, at: Date.now() },
    }),
  );
}

/** Validate displayed plan against a live SOT fetch (used by Profile / Admin surfaces). */
export async function validateDisplayedPlan(
  client: Client,
  userId: string,
  displayedPlan: unknown,
  surface: string,
): Promise<CanonicalMembership> {
  const canonical = await getMembershipByUserId(client, userId);
  assertDisplayedPlanMatchesCanonical(surface, displayedPlan, canonical);
  return canonical;
}
