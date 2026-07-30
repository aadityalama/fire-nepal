"use client";

import {
  Bell,
  Check,
  ChevronDown,
  Download,
  Eye,
  Pencil,
  Replace,
  Trash2,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { InsuranceDocument, InsurancePolicy, InsurancePolicyFormInput } from "@/lib/insurance/insurance-types";
import {
  INSURANCE_DOCUMENT_KIND_LABELS,
  INSURANCE_TYPE_ICONS,
  PAYMENT_FREQUENCY_LABELS,
} from "@/lib/insurance/insurance-types";
import {
  createInsuranceDocument,
  syncLegacyDocumentFields,
} from "@/lib/insurance/insurance-normalize";
import { policyToFormInput } from "@/lib/insurance/policy-to-form";
import {
  buildPolicyQuickSummary,
  buildPolicyTimeline,
  buildPremiumDisplay,
  buildPremiumDueInfo,
  buildPremiumTracker,
  formatDisplayDate,
  formatRs,
  typeLabel,
} from "@/lib/insurance/insurance-utils";
import {
  loadPremiumReminderPrefs,
  premiumReminderStatusLabel,
  savePremiumReminderPrefs,
} from "@/lib/insurance/insurance-premium-reminders";
import { useEffect, useMemo, useState, type ReactNode } from "react";

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
  onUpdate?: (input: InsurancePolicyFormInput, policyId: string) => Promise<void>;
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl border border-white/10 bg-black/15 px-3.5 py-3">
      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-emerald-100/45">{label}</p>
      <p className="max-w-[58%] break-words text-right text-sm font-bold text-white">{value || "—"}</p>
    </div>
  );
}

