/**
 * Emergency Fund 3.0 settings document — cloud module snapshot + guest localStorage.
 */

import type {
  EmergencyFundSettingsState,
  EmergencyFundTransaction,
  FundingMethod,
  ProtectionGuidanceAnswers,
  ProtectionMode,
  YearlyAllocationDecision,
  YearlyAllocationResolution,
} from "@/lib/emergency-fund/types";
import { DEFAULT_PROTECTION_MONTHS } from "@/lib/emergency-fund/types";
import { finiteNonNeg } from "@/lib/emergency-fund/math";

export const EMERGENCY_FUND_SETTINGS_STORAGE_KEY = "fire-nepal-emergency-fund-settings-v1";

export function emergencyFundSettingsStorageKey(userId?: string | null): string {
  if (userId) return `${EMERGENCY_FUND_SETTINGS_STORAGE_KEY}:user:${userId}`;
  return EMERGENCY_FUND_SETTINGS_STORAGE_KEY;
}

export function defaultEmergencyFundSettings(): EmergencyFundSettingsState {
  return {
    version: 1,
    protectionMode: "full_lifestyle",
    protectionMonths: DEFAULT_PROTECTION_MONTHS,
    useCustomProtectionMonths: false,
    essentialRecordIds: [],
    excludedRecordIds: [],
    importedPlannedContributionFromBudget: false,
    yearlyAllocationDecisions: {},
    fundingMethod: null,
    plannedMonthlyContributionNpr: null,
    deadlineMonths: null,
    useCustomDeadlineMonths: false,
    linkedSavingsGoalIds: [],
    transactions: [],
    openingReserveNpr: null,
    guidance: null,
    lastSuccessfulSyncAt: null,
    previousEffectiveMonthlyBudgetNpr: null,
    lastSeenEffectiveMonthlyBudgetNpr: null,
    lastSeenBudgetPlannerSignature: null,
  };
}

function sanitizeMode(raw: unknown): ProtectionMode {
  return raw === "essential_survival" ? "essential_survival" : "full_lifestyle";
}

function sanitizeFundingMethod(raw: unknown): FundingMethod {
  if (raw === "monthly_contribution" || raw === "target_deadline") return raw;
  return null;
}

function sanitizeTransaction(raw: unknown): EmergencyFundTransaction | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Partial<EmergencyFundTransaction>;
  if (typeof o.id !== "string" || !o.id.trim()) return null;
  if (o.type !== "contribution" && o.type !== "withdrawal") return null;
  const amount = finiteNonNeg(typeof o.amountNpr === "number" ? o.amountNpr : Number.NaN);
  if (amount <= 0) return null;
  if (typeof o.date !== "string" || !/^\d{4}-\d{2}-\d{2}/.test(o.date)) return null;
  return {
    id: o.id.trim(),
    type: o.type,
    amountNpr: amount,
    date: o.date.slice(0, 10),
    note: typeof o.note === "string" ? o.note.trim().slice(0, 500) : "",
    createdAt: typeof o.createdAt === "string" ? o.createdAt : new Date().toISOString(),
  };
}

function sanitizeGuidance(raw: unknown): ProtectionGuidanceAnswers | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Partial<ProtectionGuidanceAnswers>;
  const employmentStability =
    o.employmentStability === "stable" || o.employmentStability === "unstable"
      ? o.employmentStability
      : "unknown";
  const householdIncomeSources =
    o.householdIncomeSources === "single" || o.householdIncomeSources === "multiple"
      ? o.householdIncomeSources
      : "unknown";
  const dependents =
    typeof o.dependents === "number" && Number.isFinite(o.dependents)
      ? Math.max(0, Math.min(20, Math.round(o.dependents)))
      : 0;
  return {
    employmentStability,
    householdIncomeSources,
    dependents,
    overseasEmployment: typeof o.overseasEmployment === "boolean" ? o.overseasEmployment : null,
    significantRecurringObligations:
      typeof o.significantRecurringObligations === "boolean"
        ? o.significantRecurringObligations
        : null,
  };
}

function sanitizeYearlyResolution(raw: unknown): YearlyAllocationResolution | null {
  if (raw === "separate" || raw === "already_included" || raw === "linked") return raw;
  return null;
}

function sanitizeYearlyAllocationDecisions(raw: unknown): Record<string, YearlyAllocationDecision> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, YearlyAllocationDecision> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!key.trim() || !value || typeof value !== "object") continue;
    const row = value as Partial<YearlyAllocationDecision>;
    const resolution = sanitizeYearlyResolution(row.resolution);
    if (!resolution) continue;
    out[key.trim()] = {
      resolution,
      linkedMonthlyRecordId:
        typeof row.linkedMonthlyRecordId === "string" && row.linkedMonthlyRecordId.trim()
          ? row.linkedMonthlyRecordId.trim()
          : null,
      updatedAt: typeof row.updatedAt === "string" ? row.updatedAt : new Date().toISOString(),
    };
  }
  return out;
}

