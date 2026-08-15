import { CIT_POLICY_RULES } from "@/lib/pension-policy/institutions/cit";
import { EPF_POLICY_RULES } from "@/lib/pension-policy/institutions/epf";
import { GOVERNMENT_PENSION_POLICY_RULES } from "@/lib/pension-policy/institutions/government";
import { SSF_POLICY_RULES } from "@/lib/pension-policy/institutions/ssf";
import type { PensionInstitutionId, PensionPolicyRule } from "@/lib/pension-policy/types";

/** Central registry — Official Source → Verification → Version → Effective Date. */
export const PENSION_POLICY_CATALOG: readonly PensionPolicyRule[] = [
  ...SSF_POLICY_RULES,
  ...EPF_POLICY_RULES,
  ...CIT_POLICY_RULES,
  ...GOVERNMENT_PENSION_POLICY_RULES,
];

export const INSTITUTION_LABELS: Record<PensionInstitutionId, string> = {
  ssf: "Social Security Fund (SSF)",
  epf: "Employees Provident Fund (EPF)",
  cit: "Citizen Investment Trust (CIT)",
  government_pension: "Government Pension",
};

export function rulesForInstitution(institution: PensionInstitutionId): PensionPolicyRule[] {
  return PENSION_POLICY_CATALOG.filter((r) => r.institution === institution);
}
