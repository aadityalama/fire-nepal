"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Bell, Bot, Save, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  CUSTOM_GOAL_ICONS,
  CUSTOM_GOAL_TEMPLATE,
  SAVINGS_GOAL_TEMPLATES,
  type SavingsGoalTemplate,
} from "@/lib/savings/savings-templates";
import {
  computeGoalProgress,
  DEFAULT_REMINDER_TIMINGS,
  defaultTargetDate,
  formatDisplayDate,
  formatRs,
} from "@/lib/savings/savings-utils";
import type { SavingsGoal, SavingsGoalFormInput, SavingsReminderTiming } from "@/lib/savings/savings-types";

type SavingsGoalSheetProps = {
  open: boolean;
  editingGoal: SavingsGoal | null;
  onClose: () => void;
  onSave: (input: SavingsGoalFormInput, editingId?: string) => Promise<void>;
  saving: boolean;
};

type SheetStep = "templates" | "form";

function ToggleSwitch({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`flex min-h-[52px] w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition active:scale-[0.99] ${
        checked ? "border-emerald-300/50 bg-emerald-400/15" : "border-white/10 bg-white/[0.04]"
      }`}
    >
      <span className="text-sm font-bold text-emerald-50">{label}</span>
      <span className={`relative h-8 w-14 rounded-full p-1 transition ${checked ? "bg-emerald-400" : "bg-white/18"}`}>
        <span className={`block h-6 w-6 rounded-full bg-white shadow-lg transition-transform duration-200 ${checked ? "translate-x-6" : "translate-x-0"}`} />
      </span>
    </button>
  );
}

function buildFormFromTemplate(template: SavingsGoalTemplate): SavingsGoalFormInput {
  return {
    templateId: template.id,
    name: template.name,
    icon: template.icon,
    category: template.category,
    targetAmountNpr: template.suggestedTargetNpr,
    savedAmountNpr: 0,
    monthlyContributionNpr: template.suggestedMonthlyNpr,
    targetDate: defaultTargetDate(template.suggestedMonths),
    reminderEnabled: true,
    reminderTimings: [...DEFAULT_REMINDER_TIMINGS],
    notes: "",
  };
}

function buildFormFromGoal(goal: SavingsGoal): SavingsGoalFormInput {
  return {
    templateId: goal.templateId,
    name: goal.name,
    icon: goal.icon,
    category: goal.category,
    targetAmountNpr: goal.targetAmountNpr,
    savedAmountNpr: goal.savedAmountNpr,
    monthlyContributionNpr: goal.monthlyContributionNpr,
    targetDate: goal.targetDate,
    reminderEnabled: goal.reminderEnabled,
    reminderTimings: goal.reminderTimings,
    notes: goal.notes ?? "",
  };
}

