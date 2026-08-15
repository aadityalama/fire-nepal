"use client";

import Link from "next/link";
import {
  BadgeCheck,
  BarChart3,
  FileText,
  Handshake,
  Landmark,
  Settings,
  Shield,
  Users,
  UserRound,
  Inbox,
  CreditCard,
  CalendarClock,
  Wallet,
} from "lucide-react";
import { LendingFloatingActionButton } from "@/components/fire-lending/FireLendingFloatingActionButton";
import { FireLendingSignaturePanel } from "@/components/fire-lending/FireLendingSignaturePanel";
import { LendingCompactHeader, LendingMobileScreen } from "@/components/fire-lending/FireLendingMobileScreens";
import {
  LendingEmptyState,
  LendingGlassCard,
  LendingHubTile,
  LendingPrimaryButton,
  LendingPrimaryLink,
  LendingSecondaryButton,
  LendingSkeletonCard,
  LendingStatusPill,
  LendingInput,
  LendingSelect,
} from "@/components/fire-lending/FireLendingUiPrimitives";
import { DataResetConfirmModal } from "@/components/fire-nepal/DataResetConfirmModal";
import { useFireLending } from "@/contexts/FireLendingContext";
import { useFireTheme } from "@/contexts/FireThemeContext";
import { formatCompactDate, formatLendingMoney } from "@/lib/fire-lending/format";
import {
  canShowLoanRequestApprovalControls,
  LOAN_REQUEST_UI,
} from "@/lib/fire-lending/loan-request-approval";
import { isSelfLoan } from "@/lib/fire-lending/loan-party-identity";
import { bothPartiesSigned } from "@/lib/fire-lending/agreement-signatures";
import { trustLabel } from "@/lib/fire-lending/trust-score";
import { FireLendingDashboardAnalytics } from "@/components/fire-lending/FireLendingDashboardAnalytics";
import { FireLendingMemberSearch } from "@/components/fire-lending/FireLendingMemberSearch";
import { partyToP2PSearchHit } from "@/lib/fire-lending/party-to-search-hit";
import type { P2PMemberSearchHit } from "@/lib/fire-lending/p2p-member-types";
import { useMemo, useState } from "react";
import type { PaymentMethod } from "@/lib/fire-lending/types";
import { useRouter } from "next/navigation";

