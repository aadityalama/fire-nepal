"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
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
import { buildInstallmentSchedule, refreshInstallmentStatuses } from "@/lib/fire-lending/emi";
import { agreementNumber, todayIso, uid } from "@/lib/fire-lending/format";
import { loadLendingStore, resetLendingStore, saveLendingStore } from "@/lib/fire-lending/storage";
import { borrowerMemberToParty, type BorrowerMemberProfile } from "@/lib/fire-lending/borrower-member";
import { computeTrustScore, riskFromTrust } from "@/lib/fire-lending/trust-score";
import type {
  FireLendingLoan,
  FireLendingParty,
  FireLendingPayment,
  FireLendingRequest,
  FireLendingStore,
  LoanWizardDraft,
  PaymentMethod,
} from "@/lib/fire-lending/types";

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
  upsertConnectedParty: (member: BorrowerMemberProfile) => FireLendingParty;
  createLoanFromWizard: (draft: LoanWizardDraft) => string;
  respondToRequest: (id: string, action: "accepted" | "rejected" | "changes_requested", note?: string) => void;
  recordPayment: (input: {
    loanId: string;
    amount: number;
    method: PaymentMethod;
    note?: string;
    isPartial?: boolean;
    isSettlement?: boolean;
  }) => void;
  signAgreement: (loanId: string, as: "lender" | "borrower") => void;
  downloadAgreement: (loanId: string) => Promise<void>;
  markNotificationRead: (id: string) => void;
  resetDemoData: () => void;
};

const FireLendingContext = createContext<FireLendingContextValue | null>(null);

function persist(updater: (prev: FireLendingStore) => FireLendingStore) {
  return (prev: FireLendingStore) => {
    const next = updater(prev);
    saveLendingStore(next);
    return next;
  };
}

