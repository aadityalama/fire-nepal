import type { Metadata } from "next";
import dynamic from "next/dynamic";

const FireAiHome = dynamic(
  () => import("@/components/fire-nepal-ai/FireAiHome").then((m) => m.FireAiHome),
  { loading: () => <FireAiPageSkeleton /> },
);

export const metadata: Metadata = {
  title: "FIRE AI Home | FIRE Nepal",
  description: "Your AI-powered financial assistant — health score, insights, and quick actions.",
};

function FireAiPageSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-12 w-48 animate-pulse rounded-xl bg-emerald-100/40" />
      <div className="h-28 animate-pulse rounded-2xl bg-emerald-100/30" />
      <div className="h-24 animate-pulse rounded-2xl bg-emerald-100/30" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-28 animate-pulse rounded-2xl bg-emerald-100/30" />
        <div className="h-28 animate-pulse rounded-2xl bg-emerald-100/30" />
      </div>
    </div>
  );
}

export default function FireAiHomePage() {
  return <FireAiHome />;
}
