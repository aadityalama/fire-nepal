import type { SupabaseClient } from "@supabase/supabase-js";
import { buildInsuranceInsertPayload, mapInsuranceRow } from "@/lib/insurance/insurance-mapper";
import type { InsurancePolicy, InsurancePolicyFormInput } from "@/lib/insurance/insurance-types";
import type { Database } from "@/types/supabase-database";

type Client = SupabaseClient<Database>;

const INSURANCE_COLUMNS =
  "id,user_id,insurance_type,provider,coverage_amount_npr,premium_npr,payment_frequency,start_date,expiry_date,nominee,family_members_covered,notes,document_data_url,document_file_name,sort_order,deleted_at,created_at,updated_at" as const;

function mapInsuranceError(error: { message?: string; code?: string } | null | undefined, fallback: string) {
  const message = error?.message ?? fallback;
  const lower = message.toLowerCase();

  if (
    lower.includes("finance_insurance_policies") &&
    (lower.includes("does not exist") || lower.includes("schema cache") || error?.code === "42P01" || error?.code === "PGRST205")
  ) {
    return "Insurance cloud sync is unavailable. Your local insurance workspace is still available.";
  }
  if (lower.includes("permission denied") || error?.code === "42501") {
    return "You do not have permission to save this policy.";
  }
  if (lower.includes("jwt") || lower.includes("not authenticated")) {
    return "Please sign in again to save your insurance policy.";
  }

  return message || fallback;
}

export function sortInsurancePolicies(policies: InsurancePolicy[]) {
  return [...policies].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.createdAt.localeCompare(b.createdAt);
  });
}

export async function listInsurancePoliciesForUser(client: Client, userId: string): Promise<InsurancePolicy[]> {
  const { data, error } = await client
    .from("finance_insurance_policies")
    .select(INSURANCE_COLUMNS)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(mapInsuranceError(error, "Could not load insurance policies."));
  }

  return sortInsurancePolicies((data ?? []).map(mapInsuranceRow));
}

export async function createInsurancePolicyForUser(
  client: Client,
  userId: string,
  input: InsurancePolicyFormInput,
): Promise<InsurancePolicy> {
  const { count, error: countError } = await client
    .from("finance_insurance_policies")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("deleted_at", null);

  if (countError) {
    throw new Error(mapInsuranceError(countError, "Could not prepare insurance save."));
  }

  const payload = buildInsuranceInsertPayload(userId, input, count ?? 0);
  const { data, error } = await client.from("finance_insurance_policies").insert(payload).select(INSURANCE_COLUMNS).single();

  if (error || !data) {
    throw new Error(mapInsuranceError(error, "Could not save insurance policy."));
  }

  return mapInsuranceRow(data);
}

export async function updateInsurancePolicyForUser(
  client: Client,
  userId: string,
  policyId: string,
  input: InsurancePolicyFormInput,
): Promise<InsurancePolicy> {
  const { data, error } = await client
    .from("finance_insurance_policies")
    .update({
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
      updated_at: new Date().toISOString(),
    })
    .eq("id", policyId)
    .eq("user_id", userId)
    .select(INSURANCE_COLUMNS)
    .single();

  if (error || !data) {
    throw new Error(mapInsuranceError(error, "Could not update insurance policy."));
  }

  return mapInsuranceRow(data);
}

export async function deleteInsurancePolicyForUser(client: Client, userId: string, policyId: string): Promise<void> {
  const { error, data } = await client
    .from("finance_insurance_policies")
    .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", policyId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();
  if (error) {
    throw new Error(mapInsuranceError(error, "Could not delete insurance policy."));
  }
  if (!data) {
    throw new Error("Insurance policy not found.");
  }
}
