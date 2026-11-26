/**
 * Emergency fund ledger helpers — sanitize, mutate, and sync reserve SoT.
 */

import {
  defaultEmergencyFundLedger,
  defaultEmergencyFundSettings,
  DEFAULT_PERIOD_MODE,
  type EmergencyFundLedger,
  type EmergencyFundSettings,
  type EmergencyFundTransaction,
  type EmergencyReserveMode,
  type EmergencyEmploymentType,
  type EmergencyIncomeSources,
} from "@/lib/emergency-fund/types";
import { deriveEmergencyCashReserveFromLedger } from "@/lib/emergency-fund/intelligent-engine";
import type { EmergencyPeriodMode } from "@/lib/emergency-fund/period";
import type { FinanceCategoryId } from "@/lib/finance/categories";

const KNOWN_FINANCE_CATEGORY_IDS = new Set([
  "Emergency",
  "Debt",
  "Insurance",
  "Investment",
  "Savings",
  "Rent",
  "Food",
  "Utilities",
  "Transport",
  "Health",
  "Education",
  "Travel",
  "Shopping",
  "Entertainment",
  "Gifts",
  "Other",
]);

const PERIOD_MODES = new Set<EmergencyPeriodMode>([
  "latest_completed",
  "current_partial",
  "last_3_completed",
  "last_6_completed",
  "custom",
]);

function finiteNonNeg(n: unknown): number {
  if (typeof n !== "number" || !Number.isFinite(n) || n < 0) return 0;
  return n;
}

function sanitizeTransaction(raw: unknown): EmergencyFundTransaction | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Partial<EmergencyFundTransaction>;
  if (typeof o.id !== "string" || !o.id.trim()) return null;
  if (o.type !== "contribution" && o.type !== "withdrawal") return null;
  const amountNpr = finiteNonNeg(o.amountNpr);
  if (amountNpr <= 0) return null;
  if (typeof o.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(o.date)) return null;
  const originalCurrency =
    o.originalCurrency === "KRW" || o.originalCurrency === "USD" || o.originalCurrency === "NPR"
      ? o.originalCurrency
      : undefined;
  return {
    id: o.id.trim(),
    type: o.type,
    amountNpr: Math.round(amountNpr),
    originalAmount:
      typeof o.originalAmount === "number" && Number.isFinite(o.originalAmount)
        ? o.originalAmount
        : undefined,
    originalCurrency,
    date: o.date,
    note: typeof o.note === "string" && o.note.trim() ? o.note.trim().slice(0, 500) : undefined,
    createdAt: typeof o.createdAt === "string" ? o.createdAt : new Date().toISOString(),
    linkedSavingsTransactionId:
      typeof o.linkedSavingsTransactionId === "string"
        ? o.linkedSavingsTransactionId
        : undefined,
    confirmed: o.confirmed !== false,
  };
}

function sanitizeReserveMode(raw: unknown): EmergencyReserveMode {
  if (raw === "linked" || raw === "hybrid" || raw === "ledger") return raw;
  return "ledger";
}

function sanitizeEmployment(raw: unknown): EmergencyEmploymentType | undefined {
  if (
    raw === "stable" ||
    raw === "contract" ||
    raw === "overseas" ||
    raw === "self_employed" ||
    raw === "uncertain"
  ) {
    return raw;
  }
  return undefined;
}

