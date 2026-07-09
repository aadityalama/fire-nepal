"use client";

import {
  ArrowLeft,
  Bell,
  Bot,
  CalendarDays,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { SavingsRingProgress } from "@/components/savings-tracker/SavingsRingProgress";
import { InsurancePolicyCard } from "@/components/insurance-workspace/InsurancePolicyCard";
import { InsurancePolicySheet } from "@/components/insurance-workspace/InsurancePolicySheet";
import { useProductAuth } from "@/contexts/ProductAuthContext";
import {
  createInsurancePolicy,
  deleteInsurancePolicy,
  fetchInsurancePolicies,
  updateInsurancePolicy,
} from "@/lib/insurance/insurance-api";
import { computeInsuranceRecommendation } from "@/lib/insurance/insurance-engine";
import {
  createPolicyId,
  loadInsuranceWorkspaceState,
  saveInsuranceWorkspaceState,
} from "@/lib/insurance/insurance-storage";
import type { InsurancePolicy, InsurancePolicyFormInput, InsuranceWorkspaceState } from "@/lib/insurance/insurance-types";
import { useInsuranceEngineInputs } from "@/lib/insurance/use-insurance-engine-inputs";
import {
  derivePolicyStatus,
  formatDisplayDate,
  formatNprCompact,
  formatRs,
  upcomingRenewals,
} from "@/lib/insurance/insurance-utils";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const glassCard = "rounded-[1.5rem] border border-white/10 bg-white/[0.055] backdrop-blur-xl sm:rounded-[1.65rem]";

function MetricTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className={`${glassCard} min-h-[96px] p-3.5 sm:p-4`}>
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-100/45">{label}</p>
      <p className="mt-2 truncate text-base font-black tracking-[-0.04em] text-white sm:text-lg">{value}</p>
      {hint ? <p className="mt-1 text-[10px] font-bold text-emerald-100/40">{hint}</p> : null}
    </div>
  );
}

function withDerivedStatus(policies: InsurancePolicy[]): InsurancePolicy[] {
  return policies.map((policy) => ({
    ...policy,
    status: derivePolicyStatus(policy.expiryDate),
  }));
}

