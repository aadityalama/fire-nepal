import type { InsurancePolicy, InsurancePolicyFormInput } from "@/lib/insurance/insurance-types";
import { syncLegacyDocumentFields } from "@/lib/insurance/insurance-normalize";

export function policyToFormInput(policy: InsurancePolicy): InsurancePolicyFormInput {
  const docs = syncLegacyDocumentFields({
    documents: policy.documents ?? [],
    documentDataUrl: policy.documentDataUrl,
    documentFileName: policy.documentFileName,
  });
  return {
    type: policy.type,
    provider: policy.provider,
    coverageAmountNpr: policy.coverageAmountNpr,
    premiumNpr: policy.premiumNpr,
    paymentFrequency: policy.paymentFrequency,
    startDate: policy.startDate,
    expiryDate: policy.expiryDate,
    policyTermYears: policy.policyTermYears ?? 0,
    nominee: policy.nominee,
    familyMembersCovered: policy.familyMembersCovered,
    notes: policy.notes,
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
