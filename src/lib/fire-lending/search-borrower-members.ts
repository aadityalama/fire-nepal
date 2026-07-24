import type { SupabaseClient } from "@supabase/supabase-js";
import {
  mapUserProfileToBorrowerMember,
  type BorrowerMemberProfile,
  type UserProfileSearchRow,
} from "@/lib/fire-lending/borrower-member";
import type { Database } from "@/types/supabase-database";

type Client = SupabaseClient<Database>;

const PROFILE_SELECT =
  "id, fire_nepal_id, full_name, avatar_url, country, country_of_work, membership_plan, membership_start, membership_expiry, membership_suspended_at, membership_archived_at, risk_profile, created_at";

function normalizeRows(raw: unknown): UserProfileSearchRow[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((row): row is UserProfileSearchRow => {
    return Boolean(row && typeof row === "object" && "id" in row);
  });
}

function mapRows(rows: UserProfileSearchRow[], activeLoanCounts?: Record<string, number>): BorrowerMemberProfile[] {
  const out: BorrowerMemberProfile[] = [];
  for (const row of rows) {
    const mapped = mapUserProfileToBorrowerMember(row, activeLoanCounts?.[row.id] ?? 0);
    if (mapped) out.push(mapped);
  }
  return out;
}

/**
 * Search public.user_profiles via SECURITY DEFINER RPC (preferred).
 * Falls back to a direct service-role / elevated select when RPC is missing.
 */
export async function searchBorrowerMembers(
  client: Client,
  opts: {
    query: string;
    excludeUserId: string;
    limit?: number;
    activeLoanCounts?: Record<string, number>;
  },
): Promise<{ members: BorrowerMemberProfile[]; error: string | null }> {
  const query = opts.query.trim();
  if (query.length < 2) return { members: [], error: null };

  const limit = Math.min(24, Math.max(1, opts.limit ?? 12));

  const rpc = await client.rpc("search_fire_nepal_members", {
    p_query: query,
    p_exclude_user_id: opts.excludeUserId,
    p_limit: limit,
  });

  if (!rpc.error && rpc.data != null) {
    return {
      members: mapRows(normalizeRows(rpc.data), opts.activeLoanCounts),
      error: null,
    };
  }

  // Fallback when migration is not yet applied (RLS may limit results for non-service clients).
  const escaped = query.replace(/[%_]/g, "").trim();
  if (escaped.length < 2) return { members: [], error: rpc.error?.message ?? null };

  const pattern = `%${escaped}%`;
  const [byId, byName] = await Promise.all([
    client
      .from("user_profiles")
      .select(PROFILE_SELECT)
      .neq("id", opts.excludeUserId)
      .not("fire_nepal_id", "is", null)
      .ilike("fire_nepal_id", pattern)
      .limit(limit),
    client
      .from("user_profiles")
      .select(PROFILE_SELECT)
      .neq("id", opts.excludeUserId)
      .not("fire_nepal_id", "is", null)
      .ilike("full_name", pattern)
      .limit(limit),
  ]);

  if (byId.error && byName.error) {
    return {
      members: [],
      error: rpc.error?.message || byId.error.message || byName.error.message,
    };
  }

  const merged = new Map<string, UserProfileSearchRow>();
  for (const row of [...(byId.data ?? []), ...(byName.data ?? [])] as UserProfileSearchRow[]) {
    merged.set(row.id, row);
  }

  return {
    members: mapRows([...merged.values()].slice(0, limit), opts.activeLoanCounts),
    error: null,
  };
}
