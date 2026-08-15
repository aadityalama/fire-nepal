"use client";

import { listActiveRulesForInstitution, PENSION_POLICY_CATALOG, todayIsoDate } from "@/lib/pension-policy";
import { PensionChrome } from "@/components/pension/PensionChrome";
import { OfficialPortalActions } from "@/components/pension/OfficialPortalActions";
import { PcCopy, PcEyebrow, PcSurface, PcTitle, PolicyNoteCard } from "@/components/pension/PensionUi";

export function WithdrawalPlannerPage() {
  const asOf = todayIsoDate();
  const rules = ["ssf", "epf", "cit", "government_pension"] as const;
  const withdrawals = rules.flatMap((institution) =>
    listActiveRulesForInstitution(PENSION_POLICY_CATALOG, institution, asOf).filter(
      (r) => r.ruleCategory === "withdrawal" || r.ruleCategory === "loan",
    ),
  );

  return (
    <PensionChrome
      title="Withdrawal Planner"
      subtitle="Official withdrawal and loan policy notes only. Numeric personal limits stay Not Synced until verified on the portal."
    >
      <OfficialPortalActions institution="epf" />
      <PcSurface className="p-4 sm:p-5">
        <PcEyebrow>Policy notes</PcEyebrow>
        <PcTitle as="h2">Withdrawals & loans</PcTitle>
        <PcCopy className="mt-2 text-xs">
          Complete any withdrawal request on the official portal. FireNepal does not invent eligible amounts.
        </PcCopy>
        <ul className="mt-4 flex flex-col gap-2.5">
          {withdrawals.map((rule) => (
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
