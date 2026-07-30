import type { SupabaseClient } from "@supabase/supabase-js";
import { buildInsuranceInsertPayload, buildInsuranceUpdatePayload, mapInsuranceRow } from "@/lib/insurance/insurance-mapper";
import type { InsurancePolicy, InsurancePolicyFormInput } from "@/lib/insurance/insurance-types";
import type { Database } from "@/types/supabase-database";

type Client = SupabaseClient<Database>;

const INSURANCE_COLUMNS =
  "id,user_id,insurance_type,provider,coverage_amount_npr,premium_npr,payment_frequency,start_date,expiry_date,policy_term_years,nominee,family_members_covered,notes,agent_name,agent_phone,branch,policy_number,proposal_number,pan,medical_notes,documents,document_data_url,document_file_name,sort_order,deleted_at,created_at,updated_at" as const;

const LEGACY_SOFT_DELETE_COLUMNS =
  "id,user_id,insurance_type,provider,coverage_amount_npr,premium_npr,payment_frequency,start_date,expiry_date,nominee,family_members_covered,notes,document_data_url,document_file_name,sort_order,deleted_at,created_at,updated_at" as const;

const LEGACY_INSURANCE_COLUMNS =
  "id,user_id,insurance_type,provider,coverage_amount_npr,premium_npr,payment_frequency,start_date,expiry_date,nominee,family_members_covered,notes,document_data_url,document_file_name,sort_order,created_at,updated_at" as const;

function missingColumn(error: { message?: string; code?: string } | null | undefined, column: string) {
  const message = error?.message?.toLowerCase() ?? "";
  return (
    error?.code === "42703" ||
    error?.code === "PGRST204" ||
    message.includes(column.toLowerCase())
  );
}

function missingDeletedAtColumn(error: { message?: string; code?: string } | null | undefined) {
  return missingColumn(error, "deleted_at");
}

