"use client";

import {
  Bell,
  History,
  LineChart,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";
import { PENSION_BASE } from "@/lib/pension/nav";
import { buildProviderDesks } from "@/lib/pension/provider-desk";
import { PensionChrome } from "@/components/pension/PensionChrome";
import {
  ModuleRow,
  PcCopy,
  PcEyebrow,
  PcSurface,
  PcTitle,
  ProjectionViz,
  ProviderAccountCard,
  SummaryStat,
} from "@/components/pension/PensionUi";

const NOT_CONNECTED = { kind: "not_connected" as const };
const NOT_SYNCED = { kind: "not_synced" as const };

export function PensionOverviewPage() {
  const desks = buildProviderDesks();
  const verifiedRateCount = desks.filter((d) => d.verifiedPolicyRateLabel).length;

  return (
    <PensionChrome
      title="Your Pension"
      subtitle="Mobile-first Nepal pension desk for SSF, EPF, CIT, and Government Pension — official portals only, policy-verified rates, zero invented balances."
    >
      <PcSurface className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <PcEyebrow>Ledger summary</PcEyebrow>
          <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-100">
            Sync offline
          </span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <SummaryStat label="Total balance" field={NOT_CONNECTED} hint="Official sync required" />
          <SummaryStat label="Monthly contribution" field={NOT_SYNCED} hint="From employer / portal" />
          <SummaryStat label="Contribution months" field={NOT_SYNCED} hint="Ledger not imported" />
          <SummaryStat label="Last contribution" field={NOT_SYNCED} hint="No statement linked" />
        </div>
      </PcSurface>

      <section>
        <div className="mb-3 flex items-end justify-between gap-3 px-0.5">
          <div>
            <PcEyebrow>Providers</PcEyebrow>
            <PcTitle as="h2">Accounts</PcTitle>
          </div>
          <p className="text-[11px] font-semibold text-[#6b7c8f]">{verifiedRateCount}/4 rates verified</p>
        </div>
        <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2 no-scrollbar">
          {desks.map((desk) => (
            <ProviderAccountCard key={desk.id} desk={desk} />
          ))}
        </div>
      </section>

      <PcSurface className="p-4 sm:p-5">
        <PcEyebrow>Retirement projection</PcEyebrow>
        <PcTitle as="h2">Planning visual</PcTitle>
        <div className="mt-4">
          <ProjectionViz yearsLabel="Not Synced" rateLabel="Use verified policy %" />
        </div>
        <div className="mt-4">
          <ModuleRow
            href={`${PENSION_BASE}/retirement-projection`}
            title="Open projection desk"
            body="Policy-driven calculator — no invented annuity factors"
            icon={LineChart}
          />
        </div>
      </PcSurface>

      <section className="space-y-2">
        <PcEyebrow>Workspace</PcEyebrow>
        <PcTitle as="h2">Tools</PcTitle>
        <div className="mt-3 space-y-2">
          <ModuleRow
            href={`${PENSION_BASE}/contribution-history`}
            title="Contribution History"
            body="Timeline · Not Synced until official ledger import"
            icon={History}
          />
          <ModuleRow
            href={`${PENSION_BASE}/benefits-center`}
            title="Benefits Center"
            body="SSF schemes from the verified policy layer"
            icon={ShieldCheck}
          />
          <ModuleRow
            href={`${PENSION_BASE}/withdrawal-planner`}
            title="Withdrawal Planner"
            body="Official withdrawal / loan notes only"
            icon={Wallet}
          />
          <ModuleRow
            href={`${PENSION_BASE}/family-protection`}
            title="Family Protection"
            body="Dependent rules · nominees on official portals"
            icon={Users}
          />
          <ModuleRow
            href={`${PENSION_BASE}/reminder-center`}
            title="Reminder Center"
            body="Local prefs · Pay still on official portals"
            icon={Bell}
          />
        </div>
      </section>

      <PcSurface className="p-4 sm:p-5">
        <PcEyebrow>Integrity</PcEyebrow>
        <PcCopy className="mt-2">
          FireNepal never fabricates pension balances, contribution months, or withdrawal limits. When official sync is
          unavailable, fields show <strong className="text-amber-100">Not Connected</strong> or{" "}
          <strong className="text-amber-100">Not Synced</strong>. Pay and login always open verified government portals —
          passwords and OTPs are never collected here.
        </PcCopy>
      </PcSurface>
    </PensionChrome>
  );
}
