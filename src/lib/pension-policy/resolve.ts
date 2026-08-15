import type {
  PensionInstitutionId,
  PensionPolicyRule,
  PolicyResolutionResult,
  PolicyRuleCategory,
} from "@/lib/pension-policy/types";

function parseIsoDay(iso: string): number {
  const t = Date.parse(`${iso}T00:00:00.000Z`);
  return Number.isFinite(t) ? t : Number.NaN;
}

/**
 * Resolve the policy version applicable on `asOfDate` (inclusive effectiveDate).
 * Never returns pending_verification, expired, or superseded rules as active math inputs.
 * Never invents a fallback rate when no verified active rule exists.
 */
export function resolvePolicyRule(
  rules: readonly PensionPolicyRule[],
  opts: {
    institution: PensionInstitutionId;
    category: PolicyRuleCategory;
    asOfDate: string;
    policyServiceName?: string;
  },
): PolicyResolutionResult {
  const asOf = parseIsoDay(opts.asOfDate);
  if (!Number.isFinite(asOf)) {
    return {
      ok: false,
      reason: "Official policy information unavailable for verification.",
      category: opts.category,
    };
  }

  const candidates = rules
    .filter((r) => r.institution === opts.institution)
    .filter((r) => r.ruleCategory === opts.category)
    .filter((r) => (opts.policyServiceName ? r.policyServiceName === opts.policyServiceName : true))
    .filter((r) => r.status === "active")
    .filter((r) => {
      const eff = parseIsoDay(r.effectiveDate);
      return Number.isFinite(eff) && eff <= asOf;
    })
    .sort((a, b) => {
      const de = parseIsoDay(b.effectiveDate) - parseIsoDay(a.effectiveDate);
      if (de !== 0) return de;
      return b.version.localeCompare(a.version);
    });

  const rule = candidates[0];
  if (!rule) {
    return {
      ok: false,
      reason: "Official policy information unavailable for verification.",
      category: opts.category,
    };
  }

  return { ok: true, rule };
}

export function listActiveRulesForInstitution(
  rules: readonly PensionPolicyRule[],
  institution: PensionInstitutionId,
  asOfDate: string,
): PensionPolicyRule[] {
  const asOf = parseIsoDay(asOfDate);
  return rules
    .filter((r) => r.institution === institution)
    .filter((r) => r.status === "active" || r.status === "pending_verification")
    .filter((r) => {
      const eff = parseIsoDay(r.effectiveDate);
      return Number.isFinite(eff) && Number.isFinite(asOf) && eff <= asOf;
    })
    .sort((a, b) => a.ruleCategory.localeCompare(b.ruleCategory) || a.title.localeCompare(b.title));
}

export function todayIsoDate(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}
