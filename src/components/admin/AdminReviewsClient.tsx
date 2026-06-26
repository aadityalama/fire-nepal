"use client";

import { format, parseISO } from "date-fns";
import {
  BadgeCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  RotateCcw,
  Search,
  Star,
  Trash2,
  Upload,
  XCircle,
} from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { reviewInitials } from "@/lib/community-reviews/demo-reviews-seed";
import type {
  CommunityReviewAdminStats,
  CommunityReviewRow,
  CommunityReviewStatus,
} from "@/lib/community-reviews/types";

type FormState = {
  full_name: string;
  city: string;
  country: string;
  rating: number;
  review_title: string;
  review_text: string;
  verified: boolean;
  is_demo: boolean;
  status: CommunityReviewStatus;
  display_order: number;
};

const emptyForm: FormState = {
  full_name: "",
  city: "",
  country: "",
  rating: 5,
  review_title: "",
  review_text: "",
  verified: false,
  is_demo: false,
  status: "approved",
  display_order: 0,
};

function statusBadge(status: CommunityReviewStatus, deleted: boolean) {
  if (deleted) return "border-slate-500/40 bg-slate-800/50 text-slate-200";
  if (status === "approved") return "border-emerald-500/35 bg-emerald-500/15 text-emerald-200";
  if (status === "pending") return "border-amber-400/40 bg-amber-500/15 text-amber-100";
  return "border-rose-500/35 bg-rose-500/15 text-rose-100";
}

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  try {
    return format(parseISO(iso), "MMM d, yyyy");
  } catch {
    return iso;
  }
}

