import type { Metadata } from "next";
import dynamic from "next/dynamic";

const FireAiFireGuidance = dynamic(
  () => import("@/components/fire-nepal-ai/FireAiFireGuidance").then((m) => m.FireAiFireGuidance),
  { loading: () => <GuidanceSkeleton /> },
);

export const metadata: Metadata = {
  title: "FIRE Guidance | FIRE AI",
  description: "Personalized FIRE recommendations based on your financial data.",
};

function GuidanceSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-24 animate-pulse rounded-2xl bg-emerald-100/30" />
      ))}
    </div>
  );
}

export default function FireAiFireGuidancePage() {
  return <FireAiFireGuidance />;
}
