"use client";

import {
  ArrowLeft,
  Bell,
  Bot,
  CalendarDays,
  Eye,
  EyeOff,
  PiggyBank,
  Plus,
  Sparkles,
  Target,
  TrendingUp,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { SavingsGoalCard } from "@/components/savings-workspace/SavingsGoalCard";
import { SavingsGoalSheet } from "@/components/savings-workspace/SavingsGoalSheet";
import { useProductAuth } from "@/contexts/ProductAuthContext";
import { fetchSavingsWorkspace, saveSavingsWorkspaceToCloud } from "@/lib/savings/savings-api";
import {
  appendSavingsTransaction,
  createGoalId,
  loadSavingsWorkspaceState,
  saveSavingsWorkspaceState,
} from "@/lib/savings/savings-storage";
import {
  buildSavingsAiInsight,
  computeDashboardSummary,
  formatDisplayDate,
  formatPct,
  formatRs,
  sortGoalsStable,
} from "@/lib/savings/savings-utils";
import type { SavingsGoal, SavingsGoalFormInput, SavingsWorkspaceState } from "@/lib/savings/savings-types";

const glassCard = "rounded-[1.5rem] border border-white/10 bg-white/[0.055] backdrop-blur-xl sm:rounded-[1.65rem]";

function SummaryCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: typeof Wallet;
}) {
  return (
    <div className={`${glassCard} min-h-[96px] p-3.5 sm:p-4`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-100/45">{label}</p>
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-400/12 text-lime-200">
          <Icon size={15} />
        </span>
      </div>
      <p className="mt-2 truncate text-lg font-black tracking-[-0.04em] text-white sm:text-xl">{value}</p>
      {hint ? <p className="mt-1 text-[10px] font-bold text-emerald-100/40">{hint}</p> : null}
    </div>
  );
}

export function SavingsWorkspaceDashboard() {
  const { user } = useProductAuth();
  const [state, setState] = useState<SavingsWorkspaceState>(() => loadSavingsWorkspaceState());
  const [hydrated, setHydrated] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      const local = loadSavingsWorkspaceState();
      if (!cancelled) setState(local);

      if (!user?.id) {
        if (!cancelled) setHydrated(true);
        return;
      }

      try {
        const remote = await fetchSavingsWorkspace();
        if (cancelled) return;
        if (remote) {
          setState(remote);
          saveSavingsWorkspaceState(remote);
        } else if (local.goals.length > 0 || local.transactions.length > 0) {
          const saved = await saveSavingsWorkspaceToCloud(local);
          if (cancelled) return;
          setState(saved);
          saveSavingsWorkspaceState(saved);
        }
      } catch (error) {
        if (process.env.NODE_ENV !== "production") {
          console.error("[savings-workspace] hydrate failed", error);
        }
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : "Could not load savings from Supabase.");
        }
      } finally {
        if (!cancelled) setHydrated(true);
      }
    }

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!hydrated) return;
    saveSavingsWorkspaceState(state);
  }, [state, hydrated]);

  const goals = useMemo(() => sortGoalsStable(state.goals), [state.goals]);
  const summary = useMemo(() => computeDashboardSummary(goals, state.transactions), [goals, state.transactions]);
  const aiInsight = useMemo(() => buildSavingsAiInsight(goals), [goals]);
  const recentTransactions = useMemo(
    () => [...state.transactions].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)).slice(0, 8),
    [state.transactions],
  );

  const persistState = useCallback(
    async (next: SavingsWorkspaceState) => {
      if (!user?.id) {
        throw new Error("Please sign in to save your savings workspace.");
      }
      const saved = await saveSavingsWorkspaceToCloud(next);
      const fresh = (await fetchSavingsWorkspace()) ?? saved;
      setState(fresh);
      saveSavingsWorkspaceState(fresh);
      return fresh;
    },
    [user?.id],
  );

  const handleSaveGoal = useCallback(
    async (input: SavingsGoalFormInput, editingId?: string) => {
      setSaving(true);
      const now = new Date().toISOString();
      const aiRecommendation =
        input.monthlyContributionNpr > 0
          ? `Continue saving ${formatRs(input.monthlyContributionNpr)}/month to stay on track for ${input.name}.`
          : undefined;

      try {
        if (editingId) {
          const nextState: SavingsWorkspaceState = {
            ...state,
            goals: sortGoalsStable(
              state.goals.map((goal) =>
                goal.id === editingId
                  ? {
                      ...goal,
                      ...input,
                      aiRecommendation: aiRecommendation ?? goal.aiRecommendation,
                      updatedAt: now,
                    }
                  : goal,
              ),
            ),
          };
          await persistState(nextState);
          toast.success("Goal updated successfully");
        } else {
          const newGoal: SavingsGoal = {
            id: createGoalId(),
            ...input,
            status: "active",
            aiRecommendation,
            sortOrder: goals.length,
            createdAt: now,
            updatedAt: now,
          };
          let nextState: SavingsWorkspaceState = {
            ...state,
            goals: sortGoalsStable([...state.goals, newGoal]),
          };
          if (input.savedAmountNpr > 0) {
            nextState = appendSavingsTransaction(nextState, {
              goalId: newGoal.id,
              goalName: newGoal.name,
              amountNpr: input.savedAmountNpr,
              date: now.slice(0, 10),
              source: "Initial deposit",
            });
          }
          await persistState(nextState);
          toast.success("Goal saved successfully");
        }
        setSheetOpen(false);
        setEditingGoal(null);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not save goal.");
        throw error;
      } finally {
        setSaving(false);
      }
    },
    [goals.length, persistState, state],
  );

  const handlePauseGoal = useCallback(
    async (goal: SavingsGoal) => {
      try {
        await persistState({
          ...state,
          goals: state.goals.map((item) =>
            item.id === goal.id
              ? { ...item, status: item.status === "paused" ? "active" : "paused", updatedAt: new Date().toISOString() }
              : item,
          ),
        });
        toast.message(goal.status === "paused" ? "Goal resumed" : "Goal paused");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not save goal status.");
      }
    },
    [persistState, state],
  );

  const handleCompleteGoal = useCallback(
    async (goal: SavingsGoal) => {
      try {
        await persistState({
          ...state,
          goals: state.goals.map((item) =>
            item.id === goal.id ? { ...item, status: "completed", updatedAt: new Date().toISOString() } : item,
          ),
        });
        toast.success(`${goal.name} marked completed`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not complete goal.");
      }
    },
    [persistState, state],
  );

  const handleDeleteGoal = useCallback(
    async (goal: SavingsGoal) => {
      try {
        await persistState({
          ...state,
          goals: state.goals.filter((item) => item.id !== goal.id),
          transactions: state.transactions.filter((txn) => txn.goalId !== goal.id),
        });
        toast.success("Goal deleted");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not delete goal.");
      }
    },
    [persistState, state],
  );

  return (
    <main className="min-h-[100dvh] overflow-x-clip bg-[#020806] px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] pt-[calc(0.85rem+env(safe-area-inset-top,0px))] text-white sm:px-6 lg:px-8">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -left-24 top-8 h-72 w-72 rounded-full bg-emerald-400/18 blur-3xl" />
        <div className="absolute -right-24 top-52 h-80 w-80 rounded-full bg-lime-300/12 blur-3xl" />
      </div>

      <div className="relative mx-auto flex w-full max-w-lg flex-col gap-4 lg:max-w-6xl lg:gap-5">
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              href="/finance"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 text-xs font-black text-emerald-50 backdrop-blur-xl"
            >
              <ArrowLeft size={15} /> Finance
            </Link>
            <h1 className="mt-3 text-[2rem] font-black tracking-[-0.05em] text-white sm:text-[2.35rem] lg:text-5xl">Savings</h1>
            <p className="mt-1 text-sm font-semibold text-emerald-100/58">Premium savings goals built for FIRE Nepal.</p>
          </div>
        </header>

        <section className="relative overflow-hidden rounded-[1.75rem] border border-emerald-200/15 bg-gradient-to-br from-emerald-500/24 via-emerald-950/88 to-[#03110d] p-5 shadow-[0_28px_90px_-48px_rgba(16,185,129,0.65)] sm:p-6">
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-lime-300/20 blur-3xl" aria-hidden />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-100/55">Total Savings</p>
                <button
                  type="button"
                  onClick={() => {
                    void persistState({ ...state, balanceHidden: !state.balanceHidden }).catch((error) => {
                      toast.error(error instanceof Error ? error.message : "Could not save display preference.");
                    });
                  }}
                  className="grid h-8 w-8 place-items-center rounded-full bg-white/[0.08] text-emerald-100"
                  aria-label={state.balanceHidden ? "Show balance" : "Hide balance"}
                >
                  {state.balanceHidden ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className="mt-3 text-[2.4rem] font-black leading-none tracking-[-0.07em] text-white sm:text-[3rem]">
                {state.balanceHidden ? "Rs. ••••••" : formatRs(summary.totalSavingsNpr)}
              </p>
              <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-400/10 px-3 py-1.5 text-sm font-black text-lime-100">
                <TrendingUp size={16} />
                {formatPct(summary.growthPct)} growth
              </div>
            </div>
            <div className="relative mx-auto grid h-36 w-36 place-items-center sm:mx-0">
              <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-emerald-300/25 to-lime-300/10 blur-xl" />
              <div className="relative grid h-full w-full place-items-center rounded-[2rem] border border-white/10 bg-white/[0.06] text-5xl shadow-inner">
                🐷
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-3">
          <SummaryCard label="Active Goals" value={String(summary.activeGoalsCount)} icon={Target} hint="Currently in progress" />
          <SummaryCard label="Total Saved" value={formatRs(summary.totalSavedNpr)} icon={Wallet} hint="Across all goals" />
          <SummaryCard label="Monthly Saving" value={formatRs(summary.monthlySavingNpr)} icon={PiggyBank} hint="Planned contributions" />
          <SummaryCard
            label="Nearest Target Date"
            value={summary.nearestTargetDate ? formatDisplayDate(summary.nearestTargetDate) : "—"}
            icon={CalendarDays}
            hint="Closest active goal"
          />
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-black uppercase tracking-[0.16em] text-emerald-100/55">Savings Goals</h2>
            <span className="rounded-full bg-white/[0.06] px-3 py-1 text-xs font-black text-lime-100">{goals.length} total</span>
          </div>
          <div className="space-y-3">
            {goals.length === 0 ? (
              <div className={`${glassCard} p-6 text-center`}>
                <p className="text-sm font-black text-white">No savings goals yet</p>
                <p className="mt-1 text-xs font-semibold text-emerald-100/50">Create your first goal with a premium template.</p>
              </div>
            ) : (
              goals.map((goal, index) => (
                <SavingsGoalCard
                  key={goal.id}
                  goal={goal}
                  index={index}
                  onEdit={(item) => {
                    setEditingGoal(item);
                    setSheetOpen(true);
                  }}
                  onPause={handlePauseGoal}
                  onDelete={handleDeleteGoal}
                  onComplete={handleCompleteGoal}
                />
              ))
            )}
          </div>
        </section>

        <button
          type="button"
          onClick={() => {
            setEditingGoal(null);
            setSheetOpen(true);
          }}
          className="min-h-[56px] w-full touch-manipulation rounded-[1.5rem] bg-gradient-to-r from-emerald-300 to-lime-300 text-base font-black text-emerald-950 shadow-[0_20px_60px_-24px_rgba(16,185,129,0.65)] transition active:scale-[0.985]"
        >
          <span className="inline-flex items-center gap-2">
            <Plus size={20} strokeWidth={2.5} /> Add New Goal
          </span>
        </button>

        <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <section className={`${glassCard} p-4 sm:p-5`}>
            <div className="mb-3 flex items-center gap-2">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-400/15 text-emerald-200">
                <Bot size={18} />
              </span>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-100/50">AI Insight</p>
                <p className="text-sm font-semibold text-emerald-100/55">Based on your savings goals</p>
              </div>
              <Sparkles className="ml-auto h-4 w-4 text-lime-300" />
            </div>
            <p className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3.5 text-sm font-semibold leading-relaxed text-emerald-50/85">
              {aiInsight ?? "Add a goal with a monthly contribution to unlock personalized savings insights."}
            </p>
          </section>

          <section className={`${glassCard} p-4 sm:p-5`}>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-100/50">Recent Savings</p>
              <Bell size={16} className="text-lime-200" />
            </div>
            {recentTransactions.length === 0 ? (
              <p className="text-sm font-semibold text-emerald-100/50">No savings transactions yet.</p>
            ) : (
              <div className="space-y-2.5">
                {recentTransactions.map((txn) => (
                  <div key={txn.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-white">{txn.goalName}</p>
                      <p className="mt-0.5 text-xs font-semibold text-emerald-100/50">
                        {formatDisplayDate(txn.date)} · {txn.source}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-black text-lime-100">{formatRs(txn.amountNpr)}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <section className={`${glassCard} p-4 sm:p-5`}>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-100/50">Smart Notifications</p>
          <p className="mt-1 text-sm font-semibold text-emerald-100/55">
            7 days before, 3 days before, 1 day before, goal completed, and monthly reminders.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {["Profile center", "Email", "In-app"].map((channel) => (
              <span key={channel} className="rounded-full border border-emerald-300/30 bg-emerald-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-100">
                {channel}
              </span>
            ))}
            <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-100/35">
              Push soon
            </span>
          </div>
        </section>
      </div>

      <SavingsGoalSheet
        open={sheetOpen}
        editingGoal={editingGoal}
        onClose={() => {
          setSheetOpen(false);
          setEditingGoal(null);
        }}
        onSave={handleSaveGoal}
        saving={saving}
      />
    </main>
  );
}