export function AdminReviewsClient() {
  const [reviews, setReviews] = useState<CommunityReviewRow[]>([]);
  const [stats, setStats] = useState<CommunityReviewAdminStats | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<CommunityReviewStatus | "all">("all");
  const [demoFilter, setDemoFilter] = useState<"all" | "true" | "false">("all");
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<CommunityReviewRow | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [avatarUploadId, setAvatarUploadId] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        status: statusFilter,
        is_demo: demoFilter,
      });
      if (search.trim()) params.set("search", search.trim());
      if (includeDeleted) params.set("include_deleted", "1");

      const r = await fetch(`/api/admin/community-reviews?${params}`, {
        credentials: "include",
        cache: "no-store",
      });
      const j = (await r.json().catch(() => ({}))) as {
        reviews?: CommunityReviewRow[];
        total?: number;
        stats?: CommunityReviewAdminStats;
        error?: string;
      };
      if (!r.ok) {
        toast.error(j.error ?? "Could not load reviews");
        setReviews([]);
        return;
      }
      setReviews(j.reviews ?? []);
      setTotal(j.total ?? 0);
      setStats(j.stats ?? null);
      setSelected(new Set());
    } catch {
      toast.error("Network error");
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, [page, limit, statusFilter, demoFilter, search, includeDeleted]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === reviews.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(reviews.map((r) => r.id)));
    }
  };

  const runAction = async (id: string, action: string, patch?: Partial<FormState>) => {
    setBusyId(id);
    try {
      const r = await fetch(`/api/admin/community-reviews/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch ? { ...patch, action } : { action }),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) {
        toast.error(j.error ?? "Action failed");
        return;
      }
      toast.success("Review updated");
      await load();
    } catch {
      toast.error("Network error");
    } finally {
      setBusyId(null);
    }
  };

  const runBulk = async (action: "approve" | "reject" | "soft_delete") => {
    const ids = [...selected];
    if (!ids.length) return;
    const label = action === "approve" ? "approve" : action === "reject" ? "reject" : "delete";
    if (!window.confirm(`${label} ${ids.length} review(s)?`)) return;
    setBusyId("bulk");
    try {
      const r = await fetch("/api/admin/community-reviews/bulk", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, action }),
      });
      const j = (await r.json().catch(() => ({}))) as { updated?: number; error?: string };
      if (!r.ok) {
        toast.error(j.error ?? "Bulk action failed");
        return;
      }
      toast.success(`Updated ${j.updated ?? 0} review(s)`);
      await load();
    } catch {
      toast.error("Network error");
    } finally {
      setBusyId(null);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, is_demo: true, verified: true, status: "approved" });
    setEditorOpen(true);
  };

  const openEdit = (row: CommunityReviewRow) => {
    setEditing(row);
    setForm({
      full_name: row.full_name,
      city: row.city ?? "",
      country: row.country ?? "",
      rating: row.rating,
      review_title: row.review_title,
      review_text: row.review_text,
      verified: row.verified,
      is_demo: row.is_demo,
      status: row.status,
      display_order: row.display_order,
    });
    setEditorOpen(true);
  };

  const saveEditor = async () => {
    if (!form.full_name.trim() || !form.review_title.trim() || !form.review_text.trim()) {
      toast.error("Name, title, and review text are required.");
      return;
    }
    setBusyId(editing?.id ?? "new");
    try {
      const payload = { ...form };
      const r = await fetch(editing ? `/api/admin/community-reviews/${editing.id}` : "/api/admin/community-reviews", {
        method: editing ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) {
        toast.error(j.error ?? "Could not save review");
        return;
      }
      toast.success(editing ? "Review saved" : "Review created");
      setEditorOpen(false);
      await load();
    } catch {
      toast.error("Network error");
    } finally {
      setBusyId(null);
    }
  };

  const uploadAvatar = async (reviewId: string, file: File) => {
    setAvatarUploadId(reviewId);
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("reviewId", reviewId);
      const r = await fetch("/api/admin/community-reviews/avatar", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) {
        toast.error(j.error ?? "Upload failed");
        return;
      }
      toast.success("Avatar uploaded");
      await load();
    } catch {
      toast.error("Network error");
    } finally {
      setAvatarUploadId(null);
    }
  };

  const statCards = useMemo(
    () => [
      { label: "Total", value: stats?.total ?? 0 },
      { label: "Pending", value: stats?.pending ?? 0 },
      { label: "Approved", value: stats?.approved ?? 0 },
      { label: "Rejected", value: stats?.rejected ?? 0 },
      { label: "Demo", value: stats?.demo ?? 0 },
      { label: "Real users", value: stats?.real ?? 0 },
    ],
    [stats],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white sm:text-3xl">Community Reviews</h1>
          <p className="mt-1 max-w-2xl text-sm text-emerald-100/70">
            Moderate homepage testimonials, demo reviews, and member submissions. Approved reviews appear on the homepage.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-black text-emerald-950 transition hover:bg-emerald-400"
        >
          <Plus size={16} />
          Add review
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4 backdrop-blur-sm"
          >
            <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-100/55">{card.label}</p>
            <p className="mt-1 text-2xl font-black text-white">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 backdrop-blur-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative min-w-0 flex-1">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-emerald-100/40" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search name, title, text, city, country…"
              className="w-full rounded-xl border border-white/10 bg-black/20 py-2.5 pl-9 pr-3 text-sm text-white outline-none placeholder:text-emerald-100/35 focus:border-emerald-500/40"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as CommunityReviewStatus | "all");
                setPage(1);
              }}
              className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm font-bold text-emerald-50"
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <select
              value={demoFilter}
              onChange={(e) => {
                setDemoFilter(e.target.value as "all" | "true" | "false");
                setPage(1);
              }}
              className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm font-bold text-emerald-50"
            >
              <option value="all">All types</option>
              <option value="true">Demo only</option>
              <option value="false">Real users</option>
            </select>
            <label className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-xs font-bold text-emerald-50">
              <input
                type="checkbox"
                checked={includeDeleted}
                onChange={(e) => {
                  setIncludeDeleted(e.target.checked);
                  setPage(1);
                }}
              />
              Show deleted
            </label>
          </div>
        </div>

        {selected.size > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2 border-t border-white/[0.06] pt-3">
            <span className="self-center text-xs font-bold text-emerald-100/70">{selected.size} selected</span>
            <button
              type="button"
              onClick={() => void runBulk("approve")}
              className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-100"
            >
              Bulk approve
            </button>
            <button
              type="button"
              onClick={() => void runBulk("reject")}
              className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-100"
            >
              Bulk reject
            </button>
            <button
              type="button"
              onClick={() => void runBulk("soft_delete")}
              className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-100"
            >
              Bulk delete
            </button>
          </div>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-sm">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm font-bold text-emerald-100/70">
            <Loader2 size={18} className="animate-spin" />
            Loading reviews…
          </div>
        ) : reviews.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm font-black text-white">No reviews found</p>
            <p className="mt-1 text-xs text-emerald-100/60">Try changing filters or add a new review.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-white/[0.06] bg-black/20 text-[11px] font-black uppercase tracking-wide text-emerald-100/55">
                <tr>
                  <th className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={selected.size === reviews.length && reviews.length > 0}
                      onChange={toggleSelectAll}
                      aria-label="Select all"
                    />
                  </th>
                  <th className="px-3 py-3">Reviewer</th>
                  <th className="px-3 py-3">Review</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Order</th>
                  <th className="px-3 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((row) => {
                  const deleted = Boolean(row.deleted_at);
                  const busy = busyId === row.id;
                  return (
                    <tr key={row.id} className="border-b border-white/[0.04] align-top hover:bg-white/[0.02]">
                      <td className="px-3 py-4">
                        <input
                          type="checkbox"
                          checked={selected.has(row.id)}
                          onChange={() => toggleSelect(row.id)}
                          aria-label={`Select ${row.full_name}`}
                        />
                      </td>
                      <td className="px-3 py-4">
                        <div className="flex items-start gap-3">
                          {row.avatar_url ? (
                            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full">
                              <Image src={row.avatar_url} alt="" fill className="object-cover" sizes="40px" />
                            </div>
                          ) : (
                            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-700 text-xs font-black text-white">
                              {reviewInitials(row.full_name)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-black text-white">{row.full_name}</p>
                            <p className="text-xs text-emerald-100/60">
                              {[row.city, row.country].filter(Boolean).join(", ") || "—"}
                            </p>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {row.verified ? (
                                <span className="inline-flex items-center gap-0.5 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-200">
                                  <BadgeCheck size={10} /> Verified
                                </span>
                              ) : null}
                              {row.is_demo ? (
                                <span className="rounded bg-violet-500/15 px-1.5 py-0.5 text-[10px] font-bold text-violet-200">
                                  Demo
                                </span>
                              ) : (
                                <span className="rounded bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-bold text-sky-200">
                                  Member
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="max-w-xs px-3 py-4">
                        <div className="mb-1 flex gap-0.5 text-amber-300">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} size={12} fill={i < row.rating ? "currentColor" : "none"} />
                          ))}
                        </div>
                        <p className="font-bold text-emerald-50">{row.review_title}</p>
                        <p className="mt-1 line-clamp-2 text-xs text-emerald-100/65">{row.review_text}</p>
                        <p className="mt-1 text-[10px] text-emerald-100/45">{formatWhen(row.created_at)}</p>
                      </td>
                      <td className="px-3 py-4">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${statusBadge(row.status, deleted)}`}
                        >
                          {deleted ? "Deleted" : row.status}
                        </span>
                      </td>
                      <td className="px-3 py-4 font-mono text-xs text-emerald-100/80">{row.display_order}</td>
                      <td className="px-3 py-4">
                        <div className="flex min-w-[220px] flex-wrap gap-1.5">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => openEdit(row)}
                            className="rounded-lg border border-white/10 px-2 py-1 text-[11px] font-bold text-emerald-100 hover:bg-white/[0.06]"
                          >
                            Edit
                          </button>
                          {!deleted && row.status !== "approved" ? (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void runAction(row.id, "approve")}
                              className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[11px] font-bold text-emerald-100"
                            >
                              {busy ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                              Approve
                            </button>
                          ) : null}
                          {!deleted && row.status === "approved" ? (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void runAction(row.id, "unpublish")}
                              className="rounded-lg border border-amber-500/30 px-2 py-1 text-[11px] font-bold text-amber-100"
                            >
                              Unpublish
                            </button>
                          ) : null}
                          {!deleted && row.status !== "rejected" ? (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void runAction(row.id, "reject")}
                              className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 px-2 py-1 text-[11px] font-bold text-rose-100"
                            >
                              <XCircle size={12} /> Reject
                            </button>
                          ) : null}
                          {deleted ? (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void runAction(row.id, "restore")}
                              className="inline-flex items-center gap-1 rounded-lg border border-sky-500/30 px-2 py-1 text-[11px] font-bold text-sky-100"
                            >
                              <RotateCcw size={12} /> Restore
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => {
                                if (window.confirm(`Delete review by ${row.full_name}?`)) {
                                  void runAction(row.id, "soft_delete");
                                }
                              }}
                              className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 px-2 py-1 text-[11px] font-bold text-rose-100"
                            >
                              <Trash2 size={12} /> Delete
                            </button>
                          )}
                          <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-[11px] font-bold text-emerald-100 hover:bg-white/[0.06]">
                            {avatarUploadId === row.id ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <Upload size={12} />
                            )}
                            Avatar
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) void uploadAvatar(row.id, file);
                                e.currentTarget.value = "";
                              }}
                            />
                          </label>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold text-emerald-100/60">
          Page {page} of {totalPages} · {total} total
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="inline-flex items-center gap-1 rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-emerald-100 disabled:opacity-40"
          >
            <ChevronLeft size={14} /> Prev
          </button>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="inline-flex items-center gap-1 rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-emerald-100 disabled:opacity-40"
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {editorOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-[#071510] p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-black text-white">{editing ? "Edit review" : "Add review"}</h2>
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                className="rounded-lg border border-white/10 px-2 py-1 text-xs font-bold text-emerald-100"
              >
                Close
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="text-xs font-bold text-emerald-100/70">Full name</span>
                <input
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                  value={form.full_name}
                  onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                />
              </label>
              <label className="block">
                <span className="text-xs font-bold text-emerald-100/70">City</span>
                <input
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                  value={form.city}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                />
              </label>
              <label className="block">
                <span className="text-xs font-bold text-emerald-100/70">Country</span>
                <input
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                  value={form.country}
                  onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                />
              </label>
              <label className="block">
                <span className="text-xs font-bold text-emerald-100/70">Rating</span>
                <select
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                  value={form.rating}
                  onChange={(e) => setForm((f) => ({ ...f, rating: Number(e.target.value) }))}
                >
                  {[5, 4, 3, 2, 1].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-bold text-emerald-100/70">Display order</span>
                <input
                  type="number"
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                  value={form.display_order}
                  onChange={(e) => setForm((f) => ({ ...f, display_order: Number(e.target.value) }))}
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="text-xs font-bold text-emerald-100/70">Review title</span>
                <input
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                  value={form.review_title}
                  onChange={(e) => setForm((f) => ({ ...f, review_title: e.target.value }))}
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="text-xs font-bold text-emerald-100/70">Review text</span>
                <textarea
                  rows={4}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                  value={form.review_text}
                  onChange={(e) => setForm((f) => ({ ...f, review_text: e.target.value }))}
                />
              </label>
              <label className="block">
                <span className="text-xs font-bold text-emerald-100/70">Status</span>
                <select
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as CommunityReviewStatus }))}
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </label>
              <div className="flex flex-col justify-end gap-2">
                <label className="inline-flex items-center gap-2 text-sm font-bold text-emerald-50">
                  <input
                    type="checkbox"
                    checked={form.verified}
                    onChange={(e) => setForm((f) => ({ ...f, verified: e.target.checked }))}
                  />
                  Verified badge
                </label>
                <label className="inline-flex items-center gap-2 text-sm font-bold text-emerald-50">
                  <input
                    type="checkbox"
                    checked={form.is_demo}
                    onChange={(e) => setForm((f) => ({ ...f, is_demo: e.target.checked }))}
                  />
                  Demo review
                </label>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busyId === (editing?.id ?? "new")}
                onClick={() => void saveEditor()}
                className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-black text-emerald-950 hover:bg-emerald-400 disabled:opacity-60"
              >
                {busyId === (editing?.id ?? "new") ? "Saving…" : "Save review"}
              </button>
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-emerald-100"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
