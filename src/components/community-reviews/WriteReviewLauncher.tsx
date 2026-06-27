"use client";

import { MessageSquarePlus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { WriteReviewModal } from "@/components/community-reviews/WriteReviewModal";
import { useProductAuth } from "@/contexts/ProductAuthContext";
import type { CommunityReviewRow } from "@/lib/community-reviews/types";

type WriteReviewLauncherProps = {
  className?: string;
  variant?: "section" | "inline";
};

export function WriteReviewLauncher({ className, variant = "section" }: WriteReviewLauncherProps) {
  const { user } = useProductAuth();
  const [open, setOpen] = useState(false);
  const [submittedReview, setSubmittedReview] = useState<CommunityReviewRow | null>(null);

  const buttonClass =
    variant === "section"
      ? "inline-flex items-center gap-2 rounded-full bg-emerald-700 px-5 py-2.5 text-sm font-black text-white shadow-md shadow-emerald-900/10 transition hover:bg-emerald-800 active:scale-[0.98]"
      : "inline-flex items-center gap-1.5 rounded-full bg-emerald-700 px-4 py-2 text-xs font-black text-white transition hover:bg-emerald-800";

  if (!user) {
    return (
      <Link href="/login?next=%2Fwrite-review" className={`${buttonClass} ${className ?? ""}`}>
        <MessageSquarePlus size={variant === "section" ? 18 : 14} />
        Write a Review
      </Link>
    );
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`${buttonClass} ${className ?? ""}`}>
        <MessageSquarePlus size={variant === "section" ? 18 : 14} />
        Write a Review
      </button>
      <WriteReviewModal
        open={open}
        onClose={() => setOpen(false)}
        onSubmitted={(review) => setSubmittedReview(review)}
        initialReview={submittedReview}
      />
    </>
  );
}