function missingPolicyManagementColumns(error: { message?: string; code?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? "";
  return (
    error?.code === "42703" ||
    error?.code === "PGRST204" ||
    message.includes("policy_term_years") ||
    message.includes("agent_name") ||
    message.includes("documents") ||
    message.includes("medical_notes") ||
    message.includes("policy_number") ||
    message.includes("proposal_number")
  );
}

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
  const result = await client
    .from("finance_insurance_policies")
    .select(INSURANCE_COLUMNS)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (missingPolicyManagementColumns(result.error) || missingDeletedAtColumn(result.error)) {
    if (missingDeletedAtColumn(result.error) && !missingPolicyManagementColumns(result.error)) {
      const legacyResult = await client
        .from("finance_insurance_policies")
        .select(LEGACY_INSURANCE_COLUMNS)
        .eq("user_id", userId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (legacyResult.error) {
        throw new Error(mapInsuranceError(legacyResult.error, "Could not load insurance policies."));
      }
      return sortInsurancePolicies((legacyResult.data ?? []).map((row) => mapInsuranceRow({ ...row, deleted_at: null })));
    }

    const softDeleteResult = await client
      .from("finance_insurance_policies")
      .select(LEGACY_SOFT_DELETE_COLUMNS)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (missingDeletedAtColumn(softDeleteResult.error)) {
      const legacyResult = await client
        .from("finance_insurance_policies")
        .select(LEGACY_INSURANCE_COLUMNS)
        .eq("user_id", userId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (legacyResult.error) {
        throw new Error(mapInsuranceError(legacyResult.error, "Could not load insurance policies."));
      }
      return sortInsurancePolicies((legacyResult.data ?? []).map((row) => mapInsuranceRow({ ...row, deleted_at: null })));
    }

    if (softDeleteResult.error) {
      throw new Error(mapInsuranceError(softDeleteResult.error, "Could not load insurance policies."));
    }
    return sortInsurancePolicies((softDeleteResult.data ?? []).map((row) => mapInsuranceRow({ ...row, deleted_at: null })));
  }

  const { data, error } = result;
  if (error) {
    throw new Error(mapInsuranceError(error, "Could not load insurance policies."));
  }

  return sortInsurancePolicies((data ?? []).map((row) => mapInsuranceRow({ ...row, deleted_at: null })));
}

export async function createInsurancePolicyForUser(
  client: Client,
  userId: string,
  input: InsurancePolicyFormInput,
): Promise<InsurancePolicy> {
  let countResult = await client
    .from("finance_insurance_policies")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("deleted_at", null);

  if (missingDeletedAtColumn(countResult.error)) {
    countResult = await client
      .from("finance_insurance_policies")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
  }

  const { count, error: countError } = countResult;
  if (countError) {
    throw new Error(mapInsuranceError(countError, "Could not prepare insurance save."));
  }

  const payload = buildInsuranceInsertPayload(userId, input, count ?? 0);
  const insertResult = await client.from("finance_insurance_policies").insert(payload).select(INSURANCE_COLUMNS).single();

  if (missingPolicyManagementColumns(insertResult.error)) {
    const legacyPayload = {
      user_id: payload.user_id,
      insurance_type: payload.insurance_type,
      provider: payload.provider,
      coverage_amount_npr: payload.coverage_amount_npr,
      premium_npr: payload.premium_npr,
      payment_frequency: payload.payment_frequency,
      start_date: payload.start_date,
      expiry_date: payload.expiry_date,
      nominee: payload.nominee,
      family_members_covered: payload.family_members_covered,
      notes: payload.notes,
      document_data_url: payload.document_data_url,
      document_file_name: payload.document_file_name,
      sort_order: payload.sort_order,
    };
    const legacyInsert = await client
      .from("finance_insurance_policies")
      .insert(legacyPayload)
      .select(LEGACY_INSURANCE_COLUMNS)
      .single();
    if (legacyInsert.error || !legacyInsert.data) {
      throw new Error(mapInsuranceError(legacyInsert.error, "Could not save insurance policy."));
    }
    return mapInsuranceRow({
      ...legacyInsert.data,
      deleted_at: null,
      policy_term_years: input.policyTermYears,
      agent_name: input.agentName,
      agent_phone: input.agentPhone,
      branch: input.branch,
      policy_number: input.policyNumber,
      proposal_number: input.proposalNumber,
      pan: input.pan,
      medical_notes: input.medicalNotes,
      documents: input.documents,
    });
  }

  if (insertResult.error || !insertResult.data) {
    throw new Error(mapInsuranceError(insertResult.error, "Could not save insurance policy."));
  }

  return mapInsuranceRow({ ...insertResult.data, deleted_at: insertResult.data.deleted_at ?? null });
}

export async function updateInsurancePolicyForUser(
  client: Client,
  userId: string,
  policyId: string,
  input: InsurancePolicyFormInput,
): Promise<InsurancePolicy> {
  const updatePayload = buildInsuranceUpdatePayload(input);

  const updateResult = await client
    .from("finance_insurance_policies")
    .update(updatePayload)
    .eq("id", policyId)
    .eq("user_id", userId)
    .select(INSURANCE_COLUMNS)
    .single();

  if (missingPolicyManagementColumns(updateResult.error) || missingDeletedAtColumn(updateResult.error)) {
    const legacyPayload = {
      insurance_type: updatePayload.insurance_type,
      provider: updatePayload.provider,
      coverage_amount_npr: updatePayload.coverage_amount_npr,
      premium_npr: updatePayload.premium_npr,
      payment_frequency: updatePayload.payment_frequency,
      start_date: updatePayload.start_date,
      expiry_date: updatePayload.expiry_date,
      nominee: updatePayload.nominee,
      family_members_covered: updatePayload.family_members_covered,
      notes: updatePayload.notes,
      document_data_url: updatePayload.document_data_url,
      document_file_name: updatePayload.document_file_name,
      updated_at: updatePayload.updated_at,
    };

    const legacyUpdateResult = await client
      .from("finance_insurance_policies")
      .update(legacyPayload)
      .eq("id", policyId)
      .eq("user_id", userId)
      .select(LEGACY_SOFT_DELETE_COLUMNS)
      .single();

    if (missingDeletedAtColumn(legacyUpdateResult.error)) {
      const veryLegacy = await client
        .from("finance_insurance_policies")
        .update(legacyPayload)
        .eq("id", policyId)
        .eq("user_id", userId)
        .select(LEGACY_INSURANCE_COLUMNS)
        .single();
      if (veryLegacy.error || !veryLegacy.data) {
        throw new Error(mapInsuranceError(veryLegacy.error, "Could not update insurance policy."));
      }
      return mapInsuranceRow({
        ...veryLegacy.data,
        deleted_at: null,
        policy_term_years: input.policyTermYears,
        agent_name: input.agentName,
        agent_phone: input.agentPhone,
        branch: input.branch,
        policy_number: input.policyNumber,
        proposal_number: input.proposalNumber,
        pan: input.pan,
        medical_notes: input.medicalNotes,
        documents: input.documents,
      });
    }

    if (legacyUpdateResult.error || !legacyUpdateResult.data) {
      throw new Error(mapInsuranceError(legacyUpdateResult.error, "Could not update insurance policy."));
    }
    return mapInsuranceRow({
      ...legacyUpdateResult.data,
      deleted_at: null,
      policy_term_years: input.policyTermYears,
      agent_name: input.agentName,
      agent_phone: input.agentPhone,
      branch: input.branch,
      policy_number: input.policyNumber,
      proposal_number: input.proposalNumber,
      pan: input.pan,
      medical_notes: input.medicalNotes,
      documents: input.documents,
    });
  }

  const { data, error } = updateResult;
  if (error || !data) {
    throw new Error(mapInsuranceError(error, "Could not update insurance policy."));
  }

  return mapInsuranceRow({ ...data, deleted_at: data.deleted_at ?? null });
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
    if (missingDeletedAtColumn(error)) {
      throw new Error("Insurance cloud delete is unavailable until the soft-delete migration is applied. Existing data was not changed.");
    }
    throw new Error(mapInsuranceError(error, "Could not delete insurance policy."));
  }
  if (!data) {
    throw new Error("Insurance policy not found.");
  }
}
