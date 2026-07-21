"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, FileSignature, QrCode, Smartphone, Link2, UserSearch } from "lucide-react";
import { FireLendingBorrowerSearchPanel } from "@/components/fire-lending/FireLendingBorrowerSearchPanel";
import { LendingCompactHeader, LendingMobileScreen } from "@/components/fire-lending/FireLendingMobileScreens";
import {
  LendingGlassCard,
  LendingInput,
  LendingPrimaryButton,
  LendingSecondaryButton,
  LendingSelect,
  LendingStatusPill,
} from "@/components/fire-lending/FireLendingUiPrimitives";
import { useFireLending } from "@/contexts/FireLendingContext";
import { useFireTheme } from "@/contexts/FireThemeContext";
import type { BorrowerMemberProfile } from "@/lib/fire-lending/borrower-member";
import { formatLendingMoney } from "@/lib/fire-lending/format";
import type { ConnectionMethod, CurrencyCode, LoanRole, LoanType, LoanWizardDraft } from "@/lib/fire-lending/types";

const STEPS = ["Borrower", "Details", "Agreement", "Approval", "Signatures"] as const;

export function FireLendingLoanWizard() {
  const router = useRouter();
  const params = useSearchParams();
  const { store, createLoanFromWizard, signAgreement, downloadAgreement, partyById, upsertConnectedParty } = useFireLending();
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const [step, setStep] = useState(0);
  const [createdLoanId, setCreatedLoanId] = useState<string | null>(null);
  const [approval, setApproval] = useState<"pending" | "accepted" | "rejected" | "changes">("pending");
  const [connectedMember, setConnectedMember] = useState<BorrowerMemberProfile | null>(null);
  const [borrowerLocked, setBorrowerLocked] = useState(false);

  const initialMethod = (params.get("method") as ConnectionMethod | null) ?? "fire_id";
  const modeRequest = params.get("mode") === "request";

  const [draft, setDraft] = useState<LoanWizardDraft>({
    connectionMethod: initialMethod,
    counterpartyQuery: "",
    counterpartyId: "",
    amount: "100000",
    currency: "NPR",
    interestRate: "12",
    loanType: "peer",
    durationMonths: "12",
    installmentCount: "12",
    gracePeriodDays: "5",
    lateFeePercent: "2",
    purpose: modeRequest ? "Personal loan request" : "Peer lending",
    notes: "",
    guarantor: "",
    collateral: "",
    role: modeRequest ? "borrower" : "lender",
  });

  const useRealtimeMemberSearch =
    draft.connectionMethod === "fire_id" || draft.connectionMethod === "qr";

  const matches = useMemo(() => {
    const q = draft.counterpartyQuery.trim().toLowerCase();
    return store.parties
      .filter((p) => p.id !== store.currentUserId)
      .filter((p) => {
        if (!q) return true;
        return (
          p.name.toLowerCase().includes(q) ||
          p.fireNepalId.toLowerCase().includes(q) ||
          p.mobile.includes(q)
        );
      });
  }, [draft.counterpartyQuery, store.currentUserId, store.parties]);

  const selected = partyById(draft.counterpartyId) ?? (connectedMember
    ? {
        id: connectedMember.id,
        name: connectedMember.fullName,
        fireNepalId: connectedMember.fireNepalId,
      }
    : undefined);
  const createdLoan = store.loans.find((l) => l.id === createdLoanId);
  const createdAgreement = store.agreements.find((a) => a.loanId === createdLoanId);

  const patch = <K extends keyof LoanWizardDraft>(key: K, value: LoanWizardDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const canNext = () => {
    if (step === 0) return Boolean(draft.counterpartyId) && (!useRealtimeMemberSearch || borrowerLocked);
    if (step === 1) return Number(draft.amount) > 0 && draft.purpose.trim().length > 0;
    if (step === 3) return approval === "accepted";
    return true;
  };

  const onCreate = () => {
    const id = createLoanFromWizard(draft);
    setCreatedLoanId(id);
    setStep(3);
  };

  const connectionOptions: { method: ConnectionMethod; label: string; icon: typeof UserSearch }[] = [
    { method: "fire_id", label: "FIRE Nepal ID", icon: UserSearch },
    { method: "mobile", label: "Mobile Number", icon: Smartphone },
    { method: "qr", label: "QR Code", icon: QrCode },
    { method: "invite_link", label: "Invite Link", icon: Link2 },
  ];

  const handleConnectMember = (member: BorrowerMemberProfile) => {
    const party = upsertConnectedParty(member);
    setConnectedMember(member);
    setBorrowerLocked(true);
    setDraft((d) => ({
      ...d,
      counterpartyId: party.id,
      counterpartyQuery: member.fireNepalId,
    }));
  };

  const handleDisconnectMember = () => {
    setBorrowerLocked(false);
    setConnectedMember(null);
    setDraft((d) => ({ ...d, counterpartyId: "", counterpartyQuery: "" }));
  };

  return (
    <LendingMobileScreen>
      <LendingCompactHeader
        eyebrow="Loan Creation Wizard"
        title={modeRequest ? "Request a Loan" : "Create Peer Loan"}
        subtitle="Connect → Details → Agreement → Approval → Digital signatures"
      />

      <div className="flex gap-1 overflow-x-auto pb-1">
        {STEPS.map((label, idx) => (
          <div
            key={label}
            className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${
              idx === step
                ? light
                  ? "border-emerald-400 bg-emerald-100 text-emerald-900"
                  : "border-emerald-400/40 bg-emerald-500/20 text-lime-200"
                : idx < step
                  ? light
                    ? "border-lime-300 bg-lime-50 text-lime-800"
                    : "border-lime-400/30 bg-lime-500/10 text-lime-200"
                  : light
                    ? "border-slate-200 bg-white text-slate-500"
                    : "border-emerald-400/10 bg-black/20 text-emerald-200/50"
            }`}
          >
            {idx < step ? <Check size={12} /> : <span>{idx + 1}</span>}
            {label}
          </div>
        ))}
      </div>

      {step === 0 ? (
        <LendingGlassCard title="Borrower Selection" subtitle="Connect via FIRE ID, mobile, QR or invite" icon={UserSearch}>
          <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {connectionOptions.map((opt) => (
              <button
                key={opt.method}
                type="button"
                disabled={borrowerLocked && useRealtimeMemberSearch}
                onClick={() => {
                  if (borrowerLocked) return;
                  patch("connectionMethod", opt.method);
                  setConnectedMember(null);
                  setDraft((d) => ({ ...d, connectionMethod: opt.method, counterpartyId: "", counterpartyQuery: "" }));
                }}
                className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-[10px] font-black transition disabled:opacity-60 ${
                  draft.connectionMethod === opt.method
                    ? light
                      ? "border-emerald-400 bg-emerald-50 text-emerald-900"
                      : "border-emerald-400/40 bg-emerald-500/15 text-lime-200"
                    : light
                      ? "border-emerald-200/70 bg-white text-slate-700"
                      : "border-emerald-400/15 bg-black/20 text-emerald-100"
                }`}
              >
                <opt.icon size={18} />
                {opt.label}
              </button>
            ))}
          </div>

          {useRealtimeMemberSearch ? (
            <FireLendingBorrowerSearchPanel
              connectedMember={connectedMember}
              locked={borrowerLocked}
              onConnect={handleConnectMember}
              onDisconnect={handleDisconnectMember}
            />
          ) : (
            <>
              <LendingInput
                label={
                  draft.connectionMethod === "mobile"
                    ? "Mobile number"
                    : draft.connectionMethod === "invite_link"
                      ? "Invite link / code"
                      : "FIRE Nepal ID or name"
                }
                value={draft.counterpartyQuery}
                onChange={(v) => patch("counterpartyQuery", v)}
                placeholder="Search member…"
              />
              <ul className="mt-3 space-y-1.5">
                {matches.map((party) => (
                  <li key={party.id}>
                    <button
                      type="button"
                      onClick={() => patch("counterpartyId", party.id)}
                      className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left transition ${
                        draft.counterpartyId === party.id
                          ? light
                            ? "border-emerald-400 bg-emerald-50"
                            : "border-emerald-400/40 bg-emerald-500/15"
                          : light
                            ? "border-emerald-200/60 bg-white/80"
                            : "border-emerald-400/10 bg-black/20"
                      }`}
                    >
                      <div>
                        <p className={`text-sm font-bold ${light ? "text-slate-900" : "text-emerald-50"}`}>{party.name}</p>
                        <p className={`text-[11px] font-semibold ${light ? "text-slate-500" : "text-emerald-200/60"}`}>
                          {party.fireNepalId} · {party.mobile} · Trust {party.trustScore}
                        </p>
                      </div>
                      <LendingStatusPill status={party.verified ? "verified" : "unverified"} />
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </LendingGlassCard>
      ) : null}

      {step === 1 ? (
        <LendingGlassCard title="Loan Details" icon={FileSignature}>
          <div className="grid gap-3 sm:grid-cols-2">
            <LendingSelect
              label="Your role"
              value={draft.role}
              onChange={(v) => patch("role", v as LoanRole)}
              options={[
                { value: "lender", label: "I am lending" },
                { value: "borrower", label: "I am borrowing" },
              ]}
            />
            <LendingSelect
              label="Currency"
              value={draft.currency}
              onChange={(v) => patch("currency", v as CurrencyCode)}
              options={[
                { value: "NPR", label: "NPR" },
                { value: "KRW", label: "KRW" },
                { value: "USD", label: "USD" },
              ]}
            />
            <LendingInput label="Amount" type="number" value={draft.amount} onChange={(v) => patch("amount", v)} />
            <LendingInput label="Interest % p.a." type="number" value={draft.interestRate} onChange={(v) => patch("interestRate", v)} />
            <LendingSelect
              label="Loan type"
              value={draft.loanType}
              onChange={(v) => patch("loanType", v as LoanType)}
              options={[
                { value: "peer", label: "Peer" },
                { value: "personal", label: "Personal" },
                { value: "business", label: "Business" },
                { value: "emergency", label: "Emergency" },
                { value: "education", label: "Education" },
              ]}
            />
            <LendingInput label="Duration (months)" type="number" value={draft.durationMonths} onChange={(v) => patch("durationMonths", v)} />
            <LendingInput label="Installments" type="number" value={draft.installmentCount} onChange={(v) => patch("installmentCount", v)} />
            <LendingInput label="Grace period (days)" type="number" value={draft.gracePeriodDays} onChange={(v) => patch("gracePeriodDays", v)} />
            <LendingInput label="Late fee %" type="number" value={draft.lateFeePercent} onChange={(v) => patch("lateFeePercent", v)} />
            <LendingInput label="Purpose" value={draft.purpose} onChange={(v) => patch("purpose", v)} />
            <LendingInput label="Guarantor" value={draft.guarantor} onChange={(v) => patch("guarantor", v)} placeholder="Optional" />
            <LendingInput label="Collateral" value={draft.collateral} onChange={(v) => patch("collateral", v)} placeholder="Optional" />
            <div className="sm:col-span-2">
              <LendingInput label="Notes" value={draft.notes} onChange={(v) => patch("notes", v)} placeholder="Private notes" />
            </div>
          </div>
        </LendingGlassCard>
      ) : null}

      {step === 2 ? (
        <LendingGlassCard title="Agreement Preview" subtitle="Professional digital agreement will be generated" icon={FileSignature} elite>
          <div className={`space-y-2 rounded-xl border p-4 ${light ? "border-emerald-200/70 bg-white/80" : "border-emerald-400/15 bg-black/25"}`}>
            <p className={`text-sm font-black ${light ? "text-slate-900" : "text-white"}`}>FIRE Nepal Peer Loan Agreement</p>
            <p className={`text-xs font-semibold ${light ? "text-slate-600" : "text-emerald-200/70"}`}>
              Parties: You ↔ {selected?.name ?? "—"} ({selected?.fireNepalId})
            </p>
            <p className={`text-xs font-semibold ${light ? "text-slate-600" : "text-emerald-200/70"}`}>
              Principal {formatLendingMoney(Number(draft.amount) || 0, draft.currency)} at {draft.interestRate}% for {draft.durationMonths} months
            </p>
            <p className={`text-xs font-semibold ${light ? "text-slate-600" : "text-emerald-200/70"}`}>
              Purpose: {draft.purpose}. Grace {draft.gracePeriodDays}d · Late fee {draft.lateFeePercent}%.
            </p>
            <p className={`text-[11px] ${light ? "text-slate-500" : "text-emerald-200/55"}`}>
              Includes EMI schedule, QR verification, timestamps and dual digital signatures.
            </p>
          </div>
          <div className="mt-3">
            <LendingPrimaryButton onClick={onCreate}>Generate agreement & continue</LendingPrimaryButton>
          </div>
        </LendingGlassCard>
      ) : null}

      {step === 3 && createdLoan ? (
        <LendingGlassCard title="Borrower Approval" subtitle="Accept, reject or request changes" icon={FileSignature}>
          <p className={`mb-3 text-sm font-semibold ${light ? "text-slate-700" : "text-emerald-100"}`}>
            Counterparty notification sent for {createdLoan.agreementNumber}. Simulate their response:
          </p>
          <div className="flex flex-wrap gap-2">
            <LendingPrimaryButton onClick={() => setApproval("accepted")}>Accept</LendingPrimaryButton>
            <LendingSecondaryButton onClick={() => setApproval("rejected")}>Reject</LendingSecondaryButton>
            <LendingSecondaryButton onClick={() => setApproval("changes")}>Request Changes</LendingSecondaryButton>
          </div>
          <p className="mt-3">
            <LendingStatusPill status={approval === "changes" ? "changes_requested" : approval} />
          </p>
        </LendingGlassCard>
      ) : null}

      {step === 4 && createdLoan ? (
        <LendingGlassCard title="Digital Signatures" subtitle="Both parties must sign to activate" icon={FileSignature} elite>
          <div className="space-y-2">
            <div className={`flex items-center justify-between rounded-xl border px-3 py-2.5 ${light ? "border-emerald-200/70 bg-white" : "border-emerald-400/15 bg-black/20"}`}>
              <span className="text-sm font-bold">Lender signature</span>
              {createdLoan.lenderSigned ? (
                <LendingStatusPill status="signed" />
              ) : (
                <LendingPrimaryButton onClick={() => signAgreement(createdLoan.id, "lender")}>Sign as lender</LendingPrimaryButton>
              )}
            </div>
            <div className={`flex items-center justify-between rounded-xl border px-3 py-2.5 ${light ? "border-emerald-200/70 bg-white" : "border-emerald-400/15 bg-black/20"}`}>
              <span className="text-sm font-bold">Borrower signature</span>
              {createdLoan.borrowerSigned ? (
                <LendingStatusPill status="signed" />
              ) : (
                <LendingPrimaryButton onClick={() => signAgreement(createdLoan.id, "borrower")}>Sign as borrower</LendingPrimaryButton>
              )}
            </div>
            {createdAgreement ? (
              <LendingSecondaryButton onClick={() => void downloadAgreement(createdLoan.id)}>Download PDF</LendingSecondaryButton>
            ) : null}
            {createdLoan.lenderSigned && createdLoan.borrowerSigned ? (
              <p className={`text-sm font-black ${light ? "text-emerald-700" : "text-lime-300"}`}>
                Agreement active. Loan is live in your portfolio.
              </p>
            ) : null}
          </div>
        </LendingGlassCard>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {step > 0 && step !== 2 ? (
          <LendingSecondaryButton onClick={() => setStep((s) => Math.max(0, s - 1))}>Back</LendingSecondaryButton>
        ) : null}
        {step < 2 ? (
          <LendingPrimaryButton
            disabled={!canNext()}
            onClick={() => setStep((s) => s + 1)}
          >
            Continue
          </LendingPrimaryButton>
        ) : null}
        {step === 3 ? (
          <LendingPrimaryButton
            disabled={!canNext()}
            onClick={() => setStep(4)}
          >
            Continue to signatures
          </LendingPrimaryButton>
        ) : null}
        {step === 4 && createdLoan?.lenderSigned && createdLoan.borrowerSigned ? (
          <LendingPrimaryButton onClick={() => router.push(`/fire-lending/loans/${createdLoan.id}`)}>Open loan</LendingPrimaryButton>
        ) : null}
      </div>
    </LendingMobileScreen>
  );
}
