/**
 * Durable peer-loan party identity.
 *
 * Every loan MUST store distinct lenderId and borrowerId.
 * Role for any action is resolved ONLY from authenticatedUserId vs those IDs.
 * Never trust a client-supplied role for authorization.
 * Never invent both sides from the same currentUserId.
 */
import type { FireLendingLoan, FireLendingParty, FireLendingStore, LoanRole } from "@/lib/fire-lending/types";

export const SELF_LOAN_ERROR =
  "Lender and borrower must be different members. A loan cannot be created with the same person as both parties.";

export const UNAUTHORIZED_LOAN_PARTY_ERROR = "You are not a party to this loan.";

export type LoanPartyIds = {
  lenderId: string;
  borrowerId: string;
};

export type ActorLoanRole = LoanRole | "unauthorized";

/** True when both durable party ids are present and equal (invalid self-loan). */
export function isSelfLoan(loan: Pick<FireLendingLoan, "lenderId" | "borrowerId">): boolean {
  const lenderId = String(loan.lenderId ?? "").trim();
  const borrowerId = String(loan.borrowerId ?? "").trim();
  return Boolean(lenderId && borrowerId && lenderId === borrowerId);
}

export function assertDistinctPartyIds(
  lenderId: string,
  borrowerId: string,
): { ok: true; lenderId: string; borrowerId: string } | { ok: false; error: string; status: number } {
  const a = String(lenderId ?? "").trim();
  const b = String(borrowerId ?? "").trim();
  if (!a || !b) {
    return { ok: false, error: "Both lender and borrower are required.", status: 400 };
  }
  if (a === b) {
    return { ok: false, error: SELF_LOAN_ERROR, status: 400 };
  }
  return { ok: true, lenderId: a, borrowerId: b };
}

/**
 * Build durable lender/borrower ids at creation time from the creator's role
 * and the selected counterparty. Rejects self-loans.
 *
 * Loan request flow: creatorRole = "borrower" → creator is borrowerId, counterparty is lenderId.
 */
export function buildLenderBorrowerIds(input: {
  creatorPartyId: string;
  counterpartyId: string;
  creatorRole: LoanRole;
}): { ok: true; lenderId: string; borrowerId: string } | { ok: false; error: string; status: number } {
  const creator = String(input.creatorPartyId ?? "").trim();
  const counterparty = String(input.counterpartyId ?? "").trim();
  if (!creator) {
    return { ok: false, error: "You must be signed in to create a loan.", status: 401 };
  }
  if (!counterparty) {
    return { ok: false, error: "Select a valid counterparty before creating the loan.", status: 400 };
  }
  if (creator === counterparty) {
    return { ok: false, error: SELF_LOAN_ERROR, status: 400 };
  }

  const lenderId = input.creatorRole === "lender" ? creator : counterparty;
  const borrowerId = input.creatorRole === "borrower" ? creator : counterparty;
  return assertDistinctPartyIds(lenderId, borrowerId);
}

/**
 * Prefer stored durable ids. Legacy loans without lenderId/borrowerId are
 * backfilled ONLY when counterparty is a distinct party from the snapshot owner.
 * Never invent lenderId === borrowerId from currentUserId alone.
 */
export function resolveLoanPartyIds(
  loan: FireLendingLoan,
  storeCurrentUserId?: string,
): LoanPartyIds {
  const storedLender = String(loan.lenderId ?? "").trim();
  const storedBorrower = String(loan.borrowerId ?? "").trim();
  if (storedLender && storedBorrower) {
    return { lenderId: storedLender, borrowerId: storedBorrower };
  }

  const me = String(storeCurrentUserId ?? "").trim();
  const other = String(loan.counterpartyId ?? "").trim();
  // Safe legacy backfill: only when both ids exist and differ.
  if (me && other && me !== other) {
    if (loan.role === "lender") {
      return { lenderId: me, borrowerId: other };
    }
    if (loan.role === "borrower") {
      return { lenderId: other, borrowerId: me };
    }
  }

  // Incomplete / collapsed identity — do not invent a dual role for one user.
  return { lenderId: storedLender, borrowerId: storedBorrower };
}

/**
 * Server-side role resolution. Never uses a client-supplied role.
 *
 * if authenticatedUserId === loan.lenderId → "lender"
 * else if authenticatedUserId === loan.borrowerId → "borrower"
 * else → "unauthorized"
 *
 * Self-loans (lenderId === borrowerId) always resolve to "unauthorized".
 */
