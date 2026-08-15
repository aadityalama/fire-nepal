import type {
  FireLendingLoan,
  FireLendingParty,
  FireLendingStore,
} from "@/lib/fire-lending/types";

const FALLBACK_SELF_ID = "party_me";

export function normalizeAgreementLookupKey(value: string | null | undefined): string {
  return String(value ?? "").trim();
}

/** Find a loan by internal id or public agreement number (e.g. FN-LN-2026-681232). */
export function findLoanInStore(
  store: Pick<FireLendingStore, "loans" | "agreements">,
  loanIdOrAgreement: string | null | undefined,
): FireLendingLoan | undefined {
  const key = normalizeAgreementLookupKey(loanIdOrAgreement);
  if (!key) return undefined;

  const byId = store.loans.find((l) => l.id === key);
  if (byId) return byId;

  const byAgreementNumber = store.loans.find(
    (l) => l.agreementNumber.trim().toUpperCase() === key.toUpperCase(),
  );
  if (byAgreementNumber) return byAgreementNumber;

  const agreement = store.agreements.find(
    (a) =>
      a.loanId === key ||
      a.id === key ||
      a.agreementNumber.trim().toUpperCase() === key.toUpperCase(),
  );
  if (!agreement) return undefined;
  return store.loans.find((l) => l.id === agreement.loanId);
}

export function findAgreementInStore(
  store: Pick<FireLendingStore, "agreements">,
  loan: FireLendingLoan,
) {
  return (
    store.agreements.find((a) => a.loanId === loan.id) ||
    store.agreements.find(
      (a) => a.agreementNumber.trim().toUpperCase() === loan.agreementNumber.trim().toUpperCase(),
    )
  );
}

function synthesizeParty(input: {
  id: string;
  name: string;
  fireNepalId: string;
  rolePreference?: FireLendingParty["rolePreference"];
}): FireLendingParty {
  return {
    id: input.id,
    name: input.name,
    fireNepalId: input.fireNepalId,
    mobile: "",
    trustScore: 60,
    verified: false,
    rolePreference: input.rolePreference ?? "both",
    onTimePayments: 0,
    latePayments: 0,
    loansCompleted: 0,
    identityVerified: false,
  };
}

/**
 * Resolve lender/borrower for an agreement PDF from the live store.
 * Does NOT require a pre-seeded "lending profile" / demo reset — synthesizes
 * missing self/counterparty placeholders from ids already on the loan record.
 */
export function resolveAgreementParties(
  store: Pick<FireLendingStore, "parties" | "currentUserId">,
  loan: FireLendingLoan,
): {
  lender: FireLendingParty;
  borrower: FireLendingParty;
  /** Parties that were synthesized and should be merged into the store (no deletes). */
  partiesToPersist: FireLendingParty[];
} {
  const currentUserId = store.currentUserId?.trim() || FALLBACK_SELF_ID;
  const parties = Array.isArray(store.parties) ? store.parties : [];

  let self =
    parties.find((p) => p.id === currentUserId) ||
    parties.find((p) => p.id === FALLBACK_SELF_ID) ||
    undefined;

  let counterparty =
    parties.find((p) => p.id === loan.counterpartyId) ||
    // Stale id after re-search: match any non-self party if only one exists.
    undefined;

  if (!counterparty && loan.counterpartyId) {
    const others = parties.filter((p) => p.id !== currentUserId && p.id !== FALLBACK_SELF_ID);
    if (others.length === 1) counterparty = others[0];
  }

  const partiesToPersist: FireLendingParty[] = [];

  if (!self) {
    self = synthesizeParty({
      id: currentUserId,
      name: "You",
      fireNepalId: "FN-LOCAL-USER",
      rolePreference: "both",
    });
    partiesToPersist.push(self);
  }

  if (!counterparty) {
    counterparty = synthesizeParty({
      id: loan.counterpartyId || "party_counterparty",
      name: "Counterparty",
      fireNepalId: "FN-UNKNOWN",
      rolePreference: loan.role === "lender" ? "borrower" : "lender",
    });
    partiesToPersist.push(counterparty);
  }

  const lender = loan.role === "lender" ? self : counterparty;
  const borrower = loan.role === "borrower" ? self : counterparty;

  return { lender, borrower, partiesToPersist };
}

/** Merge synthesized parties into the store without removing existing loans/members. */
export function mergePartiesIntoStore(
  store: FireLendingStore,
  partiesToPersist: FireLendingParty[],
): FireLendingStore {
  if (partiesToPersist.length === 0) return store;
  const byId = new Map(store.parties.map((p) => [p.id, p]));
  for (const party of partiesToPersist) {
    if (!byId.has(party.id)) byId.set(party.id, party);
  }
  return {
    ...store,
    parties: Array.from(byId.values()),
    // Keep currentUserId stable; only fill if empty.
    currentUserId: store.currentUserId?.trim() || FALLBACK_SELF_ID,
  };
}
