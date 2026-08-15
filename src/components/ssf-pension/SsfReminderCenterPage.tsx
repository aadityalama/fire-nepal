"use client";

import { Mail, Smartphone } from "lucide-react";
import { useSsfPension } from "@/contexts/SsfPensionContext";
import { buildSsfReminderEmailBody, SSF_EMAIL_SUBJECT } from "@/lib/ssf-pension/email-template";
import { PensionChrome } from "@/components/pension/PensionChrome";
import { OfficialPortalActions } from "@/components/pension/OfficialPortalActions";
import { PcCopy, PcEyebrow, PcSurface, PcTitle } from "@/components/pension/PensionUi";

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
        <PcSurface className="space-y-3 p-4 sm:p-5">
          <PcEyebrow>Delivery</PcEyebrow>
          <PcTitle as="h2">Reminder preferences</PcTitle>
          <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-white/[0.07] bg-[#080d13] px-3.5 py-3">
            <span className="flex items-center gap-2 text-sm font-semibold text-white">
              <Mail size={18} className="text-[#7dd3c0]" /> Email reminders
            </span>
            <input
              type="checkbox"
              className="h-5 w-5 accent-teal-500"
              checked={emailReminders}
              onChange={(e) => setReminderPrefs({ emailReminders: e.target.checked })}
            />
          </label>
          <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-white/[0.07] bg-[#080d13] px-3.5 py-3">
            <span className="flex items-center gap-2 text-sm font-semibold text-white">
              <Smartphone size={18} className="text-[#7dd3c0]" /> Push notifications
            </span>
            <input
              type="checkbox"
              className="h-5 w-5 accent-teal-500"
              checked={pushNotifications}
              onChange={(e) => setReminderPrefs({ pushNotifications: e.target.checked })}
            />
          </label>
          <label className="block text-xs font-bold text-[#8b9aab]">
            Days before due
            <input
              type="number"
              min={1}
              max={30}
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#080d13] px-3 py-2.5 text-sm font-semibold text-white outline-none focus:border-[#2dd4bf]/45 focus:ring-2 focus:ring-[#2dd4bf]/20"
              value={premiumDueDaysBefore}
              onChange={(e) => setReminderPrefs({ premiumDueDaysBefore: Math.round(Number(e.target.value) || 3) })}
            />
          </label>
        </PcSurface>
        <PcSurface className="space-y-3 p-4 sm:p-5">
          <PcEyebrow>Preview</PcEyebrow>
          <PcTitle as="h2">Sample reminder</PcTitle>
          <p className="text-xs font-bold text-[#6b7c8f]">{SSF_EMAIL_SUBJECT}</p>
          <pre className="whitespace-pre-wrap rounded-2xl border border-white/[0.07] bg-[#080d13] p-3.5 text-[11px] leading-relaxed text-[#8b9aab]">
            {sampleBody}
          </pre>
          <PcCopy className="text-[11px] text-amber-100/90">
            Reminder copy never includes fabricated contribution amounts. Complete Pay / Contribution on the official
            portal.
          </PcCopy>
        </PcSurface>
      </div>
    </PensionChrome>
  );
}
