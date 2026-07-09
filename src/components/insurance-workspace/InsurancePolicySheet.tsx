"use client";

import { AnimatePresence, motion } from "framer-motion";
import { FileUp, Save, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import type {
  InsurancePaymentFrequency,
  InsurancePolicy,
  InsurancePolicyFormInput,
  InsuranceType,
} from "@/lib/insurance/insurance-types";
import {
  INSURANCE_TYPE_ICONS,
  INSURANCE_TYPE_LABELS,
  INSURANCE_TYPES,
  PAYMENT_FREQUENCY_LABELS,
} from "@/lib/insurance/insurance-types";
import { defaultExpiryDate, todayIso } from "@/lib/insurance/insurance-utils";

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
    nominee: "",
    familyMembersCovered: [],
    notes: "",
    documentDataUrl: null,
    documentFileName: null,
  };
}

function buildFormFromPolicy(policy: InsurancePolicy): InsurancePolicyFormInput {
  return {
    type: policy.type,
    provider: policy.provider,
    coverageAmountNpr: policy.coverageAmountNpr,
    premiumNpr: policy.premiumNpr,
    paymentFrequency: policy.paymentFrequency,
    startDate: policy.startDate || todayIso(),
    expiryDate: policy.expiryDate || defaultExpiryDate(12),
    nominee: policy.nominee,
    familyMembersCovered: policy.familyMembersCovered,
    notes: policy.notes,
    documentDataUrl: policy.documentDataUrl,
    documentFileName: policy.documentFileName,
  };
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <p className="mb-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-emerald-100/45">{children}</p>;
}

const inputClass =
  "min-h-[48px] w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-sm font-semibold text-white outline-none placeholder:text-emerald-100/30 focus:border-emerald-300/40";

export function InsurancePolicySheet({ open, editingPolicy, onClose, onSave, saving }: InsurancePolicySheetProps) {
  const [form, setForm] = useState<InsurancePolicyFormInput>(emptyForm);
  const [familyText, setFamilyText] = useState("");

  useEffect(() => {
    if (!open) return;
    if (editingPolicy) {
      setForm(buildFormFromPolicy(editingPolicy));
      setFamilyText(editingPolicy.familyMembersCovered.join(", "));
      return;
    }
    setForm(emptyForm());
    setFamilyText("");
  }, [open, editingPolicy]);

  async function handleSave() {
    if (!form.provider.trim() || form.coverageAmountNpr <= 0 || saving) return;
    const familyMembersCovered = familyText
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    await onSave({ ...form, familyMembersCovered }, editingPolicy?.id);
  }

  function onFileChange(file: File | null) {
    if (!file) {
      setForm((current) => ({ ...current, documentDataUrl: null, documentFileName: null }));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : null;
      setForm((current) => ({
        ...current,
        documentDataUrl: result,
        documentFileName: file.name,
      }));
    };
    reader.readAsDataURL(file);
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
                <p className="text-sm font-black text-white">{editingPolicy ? "Edit policy" : "Add policy"}</p>
              </div>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving || !form.provider.trim() || form.coverageAmountNpr <= 0}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-gradient-to-r from-emerald-300 to-lime-300 px-4 text-sm font-black text-emerald-950 disabled:opacity-50"
              >
                <Save size={16} />
                Save
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
              <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
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
                      value={form.provider}
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
                      <FieldLabel>Premium (NPR)</FieldLabel>
                      <input
                        type="number"
                        min={0}
                        className={inputClass}
                        value={form.premiumNpr || ""}
                        onChange={(e) =>
                          setForm((current) => ({ ...current, premiumNpr: Number(e.target.value) || 0 }))
                        }
                        placeholder="5200"
                      />
                    </div>
                  </div>
                  <div>
                    <FieldLabel>Payment frequency</FieldLabel>
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
                      <FieldLabel>Start date</FieldLabel>
                      <input
                        type="date"
                        className={inputClass}
                        value={form.startDate}
                        onChange={(e) => setForm((current) => ({ ...current, startDate: e.target.value }))}
                      />
                    </div>
                    <div>
                      <FieldLabel>Expiry</FieldLabel>
                      <input
                        type="date"
                        className={inputClass}
                        value={form.expiryDate}
                        onChange={(e) => setForm((current) => ({ ...current, expiryDate: e.target.value }))}
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
                    <FieldLabel>Family members covered</FieldLabel>
                    <input
                      className={inputClass}
                      value={familyText}
                      onChange={(e) => setFamilyText(e.target.value)}
                      placeholder="Self, Spouse, Child — comma separated"
                    />
                  </div>
                  <div>
                    <FieldLabel>Notes</FieldLabel>
                    <textarea
                      className={`${inputClass} min-h-[96px] py-3`}
                      value={form.notes}
                      onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))}
                      placeholder="Policy number, agent, hospital network…"
                    />
                  </div>
                </section>

                <section className="rounded-[1.6rem] border border-white/10 bg-white/[0.055] p-4">
                  <FieldLabel>Upload policy PDF / image</FieldLabel>
                  <label className="flex min-h-[88px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-emerald-300/30 bg-emerald-400/8 px-4 text-center">
                    <FileUp size={20} className="text-lime-200" />
                    <span className="text-sm font-bold text-emerald-50">
                      {form.documentFileName ?? "Attach document · OCR ready"}
                    </span>
                    <span className="text-[11px] font-semibold text-emerald-100/45">PDF, JPG, PNG</span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
                    />
                  </label>
                </section>
              </div>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
