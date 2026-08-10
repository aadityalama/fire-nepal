import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { fetchAllPublishedBlogPosts } from "@/lib/blog-posts/fetch-public-posts";
import { buildCanonicalAlternates, FIRE_NEPAL_THEME_COLOR } from "@/lib/brand/site-seo";
import type { Viewport } from "next";

export const metadata: Metadata = {
  title: "Blog | FIRE Nepal",
  description:
    "Practical FIRE guides for Nepalis abroad — investing, remittance, retirement planning, and Nepal return readiness.",
  alternates: buildCanonicalAlternates("/blog"),
};

export const viewport: Viewport = {
  themeColor: FIRE_NEPAL_THEME_COLOR,
};

export default async function BlogIndexPage() {
  const posts = await fetchAllPublishedBlogPosts();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_20%_-10%,rgba(16,185,129,0.18),transparent_45%),linear-gradient(180deg,#f4fbf7_0%,#eef8f2_40%,#f8faf9_100%)] px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/#learn"
          className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-700 transition hover:text-emerald-800"
        >
          <ArrowLeft size={14} />
          Back to home
        </Link>
        <h1 className="mt-4 text-3xl font-black tracking-tight text-emerald-950 sm:text-4xl">Blog</h1>
        <p className="mt-2 text-sm font-semibold text-slate-500">
          Latest guides for Nepalis building financial independence abroad.
        </p>

        <div id="blog" className="mt-8 space-y-4">
          {posts.map((post, index) => (
            <Link
              key={post.id}
              href={`/blog/${post.slug}`}
              className="flex gap-4 rounded-2xl border border-white/70 bg-white/75 p-4 shadow-sm backdrop-blur transition hover:-translate-y-1 hover:border-emerald-200"
            >
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-lg font-black text-emerald-700">
                {index + 1}
              </div>
              <div className="min-w-0">
                <p className="font-black text-emerald-950">{post.title}</p>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  {post.category}
                  {post.category && post.reading_time ? " - " : ""}
                  {post.reading_time}
                </p>
                {post.excerpt ? (
                  <p className="mt-2 line-clamp-2 text-sm font-medium text-slate-600">{post.excerpt}</p>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