export function resolveActorRoleOnLoan(
  loan: FireLendingLoan,
  authenticatedUserId: string,
  storeCurrentUserId?: string,
): ActorLoanRole {
  const actor = String(authenticatedUserId ?? "").trim();
  if (!actor) return "unauthorized";

  const { lenderId, borrowerId } = resolveLoanPartyIds(loan, storeCurrentUserId);
  if (!lenderId || !borrowerId || lenderId === borrowerId) {
    return "unauthorized";
  }
  if (actor === lenderId) return "lender";
  if (actor === borrowerId) return "borrower";
  return "unauthorized";
}

/** Helper returning LoanRole | null for UI call-sites. */
export function actorRoleOnLoan(
  loan: FireLendingLoan,
  actorPartyId: string,
  storeCurrentUserId?: string,
): LoanRole | null {
  const role = resolveActorRoleOnLoan(loan, actorPartyId, storeCurrentUserId);
  return role === "unauthorized" ? null : role;
}

/**
 * Safe display name for notifications/email.
 * Never emit the demo placeholder "You" as a third-person requester name.
 */
export function partyDisplayName(
  party: FireLendingParty | undefined,
  fallback = "a FIRE Nepal member",
): string {
  const name = party?.name?.trim() || "";
  if (!name || /^you$/i.test(name)) return fallback;
  return name;
}

/** Reject selecting the authenticated member (by party id or FIRE Nepal ID) as counterparty. */
export function assertCounterpartyIsOtherMember(opts: {
  creatorPartyId: string;
  counterpartyId: string;
  parties: FireLendingParty[];
}): { ok: true } | { ok: false; error: string; status: number } {
  const distinct = assertDistinctPartyIds(opts.creatorPartyId, opts.counterpartyId);
  if (!distinct.ok) return distinct;

  const me = opts.parties.find((p) => p.id === opts.creatorPartyId);
  const other = opts.parties.find((p) => p.id === opts.counterpartyId);
  const myFireId = me?.fireNepalId?.trim().toUpperCase() || "";
  const otherFireId = other?.fireNepalId?.trim().toUpperCase() || "";
  if (myFireId && otherFireId && myFireId === otherFireId) {
    return { ok: false, error: SELF_LOAN_ERROR, status: 400 };
  }
  return { ok: true };
}

/**
 * Backfill durable lenderId/borrowerId on sanitize/load.
 * Marks identityInvalid when missing or lenderId === borrowerId.
 */
export function normalizeLoanPartyIdentity(
  loan: FireLendingLoan,
  storeCurrentUserId: string,
): FireLendingLoan {
  const resolved = resolveLoanPartyIds(loan, storeCurrentUserId);
  const lenderId = resolved.lenderId;
  const borrowerId = resolved.borrowerId;
  const identityInvalid =
    !lenderId ||
    !borrowerId ||
    lenderId === borrowerId ||
    Boolean(loan.identityInvalid);

  const counterpartyId =
    !identityInvalid && storeCurrentUserId === lenderId
      ? borrowerId
      : !identityInvalid && storeCurrentUserId === borrowerId
        ? lenderId
        : loan.counterpartyId || borrowerId || lenderId;

  // Viewer-oriented role only for list UI — auth never uses this field.
  let role: LoanRole = loan.role;
  if (!identityInvalid) {
    if (storeCurrentUserId === borrowerId) role = "borrower";
    else if (storeCurrentUserId === lenderId) role = "lender";
  }

  return {
    ...loan,
    lenderId: lenderId || loan.lenderId || "",
    borrowerId: borrowerId || loan.borrowerId || "",
    counterpartyId,
    role,
    identityInvalid: identityInvalid || undefined,
  };
}

export function normalizeStoreLoanIdentities(store: FireLendingStore): FireLendingStore {
  return {
    ...store,
    loans: store.loans.map((loan) => normalizeLoanPartyIdentity(loan, store.currentUserId)),
  };
}

/** Find loans that incorrectly share the same party as lender and borrower. */
export function findSelfLoanRecords(store: FireLendingStore): FireLendingLoan[] {
  return store.loans.filter((loan) => {
    const { lenderId, borrowerId } = resolveLoanPartyIds(loan, store.currentUserId);
    return !lenderId || !borrowerId || lenderId === borrowerId || Boolean(loan.identityInvalid);
  });
}
