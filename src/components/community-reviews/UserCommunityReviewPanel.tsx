"use client";

import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { WriteReviewLauncher } from "@/components/community-reviews/WriteReviewLauncher";
import { useProductAuth } from "@/contexts/ProductAuthContext";
import type { CommunityReviewRow } from "@/lib/community-reviews/types";

export function UserCommunityReviewPanel() {
  const { user } = useProductAuth();
  const [review, setReview] = useState<CommunityReviewRow | null>(null);

  const load = useCallback(async () => {
    if (!user) {
      setReview(null);
      return;
    }
    try {
      const r = await fetch("/api/community-reviews/mine", { credentials: "include", cache: "no-store" });
      const j = (await r.json().catch(() => ({}))) as { review?: CommunityReviewRow | null };
      if (r.ok) setReview(j.review ?? null);
    } catch {
      /* ignore */
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!user || !review) return null;

  const config =
    review.status === "approved"
      ? {
          icon: CheckCircle2,
          className: "border-emerald-200 bg-emerald-50 text-emerald-900",
          message: "Your review is live on the homepage. Thank you for sharing!",
        }
      : review.status === "pending"
        ? {
            icon: Clock,
            className: "border-amber-200 bg-amber-50 text-amber-950",
            message: "Your review is pending admin approval. We'll notify you when it's published.",
          }
        : {
            icon: XCircle,
            className: "border-rose-200 bg-rose-50 text-rose-900",
            message: "Your review wasn't approved. You can edit and resubmit below.",
          };

  const Icon = config.icon;

  return (
    <div className={`mb-4 flex flex-col gap-3 rounded-[1.25rem] border p-4 sm:flex-row sm:items-center sm:justify-between ${config.className}`}>
      <div className="flex items-start gap-3">
        <Icon size={20} className="mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-black">Your community review</p>
          <p className="text-xs font-semibold opacity-80">{config.message}</p>
        </div>
      </div>
      {review.status !== "approved" ? (
        <WriteReviewLauncher variant="inline" className="shrink-0 self-start sm:self-center" />
      ) : null}
    </div>
  );
}
