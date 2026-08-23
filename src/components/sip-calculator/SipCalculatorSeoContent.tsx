import Link from "next/link";
import {
  SIP_CALCULATOR_LAST_UPDATED,
  SIP_FAQ_ITEMS,
} from "@/lib/brand/sip-calculator-seo";
import { FIRE_NEPAL_FOUNDER } from "@/lib/brand/site-seo";
import { formatSipNpr, sipFutureValue } from "@/lib/sip-calculator";
import { SIP_GUIDE_ARTICLES } from "@/data/sip-guides/articles";

const ILLUSTRATIVE_RETURN_PCT = 12;
const ILLUSTRATIVE_YEARS = 10;

const MONTHLY_EXAMPLES = [1_000, 5_000, 10_000, 20_000] as const;

function exampleRow(monthly: number) {
  const invested = monthly * 12 * ILLUSTRATIVE_YEARS;
  const maturity = sipFutureValue(monthly, ILLUSTRATIVE_RETURN_PCT, ILLUSTRATIVE_YEARS);
  const gain = Math.max(0, maturity - invested);
  return { monthly, invested, maturity, gain };
}

const RELATED_TOOLS: Array<{ href: string; label: string; blurb: string }> = [
  {
    href: "/swp-calculator",
    label: "SWP Calculator",
    blurb: "Model systematic withdrawals after you build a corpus.",
  },
  {
    href: "/lumpsum-calculator",
    label: "Lumpsum Calculator",
    blurb: "Compare one-time investing with monthly SIP planning.",
  },
  {
    href: "/inflation-calculator",
    label: "Inflation Calculator Nepal",
    blurb: "See how inflation can change future purchasing power.",
  },
  {
    href: "/fire-summary",
    label: "FIRE Summary",
    blurb: "Connect SIP growth to net worth and FIRE progress.",
  },
  {
    href: "/savings-tracker",
    label: "Saving Goals",
    blurb: "Track the monthly surplus that can fund your SIP.",
  },
  {
    href: "/learn/sip",
    label: "SIP Guides for Nepal",
    blurb: "Deep-dive articles on SIP, step-up, and mutual funds in Nepal.",
  },
];

