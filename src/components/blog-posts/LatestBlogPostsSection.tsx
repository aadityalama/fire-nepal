import Link from "next/link";
import { fetchPublishedBlogPosts } from "@/lib/blog-posts/fetch-public-posts";

/** Homepage Latest Blog Posts — numbered cards matching existing FIRE Nepal design. */
export async function LatestBlogPostsSection() {
  const posts = await fetchPublishedBlogPosts(3);

  return (
    <div className="space-y-4">
      {posts.map((post, index) => (
        <Link
          key={post.id}
          href={`/blog/${post.slug}`}
          className="flex gap-4 rounded-2xl border border-white/60 bg-white/70 p-3 shadow-sm backdrop-blur transition hover:-translate-y-1"
        >
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-lg font-black text-emerald-700">
            {index + 1}
          </div>
          <div>
            <p className="font-black text-emerald-950">{post.title}</p>
            <p className="mt-1 text-xs font-bold text-slate-500">
              {post.category}
              {post.category && post.reading_time ? " - " : ""}
              {post.reading_time}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
