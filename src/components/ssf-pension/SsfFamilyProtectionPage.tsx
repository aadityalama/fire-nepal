"use client";

import { Users } from "lucide-react";
import { listActiveRulesForInstitution, PENSION_POLICY_CATALOG, todayIsoDate } from "@/lib/pension-policy";
import { PensionChrome } from "@/components/pension/PensionChrome";
import { OfficialPortalActions } from "@/components/pension/OfficialPortalActions";
import {
  PensionBody,
  PensionGlassPanel,
  PensionHeading,
  PensionSectionLabel,
  PensionSoftRow,
} from "@/components/pension/PensionUi";

export function SsfFamilyProtectionPage() {
  const rules = listActiveRulesForInstitution(PENSION_POLICY_CATALOG, "ssf", todayIsoDate()).filter(
    (r) => r.ruleCategory === "family_protection",
  );
  const govFamily = listActiveRulesForInstitution(PENSION_POLICY_CATALOG, "government_pension", todayIsoDate()).filter(
    (r) => r.ruleCategory === "family_protection",
  );

  return (
    <PensionChrome
      title="Family Protection"
      subtitle="Dependent / family protection rules from the official policy layer. Nominee percentages and cash entitlements must be managed on official portals."
    >
      <OfficialPortalActions institution="ssf" />
      <PensionGlassPanel className="p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-xl border border-teal-500/25 bg-teal-500/10 text-teal-700 dark:text-teal-200">
            <Users size={18} />
          </span>
          <div>
            <PensionSectionLabel>Dependents</PensionSectionLabel>
            <PensionHeading>Official family protection notes</PensionHeading>
          </div>
        </div>
        <ul className="flex flex-col gap-3">
          {[...rules, ...govFamily].map((rule) => (
            <li key={rule.id}>
              <PensionSoftRow>
                <p className="text-sm font-black text-slate-900 dark:text-white">{rule.title}</p>
                <p className="mt-1 text-xs font-semibold text-slate-600 dark:text-zinc-400">{rule.summary}</p>
                {rule.status === "pending_verification" ? (
                  <p className="mt-2 text-[11px] font-bold text-amber-700 dark:text-amber-300">
                    Official policy information unavailable for verification.
                  </p>
                ) : null}
                <a
                  href={rule.officialSourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex text-[11px] font-black text-teal-700 dark:text-teal-300"
                >
                  Official source ↗
                </a>
              </PensionSoftRow>
            </li>
          ))}
        </ul>
        <PensionBody className="mt-4 text-xs">
          Update nominees and dependent records only through the official SSF / EPF contributor portals — FireNepal does
          not store government portal credentials.
        </PensionBody>
      </PensionGlassPanel>
    </PensionChrome>
  );
}
