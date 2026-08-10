"use client";

import {
  ArrowDown,
  ArrowUp,
  ExternalLink,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { slugifyBlogTitle } from "@/lib/blog-posts/slug";
import type { BlogPostAdminStats, BlogPostRow, BlogPostStatus } from "@/lib/blog-posts/types";

type FormState = {
  title: string;
  slug: string;
  category: string;
  reading_time: string;
  excerpt: string;
  content: string;
  cover_image_url: string;
  display_order: number;
  status: BlogPostStatus;
};

const emptyForm: FormState = {
  title: "",
  slug: "",
  category: "",
  reading_time: "",
  excerpt: "",
  content: "",
  cover_image_url: "",
  display_order: 0,
  status: "published",
};

function statusBadge(status: BlogPostStatus, deleted: boolean) {
  if (deleted) return "border-slate-500/40 bg-slate-800/50 text-slate-200";
  if (status === "published") return "border-emerald-500/35 bg-emerald-500/15 text-emerald-200";
  return "border-amber-400/40 bg-amber-500/15 text-amber-100";
}

export function AdminBlogPostsPanel() {
  const [posts, setPosts] = useState<BlogPostRow[]>([]);
  const [stats, setStats] = useState<BlogPostAdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<BlogPostStatus | "all">("all");
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<BlogPostRow | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [slugTouched, setSlugTouched] = useState(false);
  const [coverUploadId, setCoverUploadId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const params = new URLSearchParams({ status: statusFilter });
      if (includeDeleted) params.set("include_deleted", "1");
      const r = await fetch(`/api/admin/blog-posts?${params}`, {
        credentials: "include",
        cache: "no-store",
      });
      const j = (await r.json().catch(() => ({}))) as {
        posts?: BlogPostRow[];
        stats?: BlogPostAdminStats;
        error?: string;
      };
      if (!r.ok) {
        const msg = j.error ?? "Could not load blog posts";
        setLoadError(msg);
        toast.error(msg);
        setPosts([]);
        return;
      }
      setPosts(j.posts ?? []);
      setStats(j.stats ?? null);
    } catch {
      setLoadError("Network error");
      toast.error("Network error");
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, includeDeleted]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void load();
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  const openCreate = () => {
    const nextOrder = (stats?.total ?? posts.length) + 1;
    setEditing(null);
    setSlugTouched(false);
    setForm({ ...emptyForm, display_order: nextOrder, status: "published" });
    setEditorOpen(true);
  };

  const openEdit = (row: BlogPostRow) => {
    setEditing(row);
    setSlugTouched(true);
    setForm({
      title: row.title,
      slug: row.slug,
      category: row.category,
      reading_time: row.reading_time,
      excerpt: row.excerpt,
      content: row.content,
      cover_image_url: row.cover_image_url ?? "",
      display_order: row.display_order,
      status: row.status,
    });
    setEditorOpen(true);
  };

  const saveEditor = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      toast.error("Title and content are required.");
      return;
    }
    setBusyId(editing?.id ?? "new");
    try {
      const payload = {
        ...form,
        cover_image_url: form.cover_image_url.trim() || null,
        slug: form.slug.trim() || undefined,
      };
      const r = await fetch(editing ? `/api/admin/blog-posts/${editing.id}` : "/api/admin/blog-posts", {
        method: editing ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string; post?: BlogPostRow };
      if (!r.ok) {
        toast.error(j.error ?? "Could not save post");
        return;
      }
      toast.success(editing ? "Post saved" : "Post created");
      setEditorOpen(false);
      await load();
    } catch {
      toast.error("Network error");
    } finally {
      setBusyId(null);
    }
  };

  const runAction = async (id: string, action: "publish" | "unpublish" | "soft_delete" | "restore") => {
    if (action === "soft_delete" && !window.confirm("Delete this blog post? It will leave the homepage.")) {
      return;
    }
    setBusyId(id);
    try {
      const r = await fetch(`/api/admin/blog-posts/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) {
        toast.error(j.error ?? "Action failed");
        return;
      }
      toast.success(
        action === "publish"
          ? "Published"
          : action === "unpublish"
            ? "Unpublished"
            : action === "restore"
              ? "Restored"
              : "Deleted",
      );
      await load();
    } catch {
      toast.error("Network error");
    } finally {
      setBusyId(null);
    }
  };

  const movePost = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= posts.length) return;
    const next = [...posts];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    setPosts(next);
    setBusyId(item.id);
    try {
      const r = await fetch("/api/admin/blog-posts/reorder", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds: next.map((p) => p.id) }),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) {
        toast.error(j.error ?? "Could not reorder");
        await load();
        return;
      }
      toast.success("Order updated");
      await load();
    } catch {
      toast.error("Network error");
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const uploadCover = async (postId: string, file: File) => {
    setCoverUploadId(postId);
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("postId", postId);
      const r = await fetch("/api/admin/blog-posts/cover", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const j = (await r.json().catch(() => ({}))) as { cover_image_url?: string; error?: string };
      if (!r.ok) {
        toast.error(j.error ?? "Upload failed");
        return;
      }
      toast.success("Cover uploaded");
      if (editing?.id === postId && j.cover_image_url) {
        setForm((f) => ({ ...f, cover_image_url: j.cover_image_url ?? "" }));
      }
      await load();
    } catch {
      toast.error("Network error");
    } finally {
      setCoverUploadId(null);
    }
  };

  const statCards = useMemo(
    () => [
      { label: "Total", value: stats?.total ?? 0 },
      { label: "Published", value: stats?.published ?? 0 },
      { label: "Draft", value: stats?.draft ?? 0 },
    ],
    [stats],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="text-sm font-semibold text-emerald-100/75">
          Manage homepage Latest Blog Posts. Published posts appear as numbered cards and open at{" "}
          <code className="rounded bg-black/30 px-1 text-[11px]">/blog/[slug]</code>.
        </p>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-black text-emerald-950 transition hover:bg-emerald-400"
        >
          <Plus size={14} />
          Add post
        </button>
      </div>

      {loadError ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-xs font-semibold text-amber-100">
          {loadError}
        </div>
      ) : null}

      <div className="grid grid-cols-3 gap-2">
        {statCards.map((card) => (
          <div key={card.label} className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-100/55">{card.label}</p>
            <p className="mt-0.5 text-xl font-black text-white">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            ["all", "All"],
            ["published", "Published"],
            ["draft", "Draft"],
          ] as const
        ).map(([id, label]) => {
          const active = statusFilter === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setStatusFilter(id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                active
                  ? "bg-emerald-500 text-emerald-950"
                  : "border border-white/10 bg-black/20 text-emerald-50 hover:bg-white/[0.06]"
              }`}
            >
              {label}
            </button>
          );
        })}
        <label className="ml-auto inline-flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-1.5 text-[11px] font-bold text-emerald-50">
          <input
            type="checkbox"
            checked={includeDeleted}
            onChange={(e) => setIncludeDeleted(e.target.checked)}
          />
          Show deleted
        </label>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-black/15">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm font-bold text-emerald-100/70">
            <Loader2 size={16} className="animate-spin" />
            Loading posts…
          </div>
        ) : posts.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm font-black text-white">No blog posts yet</p>
            <p className="mt-1 text-xs text-emerald-100/60">Create a post and publish it to the homepage.</p>
          </div>
        ) : (
          <ul className="divide-y divide-white/[0.06]">
            {posts.map((post, index) => {
              const deleted = Boolean(post.deleted_at);
              const busy = busyId === post.id;
              return (
                <li key={post.id} className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-emerald-500/15 text-sm font-black text-emerald-200">
                    {post.display_order || index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-black text-white">{post.title}</p>
                      <span
                        className={`rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${statusBadge(post.status, deleted)}`}
                      >
                        {deleted ? "Deleted" : post.status}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-emerald-100/55">
                      {post.category || "Uncategorized"}
                      {post.reading_time ? ` · ${post.reading_time}` : ""}
                      {" · "}/blog/{post.slug}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      disabled={busy || index === 0 || deleted}
                      onClick={() => void movePost(index, -1)}
                      className="rounded-lg border border-white/10 bg-white/[0.04] p-1.5 text-emerald-100 disabled:opacity-30"
                      aria-label="Move up"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      type="button"
                      disabled={busy || index === posts.length - 1 || deleted}
                      onClick={() => void movePost(index, 1)}
                      className="rounded-lg border border-white/10 bg-white/[0.04] p-1.5 text-emerald-100 disabled:opacity-30"
                      aria-label="Move down"
                    >
                      <ArrowDown size={14} />
                    </button>
                    <a
                      href={`/blog/${post.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-white/10 bg-white/[0.04] p-1.5 text-emerald-100"
                      aria-label="Open post"
                    >
                      <ExternalLink size={14} />
                    </a>
                    <button
                      type="button"
                      disabled={busy || deleted}
                      onClick={() => openEdit(post)}
                      className="rounded-lg border border-white/10 bg-white/[0.04] p-1.5 text-emerald-100 disabled:opacity-30"
                      aria-label="Edit"
                    >
                      <Pencil size={14} />
                    </button>
                    {!deleted && post.status !== "published" ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void runAction(post.id, "publish")}
                        className="rounded-lg border border-emerald-500/30 bg-emerald-500/15 px-2 py-1 text-[11px] font-bold text-emerald-100"
                      >
                        Publish
                      </button>
                    ) : null}
                    {!deleted && post.status === "published" ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void runAction(post.id, "unpublish")}
                        className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[11px] font-bold text-amber-100"
                      >
                        Unpublish
                      </button>
                    ) : null}
                    {deleted ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void runAction(post.id, "restore")}
                        className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[11px] font-bold text-emerald-100"
                      >
                        Restore
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void runAction(post.id, "soft_delete")}
                        className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-1.5 text-rose-100"
                        aria-label="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {editorOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-end bg-black/60 p-3 sm:place-items-center sm:p-6">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="blog-post-editor-title"
            className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#061510] shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
              <h3 id="blog-post-editor-title" className="text-sm font-black text-white">
                {editing ? "Edit blog post" : "Create blog post"}
              </h3>
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                className="rounded-lg p-1.5 text-emerald-100/70 hover:bg-white/5"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3 overflow-y-auto px-4 py-4">
              <label className="block space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wide text-emerald-100/55">Title</span>
                <input
                  value={form.title}
                  onChange={(e) => {
                    const title = e.target.value;
                    setForm((f) => ({
                      ...f,
                      title,
                      slug: slugTouched ? f.slug : slugifyBlogTitle(title),
                    }));
                  }}
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500/40"
                  placeholder="How to invest your abroad salary for Nepal goals"
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-emerald-100/55">Category</span>
                  <input
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500/40"
                    placeholder="Money guide"
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-emerald-100/55">Reading time</span>
                  <input
                    value={form.reading_time}
                    onChange={(e) => setForm((f) => ({ ...f, reading_time: e.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500/40"
                    placeholder="5 min read"
                  />
                </label>
              </div>
              <label className="block space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wide text-emerald-100/55">Slug</span>
                <input
                  value={form.slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setForm((f) => ({ ...f, slug: e.target.value }));
                  }}
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500/40"
                  placeholder="how-to-invest-your-abroad-salary-for-nepal-goals"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wide text-emerald-100/55">Excerpt</span>
                <input
                  value={form.excerpt}
                  onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500/40"
                  placeholder="Short summary for listings"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wide text-emerald-100/55">Content (Markdown)</span>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                  rows={10}
                  className="w-full resize-y rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 font-mono text-xs leading-relaxed text-white outline-none focus:border-emerald-500/40"
                  placeholder="## Heading&#10;&#10;Write the full blog post…"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wide text-emerald-100/55">
                  Cover image URL (optional)
                </span>
                <input
                  value={form.cover_image_url}
                  onChange={(e) => setForm((f) => ({ ...f, cover_image_url: e.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500/40"
                  placeholder="https://…"
                />
              </label>
              {form.cover_image_url ? (
                <div className="relative h-36 overflow-hidden rounded-xl border border-white/10">
                  <Image src={form.cover_image_url} alt="" fill className="object-cover" sizes="640px" unoptimized />
                </div>
              ) : null}
              {editing ? (
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-emerald-100">
                  <Upload size={14} />
                  {coverUploadId === editing.id ? "Uploading…" : "Upload cover image"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    disabled={coverUploadId === editing.id}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void uploadCover(editing.id, file);
                      e.target.value = "";
                    }}
                  />
                </label>
              ) : (
                <p className="text-[11px] text-emerald-100/50">Save the post first to upload a cover file.</p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-emerald-100/55">Order</span>
                  <input
                    type="number"
                    value={form.display_order}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, display_order: Number(e.target.value) || 0 }))
                    }
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500/40"
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-emerald-100/55">Status</span>
                  <select
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as BlogPostStatus }))}
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm font-bold text-emerald-50"
                  >
                    <option value="published">Published</option>
                    <option value="draft">Draft (unpublished)</option>
                  </select>
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-white/[0.06] px-4 py-3">
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                className="rounded-xl border border-white/10 px-3.5 py-2 text-xs font-bold text-emerald-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busyId === (editing?.id ?? "new")}
                onClick={() => void saveEditor()}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-black text-emerald-950 disabled:opacity-60"
              >
                {busyId === (editing?.id ?? "new") ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                {editing ? "Save changes" : "Create post"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
