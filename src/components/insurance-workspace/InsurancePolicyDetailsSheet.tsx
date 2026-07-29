"use client";

import { Bell, Pencil, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { InsurancePolicy } from "@/lib/insurance/insurance-types";
import { INSURANCE_TYPE_ICONS, PAYMENT_FREQUENCY_LABELS } from "@/lib/insurance/insurance-types";
import {
  buildPremiumDisplay,
  buildPremiumDueInfo,
  formatDisplayDate,
  formatRs,
  typeLabel,
} from "@/lib/insurance/insurance-utils";
import {
  loadPremiumReminderPrefs,
  premiumReminderStatusLabel,
  savePremiumReminderPrefs,
} from "@/lib/insurance/insurance-premium-reminders";
import { useEffect, useMemo, useState } from "react";

const URGENCY_STYLES = {
  green: "border-emerald-300/35 bg-emerald-400/12 text-lime-100",
  yellow: "border-amber-300/40 bg-amber-400/12 text-amber-100",
  orange: "border-orange-300/40 bg-orange-400/15 text-orange-100",
  red: "border-rose-300/40 bg-rose-400/15 text-rose-100",
  neutral: "border-white/15 bg-white/[0.06] text-emerald-100/70",
} as const;

type InsurancePolicyDetailsSheetProps = {
  open: boolean;
  policy: InsurancePolicy | null;
  onClose: () => void;
  onEdit: (policy: InsurancePolicy) => void;
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl border border-white/10 bg-black/15 px-3.5 py-3">
      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-emerald-100/45">{label}</p>
      <p className="max-w-[58%] text-right text-sm font-bold text-white">{value}</p>
    </div>
  );
}

