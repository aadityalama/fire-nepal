"use client";

import { useMemo, useState } from "react";
import {
  computePolicyDrivenProjection,
  INSTITUTION_LABELS,
  listActiveRulesForInstitution,
  PENSION_POLICY_CATALOG,
  todayIsoDate,
  type PensionInstitutionId,
} from "@/lib/pension-policy";
import { PensionChrome } from "@/components/pension/PensionChrome";
import { OfficialPortalActions } from "@/components/pension/OfficialPortalActions";
import {
  PcCopy,
  PcEyebrow,
  PcSurface,
  PcTitle,
  PolicyNoteCard,
  ProjectionViz,
  SummaryStat,
} from "@/components/pension/PensionUi";

const INSTITUTIONS: PensionInstitutionId[] = ["government_pension", "epf", "ssf", "cit"];

const fieldClass =
  "mt-1.5 w-full rounded-xl border border-white/10 bg-[#080d13] px-3 py-2.5 text-sm font-semibold text-white outline-none focus:border-[#2dd4bf]/45 focus:ring-2 focus:ring-[#2dd4bf]/20";

const NOT_CONNECTED = { kind: "not_connected" as const };
const NOT_SYNCED = { kind: "not_synced" as const };

export function SsfPensionProjectionPage() {
  const [institution, setInstitution] = useState<PensionInstitutionId>("government_pension");
  const [age, setAge] = useState(32);
  const [salary, setSalary] = useState(80000);
  const [employeeContrib, setEmployeeContrib] = useState(0);
  const [employerContrib, setEmployerContrib] = useState(0);
  const [balance, setBalance] = useState(0);
  const [retireAge, setRetireAge] = useState(60);

  const asOf = todayIsoDate();
  const result = useMemo(
    () =>
      computePolicyDrivenProjection({
        institution,
        age,
        monthlySalaryNpr: salary,
        monthlyEmployeeContributionNpr: employeeContrib,
        monthlyEmployerContributionNpr: employerContrib,
        contributionMonths: Math.max(0, (retireAge - age) * 12),
        currentBalanceNpr: balance,
        expectedRetirementAge: retireAge,
        asOfDate: asOf,
      }),
    [institution, age, salary, employeeContrib, employerContrib, balance, retireAge, asOf],
  );

  const benefitRules = listActiveRulesForInstitution(PENSION_POLICY_CATALOG, institution, asOf).filter(
    (r) => r.ruleCategory === "retirement_benefit" || r.ruleCategory === "contribution",
  );

  const rateLabel =
    result.monthlyEmployeeRatePct != null && result.monthlyEmployerRatePct != null
      ? `Policy ${result.monthlyEmployeeRatePct}% + ${result.monthlyEmployerRatePct}%`
      : "Rate Not Verified";

  return (
    <PensionChrome
      title="Retirement Projection"
      subtitle="Policy-driven calculator — uses verified contribution rates only. Personal balances stay Not Connected unless you enter planning inputs explicitly."
    >
      <OfficialPortalActions institution={institution} />

      <PcSurface className="p-4 sm:p-5">
        <PcEyebrow>Visualization</PcEyebrow>
        <PcTitle as="h2">Readiness arc</PcTitle>
        <div className="mt-4">
          <ProjectionViz yearsLabel={`${result.yearsToRetirement} yrs`} rateLabel={rateLabel} />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <SummaryStat label="Synced balance" field={NOT_CONNECTED} hint="Portal sync offline" />
          <SummaryStat label="Monthly from portal" field={NOT_SYNCED} hint="Use inputs below for desk model" />
          <SummaryStat
            label="Employee rate"
            field={
              result.monthlyEmployeeRatePct == null
                ? NOT_SYNCED
                : { kind: "connected", value: `${result.monthlyEmployeeRatePct}%` }
            }
            hint="Verified policy only"
          />
          <SummaryStat
            label="Employer / Gov rate"
            field={
              result.monthlyEmployerRatePct == null
                ? NOT_SYNCED
                : { kind: "connected", value: `${result.monthlyEmployerRatePct}%` }
            }
            hint="Verified policy only"
          />
        </div>
      </PcSurface>

      <div className="grid gap-4 lg:grid-cols-2">
        <PcSurface className="space-y-3.5 p-4 sm:p-5">
          <PcEyebrow>Planning inputs</PcEyebrow>
          <PcTitle as="h2">Desk model</PcTitle>
          <PcCopy className="text-xs">
            Inputs are local planning assumptions — not imported official balances. Leave contribution fields at 0 to use
            verified policy percentages when available.
          </PcCopy>
          <label className="block text-xs font-bold text-[#8b9aab]">
            Institution / scheme
            <select
              className={fieldClass}
              value={institution}
              onChange={(e) => setInstitution(e.target.value as PensionInstitutionId)}
            >
              {INSTITUTIONS.map((id) => (
                <option key={id} value={id}>
                  {INSTITUTION_LABELS[id]}
                </option>
              ))}
            </select>
          </label>
          {(
            [
              ["Current age", age, setAge, 18, 70, 1],
              ["Monthly salary (NPR)", salary, setSalary, 0, 5_000_000, 1000],
              ["Employee contribution / mo (0 = use policy %)", employeeContrib, setEmployeeContrib, 0, 500_000, 500],
              ["Employer contribution / mo (0 = use policy %)", employerContrib, setEmployerContrib, 0, 500_000, 500],
              ["Current accumulated balance (NPR)", balance, setBalance, 0, 50_000_000, 1000],
              ["Expected retirement age", retireAge, setRetireAge, 45, 70, 1],
            ] as const
          ).map(([label, value, setter, min, max, step]) => (
            <label key={label} className="block text-xs font-bold text-[#8b9aab]">
              {label}
              <input
                type="number"
                className={fieldClass}
                value={value}
                min={min}
                max={max}
                step={step}
                onChange={(e) => setter(Math.round(Number(e.target.value) || 0))}
              />
            </label>
          ))}
        </PcSurface>

        <PcSurface className="space-y-3 p-4 sm:p-5">
          <PcEyebrow>Policy result</PcEyebrow>
          <PcTitle as="h2">Verified projection</PcTitle>
          {result.unavailableMessage ? (
            <p className="rounded-2xl border border-amber-400/30 bg-amber-500/10 px-3.5 py-3 text-sm font-semibold text-amber-50">
              {result.unavailableMessage}
            </p>
          ) : (
            <>
              <PcCopy>{result.narrative}</PcCopy>
              <div className="rounded-2xl border border-white/[0.07] bg-[#080d13] px-3.5 py-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#6b7c8f]">
                  Projected stacked contributions
                </p>
                <p className="mt-1 text-lg font-semibold text-white">
                  {result.projectedBalanceNpr == null
                    ? "Not available"
                    : new Intl.NumberFormat("en-NP", {
                        style: "currency",
                        currency: "NPR",
                        maximumFractionDigits: 0,
                      }).format(result.projectedBalanceNpr)}
                </p>
                <p className="mt-1 text-[11px] text-[#6b7c8f]">
                  Desk model from verified rates + your inputs — not a synced portal balance.
                </p>
              </div>
              <p className="text-[11px] font-semibold text-amber-100/90">
                Monthly pension conversion: Official policy information unavailable for verification.
              </p>
            </>
          )}
          {result.warnings.map((w) => (
            <p key={w} className="text-[11px] text-[#6b7c8f]">
              {w}
            </p>
          ))}
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#5f6f80]">
            Policy versions: {result.policyVersionIds.join(", ") || "none"} · as of {result.asOfDate}
          </p>
        </PcSurface>
      </div>

      <PcSurface className="p-4 sm:p-5">
        <PcEyebrow>Policy notes</PcEyebrow>
        <PcTitle as="h2">Applicable rules</PcTitle>
        <ul className="mt-3 space-y-2.5">
          {benefitRules.map((rule) => (
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
