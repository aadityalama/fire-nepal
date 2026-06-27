"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { useFireTheme } from "@/contexts/FireThemeContext";
import type { FireAiConversationSummary } from "@/lib/fire-nepal-ai/types";
import { FireAiGlassCard } from "@/components/fire-nepal-ai/ui/FireAiGlassCard";

type FireAiRecentConversationsProps = {
  conversations: FireAiConversationSummary[];
};

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function FireAiRecentConversations({ conversations }: FireAiRecentConversationsProps) {
  const light = useFireTheme().resolvedTheme === "light";

  return (
    <section>
      <h2 className={`mb-3 text-sm font-black ${light ? "text-slate-900" : "text-white"}`}>Recent Conversations</h2>
      {conversations.length === 0 ? (
        <FireAiGlassCard>
          <p className={`text-center text-sm font-semibold ${light ? "text-slate-500" : "text-emerald-200/60"}`}>
            No conversations yet.
          </p>
        </FireAiGlassCard>
      ) : (
        <ul className="space-y-2">
          {conversations.slice(0, 3).map((conv) => (
            <li key={conv.id}>
              <Link
                href={`/fire-ai/chat?id=${conv.id}`}
                className={`flex min-h-[48px] items-center gap-3 rounded-2xl border px-4 py-3 transition active:scale-[0.99] ${
                  light
                    ? "border-emerald-100 bg-white/80 hover:border-emerald-200 hover:bg-emerald-50/50"
                    : "border-emerald-400/10 bg-emerald-950/30 hover:border-emerald-400/25 hover:bg-emerald-950/50"
                }`}
              >
                <div
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
                    light ? "bg-emerald-50 text-emerald-700" : "bg-emerald-500/15 text-emerald-300"
                  }`}
                >
                  <MessageCircle size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-sm font-bold ${light ? "text-slate-900" : "text-white"}`}>
                    {conv.title}
                  </p>
                  <p className={`truncate text-xs font-medium ${light ? "text-slate-500" : "text-emerald-200/55"}`}>
                    {conv.preview}
                  </p>
                </div>
                <span className={`shrink-0 text-[10px] font-bold ${light ? "text-slate-400" : "text-emerald-300/50"}`}>
                  {formatRelativeTime(conv.updatedAt)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
