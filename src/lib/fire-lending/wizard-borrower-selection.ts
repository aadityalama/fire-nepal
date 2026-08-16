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

/** Step-0 Continue is ready only when a concrete counterparty id is committed. */
export function canContinueBorrowerStep(counterpartyId: string | null | undefined): boolean {
  return Boolean(counterpartyId && String(counterpartyId).trim());
}

/**
 * When Continue is pressed on borrower step: advance only with a committed id.
 * Returns next step index or an error message (null next means stay).
 */
export function resolveBorrowerContinue(opts: {
  counterpartyId: string | null | undefined;
  partyExists: boolean;
}): { nextStep: number | null; error: string | null } {
  if (!canContinueBorrowerStep(opts.counterpartyId) || !opts.partyExists) {
    return {
      nextStep: null,
      error: "Select a verified borrower before continuing to loan details.",
    };
  }
  return { nextStep: 1, error: null };
}

/**
 * Minimal wizard step machine for regression tests (Borrower→…→Signatures).
 * Steps: 0 Borrower, 1 Details, 2 Agreement, 3 Approval, 4 Signatures
 *
 * Approval is counterparty-driven: requester must send the request, then wait
 * until the lender accepts before signatures.
 */
export function advanceWizardStep(opts: {
  step: number;
  counterpartyId?: string;
  amount?: string;
  purpose?: string;
  /** Whether the requester has sent the loan request. */
  requestSent?: boolean;
  approval?: "pending" | "accepted" | "rejected" | "changes";
  partyExists?: boolean;
}): { step: number; error: string | null } {
  const { step } = opts;
  if (step === 0) {
    const result = resolveBorrowerContinue({
      counterpartyId: opts.counterpartyId,
      partyExists: opts.partyExists !== false && Boolean(opts.counterpartyId),
    });
    return { step: result.nextStep ?? 0, error: result.error };
  }
  if (step === 1) {
    if (!(Number(opts.amount) > 0 && String(opts.purpose ?? "").trim().length > 0)) {
      return { step: 1, error: "Enter a valid amount and purpose before continuing." };
    }
    return { step: 2, error: null };
  }
  if (step === 2) {
    return { step: 3, error: null };
  }
  if (step === 3) {
    if (!opts.requestSent) {
      return { step: 3, error: "Send the loan request to the lender first." };
    }
    if (opts.approval === "rejected") {
      return { step: 3, error: "Lender rejected the loan request." };
    }
    if (opts.approval !== "accepted") {
      return { step: 3, error: "Waiting for the lender to accept the loan request." };
    }
    return { step: 4, error: null };
  }
  return { step, error: null };
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
