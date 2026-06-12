"use client";

import type { LucideIcon } from "lucide-react";
import {
  Building2,
  CalendarClock,
  Coins,
  Heart,
  Home,
  LineChart,
  Scale,
  Shield,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { formatKrwInteger, formatNprInteger } from "@/components/savings-tracker/savings-currency";
import { ReturnToNepalCharts } from "@/components/return-to-nepal/ReturnToNepalCharts";
import { ReturnToNepalChrome } from "@/components/return-to-nepal/ReturnToNepalChrome";
import { ReturnPlannerNumericInput } from "@/components/return-to-nepal/ReturnPlannerNumericInput";
import { WealthDashboardShell } from "@/components/portfolio/WealthDashboardShell";
import { useReturnToNepalPlanner } from "@/contexts/ReturnToNepalContext";
import { useFireTheme } from "@/contexts/FireThemeContext";
import {
  budgetOverrunRisk,
  computeAutoNationalPensionMaturityKrw,
  computeAutoSeveranceKrw,
  computeNepalMonthlyCol,
  phaseCompletionRatio,
} from "@/lib/return-to-nepal/planner-engine";
import {
  CONSTRUCTION_PHASES,
  LIFESTYLE_LABELS,
  NEPAL_CITY_LABELS,
  SETTLEMENT_CHECKLIST_ITEMS,
  type LifestyleMode,
  type NepalCityId,
} from "@/lib/return-to-nepal/types";

function daysToYearEnd(year: number): number {
  const end = new Date(year, 11, 31, 23, 59, 59);
  const now = new Date();
  return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86_400_000));
}

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-teal-800 dark:text-[#4FFFD1]">{label}</span>
      {children}
      {hint ? <span className="text-[11px] font-semibold text-slate-600 dark:text-[rgba(255,255,255,0.72)]">{hint}</span> : null}
    </label>
  );
}

