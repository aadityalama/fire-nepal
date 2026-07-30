import type { SupabaseClient } from "@supabase/supabase-js";
import { buildInsuranceInsertPayload, buildInsuranceUpdatePayload, mapInsuranceRow } from "@/lib/insurance/insurance-mapper";
import type { InsurancePolicy, InsurancePolicyFormInput } from "@/lib/insurance/insurance-types";
import type { Database } from "@/types/supabase-database";

type Client = SupabaseClient<Database>;

const INSURANCE_COLUMNS =
  "id,user_id,insurance_type,provider,coverage_amount_npr,premium_npr,payment_frequency,start_date,expiry_date,policy_term_years,nominee,family_members_covered,notes,agent_name,agent_phone,branch,policy_number,proposal_number,pan,pan_number,medical_notes,documents,premium_history,total_installments,installments_paid,installments_remaining,total_premium_paid,remaining_premium,next_premium_date,next_premium_amount,document_data_url,document_file_name,sort_order,deleted_at,created_at,updated_at" as const;

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
    message.includes("agent_phone") ||
    message.includes("branch") ||
    message.includes("documents") ||
    message.includes("medical_notes") ||
    message.includes("policy_number") ||
    message.includes("proposal_number") ||
    message.includes("pan_number") ||
    message.includes("premium_history") ||
    message.includes("total_installments") ||
    message.includes("installments_paid") ||
    message.includes("installments_remaining") ||
    message.includes("total_premium_paid") ||
    message.includes("remaining_premium") ||
    message.includes("next_premium_date") ||
    message.includes("next_premium_amount")
  );
}

