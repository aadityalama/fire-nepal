"use client";

import { useSsfPension } from "@/contexts/SsfPensionContext";
import { computePensionProjection } from "@/lib/ssf-pension/projection";
import { PensionChrome } from "@/components/pension/PensionChrome";

const milestones = [
  { y: 2026, label: "Liquidity checkpoint", detail: "Maintain 6–9 months Nepal runway while EPF/CIT stay locked." },
  { y: 2028, label: "Estimated annuity inflection", detail: "Modeled monthly income crosses comfort band at current inputs." },
  { y: 2031, label: "Education & dependents peak", detail: "Coordinate withdrawals with tax brackets and insurance buffers." },
  { y: 2036, label: "Pre-retirement glide", detail: "Shift toward cash + short-duration sleeves ahead of relocation." },
];

export function WithdrawalPlannerPage() {
  const { workspace } = useSsfPension();
  const p = computePensionProjection(workspace.projection);

  return (
    <PensionChrome
      title="Withdrawal Planner"
      subtitle="Phased drawdowns across public tiers, provident funds, and portfolio sleeves — planning-oriented sequencing, not tax or legal advice."
    >
      <div className="mb-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-teal-500/20 bg-teal-500/10 px-4 py-3 text-sm font-semibold text-teal-950 dark:text-teal-50">
          Modeled retirement year <span className="font-black">{p.retirementYear}</span> · {p.yearsToRetirement} years of runway at
          current inputs.
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-slate-700 dark:text-zinc-200">
          Sequencing idea: keep tax-advantaged sleeves longest, use liquid brokerage for bridge years, align SSF annuity start with
          relocation timing.
        </div>
      </div>

      <section className="wealth-glass mb-6 p-4 sm:p-5">
        <h2 className="text-sm font-black uppercase tracking-[0.14em] text-slate-500 dark:text-zinc-400">Withdrawal phases</h2>
        <ol className="mt-3 flex flex-col gap-3 text-sm font-semibold text-slate-700 dark:text-zinc-300">
          <li className="rounded-xl border border-slate-200/80 px-3 py-2 dark:border-white/10">
            <span className="font-black text-teal-700 dark:text-teal-300">Phase 1 · Bridge</span> — Portfolio dividends + short bond
            sleeve for 36–48 months.
          </li>
          <li className="rounded-xl border border-slate-200/80 px-3 py-2 dark:border-white/10">
            <span className="font-black text-teal-700 dark:text-teal-300">Phase 2 · Structured</span> — EPF partial withdrawals where
            rules allow; reinvest surplus into NPR liquidity.
          </li>
          <li className="rounded-xl border border-slate-200/80 px-3 py-2 dark:border-white/10">
            <span className="font-black text-teal-700 dark:text-teal-300">Phase 3 · Annuity</span> — Public-tier annuity + CIT
            maturities synchronized with lower spend band.
          </li>
        </ol>
      </section>

      <div className="relative pl-6">
        <div className="absolute bottom-2 left-[11px] top-2 w-px bg-gradient-to-b from-teal-400/60 via-emerald-400/40 to-transparent" />
        <ul className="flex flex-col gap-6">
          {milestones.map((m) => (
            <li key={m.y} className="relative flex gap-4">
              <span className="absolute -left-1 top-1.5 grid h-3 w-3 place-items-center rounded-full border-2 border-teal-400 bg-[#021910] shadow-[0_0_12px_rgba(45,212,191,0.45)] dark:bg-zinc-950" />
              <div className="wealth-glass flex-1 p-4 motion-safe:transition-transform motion-safe:duration-300 motion-safe:hover:-translate-y-0.5">
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-teal-700 dark:text-teal-300/85">{m.y}</p>
                <p className="mt-1 text-base font-black text-slate-900 dark:text-white">{m.label}</p>
                <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-zinc-400">{m.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </PensionChrome>
  );
}
