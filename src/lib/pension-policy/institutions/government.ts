import type { PensionPolicyRule } from "@/lib/pension-policy/types";

/**
 * Government Pension — Contributory Pension Scheme administered via EPF under Pension Fund Act 2075.
 * Source: https://epf.org.np/service/contributory-pension/
 */
export const GOVERNMENT_PENSION_POLICY_RULES: PensionPolicyRule[] = [
  {
    id: "gov-cps-mandate-v1",
    institution: "government_pension",
    policyServiceName: "Contributory Pension Scheme (Pension Fund Act 2075)",
    officialSourceUrl: "https://epf.org.np/service/contributory-pension/",
    ruleCategory: "other",
    effectiveDate: "2019-07-17",
    version: "gov-cps-mandate-v1",
    lastVerifiedDate: "2026-08-15",
    status: "active",
    title: "Government contributory pension mandate",
    summary:
      "EPF implements the Contributory Pension Scheme for federal government and public-sector employees under the Pension Fund Act 2075, starting FY 2076/77.",
  },
  {
    id: "gov-cps-eligibility-v1",
    institution: "government_pension",
    policyServiceName: "Contributory Pension Scheme (Pension Fund Act 2075)",
    officialSourceUrl: "https://epf.org.np/service/contributory-pension/",
    ruleCategory: "eligibility",
    effectiveDate: "2019-07-17",
    version: "gov-cps-eligibility-v1",
    lastVerifiedDate: "2026-08-15",
    status: "active",
    title: "Eligibility — permanent appointment from 2076 Shrawan 1",
    summary:
      "Contributory Retirement Scheme applies to permanently appointed employees of Civil Service, Nepal Army, Nepal Police, Armed Police Force, and Nepal Special Service from 2076 BS Shrawan 1 onward.",
  },
  {
    id: "gov-cps-contribution-v1",
    institution: "government_pension",
    policyServiceName: "Contributory Pension Scheme (Pension Fund Act 2075)",
    officialSourceUrl: "https://epf.org.np/service/contributory-pension/",
    ruleCategory: "contribution",
    effectiveDate: "2019-07-17",
    version: "gov-cps-contribution-v1",
    lastVerifiedDate: "2026-08-15",
    status: "active",
    title: "Employee 6% + Government 6%",
    summary:
      "Monthly salary is deducted by 6% from the employee; the Government of Nepal contributes the same proportion to the contributory pension account.",
    parameters: {
      employeeContributionPctOfSalary: 6,
      governmentContributionPctOfSalary: 6,
    },
  },
  {
    id: "gov-cps-procedure-v1",
    institution: "government_pension",
    policyServiceName: "Contributory Pension Scheme (Pension Fund Act 2075)",
    officialSourceUrl: "https://epf.org.np/service/contributory-pension/",
    ruleCategory: "procedure",
    effectiveDate: "2019-07-17",
    version: "gov-cps-procedure-v1",
    lastVerifiedDate: "2026-08-15",
    status: "active",
    title: "KYC, UCIN, and office web-entry procedures",
    summary:
      "Participants update KYC, obtain UCIN, and offices use EPF web-entry access to deposit monthly statements through designated banks as published by EPF.",
  },
  {
    id: "gov-cps-family-pending",
    institution: "government_pension",
    policyServiceName: "Family / dependent pension",
    officialSourceUrl: "https://epf.org.np/publication/pension-fund-act-2075/",
    ruleCategory: "family_protection",
    effectiveDate: "2019-07-17",
    version: "gov-cps-family-pending",
    lastVerifiedDate: "2026-08-15",
    status: "pending_verification",
    title: "Family / dependent pension rules",
    summary:
      "Family and dependent pension entitlements under the Pension Fund Act 2075 must be confirmed from the official Act / EPF notices before displaying numeric entitlements.",
  },
  {
    id: "gov-gratuity-pending",
    institution: "government_pension",
    policyServiceName: "Gratuity and related benefits",
    officialSourceUrl: "https://epf.org.np/service/contributory-pension/",
    ruleCategory: "gratuity",
    effectiveDate: "2019-07-17",
    version: "gov-gratuity-pending",
    lastVerifiedDate: "2026-08-15",
    status: "pending_verification",
    title: "Gratuity / related benefit formulas",
    summary:
      "Gratuity and related settlement formulas are scheme-specific. FireNepal shows only verified official text until a dated circular is activated.",
  },
  {
    id: "gov-retirement-age-pending",
    institution: "government_pension",
    policyServiceName: "Retirement age and service-period rules",
    officialSourceUrl: "https://epf.org.np/publication/pension-fund-act-2075/",
    ruleCategory: "retirement_benefit",
    effectiveDate: "2019-07-17",
    version: "gov-retire-age-pending",
    lastVerifiedDate: "2026-08-15",
    status: "pending_verification",
    title: "Retirement age / service-period requirements",
    summary:
      "Exact retirement ages and minimum service periods vary by service cadre and Act provisions — verify on the official Pension Fund Act materials before planning.",
  },
];
