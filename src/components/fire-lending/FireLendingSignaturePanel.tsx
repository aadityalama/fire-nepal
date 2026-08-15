"use client";

import { CheckCircle2, PenLine } from "lucide-react";
import {
  actorRoleOnLoan,
  bothPartiesSigned,
  SIGNATURE_UI,
  signatureStatusMessage,
} from "@/lib/fire-lending/agreement-signatures";
import { isSelfLoan } from "@/lib/fire-lending/loan-party-identity";
import type { FireLendingLoan, LoanRole } from "@/lib/fire-lending/types";
import { LendingPrimaryButton, LendingStatusPill } from "@/components/fire-lending/FireLendingUiPrimitives";
import { useFireTheme } from "@/contexts/FireThemeContext";

type Props = {
  loan: FireLendingLoan;
  currentUserId: string;
  onSign: (as: LoanRole) => void;
  busy?: boolean;
  compact?: boolean;
};

export function FireLendingSignaturePanel({ loan, currentUserId, onSign, busy, compact }: Props) {
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const viewerRole = actorRoleOnLoan(loan, currentUserId);
  const statusMsg = signatureStatusMessage(loan, viewerRole);
  const both = bothPartiesSigned(loan);
  const invalidIdentity = Boolean(loan.identityInvalid || isSelfLoan(loan));

  const rowClass = light
    ? "border-emerald-200/70 bg-white"
    : "border-emerald-400/15 bg-black/20";

  if (invalidIdentity) {
    return (
      <div className="space-y-2" data-testid="signature-panel-invalid-identity">
        <p role="alert" className={`text-sm font-bold ${light ? "text-rose-700" : "text-rose-300"}`}>
          Invalid loan identity: lender and borrower are the same member. Signatures are disabled.
        </p>
      </div>
    );
  }

  const renderPartyRow = (role: LoanRole, signed: boolean) => {
    const isViewer = viewerRole === role;
    const label = role === "lender" ? "Lender" : "Borrower";
    const signLabel = role === "lender" ? SIGNATURE_UI.signAsLender : SIGNATURE_UI.signAsBorrower;

    return (
      <div
        key={role}
        data-testid={`signature-row-${role}`}
        data-viewer-role={isViewer ? "self" : "other"}
        className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 ${rowClass}`}
      >
        <div className="flex min-w-0 items-center gap-2">
          {signed ? (
            <CheckCircle2 size={16} className={light ? "text-emerald-600" : "text-lime-300"} aria-hidden />
          ) : (
            <PenLine size={16} className={light ? "text-slate-400" : "text-emerald-200/50"} aria-hidden />
          )}
          <span className="text-sm font-bold">{label}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {signed ? (
            <span
              data-testid={`signature-status-${role}-signed`}
              className={`inline-flex items-center gap-1 text-xs font-black ${light ? "text-emerald-700" : "text-lime-300"}`}
            >
              ✓ Signed
            </span>
          ) : (
            <span
              data-testid={`signature-status-${role}-pending`}
              className={`text-xs font-bold ${light ? "text-amber-700" : "text-amber-300"}`}
            >
              Pending
            </span>
          )}
          {/* Only the authenticated party sees their own Sign action — never the other party's. */}
          {isViewer && !signed ? (
            <LendingPrimaryButton
              data-testid={`sign-as-${role}`}
              disabled={busy}
              onClick={() => onSign(role)}
            >
              {signLabel}
            </LendingPrimaryButton>
          ) : null}
        </div>
      </div>
    );
  };

  return (
    <div className={compact ? "space-y-2" : "space-y-3"} data-testid="signature-panel">
      {renderPartyRow("lender", loan.lenderSigned)}
      {renderPartyRow("borrower", loan.borrowerSigned)}
      {statusMsg ? (
        <p
          role="status"
          data-testid="signature-status-message"
          className={`text-sm font-black ${
            both
              ? light
                ? "text-emerald-700"
                : "text-lime-300"
              : light
                ? "text-slate-600"
                : "text-emerald-100/80"
          }`}
        >
          {statusMsg}
        </p>
      ) : null}
      {both ? <LendingStatusPill status="signed" /> : null}
    </div>
  );
}
