"use client";

import { listActiveRulesForInstitution, PENSION_POLICY_CATALOG, todayIsoDate } from "@/lib/pension-policy";
import { PensionChrome } from "@/components/pension/PensionChrome";
import { OfficialPortalActions } from "@/components/pension/OfficialPortalActions";
import { PcCopy, PcEyebrow, PcSurface, PcTitle, PolicyNoteCard } from "@/components/pension/PensionUi";

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
      subtitle="Dependent / family protection rules from the official policy layer. Nominee percentages must be managed on official portals."
    >
      <OfficialPortalActions institution="ssf" />
      <PcSurface className="p-4 sm:p-5">
        <PcEyebrow>Dependents</PcEyebrow>
        <PcTitle as="h2">Official family notes</PcTitle>
        <PcCopy className="mt-2 text-xs">
          Nominee cash entitlements stay Not Synced here — update records only through official SSF / EPF portals.
        </PcCopy>
        <ul className="mt-4 flex flex-col gap-2.5">
          {[...rules, ...govFamily].map((rule) => (
            <li key={rule.id}>
              <PolicyNoteCard
                title={rule.title}
                summary={rule.summary}
                status={rule.status}
                sourceUrl={rule.officialSourceUrl}
              />
            </li>
          ))}
        </ul>
      </PcSurface>
    </PensionChrome>
  );
}
