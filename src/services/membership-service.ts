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
 * - New access-flag columns are null-safe and backward compatible when absent in production.
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

/**
 * Prefer full SOT select; fall back when production has not applied access-flag migrations.
 * Use plain strings so PostgREST typed-select unions do not break tsc when columns lag behind schema types.
 */
const MEMBERSHIP_SELECT_FULL =
  "id, membership_plan, membership_start, membership_expiry, membership_suspended_at, membership_archived_at";
const MEMBERSHIP_SELECT_BASE = "id, membership_plan, membership_start, membership_expiry";

/** PostgREST / Postgres: undefined column (production before 20260714120000). */
function isMissingMembershipAccessColumnError(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  if (error.code === "42703") return true;
  const msg = (error.message ?? "").toLowerCase();
  return (
    msg.includes("membership_suspended_at") ||
    msg.includes("membership_archived_at") ||
    (msg.includes("does not exist") && msg.includes("user_profiles"))
  );
}

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
    // Null-safe: missing keys (pre-migration rows / base select) → null.
    membership_suspended_at: (data.membership_suspended_at as string | null | undefined) ?? null,
    membership_archived_at: (data.membership_archived_at as string | null | undefined) ?? null,
  };
}

function freeCanonical(userId: string, now: Date): CanonicalMembership {
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

type MembershipSelectResult = {
  data: Record<string, unknown>[] | null;
  error: { code?: string; message: string } | null;
  usedAccessFlags: boolean;
};

/**
 * Select membership rows with backward-compatible column fallback.
 * Production currently lacks membership_suspended_at / membership_archived_at until
 * migration 20260714120000 is applied — treat those as null instead of crashing.
 */
async function selectMembershipRows(
  client: Client,
  opts: { userId?: string; userIds?: string[] },
): Promise<MembershipSelectResult> {
  const run = async (select: string) => {
    if (opts.userId) {
      const { data, error } = await client
        .from("user_profiles")
        .select(select)
        .eq("id", opts.userId)
        .maybeSingle();
      return {
        data: data ? [data as unknown as Record<string, unknown>] : null,
        error: error ? { code: (error as { code?: string }).code, message: error.message } : null,
      };
    }
    if (opts.userIds && opts.userIds.length > 0) {
      // Chunk to stay under PostgREST URL limits on large admin rosters.
      const CHUNK = 150;
      const all: Record<string, unknown>[] = [];
      for (let i = 0; i < opts.userIds.length; i += CHUNK) {
        const chunk = opts.userIds.slice(i, i + CHUNK);
        const { data, error } = await client.from("user_profiles").select(select).in("id", chunk);
        if (error) {
          return {
            data: null,
            error: { code: (error as { code?: string }).code, message: error.message },
          };
        }
        for (const row of data ?? []) all.push(row as unknown as Record<string, unknown>);
      }
      return { data: all, error: null };
    }
    const { data, error } = await client.from("user_profiles").select(select);
    return {
      data: ((data as unknown as Record<string, unknown>[] | null) ?? null),
      error: error ? { code: (error as { code?: string }).code, message: error.message } : null,
    };
  };

  const full = await run(MEMBERSHIP_SELECT_FULL);
  if (!full.error) {
    return { ...full, usedAccessFlags: true };
  }
  if (isMissingMembershipAccessColumnError(full.error)) {
    console.warn(
      "[MembershipService] access-flag columns missing on user_profiles — falling back to base membership columns (suspended/archived treated as null).",
      full.error.message,
    );
    const base = await run(MEMBERSHIP_SELECT_BASE);
    return { ...base, usedAccessFlags: false };
  }
  return { ...full, usedAccessFlags: true };
}

/**
 * Read canonical membership for one user from user_profiles only.
 * Throws on query failure so callers cannot treat a load error as Free.
 * Missing row → Free (brand-new account).
 * Missing access-flag columns → null suspend/archive (backward compatible).
 */
export async function getMembershipByUserId(
  client: Client,
  userId: string,
  now: Date = new Date(),
): Promise<CanonicalMembership> {
  const { data, error } = await selectMembershipRows(client, { userId });

  if (error) {
    console.error("[MembershipService] getMembershipByUserId failed:", error.message, { userId });
    throw new Error(`[MembershipService] membership load failed for ${userId}: ${error.message}`);
  }

  const row = data?.[0];
  if (!row) {
    return freeCanonical(userId, now);
  }

  return deriveCanonicalMembership(toRow(row, userId), userId, now);
}

/** Batch-read membership rows for admin lists (user_profiles only). Throws on real query failure. */
export async function getMembershipMapByUserIds(
  client: Client,
  userIds: string[],
  now: Date = new Date(),
): Promise<Map<string, CanonicalMembership>> {
  const map = new Map<string, CanonicalMembership>();
  if (userIds.length === 0) return map;

  const { data, error } = await selectMembershipRows(client, { userIds });
  if (error) {
    console.error("[MembershipService] getMembershipMapByUserIds failed:", error.message);
    throw new Error(`[MembershipService] membership batch load failed: ${error.message}`);
  }

  const byId = new Map((data ?? []).map((row) => [String(row.id), row]));
  for (const id of userIds) {
    const row = byId.get(id);
    if (row) {
      map.set(id, deriveCanonicalMembership(toRow(row, id), id, now));
    } else {
      map.set(id, freeCanonical(id, now));
    }
  }
  return map;
}

/**
 * Write membership fields to user_profiles (SOT).
 * Never demotes paid → Free unless allowDemoteToFree or reason is provided.
 * When access-flag columns are absent, plan/expiry still write; suspend/archive
 * are mirrored onto public.profiles for backward compatibility until migration lands.
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

  const nowIso = now.toISOString();
  const payload: Database["public"]["Tables"]["user_profiles"]["Insert"] = {
    id: userId,
    updated_at: nowIso,
  };
  if (patch.plan !== undefined) payload.membership_plan = normalizeMembershipPlan(patch.plan);
  if (patch.membershipStart !== undefined) payload.membership_start = patch.membershipStart;
  if (patch.membershipExpiry !== undefined) payload.membership_expiry = patch.membershipExpiry;
  if (patch.suspendedAt !== undefined) payload.membership_suspended_at = patch.suspendedAt;
  if (patch.archivedAt !== undefined) payload.membership_archived_at = patch.archivedAt;

  const { error } = await client.from("user_profiles").upsert(payload, { onConflict: "id" });
  if (error) {
    if (
      isMissingMembershipAccessColumnError(error) &&
      (patch.suspendedAt !== undefined || patch.archivedAt !== undefined)
    ) {
      // Strip access flags and retry plan/expiry write; mirror lifecycle onto profiles.
      const basePayload: Database["public"]["Tables"]["user_profiles"]["Insert"] = {
        id: userId,
        updated_at: nowIso,
      };
      if (patch.plan !== undefined) basePayload.membership_plan = normalizeMembershipPlan(patch.plan);
      if (patch.membershipStart !== undefined) basePayload.membership_start = patch.membershipStart;
      if (patch.membershipExpiry !== undefined) basePayload.membership_expiry = patch.membershipExpiry;

      const { error: baseErr } = await client.from("user_profiles").upsert(basePayload, { onConflict: "id" });
      if (baseErr) {
        throw new Error(`[MembershipService] writeMembership failed: ${baseErr.message}`);
      }

      const profilePatch: Database["public"]["Tables"]["profiles"]["Insert"] = {
        id: userId,
        updated_at: nowIso,
      };
      if (patch.plan !== undefined) profilePatch.plan_type = normalizeMembershipPlan(patch.plan);
      if (patch.membershipExpiry !== undefined) profilePatch.expires_at = patch.membershipExpiry;
      if (patch.membershipStart !== undefined) profilePatch.membership_activated_at = patch.membershipStart;
      if (patch.suspendedAt !== undefined) profilePatch.suspended_at = patch.suspendedAt;
      if (patch.archivedAt !== undefined) profilePatch.archived_at = patch.archivedAt;
      const { error: profErr } = await client.from("profiles").upsert(profilePatch, { onConflict: "id" });
      if (profErr) {
        console.warn("[MembershipService] profiles lifecycle mirror failed:", profErr.message);
      }

      // Rebuild canonical with requested lifecycle fields (columns absent → treat as provided nulls).
      const after = await getMembershipByUserId(client, userId, now);
      return deriveCanonicalMembership(
        {
          id: userId,
          membership_plan: after.plan,
          membership_start: after.membershipStart,
          membership_expiry: after.membershipExpiry,
          membership_suspended_at: patch.suspendedAt !== undefined ? patch.suspendedAt : after.suspendedAt,
          membership_archived_at: patch.archivedAt !== undefined ? patch.archivedAt : after.archivedAt,
        },
        userId,
        now,
      );
    }
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