export function InsuranceWorkspaceDashboard() {
  const { user } = useProductAuth();
  const { inputs, recalculate } = useInsuranceEngineInputs();
  const [state, setState] = useState<InsuranceWorkspaceState>(() => loadInsuranceWorkspaceState());
  const [hydrated, setHydrated] = useState(false);
  const [cloudReady, setCloudReady] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<InsurancePolicy | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      const local = loadInsuranceWorkspaceState();
      if (!cancelled) {
        setState({ version: 1, policies: withDerivedStatus(local.policies) });
      }

      if (isSupabaseConfigured() && user?.id) {
        try {
          const remote = await fetchInsurancePolicies();
          if (!cancelled && remote.length > 0) {
            const next = { version: 1 as const, policies: withDerivedStatus(remote) };
            setState(next);
            saveInsuranceWorkspaceState(next);
            setCloudReady(true);
          } else if (!cancelled) {
            setCloudReady(true);
          }
        } catch {
          if (!cancelled) setCloudReady(false);
        }
      }

      if (!cancelled) setHydrated(true);
    }

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!hydrated) return;
    saveInsuranceWorkspaceState(state);
  }, [state, hydrated]);

  const policies = useMemo(() => withDerivedStatus(state.policies), [state.policies]);
  const recommendation = useMemo(
    () => computeInsuranceRecommendation(policies, inputs),
    [policies, inputs],
  );
  const renewals = useMemo(() => upcomingRenewals(policies, 90), [policies]);

  const persistLocal = useCallback((updater: (current: InsuranceWorkspaceState) => InsuranceWorkspaceState) => {
    setState((current) => {
      const next = updater(current);
      return { ...next, policies: withDerivedStatus(next.policies) };
    });
  }, []);

  const handleSavePolicy = useCallback(
    async (input: InsurancePolicyFormInput, editingId?: string) => {
      setSaving(true);
      const now = new Date().toISOString();

      try {
        if (cloudReady && isSupabaseConfigured() && user?.id) {
          if (editingId) {
            const updated = await updateInsurancePolicy(editingId, input);
            persistLocal((current) => ({
              ...current,
              policies: current.policies.map((policy) => (policy.id === editingId ? updated : policy)),
            }));
            toast.success("Policy updated");
          } else {
            const created = await createInsurancePolicy(input);
            persistLocal((current) => ({
              ...current,
              policies: [...current.policies, created],
            }));
            toast.success("Policy saved");
          }
        } else if (editingId) {
          persistLocal((current) => ({
            ...current,
            policies: current.policies.map((policy) =>
              policy.id === editingId
                ? {
                    ...policy,
                    ...input,
                    status: derivePolicyStatus(input.expiryDate),
                    updatedAt: now,
                  }
                : policy,
            ),
          }));
          toast.success("Policy updated");
        } else {
          const created: InsurancePolicy = {
            id: createPolicyId(),
            ...input,
            status: derivePolicyStatus(input.expiryDate),
            sortOrder: policies.length,
            createdAt: now,
            updatedAt: now,
          };
          persistLocal((current) => ({
            ...current,
            policies: [...current.policies, created],
          }));
          toast.success("Policy saved");
        }

        setSheetOpen(false);
        setEditingPolicy(null);
        recalculate();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not save policy.");
        throw error;
      } finally {
        setSaving(false);
      }
    },
    [cloudReady, persistLocal, policies.length, recalculate, user?.id],
  );

  const handleDeletePolicy = useCallback(
    async (policy: InsurancePolicy) => {
      try {
        if (cloudReady && isSupabaseConfigured() && user?.id) {
          await deleteInsurancePolicy(policy.id);
        }
        persistLocal((current) => ({
          ...current,
          policies: current.policies.filter((item) => item.id !== policy.id),
        }));
        toast.success("Policy deleted");
        recalculate();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not delete policy.");
      }
    },
    [cloudReady, persistLocal, recalculate, user?.id],
  );

  const riskStyles =
    recommendation.riskLevel === "low"
      ? "border-emerald-300/35 bg-emerald-400/15 text-lime-100"
      : recommendation.riskLevel === "moderate"
        ? "border-amber-300/40 bg-amber-400/15 text-amber-100"
        : "border-rose-300/40 bg-rose-400/15 text-rose-100";

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
            <h1 className="mt-3 text-[2rem] font-black tracking-[-0.05em] text-white sm:text-[2.35rem] lg:text-5xl">
              Insurance
            </h1>
            <p className="mt-1 text-sm font-semibold text-emerald-100/58">
              FIRE AI protection workspace for your Nepal return.
            </p>
          </div>
          <button
            type="button"
            onClick={() => recalculate()}
            className="grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-white/[0.06] text-lime-200"
            aria-label="Recalculate protection"
          >
            <RefreshCw size={18} />
          </button>
        </header>

        <section className="relative overflow-hidden rounded-[1.75rem] border border-emerald-200/15 bg-gradient-to-br from-emerald-500/24 via-emerald-950/88 to-[#03110d] p-5 shadow-[0_28px_90px_-48px_rgba(16,185,129,0.65)] sm:p-6">
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-lime-300/20 blur-3xl" aria-hidden />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-100/55">
                  Insurance Protection Score
                </p>
                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${riskStyles}`}>
                  {recommendation.protectionBadge}
                </span>
              </div>
              <p className="mt-3 text-[2.4rem] font-black leading-none tracking-[-0.07em] text-white sm:text-[3rem]">
                {recommendation.protectionScorePct}%
              </p>
              <p className="mt-3 max-w-md text-sm font-semibold leading-relaxed text-emerald-50/85">
                {recommendation.aiSummary}
              </p>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-400/10 px-3 py-1.5 text-xs font-black text-lime-100">
                <ShieldCheck size={14} />
                Risk · {recommendation.riskLevel}
              </div>
            </div>
            <div className="mx-auto sm:mx-0">
              <SavingsRingProgress
                pct={recommendation.protectionScorePct}
                label="Protection"
                sublabel={recommendation.protectionBadge}
                size={148}
                stroke={10}
                valueClassName="text-white"
              />
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-3">
          <MetricTile
            label="Health cover"
            value={formatNprCompact(recommendation.recommendedHealthCoverageNpr)}
            hint={`Have ${formatNprCompact(recommendation.currentHealthCoverageNpr)}`}
          />
          <MetricTile
            label="Life cover"
            value={formatNprCompact(recommendation.recommendedLifeCoverageNpr)}
            hint={`Have ${formatNprCompact(recommendation.currentLifeCoverageNpr)}`}
          />
          <MetricTile
            label="Monthly premium"
            value={formatRs(recommendation.recommendedMonthlyPremiumNpr)}
            hint={`Paying ${formatRs(recommendation.currentMonthlyPremiumNpr)}`}
          />
          <MetricTile
            label="Coverage gap"
            value={formatNprCompact(recommendation.coverageGapNpr)}
            hint={`Critical ${formatNprCompact(recommendation.recommendedCriticalIllnessNpr)}`}
          />
        </section>

        <section className={`${glassCard} p-4 sm:p-5`}>
          <div className="mb-3 flex items-center gap-2">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-400/15 text-emerald-200">
              <Bot size={18} />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-100/50">
                {recommendation.suggestionTitle}
              </p>
              <p className="text-sm font-semibold text-emerald-100/55">FIRE AI auto suggestion</p>
            </div>
            <Sparkles className="ml-auto h-4 w-4 shrink-0 text-lime-300" />
          </div>
          <p className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3.5 text-sm font-semibold leading-relaxed text-emerald-50/85">
            {recommendation.suggestionBody}
          </p>
          <button
            type="button"
            onClick={() => recalculate()}
            className="mt-4 min-h-[48px] w-full rounded-2xl border border-emerald-300/30 bg-emerald-400/12 text-sm font-black text-lime-100 transition active:scale-[0.99]"
          >
            Calculate Again
          </button>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-black uppercase tracking-[0.16em] text-emerald-100/55">My Policies</h2>
            <span className="rounded-full bg-white/[0.06] px-3 py-1 text-xs font-black text-lime-100">
              {policies.length} total
            </span>
          </div>
          <div className="space-y-3">
            {policies.length === 0 ? (
              <div className={`${glassCard} p-6 text-center`}>
                <p className="text-sm font-black text-white">No policies yet</p>
                <p className="mt-1 text-xs font-semibold text-emerald-100/50">
                  Add health or life cover — FIRE AI fills the rest.
                </p>
              </div>
            ) : (
              policies.map((policy, index) => (
                <InsurancePolicyCard
                  key={policy.id}
                  policy={policy}
                  index={index}
                  onEdit={(item) => {
                    setEditingPolicy(item);
                    setSheetOpen(true);
                  }}
                  onDelete={(item) => void handleDeletePolicy(item)}
                />
              ))
            )}
          </div>
        </section>

        <button
          type="button"
          onClick={() => {
            setEditingPolicy(null);
            setSheetOpen(true);
          }}
          className="min-h-[56px] w-full touch-manipulation rounded-[1.5rem] bg-gradient-to-r from-emerald-300 to-lime-300 text-base font-black text-emerald-950 shadow-[0_20px_60px_-24px_rgba(16,185,129,0.65)] transition active:scale-[0.985]"
        >
          <span className="inline-flex items-center gap-2">
            <Plus size={20} strokeWidth={2.5} /> Add Policy
          </span>
        </button>

        <section className={`${glassCard} p-4 sm:p-5`}>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarDays size={16} className="text-lime-200" />
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-100/50">Upcoming renewals</p>
            </div>
            {renewals.length > 0 ? (
              <span className="relative inline-flex items-center gap-1 rounded-full border border-amber-300/35 bg-amber-400/12 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-amber-100">
                <Bell size={12} />
                {renewals.length}
              </span>
            ) : null}
          </div>
          {renewals.length === 0 ? (
            <p className="text-sm font-semibold text-emerald-100/50">No renewals in the next 90 days.</p>
          ) : (
            <div className="space-y-2.5">
              {renewals.map(({ policy, daysRemaining }) => (
                <div
                  key={policy.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-white">{policy.provider}</p>
                    <p className="mt-0.5 text-xs font-semibold text-emerald-100/50">
                      {formatDisplayDate(policy.expiryDate)} ·{" "}
                      {daysRemaining < 0 ? "Overdue" : `${daysRemaining} days left`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingPolicy(policy);
                      setSheetOpen(true);
                    }}
                    className="shrink-0 rounded-full bg-gradient-to-r from-emerald-300 to-lime-300 px-3 py-2 text-[11px] font-black text-emerald-950"
                  >
                    Renew Now
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          <div className={`${glassCard} p-4`}>
            <div className="flex items-center gap-2 text-emerald-100/50">
              <Wallet size={15} />
              <p className="text-[11px] font-black uppercase tracking-[0.16em]">Income protection</p>
            </div>
            <p className="mt-2 text-xl font-black tracking-[-0.04em] text-white">
              {formatNprCompact(recommendation.incomeProtectionNeedNpr)}
            </p>
            <p className="mt-1 text-xs font-semibold text-emerald-100/45">24-month income buffer need</p>
          </div>
          <div className={`${glassCard} p-4`}>
            <div className="flex items-center gap-2 text-emerald-100/50">
              <ShieldCheck size={15} />
              <p className="text-[11px] font-black uppercase tracking-[0.16em]">Critical illness</p>
            </div>
            <p className="mt-2 text-xl font-black tracking-[-0.04em] text-white">
              {formatNprCompact(recommendation.recommendedCriticalIllnessNpr)}
            </p>
            <p className="mt-1 text-xs font-semibold text-emerald-100/45">
              Have {formatNprCompact(recommendation.currentCriticalCoverageNpr)}
            </p>
          </div>
        </section>
      </div>

      <InsurancePolicySheet
        open={sheetOpen}
        editingPolicy={editingPolicy}
        onClose={() => {
          setSheetOpen(false);
          setEditingPolicy(null);
        }}
        onSave={handleSavePolicy}
        saving={saving}
      />
    </main>
  );
}