function AutoCalculateToggleGroup({
  autoOn,
  onAutoOnChange,
  light,
  labelledById,
}: {
  autoOn: boolean;
  onAutoOnChange: (next: boolean) => void;
  light: boolean;
  labelledById: string;
}) {
  const pill = (pressed: boolean) =>
    `min-h-[40px] rounded-lg px-3.5 py-2 text-[11px] font-black uppercase tracking-wide transition ${
      pressed
        ? "bg-teal-600 text-white shadow-sm ring-1 ring-teal-500/40"
        : light
          ? "text-slate-600 hover:bg-slate-100/90"
          : "text-[rgba(255,255,255,0.85)] hover:bg-white/[0.08]"
    }`;
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <span id={labelledById} className="text-[11px] font-bold uppercase tracking-[0.14em] text-teal-800 dark:text-[#4FFFD1]">
        Auto calculate
      </span>
      <div
        className={`inline-flex rounded-xl border p-0.5 ${light ? "border-slate-200/90 bg-slate-50/90" : "border-white/[0.14] bg-black/30"}`}
        role="group"
        aria-labelledby={labelledById}
      >
        <button type="button" className={pill(autoOn)} aria-pressed={autoOn} onClick={() => onAutoOnChange(true)}>
          On
        </button>
        <button type="button" className={pill(!autoOn)} aria-pressed={!autoOn} onClick={() => onAutoOnChange(false)}>
          Off
        </button>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, hint, light }: { label: string; value: string; hint: string; light: boolean }) {
  return (
    <div
      className={`wealth-glass flex min-h-[140px] flex-col justify-between p-4 motion-safe:transition-[transform,box-shadow] motion-safe:duration-300 sm:min-h-[152px] ${
        light
          ? "shadow-sm ring-1 ring-slate-900/[0.04]"
          : "ring-1 ring-white/[0.08] motion-safe:hover:shadow-[0_20px_50px_-22px_rgba(79,255,209,0.14)]"
      }`}
    >
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-teal-800 dark:text-[#4FFFD1] sm:text-[11px]">{label}</p>
        <p className="mt-1.5 text-[clamp(1.05rem,3.8vw,1.2rem)] font-extrabold tracking-tight text-slate-900 dark:text-white [text-shadow:0_0_28px_rgba(255,255,255,0.12)] sm:text-xl">
          {value}
        </p>
      </div>
      <p className="text-[11px] font-semibold leading-relaxed text-slate-600 dark:text-[rgba(255,255,255,0.72)] sm:text-xs">{hint}</p>
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-4 flex flex-col gap-1 sm:mb-5">
      <div className="flex items-center gap-2">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-teal-500/25 bg-teal-500/10 text-teal-700 dark:text-teal-200">
          <Icon size={18} />
        </span>
        <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white sm:text-xl">{title}</h2>
      </div>
      {subtitle ? <p className="max-w-3xl text-sm font-semibold text-slate-600 dark:text-[rgba(255,255,255,0.85)]">{subtitle}</p> : null}
    </div>
  );
}

export function ReturnToNepalPlannerDashboard() {
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const { state, snapshot, patch, reset, togglePhase, toggleSettlement } = useReturnToNepalPlanner();
  const [chartsReady, setChartsReady] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setChartsReady(true), 520);
    return () => window.clearTimeout(t);
  }, []);

  const sg = (extra = "") =>
    `wealth-glass scroll-mt-28 p-4 sm:p-5 lg:p-6 ${light ? "ring-1 ring-slate-900/[0.04] shadow-[0_16px_48px_-24px_rgba(15,23,42,0.08)]" : "ring-1 ring-white/[0.06]"} ${extra}`;

  const overrun = useMemo(() => budgetOverrunRisk(state, snapshot), [state, snapshot]);
  const phaseRatio = phaseCompletionRatio(state.completedPhases);
  const villageCol = useMemo(() => computeNepalMonthlyCol({ ...state, city: "village" }), [state]);
  const ktmCol = useMemo(() => computeNepalMonthlyCol({ ...state, city: "kathmandu" }), [state]);

  const countdownDays = daysToYearEnd(state.targetReturnYear);
  const compareMax = Math.max(snapshot.koreaImpliedMonthlySpendNpr, snapshot.monthlyNepalLivingNpr, 1);
  const koreaBarPct = (snapshot.koreaImpliedMonthlySpendNpr / compareMax) * 100;
  const nepalBarPct = (snapshot.monthlyNepalLivingNpr / compareMax) * 100;
  const runwayProgressPct = Math.min(100, (snapshot.emergencyReserveMonths / Math.max(1, state.emergencyMonthsTarget)) * 100);

  const autoSeveranceKrw = useMemo(
    () => computeAutoSeveranceKrw(state),
    [state.koreaYearsWorked, state.plannedKoreaYearsRemaining, state.monthlySalaryKrw],
  );
  const autoNationalPensionKrw = useMemo(
    () => computeAutoNationalPensionMaturityKrw(state),
    [state.koreaYearsWorked, state.plannedKoreaYearsRemaining, state.monthlySalaryKrw],
  );

  const emergencyHint =
    snapshot.emergencyStatusLabel === "elite"
      ? "Elite runway — above target months."
      : snapshot.emergencyStatusLabel === "solid"
        ? "Solid buffer vs modelled future spend."
        : snapshot.emergencyStatusLabel === "lean"
          ? "Lean — add NPR runway before exiting Korea income."
          : "Critical — build liquid safety first.";

  const familyReadinessHint =
    snapshot.familyRelocationScore >= 78
      ? "School, health, settlement checklist & budgets look coordinated."
      : snapshot.familyRelocationScore >= 55
        ? "Good direction — finish settlement checklist items."
        : "Early stage — add fees, healthcare, and checklist detail.";

  const inputClass =
    "rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-sm font-bold text-slate-900 dark:border-white/[0.14] dark:bg-white/[0.08] dark:text-white";

  return (
    <WealthDashboardShell
      brand={{ tagline: "Return OS", iconGradient: "from-teal-400 to-emerald-400" }}
      footerNote="Return to Nepal Planner — local-first workspace. Same glass patterns as Pension; not tax or legal advice."
    >
      <ReturnToNepalChrome
        title="Return to Nepal Planner"
        subtitle="Retirement readiness, Nepal cost of living, Korea vs Nepal spend, passive income, emergency runway, return timeline, family settlement, house build, and business capital — one premium glass desk."
        snapshot={snapshot}
        onReset={reset}
      >
        <section id="rtn-readiness" className={sg()}>
          <SectionTitle
            icon={Sparkles}
            title="Retirement readiness"
            subtitle="Blended score from passive income vs inflated Nepal living line, plus your return-fund progress."
          />
          <div className="mb-6 flex flex-col items-start gap-6 lg:flex-row lg:items-center">
            <div
              className="relative grid h-32 w-32 shrink-0 place-items-center rounded-full sm:h-36 sm:w-36"
              style={{
                background: `conic-gradient(rgb(13 148 136) ${snapshot.retirementReadinessPct * 3.6}deg, ${
                  light ? "rgb(226 232 240)" : "rgba(255,255,255,0.12)"
                } 0deg)`,
              }}
            >
              <div
                className={`grid h-[72%] w-[72%] place-items-center rounded-full ${light ? "bg-white" : "bg-[#041a14]"}`}
              >
                <span className="text-center text-xl font-black text-slate-900 dark:text-white sm:text-2xl">
                  {snapshot.retirementReadinessPct.toFixed(0)}
                  <span className="block text-[10px] font-bold uppercase tracking-widest text-teal-700 dark:text-[#4FFFD1]">%</span>
                </span>
              </div>
            </div>
            <p className="max-w-xl text-sm font-semibold leading-relaxed text-slate-600 dark:text-[rgba(255,255,255,0.85)]">
              {snapshot.aiHeadline} {snapshot.freedomMilestone}
            </p>
          </div>

          <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <SummaryCard
              light={light}
              label="Estimated return year"
              value={String(snapshot.estimatedReturnYear)}
              hint={`Anchor ${state.targetReturnYear} · ~${snapshot.yearsToReturn.toFixed(1)} yrs modelled`}
            />
            <SummaryCard
              light={light}
              label="Nepal return fund"
              value={formatNprInteger(snapshot.totalReturnFundNpr)}
              hint="Korea KRW + Nepal NPR (converted)"
            />
            <SummaryCard light={light} label="Passive income / mo" value={formatNprInteger(snapshot.passiveMonthlyNpr)} hint="Today’s terms" />
            <SummaryCard
              light={light}
              label="Family readiness"
              value={`${snapshot.familyRelocationScore.toFixed(0)}%`}
              hint={familyReadinessHint}
            />
            <SummaryCard
              light={light}
              label="Emergency runway"
              value={`${snapshot.emergencyReserveMonths.toFixed(1)} mo`}
              hint={emergencyHint}
            />
            <SummaryCard
              light={light}
              label="Return goal"
              value={`${snapshot.returnGoalProgressPct.toFixed(0)}%`}
              hint="House + relocation vs total fund"
            />
          </div>

          <div
            className={`mb-6 rounded-2xl border p-4 sm:p-5 ${
              light
                ? "border-teal-200/70 bg-gradient-to-br from-white/95 to-teal-50/50"
                : "border-[rgba(79,255,209,0.2)] bg-gradient-to-br from-white/[0.1] via-[rgba(6,78,59,0.32)] to-[rgba(2,18,16,0.5)]"
            }`}
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-teal-700 dark:text-[#4FFFD1]">Guidance read</p>
            <p className="mt-2 text-base font-black text-slate-900 dark:text-white sm:text-lg">{snapshot.aiSecondary}</p>
          </div>

          <ReturnToNepalCharts snapshot={snapshot} chartsReady={chartsReady} />

          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            <div className={`rounded-2xl border p-4 ${light ? "border-slate-200/90 bg-white/90" : "border-white/[0.14] bg-gradient-to-br from-white/[0.08] to-white/[0.03]"}`}>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-teal-700 dark:text-[#4FFFD1]">Return countdown</p>
              <p className="mt-2 text-3xl font-black text-slate-900 dark:text-white">{countdownDays.toLocaleString()}</p>
              <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-[rgba(255,255,255,0.85)]">days to Dec 31, {state.targetReturnYear}</p>
            </div>
            <div className={`rounded-2xl border p-4 ${light ? "border-slate-200/90 bg-white/90" : "border-white/[0.14] bg-gradient-to-br from-white/[0.08] to-white/[0.03]"}`}>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-cyan-800 dark:text-[#4FFFD1]">Stress radar</p>
              <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{snapshot.stressScore.toFixed(0)}</p>
              <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-[rgba(255,255,255,0.72)]">Gap + runway composite (lower is calmer)</p>
            </div>
            <div className={`rounded-2xl border p-4 ${light ? "border-slate-200/90 bg-white/90" : "border-white/[0.14] bg-gradient-to-br from-white/[0.08] to-white/[0.03]"}`}>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-700 dark:text-[#4FFFD1]">Emotional pulse</p>
              <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-600 dark:text-[rgba(255,255,255,0.85)]">{snapshot.emotionalLine}</p>
            </div>
          </div>
        </section>

        <section id="rtn-compare" className={sg("mt-2")}>
          <SectionTitle
            icon={Scale}
            title="Korea vs Nepal expense comparison"
            subtitle="Korea bar uses salary minus savings (spend proxy), NPR-converted. Nepal bar uses your COL model for the selected city and lifestyle."
          />
          <div className="mb-6 space-y-5">
            <div>
              <div className="mb-1 flex justify-between text-xs font-bold text-slate-600 dark:text-[rgba(255,255,255,0.85)]">
                <span>Korea implied spend / mo (NPR)</span>
                <span>{formatNprInteger(snapshot.koreaImpliedMonthlySpendNpr)}</span>
              </div>
              <div className={`h-3 overflow-hidden rounded-full ${light ? "bg-slate-200" : "bg-white/10"}`}>
                <div className="h-full rounded-full bg-gradient-to-r from-teal-600 to-emerald-500" style={{ width: `${koreaBarPct}%` }} />
              </div>
              <p className="mt-1 text-[11px] font-semibold text-slate-500 dark:text-[rgba(255,255,255,0.72)]">
                From {formatKrwInteger(state.monthlySalaryKrw)} salary − {formatKrwInteger(state.monthlySavingsKrw)} savings
              </p>
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs font-bold text-slate-600 dark:text-[rgba(255,255,255,0.85)]">
                <span>Nepal living model / mo (NPR)</span>
                <span>{formatNprInteger(snapshot.monthlyNepalLivingNpr)}</span>
              </div>
              <div className={`h-3 overflow-hidden rounded-full ${light ? "bg-slate-200" : "bg-white/10"}`}>
                <div className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-lime-400" style={{ width: `${nepalBarPct}%` }} />
              </div>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Monthly salary (KRW)">
              <ReturnPlannerNumericInput value={state.monthlySalaryKrw} min={0} onCommit={(monthlySalaryKrw) => patch({ monthlySalaryKrw })} />
            </Field>
            <Field label="Monthly savings (KRW)">
              <ReturnPlannerNumericInput value={state.monthlySavingsKrw} min={0} onCommit={(monthlySavingsKrw) => patch({ monthlySavingsKrw })} />
            </Field>
            <Field label="NPR per KRW">
              <ReturnPlannerNumericInput value={state.nprPerKrw} min={0.05} max={0.2} integer={false} onCommit={(nprPerKrw) => patch({ nprPerKrw })} />
            </Field>
          </div>
        </section>

        <section id="rtn-col" className={sg("mt-2")}>
          <SectionTitle icon={Home} title="Nepal cost of living planner" subtitle="City, lifestyle, household — with inflation lens to your target return year." />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="City">
              <select value={state.city} onChange={(e) => patch({ city: e.target.value as NepalCityId })} className={inputClass}>
                {(Object.keys(NEPAL_CITY_LABELS) as NepalCityId[]).map((c) => (
                  <option key={c} value={c}>
                    {NEPAL_CITY_LABELS[c]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Lifestyle mode">
              <select value={state.lifestyle} onChange={(e) => patch({ lifestyle: e.target.value as LifestyleMode })} className={inputClass}>
                {(Object.keys(LIFESTYLE_LABELS) as LifestyleMode[]).map((l) => (
                  <option key={l} value={l}>
                    {LIFESTYLE_LABELS[l]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Adults">
              <ReturnPlannerNumericInput value={state.adults} min={1} max={8} onCommit={(adults) => patch({ adults })} />
            </Field>
            <Field label="Children">
              <ReturnPlannerNumericInput value={state.children} min={0} max={8} onCommit={(children) => patch({ children })} />
            </Field>
            <Field label="Nepal inflation % / yr" hint="Future COL lens">
              <ReturnPlannerNumericInput value={state.nepalInflationPct} min={0} max={20} integer={false} onCommit={(nepalInflationPct) => patch({ nepalInflationPct })} />
            </Field>
            <Field label="Target return year">
              <ReturnPlannerNumericInput value={state.targetReturnYear} min={snapshot.nowYear} max={snapshot.nowYear + 40} onCommit={(targetReturnYear) => patch({ targetReturnYear })} />
            </Field>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.06] p-4 dark:bg-emerald-500/[0.08]">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-800 dark:text-[#4FFFD1]">Monthly (today)</p>
              <p className="mt-2 text-xl font-black text-slate-900 dark:text-white">{formatNprInteger(snapshot.monthlyNepalLivingNpr)}</p>
            </div>
            <div className="rounded-2xl border border-teal-500/15 bg-teal-500/[0.06] p-4 dark:bg-teal-500/[0.08]">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-teal-800 dark:text-[#4FFFD1]">At return ({state.targetReturnYear})</p>
              <p className="mt-2 text-xl font-black text-slate-900 dark:text-white">{formatNprInteger(snapshot.monthlyNepalLivingFutureNpr)}</p>
              <p className="mt-1 text-xs font-semibold text-slate-600 dark:text-[rgba(255,255,255,0.85)]">×{snapshot.inflationFactorAtReturn.toFixed(2)} factor</p>
            </div>
          </div>
          <div className={`mt-4 rounded-2xl border p-4 ${light ? "border-slate-200/90 bg-slate-50/80" : "border-white/[0.14] bg-gradient-to-br from-white/[0.07] to-white/[0.02]"}`}>
            <p className={`text-[11px] font-bold uppercase tracking-[0.14em] ${light ? "text-slate-500" : "text-[rgba(255,255,255,0.72)]"}`}>
              Village vs Kathmandu (same lifestyle)
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs font-bold text-slate-500 dark:text-[rgba(255,255,255,0.72)]">Village</p>
                <p className="text-lg font-black text-slate-900 dark:text-white">{formatNprInteger(villageCol)}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 dark:text-[rgba(255,255,255,0.72)]">Kathmandu</p>
                <p className="text-lg font-black text-slate-900 dark:text-white">{formatNprInteger(ktmCol)}</p>
              </div>
            </div>
          </div>
        </section>

        <section id="rtn-passive" className={sg("mt-2")}>
          <SectionTitle icon={Coins} title="Passive income tracker" subtitle="Pension, dividends, FD, rental, SWP — modelled stack in NPR." />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(
              [
                ["pensionMonthlyNpr", "Pension / mo"],
                ["dividendMonthlyNpr", "Dividend / mo"],
                ["fdMonthlyNpr", "FD / mo"],
                ["rentalMonthlyNpr", "Rental / mo"],
                ["swpMonthlyNpr", "SWP / mo"],
              ] as const
            ).map(([key, label]) => (
              <Field key={key} label={label}>
                <ReturnPlannerNumericInput value={state[key]} min={0} onCommit={(next) => patch({ [key]: next })} />
              </Field>
            ))}
          </div>
          <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.07] p-4 dark:bg-emerald-500/10">
            <p className="text-sm font-black text-emerald-950 dark:text-white">Passive after return ({state.targetReturnYear} money, inflated)</p>
            <p className="mt-2 text-2xl font-black text-emerald-950 dark:text-white">{formatNprInteger(snapshot.passiveMonthlyFutureNpr)}</p>
          </div>
        </section>

        <section id="rtn-runway" className={sg("mt-2")}>
          <SectionTitle icon={Shield} title="Emergency runway" subtitle="Liquid fund ÷ modelled future monthly need vs your target months." />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Emergency months target">
              <ReturnPlannerNumericInput value={state.emergencyMonthsTarget} min={1} max={36} onCommit={(emergencyMonthsTarget) => patch({ emergencyMonthsTarget })} />
            </Field>
            <Field label="Nepal liquid (NPR)">
              <ReturnPlannerNumericInput value={state.nepalLiquidNpr} min={0} onCommit={(nepalLiquidNpr) => patch({ nepalLiquidNpr })} />
            </Field>
          </div>
          <div className="mt-5">
            <div className="mb-2 flex justify-between text-xs font-bold text-slate-600 dark:text-[rgba(255,255,255,0.85)]">
              <span>Runway vs target</span>
              <span>
                {snapshot.emergencyReserveMonths.toFixed(1)} / {state.emergencyMonthsTarget} mo
              </span>
            </div>
            <div className={`h-4 overflow-hidden rounded-full ${light ? "bg-slate-200" : "bg-white/10"}`}>
              <div
                className="h-full max-w-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-400"
                style={{ width: `${runwayProgressPct}%` }}
              />
            </div>
            <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-[rgba(255,255,255,0.85)]">{emergencyHint}</p>
          </div>
        </section>

        <section id="rtn-timeline" className={sg("mt-2")}>
          <SectionTitle icon={CalendarClock} title="Return timeline" subtitle="Korea tenure, remaining years, inflation, and corpus projection inputs." />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Korea years worked" hint="Severance heuristic">
              <ReturnPlannerNumericInput value={state.koreaYearsWorked} min={0} integer={false} onCommit={(koreaYearsWorked) => patch({ koreaYearsWorked })} />
            </Field>
            <Field label="Planned years remaining (Korea)">
              <ReturnPlannerNumericInput value={state.plannedKoreaYearsRemaining} min={0} integer={false} onCommit={(plannedKoreaYearsRemaining) => patch({ plannedKoreaYearsRemaining })} />
            </Field>
            <Field label="Salary growth % / yr">
              <ReturnPlannerNumericInput value={state.salaryGrowthPct} min={0} max={15} integer={false} onCommit={(salaryGrowthPct) => patch({ salaryGrowthPct })} />
            </Field>
            <Field label="Korea savings (KRW)">
              <ReturnPlannerNumericInput value={state.koreaSavingsKrw} min={0} onCommit={(koreaSavingsKrw) => patch({ koreaSavingsKrw })} />
            </Field>
            <div
              className={`flex flex-col gap-3 rounded-2xl border p-4 sm:col-span-2 ${
                light ? "border-slate-200/90 bg-slate-50/50" : "border-white/[0.14] bg-gradient-to-br from-white/[0.06] to-white/[0.02]"
              }`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-teal-800 dark:text-[#4FFFD1]">Severance (KRW)</p>
                  <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-600 dark:text-[rgba(255,255,255,0.85)]">
                    Model uses salary × total Korea years (worked + planned).
                  </p>
                </div>
                <AutoCalculateToggleGroup
                  labelledById="rtn-sev-auto-label"
                  light={light}
                  autoOn={state.severanceAutoCalculate !== false}
                  onAutoOnChange={(next) => {
                    if (next) {
                      patch({ severanceAutoCalculate: true, severanceOverrideKrw: 0 });
                    } else {
                      const seed =
                        state.severanceOverrideKrw > 0
                          ? state.severanceOverrideKrw
                          : Math.round(computeAutoSeveranceKrw(state));
                      patch({ severanceAutoCalculate: false, severanceOverrideKrw: seed });
                    }
                  }}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-teal-800 dark:text-[#4FFFD1]">Override amount (KRW)</span>
                {state.severanceAutoCalculate !== false ? (
                  <div
                    className={`${inputClass} flex min-h-[44px] items-center text-sm font-bold text-slate-500 dark:text-[rgba(255,255,255,0.85)]`}
                    aria-readonly="true"
                  >
                    Manual entry off — estimate below is used
                  </div>
                ) : (
                  <ReturnPlannerNumericInput value={state.severanceOverrideKrw} min={0} onCommit={(severanceOverrideKrw) => patch({ severanceOverrideKrw })} />
                )}
              </div>
              {state.severanceAutoCalculate !== false ? (
                <>
                  <p className="text-sm font-black tabular-nums text-slate-900 dark:text-white">
                    Estimated severance: {formatKrwInteger(autoSeveranceKrw)}
                  </p>
                  <p
                    className={`rounded-xl border px-3 py-2 text-[11px] font-semibold leading-relaxed ${
                      light
                        ? "border-amber-200/80 bg-amber-50/90 text-amber-950/90"
                        : "border-amber-400/25 bg-amber-500/10 text-amber-100/95"
                    }`}
                  >
                    <span className="font-black uppercase tracking-wide text-amber-800 dark:text-amber-200/90">Auto On</span>
                    {" — "}The planner uses the estimate above.{" "}
                    <span className="font-bold">Older behaviour: typing 0 in the box meant “use the model.”</span> Use this toggle for that now; the override row is not used while Auto is On.
                  </p>
                </>
              ) : (
                <p
                  className={`rounded-xl border px-3 py-2 text-[11px] font-semibold leading-relaxed ${
                    light ? "border-slate-200/90 bg-white/80 text-slate-700" : "border-white/[0.14] bg-black/35 text-[rgba(255,255,255,0.85)]"
                  }`}
                >
                  <span className="font-black text-teal-800 dark:text-[#4FFFD1]">Manual mode</span>
                  {" — "}Enter your lump sum in KRW. Use <span className="font-bold">0</span> if you are modelling{" "}
                  <span className="font-bold">no severance payout</span> (different from Auto On, which uses the estimate).
                </p>
              )}
            </div>
            <div
              className={`flex flex-col gap-3 rounded-2xl border p-4 sm:col-span-2 ${
                light ? "border-slate-200/90 bg-slate-50/50" : "border-white/[0.14] bg-gradient-to-br from-white/[0.06] to-white/[0.02]"
              }`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-teal-800 dark:text-[#4FFFD1]">National pension maturity (KRW)</p>
                  <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-600 dark:text-[rgba(255,255,255,0.85)]">
                    Rough maturity from contributions + growth (illustrative).
                  </p>
                </div>
                <AutoCalculateToggleGroup
                  labelledById="rtn-np-auto-label"
                  light={light}
                  autoOn={state.nationalPensionAutoCalculate !== false}
                  onAutoOnChange={(next) => {
                    if (next) {
                      patch({ nationalPensionAutoCalculate: true, nationalPensionMaturityOverrideKrw: 0 });
                    } else {
                      const seed =
                        state.nationalPensionMaturityOverrideKrw > 0
                          ? state.nationalPensionMaturityOverrideKrw
                          : Math.round(computeAutoNationalPensionMaturityKrw(state));
                      patch({ nationalPensionAutoCalculate: false, nationalPensionMaturityOverrideKrw: seed });
                    }
                  }}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-teal-800 dark:text-[#4FFFD1]">Override amount (KRW)</span>
                {state.nationalPensionAutoCalculate !== false ? (
                  <div
                    className={`${inputClass} flex min-h-[44px] items-center text-sm font-bold text-slate-500 dark:text-[rgba(255,255,255,0.85)]`}
                    aria-readonly="true"
                  >
                    Manual entry off — estimate below is used
                  </div>
                ) : (
                  <ReturnPlannerNumericInput
                    value={state.nationalPensionMaturityOverrideKrw}
                    min={0}
                    onCommit={(nationalPensionMaturityOverrideKrw) => patch({ nationalPensionMaturityOverrideKrw })}
                  />
                )}
              </div>
              {state.nationalPensionAutoCalculate !== false ? (
                <>
                  <p className="text-sm font-black tabular-nums text-slate-900 dark:text-white">
                    Estimated national pension: {formatKrwInteger(autoNationalPensionKrw)}
                  </p>
                  <p
                    className={`rounded-xl border px-3 py-2 text-[11px] font-semibold leading-relaxed ${
                      light
                        ? "border-amber-200/80 bg-amber-50/90 text-amber-950/90"
                        : "border-amber-400/25 bg-amber-500/10 text-amber-100/95"
                    }`}
                  >
                    <span className="font-black uppercase tracking-wide text-amber-800 dark:text-amber-200/90">Auto On</span>
                    {" — "}Same as severance: the estimate above is what counts.{" "}
                    <span className="font-bold">0 in the box used to mean “use the model”</span>
                    {" — "}use Auto On for that, or Auto Off to enter your own KRW.
                  </p>
                </>
              ) : (
                <p
                  className={`rounded-xl border px-3 py-2 text-[11px] font-semibold leading-relaxed ${
                    light ? "border-slate-200/90 bg-white/80 text-slate-700" : "border-white/[0.14] bg-black/35 text-[rgba(255,255,255,0.85)]"
                  }`}
                >
                  <span className="font-black text-teal-800 dark:text-[#4FFFD1]">Manual mode</span>
                  {" — "}Enter maturity in KRW. Use <span className="font-bold">0</span> if you are modelling{" "}
                  <span className="font-bold">no national-pension lump sum</span> at return.
                </p>
              )}
            </div>
          </div>
          <div className="mt-5 rounded-2xl border border-teal-500/15 bg-teal-500/[0.06] p-4 dark:bg-teal-500/[0.08]">
            <p className="text-sm font-black text-slate-900 dark:text-white">
              Target return year {state.targetReturnYear} · You are {snapshot.returnGoalProgressPct.toFixed(0)}% closer to funded house + relocation.
            </p>
            <p className="mt-2 text-xs font-semibold text-slate-600 dark:text-[rgba(255,255,255,0.85)]">
              Projected Korea-side corpus (NPR): {formatNprInteger(snapshot.koreaSavingsAfterPlannedYearsNpr)} · Severance (model){" "}
              {formatNprInteger(snapshot.projectedSeveranceNpr)} · National pension (rough) {formatNprInteger(snapshot.projectedNationalPensionNpr)}
            </p>
          </div>
        </section>

        <section id="rtn-family" className={sg("mt-2")}>
          <SectionTitle icon={Users} title="Family settlement" subtitle="Budget lines plus a practical resettlement checklist (saved locally)." />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="School fees / mo (NPR)">
              <ReturnPlannerNumericInput value={state.schoolFeesMonthlyNpr} min={0} onCommit={(schoolFeesMonthlyNpr) => patch({ schoolFeesMonthlyNpr })} />
            </Field>
            <Field label="Relocation one-time (NPR)">
              <ReturnPlannerNumericInput value={state.relocationOneTimeNpr} min={0} onCommit={(relocationOneTimeNpr) => patch({ relocationOneTimeNpr })} />
            </Field>
            <Field label="Parent support / mo">
              <ReturnPlannerNumericInput value={state.parentSupportMonthlyNpr} min={0} onCommit={(parentSupportMonthlyNpr) => patch({ parentSupportMonthlyNpr })} />
            </Field>
            <Field label="Healthcare / mo">
              <ReturnPlannerNumericInput value={state.healthcareMonthlyNpr} min={0} onCommit={(healthcareMonthlyNpr) => patch({ healthcareMonthlyNpr })} />
            </Field>
          </div>
          <div className="mt-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-teal-700 dark:text-[#4FFFD1]">Settlement checklist</p>
            <div className="mt-2 flex flex-col gap-2">
              {SETTLEMENT_CHECKLIST_ITEMS.map((row) => {
                const done = state.settlementChecklist.includes(row.id);
                return (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => toggleSettlement(row.id)}
                    className={`flex min-h-[48px] items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left text-sm font-bold transition sm:px-4 ${
                      done
                        ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-900 dark:text-emerald-100"
                        : light
                          ? "border-slate-200/90 bg-white/90 text-slate-800 hover:border-teal-200"
                          : "border-white/[0.12] bg-white/[0.06] text-[rgba(255,255,255,0.85)] hover:border-[rgba(79,255,209,0.3)]"
                    }`}
                  >
                    <span>{row.label}</span>
                    <span className="shrink-0 text-[11px] font-bold uppercase tracking-wide text-teal-600 dark:text-[#4FFFD1]">{done ? "Done" : "Todo"}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="mt-5 rounded-2xl border border-teal-500/20 bg-teal-500/[0.06] p-4 ring-1 ring-white/[0.04] dark:bg-teal-500/[0.1]">
            <p className="text-sm font-black text-slate-900 dark:text-white">Family readiness score</p>
            <p className="mt-2 text-3xl font-extrabold text-teal-700 dark:text-white [text-shadow:0_0_28px_rgba(255,255,255,0.12)]">{snapshot.familyRelocationScore.toFixed(0)}%</p>
            <p className="mt-1 text-xs font-semibold text-slate-600 dark:text-[rgba(255,255,255,0.85)]">Includes checklist completion vs stress index {snapshot.stressScore.toFixed(0)}.</p>
          </div>
        </section>

        <section id="rtn-house" className={sg("mt-2")}>
          <SectionTitle icon={Building2} title="House planning" subtitle="Land, build, interior, loan EMI model, construction phases, overrun signal." />
          <div className="grid gap-4 sm:grid-cols-2">
            {(
              [
                ["landBudgetNpr", "Land (NPR)"],
                ["constructionBudgetNpr", "Construction (NPR)"],
                ["interiorBudgetNpr", "Interior (NPR)"],
                ["furnitureBudgetNpr", "Furniture (NPR)"],
              ] as const
            ).map(([key, label]) => (
              <Field key={key} label={label}>
                <ReturnPlannerNumericInput value={state[key]} min={0} onCommit={(next) => patch({ [key]: next })} />
              </Field>
            ))}
            <Field label="Loan principal (NPR)">
              <ReturnPlannerNumericInput value={state.homeLoanPrincipalNpr} min={0} onCommit={(homeLoanPrincipalNpr) => patch({ homeLoanPrincipalNpr })} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2 sm:col-span-2">
              <Field label="Loan APR %">
                <ReturnPlannerNumericInput value={state.homeLoanAprPct} min={0} max={30} integer={false} onCommit={(homeLoanAprPct) => patch({ homeLoanAprPct })} />
              </Field>
              <Field label="Loan years">
                <ReturnPlannerNumericInput value={state.homeLoanYears} min={1} max={30} onCommit={(homeLoanYears) => patch({ homeLoanYears })} />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Build progress %" hint="Tracker">
                <input type="range" min={0} max={100} value={state.houseProgressPct} onChange={(e) => patch({ houseProgressPct: Number(e.target.value) })} className="w-full accent-teal-500" />
              </Field>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {CONSTRUCTION_PHASES.map((ph) => {
              const done = state.completedPhases.includes(ph.id);
              return (
                <button
                  key={ph.id}
                  type="button"
                  onClick={() => togglePhase(ph.id)}
                  className={`rounded-full border px-3 py-1.5 text-[11px] font-black uppercase tracking-wide transition ${
                    done ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-100" : "border-white/[0.12] bg-white/[0.06] text-[rgba(255,255,255,0.85)] hover:border-[rgba(79,255,209,0.28)]"
                  }`}
                >
                  {ph.label}
                </button>
              );
            })}
          </div>
          <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/[0.07] p-4 dark:bg-amber-500/10">
            <p className="text-sm font-black text-amber-950 dark:text-amber-100">Overrun signal: {overrun.toUpperCase()}</p>
            <p className="mt-1 text-xs font-semibold text-amber-950/80 dark:text-amber-50/80">
              Phased {(phaseRatio * 100).toFixed(0)}% · Progress bar {state.houseProgressPct}%
            </p>
          </div>
          <div className="mt-4 rounded-2xl border border-teal-500/15 bg-teal-500/[0.06] p-4">
            <p className="text-xs font-bold text-slate-500 dark:text-[rgba(255,255,255,0.85)]">Total build budget</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{formatNprInteger(snapshot.houseTotalBudgetNpr)}</p>
            <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-[rgba(255,255,255,0.85)]">
              EMI (model): {formatNprInteger(Math.round(snapshot.houseLoanEmiNpr))} / mo
            </p>
          </div>
        </section>

        <section id="rtn-business" className={sg("mt-2")}>
          <SectionTitle icon={Wallet} title="Business startup estimator" subtitle="Capital × yield assumption for a rental / small business passive hint." />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Capital (NPR)">
              <ReturnPlannerNumericInput value={state.businessCapitalNpr} min={0} onCommit={(businessCapitalNpr) => patch({ businessCapitalNpr })} />
            </Field>
            <Field label="Gross yield % / yr">
              <ReturnPlannerNumericInput value={state.expectedRentalYieldPct} min={0} max={25} integer={false} onCommit={(expectedRentalYieldPct) => patch({ expectedRentalYieldPct })} />
            </Field>
          </div>
          <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.07] p-4 dark:bg-emerald-500/10">
            <p className="text-sm font-black text-slate-900 dark:text-white">Implied monthly from yield model</p>
            <p className="mt-2 text-2xl font-black text-emerald-800 dark:text-emerald-100">{formatNprInteger(snapshot.businessPassiveMonthlyHintNpr)}</p>
            <p className="mt-1 text-xs font-semibold text-slate-600 dark:text-[rgba(255,255,255,0.72)]">{snapshot.aiSecondary}</p>
          </div>
        </section>

        <section id="rtn-gap" className={sg("mt-2")}>
          <SectionTitle icon={LineChart} title="Retirement gap analysis" subtitle="Future need vs passive stack; sustainability if drawing on principal." />
          <div className="grid gap-4 sm:grid-cols-3">
            <div className={`rounded-2xl border p-4 ${light ? "border-slate-200/90 bg-white/80" : "border-white/[0.14] bg-gradient-to-br from-white/[0.08] to-white/[0.03]"}`}>
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-[#4FFFD1]">Future need / mo</p>
              <p className="mt-2 text-xl font-black text-slate-900 dark:text-white">{formatNprInteger(snapshot.monthlyNepalLivingFutureNpr)}</p>
            </div>
            <div className={`rounded-2xl border p-4 ${light ? "border-slate-200/90 bg-white/80" : "border-white/[0.14] bg-gradient-to-br from-white/[0.08] to-white/[0.03]"}`}>
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-[#4FFFD1]">Passive / mo (inflated)</p>
              <p className="mt-2 text-xl font-black text-slate-900 dark:text-white">{formatNprInteger(snapshot.passiveMonthlyFutureNpr)}</p>
            </div>
            <div className={`rounded-2xl border p-4 ${light ? "border-slate-200/90 bg-white/80" : "border-white/[0.14] bg-gradient-to-br from-white/[0.08] to-white/[0.03]"}`}>
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-[#4FFFD1]">Sustainability yrs</p>
              <p className="mt-2 text-xl font-black text-slate-900 dark:text-white">{snapshot.sustainabilityYears.toFixed(1)}</p>
            </div>
          </div>
          <div className="mt-4 rounded-2xl border border-teal-500/20 bg-teal-500/[0.07] p-4">
            <p className="text-sm font-black text-slate-900 dark:text-white">Monthly surplus / deficit</p>
            <p className="mt-2 text-2xl font-extrabold text-teal-800 dark:text-white [text-shadow:0_0_24px_rgba(255,255,255,0.1)]">
              {snapshot.monthlyDeficitNpr > 0 ? `−${formatNprInteger(snapshot.monthlyDeficitNpr)}` : `+${formatNprInteger(snapshot.monthlySurplusNpr)}`}
            </p>
            <p className="mt-2 text-xs font-semibold text-slate-600 dark:text-[rgba(255,255,255,0.85)]">
              Extra corpus needed (4.25% SWR heuristic): {formatNprInteger(snapshot.requiredExtraCorpusNpr)}
            </p>
          </div>
        </section>

        <section id="rtn-coach" className={sg("mt-2 mb-2")}>
          <SectionTitle icon={Heart} title="Coach, legal prep & milestones" subtitle="Motivation layer plus lightweight tax/banking sliders — confirm with a CA." />
          <div className="rounded-2xl border border-teal-400/20 bg-gradient-to-br from-teal-500/15 to-emerald-600/10 p-4 sm:p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-teal-800 dark:text-[#4FFFD1]">Assistant</p>
            <p className="mt-2 text-lg font-black text-slate-900 dark:text-white">{snapshot.aiHeadline}</p>
            <p className="mt-2 text-sm font-semibold text-teal-900/90 dark:text-[rgba(255,255,255,0.85)]">{snapshot.aiSecondary}</p>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Tax readiness %">
              <input type="range" min={0} max={100} value={state.taxReadinessPct} onChange={(e) => patch({ taxReadinessPct: Number(e.target.value) })} className="w-full accent-teal-500" />
            </Field>
            <Field label="Banking setup %">
              <input type="range" min={0} max={100} value={state.bankingChecklistPct} onChange={(e) => patch({ bankingChecklistPct: Number(e.target.value) })} className="w-full accent-teal-500" />
            </Field>
            <Field label="Property docs %">
              <input type="range" min={0} max={100} value={state.propertyDocsPct} onChange={(e) => patch({ propertyDocsPct: Number(e.target.value) })} className="w-full accent-teal-500" />
            </Field>
            <Field label="Migration checklist %">
              <input type="range" min={0} max={100} value={state.migrationChecklistPct} onChange={(e) => patch({ migrationChecklistPct: Number(e.target.value) })} className="w-full accent-teal-500" />
            </Field>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div
              className="relative h-40 overflow-hidden rounded-3xl border border-white/[0.14] shadow-[0_0_40px_-12px_rgba(52,211,153,0.35)]"
              style={{
                background: `linear-gradient(135deg, rgba(15,118,110,0.5) ${state.houseProgressPct}%, rgba(2,6,23,0.88) ${state.houseProgressPct}%)`,
              }}
            >
              <div className="absolute inset-0 flex flex-col justify-end p-4">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[rgba(255,255,255,0.85)]">Dream build</p>
                <p className="text-3xl font-extrabold text-white [text-shadow:0_0_32px_rgba(255,255,255,0.18)]">{state.houseProgressPct}%</p>
              </div>
            </div>
            <div className="rounded-2xl border border-emerald-400/15 bg-emerald-500/[0.08] p-4">
              <p className="text-sm font-black text-emerald-950 dark:text-emerald-50">Milestones</p>
              <ul className="mt-2 space-y-2 text-sm font-semibold text-emerald-900 dark:text-[rgba(255,255,255,0.85)]">
                <li>• Runway {snapshot.emergencyReserveMonths.toFixed(1)} mo</li>
                <li>• Return goal {snapshot.returnGoalProgressPct.toFixed(0)}%</li>
                <li>• Readiness {snapshot.retirementReadinessPct.toFixed(0)}%</li>
              </ul>
              <p className="mt-3 text-xs font-semibold text-emerald-900/85 dark:text-[rgba(255,255,255,0.72)]">{snapshot.emotionalLine}</p>
            </div>
          </div>
        </section>
      </ReturnToNepalChrome>
    </WealthDashboardShell>
  );
}
