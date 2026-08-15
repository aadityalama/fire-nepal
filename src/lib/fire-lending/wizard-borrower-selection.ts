import { normalizeP2PSearchQuery } from "@/lib/fire-lending/p2p-member-profile";
import type { P2PMemberSearchHit } from "@/lib/fire-lending/p2p-member-types";

function compactId(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/gi, "");
}

/** Exact FIRE Nepal ID match (ignores dashes/case/spacing). */
export function isExactFireNepalIdMatch(query: string, fireNepalId: string): boolean {
  const q = compactId(query);
  const id = compactId(fireNepalId);
  return q.length >= 2 && q === id;
}

/**
 * Auto-select when search settles on a single hit that is an exact FIRE ID match,
 * or a single hit whose name equals the query (case-insensitive).
 */
export function shouldAutoSelectSearchHit(query: string, hits: P2PMemberSearchHit[]): P2PMemberSearchHit | null {
  if (hits.length !== 1) return null;
  const hit = hits[0]!;
  const q = normalizeP2PSearchQuery(query);
  if (!q) return null;
  if (isExactFireNepalIdMatch(q, hit.fireNepalId)) return hit;
  if (hit.displayName.trim().toLowerCase() === q.toLowerCase()) return hit;
  return null;
}

/** Step-0 Continue is enabled only when a concrete counterparty id is committed. */
export function canContinueBorrowerStep(counterpartyId: string | null | undefined): boolean {
  return Boolean(counterpartyId && String(counterpartyId).trim());
}

/**
 * When the search query changes, keep the existing selection only if the query
 * still refers to that same member (exact id / exact name / id prefix while typing).
 */
export function shouldKeepBorrowerSelection(opts: {
  query: string;
  selectedFireNepalId?: string | null;
  selectedDisplayName?: string | null;
}): boolean {
  const q = normalizeP2PSearchQuery(opts.query);
  const id = (opts.selectedFireNepalId ?? "").trim();
  const name = (opts.selectedDisplayName ?? "").trim();
  if (!q || !id) return false;
  if (isExactFireNepalIdMatch(q, id)) return true;
  if (name && name.toLowerCase() === q.toLowerCase()) return true;
  const qCompact = compactId(q);
  const idCompact = compactId(id);
  if (qCompact.length >= 2 && idCompact.startsWith(qCompact)) return true;
  return false;
}
