"use client";

import { ShieldCheck } from "lucide-react";
import { listActiveRulesForInstitution, PENSION_POLICY_CATALOG, todayIsoDate } from "@/lib/pension-policy";
import { PensionChrome } from "@/components/pension/PensionChrome";
import { OfficialPortalActions } from "@/components/pension/OfficialPortalActions";
import {
  PensionBody,
  PensionGlassPanel,
  PensionHeading,
  PensionSectionLabel,
  PensionStatusPill,
} from "@/components/pension/PensionUi";

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
      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
        {benefits.map((b) => (
          <PensionGlassPanel key={b.id} hover className="flex gap-3 p-4 sm:p-5">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-teal-500/25 bg-gradient-to-br from-teal-400/20 to-emerald-500/10 text-teal-700 dark:text-teal-200">
              <ShieldCheck size={20} />
            </div>
            <div className="min-w-0">
              <PensionSectionLabel>{b.ruleCategory.replaceAll("_", " ")}</PensionSectionLabel>
              <PensionHeading as="h3">{b.title}</PensionHeading>
              <PensionBody className="mt-1 text-xs sm:text-sm">{b.summary}</PensionBody>
              <div className="mt-3">
                <PensionStatusPill tone={b.status === "active" ? "active" : "pending"}>
                  {b.status === "active" ? "policy active" : "pending verification"}
                </PensionStatusPill>
              </div>
              {b.status === "pending_verification" ? (
                <p className="mt-2 text-[11px] font-bold text-amber-700 dark:text-amber-300">
                  Official policy information unavailable for verification.
                </p>
              ) : null}
              <a
                href={b.officialSourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex text-[11px] font-black text-teal-700 dark:text-teal-300"
              >
                Official source ↗
              </a>
            </div>
          </PensionGlassPanel>
        ))}
      </div>
    </PensionChrome>
  );
}
