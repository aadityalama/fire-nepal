import type { Metadata } from "next";
import Link from "next/link";
import { buildCanonicalAlternates } from "@/lib/brand/site-seo";

export const metadata: Metadata = {
  title: "FIRE lifestyle types | FIRE Nepal",
  description:
    "Lean FIRE, Traditional FIRE, and Fat FIRE explained — spending bands, portfolio targets, and how to choose for life after financial independence.",
  alternates: buildCanonicalAlternates("/learn/fire-lifestyle"),
};

export default function FireLifestyleLearnPage() {
  return (
    <main className="min-h-screen bg-[#030806] px-4 py-10 text-zinc-100 sm:px-6 sm:py-14">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(52,211,153,0.14),transparent_50%)]" />
      <article className="relative mx-auto max-w-2xl">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-200/55">Learn</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">FIRE lifestyle types</h1>
        <p className="mt-3 text-base font-medium leading-relaxed text-emerald-100/70">
          Financial Independence, Retire Early (FIRE) is not one-size-fits-all. The lifestyle you plan for after FI shapes
          how large your portfolio needs to be and how quickly you can get there.
        </p>

        <div className="mt-10 space-y-8">
          <section className="rounded-2xl border border-emerald-400/15 bg-white/[0.04] p-5 sm:p-6">
            <h2 className="text-lg font-black text-white">Lean FIRE</h2>
            <p className="mt-2 text-sm font-medium leading-relaxed text-emerald-100/75">
              Lower spending lifestyle. Reach financial independence sooner with a smaller target portfolio.
            </p>
            <p className="mt-3 text-sm font-bold text-lime-200/90">Example monthly expenses: NPR 50,000–100,000</p>
            <p className="mt-3 text-sm text-zinc-400">
              Best when you are comfortable optimising expenses, value time freedom over luxury, and can sustain a lean
              budget long term.
            </p>
          </section>

          <section className="rounded-2xl border border-lime-400/25 bg-gradient-to-br from-emerald-500/12 to-lime-400/5 p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-black text-white">Traditional FIRE</h2>
              <span className="rounded-full border border-lime-400/40 bg-lime-400/15 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-lime-100">
                Recommended for most users
              </span>
            </div>
            <p className="mt-2 text-sm font-medium leading-relaxed text-emerald-100/80">
              Balanced lifestyle with comfortable spending and sustainable long-term planning.
            </p>
            <p className="mt-3 text-sm font-bold text-lime-200/90">Example monthly expenses: NPR 100,000–250,000</p>
            <p className="mt-3 text-sm text-zinc-300">
              A practical default for many households: enough cushion for normal life events without requiring an
              oversized portfolio.
            </p>
          </section>

          <section className="rounded-2xl border border-emerald-400/15 bg-white/[0.04] p-5 sm:p-6">
            <h2 className="text-lg font-black text-white">Fat FIRE</h2>
            <p className="mt-2 text-sm font-medium leading-relaxed text-emerald-100/75">
              Premium lifestyle with higher spending, larger safety margins, and a bigger retirement portfolio.
            </p>
            <p className="mt-3 text-sm font-bold text-lime-200/90">Example monthly expenses: NPR 250,000+</p>
            <p className="mt-3 text-sm text-zinc-400">
              Suited if you want generous travel, help for family, or extra buffers so market dips stress you less —
              with the trade-off of a longer accumulation phase or higher savings rate.
            </p>
          </section>

          <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-black/35">
            <h2 className="border-b border-white/[0.06] px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-emerald-200/50">
              At a glance
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[320px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-[10px] font-black uppercase tracking-wider text-zinc-500">
                    <th className="px-4 py-3">Type</th>
                    <th className="px-3 py-3">Spending</th>
                    <th className="px-3 py-3">FIRE Target</th>
                    <th className="px-4 py-3">Speed</th>
                  </tr>
                </thead>
                <tbody className="font-semibold text-zinc-300">
                  <tr className="border-b border-white/[0.04]">
                    <td className="px-4 py-3 text-white">Lean FIRE</td>
                    <td className="px-3 py-3">Low</td>
                    <td className="px-3 py-3">Lower</td>
                    <td className="px-4 py-3">Faster</td>
                  </tr>
                  <tr className="border-b border-white/[0.04] bg-emerald-500/[0.08]">
                    <td className="px-4 py-3 text-white">Traditional FIRE</td>
                    <td className="px-3 py-3">Medium</td>
                    <td className="px-3 py-3">Medium</td>
                    <td className="px-4 py-3">Balanced</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-white">Fat FIRE</td>
                    <td className="px-3 py-3">High</td>
                    <td className="px-3 py-3">Higher</td>
                    <td className="px-4 py-3">Slower</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <p className="text-xs font-medium leading-relaxed text-zinc-500">
            Examples are illustrative ranges in NPR for planning context only. Your actual FI number depends on return
            assumptions, inflation, taxes, and withdrawal rate — use the FIRE Nepal calculators to stress-test your plan.
          </p>
        </div>

        <div className="mt-12 flex flex-wrap gap-3">
          <Link
            href="/onboarding"
            className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-emerald-500 to-lime-400 px-5 py-2.5 text-sm font-black text-emerald-950 shadow-lg shadow-emerald-500/20"
          >
            Back to onboarding
          </Link>
          <Link
            href="/hub"
            className="inline-flex items-center justify-center rounded-xl border border-white/15 px-5 py-2.5 text-sm font-bold text-zinc-200 transition hover:border-emerald-400/35 hover:text-white"
          >
            Hub
          </Link>
        </div>
      </article>
    </main>
  );
}
