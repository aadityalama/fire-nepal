"use client";

import Link from "next/link";
import type { PensionInstitutionId } from "@/lib/pension-policy";
import {
  INSTITUTION_LABELS,
  listActiveRulesForInstitution,
  PENSION_POLICY_CATALOG,
  todayIsoDate,
} from "@/lib/pension-policy";
import { OfficialPortalActions } from "@/components/pension/OfficialPortalActions";
import { PENSION_BASE } from "@/lib/pension/nav";
import { buildProviderDesks } from "@/lib/pension/provider-desk";
import {
  PcCopy,
  PcEyebrow,
  PcSurface,
  PcTitle,
  PolicyNoteCard,
  StickyPortalBar,
  SummaryStat,
  SyncStatusChip,
} from "@/components/pension/PensionUi";

const MODULE_LINKS: { href: string; label: string }[] = [
  { href: `${PENSION_BASE}/retirement-projection`, label: "Retirement Projection" },
  { href: `${PENSION_BASE}/benefits-center`, label: "Benefits Center" },
  { href: `${PENSION_BASE}/withdrawal-planner`, label: "Withdrawals Planner" },
  { href: `${PENSION_BASE}/family-protection`, label: "Family Protection" },
  { href: `${PENSION_BASE}/contribution-history`, label: "Contribution History" },
  { href: `${PENSION_BASE}/reminder-center`, label: "Reminders" },
];

export function InstitutionPolicyDesk({
  institution,
  overview,
}: {
  institution: PensionInstitutionId;
  light?: boolean;
  overview: string;
}) {
  const asOf = todayIsoDate();
  const rules = listActiveRulesForInstitution(PENSION_POLICY_CATALOG, institution, asOf);
  const desk = buildProviderDesks().find((d) => d.id === institution)!;

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <PcSurface className="overflow-hidden p-0">
        <div className="border-b border-white/[0.06] bg-[radial-gradient(90%_120%_at_0%_0%,rgba(45,212,191,0.12),transparent_60%)] px-4 py-5 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <PcEyebrow>Provider account</PcEyebrow>
            <SyncStatusChip connected={false} />
          </div>
          <PcTitle as="h2">{INSTITUTION_LABELS[institution]}</PcTitle>
          <PcCopy className="mt-2">{overview}</PcCopy>
          <p className="mt-3 text-[11px] font-semibold text-[#6b7c8f]">
            Policy desk · as of {asOf} · {desk.activePolicyCount} active · {desk.pendingPolicyCount} pending
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-4 sm:p-5">
          <SummaryStat label="Balance" field={desk.balance} />
          <SummaryStat label="Monthly contribution" field={desk.monthlyContribution} />
          <SummaryStat label="Contribution months" field={desk.contributionMonths} />
          <SummaryStat label="Last contribution" field={desk.lastContribution} />
        </div>
        {desk.verifiedPolicyRateLabel ? (
          <p className="border-t border-white/[0.06] px-4 py-3 text-xs font-semibold text-[#9aa8b8] sm:px-5">
            Verified official rate · <span className="text-[#7dd3c0]">{desk.verifiedPolicyRateLabel}</span> (not a personal
            balance)
          </p>
        ) : (
          <p className="border-t border-white/[0.06] px-4 py-3 text-xs font-semibold text-amber-100/90 sm:px-5">
            Contribution percentages pending official verification — calculator will not invent rates.
          </p>
        )}
      </PcSurface>

      <StickyPortalBar payHref={desk.payHref} loginHref={desk.loginHref} />
      <OfficialPortalActions institution={institution} />

      <PcSurface className="p-4 sm:p-5">
        <PcEyebrow>Official policy</PcEyebrow>
        <PcTitle as="h2">Versioned rules</PcTitle>
        {rules.length === 0 ? (
          <p className="mt-3 text-sm font-semibold text-amber-100">
            Official policy information unavailable for verification.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2.5">
            {rules.map((rule) => (
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
        )}
      </PcSurface>

      <PcSurface className="p-4 sm:p-5">
        <PcEyebrow>Continue planning</PcEyebrow>
        <div className="mt-3 flex flex-wrap gap-2">
          {MODULE_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-2 text-[11px] font-bold text-[#c5d0db] hover:border-[#2dd4bf]/35 hover:text-white"
            >
              {item.label} →
            </Link>
          ))}
        </div>
      </PcSurface>
    </div>
  );
}
