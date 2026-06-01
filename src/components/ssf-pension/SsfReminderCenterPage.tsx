"use client";

import { Mail, Smartphone } from "lucide-react";
import { useSsfPension } from "@/contexts/SsfPensionContext";
import { buildSsfReminderEmailBody, SSF_EMAIL_SUBJECT } from "@/lib/ssf-pension/email-template";
import { SSF_SUMMARY } from "@/lib/ssf-pension/demo-data";
import { PensionChrome } from "@/components/pension/PensionChrome";

const ALERTS: { id: string; title: string; body: string; tone: "amber" | "rose" | "teal" }[] = [];

export function SsfReminderCenterPage() {
  const { workspace, setReminderPrefs } = useSsfPension();
  const { emailReminders, pushNotifications, premiumDueDaysBefore } = workspace.reminderPrefs;
  const sampleBody = buildSsfReminderEmailBody({
    dueDateLabel: SSF_SUMMARY.nextContributionLabel || "your scheduled contribution date",
  });

  return (
    <PensionChrome
      title="Reminder Center"
      subtitle="Contribution alerts, employer reconciliation nudges, and delivery preferences — wired to cron email hooks."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="wealth-glass space-y-4 p-4 sm:p-5">
          <h2 className="text-sm font-black uppercase tracking-[0.14em] text-slate-500 dark:text-zinc-400">Delivery</h2>
          <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200/80 px-3 py-3 dark:border-white/10">
            <span className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-zinc-100">
              <Mail size={18} className="text-teal-600 dark:text-teal-300" /> Email reminders
            </span>
            <input
              type="checkbox"
              className="h-5 w-5 accent-teal-600"
              checked={emailReminders}
              onChange={(e) => setReminderPrefs({ emailReminders: e.target.checked })}
            />
          </label>
          <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200/80 px-3 py-3 dark:border-white/10">
            <span className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-zinc-100">
              <Smartphone size={18} className="text-teal-600 dark:text-teal-300" /> Push notifications
            </span>
            <input
              type="checkbox"
              className="h-5 w-5 accent-teal-600"
              checked={pushNotifications}
              onChange={(e) => setReminderPrefs({ pushNotifications: e.target.checked })}
            />
          </label>
          <label className="block text-xs font-bold text-slate-600 dark:text-zinc-400">
            Remind me (days before due)
            <input
              type="number"
              min={1}
              max={30}
              className="mt-1 w-full rounded-xl border border-slate-200/90 bg-white/90 px-3 py-2 text-sm font-black dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
              value={premiumDueDaysBefore}
              onChange={(e) => setReminderPrefs({ premiumDueDaysBefore: Math.min(30, Math.max(1, Number(e.target.value))) })}
            />
          </label>
        </section>

        <section className="wealth-glass space-y-3 p-4 sm:p-5">
          <h2 className="text-sm font-black uppercase tracking-[0.14em] text-slate-500 dark:text-zinc-400">Sample email</h2>
          <p className="text-xs font-bold uppercase tracking-wide text-teal-700 dark:text-teal-300">{SSF_EMAIL_SUBJECT}</p>
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-xl border border-slate-200/80 bg-slate-50/90 p-3 text-[11px] font-medium leading-relaxed text-slate-800 dark:border-white/10 dark:bg-black/30 dark:text-zinc-200">
            {sampleBody}
          </pre>
        </section>
      </div>

      <section className="wealth-glass space-y-3 p-4 sm:p-5">
        <h2 className="text-lg font-black text-slate-900 dark:text-white">Premium reminder system</h2>
        {ALERTS.length === 0 ? (
          <p className="rounded-xl border border-slate-200/80 bg-slate-50/80 px-3 py-4 text-sm font-medium text-slate-600 dark:border-white/10 dark:bg-black/25 dark:text-zinc-300">
            No reminders yet. When your SSF workspace is linked to payroll or imports, alerts will appear here.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {ALERTS.map((a) => (
              <li
                key={a.id}
                className={`rounded-xl border px-3 py-3 text-sm font-semibold ${
                  a.tone === "rose"
                    ? "border-rose-400/25 bg-rose-500/10 text-rose-950 dark:text-rose-50"
                    : a.tone === "amber"
                      ? "border-amber-400/25 bg-amber-500/10 text-amber-950 dark:text-amber-50"
                      : "border-teal-400/25 bg-teal-500/10 text-teal-950 dark:text-teal-50"
                }`}
              >
                <p className="font-black">{a.title}</p>
                <p className="mt-1 text-xs opacity-90">{a.body}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </PensionChrome>
  );
}
