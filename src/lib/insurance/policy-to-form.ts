import type { InsurancePolicy, InsurancePolicyFormInput } from "@/lib/insurance/insurance-types";
import { syncLegacyDocumentFields } from "@/lib/insurance/insurance-normalize";

export function policyToFormInput(policy: InsurancePolicy): InsurancePolicyFormInput {
  const docs = syncLegacyDocumentFields({
    documents: Array.isArray(policy.documents) ? policy.documents : [],
    documentDataUrl: policy.documentDataUrl ?? null,
    documentFileName: policy.documentFileName ?? null,
  });
  return {
    type: policy.type || "other",
    provider: policy.provider ?? "",
    coverageAmountNpr: Number.isFinite(Number(policy.coverageAmountNpr)) ? Number(policy.coverageAmountNpr) : 0,
    premiumNpr: Number.isFinite(Number(policy.premiumNpr)) ? Number(policy.premiumNpr) : 0,
    paymentFrequency: policy.paymentFrequency || "yearly",
    startDate: typeof policy.startDate === "string" ? policy.startDate : "",
    expiryDate: typeof policy.expiryDate === "string" ? policy.expiryDate : "",
    policyTermYears: Number.isFinite(Number(policy.policyTermYears))
      ? Math.max(0, Math.round(Number(policy.policyTermYears)))
      : 0,
    nominee: policy.nominee ?? "",
    familyMembersCovered: Array.isArray(policy.familyMembersCovered) ? policy.familyMembersCovered : [],
    notes: policy.notes ?? "",
    agentName: policy.agentName ?? "",
    agentPhone: policy.agentPhone ?? "",
    branch: policy.branch ?? "",
    policyNumber: policy.policyNumber ?? "",
    proposalNumber: policy.proposalNumber ?? "",
    pan: policy.pan ?? "",
    medicalNotes: policy.medicalNotes ?? "",
    ...docs,
  };
}
