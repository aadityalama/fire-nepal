import "server-only";

import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  buildP2PLendingProfile,
  buildP2PMemberSearchHit,
  emptyLendingMetrics,
  extractPublicLendingMetricsFromStore,
  isEligibleP2PDiscoveryMember,
  isP2PSearchQueryReady,
  memberMatchesP2PQuery,
  normalizeP2PSearchQuery,
  rankP2PSearchHits,
  resolveDisplayName,
  resolveVerificationStatus,
  type P2PProfileSourceRow,
} from "@/lib/fire-lending/p2p-member-profile";
import type { P2PLendingProfile, P2PMemberSearchHit } from "@/lib/fire-lending/p2p-member-types";

const SEARCH_SELECT =
  "id, fire_nepal_id, full_name, display_name, avatar_url, membership_plan, membership_start, membership_expiry, membership_suspended_at, membership_archived_at, country_of_work, preferred_currency, created_at";

const SEARCH_SELECT_BASE =
  "id, fire_nepal_id, full_name, display_name, avatar_url, membership_plan, membership_start, membership_expiry, country_of_work, preferred_currency, created_at";

function isMissingAccessColumnError(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  if (error.code === "42703") return true;
  const msg = (error.message ?? "").toLowerCase();
  return msg.includes("membership_suspended_at") || msg.includes("membership_archived_at");
}

function mapRow(raw: Record<string, unknown>): P2PProfileSourceRow {
  return {
    id: String(raw.id ?? ""),
    fire_nepal_id: typeof raw.fire_nepal_id === "string" ? raw.fire_nepal_id : null,
    full_name: typeof raw.full_name === "string" ? raw.full_name : null,
    display_name: typeof raw.display_name === "string" ? raw.display_name : null,
    avatar_url: typeof raw.avatar_url === "string" ? raw.avatar_url : null,
    membership_plan: typeof raw.membership_plan === "string" ? raw.membership_plan : null,
    membership_start: typeof raw.membership_start === "string" ? raw.membership_start : null,
    membership_expiry: typeof raw.membership_expiry === "string" ? raw.membership_expiry : null,
    membership_suspended_at:
      typeof raw.membership_suspended_at === "string" ? raw.membership_suspended_at : null,
    membership_archived_at:
      typeof raw.membership_archived_at === "string" ? raw.membership_archived_at : null,
    country_of_work: typeof raw.country_of_work === "string" ? raw.country_of_work : null,
    preferred_currency: typeof raw.preferred_currency === "string" ? raw.preferred_currency : null,
    created_at: typeof raw.created_at === "string" ? raw.created_at : null,
  };
}

async function loadLendingMetricsForUser(
  userId: string,
  identityVerified: boolean,
): Promise<ReturnType<typeof extractPublicLendingMetricsFromStore>> {
  const admin = createSupabaseServiceRoleClient();
  if (!admin) return emptyLendingMetrics(identityVerified);

  const { data, error } = await admin
    .from("user_module_snapshots")
    .select("state")
    .eq("user_id", userId)
    .eq("module_key", "fire_lending")
    .maybeSingle();

  if (error || !data) {
    return emptyLendingMetrics(identityVerified);
  }

  return extractPublicLendingMetricsFromStore(
    (data as { state?: unknown }).state,
    identityVerified,
  );
}

function sanitizeIlikeToken(raw: string): string {
  return raw.replace(/[%_,.()]/g, "").trim();
}

async function fetchCandidateRows(query: string, limit: number): Promise<P2PProfileSourceRow[]> {
  const admin = createSupabaseServiceRoleClient();
  if (!admin) return [];

  const q = normalizeP2PSearchQuery(query);
  const token = sanitizeIlikeToken(q);
  if (token.length < 2) return [];
  const like = `%${token}%`;
  const fetchCap = Math.min(80, Math.max(limit * 4, 24));

  const runColumn = async (select: string, column: "fire_nepal_id" | "full_name" | "display_name") =>
    admin.from("user_profiles").select(select).not("fire_nepal_id", "is", null).ilike(column, like).limit(fetchCap);

  const mergeRows = async (select: string) => {
    const [byId, byFull, byDisplay] = await Promise.all([
      runColumn(select, "fire_nepal_id"),
      runColumn(select, "full_name"),
      runColumn(select, "display_name"),
    ]);
    const firstError = byId.error || byFull.error || byDisplay.error;
    if (firstError) return { error: firstError, rows: [] as Record<string, unknown>[] };
    const map = new Map<string, Record<string, unknown>>();
    for (const batch of [byId.data, byFull.data, byDisplay.data]) {
      for (const row of (batch ?? []) as unknown as Record<string, unknown>[]) {
        const id = String(row.id ?? "");
        if (id) map.set(id, row);
      }
    }
    return { error: null, rows: [...map.values()] };
  };

  let result = await mergeRows(SEARCH_SELECT);
  if (result.error && isMissingAccessColumnError(result.error)) {
    result = await mergeRows(SEARCH_SELECT_BASE);
  }

  if (result.error) {
    console.error("[p2p-member-search] user_profiles query failed:", result.error.message);
    return [];
  }

  return result.rows.map(mapRow).filter((row) => {
    if (!isEligibleP2PDiscoveryMember(row)) return false;
    return memberMatchesP2PQuery(q, {
      fireNepalId: row.fire_nepal_id!.trim(),
      displayName: resolveDisplayName(row),
    });
  });
}

async function fetchRowByFireNepalId(fireNepalId: string): Promise<P2PProfileSourceRow | null> {
  const admin = createSupabaseServiceRoleClient();
  if (!admin) return null;

  const id = fireNepalId.trim().toUpperCase();
  const run = async (select: string) =>
    admin.from("user_profiles").select(select).eq("fire_nepal_id", id).maybeSingle();

  let result = await run(SEARCH_SELECT);
  if (result.error && isMissingAccessColumnError(result.error)) {
    result = await run(SEARCH_SELECT_BASE);
  }
  if (result.error) {
    console.error("[p2p-member-profile] lookup failed:", result.error.message);
    return null;
  }
  if (!result.data) return null;
  return mapRow(result.data as unknown as Record<string, unknown>);
}

export async function searchP2PMembers(query: string, limit = 8): Promise<P2PMemberSearchHit[]> {
  if (!isSupabaseConfigured()) return [];
  if (!isP2PSearchQueryReady(query)) return [];

  const capped = Math.min(12, Math.max(1, Math.floor(limit)));
  const candidates = await fetchCandidateRows(query, capped);
  const hits: P2PMemberSearchHit[] = [];

  for (const row of candidates.slice(0, capped)) {
    const verified = resolveVerificationStatus(row) === "verified";
    const metrics = await loadLendingMetricsForUser(row.id, verified);
    hits.push(buildP2PMemberSearchHit(row, metrics));
  }

  return rankP2PSearchHits(query, hits).slice(0, capped);
}

export async function getP2PLendingProfile(fireNepalId: string): Promise<P2PLendingProfile | null> {
  if (!isSupabaseConfigured()) return null;
  const row = await fetchRowByFireNepalId(fireNepalId);
  if (!row || !isEligibleP2PDiscoveryMember(row)) return null;

  const verified = resolveVerificationStatus(row) === "verified";
  const metrics = await loadLendingMetricsForUser(row.id, verified);
  return buildP2PLendingProfile(row, metrics);
}