export function SavingsGoalSheet({ open, editingGoal, onClose, onSave, saving }: SavingsGoalSheetProps) {
  const [step, setStep] = useState<SheetStep>("templates");
  const [form, setForm] = useState<SavingsGoalFormInput>(() => buildFormFromTemplate(SAVINGS_GOAL_TEMPLATES[0]));

  useEffect(() => {
    if (!open) return;
    if (editingGoal) {
      setForm(buildFormFromGoal(editingGoal));
      setStep("form");
      return;
    }
    setStep("templates");
    setForm(buildFormFromTemplate(SAVINGS_GOAL_TEMPLATES[0]));
  }, [open, editingGoal]);

  const previewGoal: SavingsGoal = useMemo(
    () => ({
      id: "preview",
      templateId: form.templateId,
      name: form.name,
      icon: form.icon,
      category: form.category,
      targetAmountNpr: form.targetAmountNpr,
      savedAmountNpr: form.savedAmountNpr,
      monthlyContributionNpr: form.monthlyContributionNpr,
      targetDate: form.targetDate,
      reminderEnabled: form.reminderEnabled,
      reminderTimings: form.reminderTimings,
      notes: form.notes,
      status: "active",
      sortOrder: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
    [form],
  );
  const progress = computeGoalProgress(previewGoal);

  function selectTemplate(template: SavingsGoalTemplate) {
    setForm(buildFormFromTemplate(template));
    setStep("form");
  }

  async function handleSave() {
    if (!form.name.trim() || form.targetAmountNpr <= 0 || saving) return;
    await onSave(form, editingGoal?.id);
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 bg-[#020806]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="flex h-[100dvh] flex-col overflow-hidden">
            <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3 pt-[calc(0.75rem+env(safe-area-inset-top,0px))]">
              <button
                type="button"
                onClick={onClose}
                className="grid min-h-[44px] min-w-[44px] place-items-center rounded-full bg-white/[0.06] text-emerald-100"
                aria-label="Close goal sheet"
              >
                <X size={20} />
              </button>
              <div className="text-center">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-100/45">
                  {editingGoal ? "Edit Goal" : step === "templates" ? "Choose Template" : "Goal Details"}
                </p>
                <h2 className="text-lg font-black text-white">{editingGoal ? editingGoal.name : "New Savings Goal"}</h2>
              </div>
              {step === "form" ? (
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={saving || !form.name.trim() || form.targetAmountNpr <= 0}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-gradient-to-r from-emerald-300 to-lime-300 px-4 text-sm font-black text-emerald-950 disabled:opacity-60"
                >
                  <Save size={16} /> {saving ? "Saving..." : "Save"}
                </button>
              ) : (
                <span className="min-w-[44px]" />
              )}
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] [-webkit-overflow-scrolling:touch]">
              {step === "templates" && !editingGoal ? (
                <div className="mx-auto grid max-w-3xl gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {[...SAVINGS_GOAL_TEMPLATES, CUSTOM_GOAL_TEMPLATE].map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => selectTemplate(template)}
                      className="rounded-[1.4rem] border border-white/10 bg-white/[0.05] p-4 text-left transition active:scale-[0.98] hover:border-emerald-300/30 hover:bg-emerald-400/10"
                    >
                      <span className="text-3xl">{template.icon}</span>
                      <p className="mt-3 text-base font-black text-white">{template.name}</p>
                      <p className="mt-1 text-xs font-semibold text-emerald-100/55">{formatRs(template.suggestedTargetNpr)} suggested</p>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="mx-auto max-w-2xl space-y-4">
                  {form.templateId === "custom" ? (
                    <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.055] p-4">
                      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-100/50">Choose Icon</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {CUSTOM_GOAL_ICONS.map((icon) => (
                          <button
                            key={icon}
                            type="button"
                            onClick={() => setForm((current) => ({ ...current, icon }))}
                            className={`grid h-12 w-12 place-items-center rounded-2xl text-xl ${
                              form.icon === icon ? "bg-lime-300/20 ring-2 ring-lime-300/60" : "bg-white/[0.05]"
                            }`}
                          >
                            {icon}
                          </button>
                        ))}
                      </div>
                    </section>
                  ) : null}

                  <Field label="Goal Name">
                    <input
                      value={form.name}
                      onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                      className="min-h-[54px] w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-base font-bold text-white outline-none focus:border-emerald-300/45"
                    />
                  </Field>

                  <Field label="Category">
                    <input
                      value={form.category}
                      onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                      className="min-h-[54px] w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-base font-bold text-white outline-none focus:border-emerald-300/45"
                    />
                  </Field>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Target Amount">
                      <MoneyInput value={form.targetAmountNpr} onChange={(value) => setForm((current) => ({ ...current, targetAmountNpr: value }))} />
                    </Field>
                    <Field label="Current Saved">
                      <MoneyInput value={form.savedAmountNpr} onChange={(value) => setForm((current) => ({ ...current, savedAmountNpr: value }))} />
                    </Field>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Monthly Contribution">
                      <MoneyInput
                        value={form.monthlyContributionNpr}
                        onChange={(value) => setForm((current) => ({ ...current, monthlyContributionNpr: value }))}
                      />
                    </Field>
                    <Field label="Target Date">
                      <input
                        type="date"
                        value={form.targetDate}
                        onChange={(event) => setForm((current) => ({ ...current, targetDate: event.target.value }))}
                        className="min-h-[54px] w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-base font-bold text-white outline-none focus:border-emerald-300/45"
                      />
                    </Field>
                  </div>

                  <section className="rounded-[1.5rem] border border-emerald-300/15 bg-emerald-400/10 p-4">
                    <div className="flex items-center gap-2">
                      <Sparkles size={16} className="text-lime-200" />
                      <p className="text-sm font-black text-white">Auto Calculate</p>
                    </div>
                    <div className="mt-3 grid gap-2 text-sm font-semibold text-emerald-50/85 sm:grid-cols-2">
                      <p>Saved: {progress.savedPct}%</p>
                      <p>Remaining: {formatRs(progress.remainingAmountNpr)}</p>
                      <p>{progress.remainingLabel}</p>
                      <p>Expected finish: {progress.expectedCompletionDate ? formatDisplayDate(progress.expectedCompletionDate) : "—"}</p>
                    </div>
                  </section>

                  <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.055] p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-100/50">Reminder</p>
                      <Bell size={16} className="text-lime-200" />
                    </div>
                    <ToggleSwitch
                      label="Enable reminders"
                      checked={form.reminderEnabled}
                      onChange={() => setForm((current) => ({ ...current, reminderEnabled: !current.reminderEnabled }))}
                    />
                    {form.reminderEnabled ? (
                      <div className="mt-3 space-y-2">
                        {DEFAULT_REMINDER_TIMINGS.map((option) => (
                          <ToggleSwitch
                            key={option}
                            label={option}
                            checked={form.reminderTimings.includes(option)}
                            onChange={() =>
                              setForm((current) => ({
                                ...current,
                                reminderTimings: current.reminderTimings.includes(option)
                                  ? current.reminderTimings.filter((item) => item !== option)
                                  : [...current.reminderTimings, option as SavingsReminderTiming],
                              }))
                            }
                          />
                        ))}
                      </div>
                    ) : null}
                  </section>

                  <Field label="Notes">
                    <textarea
                      value={form.notes ?? ""}
                      onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                      rows={3}
                      className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-semibold text-white outline-none focus:border-emerald-300/45"
                      placeholder="Optional notes for this goal..."
                    />
                  </Field>

                  <section className="rounded-[1.5rem] border border-lime-300/20 bg-gradient-to-br from-emerald-400/15 to-lime-300/10 p-4">
                    <div className="flex items-center gap-2">
                      <Bot size={18} className="text-lime-200" />
                      <p className="text-sm font-black text-white">AI Recommendation</p>
                    </div>
                    <p className="mt-3 text-sm font-semibold leading-relaxed text-emerald-50/85">
                      {form.monthlyContributionNpr > 0 && progress.remainingAmountNpr > 0
                        ? `Staying on ${formatRs(form.monthlyContributionNpr)}/month keeps ${form.name} on track for ${progress.expectedCompletionDate ? formatDisplayDate(progress.expectedCompletionDate) : "completion"}.`
                        : "Set a monthly contribution to unlock a personalized savings recommendation."}
                    </p>
                  </section>

                  {!editingGoal ? (
                    <button
                      type="button"
                      onClick={() => setStep("templates")}
                      className="min-h-[48px] w-full rounded-2xl border border-white/10 bg-white/[0.04] text-sm font-black text-emerald-100"
                    >
                      Back to templates
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => void handleSave()}
                    disabled={saving || !form.name.trim() || form.targetAmountNpr <= 0}
                    className="min-h-[52px] w-full rounded-2xl bg-gradient-to-r from-emerald-300 to-lime-300 text-base font-black text-emerald-950 disabled:opacity-60"
                  >
                    {saving ? "Saving..." : "Save Goal"}
                  </button>
                  <button type="button" onClick={onClose} className="min-h-[48px] w-full rounded-2xl border border-white/10 text-sm font-black text-emerald-100">
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.055] p-4">
      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-100/50">{label}</p>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function MoneyInput({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <label className="flex min-h-[54px] items-center rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4">
      <span className="mr-2 text-sm font-black text-lime-200">Rs.</span>
      <input
        value={value ? String(value) : ""}
        onChange={(event) => onChange(Number(event.target.value.replace(/[^\d]/g, "")) || 0)}
        inputMode="numeric"
        className="min-w-0 flex-1 bg-transparent text-xl font-black text-white outline-none"
      />
    </label>
  );
}
