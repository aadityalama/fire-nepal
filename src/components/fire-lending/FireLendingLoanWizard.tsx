"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, FileSignature, FileUp, QrCode, Smartphone, Link2, UserSearch } from "lucide-react";
import { FireLendingConfirmDialog } from "@/components/fire-lending/FireLendingConfirmDialog";
import { FireLendingMemberSearch } from "@/components/fire-lending/FireLendingMemberSearch";
import { FireLendingSignaturePanel } from "@/components/fire-lending/FireLendingSignaturePanel";
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
import { formatLendingMoney, uid } from "@/lib/fire-lending/format";
import { bothPartiesSigned } from "@/lib/fire-lending/agreement-signatures";
import { findRequestForLoan, LOAN_REQUEST_UI } from "@/lib/fire-lending/loan-request-approval";
import {
  formatLoanDocSize,
  loanDocTypeLabel,
  pendingToFireLendingDocument,
  type PendingLoanDocument,
} from "@/lib/fire-lending/loan-documents";
import { uploadFilesToPendingDocuments } from "@/lib/fire-lending/loan-document-client";
import { partyToP2PSearchHit } from "@/lib/fire-lending/party-to-search-hit";
import type { P2PMemberSearchHit } from "@/lib/fire-lending/p2p-member-types";
import {
  canContinueBorrowerStep,
  resolveBorrowerContinue,
  shouldKeepBorrowerSelection,
} from "@/lib/fire-lending/wizard-borrower-selection";
import type { ConnectionMethod, CurrencyCode, LoanRole, LoanType, LoanWizardDraft } from "@/lib/fire-lending/types";

const STEPS = ["Borrower", "Details", "Agreement", "Approval", "Signatures"] as const;

