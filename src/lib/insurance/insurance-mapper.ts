import type { InsurancePaymentFrequency, InsurancePolicy, InsurancePolicyFormInput, InsuranceType } from "@/lib/insurance/insurance-types";
import {
  normalizeInsurancePolicyFields,
  resolveExpiryFromTerm,
  syncLegacyDocumentFields,
} from "@/lib/insurance/insurance-normalize";
import { derivePolicyStatus } from "@/lib/insurance/insurance-utils";
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

/** Map a Supabase row (full or legacy) into the domain policy model. */
export function mapInsuranceRow(row: InsuranceRow | (Omit<InsuranceRow, "deleted_at" | "policy_term_years" | "agent_name" | "agent_phone" | "branch" | "policy_number" | "proposal_number" | "pan" | "medical_notes" | "documents"> & {
  deleted_at?: string | null;
  policy_term_years?: number | null;
  agent_name?: string | null;
  agent_phone?: string | null;
  branch?: string | null;
  policy_number?: string | null;
  proposal_number?: string | null;
  pan?: string | null;
  medical_notes?: string | null;
  documents?: Json | null;
})): InsurancePolicy {
  const expiryDate = row.expiry_date ?? "";
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
    pan: row.pan ?? "",
    medicalNotes: row.medical_notes ?? "",
    documents: row.documents ?? [],
    documentDataUrl: row.document_data_url,
    documentFileName: row.document_file_name,
  });

  return {
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
}

export function buildInsuranceInsertPayload(
  userId: string,
  input: InsurancePolicyFormInput,
  sortOrder: number,
): InsuranceInsert {
  const docs = syncLegacyDocumentFields({
    documents: input.documents ?? [],
    documentDataUrl: input.documentDataUrl,
    documentFileName: input.documentFileName,
  });
  const expiryDate = resolveExpiryFromTerm(input.startDate, input.policyTermYears ?? 0, input.expiryDate);

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
    pan: safeTrim(input.pan) || null,
    medical_notes: safeTrim(input.medicalNotes) || null,
    documents: (docs.documents ?? []) as unknown as Json,
    document_data_url: docs.documentDataUrl,
    document_file_name: docs.documentFileName,
    sort_order: sortOrder,
  };
}

export function buildInsuranceUpdatePayload(input: InsurancePolicyFormInput) {
  const docs = syncLegacyDocumentFields({
    documents: input.documents ?? [],
    documentDataUrl: input.documentDataUrl,
    documentFileName: input.documentFileName,
  });
  const expiryDate = resolveExpiryFromTerm(input.startDate, input.policyTermYears ?? 0, input.expiryDate);

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
    pan: safeTrim(input.pan) || null,
    medical_notes: safeTrim(input.medicalNotes) || null,
    documents: (docs.documents ?? []) as unknown as Json,
    document_data_url: docs.documentDataUrl,
    document_file_name: docs.documentFileName,
    updated_at: new Date().toISOString(),
  };
}
