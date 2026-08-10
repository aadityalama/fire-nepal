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
import {
  extractYoutubeVideoId,
  youtubeThumbnailUrl,
} from "@/lib/youtube-videos/parse-youtube-url";
import type {
  YoutubeVideoAdminStats,
  YoutubeVideoRow,
  YoutubeVideoStatus,
} from "@/lib/youtube-videos/types";

type FormState = {
  title: string;
  youtube_url: string;
  duration: string;
  display_order: number;
  status: YoutubeVideoStatus;
};

const emptyForm: FormState = {
  title: "",
  youtube_url: "",
  duration: "",
  display_order: 0,
  status: "published",
};

function statusBadge(status: YoutubeVideoStatus, deleted: boolean) {
  if (deleted) return "border-slate-500/40 bg-slate-800/50 text-slate-200";
  if (status === "published") return "border-emerald-500/35 bg-emerald-500/15 text-emerald-200";
  return "border-amber-400/40 bg-amber-500/15 text-amber-100";
}

export function AdminYoutubeVideosPanel() {
  const [videos, setVideos] = useState<YoutubeVideoRow[]>([]);
  const [stats, setStats] = useState<YoutubeVideoAdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<YoutubeVideoStatus | "all">("all");
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<YoutubeVideoRow | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const previewThumb = useMemo(() => {
    const id = extractYoutubeVideoId(form.youtube_url);
    return id ? youtubeThumbnailUrl(id) : "";
  }, [form.youtube_url]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status: statusFilter });
      if (includeDeleted) params.set("include_deleted", "1");
      const r = await fetch(`/api/admin/youtube-videos?${params}`, {
        credentials: "include",
        cache: "no-store",
      });
      const j = (await r.json().catch(() => ({}))) as {
        videos?: YoutubeVideoRow[];
        stats?: YoutubeVideoAdminStats;
        error?: string;
      };
      if (!r.ok) {
        toast.error(j.error ?? "Could not load videos");
        setVideos([]);
        return;
      }
      setVideos(j.videos ?? []);
      setStats(j.stats ?? null);
    } catch {
      toast.error("Network error");
      setVideos([]);
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
    const nextOrder = (stats?.total ?? videos.length) + 1;
    setEditing(null);
    setForm({ ...emptyForm, display_order: nextOrder, status: "published" });
    setEditorOpen(true);
  };

  const openEdit = (row: YoutubeVideoRow) => {
    setEditing(row);
    setForm({
      title: row.title,
      youtube_url: row.youtube_url,
      duration: row.duration,
      display_order: row.display_order,
      status: row.status,
    });
    setEditorOpen(true);
  };

  const saveEditor = async () => {
    if (!form.title.trim() || !form.youtube_url.trim()) {
      toast.error("Title and YouTube URL are required.");
      return;
    }
    setBusyId(editing?.id ?? "new");
    try {
      const r = await fetch(editing ? `/api/admin/youtube-videos/${editing.id}` : "/api/admin/youtube-videos", {
        method: editing ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) {
        toast.error(j.error ?? "Could not save video");
        return;
      }
      toast.success(editing ? "Video saved" : "Video added");
      setEditorOpen(false);
      await load();
    } catch {
      toast.error("Network error");
    } finally {
      setBusyId(null);
    }
  };

  const runAction = async (id: string, action: "publish" | "unpublish" | "soft_delete" | "restore") => {
    if (action === "soft_delete" && !window.confirm("Delete this video? It will be removed from the homepage.")) {
      return;
    }
    setBusyId(id);
    try {
      const r = await fetch(`/api/admin/youtube-videos/${id}`, {
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

  const moveVideo = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= videos.length) return;
    const next = [...videos];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    setVideos(next);
    setBusyId(item.id);
    try {
      const r = await fetch("/api/admin/youtube-videos/reorder", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds: next.map((v) => v.id) }),
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
        <div>
          <p className="text-sm font-semibold text-emerald-100/75">
            Manage homepage Latest YouTube Videos. Published videos appear on the marketing homepage.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-black text-emerald-950 transition hover:bg-emerald-400"
        >
          <Plus size={14} />
          Add video
        </button>
      </div>

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
            Loading videos…
          </div>
        ) : videos.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm font-black text-white">No videos yet</p>
            <p className="mt-1 text-xs text-emerald-100/60">Add a YouTube URL to publish it on the homepage.</p>
          </div>
        ) : (
          <ul className="divide-y divide-white/[0.06]">
            {videos.map((video, index) => {
              const deleted = Boolean(video.deleted_at);
              const busy = busyId === video.id;
              return (
                <li key={video.id} className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
                  <div className="relative h-16 w-28 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-black/40">
                    {video.thumbnail_url ? (
                      <Image
                        src={video.thumbnail_url}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="112px"
                        unoptimized
                      />
                    ) : (
                      <div className="grid h-full place-items-center text-[10px] font-bold text-emerald-100/40">
                        No thumb
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-black text-white">{video.title}</p>
                      <span
                        className={`rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${statusBadge(video.status, deleted)}`}
                      >
                        {deleted ? "Deleted" : video.status}
                      </span>
                      <span className="text-[10px] font-bold text-emerald-100/45">#{video.display_order}</span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-emerald-100/55">
                      {video.duration ? `${video.duration} · ` : ""}
                      {video.youtube_url}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      disabled={busy || index === 0 || deleted}
                      onClick={() => void moveVideo(index, -1)}
                      className="rounded-lg border border-white/10 bg-white/[0.04] p-1.5 text-emerald-100 disabled:opacity-30"
                      aria-label="Move up"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      type="button"
                      disabled={busy || index === videos.length - 1 || deleted}
                      onClick={() => void moveVideo(index, 1)}
                      className="rounded-lg border border-white/10 bg-white/[0.04] p-1.5 text-emerald-100 disabled:opacity-30"
                      aria-label="Move down"
                    >
                      <ArrowDown size={14} />
                    </button>
                    <a
                      href={video.youtube_url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-white/10 bg-white/[0.04] p-1.5 text-emerald-100"
                      aria-label="Open on YouTube"
                    >
                      <ExternalLink size={14} />
                    </a>
                    <button
                      type="button"
                      disabled={busy || deleted}
                      onClick={() => openEdit(video)}
                      className="rounded-lg border border-white/10 bg-white/[0.04] p-1.5 text-emerald-100 disabled:opacity-30"
                      aria-label="Edit"
                    >
                      <Pencil size={14} />
                    </button>
                    {!deleted && video.status !== "published" ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void runAction(video.id, "publish")}
                        className="rounded-lg border border-emerald-500/30 bg-emerald-500/15 px-2 py-1 text-[11px] font-bold text-emerald-100"
                      >
                        Publish
                      </button>
                    ) : null}
                    {!deleted && video.status === "published" ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void runAction(video.id, "unpublish")}
                        className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[11px] font-bold text-amber-100"
                      >
                        Unpublish
                      </button>
                    ) : null}
                    {deleted ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void runAction(video.id, "restore")}
                        className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[11px] font-bold text-emerald-100"
                      >
                        Restore
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void runAction(video.id, "soft_delete")}
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
            aria-labelledby="yt-video-editor-title"
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-[#061510] shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
              <h3 id="yt-video-editor-title" className="text-sm font-black text-white">
                {editing ? "Edit YouTube video" : "Add YouTube video"}
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
            <div className="space-y-3 px-4 py-4">
              <label className="block space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wide text-emerald-100/55">Title</span>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500/40"
                  placeholder="Overseas income to FIRE strategy"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wide text-emerald-100/55">YouTube URL</span>
                <input
                  value={form.youtube_url}
                  onChange={(e) => setForm((f) => ({ ...f, youtube_url: e.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500/40"
                  placeholder="https://www.youtube.com/watch?v=…"
                />
              </label>
              {previewThumb ? (
                <div className="relative h-36 overflow-hidden rounded-xl border border-white/10">
                  <Image src={previewThumb} alt="" fill className="object-cover" sizes="480px" unoptimized />
                  <span className="absolute bottom-2 left-2 rounded-md bg-black/70 px-2 py-0.5 text-[10px] font-bold text-white">
                    Auto thumbnail
                  </span>
                </div>
              ) : null}
              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-emerald-100/55">Duration</span>
                  <input
                    value={form.duration}
                    onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500/40"
                    placeholder="9:05"
                  />
                </label>
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
              </div>
              <label className="block space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wide text-emerald-100/55">Status</span>
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as YoutubeVideoStatus }))}
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm font-bold text-emerald-50"
                >
                  <option value="published">Published</option>
                  <option value="draft">Draft (unpublished)</option>
                </select>
              </label>
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
                {editing ? "Save changes" : "Add video"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
