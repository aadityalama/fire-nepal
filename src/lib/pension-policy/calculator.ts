import { PENSION_POLICY_CATALOG } from "@/lib/pension-policy/catalog";
import { resolvePolicyRule, todayIsoDate } from "@/lib/pension-policy/resolve";
import type {
  PolicyDrivenCalculatorInput,
  PolicyDrivenCalculatorResult,
} from "@/lib/pension-policy/types";

const UNAVAILABLE = "Official policy information unavailable for verification.";

/**
 * Policy-driven retirement contribution projection.
 * Uses verified contribution rates when available; never invents growth/annuity factors.
 * When rates are unverified, returns unavailable messaging instead of fabricated pensions.
 */
export function computePolicyDrivenProjection(input: PolicyDrivenCalculatorInput): PolicyDrivenCalculatorResult {
  const asOfDate = input.asOfDate ?? todayIsoDate();
  const yearsToRetirement = Math.max(0, input.expectedRetirementAge - input.age);
  const warnings: string[] = [];
  const policyVersionIds: string[] = [];

  const contribution = resolvePolicyRule(PENSION_POLICY_CATALOG, {
    institution: input.institution,
    category: "contribution",
    asOfDate,
  });

  if (!contribution.ok) {
    return {
      institution: input.institution,
      policyVersionIds,
      asOfDate,
      yearsToRetirement,
      monthlyEmployeeRatePct: null,
      monthlyEmployerRatePct: null,
      projectedBalanceNpr: null,
      estimatedMonthlyBenefitNpr: null,
      narrative: UNAVAILABLE,
      warnings: [UNAVAILABLE],
      unavailableMessage: UNAVAILABLE,
    };
  }

  policyVersionIds.push(contribution.rule.id);
  const employeePct = numberParam(contribution.rule.parameters, [
    "employeeContributionPctOfSalary",
  ]);
  const employerPct = numberParam(contribution.rule.parameters, [
    "employerOrGovernmentContributionPctOfSalary",
    "governmentContributionPctOfSalary",
  ]);

  if (employeePct == null && employerPct == null) {
    return {
      institution: input.institution,
      policyVersionIds,
      asOfDate,
      yearsToRetirement,
      monthlyEmployeeRatePct: null,
      monthlyEmployerRatePct: null,
      projectedBalanceNpr: null,
      estimatedMonthlyBenefitNpr: null,
      narrative: UNAVAILABLE,
      warnings: [UNAVAILABLE],
      unavailableMessage: UNAVAILABLE,
    };
  }

  const salary = Math.max(0, input.monthlySalaryNpr);
  const employeeFromRate = employeePct != null ? Math.round((salary * employeePct) / 100) : 0;
  const employerFromRate = employerPct != null ? Math.round((salary * employerPct) / 100) : 0;

  const employeeMonthly =
    input.monthlyEmployeeContributionNpr > 0 ? input.monthlyEmployeeContributionNpr : employeeFromRate;
  const employerMonthly =
    input.monthlyEmployerContributionNpr > 0 ? input.monthlyEmployerContributionNpr : employerFromRate;

  if (employeeMonthly <= 0 && employerMonthly <= 0 && input.currentBalanceNpr <= 0) {
    warnings.push(UNAVAILABLE);
    return {
      institution: input.institution,
      policyVersionIds,
      asOfDate,
      yearsToRetirement,
      monthlyEmployeeRatePct: employeePct,
      monthlyEmployerRatePct: employerPct,
      projectedBalanceNpr: null,
      estimatedMonthlyBenefitNpr: null,
      narrative: UNAVAILABLE,
      warnings,
      unavailableMessage: UNAVAILABLE,
    };
  }

  // Contribution stacking only — no invented interest / annuity conversion.
  const months = yearsToRetirement * 12;
  const futureContributions = (employeeMonthly + employerMonthly) * months;
  const projectedBalanceNpr = Math.round(Math.max(0, input.currentBalanceNpr) + futureContributions);

  warnings.push(
    "Projected balance sums verified contribution rates (or your entered contributions) without assuming unofficial interest or pension conversion factors.",
  );

  return {
    institution: input.institution,
    policyVersionIds,
    asOfDate,
    yearsToRetirement,
    monthlyEmployeeRatePct: employeePct,
    monthlyEmployerRatePct: employerPct,
    projectedBalanceNpr,
    estimatedMonthlyBenefitNpr: null,
    narrative: `Using policy ${contribution.rule.version} (effective ${contribution.rule.effectiveDate}): estimated accumulated contributions to retirement ≈ NPR ${projectedBalanceNpr.toLocaleString("en-IN")}. Monthly pension conversion is not shown because an official benefit formula is not verified in the policy layer.`,
    warnings,
  };
}

function numberParam(
  parameters: Record<string, number | string | boolean> | undefined,
  keys: string[],
): number | null {
  if (!parameters) return null;
  for (const key of keys) {
    const value = parameters[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return null;
}
