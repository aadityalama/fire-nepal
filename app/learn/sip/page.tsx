import type { Metadata } from "next";
import Link from "next/link";
import { SIP_GUIDE_ARTICLES, SIP_GUIDE_HUB } from "@/data/sip-guides/articles";
import { buildCanonicalAlternates } from "@/lib/brand/site-seo";

export const metadata: Metadata = {
  title: { absolute: `${SIP_GUIDE_HUB.title} | FIRE Nepal` },
  description: SIP_GUIDE_HUB.description,
  alternates: buildCanonicalAlternates("/learn/sip"),
  openGraph: {
    title: `${SIP_GUIDE_HUB.title} | FIRE Nepal`,
    description: SIP_GUIDE_HUB.description,
    url: "https://www.firenepal.com/learn/sip",
  },
};

export default function SipGuidesHubPage() {
  return (
    <main className="min-h-screen bg-[#f4fbf6] px-4 py-10 text-emerald-950 sm:px-6 sm:py-14">
      <article className="mx-auto max-w-3xl">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-700/60">Learn · SIP Nepal</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">{SIP_GUIDE_HUB.title}</h1>
        <p className="mt-3 text-base font-medium leading-relaxed text-slate-600">{SIP_GUIDE_HUB.description}</p>
        <p className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/sip-calculator"
            className="inline-flex rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-emerald-800"
          >
            Open SIP Calculator Nepal
          </Link>
          <Link
            href="/financial-freedom-nepal"
            className="inline-flex rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-black text-emerald-800 shadow-sm transition hover:bg-emerald-50"
          >
            Financial freedom planning
          </Link>
        </p>

        <ul className="mt-10 space-y-4">
          {SIP_GUIDE_ARTICLES.map((article) => (
            <li key={article.slug}>
              <Link
                href={`/learn/sip/${article.slug}`}
                className="block rounded-2xl border border-emerald-100 bg-white/80 p-5 transition hover:border-emerald-300 hover:bg-emerald-50/50"
              >
                <h2 className="text-lg font-black text-emerald-950">{article.title}</h2>
                <p className="mt-2 text-sm font-medium text-slate-600">{article.description}</p>
                <p className="mt-2 text-xs font-bold uppercase tracking-wide text-emerald-700/70">
                  {article.readingTime}
                </p>
              </Link>
            </li>
          ))}
        </ul>

        <p className="mt-10 text-xs font-medium leading-relaxed text-slate-500">
          Educational content only. Mutual fund SIP returns are not guaranteed. Confirm scheme details with your fund
          manager and review SEBON investor resources where relevant.
        </p>
      </article>
    </main>
  );
}
