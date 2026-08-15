"use client";

import { useMemo, useState } from "react";
import { BookOpen } from "lucide-react";
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
  PensionBody,
  PensionGlassPanel,
  PensionHeading,
  PensionSectionLabel,
  PensionSoftRow,
} from "@/components/pension/PensionUi";
import { formatMoney } from "@/lib/expense-utils";

function ResultMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-teal-500/20 bg-teal-500/[0.07] px-3 py-2.5">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-teal-700 dark:text-teal-300">{label}</p>
      <p className="mt-1 truncate text-sm font-black text-slate-900 dark:text-white sm:text-base">{value}</p>
    </div>
  );
}

const INSTITUTIONS: PensionInstitutionId[] = ["government_pension", "epf", "ssf", "cit"];

const fieldClass =
  "mt-1.5 w-full rounded-xl border border-slate-200/90 bg-white/90 px-3 py-2.5 text-sm font-black text-slate-900 outline-none transition focus:border-teal-400/50 focus:ring-2 focus:ring-teal-400/25 dark:border-white/10 dark:bg-white/[0.06] dark:text-white";

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

  return (
    <PensionChrome
      title="Retirement Projection"
      subtitle="Policy-driven calculator — uses verified contribution rates from the official policy layer. Never invents interest or pension conversion factors."
    >
      <OfficialPortalActions institution={institution} />

      <div className="grid gap-4 lg:grid-cols-2">
        <PensionGlassPanel className="space-y-3.5 p-4 sm:p-5">
          <div>
            <PensionSectionLabel>Your inputs</PensionSectionLabel>
            <PensionHeading>Projection desk</PensionHeading>
          </div>
          <label className="block text-xs font-bold text-slate-600 dark:text-zinc-400">
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
            <label key={label} className="block text-xs font-bold text-slate-600 dark:text-zinc-400">
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
        </PensionGlassPanel>

        <PensionGlassPanel className="space-y-4 p-4 sm:p-5">
          <div>
            <PensionSectionLabel>Policy result</PensionSectionLabel>
            <PensionHeading>Verified projection</PensionHeading>
          </div>
          {result.unavailableMessage ? (
            <p className="rounded-2xl border border-amber-400/30 bg-amber-500/10 px-3.5 py-3 text-sm font-bold text-amber-950 dark:text-amber-100">
              {result.unavailableMessage}
            </p>
          ) : (
            <>
              <PensionBody>{result.narrative}</PensionBody>
              <div className="grid grid-cols-2 gap-2.5">
                <ResultMetric
                  label="Employee rate"
                  value={result.monthlyEmployeeRatePct == null ? "—" : `${result.monthlyEmployeeRatePct}%`}
                />
                <ResultMetric
                  label="Employer / Gov rate"
                  value={result.monthlyEmployerRatePct == null ? "—" : `${result.monthlyEmployerRatePct}%`}
                />
                <ResultMetric
                  label="Projected contributions"
                  value={result.projectedBalanceNpr == null ? "—" : formatMoney(result.projectedBalanceNpr, "NPR")}
                />
                <ResultMetric label="Years to retirement" value={String(result.yearsToRetirement)} />
              </div>
              <p className="text-[11px] font-bold text-slate-500 dark:text-zinc-500">
                Monthly pension conversion: Official policy information unavailable for verification.
              </p>
            </>
          )}
          {result.warnings.map((w) => (
            <p key={w} className="text-[11px] font-semibold text-slate-500 dark:text-zinc-500">
              {w}
            </p>
          ))}
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
            Policy versions: {result.policyVersionIds.join(", ") || "none"} · as of {result.asOfDate}
          </p>
        </PensionGlassPanel>
      </div>

      <PensionGlassPanel className="p-4 sm:p-5">
        <div className="mb-3 flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-xl border border-teal-500/25 bg-teal-500/10 text-teal-700 dark:text-teal-200">
            <BookOpen size={18} />
          </span>
          <div>
            <PensionSectionLabel>Policy notes</PensionSectionLabel>
            <PensionHeading>Applicable policy notes</PensionHeading>
          </div>
        </div>
        <ul className="space-y-2.5">
          {benefitRules.map((rule) => (
            <li key={rule.id}>
              <PensionSoftRow>
                <span className="font-black text-slate-900 dark:text-white">{rule.title}</span>
                <span className="mt-1 block text-xs font-semibold text-slate-600 dark:text-zinc-400">
                  {rule.summary}{" "}
                  <a
                    href={rule.officialSourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-teal-700 dark:text-teal-300"
                  >
                    Source ↗
                  </a>
                </span>
              </PensionSoftRow>
            </li>
          ))}
        </ul>
      </PensionGlassPanel>
    </PensionChrome>
  );
}
