"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { formatYmd, startOfLocalDay } from "@/lib/smart-reminders/date-utils";
import type { Reminder } from "@/lib/smart-reminders/types";
import { useFireTheme } from "@/contexts/FireThemeContext";

function monthMatrix(anchor: Date): { date: Date; inMonth: boolean }[] {
  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  const first = new Date(year, month, 1);
  const startDow = first.getDay(); // 0 Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: { date: Date; inMonth: boolean }[] = [];
  // pad leading
  for (let i = 0; i < startDow; i += 1) {
    const d = new Date(year, month, 1 - (startDow - i));
    cells.push({ date: d, inMonth: false });
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ date: new Date(year, month, day), inMonth: true });
  }
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1].date;
    const d = new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1);
    cells.push({ date: d, inMonth: false });
  }
  return cells;
}

export function ReminderCalendarCard({ reminders }: { reminders: Reminder[] }) {
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const [anchor, setAnchor] = useState(() => startOfLocalDay(new Date()));

  const byDay = useMemo(() => {
    const m = new Map<string, Reminder[]>();
    for (const r of reminders) {
      const key = r.dueDate;
      const arr = m.get(key) ?? [];
      arr.push(r);
      m.set(key, arr);
    }
    return m;
  }, [reminders]);

  const cells = useMemo(() => monthMatrix(anchor), [anchor]);
  const label = anchor.toLocaleString(undefined, { month: "long", year: "numeric" });

  return (
    <section
      className={`wealth-glass relative overflow-hidden p-4 sm:p-5 motion-safe:transition motion-safe:duration-300 ${
        light ? "shadow-sm" : "shadow-[0_18px_50px_-28px_rgba(0,0,0,0.55)]"
      }`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 top-0 h-56 w-56 rounded-full bg-gradient-to-br from-amber-400/18 via-emerald-400/10 to-transparent blur-3xl dark:from-amber-400/12 dark:via-emerald-400/8"
      />
      <div className="relative flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-700/90 dark:text-emerald-300/75">Calendar</p>
          <h3 className="mt-1 text-lg font-black tracking-tight text-slate-900 dark:text-white">Family month view</h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className={`grid h-10 w-10 place-items-center rounded-xl border transition active:scale-[0.99] ${
              light ? "border-emerald-200/80 bg-white/90 text-emerald-900" : "border-white/10 bg-white/[0.05] text-emerald-100"
            }`}
            aria-label="Previous month"
            onClick={() => setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1))}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            className={`grid h-10 w-10 place-items-center rounded-xl border transition active:scale-[0.99] ${
              light ? "border-emerald-200/80 bg-white/90 text-emerald-900" : "border-white/10 bg-white/[0.05] text-emerald-100"
            }`}
            aria-label="Next month"
            onClick={() => setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1))}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <p className={`relative mt-3 text-sm font-black ${light ? "text-slate-800" : "text-zinc-200"}`}>{label}</p>

      <div className="relative mt-4 grid grid-cols-7 gap-1 text-center text-[10px] font-black uppercase tracking-wide text-slate-500 dark:text-zinc-500">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="relative mt-1 grid grid-cols-7 gap-1">
        {cells.map(({ date, inMonth }) => {
          const ymd = formatYmd(date);
          const hits = byDay.get(ymd) ?? [];
          const isToday = ymd === formatYmd(startOfLocalDay(new Date()));
          return (
            <div
              key={ymd + String(inMonth)}
              className={`relative min-h-[44px] rounded-xl border px-1 py-1 sm:min-h-[52px] ${
                inMonth
                  ? light
                    ? "border-emerald-100/80 bg-white/70"
                    : "border-white/10 bg-black/20"
                  : light
                    ? "border-transparent bg-transparent opacity-35"
                    : "border-transparent bg-transparent opacity-30"
              } ${isToday ? "ring-2 ring-amber-400/55" : ""}`}
            >
              <p className={`text-[11px] font-black ${inMonth ? (light ? "text-slate-900" : "text-white") : "text-slate-400"}`}>
                {date.getDate()}
              </p>
              <div className="mt-1 flex flex-wrap justify-center gap-0.5">
                {hits.slice(0, 3).map((r) => (
                  <span key={r.id} className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-emerald-400 to-amber-300" title={r.title} />
                ))}
                {hits.length > 3 ? <span className="text-[9px] font-black text-amber-200">+</span> : null}
              </div>
            </div>
          );
        })}
      </div>

      <p className="relative mt-4 text-xs font-semibold leading-relaxed text-slate-600 dark:text-zinc-400">
        Dots show due dates for the whole household. Tap a reminder below to jump into actions.
      </p>
    </section>
  );
}
