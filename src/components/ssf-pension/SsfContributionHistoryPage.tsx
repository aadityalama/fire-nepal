"use client";

import { PensionChrome } from "@/components/pension/PensionChrome";
import { OfficialPortalActions } from "@/components/pension/OfficialPortalActions";
import {
  PcCopy,
  PcEyebrow,
  PcSurface,
  PcTitle,
  SummaryStat,
  TimelineItem,
} from "@/components/pension/PensionUi";

const NOT_SYNCED = { kind: "not_synced" as const };

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

      <PcSurface className="p-4 sm:p-5">
        <PcEyebrow>Ledger snapshot</PcEyebrow>
        <PcTitle as="h2">Imported statements</PcTitle>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <SummaryStat label="Paid months" field={NOT_SYNCED} />
          <SummaryStat label="Employer share" field={NOT_SYNCED} />
          <SummaryStat label="Employee share" field={NOT_SYNCED} />
          <SummaryStat label="Last statement" field={NOT_SYNCED} />
        </div>
      </PcSurface>

      <PcSurface className="p-4 sm:p-5">
        <PcEyebrow>Timeline</PcEyebrow>
        <PcTitle as="h2">Contribution activity</PcTitle>
        <PcCopy className="mt-2 text-xs">
          Empty until you open Official Login on SSF SOSYS or EPF iPortal and sync is available.
        </PcCopy>
        <ol className="relative mt-5 space-y-3 border-l border-white/10 ml-1.5">
          <TimelineItem
            title="Portal sync"
            meta="Status"
            body="Not Synced — no contribution months imported from official systems."
            tone="warn"
          />
          <TimelineItem
            title="SSF SOSYS ledger"
            meta="SSF"
            body="Use Official Login on SOSYS to view paid months, employer shares, and statements."
            tone="muted"
          />
          <TimelineItem
            title="EPF iPortal ledger"
            meta="EPF"
            body="Use Official Login on EPF iPortal for provident / contributory pension statements."
            tone="muted"
          />
          <TimelineItem
            title="Fabricated rows"
            meta="Blocked"
            body="FireNepal never invents contribution history amounts or dates."
            tone="ok"
          />
        </ol>
      </PcSurface>
    </PensionChrome>
  );
}