export function FireLendingProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<FireLendingStore>(() => createEmptyClientStore());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setStore(loadLendingStore());
      setLoading(false);
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

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

  const upsertConnectedParty = useCallback((member: BorrowerMemberProfile) => {
    const party = borrowerMemberToParty(member);
    setStore(
      persist((prev) => {
        const existingIdx = prev.parties.findIndex(
          (p) => p.id === party.id || p.fireNepalId === party.fireNepalId,
        );
        if (existingIdx === -1) {
          return { ...prev, parties: [...prev.parties, party] };
        }
        const parties = [...prev.parties];
        parties[existingIdx] = { ...parties[existingIdx], ...party, id: party.id };
        return { ...prev, parties };
      }),
    );
    return party;
  }, []);

  const createLoanFromWizard = useCallback((draft: LoanWizardDraft) => {
    const loanId = uid("loan");
    const amount = Math.max(0, Number(draft.amount) || 0);
    const rate = Math.max(0, Number(draft.interestRate) || 0);
    const months = Math.max(1, Number(draft.durationMonths) || 1);
    const installments = Math.max(1, Number(draft.installmentCount) || months);
    const agrNo = agreementNumber();
    const counterpartyId = draft.counterpartyId || store.parties.find((p) => p.id !== store.currentUserId)?.id || store.parties[1]?.id;

    const loan: FireLendingLoan = {
      id: loanId,
      agreementNumber: agrNo,
      role: draft.role,
      counterpartyId,
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
      status: "pending_signature",
      createdAt: todayIso(),
      outstanding: amount,
      totalPaid: 0,
      interestEarned: 0,
      connectionMethod: draft.connectionMethod,
      borrowerSigned: false,
      lenderSigned: false,
      riskScore: riskFromTrust(partyById(counterpartyId)?.trustScore ?? 60, 0),
    };

    const schedule = buildInstallmentSchedule({
      loanId,
      principal: amount,
      annualRatePct: rate,
      months: installments,
    });

    setStore(
      persist((prev) => ({
        ...prev,
        loans: [loan, ...prev.loans],
        installments: [...schedule, ...prev.installments],
        agreements: [
          {
            id: uid("agr"),
            loanId,
            agreementNumber: agrNo,
            status: "awaiting_signatures",
            generatedAt: todayIso(),
            terms: "FIRE Nepal Peer Lending Terms — digital agreement. Both parties must sign to activate.",
            qrPayload: `fire-nepal://verify/agreement/${agrNo}`,
          },
          ...prev.agreements,
        ],
        notifications: [
          {
            id: uid("ntf"),
            kind: "signature",
            title: "Signature required",
            body: `Agreement ${agrNo} is ready for digital signatures.`,
            createdAt: todayIso(),
            read: false,
            href: `/fire-lending/agreements`,
          },
          ...prev.notifications,
        ],
      })),
    );

    return loanId;
  }, [partyById, store.currentUserId, store.parties]);

  const respondToRequest = useCallback((id: string, action: FireLendingRequest["status"], note?: string) => {
    setStore(
      persist((prev) => ({
        ...prev,
        requests: prev.requests.map((r) =>
          r.id === id
            ? {
                ...r,
                status: action,
                changeRequest: action === "changes_requested" ? note || r.changeRequest : r.changeRequest,
              }
            : r,
        ),
        notifications: [
          {
            id: uid("ntf"),
            kind: "loan_request",
            title: `Request ${action.replace("_", " ")}`,
            body: note || `Loan request marked as ${action}.`,
            createdAt: todayIso(),
            read: false,
            href: "/fire-lending/requests",
          },
          ...prev.notifications,
        ],
      })),
    );
  }, []);

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

      setStore(
        persist((prev) => {
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
        }),
      );
    },
    [],
  );

  const signAgreement = useCallback((loanId: string, as: "lender" | "borrower") => {
    setStore(
      persist((prev) => {
        const loans = prev.loans.map((l) => {
          if (l.id !== loanId) return l;
          const next = {
            ...l,
            lenderSigned: as === "lender" ? true : l.lenderSigned,
            borrowerSigned: as === "borrower" ? true : l.borrowerSigned,
          };
          const both = next.lenderSigned && next.borrowerSigned;
          return {
            ...next,
            status: both ? ("active" as const) : ("pending_signature" as const),
            startDate: both ? todayIso() : next.startDate,
          };
        });
        const loan = loans.find((l) => l.id === loanId);
        return {
          ...prev,
          loans,
          agreements: prev.agreements.map((a) =>
            a.loanId === loanId
              ? {
                  ...a,
                  lenderSignedAt: as === "lender" ? todayIso() : a.lenderSignedAt,
                  borrowerSignedAt: as === "borrower" ? todayIso() : a.borrowerSignedAt,
                  status: loan?.lenderSigned && loan.borrowerSigned ? ("active" as const) : ("awaiting_signatures" as const),
                }
              : a,
          ),
        };
      }),
    );
  }, []);

  const downloadAgreement = useCallback(
    async (loanId: string) => {
      const loan = store.loans.find((l) => l.id === loanId);
      const agreement = store.agreements.find((a) => a.loanId === loanId);
      if (!loan || !agreement) return;
      const counterparty = partyById(loan.counterpartyId);
      const me = partyById(store.currentUserId);
      if (!counterparty || !me) return;
      const lender = loan.role === "lender" ? me : counterparty;
      const borrower = loan.role === "borrower" ? me : counterparty;
      await downloadAgreementPdf({
        loan,
        agreement,
        lender,
        borrower,
        installments: store.installments.filter((i) => i.loanId === loanId).sort((a, b) => a.sequence - b.sequence),
      });
    },
    [partyById, store],
  );

  const markNotificationRead = useCallback((id: string) => {
    setStore(
      persist((prev) => ({
        ...prev,
        notifications: prev.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
      })),
    );
  }, []);

  const resetDemoData = useCallback(() => {
    setStore(resetLendingStore());
  }, []);

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
    upsertConnectedParty,
    createLoanFromWizard,
    respondToRequest,
    recordPayment,
    signAgreement,
    downloadAgreement,
    markNotificationRead,
    resetDemoData,
  };

  return <FireLendingContext.Provider value={value}>{children}</FireLendingContext.Provider>;
}

function createEmptyClientStore(): FireLendingStore {
  return {
    currentUserId: "party_me",
    parties: [],
    loans: [],
    payments: [],
    installments: [],
    requests: [],
    agreements: [],
    notifications: [],
    documents: [],
  };
}

export function useFireLending() {
  const ctx = useContext(FireLendingContext);
  if (!ctx) throw new Error("useFireLending must be used within FireLendingProvider");
  return ctx;
}
