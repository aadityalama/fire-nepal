"use client";

import { Bell, ChevronRight, Flame, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSmartRemindersOptional } from "@/contexts/SmartRemindersContext";
import { useFireTheme } from "@/contexts/FireThemeContext";

export function SmartRemindersHeaderBell() {
  const ctx = useSmartRemindersOptional();
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const el = panelRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) close();
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, close]);

  if (!ctx?.hydrated) return null;

  const unread = ctx.unreadNotificationCount;
  const hasOverdue = ctx.overdueCount > 0;
  const preview = ctx.store.notifications.slice(0, 6);

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`relative grid h-11 w-11 place-items-center rounded-xl border transition active:scale-[0.99] motion-safe:duration-200 ${
          light
            ? "border-emerald-200/80 bg-white/90 text-emerald-900 hover:bg-emerald-50"
            : "border-emerald-500/15 bg-white/[0.05] text-emerald-100 hover:bg-white/[0.08]"
        }`}
        aria-label="Open reminders and notifications"
        aria-expanded={open}
      >
        <Bell size={18} />
        {unread > 0 ? (
          <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 px-1 text-center text-[10px] font-black text-emerald-950 shadow-md shadow-amber-500/25">
            {unread > 99 ? "99+" : unread}
          </span>
        ) : hasOverdue ? (
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-red-500 shadow-lg shadow-red-500/40 ring-2 ring-black/20" title="Overdue reminders" />
        ) : null}
      </button>

      {open ? (
        <div
          className={`absolute right-0 z-50 mt-2 w-[min(92vw,380px)] overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-xl motion-safe:transition motion-safe:duration-200 motion-safe:ease-out ${
            light ? "border-emerald-200/70 bg-white/95" : "border-emerald-500/15 bg-[#030806]/95"
          }`}
        >
          <div
            className={`flex items-center justify-between border-b px-4 py-3 ${
              light ? "border-emerald-100/80 bg-emerald-50/40" : "border-white/10 bg-emerald-500/[0.06]"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-emerald-400 to-lime-400 text-emerald-950 shadow-lg shadow-emerald-500/20">
                <Flame size={16} />
              </span>
              <div className="leading-tight">
                <p className={`text-sm font-black ${light ? "text-slate-900" : "text-white"}`}>Smart reminders</p>
                <p className={`text-[11px] font-semibold ${light ? "text-emerald-800/80" : "text-emerald-200/70"}`}>
                  {ctx.overdueCount ? `${ctx.overdueCount} overdue` : "No overdue items"}
                  {" · "}
                  {ctx.upcomingSoonCount ? `${ctx.upcomingSoonCount} upcoming` : "All clear ahead"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={close}
              className={`rounded-lg p-2 transition ${light ? "text-slate-600 hover:bg-white" : "text-zinc-300 hover:bg-white/10"}`}
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>

          <div className="max-h-[min(60vh,420px)] overflow-y-auto px-2 py-2">
            {preview.length ? (
              preview.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => {
                    ctx.markNotificationRead(n.id);
                  }}
                  className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                    n.read
                      ? light
                        ? "hover:bg-slate-50"
                        : "hover:bg-white/[0.04]"
                      : light
                        ? "bg-amber-50/60 hover:bg-amber-50"
                        : "bg-amber-500/[0.08] hover:bg-amber-500/[0.12]"
                  }`}
                >
                  <span
                    className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                      n.kind === "overdue"
                        ? "bg-red-400"
                        : n.kind === "payment_due"
                          ? "bg-amber-300"
                          : n.kind === "email_sent"
                            ? "bg-emerald-300"
                            : "bg-sky-300"
                    }`}
                  />
                  <span className="min-w-0">
                    <span className={`block text-xs font-black ${light ? "text-slate-900" : "text-white"}`}>{n.title}</span>
                    <span className={`mt-0.5 block text-[11px] font-semibold leading-snug ${light ? "text-slate-600" : "text-zinc-400"}`}>
                      {n.body}
                    </span>
                  </span>
                </button>
              ))
            ) : (
              <p className={`px-3 py-6 text-center text-sm font-semibold ${light ? "text-slate-600" : "text-zinc-400"}`}>
                You’re caught up. We’ll nudge you when bills and school dates move.
              </p>
            )}
          </div>

          <div className={`border-t px-3 py-2 ${light ? "border-emerald-100/80" : "border-white/10"}`}>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/smart-reminders"
                onClick={close}
                className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-lime-400 px-3 text-xs font-black text-emerald-950 shadow-lg shadow-emerald-500/25 transition hover:brightness-110"
              >
                Open reminder engine <ChevronRight size={14} />
              </Link>
              <button
                type="button"
                onClick={() => ctx.markAllNotificationsRead()}
                className={`inline-flex min-h-[44px] items-center justify-center rounded-xl border px-3 text-xs font-black transition ${
                  light ? "border-emerald-200/80 text-emerald-900 hover:bg-emerald-50" : "border-white/10 text-emerald-100 hover:bg-white/[0.06]"
                }`}
              >
                Mark all read
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
