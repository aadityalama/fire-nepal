import { buildInstallmentSchedule } from "@/lib/fire-lending/emi";
import { agreementNumber, todayIso, uid } from "@/lib/fire-lending/format";
import {
  assertCounterpartyIsOtherMember,
  buildLenderBorrowerIds,
  SELF_LOAN_ERROR,
} from "@/lib/fire-lending/loan-party-identity";
import { riskFromTrust } from "@/lib/fire-lending/trust-score";
import type {
  FireLendingAgreement,
  FireLendingDocument,
  FireLendingLoan,
  FireLendingStore,
  LoanWizardDraft,
} from "@/lib/fire-lending/types";

export type CreateLoanResult =
  | { ok: true; store: FireLendingStore; loan: FireLendingLoan; loanId: string }
  | { ok: false; error: string; store: FireLendingStore; status: number };

/**
 * Create a peer loan with durable distinct lenderId / borrowerId.
 * Rejects self-loans (same party id or same FIRE Nepal ID).
 * Never trusts client-supplied lenderId/borrowerId for authorization — those are derived here.
 */
export function createLoanInStore(
  store: FireLendingStore,
  draft: LoanWizardDraft,
  documents?: FireLendingDocument[],
): CreateLoanResult {
  const creatorPartyId = store.currentUserId;
  const counterpartyId = String(draft.counterpartyId || "").trim();

  const counterpartyCheck = assertCounterpartyIsOtherMember({
    creatorPartyId,
    counterpartyId,
    parties: store.parties,
  });
  if (!counterpartyCheck.ok) {
    return { ok: false, error: counterpartyCheck.error, store, status: counterpartyCheck.status };
  }

  const parties = buildLenderBorrowerIds({
    creatorPartyId,
    counterpartyId,
    creatorRole: draft.role,
  });
  if (!parties.ok) {
    return { ok: false, error: parties.error, store, status: parties.status };
  }

  if (parties.lenderId === parties.borrowerId) {
    return { ok: false, error: SELF_LOAN_ERROR, store, status: 400 };
  }

  const loanId = uid("loan");
  const amount = Math.max(0, Number(draft.amount) || 0);
  const rate = Math.max(0, Number(draft.interestRate) || 0);
  const months = Math.max(1, Number(draft.durationMonths) || 1);
  const installments = Math.max(1, Number(draft.installmentCount) || months);
  const agrNo = agreementNumber();
  const counterpartyTrust =
    store.parties.find((p) => p.id === counterpartyId)?.trustScore ?? 60;

  const loan: FireLendingLoan = {
    id: loanId,
    agreementNumber: agrNo,
    role: draft.role,
    counterpartyId,
    lenderId: parties.lenderId,
    borrowerId: parties.borrowerId,
    amount,
    currency: draft.currency,
    interestRate: rate,
    loanType: draft.loanType,
    durationMonths: months,
    installmentCount: installments,
    gracePeriodDays: Math.max(0, Number(draft.gracePeriodDays) || 0),
    lateFeePercent: Math.max(0, Number(draft.lateFeePercent) || 0),
    purpose: draft.purpose || "Peer loan",
    notes: draft.notes || undefined,
    guarantor: draft.guarantor || undefined,
    collateral: draft.collateral || undefined,
    status: "pending_approval",
    createdAt: todayIso(),
    outstanding: amount,
    totalPaid: 0,
    interestEarned: 0,
    connectionMethod: draft.connectionMethod,
    borrowerSigned: false,
    lenderSigned: false,
    riskScore: riskFromTrust(counterpartyTrust, 0),
  };

  const schedule = buildInstallmentSchedule({
    loanId,
    principal: amount,
    annualRatePct: rate,
    months: installments,
  });

  const attachedDocs = (documents ?? [])
    .filter((d) => d.uploadStatus !== "error")
    .map((d) => ({
      ...d,
      id: d.id || uid("doc"),
      loanId,
      title: d.title || d.fileName || "Document",
      fileName: d.fileName || d.title,
      kind: d.kind || ("other" as const),
      createdAt: d.createdAt || todayIso(),
      uploadStatus: "ready" as const,
    }));

  const agreement: FireLendingAgreement = {
    id: uid("agr"),
    loanId,
    agreementNumber: agrNo,
    status: "awaiting_signatures",
    generatedAt: todayIso(),
    terms: "Standard FIRE Nepal Peer Lending Terms apply. Late fees accrue after grace period.",
    qrPayload: `fire-nepal://verify/agreement/${agrNo}`,
  };

  const nextStore: FireLendingStore = {
    ...store,
    loans: [loan, ...store.loans],
    installments: [...schedule, ...store.installments],
    agreements: [agreement, ...store.agreements],
    documents: [...attachedDocs, ...store.documents],
  };

  return { ok: true, store: nextStore, loan, loanId };
}