function sanitizeSettings(raw: unknown, fallbackOpening = 0): EmergencyFundSettings {
  const base = defaultEmergencyFundSettings(fallbackOpening);
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Partial<EmergencyFundSettings>;
  const protectionMonths = Math.max(
    1,
    Math.min(36, Math.round(finiteNonNeg(o.protectionMonths) || base.protectionMonths)),
  );
  const allocationPct = Math.max(
    0,
    Math.min(100, Math.round(finiteNonNeg(o.allocationPct) || base.allocationPct)),
  );
  const include = Array.isArray(o.includeDiscretionaryCategoryIds)
    ? o.includeDiscretionaryCategoryIds.filter((id): id is FinanceCategoryId =>
        KNOWN_FINANCE_CATEGORY_IDS.has(String(id)),
      )
    : undefined;

  return {
    protectionMonths,
    allocationPct,
    expenseBasisOverrideNpr:
      typeof o.expenseBasisOverrideNpr === "number" &&
      Number.isFinite(o.expenseBasisOverrideNpr) &&
      o.expenseBasisOverrideNpr > 0
        ? Math.round(o.expenseBasisOverrideNpr)
        : undefined,
    openingBalanceNpr: Math.round(finiteNonNeg(o.openingBalanceNpr ?? fallbackOpening)),
    linkedSavingsGoalIds: Array.isArray(o.linkedSavingsGoalIds)
      ? o.linkedSavingsGoalIds.filter((id): id is string => typeof id === "string" && id.trim().length > 0)
      : [],
    reserveMode: sanitizeReserveMode(o.reserveMode),
    employmentType: sanitizeEmployment(o.employmentType),
    incomeSources:
      o.incomeSources === "single" || o.incomeSources === "multiple"
        ? (o.incomeSources as EmergencyIncomeSources)
        : undefined,
    dependents:
      typeof o.dependents === "number" && Number.isFinite(o.dependents)
        ? Math.max(0, Math.round(o.dependents))
        : undefined,
    manualMonthlyExpenseNpr:
      typeof o.manualMonthlyExpenseNpr === "number" &&
      Number.isFinite(o.manualMonthlyExpenseNpr) &&
      o.manualMonthlyExpenseNpr > 0
        ? Math.round(o.manualMonthlyExpenseNpr)
        : undefined,
    includeDiscretionaryCategoryIds: include,
    customContributionNpr:
      typeof o.customContributionNpr === "number" &&
      Number.isFinite(o.customContributionNpr) &&
      o.customContributionNpr >= 0
        ? Math.round(o.customContributionNpr)
        : undefined,
    periodMode: PERIOD_MODES.has(o.periodMode as EmergencyPeriodMode)
      ? (o.periodMode as EmergencyPeriodMode)
      : DEFAULT_PERIOD_MODE,
    customPeriodStartMonth:
      typeof o.customPeriodStartMonth === "string" && /^\d{4}-\d{2}$/.test(o.customPeriodStartMonth)
        ? o.customPeriodStartMonth
        : undefined,
    customPeriodEndMonth:
      typeof o.customPeriodEndMonth === "string" && /^\d{4}-\d{2}$/.test(o.customPeriodEndMonth)
        ? o.customPeriodEndMonth
        : undefined,
    fundingDeadlineMonths:
      typeof o.fundingDeadlineMonths === "number" &&
      Number.isFinite(o.fundingDeadlineMonths) &&
      o.fundingDeadlineMonths >= 1
        ? Math.round(o.fundingDeadlineMonths)
        : undefined,
    growthChartMonths:
      o.growthChartMonths === 3 ||
      o.growthChartMonths === 6 ||
      o.growthChartMonths === 12 ||
      o.growthChartMonths === 24
        ? o.growthChartMonths
        : 12,
    lastSyncedAt: typeof o.lastSyncedAt === "string" ? o.lastSyncedAt : undefined,
    lastUpdatedAt:
      typeof o.lastUpdatedAt === "string" ? o.lastUpdatedAt : new Date().toISOString(),
  };
}

export function sanitizeEmergencyFundLedger(
  raw: unknown,
  fallbackOpeningBalanceNpr = 0,
): EmergencyFundLedger {
  if (!raw || typeof raw !== "object") {
    return defaultEmergencyFundLedger(fallbackOpeningBalanceNpr);
  }
  const o = raw as Partial<EmergencyFundLedger>;
  const transactions = Array.isArray(o.transactions)
    ? o.transactions.map(sanitizeTransaction).filter((t): t is EmergencyFundTransaction => t !== null)
    : [];
  return {
    version: 1,
    settings: sanitizeSettings(o.settings, fallbackOpeningBalanceNpr),
    transactions,
  };
}

/**
 * Ensure ledger exists. Migrates legacy emergencyCashReserve into opening balance
 * when the ledger is first created (no double-count of historical unknown deposits).
 */
export function ensureEmergencyFundLedger(
  existing: EmergencyFundLedger | null | undefined,
  legacyReserveNpr: number | null | undefined,
): EmergencyFundLedger {
  if (existing?.version === 1) {
    return sanitizeEmergencyFundLedger(existing, existing.settings.openingBalanceNpr);
  }
  const opening = finiteNonNeg(legacyReserveNpr);
  return defaultEmergencyFundLedger(opening);
}

