import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { Suspense } from "react";

const FireAiChat = dynamic(
  () => import("@/components/fire-nepal-ai/FireAiChat").then((m) => m.FireAiChat),
  { loading: () => <ChatSkeleton /> },
);

export const metadata: Metadata = {
  title: "Ask FIRE AI | FIRE Nepal",
  description: "Chat with your AI financial assistant about savings, spending, and FIRE progress.",
};

function ChatSkeleton() {
  return (
    <div className="space-y-4 py-8">
      <div className="ml-auto h-16 w-3/4 animate-pulse rounded-2xl bg-emerald-100/30" />
      <div className="h-20 w-4/5 animate-pulse rounded-2xl bg-emerald-100/20" />
    </div>
  );
}

export default function FireAiChatPage() {
  return (
    <Suspense fallback={<ChatSkeleton />}>
      <FireAiChat />
    </Suspense>
  );
}
