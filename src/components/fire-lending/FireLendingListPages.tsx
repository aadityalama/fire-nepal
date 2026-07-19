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
import { LendingCompactHeader, LendingMobileScreen } from "@/components/fire-lending/FireLendingMobileScreens";
import {
  LendingEmptyState,
  LendingGlassCard,
  LendingHubTile,
  LendingPrimaryButton,
  LendingPrimaryLink,
  LendingSecondaryButton,
  LendingStatusPill,
  LendingInput,
  LendingSelect,
} from "@/components/fire-lending/FireLendingUiPrimitives";
import { useFireLending } from "@/contexts/FireLendingContext";
import { useFireTheme } from "@/contexts/FireThemeContext";
import { formatCompactDate, formatLendingMoney } from "@/lib/fire-lending/format";
import { trustLabel } from "@/lib/fire-lending/trust-score";
import { useState } from "react";
import type { PaymentMethod } from "@/lib/fire-lending/types";
import { FireLendingDashboardAnalytics } from "@/components/fire-lending/FireLendingDashboardAnalytics";

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
        <LendingEmptyState message="Loading…" />
      ) : loans.length === 0 ? (
        <LendingEmptyState message="No loans in this view." />
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

  return (
    <LendingMobileScreen>
      <LendingCompactHeader eyebrow="Loan Requests" title="Incoming & outgoing" subtitle="Accept, reject or request changes." />
      <LendingGlassCard title="Requests" icon={Inbox}>
        {store.requests.length === 0 ? (
          <LendingEmptyState message="No loan requests." />
        ) : (
          <ul className="space-y-2">
            {store.requests.map((req) => {
              const from = partyById(req.fromPartyId);
              const to = partyById(req.toPartyId);
              return (
                <li
                  key={req.id}
                  className={`rounded-xl border px-3 py-3 ${light ? "border-emerald-200/60 bg-white/80" : "border-emerald-400/10 bg-black/20"}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className={`text-sm font-black ${light ? "text-slate-900" : "text-emerald-50"}`}>
                        {from?.name} → {to?.name}
                      </p>
                      <p className={`text-[11px] font-semibold ${light ? "text-slate-600" : "text-emerald-200/65"}`}>
                        {formatLendingMoney(req.amount, req.currency)} · {req.interestRate}% · {req.durationMonths} mo · {req.purpose}
                      </p>
                      {req.message ? <p className={`mt-1 text-xs ${light ? "text-slate-500" : "text-emerald-200/55"}`}>{req.message}</p> : null}
                      {req.changeRequest ? <p className={`mt-1 text-xs font-bold text-amber-500`}>{req.changeRequest}</p> : null}
                    </div>
                    <LendingStatusPill status={req.status} />
                  </div>
                  {req.status === "pending" ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <LendingPrimaryButton onClick={() => respondToRequest(req.id, "accepted")}>Accept</LendingPrimaryButton>
                      <LendingSecondaryButton onClick={() => respondToRequest(req.id, "rejected")}>Reject</LendingSecondaryButton>
                      <LendingSecondaryButton onClick={() => respondToRequest(req.id, "changes_requested", "Please adjust rate/tenure.")}>
                        Request changes
                      </LendingSecondaryButton>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
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
          <LendingEmptyState message="No payments recorded." />
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
          <LendingEmptyState message="No installments." />
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
  const { store } = useFireLending();
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const parties = store.parties.filter((p) => p.id !== store.currentUserId && (p.rolePreference === role || p.rolePreference === "both"));

  return (
    <LendingGlassCard title={role === "borrower" ? "Borrowers" : "Lenders"} icon={role === "borrower" ? Users : UserRound}>
      <ul className="space-y-1.5">
        {parties.map((p) => (
          <li
            key={p.id}
            className={`flex items-center justify-between rounded-xl border px-3 py-2.5 ${
              light ? "border-emerald-200/60 bg-white/80" : "border-emerald-400/10 bg-black/20"
            }`}
          >
            <div>
              <p className={`text-sm font-bold ${light ? "text-slate-900" : "text-emerald-50"}`}>{p.name}</p>
              <p className={`text-[11px] ${light ? "text-slate-500" : "text-emerald-200/60"}`}>
                {p.fireNepalId} · {p.mobile} · {trustLabel(p.trustScore)}
              </p>
            </div>
            <div className="text-right">
              <p className={`text-lg font-black tabular-nums ${light ? "text-amber-700" : "text-amber-300"}`}>{p.trustScore}</p>
              <LendingStatusPill status={p.identityVerified ? "verified" : "unverified"} />
            </div>
          </li>
        ))}
      </ul>
    </LendingGlassCard>
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
      <LendingCompactHeader eyebrow="Agreements" title="Digital contracts" subtitle="PDF download, QR verify, signatures." />
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
                  <LendingSecondaryButton onClick={() => void downloadAgreement(agr.loanId)}>Download PDF</LendingSecondaryButton>
                  {loan && !loan.lenderSigned ? (
                    <LendingPrimaryButton onClick={() => signAgreement(agr.loanId, "lender")}>Sign lender</LendingPrimaryButton>
                  ) : null}
                  {loan && !loan.borrowerSigned ? (
                    <LendingPrimaryButton onClick={() => signAgreement(agr.loanId, "borrower")}>Sign borrower</LendingPrimaryButton>
                  ) : null}
                </div>
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
  const { store } = useFireLending();
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";

  return (
    <LendingMobileScreen>
      <LendingCompactHeader eyebrow="Documents" title="Vault" subtitle="Agreements, IDs, collateral & proofs." />
      <LendingGlassCard title="Files" icon={Shield}>
        <ul className="space-y-1.5">
          {store.documents.map((doc) => (
            <li
              key={doc.id}
              className={`flex items-center justify-between rounded-xl border px-3 py-2.5 ${
                light ? "border-emerald-200/60 bg-white/80" : "border-emerald-400/10 bg-black/20"
              }`}
            >
              <div>
                <p className={`text-sm font-bold ${light ? "text-slate-900" : "text-emerald-50"}`}>{doc.title}</p>
                <p className={`text-[11px] ${light ? "text-slate-500" : "text-emerald-200/60"}`}>
                  {doc.kind} · {formatCompactDate(doc.createdAt)}
                </p>
              </div>
              <LendingStatusPill status={doc.kind} />
            </li>
          ))}
        </ul>
      </LendingGlassCard>
    </LendingMobileScreen>
  );
}

export function FireLendingSettingsPage() {
  const { resetDemoData, store } = useFireLending();
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";

  return (
    <LendingMobileScreen>
      <LendingCompactHeader eyebrow="Settings" title="Lending preferences" subtitle="Demo data, notifications & future marketplace." />
      <LendingGlassCard title="Module settings" icon={Settings}>
        <p className={`mb-3 text-sm font-semibold ${light ? "text-slate-600" : "text-emerald-200/70"}`}>
          Current user FIRE ID: {store.parties.find((p) => p.id === store.currentUserId)?.fireNepalId ?? "—"}
        </p>
        <p className={`mb-4 text-xs font-semibold ${light ? "text-slate-500" : "text-emerald-200/55"}`}>
          Architecture is ready for public P2P marketplace, escrow, multi-currency, guarantor & insurance modules.
        </p>
        <LendingSecondaryButton onClick={resetDemoData}>Reset demo portfolio</LendingSecondaryButton>
      </LendingGlassCard>
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
