"use client";

import {
  CheckCircle2,
  Pencil,
  Plus,
  Trash2,
  UserPlus,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { TimelineActivity } from "@/lib/expense-storage";

const iconByType: Record<TimelineActivity["type"], LucideIcon> = {
  expense_added: Plus,
  expense_edited: Pencil,
  expense_deleted: Trash2,
  settlement: CheckCircle2,
  member_added: UserPlus,
};

const toneByType: Record<TimelineActivity["type"], string> = {
  expense_added: "bg-emerald-100 text-emerald-700",
  expense_edited: "bg-amber-100 text-amber-700",
  expense_deleted: "bg-red-100 text-red-600",
  settlement: "bg-sky-100 text-sky-700",
  member_added: "bg-violet-100 text-violet-700",
};

type ExpenseTimelineProps = {
  activities: TimelineActivity[];
  limit?: number;
  emptyMessage?: string;
};

export function ExpenseTimeline({
  activities,
  limit,
  emptyMessage = "No activity yet. Add an expense to start your timeline.",
}: ExpenseTimelineProps) {
  const items = limit ? activities.slice(0, limit) : activities;

  if (!items.length) {
    return (
      <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/50 p-8 text-center">
        <Wallet className="mx-auto mb-3 text-emerald-600" size={28} />
        <p className="text-sm font-bold text-slate-600">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <ol className="relative space-y-0 pl-2">
      <span className="absolute bottom-4 left-[1.35rem] top-4 w-px bg-gradient-to-b from-emerald-300 via-emerald-200 to-transparent" />
      {items.map((activity, index) => {
        const Icon = iconByType[activity.type];
        const time = new Date(activity.timestamp).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        });

        return (
          <li
            key={activity.id}
            className="animate-fade-in relative grid grid-cols-[auto_1fr] gap-4 pb-6"
            style={{ animationDelay: `${index * 40}ms` }}
          >
            <div
              className={`relative z-10 grid h-11 w-11 shrink-0 place-items-center rounded-2xl shadow-sm ${toneByType[activity.type]}`}
            >
              <Icon size={18} />
            </div>
            <div className="glass-card rounded-2xl border border-white/60 p-4 transition hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(0,122,61,0.12)]">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="font-black text-emerald-950">{activity.message}</p>
                <time className="text-xs font-bold text-slate-500">{time}</time>
              </div>
              {activity.category && (
                <p className="mt-1 text-xs font-bold text-emerald-700">{activity.category}</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
