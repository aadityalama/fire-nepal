import { CommunityReviewCard } from "@/components/community-reviews/CommunityReviewCard";
import { UserCommunityReviewPanel } from "@/components/community-reviews/UserCommunityReviewPanel";
import { WriteReviewLauncher } from "@/components/community-reviews/WriteReviewLauncher";
import { fetchApprovedCommunityReviews } from "@/lib/community-reviews/fetch-public-reviews";

function ReviewSkeleton() {
  return (
    <div className="glass-card min-w-[280px] animate-pulse rounded-[1.5rem] p-5 md:min-w-0 md:flex-1">
      <div className="mb-4 flex items-center gap-3">
        <div className="h-12 w-12 rounded-full bg-emerald-100" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-28 rounded bg-emerald-100" />
          <div className="h-2 w-20 rounded bg-slate-100" />
        </div>
      </div>
      <div className="mb-3 flex gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-4 w-4 rounded bg-amber-100" />
        ))}
      </div>
      <div className="mb-2 h-3 w-40 rounded bg-emerald-100" />
      <div className="space-y-2">
        <div className="h-2 w-full rounded bg-slate-100" />
        <div className="h-2 w-5/6 rounded bg-slate-100" />
      </div>
    </div>
  );
}

export async function CommunityReviewsSection() {
  const reviews = await fetchApprovedCommunityReviews();

  return (
    <section id="community" className="mt-12">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-black text-emerald-950">What Our Community Says</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Real stories from Nepalis building financial independence abroad.
          </p>
        </div>
        <WriteReviewLauncher />
      </div>

      <UserCommunityReviewPanel />

      <div id="reviews" className="no-scrollbar flex gap-5 overflow-x-auto pb-4">
        {reviews.length === 0 ? (
          <>
            <ReviewSkeleton />
            <ReviewSkeleton />
            <ReviewSkeleton />
          </>
        ) : (
          reviews.map((review) => <CommunityReviewCard key={review.id} review={review} />)
        )}
      </div>
    </section>
  );
}
