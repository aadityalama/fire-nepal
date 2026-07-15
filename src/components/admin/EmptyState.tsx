"use client";

import { Inbox } from "lucide-react";

export function EmptyState({
  message = "No activity available.",
  className = "",
}: {
  message?: string;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/[0.08] bg-white/[0.02] px-4 py-8 text-center ${className}`}
    >
      <Inbox className="h-5 w-5 text-zinc-600" aria-hidden />
      <p className="text-sm font-medium text-zinc-500">{message}</p>
    </div>
  );
}