export function FireLendingLoanWizard() {
  const router = useRouter();
  const params = useSearchParams();
  const {
    store,
    createLoanFromWizard,
    sendLoanRequestForLoan,
    signAgreement,
    downloadAgreement,
    partyById,
    ensureCounterpartyFromSearchHit,
  } = useFireLending();
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const [step, setStep] = useState(0);
  const [createdLoanId, setCreatedLoanId] = useState<string | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [pendingDocs, setPendingDocs] = useState<PendingLoanDocument[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [draftLoanKey] = useState(() => `draft_${uid("wiz")}`);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialMethod = (params.get("method") as ConnectionMethod | null) ?? "fire_id";
  const modeRequest = params.get("mode") === "request";
  const prefillFireId = params.get("fireId")?.trim() ?? "";

  const [draft, setDraft] = useState<LoanWizardDraft>({
    connectionMethod: initialMethod,
    counterpartyQuery: prefillFireId,
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

  const localHits = useMemo(
    () =>
      store.parties
        .filter((p) => p.id !== store.currentUserId && (p.verified || p.identityVerified))
        .map(partyToP2PSearchHit),
    [store.currentUserId, store.parties],
  );

  const selected = partyById(draft.counterpartyId);
  const createdLoan = store.loans.find((l) => l.id === createdLoanId);
  const createdAgreement = store.agreements.find((a) => a.loanId === createdLoanId);
  const linkedRequest = createdLoanId ? findRequestForLoan(store, createdLoanId) : undefined;
  const requestStatus = linkedRequest?.status;
  const borrowerAccepted = requestStatus === "accepted";
  const borrowerRejected = requestStatus === "rejected";
  const requestPending = requestStatus === "pending";
  const requestSent = Boolean(linkedRequest);
  const borrowerStepReady = canContinueBorrowerStep(draft.counterpartyId);

  useEffect(() => {
    if (!prefillFireId || draft.counterpartyId) return;
    const existing = store.parties.find(
      (p) => p.id !== store.currentUserId && p.fireNepalId.trim().toUpperCase() === prefillFireId.toUpperCase(),
    );
    if (existing) {
      setDraft((d) => ({ ...d, counterpartyId: existing.id, counterpartyQuery: existing.fireNepalId }));
      setStepError(null);
    }
  }, [prefillFireId, draft.counterpartyId, store.currentUserId, store.parties]);

  const patch = <K extends keyof LoanWizardDraft>(key: K, value: LoanWizardDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const onSelectMember = useCallback(
    (hit: P2PMemberSearchHit) => {
      const partyId = ensureCounterpartyFromSearchHit(hit);
      if (!partyId) {
        setStepError("Could not save this borrower selection. Try selecting the member again.");
        return;
      }
      setStepError(null);
      setDraft((d) => ({
        ...d,
        // Commit the wizard borrower selection used by Continue / createLoan.
        counterpartyId: partyId,
        // Keep canonical FIRE Nepal ID in the search box (stable, exact-match friendly).
        counterpartyQuery: hit.fireNepalId,
        connectionMethod: d.connectionMethod === "qr" ? "qr" : "fire_id",
      }));
    },
    [ensureCounterpartyFromSearchHit],
  );

  const onSearchQueryChange = useCallback(
    (query: string) => {
      setDraft((d) => {
        const current = d.counterpartyId ? store.parties.find((p) => p.id === d.counterpartyId) : undefined;
        const keep = shouldKeepBorrowerSelection({
          query,
          selectedFireNepalId: current?.fireNepalId,
          selectedDisplayName: current?.name,
        });
        return {
          ...d,
          counterpartyQuery: query,
          counterpartyId: keep ? d.counterpartyId : "",
        };
      });
      setStepError(null);
    },
    [store.parties],
  );

  /** Mobile / invite: commit a local verified party when the query uniquely matches. */
  useEffect(() => {
    if (draft.connectionMethod !== "mobile" && draft.connectionMethod !== "invite_link") return;
    if (draft.counterpartyId) return;
    const q = draft.counterpartyQuery.trim();
    if (q.length < 3) return;
    const digits = q.replace(/\D/g, "");
    const matches = store.parties.filter((p) => {
      if (p.id === store.currentUserId) return false;
      if (!(p.verified || p.identityVerified)) return false;
      if (digits.length >= 7 && p.mobile.replace(/\D/g, "").includes(digits)) return true;
      if (p.fireNepalId.trim().toUpperCase() === q.toUpperCase()) return true;
      return false;
    });
    if (matches.length === 1) {
      setDraft((d) => ({ ...d, counterpartyId: matches[0]!.id }));
      setStepError(null);
    }
  }, [draft.connectionMethod, draft.counterpartyQuery, draft.counterpartyId, store.currentUserId, store.parties]);

  const canNext = () => {
    if (step === 0) return borrowerStepReady;
    if (step === 1) return Number(draft.amount) > 0 && draft.purpose.trim().length > 0;
    // After sending the request, continue to role-based signatures (Accept happens later).
    if (step === 3) return requestSent && !borrowerRejected;
    return true;
  };

  const onContinue = () => {
    if (step === 0) {
      const result = resolveBorrowerContinue({
        counterpartyId: draft.counterpartyId,
        partyExists: Boolean(partyById(draft.counterpartyId)),
      });
      if (result.error || result.nextStep == null) {
        setStepError(result.error ?? "Select a verified borrower before continuing to loan details.");
        return;
      }
      setStepError(null);
      setStep(result.nextStep);
      return;
    }
    if (step === 1) {
      if (!(Number(draft.amount) > 0 && draft.purpose.trim().length > 0)) {
        setStepError("Enter a valid amount and purpose before continuing.");
        return;
      }
      setStepError(null);
      setStep(2);
      return;
    }
    setStep((s) => s + 1);
  };

  const onCreate = () => {
    if (!canContinueBorrowerStep(draft.counterpartyId)) {
      setStepError("Borrower selection was lost. Go back and select the borrower again.");
      setStep(0);
      return;
    }
    if (pendingDocs.some((d) => d.status === "uploading")) {
      setStepError("Wait for document uploads to finish before continuing.");
      return;
    }
    const readyDocs = pendingDocs
      .filter((d) => d.status === "ready" && (d.url || d.storagePath))
      .map((d) => pendingToFireLendingDocument(d, "pending"));
    const id = createLoanFromWizard(draft, readyDocs);
    setCreatedLoanId(id);
    setSuccessMessage(null);
    setStepError(null);
    setStep(3);
  };

  const onPickDocuments = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setUploadError(null);
    setUploading(true);
    try {
      const { docs, errors } = await uploadFilesToPendingDocuments({
        files: fileList,
        draftLoanId: draftLoanKey,
        existing: pendingDocs.filter((d) => d.status !== "error"),
        onProgress: setPendingDocs,
      });
      setPendingDocs(docs);
      if (errors.length) {
        setUploadError(errors.join(" "));
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const onRemovePendingDoc = (id: string) => {
    setPendingDocs((prev) => prev.filter((d) => d.id !== id));
  };

  const onDownloadPendingDoc = async (doc: PendingLoanDocument) => {
    if (!doc.url) {
      setUploadError("This file is not ready to download yet.");
      return;
    }
    try {
      const { downloadFromUrlAsFile } = await import("@/lib/fire-lending/loan-documents");
      await downloadFromUrlAsFile(doc.url, doc.fileName);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Could not download file.");
    }
  };

  const onConfirmSendRequest = () => {
    if (!createdLoanId || sending) return;
    setSending(true);
    setStepError(null);
    const error = sendLoanRequestForLoan(createdLoanId);
    setSending(false);
    if (error) {
      setStepError(error);
      return;
    }
    setConfirmOpen(false);
    setSuccessMessage(LOAN_REQUEST_UI.successMessage);
  };

  const connectionOptions: { method: ConnectionMethod; label: string; icon: typeof UserSearch }[] = [
    { method: "fire_id", label: "FIRE Nepal ID", icon: UserSearch },
    { method: "mobile", label: "Mobile Number", icon: Smartphone },
    { method: "qr", label: "QR Code", icon: QrCode },
    { method: "invite_link", label: "Invite Link", icon: Link2 },
  ];

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
        <LendingGlassCard title="Borrower Selection" subtitle="Search verified FIRE Nepal members securely" icon={UserSearch}>
          <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {connectionOptions.map((opt) => (
              <button
                key={opt.method}
                type="button"
                onClick={() => patch("connectionMethod", opt.method)}
                className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-[10px] font-black transition ${
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

          {draft.connectionMethod === "fire_id" || draft.connectionMethod === "qr" ? (
            <FireLendingMemberSearch
              value={draft.counterpartyQuery}
              onQueryChange={onSearchQueryChange}
              onSelectMember={onSelectMember}
              selectedFireNepalId={selected?.fireNepalId}
              localHits={localHits}
              label={draft.connectionMethod === "qr" ? "QR / FIRE Nepal ID search" : "FIRE Nepal ID or member name"}
              placeholder="Search FIRE Nepal ID or member name..."
            />
          ) : (
            <LendingInput
              label={draft.connectionMethod === "mobile" ? "Mobile number" : "Invite link / code"}
              value={draft.counterpartyQuery}
              onChange={onSearchQueryChange}
              placeholder={draft.connectionMethod === "mobile" ? "Search by mobile in your network…" : "Paste invite code…"}
              helperText="For verified FIRE ID discovery, switch to FIRE Nepal ID search."
            />
          )}

          {selected && borrowerStepReady ? (
            <div
              className={`mt-3 rounded-xl border px-3 py-2.5 ${
                light ? "border-emerald-300 bg-emerald-50/80" : "border-emerald-400/30 bg-emerald-500/10"
              }`}
              data-testid="selected-borrower-summary"
            >
              <p className={`text-sm font-black ${light ? "text-slate-900" : "text-emerald-50"}`}>
                Selected: {selected.name}
              </p>
              <p className={`text-[11px] font-semibold ${light ? "text-slate-600" : "text-emerald-200/65"}`}>
                {selected.fireNepalId} · Trust {selected.trustScore}/100
              </p>
              <div className="mt-1">
                <LendingStatusPill status={selected.verified ? "verified" : "unverified"} />
              </div>
            </div>
          ) : (
            <p className={`mt-3 text-[11px] font-semibold ${light ? "text-slate-500" : "text-emerald-200/50"}`}>
              Select a verified member above to enable Continue.
            </p>
          )}
          {stepError && step === 0 ? (
            <p role="alert" className="mt-2 text-[11px] font-semibold text-rose-400">
              {stepError}
            </p>
          ) : null}
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

          <div
            className={`mt-5 rounded-xl border p-3 ${
              light ? "border-emerald-200/80 bg-emerald-50/50" : "border-emerald-400/20 bg-emerald-500/5"
            }`}
            data-testid="loan-upload-documents-section"
          >
            <div className="mb-2 flex items-center gap-2">
              <FileUp size={16} className={light ? "text-emerald-700" : "text-lime-300"} />
              <p className={`text-sm font-black ${light ? "text-slate-900" : "text-emerald-50"}`}>Upload Documents</p>
            </div>
            <p className={`mb-3 text-[11px] font-semibold ${light ? "text-slate-600" : "text-emerald-200/65"}`}>
              Optional supporting files (PDF, JPG, PNG, DOC, DOCX). Multiple files allowed. Max 8 MB each.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,application/pdf,image/jpeg,image/png,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="sr-only"
              data-testid="loan-document-file-input"
              onChange={(e) => void onPickDocuments(e.target.files)}
            />
            <LendingPrimaryButton
              data-testid="loan-upload-documents-button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? "Uploading…" : "+ Upload Documents"}
            </LendingPrimaryButton>

            {pendingDocs.length > 0 ? (
              <div className="mt-3 space-y-2" data-testid="uploaded-documents-list">
                <p className={`text-[11px] font-black uppercase tracking-wide ${light ? "text-slate-500" : "text-emerald-200/55"}`}>
                  Uploaded Documents
                </p>
                <ul className="space-y-1.5">
                  {pendingDocs.map((doc) => (
                    <li
                      key={doc.id}
                      className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 ${
                        light ? "border-emerald-200/70 bg-white" : "border-emerald-400/15 bg-black/25"
                      }`}
                      data-testid={`pending-doc-${doc.id}`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-sm font-bold ${light ? "text-slate-900" : "text-emerald-50"}`}>
                          📄 {doc.fileName}
                        </p>
                        <p className={`text-[11px] font-semibold ${light ? "text-slate-500" : "text-emerald-200/60"}`}>
                          {loanDocTypeLabel(doc.mimeType, doc.fileName)} · {formatLoanDocSize(doc.sizeBytes)} ·{" "}
                          {doc.status === "uploading"
                            ? "Uploading…"
                            : doc.status === "error"
                              ? "Failed"
                              : "Ready"}
                        </p>
                        {doc.error ? (
                          <p role="alert" className="text-[11px] font-semibold text-rose-400">
                            {doc.error}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <LendingSecondaryButton
                          disabled={doc.status !== "ready" || !doc.url}
                          onClick={() => void onDownloadPendingDoc(doc)}
                        >
                          Download
                        </LendingSecondaryButton>
                        <LendingSecondaryButton onClick={() => onRemovePendingDoc(doc.id)}>Remove</LendingSecondaryButton>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {uploadError ? (
              <p role="alert" className="mt-2 text-[11px] font-semibold text-rose-400" data-testid="loan-upload-error">
                {uploadError}
              </p>
            ) : null}
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
        <LendingGlassCard
          title={requestSent ? LOAN_REQUEST_UI.waitingTitle : LOAN_REQUEST_UI.title}
          subtitle={
            borrowerAccepted
              ? "Lender accepted — continue to signatures"
              : borrowerRejected
                ? "Lender rejected this loan request"
                : requestPending
                  ? "Waiting for the lender’s response"
                  : LOAN_REQUEST_UI.prompt
          }
          icon={FileSignature}
        >
          <p className={`mb-3 text-sm font-semibold ${light ? "text-slate-700" : "text-emerald-100"}`}>
            {requestSent
              ? `${createdLoan.agreementNumber} · Counterparty: ${selected?.name ?? "Lender"}`
              : LOAN_REQUEST_UI.prompt}
          </p>

          {!requestSent ? (
            <div className="flex flex-wrap gap-2">
              <LendingPrimaryButton
                data-testid="loan-request-send-button"
                onClick={() => {
                  setStepError(null);
                  setConfirmOpen(true);
                }}
              >
                {LOAN_REQUEST_UI.requestButton}
              </LendingPrimaryButton>
            </div>
          ) : null}

          {successMessage ? (
            <p
              role="status"
              data-testid="loan-request-success"
              className={`mt-3 text-sm font-bold ${light ? "text-emerald-700" : "text-lime-300"}`}
            >
              {successMessage}
            </p>
          ) : null}

          {requestSent ? (
            <p className="mt-3" data-testid="loan-request-status">
              <LendingStatusPill
                status={
                  requestStatus === "changes_requested"
                    ? "changes_requested"
                    : requestStatus === "accepted"
                      ? "accepted"
                      : requestStatus === "rejected"
                        ? "rejected"
                        : "pending"
                }
              />
            </p>
          ) : null}

          {borrowerRejected ? (
            <p role="alert" className="mt-3 text-sm font-bold text-rose-400">
              The borrower rejected this loan request. The workflow cannot continue.
            </p>
          ) : null}

          {stepError && step === 3 ? (
            <p role="alert" className="mt-2 text-[11px] font-semibold text-rose-400">
              {stepError}
            </p>
          ) : null}
        </LendingGlassCard>
      ) : null}

      {step === 4 && createdLoan ? (
        <LendingGlassCard
          title="Digital Signatures"
          subtitle="Sign only your own role. Both parties must sign before approval."
          icon={FileSignature}
          elite
        >
          <FireLendingSignaturePanel
            loan={createdLoan}
            currentUserId={store.currentUserId}
            onSign={(as) => signAgreement(createdLoan.id, as)}
          />
          {createdAgreement ? (
            <div className="mt-3">
              <LendingSecondaryButton onClick={() => void downloadAgreement(createdLoan.id)}>
                Download Agreement Letter
              </LendingSecondaryButton>
            </div>
          ) : null}
          {bothPartiesSigned(createdLoan) ? (
            <p
              data-testid="wizard-both-signed-ready"
              className={`mt-3 text-sm font-black ${light ? "text-emerald-700" : "text-lime-300"}`}
            >
              {LOAN_REQUEST_UI.readyForApproval}
            </p>
          ) : null}
        </LendingGlassCard>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {step > 0 && step !== 2 ? (
          <LendingSecondaryButton onClick={() => setStep((s) => Math.max(0, s - 1))}>Back</LendingSecondaryButton>
        ) : null}
        {step < 2 ? (
          <LendingPrimaryButton
            disabled={step === 0 ? false : !canNext()}
            onClick={onContinue}
          >
            Continue
          </LendingPrimaryButton>
        ) : null}
        {stepError && step === 1 ? (
          <p role="alert" className="w-full text-[11px] font-semibold text-rose-400">
            {stepError}
          </p>
        ) : null}
        {step === 3 ? (
          <LendingPrimaryButton disabled={!canNext()} onClick={() => setStep(4)}>
            Continue to signatures
          </LendingPrimaryButton>
        ) : null}
        {step === 4 && createdLoan && bothPartiesSigned(createdLoan) && borrowerAccepted ? (
          <LendingPrimaryButton onClick={() => router.push(`/fire-lending/loans/${createdLoan.id}`)}>Open loan</LendingPrimaryButton>
        ) : null}
        {step === 4 && createdLoan && bothPartiesSigned(createdLoan) && !borrowerAccepted ? (
          <LendingPrimaryButton onClick={() => router.push("/fire-lending/requests")}>
            View loan request
          </LendingPrimaryButton>
        ) : null}
      </div>

      <FireLendingConfirmDialog
        open={confirmOpen}
        busy={sending}
        title={LOAN_REQUEST_UI.title}
        description={LOAN_REQUEST_UI.prompt}
        cancelLabel={LOAN_REQUEST_UI.confirmCancel}
        confirmLabel={LOAN_REQUEST_UI.confirmSend}
        busyLabel="Sending…"
        confirmTestId="confirm-send-loan-request"
        testId="send-loan-request-dialog"
        onCancel={() => {
          if (!sending) setConfirmOpen(false);
        }}
        onConfirm={onConfirmSendRequest}
      />
    </LendingMobileScreen>
  );
}
