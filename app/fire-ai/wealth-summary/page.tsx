import type { Metadata } from "next";
import dynamic from "next/dynamic";

const FireAiWealthSummary = dynamic(
  () => import("@/components/fire-nepal-ai/FireAiWealthSummary").then((m) => m.FireAiWealthSummary),
  { loading: () => <WealthSkeleton /> },
);

export const metadata: Metadata = {
  title: "Wealth Summary | FIRE AI",
  description: "Net worth, savings rate, and FIRE progress at a glance.",
};

function WealthSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-20 animate-pulse rounded-2xl bg-emerald-100/30" />
      ))}
    </div>
  );
}

export default function FireAiWealthSummaryPage() {
  return <FireAiWealthSummary />;
}
