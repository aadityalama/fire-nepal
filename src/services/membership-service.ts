/**
 * MembershipService — single source of truth for FIRE Nepal membership.
 *
 * ONLY reads/writes membership fields on `public.user_profiles`.
 * Do not read plan/expiry/suspend from profiles, subscriptions, or localStorage.
 *
 * Anti-regression:
 * - Query failure never invents Free.
 * - Missing row (new user) may be Free.
 * - Demotion to Free requires an explicit admin reason.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { FireMembershipTier } from "@/lib/fire-membership";
import {
  assertDisplayedPlanMatchesCanonical,
  assertPlanWriteAllowed,
  deriveCanonicalMembership,
  normalizeMembershipPlan,
  parseMembershipPlan,
  type CanonicalMembership,
  type UserProfilesMembershipRow,
} from "@/lib/membership/canonical";
import type { Database } from "@/types/supabase-database";

export type { CanonicalMembership } from "@/lib/membership/canonical";
export {
  assertDisplayedPlanMatchesCanonical,
  normalizeMembershipPlan,
  parseMembershipPlan,
} from "@/lib/membership/canonical";

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

export type MembershipWriteOptions = {
  /** Required when changing a paid plan to Free. */
  allowDemoteToFree?: boolean;
  reason?: string;
};

function toRow(data: Record<string, unknown>, userId: string): UserProfilesMembershipRow {
  return {
    id: (typeof data.id === "string" ? data.id : userId) as string,
    membership_plan: typeof data.membership_plan === "string" ? data.membership_plan : null,
    membership_start: (data.membership_start as string | null | undefined) ?? null,
    membership_expiry: (data.membership_expiry as string | null | undefined) ?? null,
    membership_suspended_at: (data.membership_suspended_at as string | null | undefined) ?? null,
    membership_archived_at: (data.membership_archived_at as string | null | undefined) ?? null,
  };
}

/**
 * Read canonical membership for one user from user_profiles only.
 * Throws on query failure so callers cannot treat a load error as Free.
 * Missing row → Free (brand-new account).
 */
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
    throw new Error(`[MembershipService] membership load failed for ${userId}: ${error.message}`);
  }

  if (!data) {
    return deriveCanonicalMembership(
      {
        id: userId,
        membership_plan: "free",
        membership_start: null,
        membership_expiry: null,
        membership_suspended_at: null,
        membership_archived_at: null,
      },
      userId,
      now,
    );
  }

  return deriveCanonicalMembership(toRow(data as Record<string, unknown>, userId), userId, now);
}

/** Batch-read membership rows for admin lists (user_profiles only). Throws on query failure. */
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
    throw new Error(`[MembershipService] membership batch load failed: ${error.message}`);
  }

  const byId = new Map((data ?? []).map((row) => [String((row as { id: string }).id), row as Record<string, unknown>]));
  for (const id of userIds) {
    const row = byId.get(id);
    if (row) {
      map.set(id, deriveCanonicalMembership(toRow(row, id), id, now));
    } else {
      map.set(
        id,
        deriveCanonicalMembership(
          {
            id,
            membership_plan: "free",
            membership_start: null,
            membership_expiry: null,
            membership_suspended_at: null,
            membership_archived_at: null,
          },
          id,
          now,
        ),
      );
    }
  }
  return map;
}

/**
 * Write membership fields to user_profiles (SOT).
 * Never demotes paid → Free unless allowDemoteToFree or reason is provided.
 */
export async function writeMembership(
  client: Client,
  userId: string,
  patch: MembershipWritePatch,
  now: Date = new Date(),
  opts?: MembershipWriteOptions,
): Promise<CanonicalMembership> {
  if (patch.plan !== undefined) {
    const previous = await getMembershipByUserId(client, userId, now);
    const nextPlan = normalizeMembershipPlan(patch.plan);
    assertPlanWriteAllowed(previous.plan, nextPlan, opts);
  }

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
