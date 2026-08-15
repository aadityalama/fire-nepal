"use client";

import { Mail, Smartphone } from "lucide-react";
import { useFireTheme } from "@/contexts/FireThemeContext";
import { useSsfPension } from "@/contexts/SsfPensionContext";
import { buildSsfReminderEmailBody, SSF_EMAIL_SUBJECT } from "@/lib/ssf-pension/email-template";
import { PensionChrome } from "@/components/pension/PensionChrome";
import { OfficialPortalActions } from "@/components/pension/OfficialPortalActions";

export function SsfReminderCenterPage() {
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const { workspace, setReminderPrefs } = useSsfPension();
  const { emailReminders, pushNotifications, premiumDueDaysBefore } = workspace.reminderPrefs;
  const sampleBody = buildSsfReminderEmailBody({
    dueDateLabel: "your scheduled contribution date on the official portal",
  });

  return (
    <PensionChrome
      title="Reminder Center"
      subtitle="Local reminder preferences only — contribution payment still happens on official Pay / Contribution portals."
    >
      <OfficialPortalActions institution="ssf" light={light} />
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
            Days before due
            <input
              type="number"
              min={1}
              max={30}
              className="mt-1 w-full rounded-xl border border-slate-200/90 bg-white/90 px-3 py-2 text-sm font-black text-slate-900 dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
              value={premiumDueDaysBefore}
              onChange={(e) => setReminderPrefs({ premiumDueDaysBefore: Math.round(Number(e.target.value) || 3) })}
            />
          </label>
        </section>
        <section className="wealth-glass space-y-3 p-4 sm:p-5">
          <h2 className="text-sm font-black uppercase tracking-[0.14em] text-slate-500 dark:text-zinc-400">Sample reminder</h2>
          <p className="text-xs font-bold text-slate-500">{SSF_EMAIL_SUBJECT}</p>
          <pre className="whitespace-pre-wrap rounded-xl border border-white/10 bg-black/20 p-3 text-[11px] font-semibold text-slate-600 dark:text-zinc-400">
            {sampleBody}
          </pre>
          <p className="text-[11px] font-bold text-amber-700 dark:text-amber-300">
            Reminder copy never includes fabricated contribution amounts. Complete Pay / Contribution on the official portal.
          </p>
        </section>
      </div>
    </PensionChrome>
  );
}