export function sanitizeEmergencyFundSettings(raw: unknown): EmergencyFundSettingsState {
  const defaults = defaultEmergencyFundSettings();
  if (!raw || typeof raw !== "object") return defaults;
  const o = raw as Partial<EmergencyFundSettingsState>;

  const protectionMonthsRaw =
    typeof o.protectionMonths === "number" && Number.isFinite(o.protectionMonths)
      ? Math.round(o.protectionMonths)
      : DEFAULT_PROTECTION_MONTHS;
  const protectionMonths = Math.max(1, Math.min(60, protectionMonthsRaw));

  const essentialRecordIds = Array.isArray(o.essentialRecordIds)
    ? o.essentialRecordIds.filter((id): id is string => typeof id === "string" && id.trim().length > 0)
    : [];

  const excludedRecordIds = Array.isArray(o.excludedRecordIds)
    ? o.excludedRecordIds.filter((id): id is string => typeof id === "string" && id.trim().length > 0)
    : [];

  const linkedSavingsGoalIds = Array.isArray(o.linkedSavingsGoalIds)
    ? [...new Set(o.linkedSavingsGoalIds.filter((id): id is string => typeof id === "string" && id.trim().length > 0))]
    : [];

  const transactions = Array.isArray(o.transactions)
    ? o.transactions.map(sanitizeTransaction).filter((tx): tx is EmergencyFundTransaction => tx != null)
    : [];

  let plannedMonthlyContributionNpr: number | null = null;
  if (
    typeof o.plannedMonthlyContributionNpr === "number" &&
    Number.isFinite(o.plannedMonthlyContributionNpr) &&
    o.plannedMonthlyContributionNpr > 0
  ) {
    plannedMonthlyContributionNpr = o.plannedMonthlyContributionNpr;
  }

  let deadlineMonths: number | null = null;
  if (typeof o.deadlineMonths === "number" && Number.isFinite(o.deadlineMonths) && o.deadlineMonths > 0) {
    deadlineMonths = Math.max(1, Math.min(120, Math.round(o.deadlineMonths)));
  }

  let openingReserveNpr: number | null = null;
  if (typeof o.openingReserveNpr === "number" && Number.isFinite(o.openingReserveNpr) && o.openingReserveNpr >= 0) {
    openingReserveNpr = o.openingReserveNpr;
  }

  return {
    version: 1,
    protectionMode: sanitizeMode(o.protectionMode),
    protectionMonths,
    useCustomProtectionMonths: Boolean(o.useCustomProtectionMonths),
    essentialRecordIds,
    excludedRecordIds,
    importedPlannedContributionFromBudget: Boolean(o.importedPlannedContributionFromBudget),
    yearlyAllocationDecisions: sanitizeYearlyAllocationDecisions(o.yearlyAllocationDecisions),
    fundingMethod: sanitizeFundingMethod(o.fundingMethod),
    plannedMonthlyContributionNpr,
    deadlineMonths,
    useCustomDeadlineMonths: Boolean(o.useCustomDeadlineMonths),
    linkedSavingsGoalIds,
    transactions,
    openingReserveNpr,
    guidance: sanitizeGuidance(o.guidance),
    lastSuccessfulSyncAt:
      typeof o.lastSuccessfulSyncAt === "string" && o.lastSuccessfulSyncAt.trim()
        ? o.lastSuccessfulSyncAt
        : null,
    previousEffectiveMonthlyBudgetNpr:
      typeof o.previousEffectiveMonthlyBudgetNpr === "number" &&
      Number.isFinite(o.previousEffectiveMonthlyBudgetNpr) &&
      o.previousEffectiveMonthlyBudgetNpr >= 0
        ? o.previousEffectiveMonthlyBudgetNpr
        : null,
    lastSeenEffectiveMonthlyBudgetNpr:
      typeof o.lastSeenEffectiveMonthlyBudgetNpr === "number" &&
      Number.isFinite(o.lastSeenEffectiveMonthlyBudgetNpr) &&
      o.lastSeenEffectiveMonthlyBudgetNpr >= 0
        ? o.lastSeenEffectiveMonthlyBudgetNpr
        : null,
    lastSeenBudgetPlannerSignature:
      typeof o.lastSeenBudgetPlannerSignature === "string" && o.lastSeenBudgetPlannerSignature.trim()
        ? o.lastSeenBudgetPlannerSignature
        : null,
  };
}

export function loadEmergencyFundSettingsLocal(userId?: string | null): EmergencyFundSettingsState {
  if (typeof window === "undefined") return defaultEmergencyFundSettings();
  try {
    const raw = window.localStorage.getItem(emergencyFundSettingsStorageKey(userId));
    if (!raw) return defaultEmergencyFundSettings();
    return sanitizeEmergencyFundSettings(JSON.parse(raw) as unknown);
  } catch {
    return defaultEmergencyFundSettings();
  }
}

export function saveEmergencyFundSettingsLocal(
  state: EmergencyFundSettingsState,
  userId?: string | null,
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      emergencyFundSettingsStorageKey(userId),
      JSON.stringify(sanitizeEmergencyFundSettings(state)),
    );
  } catch {
    /* quota / private mode */
  }
}

export function clearEmergencyFundSettingsLocal(userId?: string | null): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(emergencyFundSettingsStorageKey(userId));
  } catch {
    /* ignore */
  }
}

export function createTransactionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `ef-tx-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Optional guidance copy — never auto-changes the selected period. */
export function buildProtectionPeriodGuidance(
  guidance: ProtectionGuidanceAnswers | null,
): string | null {
  if (!guidance) return null;
  const reasons: string[] = [];
  if (guidance.employmentStability === "unstable") {
    reasons.push("less stable employment may justify a longer protection period");
  }
  if (guidance.householdIncomeSources === "single") {
    reasons.push("a single household income source usually benefits from more months of cover");
  }
  if (guidance.dependents > 0) {
    reasons.push(`${guidance.dependents} dependent${guidance.dependents === 1 ? "" : "s"} increase family obligations`);
  }
  if (guidance.overseasEmployment === true) {
    reasons.push("overseas employment can involve higher job or relocation risk");
  }
  if (guidance.significantRecurringObligations === true) {
    reasons.push("significant recurring obligations raise near-term cash needs");
  }
  if (reasons.length === 0) return null;
  return `Based on your answers, a longer protection period may be appropriate because ${reasons.join("; ")}. This is general guidance only — your selected period was not changed.`;
}
