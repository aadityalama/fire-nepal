import type { Metadata } from "next";
import dynamic from "next/dynamic";

const FireAiExpenseInsights = dynamic(
  () => import("@/components/fire-nepal-ai/FireAiExpenseInsights").then((m) => m.FireAiExpenseInsights),
  { loading: () => <InsightsSkeleton /> },
);

export const metadata: Metadata = {
  title: "Expense Insights | FIRE AI",
  description: "AI-powered expense analysis from your FIRE Nepal data.",
};

function InsightsSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-20 animate-pulse rounded-2xl bg-emerald-100/30" />
      ))}
    </div>
  );
}

export default function FireAiExpenseInsightsPage() {
  return <FireAiExpenseInsights />;
}
