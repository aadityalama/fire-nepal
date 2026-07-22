"use client";

import { Camera, Loader2, X } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import { StarRatingInput } from "@/components/community-reviews/StarRatingInput";
import { reviewInitials } from "@/lib/community-reviews/demo-reviews-seed";
import type { CommunityReviewRow } from "@/lib/community-reviews/types";

export type WriteReviewFormState = {
  full_name: string;
  city: string;
  country: string;
  rating: number;
  review_title: string;
  review_text: string;
};

export const emptyWriteReviewForm: WriteReviewFormState = {
  full_name: "",
  city: "",
  country: "",
  rating: 5,
  review_title: "",
  review_text: "",
};

type WriteReviewFormProps = {
  form: WriteReviewFormState;
  onChange: (patch: Partial<WriteReviewFormState>) => void;
  existingReview?: CommunityReviewRow | null;
  avatarPreview?: string | null;
  onAvatarSelect?: (file: File | null) => void;
  disabled?: boolean;
  idPrefix?: string;
};

export function WriteReviewForm({
  form,
  onChange,
  existingReview,
  avatarPreview,
  onAvatarSelect,
  disabled,
  idPrefix = "review",
}: WriteReviewFormProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const preview = avatarPreview ?? localPreview ?? existingReview?.avatar_url ?? null;

  const handleFile = (file: File | null) => {
    if (localPreview?.startsWith("blob:")) URL.revokeObjectURL(localPreview);
    if (!file) {
      setLocalPreview(null);
      onAvatarSelect?.(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setLocalPreview(url);
    onAvatarSelect?.(file);
  };

  const inputClass =
    "mt-1 w-full rounded-xl border border-emerald-100 bg-white px-3 py-2.5 text-sm text-emerald-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:opacity-60";

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2 flex flex-col items-center gap-3 rounded-2xl border border-emerald-100/80 bg-emerald-50/50 p-4">
        <div className="relative h-20 w-20 overflow-hidden rounded-full border-2 border-white shadow-md">
          {preview ? (
            <Image src={preview} alt="" fill className="object-cover" sizes="80px" unoptimized={preview.startsWith("blob:")} />
          ) : (
            <div className="grid h-full w-full place-items-center bg-emerald-700 text-lg font-black text-white">
              {reviewInitials(form.full_name || "?")}
            </div>
          )}
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-white px-4 py-2 text-xs font-black text-emerald-800 transition hover:bg-emerald-50 disabled:opacity-60"
          >
            <Camera size={14} />
            {preview ? "Change photo" : "Add profile photo"}
          </button>
          {preview ? (
            <button
              type="button"
              disabled={disabled}
              onClick={() => handleFile(null)}
              className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-xs font-bold text-slate-500 hover:bg-white/80 disabled:opacity-60"
            >
              <X size={14} />
              Remove
            </button>
          ) : null}
        </div>
        <p className="text-center text-[11px] font-semibold text-slate-500">Optional · JPG, PNG or WebP · max 2MB</p>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        />
      </div>

      <label className="block sm:col-span-2">
        <span className="text-xs font-bold text-slate-600">Full name *</span>
        <input
          id={`${idPrefix}-full-name`}
          className={inputClass}
          value={form.full_name}
          disabled={disabled}
          maxLength={80}
          required
          aria-required="true"
          onChange={(e) => onChange({ full_name: e.target.value })}
          placeholder="Your name as it should appear"
        />
        <p className="mt-1 text-[11px] font-semibold text-slate-400">At least 2 characters</p>
      </label>

      <label className="block">
        <span className="text-xs font-bold text-slate-600">City</span>
        <input
          id={`${idPrefix}-city`}
          className={inputClass}
          value={form.city}
          disabled={disabled}
          maxLength={80}
          onChange={(e) => onChange({ city: e.target.value })}
          placeholder="e.g. Kathmandu or Seoul"
        />
      </label>

      <label className="block">
        <span className="text-xs font-bold text-slate-600">Country</span>
        <input
          id={`${idPrefix}-country`}
          className={inputClass}
          value={form.country}
          disabled={disabled}
          maxLength={80}
          onChange={(e) => onChange({ country: e.target.value })}
          placeholder="e.g. Nepal or Korea"
        />
      </label>

      <div className="block sm:col-span-2">
        <span className="text-xs font-bold text-slate-600" id={`${idPrefix}-rating-label`}>
          Rating *
        </span>
        <div className="mt-2" role="group" aria-labelledby={`${idPrefix}-rating-label`}>
          <StarRatingInput value={form.rating} onChange={(rating) => onChange({ rating })} disabled={disabled} />
        </div>
      </div>

      <label className="block sm:col-span-2">
        <span className="text-xs font-bold text-slate-600">Review title *</span>
        <input
          id={`${idPrefix}-title`}
          className={inputClass}
          value={form.review_title}
          disabled={disabled}
          maxLength={120}
          required
          aria-required="true"
          aria-describedby={`${idPrefix}-title-hint`}
          onChange={(e) => onChange({ review_title: e.target.value })}
          placeholder="Summarize your experience in one line"
        />
        <p id={`${idPrefix}-title-hint`} className="mt-1 text-[11px] font-semibold text-slate-400">
          {form.review_title.trim().length < 5
            ? `${Math.max(0, 5 - form.review_title.trim().length)} more characters needed (min 5)`
            : `${form.review_title.length}/120`}
        </p>
      </label>

      <label className="block sm:col-span-2">
        <span className="text-xs font-bold text-slate-600">Review message *</span>
        <textarea
          id={`${idPrefix}-message`}
          rows={5}
          className={`${inputClass} resize-y min-h-[120px]`}
          value={form.review_text}
          disabled={disabled}
          maxLength={2000}
          required
          aria-required="true"
          aria-describedby={`${idPrefix}-message-hint`}
          onChange={(e) => onChange({ review_text: e.target.value })}
          placeholder="Share how FIRE Nepal helped you plan, save, or invest…"
        />
        <p id={`${idPrefix}-message-hint`} className="mt-1 text-right text-[11px] font-semibold text-slate-400">
          {form.review_text.trim().length < 20
            ? `${Math.max(0, 20 - form.review_text.trim().length)} more characters needed (min 20) · ${form.review_text.length}/2000`
            : `${form.review_text.length}/2000`}
        </p>
      </label>
    </div>
  );
}
