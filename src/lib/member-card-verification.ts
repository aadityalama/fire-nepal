import "server-only";

import {
  mapVerificationPayload,
  planOrFree,
  type PublicMemberVerification,
} from "@/lib/member-card-profile";
import { deriveCanonicalMembership } from "@/lib/membership/canonical";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type RpcClient = {
  rpc: (
    fn: "get_public_member_verification",
    args: { p_fire_nepal_id: string },
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
};

type UserProfilesVerificationRow = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  fire_nepal_id: string | null;
  membership_plan: string | null;
  membership_start: string | null;
  membership_expiry: string | null;
  membership_suspended_at: string | null;
  membership_archived_at: string | null;
  country_of_work: string | null;
  preferred_currency: string | null;
};

const USER_PROFILES_VERIFY_SELECT_FULL =
  "id, full_name, avatar_url, fire_nepal_id, membership_plan, membership_start, membership_expiry, membership_suspended_at, membership_archived_at, country_of_work, preferred_currency";
const USER_PROFILES_VERIFY_SELECT_BASE =
  "id, full_name, avatar_url, fire_nepal_id, membership_plan, membership_start, membership_expiry, country_of_work, preferred_currency";

function isMissingAccessColumnError(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  if (error.code === "42703") return true;
  const msg = (error.message ?? "").toLowerCase();
  return msg.includes("membership_suspended_at") || msg.includes("membership_archived_at");
}

function mapUserProfilesRowToVerification(row: UserProfilesVerificationRow): PublicMemberVerification {
  const canonical = deriveCanonicalMembership(
    {
      id: row.id,
      membership_plan: row.membership_plan,
      membership_start: row.membership_start,
      membership_expiry: row.membership_expiry,
      // Null-safe when access-flag columns are absent pre-migration.
      membership_suspended_at: row.membership_suspended_at ?? null,
      membership_archived_at: row.membership_archived_at ?? null,
    },
    row.id,
  );

  return {
    found: true,
    fullName: row.full_name,
    avatarUrl: row.avatar_url,
    fireNepalId: row.fire_nepal_id,
    membershipPlan: planOrFree(row.membership_plan),
    membershipStart: canonical.membershipStart,
    membershipExpiry: canonical.membershipExpiry,
    countryOfWork: row.country_of_work,
    preferredCurrency: row.preferred_currency,
    // Public verify page uses expiry lifecycle (active / expiring_soon / expired).
    status: canonical.expiryStatus,
  };
}

async function fetchFromUserProfiles(
  fireNepalId: string,
): Promise<PublicMemberVerification | null> {
  const admin = createSupabaseServiceRoleClient();
  if (!admin) return null;

  const full = await admin
    .from("user_profiles")
    .select(USER_PROFILES_VERIFY_SELECT_FULL)
    .eq("fire_nepal_id", fireNepalId)
    .maybeSingle();

  let row: UserProfilesVerificationRow | null = null;
  let error = full.error;

  if (!error && full.data) {
    row = full.data as unknown as UserProfilesVerificationRow;
  } else if (error && isMissingAccessColumnError(error)) {
    console.warn(
      "[verify] access-flag columns missing — falling back to base user_profiles select.",
      error.message,
    );
    const fallback = await admin
      .from("user_profiles")
      .select(USER_PROFILES_VERIFY_SELECT_BASE)
      .eq("fire_nepal_id", fireNepalId)
      .maybeSingle();
    error = fallback.error;
    if (!error && fallback.data) {
      const base = fallback.data as unknown as Omit<
        UserProfilesVerificationRow,
        "membership_suspended_at" | "membership_archived_at"
      >;
      row = {
        ...base,
        membership_suspended_at: null,
        membership_archived_at: null,
      };
    }
  }

  if (error) {
    console.error("[verify] user_profiles lookup failed:", error.message, { fireNepalId });
    return null;
  }
  if (!row) return { found: false };

  return mapUserProfilesRowToVerification(row);
}

async function runVerificationRpc(client: RpcClient, fireNepalId: string): Promise<PublicMemberVerification> {
  const { data, error } = await client.rpc("get_public_member_verification", {
    p_fire_nepal_id: fireNepalId,
  });
  if (error) throw new Error(error.message);
  if (!data || typeof data !== "object") return { found: false };
  return mapVerificationPayload(data as Record<string, unknown>);
}

/**
 * Public membership verification — same SOT as admin/profile:
 * `public.user_profiles` membership_start / membership_expiry / membership_plan.
 */
export async function fetchPublicMemberVerification(fireNepalId: string): Promise<PublicMemberVerification> {
  if (!isSupabaseConfigured()) {
    return { found: false };
  }

  // Prefer direct user_profiles read (MembershipService SOT) so dates/plan match admin + profile.
  try {
    const fromProfiles = await fetchFromUserProfiles(fireNepalId);
    if (fromProfiles) return fromProfiles;
  } catch (err) {
    console.error("[verify] user_profiles path failed, falling back to RPC:", err);
  }

  try {
    const server = await createServerSupabaseClient();
    return await runVerificationRpc(server as unknown as RpcClient, fireNepalId);
  } catch {
    const admin = createSupabaseServiceRoleClient();
    if (!admin) return { found: false };
    try {
      return await runVerificationRpc(admin as unknown as RpcClient, fireNepalId);
    } catch {
      return { found: false };
    }
  }
}
