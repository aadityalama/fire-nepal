"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  CalendarClock,
  ChevronDown,
  ExternalLink,
  PiggyBank,
  Plus,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Sparkles,
  Target,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { loadCashflowState } from "@/components/cashflow/cashflow-storage";
import { CASHFLOW_EXTERNAL_SYNC_EVENT } from "@/components/cashflow/portfolio-dividend-sync";
import { BackToReturnChecklistBannerSlot } from "@/components/return-to-nepal/BackToReturnChecklistBannerSlot";
import { useHomepageLanguage } from "@/contexts/HomepageLanguageContext";
import { useProductAuth } from "@/contexts/ProductAuthContext";
import { useFireTheme } from "@/contexts/FireThemeContext";
import { fetchBudgetRecords } from "@/lib/budget/budget-api";
import type { BudgetRecord } from "@/lib/budget/types";
import { patchCashflowState } from "@/lib/cashflow/patch-cashflow-cloud";
import { buildUpcomingAnnualPayments } from "@/lib/emergency-fund/annual-payments";
import {
  budgetPlannerSignature,
  defaultEssentialRecordIds,
  findIneligibleEssentialSelections,
  normalizeBudgetForEmergencyFund,
  plannedEmergencyContributionFromBudget,
  resolveMonthlyProtectionBasis,
} from "@/lib/emergency-fund/budget-integration";
import {
  buildGrowthProjection,
  computeDeadlineFundingPlan,
  computeEmergencyFundCore,
  computeMonthlyFundingPlan,
  computeSafetyMilestones,
  resolveDesignatedReserve,
} from "@/lib/emergency-fund/calculations";
import { getEmergencyFundCopy } from "@/lib/emergency-fund/i18n";
import { buildEmergencyInsights } from "@/lib/emergency-fund/insights";
import {
  formatEmergencyNpr,
  formatEmergencyNprPrecise,
  formatMonthYear,
  formatMonthsLabel,
} from "@/lib/emergency-fund/math";
import {
  buildProtectionPeriodGuidance,
  clearEmergencyFundSettingsLocal,
  createTransactionId,
  defaultEmergencyFundSettings,
  loadEmergencyFundSettingsLocal,
  notifyEmergencyFundModuleSync,
  sanitizeEmergencyFundSettings,
  saveEmergencyFundSettingsLocal,
} from "@/lib/emergency-fund/settings";
import {
  runEmergencySimulation,
  SIMULATOR_SCENARIOS,
  type SimulatorScenarioId,
} from "@/lib/emergency-fund/simulator";
import type {
  EmergencyFundSettingsState,
  EmergencyFundTransaction,
  ProtectionMode,
  YearlyAllocationResolution,
} from "@/lib/emergency-fund/types";
import {
  FUNDING_DEADLINE_OPTIONS,
  PROTECTION_PERIOD_OPTIONS,
} from "@/lib/emergency-fund/types";
import { FINANCE_CLOUD_CACHE_READY_EVENT } from "@/lib/finance/hydrate-authenticated-finance-cache";
import { useCloudDocumentState } from "@/hooks/useCloudDocumentState";
import { fetchInsurancePolicies } from "@/lib/insurance/insurance-api";
import { loadInsuranceWorkspaceState } from "@/lib/insurance/insurance-storage";
import { fetchSavingsWorkspace } from "@/lib/savings/savings-api";
import { loadSavingsWorkspaceState } from "@/lib/savings/savings-storage";
import type { SavingsGoal } from "@/lib/savings/savings-types";

function sanitizeDecimalInput(value: string) {
  const cleaned = value.replace(/,/g, "").replace(/[^\d.]/g, "");
  const dot = cleaned.indexOf(".");
  if (dot === -1) return cleaned;
  return `${cleaned.slice(0, dot + 1)}${cleaned.slice(dot + 1).replace(/\./g, "")}`;
}