function CollapsibleSection({
  title,
  defaultOpen = false,
  badge,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  badge?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-black/15">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-[52px] w-full items-center justify-between gap-3 px-3.5 py-3 text-left"
      >
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-emerald-100/55">{title}</p>
          {badge ? <p className="mt-1 text-xs font-semibold text-emerald-100/45">{badge}</p> : null}
        </div>
        <ChevronDown
          size={18}
          className={`shrink-0 text-emerald-100/55 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open ? <div className="space-y-2.5 border-t border-white/10 px-3.5 py-3">{children}</div> : null}
    </section>
  );
}

function downloadDataUrl(dataUrl: string, fileName: string) {
  const anchor = document.createElement("a");
  anchor.href = dataUrl;
  anchor.download = fileName;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Could not read file"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

export function InsurancePolicyDetailsSheet({
  open,
  policy,
  onClose,
  onEdit,
  onUpdate,
}: InsurancePolicyDetailsSheetProps) {
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [todayKey, setTodayKey] = useState(() => new Date().toDateString());
  const [savingDocs, setSavingDocs] = useState(false);

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
  const tracker = useMemo(
    () => (policy ? buildPremiumTracker(policy) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [policy, todayKey],
  );
  const timeline = useMemo(
    () => (policy ? buildPolicyTimeline(policy) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [policy, todayKey],
  );
  const summary = useMemo(
    () => (policy ? buildPolicyQuickSummary(policy) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [policy, todayKey],
  );

  if (!policy || !dueInfo || !premium || !tracker || !timeline || !summary) return null;

  const paidHistory = tracker.history.filter((item) => item.status === "paid");
  const upcomingHistory = tracker.history.filter((item) => item.status !== "paid");

  async function persistDocuments(documents: InsuranceDocument[]) {
    if (!onUpdate || !policy) return;
    setSavingDocs(true);
    try {
      const input = policyToFormInput(policy);
      const synced = syncLegacyDocumentFields({
        documents: Array.isArray(documents) ? documents : [],
        documentDataUrl: null,
        documentFileName: null,
      });
      await onUpdate({ ...input, ...synced }, policy.id);
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[insurance-details] document update failed", error);
      }
    } finally {
      setSavingDocs(false);
    }
  }

  async function replaceDocument(doc: InsuranceDocument, file: File | null) {
    if (!file || !policy) return;
    const dataUrl = await readFileAsDataUrl(file);
    const next = createInsuranceDocument(doc.kind, file.name, dataUrl);
    const documents = (policy.documents ?? []).map((item) =>
      item.id === doc.id ? { ...next, id: doc.id, kind: doc.kind } : item,
    );
    await persistDocuments(documents);
  }

  async function deleteDocument(docId: string) {
    if (!policy) return;
    await persistDocuments((policy.documents ?? []).filter((doc) => doc.id !== docId));
  }

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
                className="grid h-11 w-11 place-items-center rounded-full bg-white/[0.06] text-emerald-100"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </header>

            <div className="flex-1 space-y-3 overflow-x-hidden overflow-y-auto px-4 py-4 sm:px-5">
              <div className={`rounded-2xl border px-4 py-3 ${URGENCY_STYLES[tracker.smartStatus.urgency]}`}>
                <p className="text-[11px] font-black uppercase tracking-[0.14em]">
                  {tracker.smartStatus.emoji} {tracker.smartStatus.label}
                </p>
                <p className="mt-1 text-base font-black tracking-[-0.03em]">{dueInfo.detail}</p>
                {dueInfo.dueDate ? (
                  <p className="mt-1 text-xs font-semibold opacity-80">
                    Next · {formatDisplayDate(dueInfo.dueDate)}
                  </p>
                ) : null}
              </div>

              <section className="rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-3.5">
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-emerald-100/55">
                  Quick Summary
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-black/20 px-3 py-2.5">
                    <p className="text-[10px] font-black uppercase tracking-wide text-emerald-100/45">Policy Value</p>
                    <p className="mt-1 text-sm font-black text-white">{formatRs(summary.policyValueNpr)}</p>
                  </div>
                  <div className="rounded-xl bg-black/20 px-3 py-2.5">
                    <p className="text-[10px] font-black uppercase tracking-wide text-emerald-100/45">Coverage</p>
                    <p className="mt-1 text-sm font-black text-white">{formatRs(summary.coverageNpr)}</p>
                  </div>
                  <div className="rounded-xl bg-black/20 px-3 py-2.5">
                    <p className="text-[10px] font-black uppercase tracking-wide text-emerald-100/45">Premium Paid</p>
                    <p className="mt-1 text-sm font-black text-lime-100">{formatRs(summary.totalPremiumPaidNpr)}</p>
                  </div>
                  <div className="rounded-xl bg-black/20 px-3 py-2.5">
                    <p className="text-[10px] font-black uppercase tracking-wide text-emerald-100/45">Remaining</p>
                    <p className="mt-1 text-sm font-black text-amber-100">{formatRs(summary.remainingPremiumNpr)}</p>
                  </div>
                  <div className="rounded-xl bg-black/20 px-3 py-2.5">
                    <p className="text-[10px] font-black uppercase tracking-wide text-emerald-100/45">Installments Paid</p>
                    <p className="mt-1 text-sm font-black text-white">{summary.installmentsPaid}</p>
                  </div>
                  <div className="rounded-xl bg-black/20 px-3 py-2.5">
                    <p className="text-[10px] font-black uppercase tracking-wide text-emerald-100/45">Remaining</p>
                    <p className="mt-1 text-sm font-black text-white">{summary.installmentsRemaining}</p>
                  </div>
                  <div className="rounded-xl bg-black/20 px-3 py-2.5">
                    <p className="text-[10px] font-black uppercase tracking-wide text-emerald-100/45">Next Premium</p>
                    <p className="mt-1 text-sm font-black text-white">
                      {summary.nextPremiumDate ? formatDisplayDate(summary.nextPremiumDate) : "—"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-black/20 px-3 py-2.5">
                    <p className="text-[10px] font-black uppercase tracking-wide text-emerald-100/45">Next Amount</p>
                    <p className="mt-1 text-sm font-black text-white">{formatRs(summary.nextPremiumAmountNpr)}</p>
                  </div>
                </div>
              </section>

              <CollapsibleSection title="Overview" defaultOpen badge={typeLabel(policy.type)}>
                <DetailRow label="Provider" value={policy.provider} />
                <DetailRow label="Start Date" value={timeline.startedOn ? formatDisplayDate(timeline.startedOn) : "—"} />
                <DetailRow label="End Date" value={timeline.endsOn ? formatDisplayDate(timeline.endsOn) : "—"} />
                <DetailRow label="Running for" value={timeline.runningForLabel} />
                <DetailRow label="Remaining" value={timeline.remainingLabel} />
                <DetailRow label="Policy Term" value={tracker.policyTermYears > 0 ? `${tracker.policyTermYears} Years` : "—"} />
                {(policy.familyMembersCovered ?? []).length > 0 ? (
                  <DetailRow label="Family Covered" value={(policy.familyMembersCovered ?? []).join(", ")} />
                ) : null}
              </CollapsibleSection>

              <CollapsibleSection
                title="Premium Tracker"
                defaultOpen
                badge={`${tracker.installmentsPaid}/${tracker.totalInstallments || "—"} paid`}
              >
                <DetailRow label="Premium Frequency" value={PAYMENT_FREQUENCY_LABELS[policy.paymentFrequency] ?? "—"} />
                <DetailRow label="Premium Amount" value={premium.value} />
                <DetailRow label="Total Installments" value={String(tracker.totalInstallments || "—")} />
                <DetailRow label="Installments Paid" value={String(tracker.installmentsPaid)} />
                <DetailRow label="Installments Remaining" value={String(tracker.installmentsRemaining)} />
                <DetailRow label="Premium Paid So Far" value={`${formatRs(tracker.premiumPaidSoFarNpr)} Paid`} />
                <DetailRow label="Remaining Premium" value={formatRs(tracker.remainingPremiumNpr)} />
                <DetailRow
                  label="Next Premium Date"
                  value={tracker.nextPremiumDate ? formatDisplayDate(tracker.nextPremiumDate) : "—"}
                />
              </CollapsibleSection>

              <CollapsibleSection title="Payment History" badge={`${tracker.history.length} installments`}>
                {paidHistory.length === 0 && upcomingHistory.length === 0 ? (
                  <p className="text-sm font-semibold text-emerald-100/50">No premium schedule yet. Add a start date and term.</p>
                ) : (
                  <div className="space-y-3">
                    {paidHistory.length > 0 ? (
                      <div>
                        <p className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100/45">Paid</p>
                        <ul className="space-y-1.5">
                          {paidHistory.map((item) => (
                            <li
                              key={`paid-${item.dueDate}`}
                              className="flex items-center justify-between gap-2 rounded-xl border border-emerald-300/20 bg-emerald-400/10 px-3 py-2.5"
                            >
                              <span className="inline-flex min-w-0 items-center gap-2 text-sm font-semibold text-emerald-50">
                                <Check size={14} className="shrink-0 text-lime-200" />
                                <span className="truncate">{formatDisplayDate(item.dueDate)}</span>
                              </span>
                              <span className="shrink-0 text-xs font-bold text-lime-100">{formatRs(item.amountNpr)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {upcomingHistory.length > 0 ? (
                      <div>
                        <p className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100/45">
                          Upcoming
                        </p>
                        <ul className="space-y-1.5">
                          {upcomingHistory.map((item) => (
                            <li
                              key={`upcoming-${item.dueDate}`}
                              className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 ${
                                item.status === "overdue"
                                  ? "border-rose-300/30 bg-rose-400/10"
                                  : item.status === "due"
                                    ? "border-orange-300/30 bg-orange-400/10"
                                    : "border-white/10 bg-white/[0.04]"
                              }`}
                            >
                              <span className="truncate text-sm font-semibold text-emerald-50">
                                {formatDisplayDate(item.dueDate)}
                                {item.status === "overdue"
                                  ? " · Overdue"
                                  : item.status === "due"
                                    ? " · Due today"
                                    : ""}
                              </span>
                              <span className="shrink-0 text-xs font-bold text-emerald-100/70">
                                {formatRs(item.amountNpr)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                )}
              </CollapsibleSection>

              <CollapsibleSection title="Documents & Notes" badge={`${(policy.documents ?? []).length} files`}>
                <DetailRow label="Notes" value={policy.notes || "—"} />
                <DetailRow label="Agent Name" value={policy.agentName || "—"} />
                <DetailRow label="Agent Phone" value={policy.agentPhone || "—"} />
                <DetailRow label="Branch" value={policy.branch || "—"} />
                <DetailRow label="Policy Number" value={policy.policyNumber || "—"} />
                <DetailRow label="Proposal Number" value={policy.proposalNumber || "—"} />
                <DetailRow label="PAN" value={policy.pan || "—"} />
                <DetailRow label="Nominee" value={policy.nominee || "—"} />
                <DetailRow label="Medical Notes" value={policy.medicalNotes || "—"} />

                {(policy.documents ?? []).length === 0 ? (
                  <p className="pt-1 text-sm font-semibold text-emerald-100/50">No documents uploaded yet.</p>
                ) : (
                  <div className="space-y-2 pt-1">
                    {(policy.documents ?? []).map((doc) => (
                      <div key={doc.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100/45">
                          {INSURANCE_DOCUMENT_KIND_LABELS[doc.kind]}
                        </p>
                        <p className="mt-1 truncate text-sm font-bold text-white">{doc.fileName}</p>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => window.open(doc.dataUrl, "_blank", "noopener,noreferrer")}
                            className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-black/20 text-xs font-black text-emerald-50"
                          >
                            <Eye size={14} /> View
                          </button>
                          <button
                            type="button"
                            onClick={() => downloadDataUrl(doc.dataUrl, doc.fileName)}
                            className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-black/20 text-xs font-black text-emerald-50"
                          >
                            <Download size={14} /> Download
                          </button>
                          {onUpdate ? (
                            <>
                              <label className="inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-black/20 text-xs font-black text-emerald-50">
                                <Replace size={14} /> Replace
                                <input
                                  type="file"
                                  accept="image/*,application/pdf"
                                  className="hidden"
                                  disabled={savingDocs}
                                  onChange={(e) => {
                                    const file = e.target.files?.[0] ?? null;
                                    void replaceDocument(doc, file);
                                    e.target.value = "";
                                  }}
                                />
                              </label>
                              <button
                                type="button"
                                disabled={savingDocs}
                                onClick={() => void deleteDocument(doc.id)}
                                className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-rose-300/25 bg-rose-400/10 text-xs font-black text-rose-100 disabled:opacity-50"
                              >
                                <Trash2 size={14} /> Delete
                              </button>
                            </>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CollapsibleSection>

              <CollapsibleSection title="Coverage">
                <DetailRow label="Coverage Amount" value={formatRs(policy.coverageAmountNpr)} />
                <DetailRow label="Nominee" value={policy.nominee || "—"} />
                <DetailRow
                  label="Family Members"
                  value={(policy.familyMembersCovered ?? []).length > 0 ? (policy.familyMembersCovered ?? []).join(", ") : "—"}
                />
              </CollapsibleSection>

              <CollapsibleSection title="Reminders">
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
                      className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-full border px-3 text-[11px] font-black uppercase tracking-wide transition ${
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
                <DetailRow
                  label="Next Premium Date"
                  value={dueInfo.dueDate ? formatDisplayDate(dueInfo.dueDate) : "—"}
                />
                <DetailRow
                  label="Last Premium Paid"
                  value={dueInfo.lastPremiumPaidDate ? formatDisplayDate(dueInfo.lastPremiumPaidDate) : "—"}
                />
              </CollapsibleSection>
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
