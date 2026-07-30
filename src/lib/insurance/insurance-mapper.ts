import type { InsurancePaymentFrequency, InsurancePolicy, InsurancePolicyFormInput, InsuranceType } from "@/lib/insurance/insurance-types";
import {
  normalizeInsurancePolicyFields,
  resolveExpiryFromTerm,
  syncLegacyDocumentFields,
} from "@/lib/insurance/insurance-normalize";
import { applyTrackerSnapshot, derivePolicyStatus } from "@/lib/insurance/insurance-utils";
import type { Database, Json } from "@/types/supabase-database";

type InsuranceRow = Database["public"]["Tables"]["finance_insurance_policies"]["Row"];
type InsuranceInsert = Database["public"]["Tables"]["finance_insurance_policies"]["Insert"];

const INSURANCE_TYPES: InsuranceType[] = [
  "health",
  "life",
  "critical_illness",
  "travel",
  "vehicle",
  "property",
  "other",
];

const FREQUENCIES: InsurancePaymentFrequency[] = ["monthly", "quarterly", "half_yearly", "yearly", "one_time"];

function asType(value: string): InsuranceType {
  return (INSURANCE_TYPES.includes(value as InsuranceType) ? value : "other") as InsuranceType;
}

function asFrequency(value: string): InsurancePaymentFrequency {
  return (FREQUENCIES.includes(value as InsurancePaymentFrequency) ? value : "yearly") as InsurancePaymentFrequency;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function safeTrim(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

type LegacyRow = Omit<
  InsuranceRow,
  | "deleted_at"
  | "policy_term_years"
  | "agent_name"
  | "agent_phone"
  | "branch"
  | "policy_number"
  | "proposal_number"
  | "pan"
  | "pan_number"
  | "medical_notes"
  | "documents"
  | "premium_history"
  | "total_installments"
  | "installments_paid"
  | "installments_remaining"
  | "total_premium_paid"
  | "remaining_premium"
  | "next_premium_date"
  | "next_premium_amount"
> & {
  deleted_at?: string | null;
  policy_term_years?: number | null;
  agent_name?: string | null;
  agent_phone?: string | null;
  branch?: string | null;
  policy_number?: string | null;
  proposal_number?: string | null;
  pan?: string | null;
  pan_number?: string | null;
  medical_notes?: string | null;
  documents?: Json | null;
  premium_history?: Json | null;
  total_installments?: number | null;
  installments_paid?: number | null;
  installments_remaining?: number | null;
  total_premium_paid?: number | null;
  remaining_premium?: number | null;
  next_premium_date?: string | null;
  next_premium_amount?: number | null;
};

/** Map a Supabase row (full or legacy) into the domain policy model. */
export function mapInsuranceRow(row: InsuranceRow | LegacyRow): InsurancePolicy {
  const expiryDate = row.expiry_date ?? "";
  const pan = row.pan ?? row.pan_number ?? "";
  const meta = normalizeInsurancePolicyFields({
    startDate: row.start_date ?? "",
    expiryDate,
    policyTermYears: row.policy_term_years ?? 0,
    nominee: row.nominee ?? "",
    familyMembersCovered: asStringArray(row.family_members_covered),
    notes: row.notes ?? "",
    agentName: row.agent_name ?? "",
    agentPhone: row.agent_phone ?? "",
    branch: row.branch ?? "",
    policyNumber: row.policy_number ?? "",
    proposalNumber: row.proposal_number ?? "",
    pan,
    medicalNotes: row.medical_notes ?? "",
    documents: row.documents ?? [],
    documentDataUrl: row.document_data_url,
    documentFileName: row.document_file_name,
    premiumHistory: row.premium_history ?? [],
    totalInstallments: row.total_installments ?? 0,
    installmentsPaid: row.installments_paid ?? 0,
    installmentsRemaining: row.installments_remaining ?? 0,
    totalPremiumPaid: row.total_premium_paid ?? 0,
    remainingPremium: row.remaining_premium ?? 0,
    nextPremiumDate: row.next_premium_date ?? null,
    nextPremiumAmount: row.next_premium_amount ?? 0,
  });

  const base: InsurancePolicy = {
    id: row.id,
    type: asType(row.insurance_type),
    provider: row.provider || "Unknown provider",
    coverageAmountNpr: Number(row.coverage_amount_npr) || 0,
    premiumNpr: Number(row.premium_npr) || 0,
    paymentFrequency: asFrequency(row.payment_frequency),
    ...meta,
    status: derivePolicyStatus(meta.expiryDate || expiryDate),
    sortOrder: Number(row.sort_order) || 0,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };

  return applyTrackerSnapshot(base);
}

function trackerFieldsFromInput(input: InsurancePolicyFormInput) {
  const docs = syncLegacyDocumentFields({
    documents: input.documents ?? [],
    documentDataUrl: input.documentDataUrl,
    documentFileName: input.documentFileName,
  });
  const expiryDate = resolveExpiryFromTerm(input.startDate, input.policyTermYears ?? 0, input.expiryDate);
  const draft: InsurancePolicy = applyTrackerSnapshot({
    id: "draft",
    type: input.type,
    provider: safeTrim(input.provider) || "Unknown provider",
    coverageAmountNpr: Math.max(0, Math.round(Number(input.coverageAmountNpr) || 0)),
    premiumNpr: Math.max(0, Math.round(Number(input.premiumNpr) || 0)),
    paymentFrequency: input.paymentFrequency || "yearly",
    startDate: input.startDate || "",
    expiryDate,
    policyTermYears: Math.max(0, Math.round(Number(input.policyTermYears) || 0)),
    nominee: safeTrim(input.nominee),
    familyMembersCovered: Array.isArray(input.familyMembersCovered) ? input.familyMembersCovered : [],
    notes: safeTrim(input.notes),
    agentName: safeTrim(input.agentName),
    agentPhone: safeTrim(input.agentPhone),
    branch: safeTrim(input.branch),
    policyNumber: safeTrim(input.policyNumber),
    proposalNumber: safeTrim(input.proposalNumber),
    pan: safeTrim(input.pan),
    medicalNotes: safeTrim(input.medicalNotes),
    ...docs,
    premiumHistory: Array.isArray(input.premiumHistory) ? input.premiumHistory : [],
    status: derivePolicyStatus(expiryDate),
    sortOrder: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const pan = safeTrim(input.pan) || null;
  return {
    docs,
    expiryDate,
    draft,
    pan,
  };
}

export function buildInsuranceInsertPayload(
  userId: string,
  input: InsurancePolicyFormInput,
  sortOrder: number,
): InsuranceInsert {
  const { docs, expiryDate, draft, pan } = trackerFieldsFromInput(input);

  return {
    user_id: userId,
    insurance_type: input.type,
    provider: safeTrim(input.provider) || "Unknown provider",
    coverage_amount_npr: Math.max(0, Math.round(Number(input.coverageAmountNpr) || 0)),
    premium_npr: Math.max(0, Math.round(Number(input.premiumNpr) || 0)),
    payment_frequency: input.paymentFrequency || "yearly",
    start_date: input.startDate || null,
    expiry_date: expiryDate || null,
    policy_term_years: Math.max(0, Math.round(Number(input.policyTermYears) || 0)),
    nominee: safeTrim(input.nominee) || null,
    family_members_covered: Array.isArray(input.familyMembersCovered) ? input.familyMembersCovered : [],
    notes: safeTrim(input.notes) || null,
    agent_name: safeTrim(input.agentName) || null,
    agent_phone: safeTrim(input.agentPhone) || null,
    branch: safeTrim(input.branch) || null,
    policy_number: safeTrim(input.policyNumber) || null,
    proposal_number: safeTrim(input.proposalNumber) || null,
    pan,
    pan_number: pan,
    medical_notes: safeTrim(input.medicalNotes) || null,
    documents: (docs.documents ?? []) as unknown as Json,
    document_data_url: docs.documentDataUrl,
    document_file_name: docs.documentFileName,
    premium_history: (draft.premiumHistory ?? []) as unknown as Json,
    total_installments: draft.totalInstallments ?? 0,
    installments_paid: draft.installmentsPaid ?? 0,
    installments_remaining: draft.installmentsRemaining ?? 0,
    total_premium_paid: draft.totalPremiumPaid ?? 0,
    remaining_premium: draft.remainingPremium ?? 0,
    next_premium_date: draft.nextPremiumDate ?? null,
    next_premium_amount: draft.nextPremiumAmount ?? 0,
    sort_order: sortOrder,
  };
}

export function buildInsuranceUpdatePayload(input: InsurancePolicyFormInput) {
  const { docs, expiryDate, draft, pan } = trackerFieldsFromInput(input);

  return {
    insurance_type: input.type,
    provider: safeTrim(input.provider) || "Unknown provider",
    coverage_amount_npr: Math.max(0, Math.round(Number(input.coverageAmountNpr) || 0)),
    premium_npr: Math.max(0, Math.round(Number(input.premiumNpr) || 0)),
    payment_frequency: input.paymentFrequency || "yearly",
    start_date: input.startDate || null,
    expiry_date: expiryDate || null,
    policy_term_years: Math.max(0, Math.round(Number(input.policyTermYears) || 0)),
    nominee: safeTrim(input.nominee) || null,
    family_members_covered: Array.isArray(input.familyMembersCovered) ? input.familyMembersCovered : [],
    notes: safeTrim(input.notes) || null,
    agent_name: safeTrim(input.agentName) || null,
    agent_phone: safeTrim(input.agentPhone) || null,
    branch: safeTrim(input.branch) || null,
    policy_number: safeTrim(input.policyNumber) || null,
    proposal_number: safeTrim(input.proposalNumber) || null,
    pan,
    pan_number: pan,
    medical_notes: safeTrim(input.medicalNotes) || null,
    documents: (docs.documents ?? []) as unknown as Json,
    document_data_url: docs.documentDataUrl,
    document_file_name: docs.documentFileName,
    premium_history: (draft.premiumHistory ?? []) as unknown as Json,
    total_installments: draft.totalInstallments ?? 0,
    installments_paid: draft.installmentsPaid ?? 0,
    installments_remaining: draft.installmentsRemaining ?? 0,
    total_premium_paid: draft.totalPremiumPaid ?? 0,
    remaining_premium: draft.remainingPremium ?? 0,
    next_premium_date: draft.nextPremiumDate ?? null,
    next_premium_amount: draft.nextPremiumAmount ?? 0,
    updated_at: new Date().toISOString(),
  };
}
