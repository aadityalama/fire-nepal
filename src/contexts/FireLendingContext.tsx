"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import {
  buildActivityFeed,
  buildAgreementCenter,
  buildAiInsights,
  buildKpis,
  buildMonthlySeries,
  buildPortfolioSummary,
  buildStatusDistribution,
  buildTopBorrowers,
  buildUpcomingPayments,
} from "@/lib/fire-lending/analytics";
import { downloadAgreementPdf } from "@/lib/fire-lending/agreement-pdf";
import { refreshInstallmentStatuses } from "@/lib/fire-lending/emi";
import { todayIso, uid } from "@/lib/fire-lending/format";
import {
  clearFireLendingLocalCache,
  createEmptyLendingStore,
  loadLendingStore,
  persistResetUserLoanData,
  saveLendingStore,
  sanitizeFireLendingStore,
} from "@/lib/fire-lending/storage";
import { computeTrustScore } from "@/lib/fire-lending/trust-score";
import type { P2PMemberSearchHit } from "@/lib/fire-lending/p2p-member-types";
import { createLoanInStore } from "@/lib/fire-lending/loan-creation";
import { resolveLoanPartyIds, SELF_LOAN_ERROR } from "@/lib/fire-lending/loan-party-identity";
import {
  respondToLoanRequest,
  sendLoanRequest,
  type LoanRequestAction,
} from "@/lib/fire-lending/loan-request-approval";
import { signLoanAgreement } from "@/lib/fire-lending/agreement-signatures";
import {
  attachDocumentsToStore,
  canAccessLoanDocument,
  downloadFromUrlAsFile,
  removeDocumentFromStore,
} from "@/lib/fire-lending/loan-documents";
import type {
  FireLendingDocument,
  FireLendingParty,
  FireLendingPayment,
  FireLendingStore,
  LoanRole,
  LoanWizardDraft,
  PaymentMethod,
} from "@/lib/fire-lending/types";
import { useCloudDocumentState } from "@/hooks/useCloudDocumentState";
import { appToast } from "@/lib/toast";

type FireLendingContextValue = {
  store: FireLendingStore;
  loading: boolean;
  summary: ReturnType<typeof buildPortfolioSummary>;
  kpis: ReturnType<typeof buildKpis>;
  insights: ReturnType<typeof buildAiInsights>;
  monthlySeries: ReturnType<typeof buildMonthlySeries>;
  statusDistribution: ReturnType<typeof buildStatusDistribution>;
  upcomingPayments: ReturnType<typeof buildUpcomingPayments>;
  activityFeed: ReturnType<typeof buildActivityFeed>;
  topBorrowers: ReturnType<typeof buildTopBorrowers>;
  agreementCenter: ReturnType<typeof buildAgreementCenter>;
  partyById: (id: string) => FireLendingStore["parties"][number] | undefined;
  /** Upsert a counterparty from a safe P2P search hit (no private fields). Returns party id. */
  ensureCounterpartyFromSearchHit: (hit: P2PMemberSearchHit) => string;
  createLoanFromWizard: (draft: LoanWizardDraft, documents?: FireLendingDocument[]) => string | null;
  /** Attach supporting documents to an existing loan (preserves metadata). */
  attachLoanDocuments: (loanId: string, documents: FireLendingDocument[], requestId?: string) => void;
  removeLoanDocument: (documentId: string) => void;
  /** Secure download of a supporting document for the given loan. */
  downloadLoanDocument: (loanId: string, documentId: string) => Promise<void>;
  /** Requester sends approval request to the loan counterparty. Returns error message or null. */
  sendLoanRequestForLoan: (loanId: string, message?: string) => string | null;
  /** Counterparty Accept / Reject only — requester cannot act on their own request. */
  respondToRequest: (id: string, action: LoanRequestAction, note?: string) => string | null;
  recordPayment: (input: {
    loanId: string;
    amount: number;
    method: PaymentMethod;
    note?: string;
    isPartial?: boolean;
    isSettlement?: boolean;
  }) => void;
  signAgreement: (loanId: string, as: LoanRole) => string | null;
  downloadAgreement: (loanId: string) => Promise<void>;
  markNotificationRead: (id: string) => void;
  /** Clears current-user P2P loan demo data only (not account/other modules). */
  resetLoanData: () => void;
};

const FireLendingContext = createContext<FireLendingContextValue | null>(null);

