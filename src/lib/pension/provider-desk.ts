import type { LucideIcon } from "lucide-react";
import { Building2, Landmark, Scale, Shield } from "lucide-react";
import type { PensionInstitutionId } from "@/lib/pension-policy";
import {
  INSTITUTION_LABELS,
  listActiveRulesForInstitution,
  PENSION_POLICY_CATALOG,
  portalsForInstitution,
  todayIsoDate,
} from "@/lib/pension-policy";
import { PENSION_BASE } from "@/lib/pension/nav";

/** Personal ledger fields — only show real synced values; otherwise Not Connected / Not Synced. */
export type PensionLedgerField =
  | { kind: "connected"; value: string }
  | { kind: "not_connected" }
  | { kind: "not_synced" };

export type PensionProviderAccent = "ssf" | "epf" | "cit" | "gov";

export type PensionProviderDesk = {
  id: PensionInstitutionId;
  accent: PensionProviderAccent;
  shortLabel: string;
  title: string;
  subtitle: string;
  href: string;
  icon: LucideIcon;
  /** Always not_connected until an official portal sync exists. */
  balance: PensionLedgerField;
  monthlyContribution: PensionLedgerField;
  contributionMonths: PensionLedgerField;
  lastContribution: PensionLedgerField;
  /** Verified policy rate copy only — never a personal amount. */
  verifiedPolicyRateLabel: string | null;
  payHref: string | null;
  loginHref: string | null;
  portalHref: string | null;
  activePolicyCount: number;
  pendingPolicyCount: number;
};

const ACCENT: Record<PensionInstitutionId, PensionProviderAccent> = {
  ssf: "ssf",
  epf: "epf",
  cit: "cit",
  government_pension: "gov",
};

const SHORT: Record<PensionInstitutionId, string> = {
  ssf: "SSF",
  epf: "EPF",
  cit: "CIT",
  government_pension: "Gov Pension",
};

const ICONS: Record<PensionInstitutionId, LucideIcon> = {
  ssf: Shield,
  epf: Building2,
  cit: Landmark,
  government_pension: Scale,
};

const SUBTITLES: Record<PensionInstitutionId, string> = {
  ssf: "Social Security Fund · SOSYS",
  epf: "Employees Provident Fund · iPortal",
  cit: "Citizen Investment Trust · NLK e-Service",
  government_pension: "Contributory Pension · Pension Fund Act 2075",
};

function verifiedContributionRateLabel(institution: PensionInstitutionId): string | null {
  const asOf = todayIsoDate();
  const rules = listActiveRulesForInstitution(PENSION_POLICY_CATALOG, institution, asOf).filter(
    (r) => r.ruleCategory === "contribution" && r.status === "active" && r.parameters,
  );
  for (const rule of rules) {
    const emp = rule.parameters?.employeeContributionPctOfSalary;
    const gov = rule.parameters?.governmentContributionPctOfSalary;
    const er = rule.parameters?.employerContributionPctOfSalary;
    if (typeof emp === "number" && typeof gov === "number") {
      return `Policy ${emp}% + ${gov}%`;
    }
    if (typeof emp === "number" && typeof er === "number") {
      return `Policy ${emp}% + ${er}%`;
    }
    if (typeof emp === "number") {
      return `Policy employee ${emp}%`;
    }
  }
  return null;
}

/** Personal balances are never invented — always Not Connected until official sync exists. */
export function buildProviderDesks(): PensionProviderDesk[] {
  const asOf = todayIsoDate();
  const ids: PensionInstitutionId[] = ["ssf", "epf", "cit", "government_pension"];

  return ids.map((id) => {
    const portals = portalsForInstitution(id);
    const rules = listActiveRulesForInstitution(PENSION_POLICY_CATALOG, id, asOf);
    return {
      id,
      accent: ACCENT[id],
      shortLabel: SHORT[id],
      title: INSTITUTION_LABELS[id],
      subtitle: SUBTITLES[id],
      href:
        id === "government_pension"
          ? `${PENSION_BASE}/government`
          : `${PENSION_BASE}/${id}`,
      icon: ICONS[id],
      balance: { kind: "not_connected" },
      monthlyContribution: { kind: "not_synced" },
      contributionMonths: { kind: "not_synced" },
      lastContribution: { kind: "not_synced" },
      verifiedPolicyRateLabel: verifiedContributionRateLabel(id),
      payHref: portals.find((p) => p.label === "Pay / Contribution")?.href ?? null,
      loginHref: portals.find((p) => p.label === "Official Login")?.href ?? null,
      portalHref: portals.find((p) => p.label === "Official Portal")?.href ?? null,
      activePolicyCount: rules.filter((r) => r.status === "active").length,
      pendingPolicyCount: rules.filter((r) => r.status === "pending_verification").length,
    };
  });
}

export function ledgerFieldLabel(field: PensionLedgerField): string {
  if (field.kind === "connected") return field.value;
  if (field.kind === "not_connected") return "Not Connected";
  return "Not Synced";
}

export function isLedgerEmpty(field: PensionLedgerField): boolean {
  return field.kind !== "connected";
}
