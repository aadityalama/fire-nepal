"use client";

import { useMemo } from "react";
import { isBillishReminderType, reminderPriority } from "@/lib/smart-reminders/reminder-engine";
import type { Reminder } from "@/lib/smart-reminders/types";
import { formatReminderType } from "@/components/smart-reminders/reminder-labels";
import { priorityAccent } from "@/components/smart-reminders/priority-styles";
import { useFireTheme } from "@/contexts/FireThemeContext";
import { parseYmd } from "@/lib/smart-reminders/date-utils";

function sortByDue(a: Reminder, b: Reminder): number {
  return parseYmd(a.dueDate).getTime() - parseYmd(b.dueDate).getTime();
}

export function UpcomingBillsCard({
  reminders,
  upcomingWithinDays,
  onMarkPaid,
}: {
  reminders: Reminder[];
  upcomingWithinDays: number;
  onMarkPaid: (id: string) => void;
}) {
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const now = new Date();
  const rows = useMemo(() => {
    return reminders.filter((r) => isBillishReminderType(r.reminderType)).sort(sortByDue).slice(0, 6);
  }, [reminders]);

  return (
    <section
      className={`wealth-glass relative overflow-hidden p-4 sm:p-5 motion-safe:transition motion-safe:duration-300 ${
        light ? "shadow-sm" : "shadow-[0_18px_50px_-28px_rgba(0,0,0,0.55)]"
      }`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 bottom-0 h-56 w-56 rounded-full bg-gradient-to-tr from-emerald-400/16 via-lime-300/10 to-transparent blur-3xl dark:from-emerald-400/12 dark:via-lime-300/8"
      />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-700/90 dark:text-emerald-300/75">Household</p>
          <h3 className="mt-1 text-lg font-black tracking-tight text-slate-900 dark:text-white">Upcoming bills</h3>
          <p className="mt-1 text-xs font-semibold text-slate-600 dark:text-zinc-400">Rent, utilities, insurance & subscriptions</p>
        </div>
        <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-amber-100">
          Elite
        </span>
      </div>

      <div className="relative mt-4 space-y-2">
        {rows.length ? (
          rows.map((r) => {
            const p = reminderPriority(r, now, upcomingWithinDays);
            const a = priorityAccent(p);
            return (
              <div
                key={r.id}
                className={`flex flex-col gap-3 rounded-2xl border p-3 sm:flex-row sm:items-center sm:justify-between ${
                  light ? "border-emerald-100/90 bg-white/70" : "border-white/10 bg-black/25"
                }`}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`h-1.5 w-10 rounded-full bg-gradient-to-r ${a.bar}`} />
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${a.chip}`}>
                      {p === "overdue" ? "Overdue" : p === "upcoming" ? "Upcoming" : "Scheduled"}
                    </span>
                    {r.sharedWithFamily ? (
                      <span className="rounded-full border border-sky-400/25 bg-sky-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-sky-50">
                        Family
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 truncate text-sm font-black text-slate-900 dark:text-white">{r.title}</p>
                  <p className="mt-0.5 text-xs font-semibold text-slate-600 dark:text-zinc-400">
                    {formatReminderType(r.reminderType)} · due {r.dueDate}
                    {r.amountNpr != null ? ` · NPR ${r.amountNpr.toLocaleString("en-IN")}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onMarkPaid(r.id)}
                  className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-emerald-500 to-lime-400 px-4 text-xs font-black text-emerald-950 shadow-lg shadow-emerald-500/20 transition hover:brightness-110 active:scale-[0.99]"
                >
                  Mark paid
                </button>
              </div>
            );
          })
        ) : (
          <p className={`text-sm font-semibold ${light ? "text-slate-600" : "text-zinc-400"}`}>No bill reminders yet — add rent or utilities.</p>
        )}
      </div>
    </section>
  );
}
