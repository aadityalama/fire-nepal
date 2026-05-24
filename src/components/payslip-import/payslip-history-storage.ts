import type { PayslipHistoryEntry, PayslipHistoryState } from "@/components/payslip-import/types";
import { PAYSLIP_HISTORY_VERSION } from "@/components/payslip-import/types";

export const PAYSLIP_HISTORY_STORAGE_KEY = "fire-nepal-payslip-history-v1";

/** Fired when payslip history is updated (cross-tab + panels). */
export const PAYSLIP_HISTORY_SYNC_EVENT = "fire-nepal-payslip-history-sync";

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `psl_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function defaultPayslipHistoryState(): PayslipHistoryState {
  return { version: PAYSLIP_HISTORY_VERSION, entries: [] };
}

export function sanitizePayslipHistoryState(raw: unknown): PayslipHistoryState {
  if (!raw || typeof raw !== "object") return defaultPayslipHistoryState();
  const o = raw as Partial<PayslipHistoryState>;
  if (o.version !== PAYSLIP_HISTORY_VERSION || !Array.isArray(o.entries)) {
    return defaultPayslipHistoryState();
  }
  const entries: PayslipHistoryEntry[] = [];
  for (const e of o.entries) {
    if (!e || typeof e !== "object") continue;
    const row = e as Partial<PayslipHistoryEntry>;
    if (typeof row.id !== "string" || typeof row.importedAt !== "string") continue;
    if (!row.ocr || typeof row.ocr !== "object" || !row.parsed || typeof row.parsed !== "object") continue;
    entries.push({
      id: row.id,
      importedAt: row.importedAt,
      ocr: row.ocr as PayslipHistoryEntry["ocr"],
      parsed: row.parsed as PayslipHistoryEntry["parsed"],
      appliedSalaryNpr: typeof row.appliedSalaryNpr === "number" ? row.appliedSalaryNpr : null,
      appliedOvertimeNpr: typeof row.appliedOvertimeNpr === "number" ? row.appliedOvertimeNpr : null,
      krwPerNprUsed: typeof row.krwPerNprUsed === "number" ? row.krwPerNprUsed : null,
      applied: Boolean(row.applied),
    });
  }
  return { version: PAYSLIP_HISTORY_VERSION, entries };
}

export function loadPayslipHistoryState(): PayslipHistoryState {
  if (typeof window === "undefined") return defaultPayslipHistoryState();
  try {
    const s = window.localStorage.getItem(PAYSLIP_HISTORY_STORAGE_KEY);
    if (!s) return defaultPayslipHistoryState();
    return sanitizePayslipHistoryState(JSON.parse(s) as unknown);
  } catch {
    return defaultPayslipHistoryState();
  }
}

export function savePayslipHistoryState(state: PayslipHistoryState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PAYSLIP_HISTORY_STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new Event(PAYSLIP_HISTORY_SYNC_EVENT));
  } catch {
    /* quota */
  }
}

export function appendPayslipHistoryEntry(entry: Omit<PayslipHistoryEntry, "id" | "importedAt"> & { id?: string }): PayslipHistoryEntry {
  const full: PayslipHistoryEntry = {
    id: entry.id ?? newId(),
    importedAt: new Date().toISOString(),
    ocr: entry.ocr,
    parsed: entry.parsed,
    appliedSalaryNpr: entry.appliedSalaryNpr ?? null,
    appliedOvertimeNpr: entry.appliedOvertimeNpr ?? null,
    krwPerNprUsed: entry.krwPerNprUsed ?? null,
    applied: entry.applied ?? false,
  };
  const cur = loadPayslipHistoryState();
  savePayslipHistoryState({ ...cur, entries: [full, ...cur.entries].slice(0, 36) });
  return full;
}

export function markPayslipEntryApplied(
  id: string,
  patch: { appliedSalaryNpr: number; appliedOvertimeNpr: number; krwPerNprUsed: number },
): void {
  const cur = loadPayslipHistoryState();
  const entries = cur.entries.map((e) =>
    e.id === id
      ? {
          ...e,
          applied: true,
          appliedSalaryNpr: patch.appliedSalaryNpr,
          appliedOvertimeNpr: patch.appliedOvertimeNpr,
          krwPerNprUsed: patch.krwPerNprUsed,
        }
      : e,
  );
  savePayslipHistoryState({ ...cur, entries });
}