function LoanList({ filter }: { filter?: "borrowed" | "lent" | "all" }) {
  const { store, partyById, loading } = useFireLending();
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const loans = store.loans.filter((l) => {
    if (filter === "borrowed") return l.role === "borrower";
    if (filter === "lent") return l.role === "lender";
    return true;
  });

  return (
    <LendingGlassCard title={filter === "borrowed" ? "Borrowed" : filter === "lent" ? "Lent" : "My Loans"} icon={Landmark}>
      {loading ? (
        <div className="space-y-2" role="status" aria-live="polite" aria-busy="true" aria-label="Loading loans">
          <LendingSkeletonCard className="h-16" />
          <LendingSkeletonCard className="h-16" />
          <LendingSkeletonCard className="h-16" />
        </div>
      ) : loans.length === 0 ? (
        <LendingEmptyState
          title="No loans in this view"
          message="Track borrowed and lent money with EMI schedules, payments, and agreements."
        />
      ) : (
        <ul className="space-y-1.5">
          {loans.map((loan) => {
            const party = partyById(loan.counterpartyId);
            return (
              <li key={loan.id}>
                <Link
                  href={`/fire-lending/loans/${loan.id}`}
                  className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 ${
                    light ? "border-emerald-200/60 bg-white/80" : "border-emerald-400/10 bg-black/20"
                  }`}
                >
                  <div className="min-w-0">
                    <p className={`truncate text-sm font-bold ${light ? "text-slate-900" : "text-emerald-50"}`}>
                      {party?.name ?? "Counterparty"} · {loan.purpose}
                    </p>
                    <p className={`text-[11px] font-semibold ${light ? "text-slate-500" : "text-emerald-200/60"}`}>
                      {loan.agreementNumber} · {loan.interestRate}% · {loan.durationMonths} mo
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={`text-sm font-black tabular-nums ${light ? "text-emerald-700" : "text-lime-300"}`}>
                      {formatLendingMoney(loan.outstanding, loan.currency)}
                    </p>
                    <LendingStatusPill status={loan.status} />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </LendingGlassCard>
  );
}

export function FireLendingLoansPage() {
  return (
    <LendingMobileScreen>
      <LendingCompactHeader eyebrow="My Loans" title="Loan book" subtitle="All active and historical peer loans." />
      <div className="flex gap-2">
        <LendingPrimaryLink href="/fire-lending/new">New Loan</LendingPrimaryLink>
        <Link href="/fire-lending/borrowed" className="text-sm font-bold text-emerald-500 self-center">Borrowed</Link>
        <Link href="/fire-lending/lent" className="text-sm font-bold text-emerald-500 self-center">Lent</Link>
      </div>
      <LoanList filter="all" />
      <LendingFloatingActionButton href="/fire-lending/new" label="New loan" />
    </LendingMobileScreen>
  );
}

export function FireLendingBorrowedPage() {
  return (
    <LendingMobileScreen>
      <LendingCompactHeader eyebrow="Borrowed" title="What you owe" subtitle="Loans where you are the borrower." />
      <LoanList filter="borrowed" />
    </LendingMobileScreen>
  );
}

export function FireLendingLentPage() {
  return (
    <LendingMobileScreen>
      <LendingCompactHeader eyebrow="Lent" title="What others owe you" subtitle="Loans where you are the lender." />
      <LoanList filter="lent" />
    </LendingMobileScreen>
  );
}

export function FireLendingRequestsPage() {
  const { store, respondToRequest, partyById } = useFireLending();
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const onRespond = (id: string, action: "accepted" | "rejected" | "changes_requested", note?: string) => {
    setBusyId(id);
    setActionError(null);
    const error = respondToRequest(id, action, note);
    setBusyId(null);
    if (error) setActionError(error);
  };

  return (
    <LendingMobileScreen>
      <LendingCompactHeader
        eyebrow="Loan Requests"
        title="Incoming & outgoing"
        subtitle="Accept or Reject only after both parties have signed. You cannot approve your own request."
      />
      <LendingGlassCard title="Requests" icon={Inbox}>
        {store.requests.length === 0 ? (
          <LendingEmptyState
            title="No loan requests"
            message="When someone sends a loan request, it will show up here for review."
          />
        ) : (
          <ul className="space-y-2">
            {store.requests.map((req) => {
              const from = partyById(req.fromPartyId);
              const to = partyById(req.toPartyId);
              const linkedLoan = req.loanId ? store.loans.find((l) => l.id === req.loanId) : undefined;
              const isRecipient = req.toPartyId === store.currentUserId;
              const isRequester = req.fromPartyId === store.currentUserId;
              const signaturesDone = linkedLoan ? bothPartiesSigned(linkedLoan) : !req.loanId;
              const canAct =
                (!(linkedLoan?.identityInvalid || (linkedLoan && isSelfLoan(linkedLoan))) &&
                  canShowLoanRequestApprovalControls(req, store.currentUserId, linkedLoan)) ||
                // Orphan seed requests without a linked loan keep prior lender-only Accept.
                (isRecipient && req.status === "pending" && !req.loanId);
              return (
                <li
                  key={req.id}
                  data-testid={`loan-request-${req.id}`}
                  data-request-role={isRequester ? "requester" : isRecipient ? "recipient" : "other"}
                  className={`rounded-xl border px-3 py-3 ${light ? "border-emerald-200/60 bg-white/80" : "border-emerald-400/10 bg-black/20"}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className={`text-sm font-black ${light ? "text-slate-900" : "text-emerald-50"}`}>
                        {from?.name} → {to?.name}
                      </p>
                      {isRecipient && req.status === "pending" ? (
                        <p className={`mt-1 text-xs font-bold ${light ? "text-emerald-800" : "text-lime-200"}`}>
                          You have received a new loan request from {from?.name ?? "a member"}.
                        </p>
                      ) : null}
                      <p className={`text-[11px] font-semibold ${light ? "text-slate-600" : "text-emerald-200/65"}`}>
                        {formatLendingMoney(req.amount, req.currency)} · {req.interestRate}% · {req.durationMonths} mo ·{" "}
                        {req.purpose}
                      </p>
                      {linkedLoan ? (
                        <p className={`mt-1 text-[11px] font-semibold ${light ? "text-slate-500" : "text-emerald-200/55"}`}>
                          Agreement {linkedLoan.agreementNumber}
                          {linkedLoan.guarantor ? ` · Guarantor: ${linkedLoan.guarantor}` : ""}
                          {linkedLoan.collateral ? ` · Collateral: ${linkedLoan.collateral}` : ""}
                          {linkedLoan.notes ? ` · Notes: ${linkedLoan.notes}` : ""}
                        </p>
                      ) : null}
                      {req.message ? (
                        <p className={`mt-1 text-xs ${light ? "text-slate-500" : "text-emerald-200/55"}`}>{req.message}</p>
                      ) : null}
                      {req.changeRequest ? (
                        <p className={`mt-1 text-xs font-bold text-amber-500`}>{req.changeRequest}</p>
                      ) : null}
                      {isRequester && req.status === "pending" ? (
                        <p className={`mt-1 text-[11px] font-semibold ${light ? "text-slate-500" : "text-emerald-200/55"}`}>
                          Waiting for the lender to respond. You cannot Accept or Reject your own request.
                        </p>
                      ) : null}
                      {isRecipient && req.status === "pending" && linkedLoan && !signaturesDone ? (
                        <p
                          data-testid="approval-blocked-awaiting-signatures"
                          className={`mt-1 text-[11px] font-semibold ${light ? "text-amber-700" : "text-amber-300"}`}
                        >
                          {LOAN_REQUEST_UI.signaturesRequiredBeforeApproval}
                        </p>
                      ) : null}
                      {isRecipient && req.status === "pending" && linkedLoan && signaturesDone ? (
                        <p
                          data-testid="approval-ready-both-signed"
                          className={`mt-1 text-[11px] font-semibold ${light ? "text-emerald-700" : "text-lime-300"}`}
                        >
                          {LOAN_REQUEST_UI.readyForApproval}
                        </p>
                      ) : null}
                    </div>
                    <LendingStatusPill status={req.status} />
                  </div>
                  {canAct ? (
                    <div className="mt-2 flex flex-wrap gap-2" data-testid="loan-request-approval-controls">
                      <LendingPrimaryButton
                        disabled={busyId === req.id}
                        onClick={() => onRespond(req.id, "accepted")}
                      >
                        Accept
                      </LendingPrimaryButton>
                      <LendingSecondaryButton
                        disabled={busyId === req.id}
                        onClick={() => onRespond(req.id, "rejected")}
                      >
                        Reject
                      </LendingSecondaryButton>
                      <LendingSecondaryButton
                        disabled={busyId === req.id}
                        onClick={() => onRespond(req.id, "changes_requested", "Please adjust rate/tenure.")}
                      >
                        Request changes
                      </LendingSecondaryButton>
                    </div>
                  ) : null}
                  {linkedLoan ? (
                    <div className="mt-2">
                      <LendingPrimaryLink href={`/fire-lending/loans/${linkedLoan.id}`}>
                        Review loan details
                      </LendingPrimaryLink>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
        {actionError ? (
          <p role="alert" className="mt-2 text-[11px] font-semibold text-rose-400">
            {actionError}
          </p>
        ) : null}
      </LendingGlassCard>
    </LendingMobileScreen>
  );
}

export function FireLendingPaymentsPage() {
  const { store, partyById } = useFireLending();
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";

  return (
    <LendingMobileScreen>
      <LendingCompactHeader eyebrow="Payments" title="Payment history" subtitle="Cash, bank, eSewa, Khalti, IME Pay, QR." />
      <LendingPrimaryLink href="/fire-lending/payments/new">Record Payment</LendingPrimaryLink>
      <LendingGlassCard title="History" icon={CreditCard}>
        {store.payments.length === 0 ? (
          <LendingEmptyState
            title="No payments recorded"
            message="Record a payment to update outstanding balances and installment status."
          />
        ) : (
          <ul className="space-y-1.5">
            {store.payments.map((p) => {
              const loan = store.loans.find((l) => l.id === p.loanId);
              const party = loan ? partyById(loan.counterpartyId) : undefined;
              return (
                <li
                  key={p.id}
                  className={`flex items-center justify-between rounded-xl border px-3 py-2.5 ${
                    light ? "border-emerald-200/60 bg-white/80" : "border-emerald-400/10 bg-black/20"
                  }`}
                >
                  <div>
                    <p className={`text-sm font-bold ${light ? "text-slate-900" : "text-emerald-50"}`}>
                      {party?.name ?? "Loan"} · {p.method.replace("_", " ")}
                    </p>
                    <p className={`text-[11px] ${light ? "text-slate-500" : "text-emerald-200/60"}`}>
                      {formatCompactDate(p.paidAt)}
                      {p.isPartial ? " · Partial" : ""}
                      {p.isSettlement ? " · Settlement" : ""}
                    </p>
                  </div>
                  <p className={`text-sm font-black tabular-nums ${light ? "text-emerald-700" : "text-lime-300"}`}>
                    {formatLendingMoney(p.amount, loan?.currency)}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </LendingGlassCard>
      <LendingFloatingActionButton href="/fire-lending/payments/new" label="Record payment" />
    </LendingMobileScreen>
  );
}

export function FireLendingPaymentFormPage() {
  const { store, recordPayment } = useFireLending();
  const [loanId, setLoanId] = useState(store.loans[0]?.id ?? "");
  const [amount, setAmount] = useState("5000");
  const [method, setMethod] = useState<PaymentMethod>("esewa");
  const [note, setNote] = useState("");
  const [partial, setPartial] = useState(false);
  const [settlement, setSettlement] = useState(false);
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";

  return (
    <LendingMobileScreen>
      <LendingCompactHeader eyebrow="Record Payment" title="Apply to outstanding" subtitle="Auto-updates EMI & balances." />
      <LendingGlassCard title="Payment details" icon={Wallet}>
        <div className="grid gap-3">
          <LendingSelect
            label="Loan"
            value={loanId}
            onChange={setLoanId}
            options={store.loans.map((l) => ({
              value: l.id,
              label: `${l.agreementNumber} · outstanding ${formatLendingMoney(l.outstanding, l.currency)}`,
            }))}
          />
          <LendingInput label="Amount" type="number" value={amount} onChange={setAmount} />
          <LendingSelect
            label="Method"
            value={method}
            onChange={(v) => setMethod(v as PaymentMethod)}
            options={[
              { value: "cash", label: "Cash" },
              { value: "bank_transfer", label: "Bank Transfer" },
              { value: "esewa", label: "eSewa" },
              { value: "khalti", label: "Khalti" },
              { value: "ime_pay", label: "IME Pay" },
              { value: "qr", label: "QR Payment" },
              { value: "settlement", label: "Settlement" },
            ]}
          />
          <LendingInput label="Note" value={note} onChange={setNote} placeholder="Optional" />
          <label className={`flex items-center gap-2 text-sm font-bold ${light ? "text-slate-700" : "text-emerald-100"}`}>
            <input type="checkbox" checked={partial} onChange={(e) => setPartial(e.target.checked)} />
            Partial payment
          </label>
          <label className={`flex items-center gap-2 text-sm font-bold ${light ? "text-slate-700" : "text-emerald-100"}`}>
            <input type="checkbox" checked={settlement} onChange={(e) => setSettlement(e.target.checked)} />
            Full settlement
          </label>
          <LendingPrimaryButton
            onClick={() => {
              if (!loanId) return;
              recordPayment({
                loanId,
                amount: Number(amount) || 0,
                method,
                note,
                isPartial: partial,
                isSettlement: settlement,
              });
            }}
          >
            Save payment
          </LendingPrimaryButton>
        </div>
      </LendingGlassCard>
    </LendingMobileScreen>
  );
}

export function FireLendingInstallmentsPage() {
  const { store, partyById } = useFireLending();
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const rows = [...store.installments].sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 40);

  return (
    <LendingMobileScreen>
      <LendingCompactHeader eyebrow="Installments" title="EMI schedule" subtitle="Due, overdue and upcoming EMIs." />
      <LendingGlassCard title="Schedule" icon={CalendarClock}>
        {rows.length === 0 ? (
          <LendingEmptyState
            title="No installments"
            message="EMI schedules appear here after you create a loan with installments."
          />
        ) : (
          <ul className="space-y-1.5">
            {rows.map((row) => {
              const loan = store.loans.find((l) => l.id === row.loanId);
              const party = loan ? partyById(loan.counterpartyId) : undefined;
              return (
                <li
                  key={row.id}
                  className={`flex items-center justify-between rounded-xl border px-3 py-2.5 ${
                    light ? "border-emerald-200/60 bg-white/80" : "border-emerald-400/10 bg-black/20"
                  }`}
                >
                  <div>
                    <p className={`text-sm font-bold ${light ? "text-slate-900" : "text-emerald-50"}`}>
                      #{row.sequence} · {party?.name ?? "Loan"}
                    </p>
                    <p className={`text-[11px] ${light ? "text-slate-500" : "text-emerald-200/60"}`}>Due {formatCompactDate(row.dueDate)}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-black tabular-nums ${light ? "text-emerald-700" : "text-lime-300"}`}>
                      {formatLendingMoney(row.amount - row.paidAmount, loan?.currency)}
                    </p>
                    <LendingStatusPill status={row.status} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </LendingGlassCard>
    </LendingMobileScreen>
  );
}

function PartyList({ role }: { role: "borrower" | "lender" }) {
  const router = useRouter();
  const { store, ensureCounterpartyFromSearchHit } = useFireLending();
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const [query, setQuery] = useState("");
  const parties = store.parties.filter(
    (p) => p.id !== store.currentUserId && (p.rolePreference === role || p.rolePreference === "both"),
  );
  const localHits = useMemo(
    () =>
      store.parties
        .filter((p) => p.id !== store.currentUserId && (p.verified || p.identityVerified))
        .map(partyToP2PSearchHit),
    [store.currentUserId, store.parties],
  );

  const onSelectMember = (hit: P2PMemberSearchHit) => {
    ensureCounterpartyFromSearchHit(hit);
    router.push(`/fire-lending/members/${encodeURIComponent(hit.fireNepalId)}`);
  };

  return (
    <div className="space-y-3">
      <LendingGlassCard
        title="Find verified members"
        subtitle="Search by FIRE Nepal ID or name for P2P decisions"
        icon={role === "borrower" ? Users : UserRound}
      >
        <FireLendingMemberSearch
          value={query}
          onQueryChange={setQuery}
          onSelectMember={onSelectMember}
          localHits={localHits}
          placeholder="Search FIRE Nepal ID or member name..."
        />
      </LendingGlassCard>

      <LendingGlassCard title={role === "borrower" ? "Borrowers" : "Lenders"} icon={role === "borrower" ? Users : UserRound}>
        <ul className="space-y-1.5">
          {parties.map((p) => (
            <li key={p.id}>
              <Link
                href={`/fire-lending/members/${encodeURIComponent(p.fireNepalId)}`}
                className={`flex items-center justify-between rounded-xl border px-3 py-2.5 transition hover:-translate-y-0.5 ${
                  light ? "border-emerald-200/60 bg-white/80" : "border-emerald-400/10 bg-black/20"
                }`}
              >
                <div>
                  <p className={`text-sm font-bold ${light ? "text-slate-900" : "text-emerald-50"}`}>{p.name}</p>
                  <p className={`text-[11px] ${light ? "text-slate-500" : "text-emerald-200/60"}`}>
                    {p.fireNepalId} · {trustLabel(p.trustScore)}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-black tabular-nums ${light ? "text-amber-700" : "text-amber-300"}`}>{p.trustScore}</p>
                  <LendingStatusPill status={p.identityVerified ? "verified" : "unverified"} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </LendingGlassCard>
    </div>
  );
}

export function FireLendingBorrowersPage() {
  return (
    <LendingMobileScreen>
      <LendingCompactHeader eyebrow="Borrowers" title="Counterparty profiles" subtitle="Trust score, history & verification." />
      <PartyList role="borrower" />
    </LendingMobileScreen>
  );
}

export function FireLendingLendersPage() {
  return (
    <LendingMobileScreen>
      <LendingCompactHeader eyebrow="Lenders" title="Trusted lenders" subtitle="Verified peers ready to fund." />
      <PartyList role="lender" />
    </LendingMobileScreen>
  );
}

export function FireLendingAgreementsPage() {
  const { store, downloadAgreement, signAgreement } = useFireLending();
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";

  return (
    <LendingMobileScreen>
      <LendingCompactHeader eyebrow="Agreements" title="Digital contracts" subtitle="PDF download, QR verify, role-based signatures." />
      <LendingGlassCard title="Agreements" icon={FileText}>
        <ul className="space-y-2">
          {store.agreements.map((agr) => {
            const loan = store.loans.find((l) => l.id === agr.loanId);
            return (
              <li
                key={agr.id}
                className={`rounded-xl border px-3 py-3 ${light ? "border-emerald-200/60 bg-white/80" : "border-emerald-400/10 bg-black/20"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className={`text-sm font-black ${light ? "text-slate-900" : "text-emerald-50"}`}>{agr.agreementNumber}</p>
                    <p className={`text-[11px] ${light ? "text-slate-500" : "text-emerald-200/60"}`}>
                      {formatCompactDate(agr.generatedAt)} · {loan?.purpose}
                    </p>
                  </div>
                  <LendingStatusPill status={agr.status} />
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <LendingSecondaryButton onClick={() => void downloadAgreement(agr.loanId)}>
                    Download Agreement Letter
                  </LendingSecondaryButton>
                </div>
                {loan ? (
                  <div className="mt-3">
                    <FireLendingSignaturePanel
                      loan={loan}
                      currentUserId={store.currentUserId}
                      onSign={(as) => signAgreement(loan.id, as)}
                    />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </LendingGlassCard>
    </LendingMobileScreen>
  );
}

export function FireLendingAnalyticsPage() {
  return (
    <LendingMobileScreen>
      <LendingCompactHeader eyebrow="Analytics" title="Lending intelligence" subtitle="Cash flow, interest, collections & health." />
      <FireLendingDashboardAnalytics />
    </LendingMobileScreen>
  );
}

export function FireLendingTrustScorePage() {
  const { store, summary } = useFireLending();
  const me = store.parties.find((p) => p.id === store.currentUserId);
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";

  return (
    <LendingMobileScreen>
      <LendingCompactHeader eyebrow="Trust Score" title={`${summary.trustScore}`} subtitle={me ? trustLabel(me.trustScore) : "Your lending reputation"} />
      <LendingGlassCard title="Score drivers" icon={BadgeCheck} elite>
        <ul className={`space-y-2 text-sm font-semibold ${light ? "text-slate-700" : "text-emerald-100"}`}>
          <li>On-time payments: {me?.onTimePayments ?? 0}</li>
          <li>Late payments: {me?.latePayments ?? 0}</li>
          <li>Loans completed: {me?.loansCompleted ?? 0}</li>
          <li>Identity verified: {me?.identityVerified ? "Yes" : "No"}</li>
          <li>Agreement completion boosts Trust Score for marketplace readiness.</li>
        </ul>
      </LendingGlassCard>
    </LendingMobileScreen>
  );
}

export function FireLendingDocumentsPage() {
  const { store, downloadLoanDocument, downloadAgreement } = useFireLending();
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const [error, setError] = useState<string | null>(null);

  return (
    <LendingMobileScreen>
      <LendingCompactHeader eyebrow="Documents" title="Vault" subtitle="Agreements, IDs, collateral & proofs." />
      <LendingGlassCard title="Files" icon={Shield}>
        {store.documents.length === 0 ? (
          <LendingEmptyState message="No documents in your vault yet." />
        ) : (
          <ul className="space-y-1.5">
            {store.documents.map((doc) => (
              <li
                key={doc.id}
                className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2.5 ${
                  light ? "border-emerald-200/60 bg-white/80" : "border-emerald-400/10 bg-black/20"
                }`}
              >
                <div>
                  <p className={`text-sm font-bold ${light ? "text-slate-900" : "text-emerald-50"}`}>
                    {doc.fileName || doc.title}
                  </p>
                  <p className={`text-[11px] ${light ? "text-slate-500" : "text-emerald-200/60"}`}>
                    {doc.kind} · {formatCompactDate(doc.createdAt)}
                    {doc.loanId ? ` · Loan ${doc.loanId.slice(0, 12)}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <LendingStatusPill status={doc.kind} />
                  {doc.loanId && (doc.url || doc.storagePath) ? (
                    <LendingSecondaryButton
                      onClick={() => {
                        setError(null);
                        void downloadLoanDocument(doc.loanId!, doc.id).catch((e) =>
                          setError(e instanceof Error ? e.message : "Download failed."),
                        );
                      }}
                    >
                      Download
                    </LendingSecondaryButton>
                  ) : null}
                  {doc.kind === "agreement" && doc.loanId ? (
                    <LendingSecondaryButton
                      onClick={() => {
                        setError(null);
                        void downloadAgreement(doc.loanId!).catch((e) =>
                          setError(e instanceof Error ? e.message : "Agreement download failed."),
                        );
                      }}
                    >
                      Download Agreement Letter
                    </LendingSecondaryButton>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
        {error ? (
          <p role="alert" className="mt-2 text-[11px] font-semibold text-rose-400">
            {error}
          </p>
        ) : null}
      </LendingGlassCard>
    </LendingMobileScreen>
  );
}

export function FireLendingSettingsPage() {
  const { resetLoanData, store } = useFireLending();
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const me = store.parties.find((p) => p.id === store.currentUserId);

  const onConfirmReset = () => {
    setBusy(true);
    try {
      resetLoanData();
      setConfirmOpen(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <LendingMobileScreen>
      <LendingCompactHeader
        eyebrow="Settings"
        title="Lending preferences"
        subtitle="Loan data, notifications & future marketplace."
      />
      <LendingGlassCard title="Module settings" icon={Settings}>
        <p className={`mb-3 text-sm font-semibold ${light ? "text-slate-600" : "text-emerald-200/70"}`}>
          Current user FIRE ID: {me?.fireNepalId ?? "—"}
        </p>
        <p className={`mb-4 text-xs font-semibold ${light ? "text-slate-500" : "text-emerald-200/55"}`}>
          Reset only clears your P2P lending loans and related demo records. Your FIRE Nepal account,
          membership, finance, pension, and other modules are not affected.
        </p>
        <LendingSecondaryButton onClick={() => setConfirmOpen(true)} disabled={busy}>
          Reset Your Loan Data
        </LendingSecondaryButton>
      </LendingGlassCard>
      <DataResetConfirmModal
        open={confirmOpen}
        title="Reset Your Loan Data?"
        body="This will remove your current P2P lending demo loans, payments, installments, requests, and related agreements. Your other FIRE Nepal data will not be affected."
        confirmLabel="Reset Loan Data"
        cancelLabel="Cancel"
        busy={busy}
        onCancel={() => {
          if (!busy) setConfirmOpen(false);
        }}
        onConfirm={onConfirmReset}
      />
    </LendingMobileScreen>
  );
}

export function FireLendingMorePage() {
  return (
    <LendingMobileScreen>
      <LendingCompactHeader eyebrow="More" title="Lending workspace" subtitle="Profiles, agreements, analytics & settings." />
      <div className="grid gap-2">
        <LendingHubTile label="Borrowers" description="Trust profiles" href="/fire-lending/borrowers" icon={Users} />
        <LendingHubTile label="Lenders" description="Verified peers" href="/fire-lending/lenders" icon={UserRound} />
        <LendingHubTile label="Agreements" description="PDF & signatures" href="/fire-lending/agreements" icon={FileText} />
        <LendingHubTile label="Analytics" description="Cash flow & health" href="/fire-lending/analytics" icon={BarChart3} />
        <LendingHubTile label="Trust Score" description="Reputation engine" href="/fire-lending/trust-score" icon={BadgeCheck} />
        <LendingHubTile label="Documents" description="Vault & proofs" href="/fire-lending/documents" icon={Shield} />
        <LendingHubTile label="Settings" description="Preferences" href="/fire-lending/settings" icon={Settings} />
        <LendingHubTile label="Borrowed" description="Your liabilities" href="/fire-lending/borrowed" icon={Wallet} />
        <LendingHubTile label="Lent" description="Receivables" href="/fire-lending/lent" icon={Handshake} />
      </div>
    </LendingMobileScreen>
  );
}
