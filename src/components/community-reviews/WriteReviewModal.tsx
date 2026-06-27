"use client";

import { Loader2, MessageSquarePlus, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  emptyWriteReviewForm,
  WriteReviewForm,
  type WriteReviewFormState,
} from "@/components/community-reviews/WriteReviewForm";
import type { CommunityReviewRow } from "@/lib/community-reviews/types";

type WriteReviewModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmitted?: (review: CommunityReviewRow) => void;
  initialReview?: CommunityReviewRow | null;
};

async function uploadAvatar(reviewId: string, file: File): Promise<boolean> {
  const fd = new FormData();
  fd.set("file", file);
  fd.set("reviewId", reviewId);
  const r = await fetch("/api/community-reviews/avatar", {
    method: "POST",
    credentials: "include",
    body: fd,
  });
  const j = (await r.json().catch(() => ({}))) as { error?: string };
  if (!r.ok) {
    toast.error(j.error ?? "Could not upload photo");
    return false;
  }
  return true;
}

function reviewToForm(review: CommunityReviewRow): WriteReviewFormState {
  return {
    full_name: review.full_name,
    city: review.city ?? "",
    country: review.country ?? "",
    rating: review.rating,
    review_title: review.review_title,
    review_text: review.review_text,
  };
}

export function WriteReviewModal({ open, onClose, onSubmitted, initialReview }: WriteReviewModalProps) {
  const [form, setForm] = useState<WriteReviewFormState>(emptyWriteReviewForm);
  const [existing, setExisting] = useState<CommunityReviewRow | null>(initialReview ?? null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const loadMine = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/community-reviews/mine", { credentials: "include", cache: "no-store" });
      const j = (await r.json().catch(() => ({}))) as { review?: CommunityReviewRow | null; error?: string };
      if (!r.ok) {
        if (r.status !== 401) toast.error(j.error ?? "Could not load your review");
        setExisting(null);
        return;
      }
      const review = j.review ?? null;
      setExisting(review);
      if (review) setForm(reviewToForm(review));
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setAvatarFile(null);
    if (initialReview) {
      setExisting(initialReview);
      setForm(reviewToForm(initialReview));
      return;
    }
    void loadMine();
  }, [open, initialReview, loadMine]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const submit = async () => {
    setSaving(true);
    try {
      const isEdit = Boolean(existing?.id);
      const r = await fetch(isEdit ? `/api/community-reviews/${existing!.id}` : "/api/community-reviews/mine", {
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
      const saved = j.review!;
      if (avatarFile) {
        await uploadAvatar(saved.id, avatarFile);
      }
      setExisting(saved);
      onSubmitted?.(saved);
      onClose();
      toast.success(
        isEdit
          ? "Review updated — pending admin approval"
          : "Thank you! Your review was submitted and is pending approval.",
      );
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-emerald-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="write-review-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-h-[94vh] w-full max-w-lg overflow-auto rounded-t-[1.75rem] border border-emerald-100/80 bg-white shadow-2xl sm:rounded-[1.75rem]">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-emerald-100/80 bg-white/95 px-5 py-4 backdrop-blur-md">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">Community</p>
            <h2 id="write-review-title" className="text-xl font-black text-emerald-950">
              {existing ? "Edit your review" : "Write a review"}
            </h2>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              Approved reviews appear on the homepage. One review per member.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-emerald-100 p-2 text-slate-500 transition hover:bg-emerald-50"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-5">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm font-bold text-emerald-700">
              <Loader2 size={18} className="animate-spin" />
              Loading…
            </div>
          ) : (
            <WriteReviewForm
              form={form}
              onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
              existingReview={existing}
              onAvatarSelect={setAvatarFile}
              disabled={saving}
            />
          )}
        </div>

        <div className="sticky bottom-0 flex flex-wrap gap-2 border-t border-emerald-100/80 bg-white/95 px-5 py-4 backdrop-blur-md">
          <button
            type="button"
            disabled={saving || loading}
            onClick={() => void submit()}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-emerald-700 px-5 py-3 text-sm font-black text-white transition hover:bg-emerald-800 disabled:opacity-60 sm:flex-none"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <MessageSquarePlus size={16} />}
            {saving ? "Submitting…" : existing ? "Update review" : "Submit review"}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-full border border-slate-200 px-5 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
