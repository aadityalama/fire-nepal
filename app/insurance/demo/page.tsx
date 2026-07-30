"use client";

import { useMemo, useState } from "react";
import { InsurancePolicyDetailsSheet } from "@/components/insurance-workspace/InsurancePolicyDetailsSheet";
import { InsurancePolicySheet } from "@/components/insurance-workspace/InsurancePolicySheet";
import type { InsurancePolicy, InsurancePolicyFormInput } from "@/lib/insurance/insurance-types";
import { applyTrackerSnapshot, derivePolicyStatus } from "@/lib/insurance/insurance-utils";
import { createInsuranceDocument } from "@/lib/insurance/insurance-normalize";

/**
 * Visual verification surface for Insurance Policy Management.
 * No auth required — used for screenshots and QA of every section.
 */
function buildDemoPolicy(): InsurancePolicy {
  const startDate = "2022-01-15";
  const doc = createInsuranceDocument(
    "policy_pdf",
    "nepal-life-policy.pdf",
    "data:application/pdf;base64,JVBERi0xLjQKJeLjz9MKMyAwIG9iago8PC9UeXBlL1BhZ2UvUGFyZW50IDIgMCBSL01lZGlhQm94WzAgMCA2MTIgNzkyXT4+CmVuZG9iago=",
  );
  return applyTrackerSnapshot({
    id: "demo-policy-1",
    type: "life",
    provider: "Nepal Life Insurance",
    coverageAmountNpr: 5_000_000,
    premiumNpr: 126_000,
    paymentFrequency: "yearly",
    startDate,
    expiryDate: "2042-01-15",
    policyTermYears: 20,
    nominee: "Sita Sharma",
    familyMembersCovered: ["Self", "Spouse"],
    notes: "Preferred hospital network: Grande + Norvic.",
    agentName: "Ram Bahadur",
    agentPhone: "9841000000",
    branch: "Kathmandu Branch",
    policyNumber: "NL-2022-88421",
    proposalNumber: "PROP-4412",
    pan: "601234567",
    medicalNotes: "No major exclusions. Annual checkup required.",
    documents: [doc],
    documentDataUrl: doc.dataUrl,
    documentFileName: doc.fileName,
    premiumHistory: [],
    status: derivePolicyStatus("2042-01-15"),
    sortOrder: 0,
    createdAt: "2022-01-15T00:00:00.000Z",
    updatedAt: new Date().toISOString(),
  });
}

export default function InsurancePolicyManagementDemoPage() {
  const [policy, setPolicy] = useState<InsurancePolicy>(() => buildDemoPolicy());
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const summaryLine = useMemo(
    () =>
      `${policy.provider} · ${policy.installmentsPaid ?? 0}/${policy.totalInstallments ?? 0} paid · Next ${policy.nextPremiumDate ?? "—"}`,
    [policy],
  );

  async function handleSave(input: InsurancePolicyFormInput) {
    setSaving(true);
    try {
      const next = applyTrackerSnapshot({
        ...policy,
        ...input,
        id: policy.id,
        status: derivePolicyStatus(input.expiryDate || policy.expiryDate),
        sortOrder: policy.sortOrder,
        createdAt: policy.createdAt,
        updatedAt: new Date().toISOString(),
      });
      setPolicy(next);
      setEditOpen(false);
      setDetailsOpen(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-[100dvh] bg-[#020806] px-4 pb-10 pt-6 text-white">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
        <header>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-100/50">
            Insurance Policy Management
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.05em]">Demo / QA</h1>
          <p className="mt-2 text-sm font-semibold text-emerald-100/60">
            Full premium tracker, payment history, documents, and dashboard — no sign-in required.
          </p>
          <p className="mt-3 rounded-2xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-semibold text-emerald-100/70">
            {summaryLine}
          </p>
        </header>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              setEditOpen(false);
              setDetailsOpen(true);
            }}
            className="min-h-[48px] rounded-2xl bg-gradient-to-r from-emerald-300 to-lime-300 text-sm font-black text-emerald-950"
          >
            Open Policy Details
          </button>
          <button
            type="button"
            onClick={() => {
              setDetailsOpen(false);
              setEditOpen(true);
            }}
            className="min-h-[48px] rounded-2xl border border-white/15 bg-white/[0.06] text-sm font-black text-white"
          >
            Open Edit Form
          </button>
        </div>
      </div>

      <InsurancePolicyDetailsSheet
        open={detailsOpen}
        policy={policy}
        onClose={() => setDetailsOpen(false)}
        onEdit={() => {
          setDetailsOpen(false);
          setEditOpen(true);
        }}
        onUpdate={async (input) => {
          await handleSave(input);
        }}
      />

      <InsurancePolicySheet
        open={editOpen}
        editingPolicy={policy}
        onClose={() => setEditOpen(false)}
        onSave={async (input) => {
          await handleSave(input);
        }}
        saving={saving}
      />
    </main>
  );
}
