"use client";

import { ArrowLeft, Check, Hammer, Home, Minus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { BackToReturnChecklistLink } from "@/components/return-to-nepal/BackToReturnChecklistLink";
import { useProductAuth } from "@/contexts/ProductAuthContext";
import { useReturnToNepalPlanner } from "@/contexts/ReturnToNepalContext";
import { RETURN_CHECKLIST_HREF } from "@/lib/return-to-nepal/checklist-nav";
import { fetchSavingsWorkspace, saveSavingsWorkspaceToCloud } from "@/lib/savings/savings-api";
import {
  appendSavingsTransaction,
  clearSavingsWorkspaceLocalCache,
  createGoalId,
  loadSavingsWorkspaceState,
  saveSavingsWorkspaceState,
  sanitizeSavingsWorkspaceState,
} from "@/lib/savings/savings-storage";
import { SAVINGS_GOAL_TEMPLATES } from "@/lib/savings/savings-templates";
import type { SavingsGoal, SavingsWorkspaceState } from "@/lib/savings/savings-types";
import { sortGoalsStable } from "@/lib/savings/savings-utils";
import type { HouseAcquireMode, HousePlanDecision } from "@/lib/return-to-nepal/types";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const PAGE_BG = "#000805";
const GLASS = "rounded-[1.35rem] border border-white/10 bg-white/[0.055] backdrop-blur-xl";
const inputClass =
  "min-h-[52px] w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-base font-semibold text-white outline-none placeholder:text-emerald-100/30 focus:border-emerald-300/40";

const HOUSE_TEMPLATE = SAVINGS_GOAL_TEMPLATES.find((t) => t.id === "house")!;

function findHouseGoal(goals: SavingsGoal[]): SavingsGoal | undefined {
  return goals.find(
    (goal) =>
      goal.templateId === "house" ||
      ((/house|land|property/i.test(goal.name) || /house|land|property/i.test(goal.category)) &&
        goal.templateId !== "nepal-return"),
  );
}

function sanitizeAmount(value: string): string {
  return value.replace(/,/g, "").replace(/[^\d]/g, "");
}

function parseAmount(value: string): number {
  const n = Number(sanitizeAmount(value));
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
}

function formatNpr(n: number): string {
  return `NPR ${Math.round(n).toLocaleString("en-NP")}`;
}

type DecisionCardProps = {
  selected: boolean;
  title: string;
  description: string;
  icon: ReactNode;
  onSelect: () => void;
};

function DecisionCard({ selected, title, description, icon, onSelect }: DecisionCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex min-h-[88px] w-full items-start gap-3 rounded-2xl border px-4 py-4 text-left transition active:scale-[0.99] ${
        selected
          ? "border-emerald-400/45 bg-emerald-500/15 ring-1 ring-emerald-400/30"
          : "border-white/10 bg-black/25 hover:border-white/20"
      }`}
    >
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-400/12 text-emerald-200">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-black text-white">{title}</span>
        <span className="mt-1 block text-sm font-semibold text-emerald-100/55">{description}</span>
      </span>
      {selected ? (
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-500/25 text-emerald-300">
          <Check size={14} strokeWidth={3} />
        </span>
      ) : null}
    </button>
  );
}

export function HouseInNepalDecisionPage() {
  const router = useRouter();
  const { user } = useProductAuth();
  const { state, patch, resync } = useReturnToNepalPlanner();

  const [decision, setDecision] = useState<HousePlanDecision>(
    state.housePlanDecision === "unknown" ? "unknown" : state.housePlanDecision,
  );
  const [acquireMode, setAcquireMode] = useState<HouseAcquireMode | null>(state.houseAcquireMode);
  const [ownedValue, setOwnedValue] = useState(state.houseOwnedValueNpr > 0 ? String(state.houseOwnedValueNpr) : "");
  const [location, setLocation] = useState(state.houseLocation);
  const [fullyOwned, setFullyOwned] = useState<boolean | null>(state.houseFullyOwned);
  const [notes, setNotes] = useState(state.houseNotes);
  const [targetBudget, setTargetBudget] = useState("");
  const [savedAmount, setSavedAmount] = useState("");
  const [targetYear, setTargetYear] = useState(
    state.houseTargetYear > 0 ? String(state.houseTargetYear) : String(new Date().getFullYear() + 5),
  );
  const [saving, setSaving] = useState(false);
  const [workspace, setWorkspace] = useState<SavingsWorkspaceState>(() => sanitizeSavingsWorkspaceState(null));

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      let nextWorkspace = sanitizeSavingsWorkspaceState(null);
      if (user?.id && isSupabaseConfigured()) {
        try {
          const remote = await fetchSavingsWorkspace();
          nextWorkspace = remote ?? sanitizeSavingsWorkspaceState(null);
        } catch {
          nextWorkspace = sanitizeSavingsWorkspaceState(null);
        }
      } else {
        nextWorkspace = loadSavingsWorkspaceState();
      }
      if (cancelled) return;
      setWorkspace(nextWorkspace);
      const houseGoal = findHouseGoal(nextWorkspace.goals);
      if (houseGoal) {
        setTargetBudget(houseGoal.targetAmountNpr > 0 ? String(houseGoal.targetAmountNpr) : "");
        setSavedAmount(houseGoal.savedAmountNpr > 0 ? String(houseGoal.savedAmountNpr) : "");
        if (houseGoal.targetDate) {
          const year = new Date(houseGoal.targetDate).getFullYear();
          if (Number.isFinite(year) && year > 2000) setTargetYear(String(year));
        }
        if (state.housePlanDecision === "unknown") {
          setDecision("plan_to_buy_build");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, state.housePlanDecision]);

  const progressPct = useMemo(() => {
    const target = parseAmount(targetBudget);
    const saved = parseAmount(savedAmount);
    if (target <= 0) return 0;
    return Math.min(100, Math.round((saved / target) * 100));
  }, [targetBudget, savedAmount]);

  const persistSavings = useCallback(
    async (next: SavingsWorkspaceState) => {
      if (!user?.id) {
        saveSavingsWorkspaceState(next);
        setWorkspace(next);
        return next;
      }
      clearSavingsWorkspaceLocalCache();
      const saved = await saveSavingsWorkspaceToCloud(next);
      const remote = (await fetchSavingsWorkspace()) ?? saved;
      saveSavingsWorkspaceState(remote);
      setWorkspace(remote);
      return remote;
    },
    [user?.id],
  );

  const upsertHouseGoal = useCallback(
    async (targetAmountNpr: number, savedAmountNpr: number, year: number) => {
      const now = new Date().toISOString();
      const targetDate = `${year || new Date().getFullYear() + 5}-12-31`;
      const existing = findHouseGoal(workspace.goals);
      if (existing) {
        const next: SavingsWorkspaceState = {
          ...workspace,
          goals: sortGoalsStable(
            workspace.goals.map((goal) =>
              goal.id === existing.id
                ? {
                    ...goal,
                    name: goal.name || HOUSE_TEMPLATE.name,
                    category: goal.category || HOUSE_TEMPLATE.category,
                    targetAmountNpr,
                    savedAmountNpr,
                    targetDate,
                    updatedAt: now,
                  }
                : goal,
            ),
          ),
        };
        return persistSavings(next);
      }

      const newGoal: SavingsGoal = {
        id: createGoalId(),
        templateId: HOUSE_TEMPLATE.id,
        name: HOUSE_TEMPLATE.name,
        icon: HOUSE_TEMPLATE.icon,
        category: HOUSE_TEMPLATE.category,
        targetAmountNpr,
        savedAmountNpr,
        monthlyContributionNpr: HOUSE_TEMPLATE.suggestedMonthlyNpr,
        targetDate,
        reminderEnabled: false,
        reminderTimings: [],
        status: "active",
        sortOrder: workspace.goals.length,
        createdAt: now,
        updatedAt: now,
      };
      let next: SavingsWorkspaceState = {
        ...workspace,
        goals: sortGoalsStable([...workspace.goals, newGoal]),
      };
      if (savedAmountNpr > 0) {
        next = appendSavingsTransaction(next, {
          goalId: newGoal.id,
          goalName: newGoal.name,
          amountNpr: savedAmountNpr,
          date: now.slice(0, 10),
          source: "House plan setup",
        });
      }
      return persistSavings(next);
    },
    [persistSavings, workspace],
  );

  const handleSave = async () => {
    if (decision === "unknown") {
      toast.error("Choose one of the three house options to continue.");
      return;
    }

    setSaving(true);
    try {
      if (decision === "already_own") {
        patch({
          housePlanDecision: "already_own",
          houseAcquireMode: null,
          houseOwnedValueNpr: parseAmount(ownedValue),
          houseLocation: location.trim(),
          houseFullyOwned: fullyOwned,
          houseNotes: notes.trim(),
          houseProgressPct: 100,
          landBudgetNpr: 0,
          constructionBudgetNpr: 0,
          interiorBudgetNpr: 0,
          furnitureBudgetNpr: 0,
        });
      } else if (decision === "not_needed") {
        patch({
          housePlanDecision: "not_needed",
          houseAcquireMode: null,
          houseProgressPct: 100,
          landBudgetNpr: 0,
          constructionBudgetNpr: 0,
          interiorBudgetNpr: 0,
          furnitureBudgetNpr: 0,
          houseNotes: notes.trim(),
        });
      } else {
        const target = parseAmount(targetBudget);
        const saved = parseAmount(savedAmount);
        const year = Math.max(new Date().getFullYear(), Math.round(Number(targetYear) || 0));
        if (target <= 0) {
          toast.error("Enter a target budget for your buy/build plan.");
          setSaving(false);
          return;
        }
        await upsertHouseGoal(target, saved, year);
        const pct = target > 0 ? Math.min(100, (saved / target) * 100) : 0;
        patch({
          housePlanDecision: "plan_to_buy_build",
          houseAcquireMode: acquireMode,
          houseTargetYear: year,
          houseProgressPct: pct,
          landBudgetNpr: Math.round(target * 0.35),
          constructionBudgetNpr: Math.round(target * 0.45),
          interiorBudgetNpr: Math.round(target * 0.12),
          furnitureBudgetNpr: Math.round(target * 0.08),
          houseNotes: notes.trim(),
        });
      }

      resync();
      toast.success("House plan saved");
      router.push(RETURN_CHECKLIST_HREF);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save house plan.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen pb-28 text-white" style={{ background: PAGE_BG }}>
      <div className="mx-auto max-w-lg px-4 pt-4 sm:px-6 sm:pt-6">
        <header className="mb-5 flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={RETURN_CHECKLIST_HREF}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 text-xs font-black text-emerald-50"
            >
              <ArrowLeft size={15} />
              Back to Return Checklist
            </Link>
            <BackToReturnChecklistLink />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">House in Nepal</h1>
            <p className="mt-1 text-sm font-semibold text-emerald-100/55">
              Do you already own a home in Nepal, or do you plan to buy/build one?
            </p>
          </div>
        </header>

        <div className="space-y-3">
          <DecisionCard
            selected={decision === "already_own"}
            title="Already own a house"
            description="No savings goal required — mark housing complete."
            icon={<Home size={22} />}
            onSelect={() => setDecision("already_own")}
          />
          <DecisionCard
            selected={decision === "plan_to_buy_build"}
            title="Plan to buy/build"
            description="Set budget, savings, and timeline via your House goal."
            icon={<Hammer size={22} />}
            onSelect={() => setDecision("plan_to_buy_build")}
          />
          <DecisionCard
            selected={decision === "not_needed"}
            title="No house needed"
            description="Exclude house funding from your return readiness."
            icon={<Minus size={22} />}
            onSelect={() => setDecision("not_needed")}
          />
        </div>

        {decision === "already_own" ? (
          <section className={`${GLASS} mt-5 space-y-4 p-4 sm:p-5`}>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-100/45">Optional details</p>
            <p className="text-sm font-semibold text-emerald-100/50">These never block completion.</p>
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.14em] text-emerald-100/45">
                Existing house value
              </span>
              <input
                className={inputClass}
                inputMode="numeric"
                value={ownedValue}
                placeholder="0"
                onChange={(e) => setOwnedValue(sanitizeAmount(e.target.value))}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.14em] text-emerald-100/45">
                Location
              </span>
              <input
                className={inputClass}
                value={location}
                placeholder="Kathmandu, Pokhara…"
                onChange={(e) => setLocation(e.target.value)}
              />
            </label>
            <div>
              <p className="mb-2 text-[11px] font-black uppercase tracking-[0.14em] text-emerald-100/45">Ownership</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: true, label: "Fully owned" },
                  { value: false, label: "Still paying loan" },
                ].map((opt) => (
                  <button
                    key={String(opt.value)}
                    type="button"
                    onClick={() => setFullyOwned(opt.value)}
                    className={`min-h-[48px] rounded-2xl border text-sm font-black ${
                      fullyOwned === opt.value
                        ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-100"
                        : "border-white/10 bg-black/20 text-white/70"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.14em] text-emerald-100/45">
                Notes
              </span>
              <textarea
                className={`${inputClass} min-h-[96px] py-3`}
                value={notes}
                placeholder="Optional"
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>
          </section>
        ) : null}

        {decision === "plan_to_buy_build" ? (
          <section className={`${GLASS} mt-5 space-y-4 p-4 sm:p-5`}>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-100/45">House planning</p>
            <div>
              <p className="mb-2 text-[11px] font-black uppercase tracking-[0.14em] text-emerald-100/45">Buy or Build</p>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { value: "buy" as const, label: "Buy" },
                    { value: "build" as const, label: "Build" },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setAcquireMode(opt.value)}
                    className={`min-h-[48px] rounded-2xl border text-sm font-black ${
                      acquireMode === opt.value
                        ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-100"
                        : "border-white/10 bg-black/20 text-white/70"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.14em] text-emerald-100/45">
                Target budget
              </span>
              <input
                className={inputClass}
                inputMode="numeric"
                value={targetBudget}
                placeholder="10000000"
                onChange={(e) => setTargetBudget(sanitizeAmount(e.target.value))}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.14em] text-emerald-100/45">
                Current saved amount
              </span>
              <input
                className={inputClass}
                inputMode="numeric"
                value={savedAmount}
                placeholder="0"
                onChange={(e) => setSavedAmount(sanitizeAmount(e.target.value))}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.14em] text-emerald-100/45">
                Target year
              </span>
              <input
                className={inputClass}
                inputMode="numeric"
                value={targetYear}
                placeholder={String(new Date().getFullYear() + 5)}
                onChange={(e) => setTargetYear(sanitizeAmount(e.target.value))}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.14em] text-emerald-100/45">
                Land / property notes
              </span>
              <textarea
                className={`${inputClass} min-h-[96px] py-3`}
                value={notes}
                placeholder="Optional land or property details"
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>
            {parseAmount(targetBudget) > 0 ? (
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-200/70">Funding progress</p>
                <p className="mt-1 text-lg font-black text-white">
                  {progressPct}% · {formatNpr(parseAmount(savedAmount))} / {formatNpr(parseAmount(targetBudget))}
                </p>
              </div>
            ) : null}
            <Link
              href="/savings-tracker?from=return-checklist&focus=house"
              className="inline-flex min-h-[44px] items-center text-sm font-bold text-emerald-300 underline-offset-2 hover:underline"
            >
              Open full Savings Goals workspace →
            </Link>
          </section>
        ) : null}

        {decision === "not_needed" ? (
          <section className={`${GLASS} mt-5 p-4 sm:p-5`}>
            <p className="text-sm font-semibold leading-relaxed text-emerald-100/70">
              House funding will be excluded from your return readiness and funding gap. You can change this anytime.
            </p>
          </section>
        ) : null}

        <button
          type="button"
          disabled={saving || decision === "unknown"}
          onClick={() => void handleSave()}
          className="mt-6 min-h-[56px] w-full touch-manipulation rounded-[1.5rem] bg-gradient-to-r from-emerald-300 to-lime-300 text-base font-black text-emerald-950 shadow-[0_20px_60px_-24px_rgba(16,185,129,0.65)] transition active:scale-[0.985] disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save house plan"}
        </button>
      </div>
    </div>
  );
}
