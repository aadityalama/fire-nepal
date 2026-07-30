"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Download, Eye, FileUp, Replace, Save, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type {
  InsuranceDocument,
  InsuranceDocumentKind,
  InsurancePaymentFrequency,
  InsurancePolicy,
  InsurancePolicyFormInput,
  InsuranceType,
} from "@/lib/insurance/insurance-types";
import {
  INSURANCE_DOCUMENT_KIND_LABELS,
  INSURANCE_DOCUMENT_KINDS,
  INSURANCE_TYPE_ICONS,
  INSURANCE_TYPE_LABELS,
  INSURANCE_TYPES,
  PAYMENT_FREQUENCY_LABELS,
} from "@/lib/insurance/insurance-types";
import {
  createInsuranceDocument,
  resolveExpiryFromTerm,
  syncLegacyDocumentFields,
} from "@/lib/insurance/insurance-normalize";
import { policyToFormInput } from "@/lib/insurance/policy-to-form";
import {
  buildPremiumDisplay,
  buildPremiumTracker,
  defaultExpiryDate,
  formatRs,
  todayIso,
} from "@/lib/insurance/insurance-utils";

type InsurancePolicySheetProps = {
  open: boolean;
  editingPolicy: InsurancePolicy | null;
  onClose: () => void;
  onSave: (input: InsurancePolicyFormInput, editingId?: string) => Promise<void>;
  saving: boolean;
};

const FREQUENCIES = Object.keys(PAYMENT_FREQUENCY_LABELS) as InsurancePaymentFrequency[];

function emptyForm(): InsurancePolicyFormInput {
  return {
    type: "health",
    provider: "",
    coverageAmountNpr: 0,
    premiumNpr: 0,
    paymentFrequency: "yearly",
    startDate: todayIso(),
    expiryDate: defaultExpiryDate(12),
    policyTermYears: 1,
    nominee: "",
    familyMembersCovered: [],
    notes: "",
    agentName: "",
    agentPhone: "",
    branch: "",
    policyNumber: "",
    proposalNumber: "",
    pan: "",
    medicalNotes: "",
    documents: [],
    documentDataUrl: null,
    documentFileName: null,
  };
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <p className="mb-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-emerald-100/45">{children}</p>;
}

