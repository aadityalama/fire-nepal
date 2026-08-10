import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { BlogPostMarkdown } from "@/components/blog-posts/BlogPostMarkdown";
import {
  fetchAllPublishedBlogPosts,
  fetchPublishedBlogPostBySlug,
} from "@/lib/blog-posts/fetch-public-posts";
import { HOMEPAGE_BLOG_SEED } from "@/lib/blog-posts/seed-posts";
import { buildCanonicalAlternates, FIRE_NEPAL_THEME_COLOR } from "@/lib/brand/site-seo";
import type { Viewport } from "next";

type PageProps = { params: Promise<{ slug: string }> };

export const viewport: Viewport = {
  themeColor: FIRE_NEPAL_THEME_COLOR,
};

export async function generateStaticParams() {
  try {
    const posts = await fetchAllPublishedBlogPosts();
    const slugs = new Set(posts.map((p) => p.slug));
    for (const seed of HOMEPAGE_BLOG_SEED) slugs.add(seed.slug);
    return [...slugs].map((slug) => ({ slug }));
  } catch {
    return HOMEPAGE_BLOG_SEED.map((p) => ({ slug: p.slug }));
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await fetchPublishedBlogPostBySlug(slug);
  if (!post) {
    return { title: "Blog post | FIRE Nepal" };
  }
  return {
    title: `${post.title} | FIRE Nepal`,
    description: post.excerpt || post.title,
    alternates: buildCanonicalAlternates(`/blog/${post.slug}`),
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await fetchPublishedBlogPostBySlug(slug);
  if (!post) notFound();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_20%_-10%,rgba(16,185,129,0.18),transparent_45%),linear-gradient(180deg,#f4fbf7_0%,#eef8f2_40%,#f8faf9_100%)] px-4 py-8 sm:px-6 sm:py-12">
      <article className="mx-auto max-w-2xl">
        <Link
          href="/blog"
          className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-700 transition hover:text-emerald-800"
        >
          <ArrowLeft size={14} />
          All posts
        </Link>

        <p className="mt-5 text-[11px] font-black uppercase tracking-[0.16em] text-emerald-700/70">
          {post.category || "Blog"}
          {post.reading_time ? ` · ${post.reading_time}` : ""}
        </p>
        <h1 className="mt-2 text-3xl font-black leading-tight tracking-tight text-emerald-950 sm:text-4xl">
          {post.title}
        </h1>
        {post.excerpt ? (
          <p className="mt-3 text-base font-semibold leading-relaxed text-slate-600">{post.excerpt}</p>
        ) : null}

        {post.cover_image_url ? (
          <div className="relative mt-6 aspect-[16/9] overflow-hidden rounded-2xl border border-white/70 bg-white/60 shadow-sm">
            <Image
              src={post.cover_image_url}
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 672px"
              unoptimized
            />
          </div>
        ) : null}

        <div className="mt-8 rounded-2xl border border-white/70 bg-white/75 p-5 shadow-sm backdrop-blur sm:p-7">
          <BlogPostMarkdown content={post.content} />
        </div>
      </article>
    </main>
  );
}