export function SipCalculatorSeoContent() {
  const exampleRows = MONTHLY_EXAMPLES.map(exampleRow);
  const formulaExample = exampleRow(5_000);

  return (
    <section className="border-t border-emerald-100/80 bg-[#f4fbf6] px-4 pb-24 pt-10 text-emerald-950 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-3xl">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700/70">
          SIP education · Nepal · NPR
        </p>
        <p className="mt-3 text-sm font-bold text-slate-500">
          Last updated {SIP_CALCULATOR_LAST_UPDATED} · Reviewed for educational clarity by{" "}
          {FIRE_NEPAL_FOUNDER.name}, {FIRE_NEPAL_FOUNDER.jobTitle} of FIRE Nepal
        </p>

        <article className="mt-8 space-y-12 text-[15px] font-medium leading-relaxed text-slate-700">
          <section>
            <h2 className="text-2xl font-black tracking-tight text-emerald-950 sm:text-3xl">
              What is a SIP Calculator?
            </h2>
            <p className="mt-4">
              A SIP calculator estimates how a Systematic Investment Plan could grow if you invest a fixed amount
              regularly — usually every month — into a market-linked product such as a mutual fund. FIRE Nepal’s{" "}
              <strong className="font-black text-emerald-950">SIP Calculator Nepal</strong> helps you project:
            </p>
            <ul className="mt-4 list-disc space-y-2 pl-5">
              <li>Monthly investment amount in NPR</li>
              <li>Investment period in years</li>
              <li>Expected annual return (an assumption you choose)</li>
              <li>Optional annual step-up (increasing SIP each year)</li>
            </ul>
            <p className="mt-4">
              Use it to compare scenarios before you commit cash — then confirm scheme rules, fees, and risks with the
              fund house. Results are estimates for planning, not promises.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black tracking-tight text-emerald-950 sm:text-3xl">
              SIP Calculator Nepal – How It Works
            </h2>
            <ol className="mt-4 list-decimal space-y-3 pl-5">
              <li>Enter your monthly SIP in Nepali Rupees.</li>
              <li>Choose an expected annual return for illustration (many planners stress-test 8%, 10%, and 12%).</li>
              <li>Set the number of years you expect to continue investing.</li>
              <li>Optionally add an annual step-up percentage to model salary growth.</li>
              <li>
                Review total invested, estimated maturity value, estimated profit, year-by-year rows, and the growth
                chart.
              </li>
            </ol>
            <p className="mt-4">
              The engine compounds monthly. When step-up is enabled, the monthly contribution rises once per year and
              later installments also compound for the remaining horizon.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black tracking-tight text-emerald-950 sm:text-3xl">
              How to Calculate SIP Returns in Nepal
            </h2>
            <p className="mt-4">
              In Nepal, SIP usually means buying mutual fund units on a schedule through a capital company or
              distributor under SEBON’s regulatory framework. Your actual return depends on NAV movement, expense
              ratios, taxes, and whether you stay invested through market swings.
            </p>
            <p className="mt-4">
              To estimate returns for planning: pick a sustainable monthly NPR amount, choose a conservative-to-moderate
              assumed return, and run multiple horizons (5, 10, 15, 20 years). Then compare with a{" "}
              <Link href="/lumpsum-calculator" className="font-black text-emerald-800 underline-offset-2 hover:underline">
                lumpsum scenario
              </Link>{" "}
              if you already hold a cash pile.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black tracking-tight text-emerald-950 sm:text-3xl">SIP Formula</h2>
            <p className="mt-4">
              For a fixed monthly SIP with no step-up, calculators commonly use the future value of an annuity-due
              style formula (contribution at the beginning of each month):
            </p>
            <pre className="mt-4 overflow-x-auto rounded-2xl border border-emerald-100 bg-white/80 p-4 text-sm font-bold text-emerald-950">
{`M = P × [((1 + r)^n − 1) / r] × (1 + r)

P = monthly investment
r = monthly rate (annual rate ÷ 12)
n = total months
M = estimated maturity value`}
            </pre>
            <p className="mt-4">
              With annual step-up, a closed form gets messy, so FIRE Nepal simulates month by month: add the current SIP,
              apply the monthly return, then raise the SIP after each completed year.
            </p>
            <p className="mt-4 rounded-2xl border border-amber-200/80 bg-amber-50/80 p-4 text-sm font-bold text-amber-950">
              Methodology note: assumed returns are constant in the model. Real mutual fund NAVs fluctuate. Fees, exit
              loads, and taxes are not fully modelled — treat outputs as educational estimates.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black tracking-tight text-emerald-950 sm:text-3xl">
              SIP Calculator Example
            </h2>
            <p className="mt-4">
              Example (illustrative only): invest {formatSipNpr(5_000)} every month for {ILLUSTRATIVE_YEARS} years at an
              assumed {ILLUSTRATIVE_RETURN_PCT}% annual return with no step-up.
            </p>
            <ul className="mt-4 list-disc space-y-2 pl-5">
              <li>Total invested: {formatSipNpr(formulaExample.invested)}</li>
              <li>Estimated maturity value: {formatSipNpr(formulaExample.maturity)}</li>
              <li>Estimated wealth gain: {formatSipNpr(formulaExample.gain)}</li>
            </ul>
            <p className="mt-4 text-sm font-bold text-slate-500">
              These figures use a constant return assumption. Actual mutual fund results can differ materially.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black tracking-tight text-emerald-950 sm:text-3xl">
              Monthly SIP Investment Examples
            </h2>
            <p className="mt-4">
              The table below uses the same illustrative assumptions: {ILLUSTRATIVE_RETURN_PCT}% annual return,{" "}
              {ILLUSTRATIVE_YEARS} years, no step-up. Labels are estimates for education only.
            </p>
            <div className="mt-5 overflow-x-auto rounded-2xl border border-emerald-100 bg-white/85">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-emerald-950 text-xs uppercase tracking-[0.12em] text-emerald-50">
                  <tr>
                    <th className="px-4 py-3 font-black">Monthly SIP</th>
                    <th className="px-4 py-3 font-black">Total invested</th>
                    <th className="px-4 py-3 font-black">Est. maturity</th>
                    <th className="px-4 py-3 font-black">Est. gain</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-100">
                  {exampleRows.map((row) => (
                    <tr key={row.monthly}>
                      <td className="px-4 py-3 font-black text-emerald-950">{formatSipNpr(row.monthly)}</td>
                      <td className="px-4 py-3 font-bold">{formatSipNpr(row.invested)}</td>
                      <td className="px-4 py-3 font-bold">{formatSipNpr(row.maturity)}</td>
                      <td className="px-4 py-3 font-bold text-emerald-700">{formatSipNpr(row.gain)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-black tracking-tight text-emerald-950 sm:text-3xl">
              SIP vs Lumpsum Investment
            </h2>
            <p className="mt-4">
              SIP spreads purchases over time and matches monthly income or remittance flows. Lumpsum invests available
              capital immediately, so more money can compound sooner — if markets rise after you invest. If markets fall
              soon after a lumpsum, paper losses can feel sharper.
            </p>
            <p className="mt-4">
              Many Nepali investors use both: keep an emergency fund liquid, deploy surplus cash gradually via SIP, and
              occasionally invest a lumpsum when they receive a bonus or large remittance. Compare paths with the{" "}
              <Link href="/sip-calculator" className="font-black text-emerald-800 underline-offset-2 hover:underline">
                SIP investment calculator
              </Link>{" "}
              and the{" "}
              <Link href="/lumpsum-calculator" className="font-black text-emerald-800 underline-offset-2 hover:underline">
                lumpsum calculator
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black tracking-tight text-emerald-950 sm:text-3xl">
              SIP Investment in Nepal
            </h2>
            <p className="mt-4">
              SIP investing in Nepal typically means registering with a fund manager or distributor, completing KYC,
              choosing a scheme, and setting a monthly debit or payment instruction. Minimum installment amounts often
              land around Rs 500–1,000, but schemes differ — verify before you plan.
            </p>
            <p className="mt-4">
              Practical tips: automate after payday, increase SIP when income rises (step-up), and avoid stopping only
              because markets are down unless your goals or risk capacity changed. Pair SIP with an emergency fund so you
              are not forced to redeem at a bad time.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black tracking-tight text-emerald-950 sm:text-3xl">
              Mutual Funds and SIP in Nepal
            </h2>
            <p className="mt-4">
              Mutual funds pool investor money into a portfolio managed under disclosed objectives. Open-end schemes
              usually publish NAV and allow periodic subscriptions. SIP is a payment method into those schemes, not a
              separate asset class.
            </p>
            <p className="mt-4">
              Read the scheme’s key information documents for risk category, asset mix, fees, and exit conditions.
              SEBON regulation supports market integrity and disclosure; it does not guarantee performance. For a deeper
              walkthrough, see{" "}
              <Link
                href="/learn/sip/mutual-fund-sip-in-nepal"
                className="font-black text-emerald-800 underline-offset-2 hover:underline"
              >
                Mutual Fund SIP in Nepal
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black tracking-tight text-emerald-950 sm:text-3xl">
              Is SIP a Good Investment for Nepali Investors?
            </h2>
            <p className="mt-4">
              SIP can be a useful <em>habit</em> for long-term goals — retirement, education, or FIRE planning — because
              it turns investing into a monthly system. Whether it is “good” for you depends on time horizon, risk
              tolerance, fees, diversification, and whether the money is truly surplus after essentials and emergency
              savings.
            </p>
            <p className="mt-4">
              SIP is not automatically better than paying high-interest debt, buying needed insurance, or holding cash
              for near-term goals. Treat the calculator as a planning lens, not a recommendation to buy any specific
              fund.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black tracking-tight text-emerald-950 sm:text-3xl">
              Frequently Asked Questions
            </h2>
            <div className="mt-6 space-y-4">
              {SIP_FAQ_ITEMS.map((item) => (
                <details
                  key={item.question}
                  className="group rounded-2xl border border-emerald-100 bg-white/80 p-4 open:shadow-sm"
                >
                  <summary className="cursor-pointer list-none text-base font-black text-emerald-950 marker:content-none">
                    <span className="flex items-start justify-between gap-3">
                      {item.question}
                      <span className="shrink-0 text-emerald-600 transition group-open:rotate-45">+</span>
                    </span>
                  </summary>
                  <p className="mt-3 text-sm font-medium leading-relaxed text-slate-600">{item.answer}</p>
                </details>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-black tracking-tight text-emerald-950 sm:text-3xl">
              Learn more: SIP guides for Nepal
            </h2>
            <p className="mt-4">
              Build topical understanding with FIRE Nepal’s SIP cluster — each guide links back to this calculator.
            </p>
            <ul className="mt-4 space-y-3">
              {SIP_GUIDE_ARTICLES.map((article) => (
                <li key={article.slug}>
                  <Link
                    href={`/learn/sip/${article.slug}`}
                    className="font-black text-emerald-800 underline-offset-2 hover:underline"
                  >
                    {article.title}
                  </Link>
                  <span className="text-sm text-slate-500"> · {article.readingTime}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-black tracking-tight text-emerald-950 sm:text-3xl">Related planning tools</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {RELATED_TOOLS.map((tool) => (
                <Link
                  key={tool.href}
                  href={tool.href}
                  className="rounded-2xl border border-emerald-100 bg-white/80 p-4 transition hover:border-emerald-300 hover:bg-emerald-50/60"
                >
                  <p className="font-black text-emerald-950">{tool.label}</p>
                  <p className="mt-1 text-sm font-medium text-slate-500">{tool.blurb}</p>
                </Link>
              ))}
            </div>
          </section>

          <aside className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 text-sm font-bold leading-relaxed text-emerald-950">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">Disclaimer</p>
            <p className="mt-3">
              Results are illustrative estimates based on the assumptions entered. Mutual fund returns are not
              guaranteed. Actual returns may vary. This calculator is for educational and financial planning purposes
              only. FIRE Nepal does not provide personalized investment advice or recommend specific securities.
            </p>
            <p className="mt-3">
              For official scheme documents and investor education resources, review materials from the Securities Board
              of Nepal (SEBON) and your chosen fund manager.
            </p>
          </aside>
        </article>
      </div>
    </section>
  );
}