export function FireLendingProvider({ children }: { children: ReactNode }) {
  const { state: store, setState: setStore, hydrated, cloudReady } = useCloudDocumentState({
    moduleKey: "fire_lending",
    getDefault: createEmptyLendingStore,
    sanitize: sanitizeFireLendingStore,
    loadLocal: loadLendingStore,
    saveLocal: saveLendingStore,
    clearLocal: clearFireLendingLocalCache,
  });

  const loading = !hydrated || !cloudReady;

  const summary = useMemo(() => buildPortfolioSummary(store), [store]);
  const kpis = useMemo(() => buildKpis(summary), [summary]);
  const insights = useMemo(() => buildAiInsights(store, summary), [store, summary]);
  const monthlySeries = useMemo(() => buildMonthlySeries(store.loans, store.payments), [store.loans, store.payments]);
  const statusDistribution = useMemo(() => buildStatusDistribution(store.loans), [store.loans]);
  const upcomingPayments = useMemo(() => buildUpcomingPayments(store), [store]);
  const activityFeed = useMemo(() => buildActivityFeed(store), [store]);
  const topBorrowers = useMemo(() => buildTopBorrowers(store), [store]);
  const agreementCenter = useMemo(() => buildAgreementCenter(store), [store]);

  const partyById = useCallback((id: string) => store.parties.find((p) => p.id === id), [store.parties]);

  const ensureCounterpartyFromSearchHit = useCallback(
    (hit: P2PMemberSearchHit) => {
      const fireNepalId = hit.fireNepalId.trim().toUpperCase();
      if (!fireNepalId) return "";

      const me = store.parties.find((p) => p.id === store.currentUserId);
      const myFireId = me?.fireNepalId?.trim().toUpperCase() || "";
      if (myFireId && myFireId === fireNepalId) {
        appToast.error(SELF_LOAN_ERROR, { id: "fire-lending-self-counterparty" });
        return "";
      }

      // Resolve id synchronously from latest known parties so wizard Continue can
      // commit counterpartyId immediately (setState updaters are not a safe return channel).
      const existing = store.parties.find(
        (p) => p.id !== store.currentUserId && p.fireNepalId.trim().toUpperCase() === fireNepalId,
      );
      if (existing) {
        setStore((prev) => ({
          ...prev,
          parties: prev.parties.map((p) => {
            if (p.id !== existing.id) return p;
            const updated: FireLendingParty = {
              ...p,
              name: hit.displayName || p.name,
              fireNepalId,
              photoUrl: hit.avatarUrl ?? p.photoUrl,
              verified: hit.verificationStatus === "verified",
              identityVerified: hit.verificationStatus === "verified" || p.identityVerified,
              loansCompleted: Math.max(p.loansCompleted, hit.completedLoans),
              onTimePayments: Math.max(p.onTimePayments, hit.onTimePayments),
              latePayments: Math.max(p.latePayments, hit.latePayments),
            };
            return { ...updated, trustScore: computeTrustScore(updated) };
          }),
        }));
        return existing.id;
      }

      const partyId = uid("party");
      const base: FireLendingParty = {
        id: partyId,
        fireNepalId,
        name: hit.displayName,
        mobile: "",
        photoUrl: hit.avatarUrl ?? undefined,
        trustScore: 0,
        verified: hit.verificationStatus === "verified",
        rolePreference: "both",
        onTimePayments: hit.onTimePayments,
        latePayments: hit.latePayments,
        loansCompleted: hit.completedLoans,
        identityVerified: hit.verificationStatus === "verified",
      };
      const party = { ...base, trustScore: computeTrustScore(base) };
      setStore((prev) => {
        const raced = prev.parties.find(
          (p) => p.id !== prev.currentUserId && p.fireNepalId.trim().toUpperCase() === fireNepalId,
        );
        if (raced) return prev;
        return { ...prev, parties: [...prev.parties, party] };
      });
      return partyId;
    },
    [setStore, store.currentUserId, store.parties],
  );

  const createLoanFromWizard = useCallback(
    (draft: LoanWizardDraft, documents?: FireLendingDocument[]) => {
      let createdId: string | null = null;
      let error: string | null = null;
      setStore((prev) => {
        const result = createLoanInStore(prev, draft, documents);
        if (!result.ok) {
          error = result.error;
          return prev;
        }
        createdId = result.loanId;
        return result.store;
      });
      if (error || !createdId) {
        appToast.error(error || SELF_LOAN_ERROR, { id: "fire-lending-create-loan" });
        return null;
      }
      return createdId;
    },
    [setStore],
  );

  const attachLoanDocuments = useCallback(
    (loanId: string, documents: FireLendingDocument[], requestId?: string) => {
      setStore((prev) => attachDocumentsToStore(prev, loanId, documents, requestId));
    },
    [setStore],
  );

  const removeLoanDocument = useCallback(
    (documentId: string) => {
      setStore((prev) => removeDocumentFromStore(prev, documentId));
    },
    [setStore],
  );

  const downloadLoanDocument = useCallback(
    async (loanId: string, documentId: string) => {
      const access = canAccessLoanDocument(store, {
        documentId,
        loanId,
        actorPartyId: store.currentUserId,
      });
      if (!access.ok) {
        appToast.error(access.error, { id: "fire-lending-doc-download" });
        throw new Error(access.error);
      }
      const doc = access.document;
      const fileName = doc.fileName || doc.title || "document";

      try {
        if (doc.storagePath) {
          const res = await fetch("/api/fire-lending/documents/signed-url", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              storagePath: doc.storagePath,
              loanId,
              documentId,
            }),
          });
          if (res.ok) {
            const json = (await res.json()) as { url?: string; fileName?: string };
            if (json.url) {
              await downloadFromUrlAsFile(json.url, json.fileName || fileName);
              return;
            }
          }
        }
        if (doc.url) {
          await downloadFromUrlAsFile(doc.url, fileName);
          return;
        }
        throw new Error("No downloadable file is available for this document.");
      } catch (e) {
        const message = e instanceof Error ? e.message : "Could not download document.";
        appToast.error(message, { id: "fire-lending-doc-download" });
        throw e;
      }
    },
    [store],
  );

  const sendLoanRequestForLoan = useCallback(
    (loanId: string, message?: string) => {
      let error: string | null = null;
      setStore((prev) => {
        const result = sendLoanRequest(prev, {
          loanId,
          actorPartyId: prev.currentUserId,
          message,
        });
        if (!result.ok) {
          error = result.error;
          return prev;
        }
        return result.store;
      });
      if (error) {
        appToast.error(error, { id: "fire-lending-send-request" });
        return error;
      }
      appToast.success("Loan request sent successfully. Waiting for the borrower’s response.", {
        id: "fire-lending-send-request",
      });
      // Best-effort email to counterparty (no-op when Resend/auth email unavailable).
      void fetch("/api/fire-lending/requests/notify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loanId }),
      }).catch(() => {
        /* guest / offline */
      });
      return null;
    },
    [setStore],
  );

  const respondToRequest = useCallback(
    (id: string, action: LoanRequestAction, note?: string) => {
      let error: string | null = null;
      setStore((prev) => {
        const result = respondToLoanRequest(prev, {
          requestId: id,
          actorPartyId: prev.currentUserId,
          action,
          note,
        });
        if (!result.ok) {
          error = result.error;
          return prev;
        }
        return result.store;
      });
      if (error) {
        appToast.error(error, { id: "fire-lending-respond-request" });
        return error;
      }
      if (action === "accepted") {
        appToast.success("Loan request accepted.", { id: "fire-lending-respond-request" });
      } else if (action === "rejected") {
        appToast.success("Loan request rejected.", { id: "fire-lending-respond-request" });
      }
      return null;
    },
    [setStore],
  );

  const recordPayment = useCallback(
    (input: {
      loanId: string;
      amount: number;
      method: PaymentMethod;
      note?: string;
      isPartial?: boolean;
      isSettlement?: boolean;
    }) => {
      const payment: FireLendingPayment = {
        id: uid("pay"),
        loanId: input.loanId,
        amount: input.amount,
        method: input.method,
        status: "completed",
        paidAt: todayIso(),
        note: input.note,
        isPartial: Boolean(input.isPartial),
        isSettlement: Boolean(input.isSettlement),
      };

      setStore((prev) => {
        const loan = prev.loans.find((l) => l.id === input.loanId);
        if (!loan) return prev;

        let remaining = input.amount;
        const installments = refreshInstallmentStatuses(
          prev.installments.map((row) => {
            if (row.loanId !== input.loanId || remaining <= 0 || row.status === "paid") return row;
            const need = row.amount - row.paidAmount;
            const apply = Math.min(need, remaining);
            remaining -= apply;
            const paidAmount = row.paidAmount + apply;
            return {
              ...row,
              paidAmount,
              status: paidAmount >= row.amount ? ("paid" as const) : ("partial" as const),
            };
          }),
        );

        const outstanding = Math.max(0, loan.outstanding - input.amount);
        const interestBump = loan.role === "lender" ? Math.round(input.amount * (loan.interestRate / 100 / 12)) : 0;
        const nextStatus = outstanding <= 0 ? ("settled" as const) : loan.status === "overdue" && outstanding > 0 ? ("active" as const) : loan.status;

        return {
          ...prev,
          payments: [payment, ...prev.payments],
          installments,
          loans: prev.loans.map((l) =>
            l.id === input.loanId
              ? {
                  ...l,
                  outstanding,
                  totalPaid: l.totalPaid + input.amount,
                  interestEarned: l.interestEarned + interestBump,
                  status: nextStatus,
                }
              : l,
          ),
          parties: prev.parties.map((p) => {
            if (p.id !== loan.counterpartyId && p.id !== prev.currentUserId) return p;
            const updated = {
              ...p,
              onTimePayments: p.onTimePayments + (input.isPartial ? 0 : 1),
            };
            return { ...updated, trustScore: computeTrustScore(updated) };
          }),
          notifications: [
            {
              id: uid("ntf"),
              kind: "payment_received",
              title: "Payment recorded",
              body: `Payment of ${input.amount.toLocaleString()} via ${input.method} saved.`,
              createdAt: todayIso(),
              read: false,
              href: "/fire-lending/payments",
            },
            ...prev.notifications,
          ],
        };
      });
    },
    [setStore],
  );

  const signAgreement = useCallback(
    (loanId: string, as: LoanRole) => {
      let error: string | null = null;
      setStore((prev) => {
        const result = signLoanAgreement(prev, {
          loanId,
          actorPartyId: prev.currentUserId,
          as,
        });
        if (!result.ok) {
          error = result.error;
          return prev;
        }
        return result.store;
      });
      if (error) {
        appToast.error(error, { id: "fire-lending-sign-agreement" });
        return error;
      }
      appToast.success(
        as === "lender" ? "Lender signature recorded." : "Borrower signature recorded.",
        { id: "fire-lending-sign-agreement" },
      );
      return null;
    },
    [setStore],
  );

  const downloadAgreement = useCallback(
    async (loanId: string) => {
      const loan = store.loans.find((l) => l.id === loanId);
      const agreement = store.agreements.find((a) => a.loanId === loanId);
      if (!loan || !agreement) {
        appToast.error("Agreement not found for this loan.", { id: "fire-lending-agreement-pdf" });
        throw new Error("Agreement not found for this loan.");
      }
      const { lenderId, borrowerId } = resolveLoanPartyIds(loan, store.currentUserId);
      const lender = partyById(lenderId);
      const borrower = partyById(borrowerId);
      if (!lender || !borrower || lenderId === borrowerId) {
        appToast.error("Could not resolve distinct lender/borrower for the agreement PDF.", {
          id: "fire-lending-agreement-pdf",
        });
        throw new Error("Could not resolve distinct lender/borrower for the agreement PDF.");
      }
      try {
        await downloadAgreementPdf({
          loan,
          agreement,
          lender,
          borrower,
          installments: store.installments.filter((i) => i.loanId === loanId).sort((a, b) => a.sequence - b.sequence),
        });
      } catch (e) {
        const message = e instanceof Error ? e.message : "Agreement PDF generation failed.";
        appToast.error(message, { id: "fire-lending-agreement-pdf" });
        throw e;
      }
    },
    [partyById, store],
  );

  const markNotificationRead = useCallback((id: string) => {
    setStore((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    }));
  }, [setStore]);

  const resetLoanData = useCallback(() => {
    setStore((prev) => persistResetUserLoanData(prev));
    appToast.success("Your loan data has been reset.", { id: "fire-lending-reset-loan-data" });
  }, [setStore]);

  const value: FireLendingContextValue = {
    store,
    loading,
    summary,
    kpis,
    insights,
    monthlySeries,
    statusDistribution,
    upcomingPayments,
    activityFeed,
    topBorrowers,
    agreementCenter,
    partyById,
    ensureCounterpartyFromSearchHit,
    createLoanFromWizard,
    attachLoanDocuments,
    removeLoanDocument,
    downloadLoanDocument,
    sendLoanRequestForLoan,
    respondToRequest,
    recordPayment,
    signAgreement,
    downloadAgreement,
    markNotificationRead,
    resetLoanData,
  };

  return <FireLendingContext.Provider value={value}>{children}</FireLendingContext.Provider>;
}

export function useFireLending() {
  const ctx = useContext(FireLendingContext);
  if (!ctx) throw new Error("useFireLending must be used within FireLendingProvider");
  return ctx;
}
