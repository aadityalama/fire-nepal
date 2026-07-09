import type { InsurancePaymentFrequency, InsurancePolicy, InsurancePolicyFormInput, InsuranceType } from "@/lib/insurance/insurance-types";
import { derivePolicyStatus } from "@/lib/insurance/insurance-utils";
import type { Database } from "@/types/supabase-database";

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

const FREQUENCIES: InsurancePaymentFrequency[] = ["monthly", "quarterly", "yearly", "one_time"];

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

export function mapInsuranceRow(row: InsuranceRow): InsurancePolicy {
  const expiryDate = row.expiry_date ?? "";
  return {
    id: row.id,
    type: asType(row.insurance_type),
    provider: row.provider,
    coverageAmountNpr: Number(row.coverage_amount_npr) || 0,
    premiumNpr: Number(row.premium_npr) || 0,
    paymentFrequency: asFrequency(row.payment_frequency),
    startDate: row.start_date ?? "",
    expiryDate,
    nominee: row.nominee ?? "",
    familyMembersCovered: asStringArray(row.family_members_covered),
    notes: row.notes ?? "",
    documentDataUrl: row.document_data_url,
    documentFileName: row.document_file_name,
    status: derivePolicyStatus(expiryDate),
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function buildInsuranceInsertPayload(
  userId: string,
  input: InsurancePolicyFormInput,
  sortOrder: number,
): InsuranceInsert {
  return {
    user_id: userId,
    insurance_type: input.type,
    provider: input.provider.trim() || "Unknown provider",
    coverage_amount_npr: Math.max(0, Math.round(input.coverageAmountNpr)),
    premium_npr: Math.max(0, Math.round(input.premiumNpr)),
    payment_frequency: input.paymentFrequency,
    start_date: input.startDate || null,
    expiry_date: input.expiryDate || null,
    nominee: input.nominee.trim() || null,
    family_members_covered: input.familyMembersCovered,
    notes: input.notes.trim() || null,
    document_data_url: input.documentDataUrl,
    document_file_name: input.documentFileName,
    sort_order: sortOrder,
  };
}
