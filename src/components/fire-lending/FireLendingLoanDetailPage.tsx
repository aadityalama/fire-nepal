"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { FileText, Landmark } from "lucide-react";
import { LendingCompactHeader, LendingMobileScreen } from "@/components/fire-lending/FireLendingMobileScreens";
import {
  LendingEmptyState,
  LendingGlassCard,
  LendingPrimaryButton,
  LendingPrimaryLink,
  LendingSecondaryButton,
  LendingStatusPill,
} from "@/components/fire-lending/FireLendingUiPrimitives";
import { useFireLending } from "@/contexts/FireLendingContext";
import { useFireTheme } from "@/contexts/FireThemeContext";
import { formatCompactDate, formatLendingMoney } from "@/lib/fire-lending/format";
import {
  documentsForLoan,
  formatLoanDocSize,
  loanDocTypeLabel,
} from "@/lib/fire-lending/loan-documents";
import { trustLabel } from "@/lib/fire-lending/trust-score";

export function FireLendingLoanDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { store, partyById, downloadAgreement, downloadLoanDocument, signAgreement } = useFireLending();
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const loan = store.loans.find((l) => l.id === id);
  const party = loan ? partyById(loan.counterpartyId) : undefined;
  const installments = store.installments.filter((i) => i.loanId === id).sort((a, b) => a.sequence - b.sequence);
  const payments = store.payments.filter((p) => p.loanId === id);
  const documents = id ? documentsForLoan(store, id) : [];
  const [docError, setDocError] = useState<string | null>(null);
  const [agreementBusy, setAgreementBusy] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  if (!loan) {
    return (
      <LendingMobileScreen>
        <LendingEmptyState message="Loan not found." />
        <LendingPrimaryLink href="/fire-lending/loans">Back to loans</LendingPrimaryLink>
      </LendingMobileScreen>
    );
  }

  const onDownloadAgreement = async () => {
    setDocError(null);
    setAgreementBusy(true);
    try {
      await downloadAgreement(loan.id);
    } catch (e) {
      setDocError(e instanceof Error ? e.message : "Could not download agreement letter.");
    } finally {
      setAgreementBusy(false);
    }
  };

  const onDownloadDoc = async (documentId: string) => {
    setDocError(null);
    setDownloadingId(documentId);
    try {
      await downloadLoanDocument(loan.id, documentId);
    } catch (e) {
      setDocError(e instanceof Error ? e.message : "Could not download document.");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <LendingMobileScreen>
      <LendingCompactHeader
        eyebrow={loan.agreementNumber}
        title={party?.name ?? "Loan detail"}
        subtitle={`${loan.role === "lender" ? "You lent" : "You borrowed"} · ${loan.purpose}`}
      />

      <LendingGlassCard title="Loan overview" icon={Landmark} elite>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Principal", value: formatLendingMoney(loan.amount, loan.currency) },
            { label: "Outstanding", value: formatLendingMoney(loan.outstanding, loan.currency) },
            { label: "Interest", value: `${loan.interestRate}% p.a.` },
            { label: "Risk score", value: String(loan.riskScore) },
            { label: "Paid", value: formatLendingMoney(loan.totalPaid, loan.currency) },
            { label: "Status", value: loan.status },
          ].map((item) => (
            <div key={item.label} className={`rounded-xl border px-3 py-2 ${light ? "border-emerald-200/60 bg-white/70" : "border-emerald-400/10 bg-black/20"}`}>
              <p className={`text-[9px] font-black uppercase tracking-wider ${light ? "text-slate-500" : "text-emerald-200/60"}`}>{item.label}</p>
              <p className={`mt-1 text-sm font-black ${light ? "text-slate-900" : "text-emerald-50"}`}>{item.value}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <LendingPrimaryLink href="/fire-lending/payments/new">Record payment</LendingPrimaryLink>
          <LendingPrimaryButton
            data-testid="download-agreement-letter"
            disabled={agreementBusy}
            onClick={() => void onDownloadAgreement()}
          >
            {agreementBusy ? "Generating…" : "Download Agreement Letter"}
          </LendingPrimaryButton>
          {!loan.lenderSigned ? <LendingPrimaryButton onClick={() => signAgreement(loan.id, "lender")}>Sign lender</LendingPrimaryButton> : null}
          {!loan.borrowerSigned ? <LendingPrimaryButton onClick={() => signAgreement(loan.id, "borrower")}>Sign borrower</LendingPrimaryButton> : null}
        </div>
      </LendingGlassCard>

      <LendingGlassCard title="Documents" subtitle="Supporting files attached to this loan" icon={FileText}>
        {documents.length === 0 ? (
          <LendingEmptyState message="No supporting documents uploaded for this loan." />
        ) : (
          <ul className="space-y-1.5" data-testid="loan-detail-documents">
            {documents.map((doc) => (
              <li
                key={doc.id}
                className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2.5 ${
                  light ? "border-emerald-200/60 bg-white/80" : "border-emerald-400/10 bg-black/20"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-sm font-bold ${light ? "text-slate-900" : "text-emerald-50"}`}>
                    {doc.fileName || doc.title}
                  </p>
                  <p className={`text-[11px] ${light ? "text-slate-500" : "text-emerald-200/60"}`}>
                    {loanDocTypeLabel(doc.mimeType || "", doc.fileName || doc.title)}
                    {doc.sizeBytes != null ? ` · ${formatLoanDocSize(doc.sizeBytes)}` : ""}
                    {" · "}
                    {formatCompactDate(doc.createdAt)}
                  </p>
                </div>
                <LendingSecondaryButton
                  disabled={downloadingId === doc.id || !(doc.url || doc.storagePath)}
                  onClick={() => void onDownloadDoc(doc.id)}
                >
                  {downloadingId === doc.id ? "Downloading…" : "Download"}
                </LendingSecondaryButton>
              </li>
            ))}
          </ul>
        )}
        {docError ? (
          <p role="alert" className="mt-2 text-[11px] font-semibold text-rose-400">
            {docError}
          </p>
        ) : null}
      </LendingGlassCard>

      {party ? (
        <LendingGlassCard title="Counterparty" icon={FileText}>
          <p className={`text-sm font-black ${light ? "text-slate-900" : "text-white"}`}>{party.name}</p>
          <p className={`text-xs font-semibold ${light ? "text-slate-600" : "text-emerald-200/65"}`}>
            {party.fireNepalId} · {party.mobile} · Trust {party.trustScore} ({trustLabel(party.trustScore)})
          </p>
          <LendingStatusPill status={party.identityVerified ? "verified" : "unverified"} />
        </LendingGlassCard>
      ) : null}

      <LendingGlassCard title="EMI schedule" icon={Landmark}>
        <ul className="max-h-72 space-y-1 overflow-y-auto">
          {installments.map((row) => (
            <li key={row.id} className={`flex justify-between rounded-lg border px-2.5 py-2 text-xs ${light ? "border-emerald-100 bg-white" : "border-emerald-400/10 bg-black/20"}`}>
              <span>
                #{row.sequence} · {formatCompactDate(row.dueDate)}
              </span>
              <span className="font-black tabular-nums">
                {formatLendingMoney(row.amount, loan.currency)} <LendingStatusPill status={row.status} />
              </span>
            </li>
          ))}
        </ul>
      </LendingGlassCard>

      <LendingGlassCard title="Payments" icon={FileText}>
        {payments.length === 0 ? (
          <LendingEmptyState message="No payments yet." />
        ) : (
          <ul className="space-y-1.5">
            {payments.map((p) => (
              <li key={p.id} className={`flex justify-between rounded-xl border px-3 py-2 ${light ? "border-emerald-200/60" : "border-emerald-400/10"}`}>
                <span className="text-xs font-semibold">
                  {formatCompactDate(p.paidAt)} · {p.method}
                </span>
                <span className="text-sm font-black">{formatLendingMoney(p.amount, loan.currency)}</span>
              </li>
            ))}
          </ul>
        )}
      </LendingGlassCard>

      <Link href="/fire-lending/loans" className={`text-sm font-bold ${light ? "text-emerald-700" : "text-lime-300"}`}>
        ← Back to loans
      </Link>
    </LendingMobileScreen>
  );
}