function stripPolicyManagementFields<T extends Record<string, unknown>>(payload: T) {
  const {
    policy_term_years: _policyTermYears,
    agent_name: _agentName,
    agent_phone: _agentPhone,
    branch: _branch,
    policy_number: _policyNumber,
    proposal_number: _proposalNumber,
    pan_number: _panNumber,
    medical_notes: _medicalNotes,
    documents: _documents,
    premium_history: _premiumHistory,
    total_installments: _totalInstallments,
    installments_paid: _installmentsPaid,
    installments_remaining: _installmentsRemaining,
    total_premium_paid: _totalPremiumPaid,
    remaining_premium: _remainingPremium,
    next_premium_date: _nextPremiumDate,
    next_premium_amount: _nextPremiumAmount,
    ...legacy
  } = payload;
  void _policyTermYears;
  void _agentName;
  void _agentPhone;
  void _branch;
  void _policyNumber;
  void _proposalNumber;
  void _panNumber;
  void _medicalNotes;
  void _documents;
  void _premiumHistory;
  void _totalInstallments;
  void _installmentsPaid;
  void _installmentsRemaining;
  void _totalPremiumPaid;
  void _remainingPremium;
  void _nextPremiumDate;
  void _nextPremiumAmount;
  return legacy;
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
    const legacyPayload = stripPolicyManagementFields(payload as Record<string, unknown>);
    const legacyInsert = await client
      .from("finance_insurance_policies")
      // Legacy schema omits policy-management columns.
      .insert(legacyPayload as never)
      .select(LEGACY_INSURANCE_COLUMNS)
      .single();
    if (legacyInsert.error || !legacyInsert.data) {
      // Soft-delete column may exist without policy-management columns — try soft-delete select set.
      const softDeleteInsert = await client
        .from("finance_insurance_policies")
        .insert(legacyPayload as never)
        .select(LEGACY_SOFT_DELETE_COLUMNS)
        .single();
      if (softDeleteInsert.error || !softDeleteInsert.data) {
        throw new Error(mapInsuranceError(softDeleteInsert.error ?? legacyInsert.error, "Could not save insurance policy."));
      }
      return mapInsuranceRow({
        ...softDeleteInsert.data,
        deleted_at: softDeleteInsert.data.deleted_at ?? null,
        policy_term_years: input.policyTermYears ?? 0,
        agent_name: input.agentName ?? "",
        agent_phone: input.agentPhone ?? "",
        branch: input.branch ?? "",
        policy_number: input.policyNumber ?? "",
        proposal_number: input.proposalNumber ?? "",
        pan: input.pan ?? "",
        medical_notes: input.medicalNotes ?? "",
        documents: input.documents ?? [],
        premium_history: input.premiumHistory ?? [],
        total_installments: input.totalInstallments ?? 0,
        installments_paid: input.installmentsPaid ?? 0,
        installments_remaining: input.installmentsRemaining ?? 0,
        total_premium_paid: input.totalPremiumPaid ?? 0,
        remaining_premium: input.remainingPremium ?? 0,
        next_premium_date: input.nextPremiumDate ?? null,
        next_premium_amount: input.nextPremiumAmount ?? 0,
      });
    }
    return mapInsuranceRow({
      ...legacyInsert.data,
      deleted_at: null,
      policy_term_years: input.policyTermYears ?? 0,
      agent_name: input.agentName ?? "",
      agent_phone: input.agentPhone ?? "",
      branch: input.branch ?? "",
      policy_number: input.policyNumber ?? "",
      proposal_number: input.proposalNumber ?? "",
      pan: input.pan ?? "",
      medical_notes: input.medicalNotes ?? "",
      documents: input.documents ?? [],
      premium_history: input.premiumHistory ?? [],
      total_installments: input.totalInstallments ?? 0,
      installments_paid: input.installmentsPaid ?? 0,
      installments_remaining: input.installmentsRemaining ?? 0,
      total_premium_paid: input.totalPremiumPaid ?? 0,
      remaining_premium: input.remainingPremium ?? 0,
      next_premium_date: input.nextPremiumDate ?? null,
      next_premium_amount: input.nextPremiumAmount ?? 0,
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
    const legacyPayload = stripPolicyManagementFields(updatePayload as Record<string, unknown>);

    const legacyUpdateResult = await client
      .from("finance_insurance_policies")
      .update(legacyPayload as never)
      .eq("id", policyId)
      .eq("user_id", userId)
      .select(LEGACY_SOFT_DELETE_COLUMNS)
      .single();

    if (missingDeletedAtColumn(legacyUpdateResult.error) || missingPolicyManagementColumns(legacyUpdateResult.error)) {
      const veryLegacy = await client
        .from("finance_insurance_policies")
        .update(legacyPayload as never)
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
        policy_term_years: input.policyTermYears ?? 0,
        agent_name: input.agentName ?? "",
        agent_phone: input.agentPhone ?? "",
        branch: input.branch ?? "",
        policy_number: input.policyNumber ?? "",
        proposal_number: input.proposalNumber ?? "",
        pan: input.pan ?? "",
        medical_notes: input.medicalNotes ?? "",
        documents: input.documents ?? [],
        premium_history: input.premiumHistory ?? [],
        total_installments: input.totalInstallments ?? 0,
        installments_paid: input.installmentsPaid ?? 0,
        installments_remaining: input.installmentsRemaining ?? 0,
        total_premium_paid: input.totalPremiumPaid ?? 0,
        remaining_premium: input.remainingPremium ?? 0,
        next_premium_date: input.nextPremiumDate ?? null,
        next_premium_amount: input.nextPremiumAmount ?? 0,
      });
    }

    if (legacyUpdateResult.error || !legacyUpdateResult.data) {
      throw new Error(mapInsuranceError(legacyUpdateResult.error, "Could not update insurance policy."));
    }
    return mapInsuranceRow({
      ...legacyUpdateResult.data,
      deleted_at: null,
      policy_term_years: input.policyTermYears ?? 0,
      agent_name: input.agentName ?? "",
      agent_phone: input.agentPhone ?? "",
      branch: input.branch ?? "",
      policy_number: input.policyNumber ?? "",
      proposal_number: input.proposalNumber ?? "",
      pan: input.pan ?? "",
      medical_notes: input.medicalNotes ?? "",
      documents: input.documents ?? [],
      premium_history: input.premiumHistory ?? [],
      total_installments: input.totalInstallments ?? 0,
      installments_paid: input.installmentsPaid ?? 0,
      installments_remaining: input.installmentsRemaining ?? 0,
      total_premium_paid: input.totalPremiumPaid ?? 0,
      remaining_premium: input.remainingPremium ?? 0,
      next_premium_date: input.nextPremiumDate ?? null,
      next_premium_amount: input.nextPremiumAmount ?? 0,
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
