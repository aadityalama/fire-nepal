"use client";

import { useMemo, useState } from "react";
import { BookOpen } from "lucide-react";
import { useFireTheme } from "@/contexts/FireThemeContext";
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
import { formatMoney } from "@/lib/expense-utils";

const INSTITUTIONS: PensionInstitutionId[] = ["government_pension", "epf", "ssf", "cit"];

export function SsfPensionProjectionPage() {
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const glass = light ? "ring-1 ring-slate-900/[0.04]" : "";

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
      <OfficialPortalActions institution={institution} light={light} />

      <div className="grid gap-4 lg:grid-cols-2">
        <section className={`wealth-glass space-y-3 p-4 sm:p-5 ${glass}`}>
          <h2 className="text-sm font-black uppercase tracking-[0.14em] text-slate-500 dark:text-zinc-400">Your inputs</h2>
          <label className="block text-xs font-bold text-slate-600 dark:text-zinc-400">
            Institution / scheme
            <select
              className="mt-1 w-full rounded-xl border border-slate-200/90 bg-white/90 px-3 py-2 text-sm font-black text-slate-900 dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
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
                className="mt-1 w-full rounded-xl border border-slate-200/90 bg-white/90 px-3 py-2 text-sm font-black text-slate-900 dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
                value={value}
                min={min}
                max={max}
                step={step}
                onChange={(e) => setter(Math.round(Number(e.target.value) || 0))}
              />
            </label>
          ))}
        </section>

        <section className={`wealth-glass space-y-3 p-4 sm:p-5 ${glass}`}>
          <h2 className="text-sm font-black uppercase tracking-[0.14em] text-slate-500 dark:text-zinc-400">Policy result</h2>
          {result.unavailableMessage ? (
            <p className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-3 text-sm font-bold text-amber-950 dark:text-amber-100">
              {result.unavailableMessage}
            </p>
          ) : (
            <>
              <p className="text-sm font-semibold leading-relaxed text-slate-700 dark:text-zinc-300">{result.narrative}</p>
              <div className="grid grid-cols-2 gap-2">
                <Metric label="Employee rate" value={result.monthlyEmployeeRatePct == null ? "—" : `${result.monthlyEmployeeRatePct}%`} />
                <Metric label="Employer / Gov rate" value={result.monthlyEmployerRatePct == null ? "—" : `${result.monthlyEmployerRatePct}%`} />
                <Metric
                  label="Projected contributions"
                  value={result.projectedBalanceNpr == null ? "—" : formatMoney(result.projectedBalanceNpr, "NPR")}
                />
                <Metric label="Years to retirement" value={String(result.yearsToRetirement)} />
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
        </section>
      </div>

      <section className={`wealth-glass p-4 sm:p-5 ${glass}`}>
        <div className="mb-3 flex items-center gap-2">
          <BookOpen size={18} className="text-teal-600 dark:text-teal-300" />
          <h2 className="text-lg font-black text-slate-900 dark:text-white">Applicable policy notes</h2>
        </div>
        <ul className="space-y-2">
          {benefitRules.map((rule) => (
            <li key={rule.id} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-zinc-400">
              <span className="font-black text-slate-900 dark:text-white">{rule.title}</span> — {rule.summary}{" "}
              <a href={rule.officialSourceUrl} target="_blank" rel="noopener noreferrer" className="text-teal-700 dark:text-teal-300">
                Source ↗
              </a>
            </li>
          ))}
        </ul>
      </section>
    </PensionChrome>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
      <p className="text-[10px] font-black uppercase tracking-wide text-teal-700 dark:text-teal-300">{label}</p>
      <p className="mt-1 text-sm font-black text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}
