"use client";

import Link from "next/link";
import { AlertTriangle, BookOpen, CheckCircle2, Clock } from "lucide-react";
import type { PensionInstitutionId, PensionPolicyRule } from "@/lib/pension-policy";
import {
  INSTITUTION_LABELS,
  listActiveRulesForInstitution,
  PENSION_POLICY_CATALOG,
  todayIsoDate,
} from "@/lib/pension-policy";
import { OfficialPortalActions } from "@/components/pension/OfficialPortalActions";
import { PENSION_BASE } from "@/lib/pension/nav";
import {
  PensionBody,
  PensionGlassPanel,
  PensionHeading,
  PensionSectionLabel,
  PensionSoftRow,
  PensionStatusPill,
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

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <PensionGlassPanel className="p-4 sm:p-5">
        <PensionSectionLabel>Overview</PensionSectionLabel>
        <PensionHeading>{INSTITUTION_LABELS[institution]}</PensionHeading>
        <PensionBody className="mt-2">{overview}</PensionBody>
        <p className="mt-3 text-[11px] font-bold text-slate-500 dark:text-zinc-500">
          Policy-driven desk · as of {asOf} · unverified rates are never auto-applied
        </p>
      </PensionGlassPanel>

      <OfficialPortalActions institution={institution} />

      <PensionGlassPanel className="p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-xl border border-teal-500/25 bg-teal-500/10 text-teal-700 dark:text-teal-200">
            <BookOpen size={18} />
          </span>
          <div>
            <PensionSectionLabel>Policy layer</PensionSectionLabel>
            <PensionHeading>Official policy rules</PensionHeading>
          </div>
        </div>
        {rules.length === 0 ? (
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
            Official policy information unavailable for verification.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {rules.map((rule) => (
              <PolicyRuleRow key={rule.id} rule={rule} />
            ))}
          </ul>
        )}
      </PensionGlassPanel>

      <PensionGlassPanel className="p-4 sm:p-5">
        <PensionSectionLabel>Planning modules</PensionSectionLabel>
        <div className="mt-3 flex flex-wrap gap-2">
          {MODULE_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full border border-teal-500/25 bg-teal-500/10 px-3.5 py-2 text-[11px] font-black text-teal-950 transition hover:bg-teal-500/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/40 dark:text-teal-50"
            >
              {item.label} →
            </Link>
          ))}
        </div>
      </PensionGlassPanel>
    </div>
  );
}

function PolicyRuleRow({ rule }: { rule: PensionPolicyRule }) {
  const pending = rule.status === "pending_verification";
  return (
    <li>
      <PensionSoftRow>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-black text-slate-900 dark:text-white">{rule.title}</p>
            <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-600 dark:text-zinc-400">{rule.summary}</p>
            {pending ? (
              <p className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-300">
                <AlertTriangle size={12} /> Official policy information unavailable for verification.
              </p>
            ) : null}
            {rule.notes ? <p className="mt-1 text-[11px] font-semibold text-slate-500 dark:text-zinc-500">{rule.notes}</p> : null}
          </div>
          <StatusPill status={rule.status} />
        </div>
        <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-zinc-500">
          <span>{rule.ruleCategory.replaceAll("_", " ")}</span>
          <span>v{rule.version}</span>
          <span>Effective {rule.effectiveDate}</span>
          <span>Verified {rule.lastVerifiedDate}</span>
          <a
            href={rule.officialSourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-teal-700 underline-offset-2 hover:underline dark:text-teal-300"
          >
            Official source ↗
          </a>
        </div>
      </PensionSoftRow>
    </li>
  );
}

function StatusPill({ status }: { status: PensionPolicyRule["status"] }) {
  if (status === "active") {
    return (
      <PensionStatusPill tone="active">
        <CheckCircle2 size={11} /> Active
      </PensionStatusPill>
    );
  }
  if (status === "pending_verification") {
    return (
      <PensionStatusPill tone="pending">
        <Clock size={11} /> Pending verification
      </PensionStatusPill>
    );
  }
  return <PensionStatusPill tone="neutral">{status}</PensionStatusPill>;
}
