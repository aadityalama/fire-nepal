"use client";

import { Mail, Smartphone } from "lucide-react";
import { useSsfPension } from "@/contexts/SsfPensionContext";
import { buildSsfReminderEmailBody, SSF_EMAIL_SUBJECT } from "@/lib/ssf-pension/email-template";
import { PensionChrome } from "@/components/pension/PensionChrome";
import { OfficialPortalActions } from "@/components/pension/OfficialPortalActions";
import {
  PensionBody,
  PensionGlassPanel,
  PensionHeading,
  PensionSectionLabel,
  PensionSoftRow,
} from "@/components/pension/PensionUi";

export function SsfReminderCenterPage() {
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
      <OfficialPortalActions institution="ssf" />
      <div className="grid gap-4 lg:grid-cols-2">
        <PensionGlassPanel className="space-y-4 p-4 sm:p-5">
          <div>
            <PensionSectionLabel>Delivery</PensionSectionLabel>
            <PensionHeading>Reminder preferences</PensionHeading>
          </div>
          <PensionSoftRow>
            <label className="flex cursor-pointer items-center justify-between gap-3">
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
          </PensionSoftRow>
          <PensionSoftRow>
            <label className="flex cursor-pointer items-center justify-between gap-3">
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
          </PensionSoftRow>
          <label className="block text-xs font-bold text-slate-600 dark:text-zinc-400">
            Days before due
            <input
              type="number"
              min={1}
              max={30}
              className="mt-1.5 w-full rounded-xl border border-slate-200/90 bg-white/90 px-3 py-2.5 text-sm font-black text-slate-900 outline-none transition focus:border-teal-400/50 focus:ring-2 focus:ring-teal-400/25 dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
              value={premiumDueDaysBefore}
              onChange={(e) => setReminderPrefs({ premiumDueDaysBefore: Math.round(Number(e.target.value) || 3) })}
            />
          </label>
        </PensionGlassPanel>
        <PensionGlassPanel className="space-y-3 p-4 sm:p-5">
          <div>
            <PensionSectionLabel>Preview</PensionSectionLabel>
            <PensionHeading>Sample reminder</PensionHeading>
          </div>
          <p className="text-xs font-bold text-slate-500 dark:text-zinc-500">{SSF_EMAIL_SUBJECT}</p>
          <pre className="whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/20 p-3.5 text-[11px] font-semibold leading-relaxed text-slate-600 dark:text-zinc-400">
            {sampleBody}
          </pre>
          <PensionBody className="text-[11px] text-amber-700 dark:text-amber-300">
            Reminder copy never includes fabricated contribution amounts. Complete Pay / Contribution on the official
            portal.
          </PensionBody>
        </PensionGlassPanel>
      </div>
    </PensionChrome>
  );
}
