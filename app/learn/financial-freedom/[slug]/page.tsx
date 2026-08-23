import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  FINANCIAL_FREEDOM_GUIDE_ARTICLES,
  getAllFinancialFreedomGuideSlugs,
  getFinancialFreedomGuideBySlug,
} from "@/data/financial-freedom-guides/articles";
import { buildCanonicalAlternates } from "@/lib/brand/site-seo";

type PageProps = {
  params: Promise<{ slug: string }>;
};

function renderInlineLinks(text: string) {
  const parts = text.split(/(\[[^\]]+\]\([^)]+\))/g);
  return parts.map((part, index) => {
    const match = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
    if (!match) return <span key={`${index}-${part.slice(0, 12)}`}>{part}</span>;
    const [, label, href] = match;
    return (
      <Link
        key={`${href}-${label}-${index}`}
        href={href}
        className="font-black text-emerald-800 underline-offset-2 hover:underline"
      >
        {label}
      </Link>
    );
  });
}

export function generateStaticParams() {
  return getAllFinancialFreedomGuideSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getFinancialFreedomGuideBySlug(slug);
  if (!article) return {};

  return {
    title: { absolute: `${article.title} | FIRE Nepal` },
    description: article.description,
    keywords: article.keywords,
    alternates: buildCanonicalAlternates(`/learn/financial-freedom/${article.slug}`),
    openGraph: {
      title: `${article.title} | FIRE Nepal`,
      description: article.description,
      url: `https://www.firenepal.com/learn/financial-freedom/${article.slug}`,
      type: "article",
    },
  };
}

export default async function FinancialFreedomGuideArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const article = getFinancialFreedomGuideBySlug(slug);
  if (!article) notFound();

  const related = FINANCIAL_FREEDOM_GUIDE_ARTICLES.filter((item) => item.slug !== article.slug).slice(0, 5);

  return (
    <main className="min-h-screen bg-[#f4fbf6] px-4 py-10 text-emerald-950 sm:px-6 sm:py-14">
      <article className="mx-auto max-w-2xl">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-700/60">
          <Link href="/learn/financial-freedom" className="hover:underline">
            Freedom Guides
          </Link>
          {" · "}
          <Link href="/financial-freedom-nepal" className="hover:underline">
            Financial Freedom Nepal
          </Link>
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">{article.title}</h1>
        <p className="mt-3 text-base font-medium leading-relaxed text-slate-600">{article.description}</p>
        <p className="mt-2 text-xs font-bold uppercase tracking-wide text-slate-500">
          {article.readingTime} · Updated {article.lastUpdated}
        </p>
        <p className="mt-5">
          <Link
            href="/financial-freedom-nepal"
            className="inline-flex rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-emerald-800"
          >
            Plan your financial freedom
          </Link>
        </p>

        <div className="mt-10 space-y-10">
          {article.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-xl font-black tracking-tight text-emerald-950">{section.heading}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph.slice(0, 48)} className="mt-3 text-[15px] font-medium leading-relaxed text-slate-700">
                  {renderInlineLinks(paragraph)}
                </p>
              ))}
              {section.bullets ? (
                <ul className="mt-3 list-disc space-y-2 pl-5 text-[15px] font-medium text-slate-700">
                  {section.bullets.map((bullet) => (
                    <li key={bullet.slice(0, 48)}>{renderInlineLinks(bullet)}</li>
                  ))}
                </ul>
              ) : null}
              {section.note ? (
                <p className="mt-3 rounded-xl border border-amber-200/80 bg-amber-50/80 p-3 text-sm font-bold text-amber-950">
                  {section.note}
                </p>
              ) : null}
            </section>
          ))}
        </div>

        <section className="mt-12 rounded-2xl border border-emerald-100 bg-white/80 p-5">
          <h2 className="text-lg font-black text-emerald-950">Related FIRE Nepal tools</h2>
          <ul className="mt-3 flex flex-wrap gap-3">
            {article.relatedTools.map((tool) => (
              <li key={`${tool.href}-${tool.label}`}>
                <Link href={tool.href} className="font-black text-emerald-800 underline-offset-2 hover:underline">
                  {tool.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <aside className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5 text-sm font-bold leading-relaxed text-emerald-950">
          Educational article only. Returns are not guaranteed. Return to the{" "}
          <Link href="/financial-freedom-nepal" className="underline underline-offset-2">
            Financial Freedom Nepal
          </Link>{" "}
          hub to continue planning with FIRE Nepal tools.
        </aside>

        {related.length > 0 ? (
          <section className="mt-12">
            <h2 className="text-lg font-black text-emerald-950">Related guides</h2>
            <ul className="mt-4 space-y-2">
              {related.map((item) => (
                <li key={item.slug}>
                  <Link
                    href={`/learn/financial-freedom/${item.slug}`}
                    className="font-bold text-emerald-800 underline-offset-2 hover:underline"
                  >
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </article>
    </main>
  );
}
