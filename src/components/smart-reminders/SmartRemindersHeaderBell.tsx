"use client";

import { Bell, ChevronRight, Flame, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useSmartRemindersOptional } from "@/contexts/SmartRemindersContext";
import { useFireTheme } from "@/contexts/FireThemeContext";
import { getInAppNotificationHref } from "@/lib/smart-reminders/notification-nav";
import type { InAppNotification } from "@/lib/smart-reminders/types";

export function SmartRemindersHeaderBell() {
  const ctx = useSmartRemindersOptional();
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const listId = useId();

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target;
      if (!(target instanceof Node)) return;
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      close();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close]);

  const openNotification = useCallback(
    (n: InAppNotification) => {
      if (!ctx) return;
      ctx.markNotificationRead(n.id);
      const href = getInAppNotificationHref(n);
      close();
      router.push(href);
    },
    [ctx, close, router],
  );

  if (!ctx?.hydrated) return null;

  const unread = ctx.unreadNotificationCount;
  const hasOverdue = ctx.overdueCount > 0;
  const preview = ctx.store.notifications.slice(0, 6);

  // `open` is only set by user interaction, so this never portals during SSR.
  const panel =
    open && typeof document !== "undefined"
      ? createPortal(
          <>
            {/* Full-screen dismiss layer outside the sticky header stacking context */}
            <button
              type="button"
              aria-label="Dismiss notifications"
              onClick={close}
              className="fixed inset-0 z-[400] cursor-pointer bg-black/35 backdrop-blur-[1px] touch-manipulation lg:bg-transparent lg:backdrop-blur-none"
            />
            <div
              ref={panelRef}
              id={listId}
              role="dialog"
              aria-label="Smart reminders notifications"
              className={`fixed left-1/2 top-16 z-[410] flex w-[min(92vw,380px)] max-w-sm -translate-x-1/2 flex-col overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-xl touch-manipulation motion-safe:transition motion-safe:duration-200 motion-safe:ease-out max-lg:max-h-[min(70dvh,calc(100dvh-5.5rem))] lg:left-auto lg:right-4 lg:translate-x-0 ${
                light ? "border-emerald-200/70 bg-white/95" : "border-emerald-500/15 bg-[#030806]/95"
              }`}
            >
              <div
                className={`flex shrink-0 min-w-0 items-center justify-between gap-2 border-b px-3 py-3 sm:px-4 ${
                  light ? "border-emerald-100/80 bg-emerald-50/40" : "border-white/10 bg-emerald-500/[0.06]"
                }`}
              >
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-400 to-lime-400 text-emerald-950 shadow-lg shadow-emerald-500/20">
                    <Flame size={16} />
                  </span>
                  <div className="min-w-0 flex-1 leading-tight">
                    <p className={`truncate text-sm font-black ${light ? "text-slate-900" : "text-white"}`}>Smart reminders</p>
                    <p className={`break-words text-[11px] font-semibold ${light ? "text-emerald-800/80" : "text-emerald-200/70"}`}>
                      {ctx.overdueCount ? `${ctx.overdueCount} overdue` : "No overdue items"}
                      {" · "}
                      {ctx.upcomingSoonCount ? `${ctx.upcomingSoonCount} upcoming` : "All clear ahead"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={close}
                  className={`cursor-pointer rounded-lg p-2 transition touch-manipulation ${light ? "text-slate-600 hover:bg-white" : "text-zinc-300 hover:bg-white/10"}`}
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="relative z-10 min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-2 py-2 lg:max-h-[min(60vh,420px)] lg:flex-none">
                {preview.length ? (
                  preview.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => openNotification(n)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          openNotification(n);
                        }
                      }}
                      className={`relative z-10 flex w-full min-h-[52px] min-w-0 max-w-full cursor-pointer items-start gap-3 rounded-xl px-3 py-2.5 text-left transition touch-manipulation active:scale-[0.99] ${
                        n.read
                          ? light
                            ? "hover:bg-slate-50"
                            : "hover:bg-white/[0.04]"
                          : light
                            ? "bg-amber-50/60 hover:bg-amber-50"
                            : "bg-amber-500/[0.08] hover:bg-amber-500/[0.12]"
                      }`}
                      aria-label={`${n.title}. ${n.body}. Open notification.`}
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
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1 pointer-events-none">
                        <span className={`block break-words text-xs font-black ${light ? "text-slate-900" : "text-white"}`}>{n.title}</span>
                        <span className={`mt-0.5 block break-words text-[11px] font-semibold leading-snug ${light ? "text-slate-600" : "text-zinc-400"}`}>
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

              <div className={`relative z-10 shrink-0 border-t px-3 py-2 ${light ? "border-emerald-100/80" : "border-white/10"}`}>
                <div className="flex min-w-0 flex-wrap gap-2">
                  <Link
                    href="/smart-reminders"
                    onClick={close}
                    className="inline-flex min-h-[44px] min-w-0 flex-1 cursor-pointer items-center justify-center gap-2 break-words rounded-xl bg-gradient-to-r from-emerald-500 to-lime-400 px-2 text-center text-xs font-black text-emerald-950 shadow-lg shadow-emerald-500/25 transition hover:brightness-110 touch-manipulation sm:px-3"
                  >
                    <span className="min-w-0 leading-snug">Open reminder engine</span> <ChevronRight size={14} className="shrink-0" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => ctx.markAllNotificationsRead()}
                    className={`inline-flex min-h-[44px] min-w-0 shrink-0 cursor-pointer items-center justify-center rounded-xl border px-2 text-xs font-black transition touch-manipulation sm:px-3 ${
                      light ? "border-emerald-200/80 text-emerald-900 hover:bg-emerald-50" : "border-white/10 text-emerald-100 hover:bg-white/[0.06]"
                    }`}
                  >
                    Mark all read
                  </button>
                </div>
              </div>
            </div>
          </>,
          document.body,
        )
      : null;

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`relative grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-xl border transition active:scale-[0.99] touch-manipulation motion-safe:duration-200 ${
          light
            ? "border-emerald-200/80 bg-white/90 text-emerald-900 hover:bg-emerald-50"
            : "border-emerald-500/15 bg-white/[0.05] text-emerald-100 hover:bg-white/[0.08]"
        }`}
        aria-label="Open reminders and notifications"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-haspopup="dialog"
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
      {panel}
    </div>
  );
}