function CollapsibleBlock({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="overflow-hidden rounded-[1.6rem] border border-white/10 bg-white/[0.055]">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-[52px] w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-emerald-100/55">{title}</p>
        <ChevronDown
          size={18}
          className={`shrink-0 text-emerald-100/60 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open ? <div className="space-y-3 border-t border-white/10 px-4 py-4">{children}</div> : null}
    </section>
  );
}

const inputClass =
  "min-h-[48px] w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-sm font-semibold text-white outline-none placeholder:text-emerald-100/30 focus:border-emerald-300/40";

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Could not read file"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

function downloadDataUrl(dataUrl: string, fileName: string) {
  const anchor = document.createElement("a");
  anchor.href = dataUrl;
  anchor.download = fileName;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

export function InsurancePolicySheet({ open, editingPolicy, onClose, onSave, saving }: InsurancePolicySheetProps) {
  const [form, setForm] = useState<InsurancePolicyFormInput>(emptyForm);
  const [familyText, setFamilyText] = useState("");
  const [uploadKind, setUploadKind] = useState<InsuranceDocumentKind>("policy_pdf");

  useEffect(() => {
    if (!open) return;
    if (editingPolicy) {
      try {
        setForm(policyToFormInput(editingPolicy));
        setFamilyText((editingPolicy.familyMembersCovered ?? []).join(", "));
      } catch (error) {
        if (process.env.NODE_ENV !== "production") {
          console.error("[insurance-policy-sheet] failed to hydrate edit form", error);
        }
        setForm(emptyForm());
        setFamilyText("");
      }
      return;
    }
    setForm(emptyForm());
    setFamilyText("");
  }, [open, editingPolicy]);

  const premiumPreview = buildPremiumDisplay(form.premiumNpr || 0, form.paymentFrequency || "yearly");
  const trackerPreview = useMemo(() => {
    try {
      const draft = {
        id: "preview",
        ...form,
        startDate: form.startDate ?? "",
        expiryDate: resolveExpiryFromTerm(form.startDate ?? "", form.policyTermYears ?? 0, form.expiryDate ?? ""),
        policyTermYears: Number.isFinite(Number(form.policyTermYears)) ? Math.max(0, Number(form.policyTermYears)) : 0,
        documents: Array.isArray(form.documents) ? form.documents : [],
        familyMembersCovered: Array.isArray(form.familyMembersCovered) ? form.familyMembersCovered : [],
        agentName: form.agentName ?? "",
        agentPhone: form.agentPhone ?? "",
        branch: form.branch ?? "",
        policyNumber: form.policyNumber ?? "",
        proposalNumber: form.proposalNumber ?? "",
        pan: form.pan ?? "",
        medicalNotes: form.medicalNotes ?? "",
        nominee: form.nominee ?? "",
        notes: form.notes ?? "",
        status: "active" as const,
        sortOrder: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return buildPremiumTracker(draft);
    } catch {
      return buildPremiumTracker({
        id: "preview",
        ...emptyForm(),
        status: "active",
        sortOrder: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }, [form]);

  async function handleSave() {
    if (!form.provider?.trim() || (form.coverageAmountNpr || 0) <= 0 || saving) return;
    const familyMembersCovered = familyText
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    const expiryDate = resolveExpiryFromTerm(form.startDate ?? "", form.policyTermYears ?? 0, form.expiryDate ?? "");
    const docs = syncLegacyDocumentFields({
      documents: Array.isArray(form.documents) ? form.documents : [],
      documentDataUrl: form.documentDataUrl ?? null,
      documentFileName: form.documentFileName ?? null,
    });
    try {
      await onSave(
        {
          ...form,
          provider: form.provider ?? "",
          nominee: form.nominee ?? "",
          notes: form.notes ?? "",
          agentName: form.agentName ?? "",
          agentPhone: form.agentPhone ?? "",
          branch: form.branch ?? "",
          policyNumber: form.policyNumber ?? "",
          proposalNumber: form.proposalNumber ?? "",
          pan: form.pan ?? "",
          medicalNotes: form.medicalNotes ?? "",
          policyTermYears: form.policyTermYears ?? 0,
          startDate: form.startDate ?? "",
          familyMembersCovered,
          expiryDate,
          ...docs,
        },
        editingPolicy?.id,
      );
    } catch (error) {
      // Dashboard already toasts; never let an unhandled rejection blank the page.
      if (process.env.NODE_ENV !== "production") {
        console.error("[insurance-policy-sheet] save failed", error);
      }
    }
  }

  async function addDocument(file: File | null, kind: InsuranceDocumentKind, replaceId?: string) {
    if (!file) return;
    const dataUrl = await readFileAsDataUrl(file);
    const nextDoc = createInsuranceDocument(kind, file.name, dataUrl);
    setForm((current) => {
      const currentDocs = Array.isArray(current.documents) ? current.documents : [];
      const documents = replaceId
        ? currentDocs.map((doc) => (doc.id === replaceId ? { ...nextDoc, id: replaceId, kind: doc.kind } : doc))
        : [...currentDocs, nextDoc];
      return {
        ...current,
        ...syncLegacyDocumentFields({
          documents,
          documentDataUrl: current.documentDataUrl,
          documentFileName: current.documentFileName,
        }),
      };
    });
  }

  function removeDocument(id: string) {
    setForm((current) => {
      const documents = (Array.isArray(current.documents) ? current.documents : []).filter((doc) => doc.id !== id);
      return {
        ...current,
        ...syncLegacyDocumentFields({
          documents,
          documentDataUrl: null,
          documentFileName: null,
        }),
      };
    });
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 bg-[#020806]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="flex h-[100dvh] flex-col overflow-hidden">
            <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3 pt-[calc(0.75rem+env(safe-area-inset-top,0px))]">
              <button
                type="button"
                onClick={onClose}
                className="grid min-h-[44px] min-w-[44px] place-items-center rounded-full bg-white/[0.06] text-emerald-100"
                aria-label="Close policy sheet"
              >
                <X size={20} />
              </button>
              <div className="text-center">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-100/45">Insurance</p>
                <p className="text-sm font-black text-white">
                  {editingPolicy ? "Edit policy" : "Add policy"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving || !form.provider?.trim() || (form.coverageAmountNpr || 0) <= 0}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-gradient-to-r from-emerald-300 to-lime-300 px-4 text-sm font-black text-emerald-950 disabled:opacity-50"
              >
                <Save size={16} />
                Save
              </button>
            </header>

            <div className="flex-1 overflow-x-hidden overflow-y-auto px-4 py-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
              <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
                {form.premiumNpr > 0 ? (
                  <section className="rounded-[1.6rem] border border-emerald-300/25 bg-emerald-400/10 p-4">
                    <p className="text-[11px] font-black uppercase tracking-[0.14em] text-emerald-100/50">Premium preview</p>
                    <p className="mt-2 text-[11px] font-black uppercase tracking-[0.14em] text-emerald-100/45">
                      {premiumPreview.label}
                    </p>
                    <p className="mt-1 text-2xl font-black tracking-[-0.04em] text-white">{premiumPreview.value}</p>
                    {trackerPreview.totalInstallments > 0 ? (
                      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-xl bg-black/20 px-2 py-2">
                          <p className="text-[10px] font-black uppercase tracking-wide text-emerald-100/45">Total</p>
                          <p className="text-sm font-black text-white">{trackerPreview.totalInstallments}</p>
                        </div>
                        <div className="rounded-xl bg-black/20 px-2 py-2">
                          <p className="text-[10px] font-black uppercase tracking-wide text-emerald-100/45">Paid</p>
                          <p className="text-sm font-black text-lime-100">{trackerPreview.installmentsPaid}</p>
                        </div>
                        <div className="rounded-xl bg-black/20 px-2 py-2">
                          <p className="text-[10px] font-black uppercase tracking-wide text-emerald-100/45">Left</p>
                          <p className="text-sm font-black text-amber-100">{trackerPreview.installmentsRemaining}</p>
                        </div>
                      </div>
                    ) : null}
                  </section>
                ) : null}

                <section className="rounded-[1.6rem] border border-white/10 bg-white/[0.055] p-4">
                  <FieldLabel>Insurance type</FieldLabel>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {INSURANCE_TYPES.map((type: InsuranceType) => {
                      const active = form.type === type;
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setForm((current) => ({ ...current, type }))}
                          className={`min-h-[56px] rounded-2xl border px-3 py-2 text-left transition ${
                            active
                              ? "border-emerald-300/50 bg-emerald-400/15"
                              : "border-white/10 bg-white/[0.04]"
                          }`}
                        >
                          <span className="text-lg">{INSURANCE_TYPE_ICONS[type]}</span>
                          <p className="mt-1 text-[11px] font-black text-emerald-50">{INSURANCE_TYPE_LABELS[type]}</p>
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section className="space-y-3 rounded-[1.6rem] border border-white/10 bg-white/[0.055] p-4">
                  <div>
                    <FieldLabel>Provider</FieldLabel>
                    <input
                      className={inputClass}
                      value={form.provider ?? ""}
                      onChange={(e) => setForm((current) => ({ ...current, provider: e.target.value }))}
                      placeholder="e.g. Nepal Life, Shikhar"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <FieldLabel>Coverage (NPR)</FieldLabel>
                      <input
                        type="number"
                        min={0}
                        className={inputClass}
                        value={form.coverageAmountNpr || ""}
                        onChange={(e) =>
                          setForm((current) => ({ ...current, coverageAmountNpr: Number(e.target.value) || 0 }))
                        }
                        placeholder="5000000"
                      />
                    </div>
                    <div>
                      <FieldLabel>Premium Amount</FieldLabel>
                      <input
                        type="number"
                        min={0}
                        className={inputClass}
                        value={form.premiumNpr || ""}
                        onChange={(e) =>
                          setForm((current) => ({ ...current, premiumNpr: Number(e.target.value) || 0 }))
                        }
                        placeholder="126000"
                      />
                    </div>
                  </div>
                  <div>
                    <FieldLabel>Premium Frequency</FieldLabel>
                    <div className="grid grid-cols-2 gap-2">
                      {FREQUENCIES.map((frequency) => {
                        const active = form.paymentFrequency === frequency;
                        return (
                          <button
                            key={frequency}
                            type="button"
                            onClick={() => setForm((current) => ({ ...current, paymentFrequency: frequency }))}
                            className={`min-h-[44px] rounded-2xl border text-sm font-bold ${
                              active
                                ? "border-emerald-300/50 bg-emerald-400/15 text-lime-100"
                                : "border-white/10 bg-white/[0.04] text-emerald-50"
                            }`}
                          >
                            {PAYMENT_FREQUENCY_LABELS[frequency]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <FieldLabel>Policy Start Date</FieldLabel>
                      <input
                        type="date"
                        className={inputClass}
                        value={form.startDate}
                        onChange={(e) => {
                          const startDate = e.target.value;
                          setForm((current) => ({
                            ...current,
                            startDate,
                            expiryDate: resolveExpiryFromTerm(startDate, current.policyTermYears ?? 0, current.expiryDate ?? ""),
                          }));
                        }}
                      />
                    </div>
                    <div>
                      <FieldLabel>Policy Term (Years)</FieldLabel>
                      <input
                        type="number"
                        min={0}
                        className={inputClass}
                        value={form.policyTermYears || ""}
                        onChange={(e) => {
                          const policyTermYears = Math.max(0, Number(e.target.value) || 0);
                          setForm((current) => ({
                            ...current,
                            policyTermYears,
                            expiryDate: resolveExpiryFromTerm(current.startDate ?? "", policyTermYears, current.expiryDate ?? ""),
                          }));
                        }}
                        placeholder="20"
                      />
                    </div>
                  </div>
                  <div>
                    <FieldLabel>Expiry / End Date</FieldLabel>
                    <input
                      type="date"
                      className={inputClass}
                      value={form.expiryDate}
                      onChange={(e) => setForm((current) => ({ ...current, expiryDate: e.target.value }))}
                    />
                  </div>
                  <div>
                    <FieldLabel>Family members covered</FieldLabel>
                    <input
                      className={inputClass}
                      value={familyText}
                      onChange={(e) => setFamilyText(e.target.value)}
                      placeholder="Self, Spouse, Child — comma separated"
                    />
                  </div>
                </section>

                <CollapsibleBlock title="Documents & Notes" defaultOpen>
                  <div className="grid gap-3">
                    <div>
                      <FieldLabel>Notes</FieldLabel>
                      <textarea
                        className={`${inputClass} min-h-[96px] py-3`}
                        value={form.notes}
                        onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))}
                        placeholder="Hospital network, special conditions…"
                      />
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <FieldLabel>Agent Name</FieldLabel>
                        <input
                          className={inputClass}
                          value={form.agentName ?? ""}
                          onChange={(e) => setForm((current) => ({ ...current, agentName: e.target.value }))}
                          placeholder="Agent full name"
                        />
                      </div>
                      <div>
                        <FieldLabel>Agent Phone</FieldLabel>
                        <input
                          className={inputClass}
                          value={form.agentPhone ?? ""}
                          onChange={(e) => setForm((current) => ({ ...current, agentPhone: e.target.value }))}
                          placeholder="98xxxxxxxx"
                        />
                      </div>
                      <div>
                        <FieldLabel>Branch</FieldLabel>
                        <input
                          className={inputClass}
                          value={form.branch ?? ""}
                          onChange={(e) => setForm((current) => ({ ...current, branch: e.target.value }))}
                          placeholder="Branch / office"
                        />
                      </div>
                      <div>
                        <FieldLabel>Policy Number</FieldLabel>
                        <input
                          className={inputClass}
                          value={form.policyNumber ?? ""}
                          onChange={(e) => setForm((current) => ({ ...current, policyNumber: e.target.value }))}
                          placeholder="Policy no."
                        />
                      </div>
                      <div>
                        <FieldLabel>Proposal Number</FieldLabel>
                        <input
                          className={inputClass}
                          value={form.proposalNumber ?? ""}
                          onChange={(e) => setForm((current) => ({ ...current, proposalNumber: e.target.value }))}
                          placeholder="Proposal no."
                        />
                      </div>
                      <div>
                        <FieldLabel>PAN</FieldLabel>
                        <input
                          className={inputClass}
                          value={form.pan ?? ""}
                          onChange={(e) => setForm((current) => ({ ...current, pan: e.target.value }))}
                          placeholder="PAN number"
                        />
                      </div>
                    </div>
                    <div>
                      <FieldLabel>Nominee</FieldLabel>
                      <input
                        className={inputClass}
                        value={form.nominee}
                        onChange={(e) => setForm((current) => ({ ...current, nominee: e.target.value }))}
                        placeholder="Primary nominee"
                      />
                    </div>
                    <div>
                      <FieldLabel>Medical Notes</FieldLabel>
                      <textarea
                        className={`${inputClass} min-h-[80px] py-3`}
                        value={form.medicalNotes ?? ""}
                        onChange={(e) => setForm((current) => ({ ...current, medicalNotes: e.target.value }))}
                        placeholder="Medical history, exclusions…"
                      />
                    </div>

                    <div>
                      <FieldLabel>Upload document type</FieldLabel>
                      <div className="mb-3 grid grid-cols-2 gap-2">
                        {INSURANCE_DOCUMENT_KINDS.map((kind) => {
                          const active = uploadKind === kind;
                          return (
                            <button
                              key={kind}
                              type="button"
                              onClick={() => setUploadKind(kind)}
                              className={`min-h-[44px] rounded-2xl border px-2 text-[11px] font-bold ${
                                active
                                  ? "border-emerald-300/50 bg-emerald-400/15 text-lime-100"
                                  : "border-white/10 bg-white/[0.04] text-emerald-50"
                              }`}
                            >
                              {INSURANCE_DOCUMENT_KIND_LABELS[kind]}
                            </button>
                          );
                        })}
                      </div>
                      <label className="flex min-h-[88px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-emerald-300/30 bg-emerald-400/8 px-4 text-center">
                        <FileUp size={20} className="text-lime-200" />
                        <span className="text-sm font-bold text-emerald-50">
                          Upload {INSURANCE_DOCUMENT_KIND_LABELS[uploadKind]}
                        </span>
                        <span className="text-[11px] font-semibold text-emerald-100/45">PDF, JPG, PNG</span>
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0] ?? null;
                            void addDocument(file, uploadKind);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    </div>

                    {(form.documents ?? []).length > 0 ? (
                      <div className="space-y-2">
                        {(form.documents ?? []).map((doc: InsuranceDocument) => (
                          <div
                            key={doc.id}
                            className="rounded-2xl border border-white/10 bg-black/20 p-3"
                          >
                            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100/45">
                              {INSURANCE_DOCUMENT_KIND_LABELS[doc.kind]}
                            </p>
                            <p className="mt-1 truncate text-sm font-bold text-white">{doc.fileName}</p>
                            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                              <button
                                type="button"
                                onClick={() => window.open(doc.dataUrl, "_blank", "noopener,noreferrer")}
                                className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.05] text-xs font-black text-emerald-50"
                              >
                                <Eye size={14} /> View
                              </button>
                              <button
                                type="button"
                                onClick={() => downloadDataUrl(doc.dataUrl, doc.fileName)}
                                className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.05] text-xs font-black text-emerald-50"
                              >
                                <Download size={14} /> Download
                              </button>
                              <label className="inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.05] text-xs font-black text-emerald-50">
                                <Replace size={14} /> Replace
                                <input
                                  type="file"
                                  accept="image/*,application/pdf"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0] ?? null;
                                    void addDocument(file, doc.kind, doc.id);
                                    e.target.value = "";
                                  }}
                                />
                              </label>
                              <button
                                type="button"
                                onClick={() => removeDocument(doc.id)}
                                className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-rose-300/25 bg-rose-400/10 text-xs font-black text-rose-100"
                              >
                                <Trash2 size={14} /> Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </CollapsibleBlock>

                {trackerPreview.premiumPaidSoFarNpr > 0 || trackerPreview.totalInstallments > 0 ? (
                  <section className="rounded-[1.6rem] border border-white/10 bg-white/[0.055] p-4">
                    <p className="text-[11px] font-black uppercase tracking-[0.14em] text-emerald-100/45">
                      Premium paid so far
                    </p>
                    <p className="mt-1 text-xl font-black text-lime-100">
                      {formatRs(trackerPreview.premiumPaidSoFarNpr)} Paid
                    </p>
                    <p className="mt-1 text-xs font-semibold text-emerald-100/50">
                      Remaining {formatRs(trackerPreview.remainingPremiumNpr)}
                    </p>
                  </section>
                ) : null}
              </div>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
