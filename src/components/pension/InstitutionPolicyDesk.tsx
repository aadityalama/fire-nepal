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
  light,
  overview,
}: {
  institution: PensionInstitutionId;
  light?: boolean;
  overview: string;
}) {
  const asOf = todayIsoDate();
  const rules = listActiveRulesForInstitution(PENSION_POLICY_CATALOG, institution, asOf);
  const glass = light ? "ring-1 ring-slate-900/[0.04]" : "";

  return (
    <div className="flex flex-col gap-4">
      <section className={`wealth-glass p-4 sm:p-5 ${glass}`}>
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-teal-700 dark:text-teal-300">Overview</p>
        <h2 className="mt-1 text-lg font-black text-slate-900 dark:text-white">{INSTITUTION_LABELS[institution]}</h2>
        <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-600 dark:text-zinc-400">{overview}</p>
        <p className="mt-3 text-[11px] font-bold text-slate-500 dark:text-zinc-500">
          Policy-driven desk · as of {asOf} · unverified rates are never auto-applied
        </p>
      </section>

      <OfficialPortalActions institution={institution} light={light} />

      <section className={`wealth-glass p-4 sm:p-5 ${glass}`}>
        <div className="mb-3 flex items-center gap-2">
          <BookOpen size={18} className="text-teal-600 dark:text-teal-300" />
          <h2 className="text-lg font-black text-slate-900 dark:text-white">Official policy rules</h2>
        </div>
        {rules.length === 0 ? (
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
            Official policy information unavailable for verification.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {rules.map((rule) => (
              <PolicyRuleRow key={rule.id} rule={rule} light={light} />
            ))}
          </ul>
        )}
      </section>

      <section className={`wealth-glass p-4 sm:p-5 ${glass}`}>
        <h2 className="text-sm font-black uppercase tracking-[0.14em] text-slate-500 dark:text-zinc-400">Planning modules</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {MODULE_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full border border-teal-500/25 bg-teal-500/10 px-3 py-2 text-[11px] font-black text-teal-950 hover:bg-teal-500/15 dark:text-teal-50"
            >
              {item.label} →
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function PolicyRuleRow({ rule, light }: { rule: PensionPolicyRule; light?: boolean }) {
  const pending = rule.status === "pending_verification";
  return (
    <li
      className={`rounded-xl border px-3 py-3 ${
        light ? "border-slate-200/80 bg-white/70" : "border-white/10 bg-white/[0.03]"
      }`}
    >
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
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-zinc-500">
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
    </li>
  );
}

function StatusPill({ status }: { status: PensionPolicyRule["status"] }) {
  if (status === "active") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-800 dark:text-emerald-200">
        <CheckCircle2 size={11} /> Active
      </span>
    );
  }
  if (status === "pending_verification") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-black uppercase text-amber-900 dark:text-amber-200">
        <Clock size={11} /> Pending verification
      </span>
    );
  }
  return (
    <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-black uppercase text-zinc-400">
      {status}
    </span>
  );
}
