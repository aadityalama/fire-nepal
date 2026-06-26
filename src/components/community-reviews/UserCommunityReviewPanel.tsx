"use client";

import { Loader2, MessageSquarePlus, Pencil, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useProductAuth } from "@/contexts/ProductAuthContext";
import type { CommunityReviewRow } from "@/lib/community-reviews/types";

type FormState = {
  full_name: string;
  city: string;
  country: string;
  rating: number;
  review_title: string;
  review_text: string;
};

const emptyForm: FormState = {
  full_name: "",
  city: "",
  country: "",
  rating: 5,
  review_title: "",
  review_text: "",
};

export function UserCommunityReviewPanel() {
  const { user } = useProductAuth();
  const [review, setReview] = useState<CommunityReviewRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

  const load = useCallback(async () => {
    if (!user) {
      setReview(null);
      return;
    }
    setLoading(true);
    try {
      const r = await fetch("/api/community-reviews/mine", { credentials: "include", cache: "no-store" });
      const j = (await r.json().catch(() => ({}))) as { review?: CommunityReviewRow | null; error?: string };
      if (!r.ok) {
        if (r.status !== 401) toast.error(j.error ?? "Could not load your review");
        setReview(null);
        return;
      }
      setReview(j.review ?? null);
      if (j.review) {
        setForm({
          full_name: j.review.full_name,
          city: j.review.city ?? "",
          country: j.review.country ?? "",
          rating: j.review.rating,
          review_title: j.review.review_title,
          review_text: j.review.review_text,
        });
      }
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!user) return null;

  const submit = async () => {
    if (!form.full_name.trim() || !form.review_title.trim() || !form.review_text.trim()) {
      toast.error("Please fill in your name, title, and review.");
      return;
    }
    setSaving(true);
    try {
      const isEdit = Boolean(review?.id);
      const r = await fetch(isEdit ? `/api/community-reviews/${review!.id}` : "/api/community-reviews/mine", {
        method: isEdit ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const j = (await r.json().catch(() => ({}))) as { review?: CommunityReviewRow; error?: string };
      if (!r.ok) {
        toast.error(j.error ?? "Could not save review");
        return;
      }
      setReview(j.review ?? null);
      setOpen(false);
      toast.success(isEdit ? "Review updated — pending admin approval" : "Review submitted — pending approval");
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!review?.id) return;
    if (!window.confirm("Delete your review? This cannot be undone.")) return;
    setSaving(true);
    try {
      const r = await fetch(`/api/community-reviews/${review.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) {
        toast.error(j.error ?? "Could not delete review");
        return;
      }
      setReview(null);
      setForm(emptyForm);
      setOpen(false);
      toast.success("Review deleted");
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mb-5 rounded-[1.25rem] border border-emerald-100/80 bg-white/70 p-4 backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black text-emerald-950">Share your FIRE Nepal experience</p>
          <p className="text-xs font-semibold text-slate-500">
            {review
              ? review.status === "approved"
                ? "Your review is live on the homepage."
                : review.status === "pending"
                  ? "Your review is pending admin approval."
                  : "Your review was not approved. You can edit and resubmit."
              : "Logged-in members can submit one community review."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {loading ? (
            <span className="inline-flex items-center gap-2 text-xs font-bold text-emerald-700">
              <Loader2 size={14} className="animate-spin" /> Loading…
            </span>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-full bg-emerald-700 px-4 py-2 text-xs font-black text-white transition hover:bg-emerald-800"
              >
                {review ? <Pencil size={14} /> : <MessageSquarePlus size={14} />}
                {review ? "Edit review" : "Write a review"}
              </button>
              {review ? (
                <button
                  type="button"
                  onClick={() => void remove()}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-black text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              ) : null}
            </>
          )}
        </div>
      </div>

      {open ? (
        <div className="mt-4 grid gap-3 border-t border-emerald-100/80 pt-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-xs font-bold text-slate-600">Full name</span>
            <input
              className="mt-1 w-full rounded-xl border border-emerald-100 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              value={form.full_name}
              onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold text-slate-600">City</span>
            <input
              className="mt-1 w-full rounded-xl border border-emerald-100 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              value={form.city}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold text-slate-600">Country</span>
            <input
              className="mt-1 w-full rounded-xl border border-emerald-100 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              value={form.country}
              onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-xs font-bold text-slate-600">Rating</span>
            <select
              className="mt-1 w-full rounded-xl border border-emerald-100 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600"
              value={form.rating}
              onChange={(e) => setForm((f) => ({ ...f, rating: Number(e.target.value) }))}
            >
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n} star{n === 1 ? "" : "s"}
                </option>
              ))}
            </select>
          </label>
          <label className="block sm:col-span-2">
            <span className="text-xs font-bold text-slate-600">Review title</span>
            <input
              className="mt-1 w-full rounded-xl border border-emerald-100 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              value={form.review_title}
              onChange={(e) => setForm((f) => ({ ...f, review_title: e.target.value }))}
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-xs font-bold text-slate-600">Review text</span>
            <textarea
              rows={4}
              className="mt-1 w-full rounded-xl border border-emerald-100 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              value={form.review_text}
              onChange={(e) => setForm((f) => ({ ...f, review_text: e.target.value }))}
            />
          </label>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => void submit()}
              className="rounded-full bg-emerald-700 px-5 py-2 text-xs font-black text-white hover:bg-emerald-800 disabled:opacity-60"
            >
              {saving ? "Saving…" : review ? "Update review" : "Submit review"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full border border-slate-200 px-5 py-2 text-xs font-black text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
