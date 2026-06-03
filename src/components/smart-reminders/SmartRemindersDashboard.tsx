"use client";

import {
  ArrowLeft,
  Bell,
  CalendarClock,
  CheckCircle2,
  History,
  Plus,
  Sparkles,
  Trash2,
  UsersRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { DashboardSectionHeader } from "@/components/DashboardSectionHeader";
import { WealthDashboardShell } from "@/components/portfolio/WealthDashboardShell";
import { AiReminderInsightsCard } from "@/components/smart-reminders/AiReminderInsightsCard";
import { formatReminderType } from "@/components/smart-reminders/reminder-labels";
import { priorityAccent } from "@/components/smart-reminders/priority-styles";
import { ReminderCalendarCard } from "@/components/smart-reminders/ReminderCalendarCard";
import { UpcomingBillsCard } from "@/components/smart-reminders/UpcomingBillsCard";
import { UpcomingEducationCard } from "@/components/smart-reminders/UpcomingEducationCard";
import { useProductAuth } from "@/contexts/ProductAuthContext";
import { useSmartReminders } from "@/contexts/SmartRemindersContext";
import { useFireTheme } from "@/contexts/FireThemeContext";
import { formatNextSendLabel, nextTheoreticalEmailUtc, type ScheduledReminderShape } from "@/lib/scheduled-reminders/schedule-logic";
import { formatYmd } from "@/lib/smart-reminders/date-utils";
import { reminderPriority } from "@/lib/smart-reminders/reminder-engine";
import type { Reminder, ReminderType } from "@/lib/smart-reminders/types";
import { REMINDER_TYPES, REPEAT_FREQUENCIES } from "@/lib/smart-reminders/types";

function sortByDue(a: Reminder, b: Reminder): number {
  return a.dueDate.localeCompare(b.dueDate);
}

const REMINDER_TIMEZONES = [
  "Asia/Kathmandu",
  "Asia/Seoul",
  "Asia/Singapore",
  "Asia/Dubai",
  "Asia/Tokyo",
  "Europe/London",
  "America/New_York",
  "UTC",
] as const;

function defaultForm(emailFallback: string): Omit<Reminder, "id" | "createdAt"> {
  return {
    title: "",
    reminderType: "room_rent",
    amountNpr: null,
    dueDate: formatYmd(new Date()),
    dueTime: "09:00",
    timezone: "Asia/Kathmandu",
    email: emailFallback,
    repeatFrequency: "monthly",
    notify7DaysBefore: false,
    notify3DaysBefore: false,
    notify1DayBefore: false,
    notifyAtDueTime: true,
    notifyOverdue: false,
    sharedWithFamily: true,
    notes: "",
  };
}

function toScheduleShape(r: Reminder): ScheduledReminderShape {
  return {
    dueDate: r.dueDate,
    dueTime: r.dueTime,
    timezone: r.timezone,
    repeatFrequency: r.repeatFrequency,
    notify7DaysBefore: r.notify7DaysBefore,
    notify3DaysBefore: r.notify3DaysBefore,
    notify1DayBefore: r.notify1DayBefore,
    notifyAtDueTime: r.notifyAtDueTime,
    notifyOverdue: r.notifyOverdue,
  };
}

export function SmartRemindersDashboard() {
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const { user } = useProductAuth();
  const {
    hydrated,
    store,
    reminders,
    remindersSource,
    cloudSyncing,
    refreshCloudReminders,
    markReminderPaid,
    addReminder,
    deleteReminder,
    dismissNotification,
    markNotificationRead,
    setEmailNotificationsEnabled,
    setUpcomingWithinDays,
    pushFamilyShareNotice,
  } = useSmartReminders();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState(() => defaultForm(user?.email ?? ""));
  const [historyOpen, setHistoryOpen] = useState(true);

  const now = new Date();
  const upcomingWithin = store.settings.upcomingWithinDays;

  const sorted = useMemo(() => [...reminders].sort(sortByDue), [reminders]);

  let overdue = 0;
  let upcoming = 0;
  let ok = 0;
  for (const r of reminders) {
    const p = reminderPriority(r, now, upcomingWithin);
    if (p === "overdue") overdue += 1;
    else if (p === "upcoming") upcoming += 1;
    else ok += 1;
  }
  const stats = { overdue, upcoming, ok };

  const footerNote =
    remindersSource === "cloud"
      ? "Signed in · reminders sync to Supabase. Vercel cron + Resend send at the times you pick."
      : "Local workspace — sign in with Supabase on production to sync reminders and enable automated emails.";

  const onSubmit = async () => {
    if (!form.title.trim()) return;
    if (!form.email.trim() || !form.email.includes("@")) return;
    const tm = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(form.dueTime.trim());
    const dueTime =
      tm != null
        ? `${String(Math.min(23, Math.max(0, Number.parseInt(tm[1], 10)))).padStart(2, "0")}:${String(Math.min(59, Math.max(0, Number.parseInt(tm[2], 10)))).padStart(2, "0")}`
        : "09:00";
    await addReminder({
      ...form,
      dueTime,
      title: form.title.trim(),
      notes: form.notes?.trim() ? form.notes.trim() : undefined,
    });
    setForm(defaultForm(user?.email ?? ""));
    setSheetOpen(false);
  };

  if (!hydrated) {
    return (
      <WealthDashboardShell
        brand={{ tagline: "Reminders OS", iconGradient: "from-emerald-400 to-amber-300" }}
        footerNote="Loading your reminder workspace…"
      >
        <div className="px-2 py-16 text-center text-sm font-semibold text-slate-600 dark:text-zinc-400">Loading reminders…</div>
      </WealthDashboardShell>
    );
  }

  return (
    <WealthDashboardShell
      brand={{ tagline: "Reminders OS", iconGradient: "from-emerald-400 to-amber-300" }}
      footerNote={footerNote}
    >
      <div className="mb-6 flex flex-col gap-3 sm:mb-7 sm:flex-row sm:items-center sm:justify-between lg:mb-8">
        <Link
          href="/"
          className={`inline-flex min-h-[44px] w-fit items-center gap-2 rounded-full border px-3.5 py-2.5 text-xs font-black shadow-sm backdrop-blur-md transition duration-300 active:scale-[0.98] sm:text-sm ${
            light
              ? "border-emerald-200/90 bg-white/95 text-emerald-900 hover:border-emerald-300 hover:bg-emerald-50/90"
              : "border-emerald-400/18 bg-white/[0.06] text-emerald-50/95 shadow-[0_8px_28px_-12px_rgba(0,0,0,0.45)] hover:border-teal-300/35 hover:bg-white/10 hover:shadow-[0_12px_36px_-10px_rgba(45,212,191,0.15)]"
          }`}
        >
          <ArrowLeft size={15} /> Back to FIRE Nepal
        </Link>
        <div className={`flex flex-wrap items-center gap-2 text-[11px] font-bold sm:text-xs ${light ? "text-emerald-800/80" : "text-emerald-200/70"}`}>
          <Sparkles size={14} className={light ? "text-emerald-600" : "text-amber-300"} />
          Smart reminder engine · green / gold elite
        </div>
      </div>

      <div className="wealth-dash-flow flex flex-col gap-5 scroll-smooth lg:gap-6">
        <DashboardSectionHeader
          accent="emerald"
          eyebrow={
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/25 bg-amber-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-amber-900 dark:text-amber-100/90">
              <CalendarClock size={12} className="text-amber-700 dark:text-amber-300" />
              Family finance radar
            </span>
          }
          title="FIRE Nepal Smart Reminder Engine"
          subtitle="Recurring bills, school fees, and life events — shared with family, colour-coded by urgency, and nudged with in-app + demo email alerts."
        />

        <section className="grid gap-3 sm:grid-cols-3">
          <div
            className={`wealth-glass flex min-h-[92px] items-center justify-between gap-3 p-4 motion-safe:transition motion-safe:duration-300 motion-safe:hover:-translate-y-0.5 ${
              light ? "border-red-100/80" : "border-red-500/15"
            }`}
          >
            <div>
              <p className="text-[11px] font-black uppercase tracking-wide text-red-700/90 dark:text-red-200/80">Overdue</p>
              <p className="mt-1 text-3xl font-black text-red-700 dark:text-red-200">{stats.overdue}</p>
            </div>
            <span className="h-10 w-1.5 rounded-full bg-gradient-to-b from-red-500 to-rose-400 shadow-lg shadow-red-500/25" />
          </div>
          <div
            className={`wealth-glass flex min-h-[92px] items-center justify-between gap-3 p-4 motion-safe:transition motion-safe:duration-300 motion-safe:hover:-translate-y-0.5 ${
              light ? "border-amber-100/80" : "border-amber-400/15"
            }`}
          >
            <div>
              <p className="text-[11px] font-black uppercase tracking-wide text-amber-800/90 dark:text-amber-100/80">Upcoming</p>
              <p className="mt-1 text-3xl font-black text-amber-900 dark:text-amber-100">{stats.upcoming}</p>
            </div>
            <span className="h-10 w-1.5 rounded-full bg-gradient-to-b from-amber-400 to-yellow-300 shadow-lg shadow-amber-500/25" />
          </div>
          <div
            className={`wealth-glass flex min-h-[92px] items-center justify-between gap-3 p-4 motion-safe:transition motion-safe:duration-300 motion-safe:hover:-translate-y-0.5 ${
              light ? "border-emerald-100/80" : "border-emerald-400/15"
            }`}
          >
            <div>
              <p className="text-[11px] font-black uppercase tracking-wide text-emerald-800/90 dark:text-emerald-100/80">On track</p>
              <p className="mt-1 text-3xl font-black text-emerald-900 dark:text-emerald-100">{stats.ok}</p>
            </div>
            <span className="h-10 w-1.5 rounded-full bg-gradient-to-b from-emerald-400 to-lime-300 shadow-lg shadow-emerald-500/25" />
          </div>
        </section>

        <section className="flex flex-col flex-wrap gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => {
              setForm(defaultForm(user?.email ?? ""));
              setSheetOpen(true);
            }}
            className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-lime-400 px-4 text-sm font-black text-emerald-950 shadow-lg shadow-emerald-500/25 transition hover:brightness-110 active:scale-[0.99] sm:flex-none"
          >
            <Plus size={18} />
            New reminder
          </button>
          {remindersSource === "cloud" ? (
            <button
              type="button"
              disabled={cloudSyncing}
              onClick={() => void refreshCloudReminders()}
              className={`inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-2xl border px-4 text-sm font-black transition active:scale-[0.99] sm:flex-none ${
                light
                  ? "border-emerald-300/70 bg-white text-emerald-950 hover:bg-emerald-50"
                  : "border-emerald-400/25 bg-emerald-500/10 text-emerald-50 hover:bg-emerald-500/15"
              }`}
            >
              {cloudSyncing ? "Syncing…" : "Refresh from cloud"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => pushFamilyShareNotice("Family board updated — review shared rent + school reminders together.")}
            className={`inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-2xl border px-4 text-sm font-black transition active:scale-[0.99] sm:flex-none ${
              light
                ? "border-amber-300/70 bg-amber-50/80 text-amber-950 hover:bg-amber-50"
                : "border-amber-400/25 bg-amber-500/10 text-amber-50 hover:bg-amber-500/15"
            }`}
          >
            <UsersRound size={18} />
            Ping family board
          </button>
          <div
            className={`flex flex-1 flex-col gap-2 rounded-2xl border p-3 sm:flex-row sm:items-center sm:justify-between ${
              light ? "border-emerald-200/70 bg-white/70" : "border-white/10 bg-black/20"
            }`}
          >
            <label className="flex items-center gap-2 text-xs font-black text-slate-800 dark:text-zinc-200">
              <input
                type="checkbox"
                checked={store.settings.emailNotificationsEnabled}
                onChange={(e) => setEmailNotificationsEnabled(e.target.checked)}
                className="h-4 w-4 accent-emerald-600"
              />
              In-app + demo toasts (local mode)
            </label>
            {remindersSource === "cloud" ? (
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300/90">Cloud reminders use Resend + cron.</span>
            ) : null}
            <label className="flex items-center gap-2 text-xs font-black text-slate-800 dark:text-zinc-200">
              <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400">Yellow window</span>
              <input
                type="number"
                min={1}
                max={60}
                value={store.settings.upcomingWithinDays}
                onChange={(e) => setUpcomingWithinDays(Number.parseInt(e.target.value || "7", 10))}
                className={`w-16 rounded-lg border px-2 py-1 text-xs font-black ${
                  light ? "border-emerald-200/80 bg-white" : "border-white/10 bg-black/30 text-white"
                }`}
              />
              <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400">days</span>
            </label>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <UpcomingBillsCard reminders={reminders} upcomingWithinDays={upcomingWithin} onMarkPaid={markReminderPaid} />
          <UpcomingEducationCard reminders={reminders} upcomingWithinDays={upcomingWithin} onMarkPaid={markReminderPaid} />
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <ReminderCalendarCard reminders={reminders} />
          <AiReminderInsightsCard
            reminders={reminders}
            upcomingWithinDays={upcomingWithin}
            historyCount={store.history.length}
          />
        </section>

        <section
          className={`wealth-glass overflow-hidden p-4 sm:p-5 motion-safe:transition motion-safe:duration-300 ${
            light ? "shadow-sm" : "shadow-[0_18px_50px_-28px_rgba(0,0,0,0.55)]"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Bell className="text-emerald-600 dark:text-emerald-300" size={18} />
              <div>
                <p className="text-sm font-black text-slate-900 dark:text-white">In-app notifications</p>
                <p className="text-xs font-semibold text-slate-600 dark:text-zinc-400">Due today, overdue, demo email sends, and family shares.</p>
              </div>
            </div>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {store.notifications.length ? (
              store.notifications.slice(0, 10).map((n) => (
                <div
                  key={n.id}
                  className={`flex items-start justify-between gap-3 rounded-2xl border p-3 ${
                    light ? "border-emerald-100/90 bg-white/70" : "border-white/10 bg-black/25"
                  }`}
                >
                  <button type="button" className="min-w-0 text-left" onClick={() => markNotificationRead(n.id)}>
                    <p className="text-xs font-black text-slate-900 dark:text-white">{n.title}</p>
                    <p className="mt-1 text-[11px] font-semibold leading-snug text-slate-600 dark:text-zinc-400">{n.body}</p>
                  </button>
                  <button
                    type="button"
                    aria-label="Dismiss notification"
                    onClick={() => dismissNotification(n.id)}
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border transition active:scale-[0.99] ${
                      light ? "border-slate-200/80 text-slate-700 hover:bg-slate-50" : "border-white/10 text-zinc-200 hover:bg-white/[0.06]"
                    }`}
                  >
                    <X size={16} />
                  </button>
                </div>
              ))
            ) : (
              <p className="text-sm font-semibold text-slate-600 dark:text-zinc-400">No notifications yet.</p>
            )}
          </div>
        </section>

        <section
          className={`wealth-glass overflow-hidden p-4 sm:p-5 motion-safe:transition motion-safe:duration-300 ${
            light ? "shadow-sm" : "shadow-[0_18px_50px_-28px_rgba(0,0,0,0.55)]"
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-700/90 dark:text-emerald-300/75">All reminders</p>
              <h3 className="mt-1 text-lg font-black text-slate-900 dark:text-white">Household ledger</h3>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {sorted.map((r) => {
              const p = reminderPriority(r, now, upcomingWithin);
              const a = priorityAccent(p);
              const nextUtc = nextTheoreticalEmailUtc(toScheduleShape(r), now);
              const nextLabel = formatNextSendLabel(nextUtc, r.timezone);
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
                      <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-emerald-50">
                        {formatReminderType(r.reminderType)}
                      </span>
                      {r.sharedWithFamily ? (
                        <span className="rounded-full border border-sky-400/25 bg-sky-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-sky-50">
                          Family
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 truncate text-sm font-black text-slate-900 dark:text-white">{r.title}</p>
                    <p className="mt-0.5 text-xs font-semibold text-slate-600 dark:text-zinc-400">
                      Due {r.dueDate} at {r.dueTime} ({r.timezone}) · {r.repeatFrequency}
                      {r.amountNpr != null ? ` · NPR ${r.amountNpr.toLocaleString("en-IN")}` : ""}
                      {r.email ? ` · ${r.email}` : ""}
                    </p>
                    <p className="mt-1 text-[11px] font-bold text-emerald-800/90 dark:text-emerald-200/85">Next email: {nextLabel}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    <button
                      type="button"
                      onClick={() => void markReminderPaid(r.id)}
                      className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 text-xs font-black text-emerald-50 transition hover:bg-emerald-500/15 active:scale-[0.99]"
                    >
                      <CheckCircle2 size={16} />
                      Mark paid
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteReminder(r.id)}
                      className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border px-4 text-xs font-black transition active:scale-[0.99] ${
                        light ? "border-slate-200/90 text-slate-800 hover:bg-slate-50" : "border-white/10 text-zinc-200 hover:bg-white/[0.06]"
                      }`}
                    >
                      <Trash2 size={16} />
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section
          className={`wealth-glass overflow-hidden p-4 sm:p-5 motion-safe:transition motion-safe:duration-300 ${
            light ? "shadow-sm" : "shadow-[0_18px_50px_-28px_rgba(0,0,0,0.55)]"
          }`}
        >
          <button
            type="button"
            onClick={() => setHistoryOpen((v) => !v)}
            className="flex w-full items-center justify-between gap-3 text-left"
          >
            <div className="flex items-center gap-2">
              <History className="text-emerald-600 dark:text-emerald-300" size={18} />
              <div>
                <p className="text-sm font-black text-slate-900 dark:text-white">Reminder history</p>
                <p className="text-xs font-semibold text-slate-600 dark:text-zinc-400">Paid items archive in green for peace of mind.</p>
              </div>
            </div>
            <span className={`text-xs font-black ${light ? "text-emerald-800" : "text-emerald-200"}`}>{historyOpen ? "Hide" : "Show"}</span>
          </button>
          {historyOpen ? (
            <div className="mt-4 space-y-2">
              {store.history.length ? (
                store.history.slice(0, 40).map((h) => (
                  <div
                    key={h.id}
                    className={`flex items-start justify-between gap-3 rounded-2xl border p-3 ${
                      light ? "border-emerald-200/70 bg-emerald-50/50" : "border-emerald-400/15 bg-emerald-500/[0.06]"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="h-1.5 w-10 rounded-full bg-gradient-to-r from-emerald-400 via-lime-300 to-emerald-600" />
                        <span className="rounded-full border border-emerald-400/35 bg-emerald-500/12 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-emerald-50">
                          Paid
                        </span>
                        <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-emerald-50">
                          {formatReminderType(h.reminderType)}
                        </span>
                      </div>
                      <p className="mt-2 truncate text-sm font-black text-slate-900 dark:text-white">{h.title}</p>
                      <p className="mt-0.5 text-xs font-semibold text-slate-600 dark:text-zinc-400">
                        Paid {new Date(h.paidAt).toLocaleString()} · was due {h.dueDate} ({h.repeatFrequency})
                        {h.amountNpr != null ? ` · NPR ${h.amountNpr.toLocaleString("en-IN")}` : ""}
                      </p>
                    </div>
                    <CheckCircle2 className="shrink-0 text-emerald-500" size={18} />
                  </div>
                ))
              ) : (
                <p className="text-sm font-semibold text-slate-600 dark:text-zinc-400">No paid history yet — mark your first reminder.</p>
              )}
            </div>
          ) : null}
        </section>
      </div>

      {sheetOpen ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-4">
          <button type="button" className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-label="Close" onClick={() => setSheetOpen(false)} />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="smart-reminder-sheet-title"
            className={`relative flex max-h-[min(92dvh,calc(100dvh-0.5rem))] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border shadow-2xl motion-safe:transition motion-safe:duration-300 sm:max-h-[min(88dvh,44rem)] sm:rounded-3xl ${
              light ? "border-emerald-200/80 bg-white" : "border-emerald-500/15 bg-[#030806]"
            }`}
          >
            <div className="shrink-0 px-4 pb-2 pt-3 sm:px-6 sm:pt-6">
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-300/80 dark:bg-white/15 sm:hidden" />
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-700/90 dark:text-emerald-300/75">Create</p>
                  <h3 id="smart-reminder-sheet-title" className="text-lg font-black text-slate-900 dark:text-white">
                    New reminder
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSheetOpen(false)}
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border transition ${
                    light ? "border-slate-200/80 text-slate-800 hover:bg-slate-50" : "border-white/10 text-zinc-200 hover:bg-white/[0.06]"
                  }`}
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-8 sm:px-6">
              <div className="grid gap-3">
                <label className="grid gap-1">
                <span className="text-[11px] font-black uppercase tracking-wide text-slate-600 dark:text-zinc-400">Title</span>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Kathmandu home electricity"
                  className={`min-h-[44px] rounded-xl border px-3 text-sm font-semibold outline-none ring-emerald-500/30 focus:ring-4 ${
                    light ? "border-emerald-200/80 bg-white text-slate-900" : "border-white/10 bg-black/30 text-white"
                  }`}
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1">
                  <span className="text-[11px] font-black uppercase tracking-wide text-slate-600 dark:text-zinc-400">Type</span>
                  <select
                    value={form.reminderType}
                    onChange={(e) => setForm((f) => ({ ...f, reminderType: e.target.value as ReminderType }))}
                    className={`min-h-[44px] rounded-xl border px-2 text-sm font-bold outline-none ring-emerald-500/30 focus:ring-4 ${
                      light ? "border-emerald-200/80 bg-white text-slate-900" : "border-white/10 bg-black/30 text-white"
                    }`}
                  >
                    {REMINDER_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {formatReminderType(t)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1">
                  <span className="text-[11px] font-black uppercase tracking-wide text-slate-600 dark:text-zinc-400">Repeat</span>
                  <select
                    value={form.repeatFrequency}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, repeatFrequency: e.target.value as (typeof REPEAT_FREQUENCIES)[number] }))
                    }
                    className={`min-h-[44px] rounded-xl border px-2 text-sm font-bold outline-none ring-emerald-500/30 focus:ring-4 ${
                      light ? "border-emerald-200/80 bg-white text-slate-900" : "border-white/10 bg-black/30 text-white"
                    }`}
                  >
                    {REPEAT_FREQUENCIES.map((t) => (
                      <option key={t} value={t}>
                        {t === "once"
                          ? "One-time"
                          : t === "daily"
                            ? "Daily"
                            : t === "weekly"
                              ? "Weekly"
                              : t === "monthly"
                                ? "Monthly"
                                : "Yearly"}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1">
                  <span className="text-[11px] font-black uppercase tracking-wide text-slate-600 dark:text-zinc-400">Due date</span>
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                    className={`min-h-[44px] rounded-xl border px-2 text-sm font-bold outline-none ring-emerald-500/30 focus:ring-4 ${
                      light ? "border-emerald-200/80 bg-white text-slate-900" : "border-white/10 bg-black/30 text-white"
                    }`}
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-[11px] font-black uppercase tracking-wide text-slate-600 dark:text-zinc-400">Due time</span>
                  <input
                    type="time"
                    value={form.dueTime}
                    onChange={(e) => setForm((f) => ({ ...f, dueTime: e.target.value }))}
                    className={`min-h-[44px] rounded-xl border px-2 text-sm font-bold outline-none ring-emerald-500/30 focus:ring-4 ${
                      light ? "border-emerald-200/80 bg-white text-slate-900" : "border-white/10 bg-black/30 text-white"
                    }`}
                  />
                </label>
              </div>

              <label className="grid gap-1">
                <span className="text-[11px] font-black uppercase tracking-wide text-slate-600 dark:text-zinc-400">Time zone (IANA)</span>
                <input
                  list="fire-reminder-tz"
                  value={form.timezone}
                  onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value.trim() || "Asia/Kathmandu" }))}
                  placeholder="Asia/Kathmandu"
                  className={`min-h-[44px] rounded-xl border px-3 text-sm font-semibold outline-none ring-emerald-500/30 focus:ring-4 ${
                    light ? "border-emerald-200/80 bg-white text-slate-900" : "border-white/10 bg-black/30 text-white"
                  }`}
                />
                <datalist id="fire-reminder-tz">
                  {REMINDER_TIMEZONES.map((z) => (
                    <option key={z} value={z} />
                  ))}
                </datalist>
              </label>

              <label className="grid gap-1">
                <span className="text-[11px] font-black uppercase tracking-wide text-slate-600 dark:text-zinc-400">Reminder email</span>
                <input
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="you@example.com"
                  className={`min-h-[44px] rounded-xl border px-3 text-sm font-semibold outline-none ring-emerald-500/30 focus:ring-4 ${
                    light ? "border-emerald-200/80 bg-white text-slate-900" : "border-white/10 bg-black/30 text-white"
                  }`}
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1">
                  <span className="text-[11px] font-black uppercase tracking-wide text-slate-600 dark:text-zinc-400">Amount (NPR)</span>
                  <input
                    inputMode="numeric"
                    value={form.amountNpr ?? ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (!v) return setForm((f) => ({ ...f, amountNpr: null }));
                      const n = Number.parseInt(v, 10);
                      if (!Number.isFinite(n)) return;
                      setForm((f) => ({ ...f, amountNpr: Math.max(0, n) }));
                    }}
                    placeholder="Optional"
                    className={`min-h-[44px] rounded-xl border px-3 text-sm font-semibold outline-none ring-emerald-500/30 focus:ring-4 ${
                      light ? "border-emerald-200/80 bg-white text-slate-900" : "border-white/10 bg-black/30 text-white"
                    }`}
                  />
                </label>
              </div>

              <div
                className={`rounded-2xl border p-3 ${light ? "border-emerald-200/70 bg-emerald-50/40" : "border-emerald-500/15 bg-black/25"}`}
              >
                <p className="text-[11px] font-black uppercase tracking-wide text-emerald-800 dark:text-emerald-200/90">Email schedule</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-zinc-200">
                    <input
                      type="checkbox"
                      checked={form.notify7DaysBefore}
                      onChange={(e) => setForm((f) => ({ ...f, notify7DaysBefore: e.target.checked }))}
                      className="h-4 w-4 accent-emerald-600"
                    />
                    7 days before
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-zinc-200">
                    <input
                      type="checkbox"
                      checked={form.notify3DaysBefore}
                      onChange={(e) => setForm((f) => ({ ...f, notify3DaysBefore: e.target.checked }))}
                      className="h-4 w-4 accent-emerald-600"
                    />
                    3 days before
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-zinc-200">
                    <input
                      type="checkbox"
                      checked={form.notify1DayBefore}
                      onChange={(e) => setForm((f) => ({ ...f, notify1DayBefore: e.target.checked }))}
                      className="h-4 w-4 accent-emerald-600"
                    />
                    1 day before
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-zinc-200">
                    <input
                      type="checkbox"
                      checked={form.notifyAtDueTime}
                      onChange={(e) => setForm((f) => ({ ...f, notifyAtDueTime: e.target.checked }))}
                      className="h-4 w-4 accent-emerald-600"
                    />
                    At exact due time
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-zinc-200 sm:col-span-2">
                    <input
                      type="checkbox"
                      checked={form.notifyOverdue}
                      onChange={(e) => setForm((f) => ({ ...f, notifyOverdue: e.target.checked }))}
                      className="h-4 w-4 accent-emerald-600"
                    />
                    Daily overdue (each day after due, at due time)
                  </label>
                </div>
              </div>

              <label className="grid gap-1">
                <span className="text-[11px] font-black uppercase tracking-wide text-slate-600 dark:text-zinc-400">Notes</span>
                <textarea
                  value={form.notes ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  className={`resize-none rounded-xl border px-3 py-2 text-sm font-semibold outline-none ring-emerald-500/30 focus:ring-4 ${
                    light ? "border-emerald-200/80 bg-white text-slate-900" : "border-white/10 bg-black/30 text-white"
                  }`}
                />
              </label>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <label className="flex items-center gap-2 text-xs font-black text-slate-800 dark:text-zinc-200">
                  <input
                    type="checkbox"
                    checked={form.sharedWithFamily}
                    onChange={(e) => setForm((f) => ({ ...f, sharedWithFamily: e.target.checked }))}
                    className="h-4 w-4 accent-emerald-600"
                  />
                  Share with family
                </label>
              </div>
              </div>
            </div>

            <div
              className={`shrink-0 border-t px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_40px_-18px_rgba(0,0,0,0.18)] sm:px-6 sm:pt-4 ${
                light
                  ? "border-emerald-200/70 bg-white/95 backdrop-blur-md supports-[backdrop-filter]:bg-white/80"
                  : "border-white/[0.08] bg-[#030806]/95 backdrop-blur-md supports-[backdrop-filter]:bg-[#030806]/85"
              }`}
            >
              <button
                type="button"
                onClick={onSubmit}
                className="inline-flex min-h-[48px] w-full items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-500 to-lime-400 text-sm font-black text-emerald-950 shadow-lg shadow-emerald-500/25 transition hover:brightness-110 active:scale-[0.99]"
              >
                Save reminder
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </WealthDashboardShell>
  );
}
