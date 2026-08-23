import Link from "next/link";
import {
  ABROAD_REGIONS,
  FINANCIAL_FREEDOM_FAQ,
  FINANCIAL_FREEDOM_LAST_UPDATED,
  FINANCIAL_FREEDOM_TOOLS,
} from "@/lib/brand/financial-freedom-seo";
import { FIRE_NEPAL_FOUNDER } from "@/lib/brand/site-seo";
import { FINANCIAL_FREEDOM_GUIDE_ARTICLES } from "@/data/financial-freedom-guides/articles";

const ABROAD_FRAMEWORK = [
  "Earn abroad",
  "Save",
  "Protect",
  "Remit",
  "Invest",
  "Track",
  "Build Nepal assets",
  "Plan return",
  "Achieve financial independence",
] as const;

export function FinancialFreedomNepalPage() {
  return (
    <div className="bg-[#f3faf6] text-emerald-950">
      <header className="relative overflow-hidden border-b border-emerald-100/80 bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-900 text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, rgba(52,211,153,0.35), transparent 40%), radial-gradient(circle at 80% 0%, rgba(163,230,53,0.2), transparent 35%)",
          }}
          aria-hidden
        />
        <div className="relative mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <nav aria-label="Breadcrumb" className="text-xs font-bold text-emerald-100/70">
            <ol className="flex flex-wrap items-center gap-1.5">
              <li>
                <Link href="/" className="hover:text-white">
                  Home
                </Link>
              </li>
              <li aria-hidden>/</li>
              <li className="text-emerald-50">Financial Freedom Nepal</li>
            </ol>
          </nav>
          <p className="mt-5 text-[11px] font-black uppercase tracking-[0.22em] text-emerald-200/80">
            FIRE Nepal · Evergreen guide
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl font-black tracking-[-0.04em] sm:text-5xl lg:text-6xl">
            Financial Freedom Nepal
          </h1>
          <p className="mt-5 max-w-3xl text-lg font-medium leading-relaxed text-emerald-50/90 sm:text-xl">
            Financial freedom means having enough financial security, assets and income to make life decisions without
            being completely dependent on your next paycheck.
          </p>
          <p className="mt-4 max-w-3xl text-base font-medium leading-relaxed text-emerald-100/80">
            FIRE Nepal helps Nepalis build financial independence through planning, investing education, savings
            tracking, retirement planning and practical financial tools — for people in Nepal and Nepalis worldwide.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/#calculator"
              className="inline-flex rounded-xl bg-lime-300 px-5 py-3 text-sm font-black text-emerald-950 shadow-lg shadow-emerald-950/20 transition hover:bg-lime-200"
            >
              Open FIRE Calculator
            </Link>
            <Link
              href="/learn/financial-freedom"
              className="inline-flex rounded-xl border border-white/25 bg-white/10 px-5 py-3 text-sm font-black text-white backdrop-blur transition hover:bg-white/15"
            >
              Browse freedom guides
            </Link>
          </div>
          <p className="mt-6 text-xs font-bold text-emerald-100/55">
            Last updated {FINANCIAL_FREEDOM_LAST_UPDATED} · Educational review by{" "}
            <Link href="/founder" className="underline underline-offset-2 hover:text-white">
              {FIRE_NEPAL_FOUNDER.name}
            </Link>
            , {FIRE_NEPAL_FOUNDER.jobTitle} of FIRE Nepal
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-14 lg:px-8">
        <section className="max-w-3xl">
          <h2 className="text-2xl font-black tracking-tight sm:text-3xl">Why Financial Freedom Nepal matters</h2>
          <p className="mt-4 text-[15px] font-medium leading-relaxed text-slate-700">
            Rising living costs, remittance dependence, family obligations, and irregular overseas contracts make
            paycheck-only security fragile. A clearer path combines emergency cash, intentional investing, debt
            control, and a Nepal-specific retirement or return plan — measured in NPR, not vibes.
          </p>
          <p className="mt-4 text-[15px] font-medium leading-relaxed text-slate-700">
            This hub is the map. The calculators below are the instruments. The{" "}
            <Link href="/learn/financial-freedom" className="font-black text-emerald-800 underline-offset-2 hover:underline">
              guide library
            </Link>{" "}
            explains the ideas without promising guaranteed returns.
          </p>
        </section>

        <section className="mt-14">
          <h2 className="text-2xl font-black tracking-tight sm:text-3xl">
            FIRE Nepal tools for financial freedom
          </h2>
          <p className="mt-3 max-w-3xl text-[15px] font-medium leading-relaxed text-slate-600">
            Use these public planning tools to understand, track, and stress-test your journey toward financial
            independence.
          </p>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {FINANCIAL_FREEDOM_TOOLS.map((tool) => (
              <li key={`${tool.title}-${tool.href}`}>
                <Link
                  href={tool.href}
                  className="flex h-full flex-col rounded-2xl border border-emerald-100 bg-white/85 p-5 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50/50"
                >
                  <h3 className="text-lg font-black text-emerald-950">{tool.title}</h3>
                  <p className="mt-2 flex-1 text-sm font-medium leading-relaxed text-slate-600">{tool.blurb}</p>
                  <p className="mt-4 text-sm font-black text-emerald-800">{tool.cta}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-14 rounded-3xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/80 p-6 sm:p-8">
          <h2 className="text-2xl font-black tracking-tight sm:text-3xl">
            Financial Freedom for Nepalis Abroad
          </h2>
          <p className="mt-3 text-[15px] font-medium leading-relaxed text-slate-700">
            FIRE Nepal is built for Nepalis living, working, and studying abroad — including{" "}
            {ABROAD_REGIONS.slice(0, -1).join(", ")}, and {ABROAD_REGIONS[ABROAD_REGIONS.length - 1]}. Overseas income
            creates optionality; systems create independence.
          </p>
          <ol className="mt-6 flex flex-wrap gap-2">
            {ABROAD_FRAMEWORK.map((step, index) => (
              <li
                key={step}
                className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-black text-emerald-900"
              >
                <span className="text-emerald-600">{index + 1}.</span>
                {step}
              </li>
            ))}
          </ol>
          <div className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-sm font-black text-emerald-800">
            <Link href="/currency-converter" className="underline-offset-2 hover:underline">
              Currency Converter
            </Link>
            <Link href="/savings-tracker" className="underline-offset-2 hover:underline">
              Saving Goals
            </Link>
            <Link href="/sip-calculator" className="underline-offset-2 hover:underline">
              SIP Calculator Nepal
            </Link>
            <Link href="/korea-pension-dashboard" className="underline-offset-2 hover:underline">
              Korea Pension + Severance
            </Link>
            <Link href="/return-to-nepal" className="underline-offset-2 hover:underline">
              Nepal Return Planner
            </Link>
            <Link href="/#calculator" className="underline-offset-2 hover:underline">
              FIRE Calculator
            </Link>
          </div>
        </section>

        <section className="mt-14">
          <h2 className="text-2xl font-black tracking-tight sm:text-3xl">Learn: Financial Freedom guides</h2>
          <p className="mt-3 text-[15px] font-medium text-slate-600">
            Deep-dive articles that build topical authority around financial freedom and FIRE in Nepal.
          </p>
          <ul className="mt-6 space-y-3">
            {FINANCIAL_FREEDOM_GUIDE_ARTICLES.map((article) => (
              <li key={article.slug}>
                <Link
                  href={`/learn/financial-freedom/${article.slug}`}
                  className="group flex flex-col rounded-2xl border border-emerald-100 bg-white/80 px-4 py-3 transition hover:border-emerald-300 sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="font-black text-emerald-950 group-hover:text-emerald-800">{article.title}</span>
                  <span className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500 sm:mt-0">
                    {article.readingTime}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-14 max-w-3xl">
          <h2 className="text-2xl font-black tracking-tight sm:text-3xl">How FIRE Nepal approaches the math</h2>
          <p className="mt-4 text-[15px] font-medium leading-relaxed text-slate-700">
            Calculators use transparent assumptions you control: savings rate, expected return, inflation, spending,
            and withdrawal rate. Outputs are illustrative planning estimates — not personalized advice and not promises
            of market performance.
          </p>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-[15px] font-medium text-slate-700">
            <li>FIRE targets often use teaching rules such as 25× annual expenses (about 4% withdrawal).</li>
            <li>SIP/SWP models compound at your assumed rates; real NAVs fluctuate.</li>
            <li>Nepal cost-of-living and remittance FX can change the rupee target dramatically.</li>
          </ul>
        </section>

        <section className="mt-14 max-w-3xl">
          <h2 className="text-2xl font-black tracking-tight sm:text-3xl">Sources & references</h2>
          <p className="mt-4 text-[15px] font-medium leading-relaxed text-slate-700">
            FIRE Nepal educational content references public market frameworks and official channels. Always verify
            current rules with the primary source:
          </p>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-[15px] font-medium text-slate-700">
            <li>
              Securities Board of Nepal (SEBON) — investor education and mutual fund / capital market oversight.
            </li>
            <li>
              Your fund house Key Information Memorandum (KIM) and scheme documents for fees, risks, and SIP rules.
            </li>
            <li>
              Nepal Rastra Bank publications for remittance and macroeconomic context (use the latest official
              releases).
            </li>
            <li>
              Classic FIRE planning literature for the 25× / ~4% teaching rule — adapt carefully to Nepal costs and
              personal risk.
            </li>
          </ul>
        </section>

        <section className="mt-14 max-w-3xl">
          <h2 className="text-2xl font-black tracking-tight sm:text-3xl">Frequently asked questions</h2>
          <div className="mt-6 space-y-3">
            {FINANCIAL_FREEDOM_FAQ.map((item) => (
              <details key={item.question} className="rounded-2xl border border-emerald-100 bg-white/85 p-4">
                <summary className="cursor-pointer list-none text-base font-black text-emerald-950">
                  {item.question}
                </summary>
                <p className="mt-3 text-sm font-medium leading-relaxed text-slate-600">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <aside className="mt-14 rounded-2xl border border-amber-200/80 bg-amber-50/80 p-5 text-sm font-bold leading-relaxed text-amber-950">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-800">Educational disclaimer</p>
          <p className="mt-3">
            FIRE Nepal content and calculators are for education and financial planning illustration only. They are not
            personalized investment, tax, or legal advice. Mutual fund and market returns are not guaranteed. Confirm
            scheme documents with fund managers and consider consulting a licensed professional for decisions that
            affect your household.
          </p>
        </aside>
      </main>
    </div>
  );
}
