import type { PensionPolicyRule } from "@/lib/pension-policy/types";

/** CIT / Nagarik Lagani Kosh — portals verified; scheme rates pending official circular verification. */
export const CIT_POLICY_RULES: PensionPolicyRule[] = [
  {
    id: "cit-institution-v1",
    institution: "cit",
    policyServiceName: "Citizen Investment Trust (Nagarik Lagani Kosh)",
    officialSourceUrl: "https://nlk.org.np/",
    ruleCategory: "other",
    effectiveDate: "1991-01-01",
    version: "cit-institution-v1",
    lastVerifiedDate: "2026-08-15",
    status: "active",
    title: "CIT / NLK official institution",
    summary:
      "Citizen Investment Trust (CIT / Nagarik Lagani Kosh) operates official retirement and investment schemes for Nepali citizens and employees via nlk.org.np and eservice.nlk.org.np.",
  },
  {
    id: "cit-eservice-enrollment-v1",
    institution: "cit",
    policyServiceName: "CIT e-Service",
    officialSourceUrl: "https://eservice.nlk.org.np/",
    ruleCategory: "procedure",
    effectiveDate: "2020-01-01",
    version: "cit-eservice-v1",
    lastVerifiedDate: "2026-08-15",
    status: "active",
    title: "Official e-Service enrollment & login",
    summary:
      "Individuals and offices register and log in through the official CIT e-Service application for contribution/pension enrollment and account management. FireNepal never collects CIT passwords or OTPs.",
  },
  {
    id: "cit-migrant-pension-notice-v1",
    institution: "cit",
    policyServiceName: "Nagarik Migrant Worker Pension Yojana",
    officialSourceUrl: "https://eservice.nlk.org.np/",
    ruleCategory: "retirement_benefit",
    effectiveDate: "2020-01-01",
    version: "cit-migrant-v1",
    lastVerifiedDate: "2026-08-15",
    status: "active",
    title: "Migrant worker pension scheme (portal listing)",
    summary:
      "CIT e-Service lists Nagarik Migrant Worker Pension Yojana enrollment. Contribution and benefit formulas must be read from CIT’s official scheme documents before planning amounts.",
  },
  {
    id: "cit-contribution-rates-pending",
    institution: "cit",
    policyServiceName: "CIT retirement / employee savings contribution rules",
    officialSourceUrl: "https://nlk.org.np/",
    ruleCategory: "contribution",
    effectiveDate: "1991-01-01",
    version: "cit-contribution-pending",
    lastVerifiedDate: "2026-08-15",
    status: "pending_verification",
    title: "Contribution rates & ceilings",
    summary:
      "Scheme-specific contribution rates, lock-in periods, and tax treatment must be verified from the current official CIT circular before calculator use.",
  },
  {
    id: "cit-withdrawal-pending",
    institution: "cit",
    policyServiceName: "CIT withdrawal rules",
    officialSourceUrl: "https://nlk.org.np/",
    ruleCategory: "withdrawal",
    effectiveDate: "1991-01-01",
    version: "cit-withdrawal-pending",
    lastVerifiedDate: "2026-08-15",
    status: "pending_verification",
    title: "Withdrawal / maturity rules",
    summary:
      "Withdrawal and maturity conditions differ by CIT scheme and are not embedded numerically until an official version is verified.",
  },
];