export function appendEmergencyTransaction(
  ledger: EmergencyFundLedger,
  input: {
    type: "contribution" | "withdrawal";
    amountNpr: number;
    date: string;
    note?: string;
    originalAmount?: number;
    originalCurrency?: "NPR" | "KRW" | "USD";
    linkedSavingsTransactionId?: string;
  },
): EmergencyFundLedger {
  const amountNpr = Math.round(finiteNonNeg(input.amountNpr));
  if (amountNpr <= 0) return ledger;
  const tx: EmergencyFundTransaction = {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `ef-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    type: input.type,
    amountNpr,
    originalAmount: input.originalAmount,
    originalCurrency: input.originalCurrency,
    date: input.date,
    note: input.note?.trim() ? input.note.trim().slice(0, 500) : undefined,
    createdAt: new Date().toISOString(),
    linkedSavingsTransactionId: input.linkedSavingsTransactionId,
    confirmed: true,
  };
  return {
    ...ledger,
    settings: { ...ledger.settings, lastUpdatedAt: new Date().toISOString() },
    transactions: [tx, ...ledger.transactions],
  };
}

export function updateEmergencySettings(
  ledger: EmergencyFundLedger,
  patch: Partial<EmergencyFundSettings>,
): EmergencyFundLedger {
  const merged = sanitizeSettings(
    { ...ledger.settings, ...patch, lastUpdatedAt: new Date().toISOString() },
    ledger.settings.openingBalanceNpr,
  );
  return { ...ledger, settings: merged };
}

export function syncReserveFromLedger(
  ledger: EmergencyFundLedger,
  linkedSavingsBalanceNpr = 0,
): number {
  return deriveEmergencyCashReserveFromLedger(ledger, linkedSavingsBalanceNpr);
}

export type GrowthSeriesPoint = {
  date: string;
  reserve: number | null;
  projection: number | null;
  label: string;
  kind: "actual" | "projection";
};

/** Actual history + optional future projection (dashed in UI). Never fabricates past balances. */
export function buildReserveGrowthSeries(
  ledger: EmergencyFundLedger,
  linkedSavingsBalanceNpr = 0,
  options: {
    targetNpr?: number | null;
    monthlyContributionNpr?: number | null;
    chartMonths?: number;
  } = {},
): GrowthSeriesPoint[] {
  const sorted = [...ledger.transactions]
    .filter((t) => t.confirmed !== false)
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));

  let running = finiteNonNeg(ledger.settings.openingBalanceNpr);
  const today = new Date().toISOString().slice(0, 10);
  const points: GrowthSeriesPoint[] = [
    {
      date: sorted[0]?.date ?? today,
      reserve: running,
      projection: null,
      label: "Opening",
      kind: "actual",
    },
  ];

  for (const tx of sorted) {
    if (tx.type === "contribution") running += tx.amountNpr;
    else running = Math.max(0, running - tx.amountNpr);
    points.push({
      date: tx.date,
      reserve: running,
      projection: null,
      label: tx.type === "contribution" ? "Contribution" : "Withdrawal",
      kind: "actual",
    });
  }

  let actual = points;
  if (ledger.settings.reserveMode === "linked") {
    actual = [
      {
        date: today,
        reserve: linkedSavingsBalanceNpr,
        projection: null,
        label: "Linked",
        kind: "actual",
      },
    ];
  } else if (ledger.settings.reserveMode === "hybrid") {
    actual = points.map((p) => ({
      ...p,
      reserve: (p.reserve ?? 0) + linkedSavingsBalanceNpr,
    }));
  }

  const current = actual[actual.length - 1]?.reserve ?? 0;
  const monthly = options.monthlyContributionNpr;
  const target = options.targetNpr;
  const months = Math.max(3, Math.min(24, options.chartMonths ?? 12));

  if (monthly != null && monthly > 0 && target != null && target > current) {
    // Bridge: last actual point also seeds projection line
    const bridged = actual.map((p) => ({ ...p, projection: p.reserve }));
    let proj = current;
    for (let i = 1; i <= months; i += 1) {
      proj = Math.min(target, proj + monthly);
      const d = new Date();
      d.setMonth(d.getMonth() + i);
      bridged.push({
        date: d.toISOString().slice(0, 10),
        reserve: null,
        projection: proj,
        label: `Proj M${i}`,
        kind: "projection",
      });
      if (proj >= target) break;
    }
    return bridged;
  }

  return actual;
}

export function reverseEmergencyTransaction(
  ledger: EmergencyFundLedger,
  transactionId: string,
): EmergencyFundLedger {
  const tx = ledger.transactions.find((t) => t.id === transactionId);
  if (!tx || tx.confirmed === false) return ledger;
  const reversalType = tx.type === "contribution" ? "withdrawal" : "contribution";
  const note = `Reversal of ${tx.id}${tx.note ? ` (${tx.note})` : ""}`;
  const nextTx: EmergencyFundTransaction = {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `ef-rev-${Date.now()}`,
    type: reversalType,
    amountNpr: tx.amountNpr,
    date: new Date().toISOString().slice(0, 10),
    note: note.slice(0, 500),
    createdAt: new Date().toISOString(),
    confirmed: true,
  };
  return {
    ...ledger,
    settings: { ...ledger.settings, lastUpdatedAt: new Date().toISOString() },
    transactions: [nextTx, ...ledger.transactions],
  };
}
