"use client";

import { Bell, ChevronRight, Handshake, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useFireLending } from "@/contexts/FireLendingContext";
import { useFireTheme } from "@/contexts/FireThemeContext";
import type { FireLendingNotification } from "@/lib/fire-lending/types";
import { formatCompactDate } from "@/lib/fire-lending/format";

function notificationHref(n: FireLendingNotification): string {
  if (n.href) return n.href;
  if (n.relatedLoanId) return `/fire-lending/loans/${n.relatedLoanId}`;
  return "/fire-lending/requests";
}

export function FireLendingNotificationBell() {
  const { store, markNotificationRead, partyById } = useFireLending();
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const listId = useId();

  const close = useCallback(() => setOpen(false), []);

  const notifications = useMemo(
    () =>
      store.notifications.filter(
        (n) => !n.forPartyId || n.forPartyId === store.currentUserId,
      ),
    [store.notifications, store.currentUserId],
  );

  const unread = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);
  const preview = notifications.slice(0, 8);
  const pendingLoanRequests = useMemo(
    () =>
      store.requests.filter(
        (r) => r.status === "pending" && r.toPartyId === store.currentUserId,
      ).length,
    [store.requests, store.currentUserId],
  );

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
    (n: FireLendingNotification) => {
      markNotificationRead(n.id);
      close();
      router.push(notificationHref(n));
    },
    [markNotificationRead, close, router],
  );

  const panel =
    open && typeof document !== "undefined"
      ? createPortal(
          <>
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
              aria-label="Loan and P2P notifications"
              data-testid="fire-lending-notification-panel"
              className={`fixed left-1/2 top-16 z-[410] flex w-[min(92vw,380px)] max-w-sm -translate-x-1/2 flex-col overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-xl touch-manipulation max-lg:max-h-[min(70dvh,calc(100dvh-5.5rem))] lg:left-auto lg:right-4 lg:translate-x-0 ${
                light ? "border-emerald-200/70 bg-white/95" : "border-emerald-500/15 bg-[#030806]/95"
              }`}
            >
              <div
                className={`flex shrink-0 items-center justify-between gap-2 border-b px-3 py-3 sm:px-4 ${
                  light ? "border-emerald-100/80 bg-emerald-50/40" : "border-white/10 bg-emerald-500/[0.06]"
                }`}
              >
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-400 to-lime-400 text-emerald-950 shadow-lg shadow-emerald-500/20">
                    <Handshake size={16} />
                  </span>
                  <div className="min-w-0 flex-1 leading-tight">
                    <p className={`truncate text-sm font-black ${light ? "text-slate-900" : "text-white"}`}>
                      Loan notifications
                    </p>
                    <p className={`text-[11px] font-semibold ${light ? "text-emerald-800/80" : "text-emerald-200/70"}`}>
                      {unread ? `${unread} unread` : "All caught up"}
                      {pendingLoanRequests
                        ? ` · ${pendingLoanRequests} pending request${pendingLoanRequests === 1 ? "" : "s"}`
                        : ""}
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
                  preview.map((n) => {
                    const linkedRequest = n.relatedRequestId
                      ? store.requests.find((r) => r.id === n.relatedRequestId)
                      : undefined;
                    const from = linkedRequest ? partyById(linkedRequest.fromPartyId) : undefined;
                    const pending = linkedRequest?.status === "pending";
                    return (
                      <button
                        key={n.id}
                        type="button"
                        data-testid={`lending-notification-${n.id}`}
                        data-unread={n.read ? "false" : "true"}
                        onClick={() => openNotification(n)}
                        className={`relative z-10 flex w-full min-h-[52px] min-w-0 max-w-full cursor-pointer items-start gap-3 rounded-xl px-3 py-2.5 text-left transition touch-manipulation active:scale-[0.99] ${
                          n.read
                            ? light
                              ? "hover:bg-slate-50"
                              : "hover:bg-white/[0.04]"
                            : light
                              ? "bg-rose-50/80 hover:bg-rose-50 ring-1 ring-rose-200/70"
                              : "bg-rose-500/[0.12] hover:bg-rose-500/[0.16] ring-1 ring-rose-400/25"
                        }`}
                        aria-label={`${n.title}. ${n.body}. Open notification.`}
                      >
                        <span
                          className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                            n.read ? "bg-slate-300" : "bg-red-500"
                          }`}
                          aria-hidden
                        />
                        <span className="min-w-0 flex-1 pointer-events-none">
                          <span className={`block break-words text-xs font-black ${light ? "text-slate-900" : "text-white"}`}>
                            {n.title}
                          </span>
                          <span
                            className={`mt-0.5 block break-words text-[11px] font-semibold leading-snug ${
                              light ? "text-slate-600" : "text-zinc-400"
                            }`}
                          >
                            {from?.name
                              ? `${from.name} sent you a loan request.`
                              : n.body}
                          </span>
                          <span
                            className={`mt-1 block text-[10px] font-bold ${light ? "text-slate-400" : "text-emerald-200/45"}`}
                          >
                            {formatCompactDate(n.createdAt)}
                            {n.relatedLoanId ? ` · Loan ${n.relatedLoanId}` : ""}
                            {pending ? " · Pending" : ""}
                          </span>
                          {n.kind === "loan_request" ? (
                            <span
                              className={`mt-1.5 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-black ${
                                light ? "bg-emerald-100 text-emerald-900" : "bg-emerald-500/20 text-lime-200"
                              }`}
                            >
                              Review Request <ChevronRight size={12} />
                            </span>
                          ) : null}
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <p className={`px-3 py-6 text-center text-sm font-semibold ${light ? "text-slate-600" : "text-zinc-400"}`}>
                    No loan notifications yet.
                  </p>
                )}
              </div>

              <div className={`relative z-10 shrink-0 border-t px-3 py-2 ${light ? "border-emerald-100/80" : "border-white/10"}`}>
                <Link
                  href="/fire-lending/requests"
                  onClick={close}
                  className="inline-flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-lime-400 px-2 text-center text-xs font-black text-emerald-950 shadow-lg shadow-emerald-500/25 transition hover:brightness-110 touch-manipulation"
                >
                  Open loan requests <ChevronRight size={14} className="shrink-0" />
                </Link>
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
        data-testid="fire-lending-notification-bell"
        onClick={() => setOpen((v) => !v)}
        className={`relative grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-xl border transition active:scale-[0.99] touch-manipulation ${
          light
            ? "border-emerald-200/80 bg-white/90 text-emerald-900 hover:bg-emerald-50"
            : "border-emerald-500/15 bg-white/[0.05] text-emerald-100 hover:bg-white/[0.08]"
        }`}
        aria-label="Open loan notifications"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-haspopup="dialog"
      >
        <Bell size={18} />
        {unread > 0 ? (
          <span
            data-testid="fire-lending-unread-badge"
            className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-red-500 px-1 text-center text-[10px] font-black text-white shadow-md shadow-red-500/40 ring-2 ring-white/80"
          >
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </button>
      {panel}
    </div>
  );
}
