"use client";

import { format, parseISO } from "date-fns";
import { BadgeCheck, Star } from "lucide-react";
import Image from "next/image";
import { reviewInitials } from "@/lib/community-reviews/demo-reviews-seed";
import type { CommunityReviewPublic } from "@/lib/community-reviews/types";

function formatReviewDate(iso: string): string {
  try {
    return format(parseISO(iso), "MMM d, yyyy");
  } catch {
    return "";
  }
}

function locationLabel(review: CommunityReviewPublic): string {
  const city = review.city?.trim();
  const country = review.country?.trim();
  if (city && country) return `${city}, ${country}`;
  return city || country || "";
}

export function CommunityReviewCard({ review }: { review: CommunityReviewPublic }) {
  const initials = reviewInitials(review.full_name);
  const location = locationLabel(review);

  return (
    <article className="glass-card min-w-[280px] rounded-[1.5rem] p-5 transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_20px_55px_rgba(0,122,61,0.14)] md:min-w-0 md:flex-1">
      <div className="mb-4 flex items-center gap-3">
        {review.avatar_url ? (
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full ring-2 ring-emerald-100">
            <Image src={review.avatar_url} alt={review.full_name} fill className="object-cover" sizes="48px" />
          </div>
        ) : (
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-emerald-700 to-lime-500 text-sm font-black text-white">
            {initials}
          </div>
        )}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="truncate font-black text-emerald-950">{review.full_name}</p>
            {review.verified ? (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-emerald-700">
                <BadgeCheck size={12} aria-hidden />
                Verified
              </span>
            ) : null}
          </div>
          {location ? <p className="text-xs font-bold text-slate-500">{location}</p> : null}
        </div>
      </div>
      <div className="mb-2 flex gap-1 text-amber-500" aria-label={`${review.rating} out of 5 stars`}>
        {Array.from({ length: 5 }).map((_, starIndex) => (
          <Star
            key={`${review.id}-${starIndex}`}
            size={15}
            fill={starIndex < review.rating ? "currentColor" : "none"}
            className={starIndex < review.rating ? "" : "text-amber-200"}
          />
        ))}
      </div>
      <p className="mb-1 text-sm font-black text-emerald-900">{review.review_title}</p>
      <p className="text-sm leading-6 text-slate-600">&quot;{review.review_text}&quot;</p>
      {review.created_at ? (
        <p className="mt-3 text-[11px] font-bold uppercase tracking-wide text-slate-400">
          {formatReviewDate(review.created_at)}
        </p>
      ) : null}
    </article>
  );
}
