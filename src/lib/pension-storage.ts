import type { PensionDashboardState, SalarySlipRecord } from "@/lib/pension-types";
import { PENSION_STORAGE_KEY } from "@/lib/pension-types";

export function defaultPensionDashboardState(now = new Date()): PensionDashboardState {
  return {
    version: 1,
    profile: {
      joinDate: now.toISOString().slice(0, 10),
    },
    slips: [],
  };
}

const DEFAULT_STATE: PensionDashboardState = defaultPensionDashboardState();

function sanitizeSlip(raw: unknown): SalarySlipRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Partial<SalarySlipRecord>;
  if (typeof row.id !== "string" || typeof row.periodYm !== "string" || typeof row.uploadedAt !== "string") return null;
  if (!row.fields || typeof row.fields !== "object") return null;
  return {
    id: row.id,
    uploadedAt: row.uploadedAt,
    periodYm: row.periodYm,
    rawOcrText: typeof row.rawOcrText === "string" ? row.rawOcrText : undefined,
    fields: row.fields,
    note: typeof row.note === "string" ? row.note : undefined,
  };
}

export function sanitizePensionState(raw: unknown): PensionDashboardState {
  if (!raw || typeof raw !== "object") return DEFAULT_STATE;
  const parsed = raw as Partial<PensionDashboardState>;
  if (parsed.version !== 1) return DEFAULT_STATE;
  const slips: SalarySlipRecord[] = [];
  if (Array.isArray(parsed.slips)) {
    for (const slip of parsed.slips) {
      const sanitized = sanitizeSlip(slip);
      if (sanitized) slips.push(sanitized);
    }
  }
  return {
    version: 1,
    profile: { ...DEFAULT_STATE.profile, ...(parsed.profile ?? {}) },
    slips,
  };
}

export function clearPensionLocalCache(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(PENSION_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function loadPensionState(): PensionDashboardState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = window.localStorage.getItem(PENSION_STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    return sanitizePensionState(JSON.parse(raw) as unknown);
  } catch {
    return DEFAULT_STATE;
  }
}

export function savePensionState(state: PensionDashboardState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PENSION_STORAGE_KEY, JSON.stringify(sanitizePensionState(state)));
}