export function InsurancePolicyDetailsSheet({
  open,
  policy,
  onClose,
  onEdit,
}: InsurancePolicyDetailsSheetProps) {
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [todayKey, setTodayKey] = useState(() => new Date().toDateString());

  useEffect(() => {
    if (!open) return;
    setRemindersEnabled(loadPremiumReminderPrefs().enabled);
  }, [open]);

  useEffect(() => {
    const id = window.setInterval(() => {
      const next = new Date().toDateString();
      setTodayKey((current) => (current === next ? current : next));
    }, 60_000);
    return () => window.clearInterval(id);
  }, []);

  const premium = useMemo(
    () => (policy ? buildPremiumDisplay(policy.premiumNpr, policy.paymentFrequency) : null),
    [policy],
  );
  const dueInfo = useMemo(
    () => (policy ? buildPremiumDueInfo(policy) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh when local calendar day changes
    [policy, todayKey],
  );

  if (!policy || !dueInfo || !premium) return null;

  const remainingLabel = !dueInfo.hasSchedule
    ? "—"
    : dueInfo.overdue
      ? `Overdue by ${Math.abs(dueInfo.daysRemaining)} day${Math.abs(dueInfo.daysRemaining) === 1 ? "" : "s"}`
      : dueInfo.daysRemaining === 0
        ? "Due today"
        : dueInfo.daysRemaining === 1
          ? "1 day left"
          : `${dueInfo.daysRemaining} days left`;

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[65] flex items-end justify-center bg-[#020806]/80 backdrop-blur-md sm:items-center sm:p-5"
        >
          <button type="button" aria-label="Close policy details" className="absolute inset-0" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, y: 36 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 28 }}
            transition={{ type: "spring", stiffness: 380, damping: 34, mass: 0.85 }}
            className="relative flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[1.85rem] border border-emerald-300/15 bg-[#04140f] shadow-2xl sm:max-h-[88vh] sm:rounded-[2rem]"
          >
            <div className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-white/20 sm:hidden" />
            <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-5 sm:pt-5">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/[0.06] text-xl">
                  {INSURANCE_TYPE_ICONS[policy.type]}
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-100/50">
                    Policy Details
                  </p>
                  <h2 className="truncate text-lg font-black text-white">{policy.provider}</h2>
                  <p className="text-xs font-semibold text-emerald-100/50">{typeLabel(policy.type)}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="grid h-10 w-10 place-items-center rounded-full bg-white/[0.06] text-emerald-100"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </header>

            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-5">
              <div className={`rounded-2xl border px-4 py-3 ${URGENCY_STYLES[dueInfo.urgency]}`}>
                <p className="text-[11px] font-black uppercase tracking-[0.14em]">
                  {dueInfo.emoji} {dueInfo.headline}
                </p>
                <p className="mt-1 text-base font-black tracking-[-0.03em]">{dueInfo.detail}</p>
                {dueInfo.dueDate ? (
                  <p className="mt-1 text-xs font-semibold opacity-80">
                    {formatDisplayDate(dueInfo.dueDate)}
                    {dueInfo.hasSchedule && !dueInfo.overdue && dueInfo.daysRemaining > 0
                      ? ` (${dueInfo.daysRemaining} days left)`
                      : ""}
                  </p>
                ) : null}
              </div>

              <DetailRow
                label="Next Premium Date"
                value={dueInfo.dueDate ? formatDisplayDate(dueInfo.dueDate) : "—"}
              />
              <DetailRow
                label="Premium Frequency"
                value={PAYMENT_FREQUENCY_LABELS[policy.paymentFrequency]}
              />
              <DetailRow label="Premium Amount" value={premium.value} />
              <DetailRow
                label="Last Premium Paid"
                value={dueInfo.lastPremiumPaidDate ? formatDisplayDate(dueInfo.lastPremiumPaidDate) : "—"}
              />
              <DetailRow label="Remaining Days" value={remainingLabel} />

              <div className="rounded-2xl border border-white/10 bg-black/15 px-3.5 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-black uppercase tracking-[0.14em] text-emerald-100/45">
                      Auto Reminder Status
                    </p>
                    <p className="mt-1 text-sm font-bold text-white">
                      {premiumReminderStatusLabel(remindersEnabled)}
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={remindersEnabled}
                    onClick={() => {
                      const next = !remindersEnabled;
                      setRemindersEnabled(next);
                      savePremiumReminderPrefs({ enabled: next });
                    }}
                    className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-[11px] font-black uppercase tracking-wide transition ${
                      remindersEnabled
                        ? "border-emerald-300/40 bg-emerald-400/15 text-lime-100"
                        : "border-white/15 bg-white/[0.06] text-emerald-100/55"
                    }`}
                  >
                    <Bell size={12} />
                    {remindersEnabled ? "On" : "Off"}
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/15 px-3.5 py-3">
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-emerald-100/45">
                  Upcoming Premium Schedule
                </p>
                {dueInfo.upcomingDates.length === 0 ? (
                  <p className="mt-2 text-sm font-semibold text-emerald-100/50">No upcoming premium dates</p>
                ) : (
                  <ul className="mt-2 space-y-1.5">
                    {dueInfo.upcomingDates.map((iso, index) => (
                      <li
                        key={iso}
                        className="flex items-center justify-between gap-2 text-sm font-semibold text-emerald-50/90"
                      >
                        <span>
                          {index === 0 ? "Next" : `#${index + 1}`} · {formatDisplayDate(iso)}
                        </span>
                        <span className="text-xs font-bold text-emerald-100/45">{formatRs(policy.premiumNpr)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/15 px-3.5 py-3">
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-emerald-100/45">Coverage</p>
                <p className="mt-1 text-base font-black text-white">{formatRs(policy.coverageAmountNpr)}</p>
                {policy.nominee ? (
                  <p className="mt-2 text-xs font-semibold text-emerald-100/50">Nominee · {policy.nominee}</p>
                ) : null}
              </div>
            </div>

            <div className="shrink-0 border-t border-white/10 p-4 sm:p-5">
              <button
                type="button"
                onClick={() => onEdit(policy)}
                className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-300 to-lime-300 text-sm font-black text-emerald-950"
              >
                <Pencil size={16} /> Edit Policy
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
