"use client";

import { listActiveRulesForInstitution, PENSION_POLICY_CATALOG, todayIsoDate } from "@/lib/pension-policy";
import { PensionChrome } from "@/components/pension/PensionChrome";
import { OfficialPortalActions } from "@/components/pension/OfficialPortalActions";
import { PcEyebrow, PcSurface, PcTitle, PolicyNoteCard } from "@/components/pension/PensionUi";

export function SsfClaimBenefitsPage() {
  const asOf = todayIsoDate();
  const benefits = listActiveRulesForInstitution(PENSION_POLICY_CATALOG, "ssf", asOf).filter((r) =>
    ["medical", "maternity", "accident_disability", "family_protection", "retirement_benefit"].includes(r.ruleCategory),
  );

  return (
    <PensionChrome
      title="Benefits Center"
      subtitle="SSF benefit categories from the official policy layer. Claim eligibility and amounts must be confirmed on the official SSF portal."
    >
      <OfficialPortalActions institution="ssf" />
      <PcSurface className="p-4 sm:p-5">
        <PcEyebrow>SSF schemes</PcEyebrow>
        <PcTitle as="h2">Benefit catalog</PcTitle>
        <p className="mt-2 text-xs text-[#8b9aab]">
          Personal claim amounts remain Not Synced until confirmed on the official portal.
        </p>
        <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
          {benefits.map((b) => (
            <li key={b.id}>
              <PolicyNoteCard
                title={b.title}
                summary={b.summary}
                status={b.status}
                sourceUrl={b.officialSourceUrl}
              />
            </li>
          ))}
        </ul>
      </PcSurface>
    </PensionChrome>
  );
}
