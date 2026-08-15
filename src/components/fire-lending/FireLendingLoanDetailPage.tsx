"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { FileText, Landmark, Loader2 } from "lucide-react";
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
import { findLoanInStore } from "@/lib/fire-lending/agreement-parties";
import { formatCompactDate, formatLendingMoney } from "@/lib/fire-lending/format";
import { trustLabel } from "@/lib/fire-lending/trust-score";

export function FireLendingLoanDetailPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === "string" ? decodeURIComponent(params.id) : "";
  const { store, loading, partyById, downloadAgreement, signAgreement } = useFireLending();
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  // Support /loans/{loanId} and /loans/{agreementNumber} (e.g. FN-LN-2026-681232).
  const loan = findLoanInStore(store, id);
  const party = loan ? partyById(loan.counterpartyId) : undefined;
  const installments = loan
    ? store.installments.filter((i) => i.loanId === loan.id).sort((a, b) => a.sequence - b.sequence)
    : [];
  const payments = loan ? store.payments.filter((p) => p.loanId === loan.id) : [];

  const onDownloadAgreement = async () => {
    if (!loan || downloading) return;
    setDownloading(true);
    setDownloadError(null);
    try {
      const result = await downloadAgreement(loan.id);
      if (!result.ok) setDownloadError(result.error);
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : "Could not download the loan agreement.");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <LendingMobileScreen>
        <LendingCompactHeader eyebrow="Loan" title="Loading loan…" subtitle="Fetching your lending record." />
        <LendingGlassCard title="Loan overview" icon={Landmark}>
          <div className="flex items-center gap-2 text-sm font-semibold opacity-80">
            <Loader2 size={16} className="animate-spin" />
            Loading loan details…
          </div>
        </LendingGlassCard>
      </LendingMobileScreen>
    );
  }

  if (!loan) {
    return (
      <LendingMobileScreen>
        <LendingEmptyState message="Loan not found." />
        <p className={`mb-3 text-xs font-semibold ${light ? "text-slate-500" : "text-emerald-200/60"}`}>
          No loan matched “{id || "—"}”. Check the agreement number or open the loan from My Loans.
        </p>
        <LendingPrimaryLink href="/fire-lending/loans">Back to loans</LendingPrimaryLink>
      </LendingMobileScreen>
    );
  }

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
          <LendingSecondaryButton onClick={() => void onDownloadAgreement()} disabled={downloading}>
            {downloading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" />
                Generating PDF…
              </span>
            ) : (
              "Download agreement"
            )}
          </LendingSecondaryButton>
          {!loan.lenderSigned ? <LendingPrimaryButton onClick={() => signAgreement(loan.id, "lender")}>Sign lender</LendingPrimaryButton> : null}
          {!loan.borrowerSigned ? <LendingPrimaryButton onClick={() => signAgreement(loan.id, "borrower")}>Sign borrower</LendingPrimaryButton> : null}
        </div>
        {downloadError ? (
          <p role="alert" className="mt-2 text-[11px] font-semibold text-rose-400">
            {downloadError}
          </p>
        ) : null}
      </LendingGlassCard>

      {party ? (
        <LendingGlassCard title="Counterparty" icon={FileText}>
          <p className={`text-sm font-black ${light ? "text-slate-900" : "text-white"}`}>{party.name}</p>
          <p className={`text-xs font-semibold ${light ? "text-slate-600" : "text-emerald-200/65"}`}>
            {party.fireNepalId} · Trust {party.trustScore} ({trustLabel(party.trustScore)})
          </p>
          <LendingStatusPill status={party.identityVerified ? "verified" : "unverified"} />
        </LendingGlassCard>
      ) : (
        <LendingGlassCard title="Counterparty" icon={FileText}>
          <p className={`text-sm font-semibold ${light ? "text-slate-600" : "text-emerald-200/70"}`}>
            Counterparty profile is not linked in this workspace yet. The agreement PDF will still generate from the loan record.
          </p>
        </LendingGlassCard>
      )}

      <LendingGlassCard title="EMI schedule" icon={Landmark}>
        {installments.length === 0 ? (
          <LendingEmptyState message="No EMI schedule stored yet. Download agreement will rebuild it from loan terms." />
        ) : (
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
        )}
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
