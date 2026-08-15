"use client";

import { PensionChrome } from "@/components/pension/PensionChrome";
import { OfficialPortalActions } from "@/components/pension/OfficialPortalActions";
import {
  PensionBody,
  PensionGlassPanel,
  PensionHeading,
  PensionSectionLabel,
} from "@/components/pension/PensionUi";

export function SsfContributionHistoryPage() {
  return (
    <PensionChrome
      title="Contribution History"
      subtitle="Official contribution ledgers live on institutional portals. FireNepal does not invent historical contribution rows."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <OfficialPortalActions institution="ssf" />
        <OfficialPortalActions institution="epf" />
      </div>
      <PensionGlassPanel className="p-4 sm:p-5">
        <PensionSectionLabel>Ledger source of truth</PensionSectionLabel>
        <PensionHeading>View paid months on official portals</PensionHeading>
        <PensionBody className="mt-2">
          Official policy information unavailable for verification for imported contribution history. Use{" "}
          <strong className="text-slate-900 dark:text-white">Official Login</strong> on SSF SOSYS or EPF iPortal to view
          paid months, employer shares, and statements.
        </PensionBody>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            { label: "Paid months", value: "Portal" },
            { label: "Employer share", value: "Portal" },
            { label: "Statements", value: "Portal" },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-teal-500/20 bg-teal-500/[0.07] px-3.5 py-3 text-center"
            >
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-teal-700 dark:text-teal-300">
                {item.label}
              </p>
              <p className="mt-1 text-sm font-black text-slate-900 dark:text-white">{item.value}</p>
            </div>
          ))}
        </div>
      </PensionGlassPanel>
    </PensionChrome>
  );
}