function parseAmount(value: string): number {
  const n = Number(value || 0);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

function ProgressRing({
  progress,
  size = 88,
  stroke = 8,
}: {
  progress: number;
  size?: number;
  stroke?: number;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const capped = Math.max(0, Math.min(100, progress));
  const offset = circumference - (capped / 100) * circumference;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0" aria-hidden>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        className="text-emerald-900/25"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="url(#ef-ring)"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className="motion-safe:transition-[stroke-dashoffset] motion-safe:duration-700"
      />
      <defs>
        <linearGradient id="ef-ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6ee7b7" />
          <stop offset="100%" stopColor="#bef264" />
        </linearGradient>
      </defs>
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-white text-[0.95rem] font-black"
      >
        {Math.round(capped)}%
      </text>
    </svg>
  );
}

function SectionShell({
  title,
  children,
  defaultOpen = false,
  badge,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
        aria-expanded={open}
      >
        <span className="text-sm font-black tracking-tight text-white">{title}</span>
        <span className="flex items-center gap-2">
          {badge ? (
            <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-lime-200">
              {badge}
            </span>
          ) : null}
          <ChevronDown
            size={16}
            className={`text-emerald-100/60 transition ${open ? "rotate-180" : ""}`}
          />
        </span>
      </button>
      {open ? <div className="border-t border-white/8 px-4 pb-4 pt-3">{children}</div> : null}
    </section>
  );
}

export function EmergencyFundDashboard() {
  const { user, loading: authLoading } = useProductAuth();
  const uid = user?.id;
  const { language } = useHomepageLanguage();
  const copy = useMemo(() => getEmergencyFundCopy(language), [language]);
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const reduceMotion = useReducedMotion();

  const {
    state: settings,
    setState: setSettings,
    hydrated: settingsHydrated,
    hydrateError,
    retryHydrate,
  } = useCloudDocumentState<EmergencyFundSettingsState>({
    moduleKey: "emergency_fund",
    getDefault: defaultEmergencyFundSettings,
    sanitize: sanitizeEmergencyFundSettings,
    loadLocal: () => loadEmergencyFundSettingsLocal(uid),
    saveLocal: (next) => saveEmergencyFundSettingsLocal(next, uid),
    clearLocal: () => clearEmergencyFundSettingsLocal(uid),
    saveDebounceMs: 600,
  });

  const [budgets, setBudgets] = useState<BudgetRecord[]>([]);
  const [budgetError, setBudgetError] = useState<string | null>(null);
  const [budgetLoading, setBudgetLoading] = useState(true);
  const [cashflowTick, setCashflowTick] = useState(0);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [txAmount, setTxAmount] = useState("");
  const [txNote, setTxNote] = useState("");
  const [txMode, setTxMode] = useState<"contribution" | "withdrawal" | null>(null);
  const [txBusy, setTxBusy] = useState(false);
  const [customMonthsRaw, setCustomMonthsRaw] = useState("");
  const [contributionRaw, setContributionRaw] = useState("");
  const [deadlineMonths, setDeadlineMonths] = useState<number>(12);
  const [simScenario, setSimScenario] = useState<SimulatorScenarioId>("income_interruption");
  const [simMonthlyRaw, setSimMonthlyRaw] = useState("");
  const [simOneTimeRaw, setSimOneTimeRaw] = useState("0");
  const [growthHorizon, setGrowthHorizon] = useState<3 | 6 | 12 | 24>(12);
  const [showGuidance, setShowGuidance] = useState(false);
  const [insurancePayments, setInsurancePayments] = useState<
    Array<{ id: string; name: string; dueDate: string | null; amountNpr: number }>
  >([]);
  const essentialsSeeded = useRef(false);
  const syncMarked = useRef(false);
  const submitGuard = useRef(false);

  const reloadBudgets = useCallback(async () => {
    setBudgetLoading(true);
    setBudgetError(null);
    try {
      if (!uid) {
        setBudgets([]);
        return;
      }
      const rows = await fetchBudgetRecords();
      setBudgets(rows);
    } catch (error) {
      setBudgetError(error instanceof Error ? error.message : "Could not load budgets.");
    } finally {
      setBudgetLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    if (authLoading) return;
    queueMicrotask(() => {
      void reloadBudgets();
    });
  }, [authLoading, reloadBudgets]);

  useEffect(() => {
    const onReady = () => {
      void reloadBudgets();
      setCashflowTick((t) => t + 1);
    };
    window.addEventListener(FINANCE_CLOUD_CACHE_READY_EVENT, onReady);
    window.addEventListener(CASHFLOW_EXTERNAL_SYNC_EVENT, onReady);
    return () => {
      window.removeEventListener(FINANCE_CLOUD_CACHE_READY_EVENT, onReady);
      window.removeEventListener(CASHFLOW_EXTERNAL_SYNC_EVENT, onReady);
    };
  }, [reloadBudgets]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      if (!uid) {
        setSavingsGoals(loadSavingsWorkspaceState().goals);
        const localIns = loadInsuranceWorkspaceState().policies;
        setInsurancePayments(
          localIns.map((p) => ({
            id: p.id,
            name: `${p.provider || p.type} premium`,
            dueDate: p.nextPremiumDate ?? null,
            amountNpr: p.premiumNpr,
          })),
        );
        return;
      }
      void fetchSavingsWorkspace()
        .then((state) => {
          if (!cancelled) setSavingsGoals(state?.goals ?? loadSavingsWorkspaceState().goals);
        })
        .catch(() => {
          if (!cancelled) setSavingsGoals(loadSavingsWorkspaceState().goals);
        });
      void fetchInsurancePolicies()
        .then(({ policies }) => {
          if (cancelled) return;
          setInsurancePayments(
            policies.map((p) => ({
              id: p.id,
              name: `${p.provider || p.type} premium`,
              dueDate: p.nextPremiumDate ?? null,
              amountNpr: p.premiumNpr,
            })),
          );
        })
        .catch(() => {
          if (cancelled) return;
          const localIns = loadInsuranceWorkspaceState().policies;
          setInsurancePayments(
            localIns.map((p) => ({
              id: p.id,
              name: `${p.provider || p.type} premium`,
              dueDate: p.nextPremiumDate ?? null,
              amountNpr: p.premiumNpr,
            })),
          );
        });
    });
    return () => {
      cancelled = true;
    };
  }, [uid]);

  useEffect(() => {
    queueMicrotask(() => {
      if (settings.plannedMonthlyContributionNpr != null) {
        setContributionRaw(String(settings.plannedMonthlyContributionNpr));
      }
      if (settings.deadlineMonths != null) setDeadlineMonths(settings.deadlineMonths);
      if (settings.useCustomProtectionMonths) {
        setCustomMonthsRaw(String(settings.protectionMonths));
      }
    });
  }, [
    settings.plannedMonthlyContributionNpr,
    settings.deadlineMonths,
    settings.useCustomProtectionMonths,
    settings.protectionMonths,
  ]);

  const breakdown = useMemo(
    () =>
      normalizeBudgetForEmergencyFund(budgets, {
        yearlyAllocationDecisions: settings.yearlyAllocationDecisions,
      }),
    [budgets, settings.yearlyAllocationDecisions],
  );

  useEffect(() => {
    if (!settingsHydrated || !breakdown.hasBudgetData || essentialsSeeded.current) return;
    if (settings.essentialRecordIds.length > 0) {
      essentialsSeeded.current = true;
      return;
    }
    const defaults = defaultEssentialRecordIds(breakdown);
    if (defaults.length === 0) return;
    essentialsSeeded.current = true;
    setSettings((prev) => ({ ...prev, essentialRecordIds: defaults }));
  }, [breakdown, settings.essentialRecordIds.length, settingsHydrated, setSettings]);

  const plannerSignature = useMemo(() => budgetPlannerSignature(budgets), [budgets]);

  useEffect(() => {
    if (!settingsHydrated || budgetLoading) return;
    if (!breakdown.hasBudgetData && budgets.length === 0 && !budgetError) return;
    const nowIso = new Date().toISOString();
    const current = breakdown.hasBudgetData ? breakdown.effectiveMonthlyBudgetNpr : null;
    setSettings((prev) => {
      const lastSeen = prev.lastSeenEffectiveMonthlyBudgetNpr;
      const plannerChanged =
        prev.lastSeenBudgetPlannerSignature != null &&
        prev.lastSeenBudgetPlannerSignature !== plannerSignature;
      const effectiveChanged =
        current != null && lastSeen != null && Math.abs(lastSeen - current) >= 1;
      // Only bump sync timestamp on first mark, planner edits, or effective basis changes.
      if (
        syncMarked.current &&
        !plannerChanged &&
        !effectiveChanged &&
        prev.lastSuccessfulSyncAt
      ) {
        return prev;
      }
      syncMarked.current = true;
      return {
        ...prev,
        lastSuccessfulSyncAt: nowIso,
        // Lag previous effective only for real Budget Planner edits.
        // Normalization / selection-only shifts collapse previous → current (no false insight).
        previousEffectiveMonthlyBudgetNpr: plannerChanged
          ? lastSeen
          : effectiveChanged && current != null
            ? current
            : prev.previousEffectiveMonthlyBudgetNpr,
        lastSeenEffectiveMonthlyBudgetNpr:
          current != null ? current : prev.lastSeenEffectiveMonthlyBudgetNpr,
        lastSeenBudgetPlannerSignature: plannerSignature,
      };
    });
  }, [
    budgetError,
    budgetLoading,
    budgets.length,
    breakdown,
    plannerSignature,
    setSettings,
    settingsHydrated,
  ]);

  const protectionResolved = useMemo(
    () =>
      resolveMonthlyProtectionBasis(
        breakdown,
        settings.protectionMode,
        settings.essentialRecordIds,
        { excludedRecordIds: settings.excludedRecordIds },
      ),
    [
      breakdown,
      settings.essentialRecordIds,
      settings.excludedRecordIds,
      settings.protectionMode,
    ],
  );

  const plannedBudgetContribution = useMemo(
    () => plannedEmergencyContributionFromBudget(breakdown),
    [breakdown],
  );

  const inclusionLabel = useCallback(
    (line: {
      inclusion: string;
      needsReview?: boolean;
      classificationSource?: string;
    }) => {
      if (line.inclusion === "emergency_contribution") return copy.inclusionEmergency;
      if (line.inclusion === "already_included") {
        return line.classificationSource === "user_decision"
          ? `${copy.inclusionAlready} · ${copy.inclusionUserDecision}`
          : copy.inclusionAlready;
      }
      if (line.inclusion === "projection_duplicate") {
        return `${copy.inclusionProjection} · ${copy.inclusionAutomatic}`;
      }
      if (line.inclusion === "excluded") return copy.inclusionExcludedUser;
      if (line.inclusion === "included" && line.needsReview) return copy.inclusionProvisional;
      if (line.inclusion === "included" && line.classificationSource === "user_decision") {
        return `${copy.inclusionIncluded} · ${copy.inclusionUserDecision}`;
      }
      if (line.inclusion === "included") return copy.inclusionIncluded;
      return line.inclusion;
    },
    [copy],
  );

  const cashflow = useMemo(() => {
    void cashflowTick;
    return loadCashflowState(uid);
  }, [cashflowTick, uid]);

  const linkedSavingsNpr = useMemo(() => {
    const ids = new Set(settings.linkedSavingsGoalIds);
    return savingsGoals
      .filter((g) => ids.has(g.id) && g.status !== "paused")
      .reduce((sum, g) => sum + Math.max(0, g.savedAmountNpr), 0);
  }, [savingsGoals, settings.linkedSavingsGoalIds]);

  const ledger = useMemo(
    () =>
      resolveDesignatedReserve({
        openingReserveNpr: settings.openingReserveNpr,
        transactions: settings.transactions,
        cashflowEmergencyReserveNpr: cashflow.emergencyCashReserve,
      }),
    [cashflow.emergencyCashReserve, settings.openingReserveNpr, settings.transactions],
  );

  const core = useMemo(() => {
    if (!breakdown.hasBudgetData) return null;
    return computeEmergencyFundCore({
      monthlyProtectionBasisNpr: protectionResolved.monthlyProtectionBasisNpr,
      protectionMonths: settings.protectionMonths,
      designatedReserveNpr: ledger.designatedReserveNpr,
      linkedSavingsNpr,
    });
  }, [
    breakdown.hasBudgetData,
    ledger.designatedReserveNpr,
    linkedSavingsNpr,
    protectionResolved.monthlyProtectionBasisNpr,
    settings.protectionMonths,
  ]);

  const milestones = useMemo(
    () =>
      core
        ? computeSafetyMilestones(core.monthlyProtectionBasisNpr, core.currentEmergencyReserveNpr)
        : [],
    [core],
  );

  const monthlyFunding = useMemo(
    () =>
      core
        ? computeMonthlyFundingPlan({
            remainingShortfallNpr: core.remainingShortfallNpr,
            plannedMonthlyContributionNpr: settings.plannedMonthlyContributionNpr,
          })
        : null,
    [core, settings.plannedMonthlyContributionNpr],
  );

  const deadlineFunding = useMemo(
    () =>
      core
        ? computeDeadlineFundingPlan({
            remainingShortfallNpr: core.remainingShortfallNpr,
            deadlineMonths,
          })
        : null,
    [core, deadlineMonths],
  );

  const upcomingPayments = useMemo(
    () =>
      buildUpcomingAnnualPayments(
        insurancePayments.filter((p) => p.dueDate).map((p) => ({
          id: p.id,
          name: p.name,
          dueDate: p.dueDate,
          amountNpr: p.amountNpr,
        })),
      ),
    [insurancePayments],
  );

  /**
   * previousEffective only lags current after a real Budget Planner edit
   * (normalization/selection-only shifts collapse previous → current in the sync effect).
   */
  const budgetPlannerChanged = useMemo(() => {
    const previous = settings.previousEffectiveMonthlyBudgetNpr;
    if (previous == null || !Number.isFinite(previous) || previous <= 0) return false;
    if (!breakdown.hasBudgetData) return false;
    return Math.abs(breakdown.effectiveMonthlyBudgetNpr - previous) >= 1;
  }, [
    breakdown.effectiveMonthlyBudgetNpr,
    breakdown.hasBudgetData,
    settings.previousEffectiveMonthlyBudgetNpr,
  ]);

  const ineligibleEssentialSelections = useMemo(
    () => findIneligibleEssentialSelections(breakdown, settings.essentialRecordIds),
    [breakdown, settings.essentialRecordIds],
  );

  const insights = useMemo(
    () =>
      buildEmergencyInsights({
        breakdown,
        core,
        mode: settings.protectionMode,
        milestones,
        fundingPlan: monthlyFunding,
        upcomingPayments,
        previousEffectiveMonthlyBudgetNpr: settings.previousEffectiveMonthlyBudgetNpr,
        budgetPlannerChanged,
      }),
    [
      breakdown,
      budgetPlannerChanged,
      core,
      milestones,
      monthlyFunding,
      settings.protectionMode,
      settings.previousEffectiveMonthlyBudgetNpr,
      upcomingPayments,
    ],
  );

  const growthPoints = useMemo(() => {
    if (!core) return [];
    return buildGrowthProjection({
      openingReserveNpr: ledger.openingReserveNpr,
      transactions: settings.transactions,
      currentReserveNpr: core.currentEmergencyReserveNpr,
      targetNpr: core.emergencyFundTargetNpr,
      plannedMonthlyContributionNpr: settings.plannedMonthlyContributionNpr,
      horizonMonths: growthHorizon,
    });
  }, [
    core,
    growthHorizon,
    ledger.openingReserveNpr,
    settings.plannedMonthlyContributionNpr,
    settings.transactions,
  ]);

  const scenarioMeta = SIMULATOR_SCENARIOS.find((s) => s.id === simScenario) ?? SIMULATOR_SCENARIOS[0]!;
  const simMonthly =
    parseAmount(simMonthlyRaw) ||
    (core ? core.monthlyProtectionBasisNpr * scenarioMeta.expenseMultiplier : 0);
  const simulation = useMemo(
    () =>
      core
        ? runEmergencySimulation({
            currentReserveNpr: core.currentEmergencyReserveNpr,
            simulatedMonthlyBudgetNpr: simMonthly,
            oneTimeEmergencyCostNpr:
              parseAmount(simOneTimeRaw) || scenarioMeta.defaultOneTimeCostNpr,
          })
        : null,
    [core, scenarioMeta.defaultOneTimeCostNpr, simMonthly, simOneTimeRaw],
  );

  const guidanceText = buildProtectionPeriodGuidance(settings.guidance);

  const persistReserve = useCallback(
    async (nextDesignated: number) => {
      setCashflowTick((t) => t + 1);
      await patchCashflowState(uid, (cf) => ({
        ...cf,
        emergencyCashReserve: Math.max(0, Math.round(nextDesignated)),
      }));
      setCashflowTick((t) => t + 1);
    },
    [uid],
  );

  const applyTransaction = useCallback(
    async (type: "contribution" | "withdrawal") => {
      if (submitGuard.current || txBusy) return;
      const amount = parseAmount(txAmount);
      if (amount <= 0) return;
      submitGuard.current = true;
      setTxBusy(true);
      try {
        const tx: EmergencyFundTransaction = {
          id: createTransactionId(),
          type,
          amountNpr: amount,
          date: new Date().toISOString().slice(0, 10),
          note: txNote.trim(),
          createdAt: new Date().toISOString(),
        };
        const opening =
          settings.openingReserveNpr != null
            ? settings.openingReserveNpr
            : ledger.usingLegacyCashflowBalance
              ? ledger.designatedReserveNpr
              : ledger.openingReserveNpr;
        const nextTransactions = [...settings.transactions, tx];
        const nextLedger = resolveDesignatedReserve({
          openingReserveNpr: opening,
          transactions: nextTransactions,
          cashflowEmergencyReserveNpr: cashflow.emergencyCashReserve,
        });
        if (type === "withdrawal" && nextLedger.designatedReserveNpr < 0) return;
        setSettings((prev) => ({
          ...prev,
          openingReserveNpr: opening,
          transactions: nextTransactions,
          lastSuccessfulSyncAt: new Date().toISOString(),
        }));
        await persistReserve(nextLedger.designatedReserveNpr);
        notifyEmergencyFundModuleSync();
        setTxAmount("");
        setTxNote("");
        setTxMode(null);
      } finally {
        submitGuard.current = false;
        setTxBusy(false);
      }
    },
    [
      cashflow.emergencyCashReserve,
      ledger.designatedReserveNpr,
      ledger.openingReserveNpr,
      ledger.usingLegacyCashflowBalance,
      persistReserve,
      setSettings,
      settings.openingReserveNpr,
      settings.transactions,
      txAmount,
      txBusy,
      txNote,
    ],
  );

  const setProtectionMode = (mode: ProtectionMode) => {
    setSettings((prev) => ({ ...prev, protectionMode: mode }));
    notifyEmergencyFundModuleSync();
  };

  const setProtectionMonths = (months: number, custom = false) => {
    setSettings((prev) => ({
      ...prev,
      protectionMonths: Math.max(1, Math.min(60, months)),
      useCustomProtectionMonths: custom,
    }));
    notifyEmergencyFundModuleSync();
  };

  const toggleEssential = (id: string) => {
    setSettings((prev) => {
      const set = new Set(prev.essentialRecordIds);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      return { ...prev, essentialRecordIds: [...set] };
    });
  };

  const resolveYearlyAllocation = (
    yearlyId: string,
    resolution: YearlyAllocationResolution,
    linkedMonthlyRecordId: string | null = null,
  ) => {
    setSettings((prev) => ({
      ...prev,
      yearlyAllocationDecisions: {
        ...prev.yearlyAllocationDecisions,
        [yearlyId]: {
          resolution,
          linkedMonthlyRecordId,
          updatedAt: new Date().toISOString(),
        },
      },
    }));
  };

  /** Reversible reset — removes a persisted yearly allocation decision without touching other settings. */
  const resetYearlyAllocationDecision = (yearlyId: string) => {
    setSettings((prev) => {
      if (!(yearlyId in prev.yearlyAllocationDecisions)) return prev;
      const next = { ...prev.yearlyAllocationDecisions };
      delete next[yearlyId];
      return { ...prev, yearlyAllocationDecisions: next };
    });
  };

  const toggleLinkedGoal = (id: string) => {
    setSettings((prev) => {
      const set = new Set(prev.linkedSavingsGoalIds);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      return { ...prev, linkedSavingsGoalIds: [...set] };
    });
  };

  const hydrated = settingsHydrated && !authLoading && !budgetLoading;
  const showOnboarding = hydrated && !breakdown.hasBudgetData;

  if (!hydrated) {
    return (
      <main className="min-h-screen bg-[#03110d] px-4 pb-24 pt-6 text-white">
        <div className="mx-auto max-w-lg animate-pulse space-y-3">
          <div className="h-10 w-40 rounded-full bg-white/10" />
          <div className="h-36 rounded-[1.75rem] bg-white/10" />
          <div className="h-24 rounded-2xl bg-white/10" />
          <div className="h-24 rounded-2xl bg-white/10" />
        </div>
      </main>
    );
  }

  const shell = light
    ? "bg-[#f3faf5] text-emerald-950"
    : "bg-[#03110d] text-white";
  const card = light
    ? "border-emerald-200/80 bg-white/90 text-emerald-950 shadow-sm"
    : "border-white/10 bg-white/[0.04] text-white";

  return (
    <main className={`min-h-screen overflow-x-hidden px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-5 sm:px-6 ${shell}`}>
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -left-20 top-10 h-64 w-64 rounded-full bg-emerald-400/15 blur-3xl" />
        <div className="absolute -right-16 top-40 h-72 w-72 rounded-full bg-lime-300/10 blur-3xl" />
      </div>

      <div className="relative mx-auto flex w-full max-w-lg flex-col gap-3 lg:max-w-3xl">
        <BackToReturnChecklistBannerSlot light={light} className="mb-1" />

        {/* A — Header */}
        <header className="flex items-center justify-between gap-2">
          <Link
            href="/finance"
            className={`inline-flex min-h-[44px] items-center gap-2 rounded-full border px-3 text-sm font-black backdrop-blur ${
              light ? "border-emerald-200 bg-white text-emerald-900" : "border-white/10 bg-white/5 text-emerald-50"
            }`}
          >
            <ArrowLeft size={16} />
            {copy.backToFinance}
          </Link>
          <div className="min-w-0 flex-1 text-center">
            <p className={`text-[10px] font-black uppercase tracking-[0.18em] ${light ? "text-emerald-700/70" : "text-emerald-100/45"}`}>
              FIRE Nepal
            </p>
            <h1 className="truncate text-xl font-black tracking-[-0.04em]">{copy.title}</h1>
          </div>
          <button
            type="button"
            onClick={() => setShowGuidance((v) => !v)}
            aria-label={copy.settings}
            className={`grid h-11 w-11 place-items-center rounded-full border ${
              light ? "border-emerald-200 bg-white text-emerald-800" : "border-white/10 bg-white/5 text-emerald-100"
            }`}
          >
            <Settings2 size={17} />
          </button>
        </header>

        <p className={`text-center text-sm font-semibold ${light ? "text-emerald-800/70" : "text-emerald-100/60"}`}>
          {copy.subtitle}
        </p>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${
              breakdown.hasBudgetData
                ? "bg-emerald-400/15 text-lime-200"
                : "bg-amber-400/15 text-amber-100"
            }`}
          >
            <Sparkles size={11} />
            {breakdown.hasBudgetData
              ? breakdown.isPartialBudget
                ? copy.budgetPartial
                : copy.budgetConnected
              : copy.budgetMissing}
          </span>
          <Link
            href="/budget"
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${
              light ? "bg-emerald-100 text-emerald-800" : "bg-white/8 text-emerald-100"
            }`}
          >
            {copy.openBudgetPlanner}
            <ExternalLink size={11} />
          </Link>
        </div>

        {(hydrateError || budgetError) && (
          <div className="rounded-2xl border border-amber-300/30 bg-amber-400/10 px-4 py-3 text-sm font-semibold text-amber-50">
            <p>{hydrateError || budgetError || copy.syncError}</p>
            <p className="mt-1 text-xs text-amber-100/70">{copy.cachedData}</p>
            <button
              type="button"
              onClick={() => {
                retryHydrate();
                void reloadBudgets();
              }}
              className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-black"
            >
              <RefreshCw size={12} />
              {copy.retry}
            </button>
          </div>
        )}

        {showOnboarding ? (
          <motion.section
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-[1.75rem] border p-5 ${card}`}
          >
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-400/15 text-lime-200">
                <Target size={20} />
              </span>
              <div>
                <h2 className="text-lg font-black tracking-tight">{copy.onboardingTitle}</h2>
                <p className={`mt-1 text-sm font-medium ${light ? "text-emerald-800/70" : "text-emerald-100/65"}`}>
                  {copy.onboardingBody}
                </p>
                <Link
                  href="/budget"
                  className="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-300 to-lime-300 px-4 py-2.5 text-sm font-black text-emerald-950"
                >
                  <Plus size={15} />
                  {copy.createBudget}
                </Link>
              </div>
            </div>
          </motion.section>
        ) : core ? (
          <>
            {/* B — Hero */}
            <motion.section
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative overflow-hidden rounded-[1.75rem] border border-emerald-300/20 bg-gradient-to-br from-emerald-700 via-emerald-900 to-[#02140f] p-4 text-white sm:p-5"
            >
              <div className="flex items-center gap-4">
                <ProgressRing progress={core.visualFundingProgressPct ?? 0} />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-100/70">
                    {copy.target}
                  </p>
                  <p className="mt-1 truncate text-2xl font-black tracking-tight sm:text-3xl">
                    {formatEmergencyNprPrecise(core.emergencyFundTargetNpr)}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-emerald-50/75">
                    {formatMonthsLabel(core.protectionMonths)} · {copy.monthlyBasis}{" "}
                    {formatEmergencyNprPrecise(core.monthlyProtectionBasisNpr)}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2.5">
                {[
                  { label: copy.currentReserve, value: formatEmergencyNpr(core.currentEmergencyReserveNpr) },
                  {
                    label: copy.fundingProgress,
                    value:
                      core.fundingProgressPct == null
                        ? "—"
                        : `${core.fundingProgressPct.toFixed(1)}%`,
                  },
                  {
                    label: copy.safetyRunway,
                    value:
                      core.safetyRunwayMonths == null
                        ? "—"
                        : `${formatMonthsLabel(core.safetyRunwayMonths)} · ${core.approximateProtectionDays ?? 0} ${copy.approxDays}`,
                  },
                  {
                    label: core.excessReserveNpr > 0 ? copy.excessReserve : copy.remainingShortfall,
                    value: formatEmergencyNpr(
                      core.excessReserveNpr > 0 ? core.excessReserveNpr : core.remainingShortfallNpr,
                    ),
                  },
                ].map((kpi) => (
                  <div key={kpi.label} className="rounded-xl border border-white/10 bg-white/10 p-3 backdrop-blur">
                    <p className="text-[10px] font-black uppercase tracking-wide text-emerald-100/65">{kpi.label}</p>
                    <p className="mt-1 text-sm font-black leading-snug sm:text-base">{kpi.value}</p>
                  </div>
                ))}
              </div>
            </motion.section>

            {/* C — Protection mode */}
            <section className={`rounded-2xl border p-3 ${card}`}>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    ["full_lifestyle", copy.fullLifestyle],
                    ["essential_survival", copy.essentialOnly],
                  ] as const
                ).map(([mode, label]) => {
                  const active = settings.protectionMode === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setProtectionMode(mode)}
                      className={`rounded-xl border px-3 py-2.5 text-left text-sm font-black transition ${
                        active
                          ? "border-emerald-300 bg-emerald-400/20 text-lime-100"
                          : light
                            ? "border-emerald-100 bg-emerald-50/50 text-emerald-800"
                            : "border-white/10 bg-white/[0.03] text-emerald-100/70"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              <p className={`mt-2 text-xs font-medium leading-relaxed ${light ? "text-emerald-800/65" : "text-emerald-100/55"}`}>
                {settings.protectionMode === "full_lifestyle" ? copy.fullLifestyleDesc : copy.essentialOnlyDesc}
              </p>
              {settings.protectionMode === "full_lifestyle" ? (
                <p className={`mt-1 text-[11px] font-semibold ${light ? "text-emerald-700/55" : "text-emerald-100/40"}`}>
                  {copy.fullLifestyleNote}
                </p>
              ) : (
                <div className="mt-3 space-y-2">
                  {ineligibleEssentialSelections.length > 0 ? (
                    <p className="rounded-lg border border-amber-300/30 bg-amber-400/10 px-2.5 py-2 text-[11px] font-semibold text-amber-50">
                      {copy.ineligibleEssentialWarning}
                      <span className="mt-1 block opacity-80">
                        {ineligibleEssentialSelections.map((l) => l.name).join(", ")}
                      </span>
                    </p>
                  ) : null}
                  <div className="max-h-40 space-y-1.5 overflow-y-auto">
                    {protectionResolved.selectedLines.concat(protectionResolved.excludedLines).map((line) => {
                      const checked = settings.essentialRecordIds.includes(line.id);
                      return (
                        <label
                          key={line.id}
                          className={`flex items-start justify-between gap-2 rounded-lg border px-2.5 py-2 text-xs font-semibold ${
                            light ? "border-emerald-100" : "border-white/8"
                          }`}
                        >
                          <span className="min-w-0 break-words">
                            <input
                              type="checkbox"
                              className="mr-2 align-middle"
                              checked={checked}
                              onChange={() => toggleEssential(line.id)}
                            />
                            {line.name}
                            {line.needsReview ? (
                              <span className="mt-0.5 block text-[10px] font-bold text-amber-200/80">
                                {copy.inclusionProvisional}
                              </span>
                            ) : null}
                          </span>
                          <span className="shrink-0 tabular-nums">
                            {formatEmergencyNprPrecise(line.monthlyEquivalentNpr)}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
              <p className="mt-2 text-sm font-black">
                {copy.monthlyBasis}: {formatEmergencyNprPrecise(protectionResolved.finalMonthlyProtectionBasisNpr)}
              </p>
            </section>

            {/* D — Protection period */}
            <section className={`rounded-2xl border p-3 ${card}`}>
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100/50">
                {copy.protectionPeriod}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {PROTECTION_PERIOD_OPTIONS.map((opt) => {
                  const active =
                    !settings.useCustomProtectionMonths && settings.protectionMonths === opt.months;
                  return (
                    <button
                      key={opt.months}
                      type="button"
                      onClick={() => setProtectionMonths(opt.months, false)}
                      className={`rounded-lg border px-2.5 py-1.5 text-xs font-black ${
                        active
                          ? "border-lime-300/50 bg-lime-300/15 text-lime-100"
                          : light
                            ? "border-emerald-100 text-emerald-800"
                            : "border-white/10 text-emerald-100/70"
                      }`}
                      title={opt.education}
                    >
                      {opt.label}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setProtectionMonths(Number(customMonthsRaw) || settings.protectionMonths, true)}
                  className={`rounded-lg border px-2.5 py-1.5 text-xs font-black ${
                    settings.useCustomProtectionMonths
                      ? "border-lime-300/50 bg-lime-300/15 text-lime-100"
                      : light
                        ? "border-emerald-100 text-emerald-800"
                        : "border-white/10 text-emerald-100/70"
                  }`}
                >
                  {copy.customPeriod}
                </button>
              </div>
              {settings.useCustomProtectionMonths ? (
                <input
                  className={`mt-2 w-28 rounded-lg border bg-transparent px-2 py-1.5 text-sm font-black outline-none ${
                    light ? "border-emerald-200" : "border-white/15"
                  }`}
                  inputMode="numeric"
                  value={customMonthsRaw}
                  placeholder="Months"
                  onChange={(e) => {
                    const next = e.target.value.replace(/[^\d]/g, "");
                    setCustomMonthsRaw(next);
                    const n = Number(next);
                    if (n > 0) setProtectionMonths(n, true);
                  }}
                />
              ) : (
                <p className={`mt-2 text-[11px] font-semibold ${light ? "text-emerald-700/60" : "text-emerald-100/45"}`}>
                  {PROTECTION_PERIOD_OPTIONS.find((o) => o.months === settings.protectionMonths)?.education ??
                    "Custom protection period"}{" "}
                  — planning label, not a guarantee.
                </p>
              )}
            </section>

            {/* E — Primary actions */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTxMode("contribution")}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-300 to-lime-300 text-sm font-black text-emerald-950 shadow-lg shadow-emerald-500/20"
              >
                <PiggyBank size={16} />
                {copy.addFunds}
              </button>
              <button
                type="button"
                onClick={() => setTxMode("withdrawal")}
                className={`inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border text-sm font-black ${
                  light ? "border-emerald-200 bg-white text-emerald-900" : "border-white/15 bg-white/5 text-white"
                }`}
              >
                <Wallet size={16} />
                {copy.withdraw}
              </button>
            </div>

            {txMode ? (
              <section className={`rounded-2xl border p-4 ${card}`}>
                <p className="text-sm font-black">
                  {txMode === "contribution" ? copy.addFunds : copy.withdraw}
                </p>
                <label className="mt-3 block text-xs font-bold opacity-70">
                  Amount (NPR)
                  <input
                    className={`mt-1 w-full rounded-xl border bg-transparent px-3 py-2.5 text-lg font-black outline-none ${
                      light ? "border-emerald-200" : "border-white/15"
                    }`}
                    inputMode="decimal"
                    value={txAmount}
                    onChange={(e) => setTxAmount(sanitizeDecimalInput(e.target.value))}
                  />
                </label>
                <label className="mt-2 block text-xs font-bold opacity-70">
                  {txMode === "contribution" ? copy.contributionNote : copy.withdrawalNote}
                  <input
                    className={`mt-1 w-full rounded-xl border bg-transparent px-3 py-2 text-sm font-semibold outline-none ${
                      light ? "border-emerald-200" : "border-white/15"
                    }`}
                    value={txNote}
                    onChange={(e) => setTxNote(e.target.value.slice(0, 200))}
                  />
                </label>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    disabled={txBusy || parseAmount(txAmount) <= 0}
                    onClick={() => void applyTransaction(txMode)}
                    className="rounded-full bg-emerald-300 px-4 py-2 text-sm font-black text-emerald-950 disabled:opacity-50"
                  >
                    {copy.saveTransaction}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTxMode(null)}
                    className="rounded-full border border-white/15 px-4 py-2 text-sm font-black"
                  >
                    Cancel
                  </button>
                </div>
              </section>
            ) : null}

            {/* F — Budget integration */}
            <SectionShell
              title={copy.budgetIntegration}
              defaultOpen={breakdown.isProvisional || breakdown.emergencyFundContributionExcludedNpr > 0}
              badge={breakdown.isProvisional ? "Review" : undefined}
            >
              <div className="grid gap-1.5 text-xs font-semibold">
                {[
                  [copy.grossMonthly, breakdown.grossMonthlyBudgetNpr],
                  [copy.yearlyTotal, breakdown.yearlyBudgetTotalNpr],
                  [copy.annualMonthlyEq, breakdown.annualMonthlyEquivalentNpr],
                  [copy.additionalAnnual, breakdown.additionalAnnualMonthlyAllocationsNpr],
                  [copy.annualAlreadyIncluded, breakdown.annualAllocationsAlreadyIncludedNpr],
                  [copy.totalNormalized, breakdown.totalNormalizedBudgetNpr],
                  [copy.efContributionExcluded, breakdown.emergencyFundContributionExcludedNpr],
                  [copy.otherUserExclusions, protectionResolved.otherUserExclusionsNpr],
                  [copy.essentialSelected, protectionResolved.essentialSelectedBudgetNpr],
                  [copy.finalBasis, protectionResolved.finalMonthlyProtectionBasisNpr],
                ].map(([label, value]) => (
                  <div key={String(label)} className="flex items-start justify-between gap-3">
                    <span className="min-w-0 break-words opacity-70">{label}</span>
                    <span className="shrink-0 tabular-nums">{formatEmergencyNprPrecise(Number(value))}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between gap-3 pt-1">
                  <span className="opacity-70">{copy.lastSync}</span>
                  <span className="tabular-nums">
                    {settings.lastSuccessfulSyncAt
                      ? new Date(settings.lastSuccessfulSyncAt).toLocaleString()
                      : "—"}
                  </span>
                </div>
              </div>
              <p
                className={`mt-3 text-[11px] font-black uppercase tracking-wide ${
                  breakdown.isProvisional ? "text-amber-200" : "text-lime-200/80"
                }`}
              >
                {breakdown.isProvisional ? copy.calculationProvisional : copy.calculationVerified}
              </p>
              {breakdown.isProvisional ? (
                <div className="mt-2 space-y-2">
                  <p className="rounded-xl border border-amber-300/30 bg-amber-400/10 px-3 py-2 text-xs font-semibold text-amber-50">
                    {copy.provisionalWarning}
                  </p>
                  {breakdown.provisionalLines.map((line) => (
                    <div
                      key={`review-${line.id}`}
                      className={`rounded-xl border px-3 py-2.5 ${
                        light ? "border-amber-200 bg-amber-50/80" : "border-amber-300/25 bg-amber-400/10"
                      }`}
                    >
                      <p className="text-xs font-black break-words">{line.name}</p>
                      <p className="mt-0.5 text-[11px] font-semibold opacity-70">
                        {formatEmergencyNprPrecise(line.monthlyEquivalentNpr)} / mo · {line.category}
                        {line.nearAmountMatch ? " · near amount match" : ""}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          className="rounded-lg border border-lime-300/40 bg-lime-300/15 px-2 py-1 text-[10px] font-black text-lime-100"
                          onClick={() => resolveYearlyAllocation(line.id, "separate")}
                        >
                          {copy.resolveSeparate}
                        </button>
                        <button
                          type="button"
                          className="rounded-lg border border-white/15 px-2 py-1 text-[10px] font-black"
                          onClick={() => resolveYearlyAllocation(line.id, "already_included")}
                        >
                          {copy.resolveAlreadyIncluded}
                        </button>
                        {(line.reviewCandidateMonthlyIds ?? []).slice(0, 1).map((monthlyId) => (
                          <button
                            key={monthlyId}
                            type="button"
                            className="rounded-lg border border-white/15 px-2 py-1 text-[10px] font-black"
                            onClick={() => resolveYearlyAllocation(line.id, "linked", monthlyId)}
                          >
                            {copy.resolveLinked}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  <Link href="/budget" className="inline-flex items-center gap-1 text-[11px] font-black text-lime-200">
                    {copy.reviewBudget} <ExternalLink size={11} />
                  </Link>
                </div>
              ) : null}
              {breakdown.userDecisionLines.length > 0 ? (
                <div className="mt-2 space-y-2">
                  {breakdown.userDecisionLines.map((line) => (
                    <div
                      key={`decision-${line.id}`}
                      className={`rounded-xl border px-3 py-2.5 ${
                        light ? "border-emerald-200 bg-emerald-50/80" : "border-white/10 bg-white/[0.04]"
                      }`}
                    >
                      <p className="text-xs font-black break-words">{line.name}</p>
                      <p className="mt-0.5 text-[11px] font-semibold opacity-70">
                        {inclusionLabel(line)} · {formatEmergencyNprPrecise(line.monthlyEquivalentNpr)} / mo
                      </p>
                      <button
                        type="button"
                        className="mt-2 rounded-lg border border-white/15 px-2 py-1 text-[10px] font-black"
                        onClick={() => resetYearlyAllocationDecision(line.id)}
                      >
                        {copy.resetDecision}
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
              <div className="mt-3 max-h-56 space-y-1 overflow-y-auto text-[11px]">
                {breakdown.allLines.map((line) => (
                  <div
                    key={line.id}
                    className={`flex items-start justify-between gap-2 rounded-lg px-2 py-1.5 ${
                      light ? "bg-emerald-50/80" : "bg-white/[0.03]"
                    }`}
                  >
                    <span className="min-w-0 break-words">
                      <span className="font-black">{line.name}</span>
                      <span className="mt-0.5 block opacity-60">
                        {line.period} · {inclusionLabel(line)}
                      </span>
                    </span>
                    <span className="shrink-0 tabular-nums">
                      {formatEmergencyNprPrecise(line.monthlyEquivalentNpr)}
                    </span>
                  </div>
                ))}
              </div>
              <Link href="/budget" className="mt-3 inline-flex items-center gap-1 text-xs font-black text-lime-200">
                {copy.openBudgetPlanner} <ExternalLink size={12} />
              </Link>
            </SectionShell>

            {/* G — Safety journey */}
            <section className={`rounded-2xl border p-4 ${card}`}>
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-lime-300" />
                <h2 className="text-sm font-black">{copy.safetyJourney}</h2>
              </div>
              <div className="mt-3 space-y-2.5">
                {milestones.map((m) => (
                  <div key={m.months}>
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span>
                        {m.months} Mo — {m.label}
                        {m.achieved ? " ✓" : ""}
                      </span>
                      <span className="tabular-nums opacity-70">
                        {formatEmergencyNprPrecise(m.requiredReserveNpr)}
                      </span>
                    </div>
                    <div className={`mt-1 h-1.5 overflow-hidden rounded-full ${light ? "bg-emerald-100" : "bg-white/10"}`}>
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-300 to-lime-300"
                        style={{ width: `${m.progressPct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* H — Funding plan */}
            <SectionShell title={copy.fundingPlan}>
              {core.isFullyFunded ? (
                <p className="text-sm font-bold text-lime-200">{copy.fullyFunded}</p>
              ) : (
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide opacity-60">{copy.monthlyContribution}</p>
                    <input
                      className={`mt-1 w-full rounded-xl border bg-transparent px-3 py-2 text-sm font-black outline-none ${
                        light ? "border-emerald-200" : "border-white/15"
                      }`}
                      inputMode="decimal"
                      value={contributionRaw}
                      placeholder="0"
                      onChange={(e) => {
                        const next = sanitizeDecimalInput(e.target.value);
                        setContributionRaw(next);
                        const amount = parseAmount(next);
                        setSettings((prev) => ({
                          ...prev,
                          fundingMethod: amount > 0 ? "monthly_contribution" : prev.fundingMethod,
                          plannedMonthlyContributionNpr: amount > 0 ? amount : null,
                          importedPlannedContributionFromBudget: false,
                        }));
                      }}
                    />
                    {plannedBudgetContribution > 0 ? (
                      <button
                        type="button"
                        className="mt-2 text-left text-[11px] font-black text-lime-200 underline-offset-2 hover:underline"
                        onClick={() => {
                          setContributionRaw(String(plannedBudgetContribution));
                          setSettings((prev) => ({
                            ...prev,
                            fundingMethod: "monthly_contribution",
                            plannedMonthlyContributionNpr: plannedBudgetContribution,
                            importedPlannedContributionFromBudget: true,
                          }));
                        }}
                      >
                        {copy.importPlannedContribution} ({formatEmergencyNprPrecise(plannedBudgetContribution)})
                      </button>
                    ) : null}
                    {monthlyFunding ? (
                      <p className="mt-2 text-xs font-semibold opacity-80">
                        {copy.estimatedMonths}: {monthlyFunding.estimatedMonthsRemaining} · {copy.estimatedCompletion}:{" "}
                        {monthlyFunding.estimatedCompletionDate
                          ? formatMonthYear(monthlyFunding.estimatedCompletionDate)
                          : "—"}
                      </p>
                    ) : (
                      <p className="mt-2 text-xs font-semibold opacity-60">{copy.setContributionPrompt}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide opacity-60">{copy.targetDeadline}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {FUNDING_DEADLINE_OPTIONS.map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => {
                            setDeadlineMonths(m);
                            setSettings((prev) => ({
                              ...prev,
                              fundingMethod: "target_deadline",
                              deadlineMonths: m,
                            }));
                          }}
                          className={`rounded-lg border px-2.5 py-1 text-xs font-black ${
                            deadlineMonths === m
                              ? "border-lime-300/40 bg-lime-300/15 text-lime-100"
                              : "border-white/10 opacity-70"
                          }`}
                        >
                          {m} mo
                        </button>
                      ))}
                    </div>
                    {deadlineFunding ? (
                      <p className="mt-2 text-xs font-semibold">
                        {copy.requiredContribution}:{" "}
                        {formatEmergencyNpr(deadlineFunding.requiredMonthlyContributionNpr, 2)}
                        <span className="mt-1 block opacity-60">
                          Required contribution — affordability is not claimed without additional financial data.
                        </span>
                      </p>
                    ) : null}
                  </div>
                </div>
              )}
            </SectionShell>

            {/* I — Simulator */}
            <SectionShell title={copy.simulator}>
              <p className="text-[11px] font-semibold opacity-60">{copy.simulatorEstimateNote}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {SIMULATOR_SCENARIOS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setSimScenario(s.id);
                      setSimOneTimeRaw(String(s.defaultOneTimeCostNpr));
                      if (core) {
                        setSimMonthlyRaw(String(Math.round(core.monthlyProtectionBasisNpr * s.expenseMultiplier)));
                      }
                    }}
                    className={`rounded-lg border px-2 py-1 text-[10px] font-black ${
                      simScenario === s.id
                        ? "border-lime-300/40 bg-lime-300/15 text-lime-100"
                        : "border-white/10 opacity-70"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <label className="text-[11px] font-bold opacity-70">
                  Simulated monthly
                  <input
                    className={`mt-1 w-full rounded-lg border bg-transparent px-2 py-1.5 text-sm font-black outline-none ${
                      light ? "border-emerald-200" : "border-white/15"
                    }`}
                    inputMode="decimal"
                    value={simMonthlyRaw}
                    placeholder={String(Math.round(simMonthly))}
                    onChange={(e) => setSimMonthlyRaw(sanitizeDecimalInput(e.target.value))}
                  />
                </label>
                <label className="text-[11px] font-bold opacity-70">
                  One-time cost
                  <input
                    className={`mt-1 w-full rounded-lg border bg-transparent px-2 py-1.5 text-sm font-black outline-none ${
                      light ? "border-emerald-200" : "border-white/15"
                    }`}
                    inputMode="decimal"
                    value={simOneTimeRaw}
                    onChange={(e) => setSimOneTimeRaw(sanitizeDecimalInput(e.target.value))}
                  />
                </label>
              </div>
              {simulation ? (
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-semibold">
                  <div className="rounded-lg bg-white/5 p-2">
                    Available: {formatEmergencyNpr(simulation.availableSimulatedReserveNpr)}
                  </div>
                  <div className="rounded-lg bg-white/5 p-2">
                    Runway:{" "}
                    {simulation.simulatedSafetyRunwayMonths == null
                      ? "—"
                      : formatMonthsLabel(simulation.simulatedSafetyRunwayMonths)}
                  </div>
                  <div className="rounded-lg bg-white/5 p-2">
                    ~Days: {simulation.approximateProtectionDays ?? "—"}
                  </div>
                  <div className="rounded-lg bg-white/5 p-2">
                    Uncovered: {formatEmergencyNpr(simulation.uncoveredOneTimeCostNpr)}
                  </div>
                </div>
              ) : null}
            </SectionShell>

            {/* J — Annual payments */}
            {upcomingPayments.length > 0 ? (
              <section className={`rounded-2xl border p-4 ${card}`}>
                <div className="flex items-center gap-2">
                  <CalendarClock size={16} className="text-amber-200" />
                  <h2 className="text-sm font-black">{copy.annualPayments}</h2>
                </div>
                <p className="mt-1 text-[11px] font-semibold opacity-55">
                  Liquidity warnings only — not deducted from your emergency reserve automatically.
                </p>
                <div className="mt-3 space-y-2">
                  {upcomingPayments
                    .filter((p) => p.window !== "later")
                    .slice(0, 5)
                    .map((p) => (
                      <div
                        key={p.id}
                        className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
                          p.status === "overdue" || p.status === "due_today"
                            ? "border-amber-300/40 bg-amber-400/10"
                            : light
                              ? "border-emerald-100"
                              : "border-white/8"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="min-w-0 break-words font-black">{p.name}</span>
                          <span className="shrink-0 tabular-nums">{formatEmergencyNpr(p.amountNpr)}</span>
                        </div>
                        <p className="mt-1 font-black text-amber-100/90">{p.statusLabel}</p>
                        <p className="mt-0.5 opacity-70">
                          Due {p.dueDate} · remaining {formatEmergencyNpr(p.remainingObligationNpr)}
                        </p>
                      </div>
                    ))}
                </div>
              </section>
            ) : null}

            {/* K — Growth & history */}
            <SectionShell title={copy.growthHistory}>
              <div className="mb-2 flex flex-wrap gap-1.5">
                {([3, 6, 12, 24] as const).map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setGrowthHorizon(h)}
                    className={`rounded-lg border px-2 py-1 text-[10px] font-black ${
                      growthHorizon === h
                        ? "border-lime-300/40 bg-lime-300/15 text-lime-100"
                        : "border-white/10 opacity-70"
                    }`}
                  >
                    {h} mo
                  </button>
                ))}
              </div>
              {growthPoints.length <= 1 && !settings.plannedMonthlyContributionNpr ? (
                <p className="text-xs font-semibold opacity-60">{copy.noTransactions}</p>
              ) : (
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={growthPoints}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                      <XAxis dataKey="label" hide />
                      <YAxis hide domain={[0, "auto"]} />
                      <Tooltip
                        contentStyle={{
                          background: "#06291f",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: 12,
                          fontSize: 12,
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="actualNpr"
                        stroke="#6ee7b7"
                        strokeWidth={2}
                        dot={false}
                        connectNulls={false}
                        name="Actual"
                      />
                      <Line
                        type="monotone"
                        dataKey="projectedNpr"
                        stroke="#bef264"
                        strokeWidth={2}
                        strokeDasharray="6 4"
                        dot={false}
                        connectNulls
                        name="Projected"
                      />
                      <Line
                        type="monotone"
                        dataKey="targetNpr"
                        stroke="rgba(255,255,255,0.35)"
                        strokeWidth={1}
                        dot={false}
                        name="Target"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
              <div className="mt-3 max-h-36 space-y-1 overflow-y-auto text-xs">
                {settings.transactions.length === 0 ? (
                  <p className="opacity-60">{copy.noTransactions}</p>
                ) : (
                  [...settings.transactions]
                    .reverse()
                    .slice(0, 12)
                    .map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between gap-2 rounded-lg bg-white/5 px-2 py-1.5">
                        <span>
                          {tx.type === "contribution" ? "+" : "−"} {tx.date}
                          {tx.note ? ` · ${tx.note}` : ""}
                        </span>
                        <span className="font-black tabular-nums">{formatEmergencyNpr(tx.amountNpr)}</span>
                      </div>
                    ))
                )}
              </div>
              {savingsGoals.length > 0 ? (
                <div className="mt-3">
                  <p className="text-[10px] font-black uppercase tracking-wide opacity-55">{copy.linkSavings}</p>
                  <div className="mt-1.5 space-y-1">
                    {savingsGoals
                      .filter((g) => /emergency/i.test(g.name) || /emergency/i.test(g.category) || g.templateId === "emergency")
                      .concat(
                        savingsGoals.filter(
                          (g) =>
                            !(
                              /emergency/i.test(g.name) ||
                              /emergency/i.test(g.category) ||
                              g.templateId === "emergency"
                            ),
                        ),
                      )
                      .slice(0, 6)
                      .map((g) => (
                        <label key={g.id} className="flex items-center justify-between gap-2 text-xs font-semibold">
                          <span className="truncate">
                            <input
                              type="checkbox"
                              className="mr-2"
                              checked={settings.linkedSavingsGoalIds.includes(g.id)}
                              onChange={() => toggleLinkedGoal(g.id)}
                            />
                            {g.name}
                          </span>
                          <span className="tabular-nums">{formatEmergencyNpr(g.savedAmountNpr)}</span>
                        </label>
                      ))}
                  </div>
                </div>
              ) : null}
            </SectionShell>

            {/* L — Insights */}
            <section className={`rounded-2xl border p-4 ${card}`}>
              <h2 className="text-sm font-black">{copy.insights}</h2>
              <div className="mt-3 space-y-2">
                {insights.map((insight) => (
                  <article
                    key={insight.id}
                    className={`rounded-xl border px-3 py-2.5 ${
                      insight.priority === "missing_budget" || insight.priority === "annual_obligation"
                        ? "border-amber-300/30 bg-amber-400/10"
                        : light
                          ? "border-emerald-100 bg-emerald-50/70"
                          : "border-white/8 bg-white/[0.03]"
                    }`}
                  >
                    <p className="text-xs font-black">{insight.title}</p>
                    <p className="mt-1 text-xs font-medium leading-relaxed opacity-80">{insight.body}</p>
                    {insight.actionHref ? (
                      <Link href={insight.actionHref} className="mt-2 inline-flex text-[11px] font-black text-lime-200">
                        {insight.actionLabel ?? copy.openBudgetPlanner}
                      </Link>
                    ) : null}
                  </article>
                ))}
              </div>
            </section>
          </>
        ) : null}

        {showGuidance ? (
          <SectionShell title={copy.guidanceTitle} defaultOpen>
            <p className="text-[11px] font-semibold opacity-60">{copy.guidanceHint}</p>
            <div className="mt-3 grid gap-2 text-xs font-semibold">
              <label className="flex items-center justify-between gap-2">
                Employment stability
                <select
                  className="rounded-lg border border-white/15 bg-transparent px-2 py-1"
                  value={settings.guidance?.employmentStability ?? "unknown"}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      guidance: {
                        employmentStability: e.target.value as "stable" | "unstable" | "unknown",
                        householdIncomeSources: prev.guidance?.householdIncomeSources ?? "unknown",
                        dependents: prev.guidance?.dependents ?? 0,
                        overseasEmployment: prev.guidance?.overseasEmployment ?? null,
                        significantRecurringObligations:
                          prev.guidance?.significantRecurringObligations ?? null,
                      },
                    }))
                  }
                >
                  <option value="unknown">Unknown</option>
                  <option value="stable">Stable</option>
                  <option value="unstable">Unstable</option>
                </select>
              </label>
              <label className="flex items-center justify-between gap-2">
                Income sources
                <select
                  className="rounded-lg border border-white/15 bg-transparent px-2 py-1"
                  value={settings.guidance?.householdIncomeSources ?? "unknown"}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      guidance: {
                        employmentStability: prev.guidance?.employmentStability ?? "unknown",
                        householdIncomeSources: e.target.value as "single" | "multiple" | "unknown",
                        dependents: prev.guidance?.dependents ?? 0,
                        overseasEmployment: prev.guidance?.overseasEmployment ?? null,
                        significantRecurringObligations:
                          prev.guidance?.significantRecurringObligations ?? null,
                      },
                    }))
                  }
                >
                  <option value="unknown">Unknown</option>
                  <option value="single">Single</option>
                  <option value="multiple">Multiple</option>
                </select>
              </label>
              <label className="flex items-center justify-between gap-2">
                Dependents
                <input
                  className="w-20 rounded-lg border border-white/15 bg-transparent px-2 py-1 text-right"
                  inputMode="numeric"
                  value={settings.guidance?.dependents ?? 0}
                  onChange={(e) => {
                    const n = Math.max(0, Math.min(20, Number(e.target.value.replace(/[^\d]/g, "") || 0)));
                    setSettings((prev) => ({
                      ...prev,
                      guidance: {
                        employmentStability: prev.guidance?.employmentStability ?? "unknown",
                        householdIncomeSources: prev.guidance?.householdIncomeSources ?? "unknown",
                        dependents: n,
                        overseasEmployment: prev.guidance?.overseasEmployment ?? null,
                        significantRecurringObligations:
                          prev.guidance?.significantRecurringObligations ?? null,
                      },
                    }));
                  }}
                />
              </label>
            </div>
            {guidanceText ? (
              <p className="mt-3 rounded-xl bg-white/5 px-3 py-2 text-xs font-medium leading-relaxed opacity-80">
                {guidanceText}
              </p>
            ) : null}
          </SectionShell>
        ) : null}

        {/* Keep optional AI analysis available but separate */}
        {core ? (
          <SectionShell title="Extended AI Safety Analysis (optional)">
            <p className="text-xs font-medium opacity-65">
              Core Emergency Fund calculations are budget-powered and do not require AI. Optional narrative
              analysis remains available for storytelling only.
            </p>
            <Link
              href="#ef-ai-optional"
              className="mt-2 inline-flex text-xs font-black text-lime-200"
              id="ef-ai-optional"
            >
              Open optional analysis tools from Finance reports when needed.
            </Link>
          </SectionShell>
        ) : null}
      </div>
    </main>
  );
}
