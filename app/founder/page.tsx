import { ArrowLeft, Flame } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { FIRE_NEPAL_FOUNDER, buildCanonicalAlternates } from "@/lib/brand/site-seo";

export const metadata: Metadata = {
  title: {
    absolute: "Founder of FIRE Nepal",
  },
  description:
    "Raj Kumar Ghalan is the Founder of FIRE Nepal, an all-in-one financial platform helping Nepalis worldwide achieve Financial Independence, Retire Early (FIRE) and confidently plan their return to Nepal.",
  alternates: buildCanonicalAlternates("/founder"),
};

export default function FounderPage() {
  return (
    <main className="premium-shell min-h-screen overflow-hidden bg-[radial-gradient(circle_at_12%_8%,rgba(16,185,129,0.18),transparent_30rem),linear-gradient(135deg,#031f1a_0%,#063f31_44%,#f7fbf8_44%,#ffffff_100%)] text-slate-950 dark:bg-[radial-gradient(circle_at_12%_8%,rgba(16,185,129,0.16),transparent_30rem),linear-gradient(135deg,#020f0d_0%,#062b22_48%,#071713_100%)]">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <Link href="/about" className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-black text-emerald-50 backdrop-blur transition hover:-translate-x-1 hover:bg-white/20">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to About
        </Link>

        <section className="mt-10 rounded-[2rem] border border-white/55 bg-white/92 p-6 shadow-[0_26px_80px_rgba(0,63,47,0.13)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.08] sm:p-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-emerald-800 dark:text-emerald-950">
            <Flame className="h-4 w-4" aria-hidden />
            FIRE Nepal
          </div>
          <h1 className="mt-6 text-4xl font-black tracking-[-0.05em] text-slate-900 dark:text-white sm:text-5xl">
            Founder of FIRE Nepal
          </h1>
          <p className="mt-5 max-w-3xl text-base font-semibold leading-8 text-slate-700 dark:text-emerald-50 sm:text-lg">
            {FIRE_NEPAL_FOUNDER.name} is the Founder of FIRE Nepal, an all-in-one financial platform helping Nepalis worldwide achieve Financial Independence, Retire Early (FIRE) and confidently plan their return to Nepal.
          </p>
        </section>
      </div>
    </main>
  );
}
