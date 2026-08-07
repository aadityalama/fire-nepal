"use client";

import { useCallback, useMemo } from "react";
import type { PayslipHistoryEntry, PayslipHistoryState } from "@/components/payslip-import/types";
import { PAYSLIP_HISTORY_VERSION } from "@/components/payslip-import/types";
import {
  defaultPayslipHistoryState,
  PAYSLIP_HISTORY_STORAGE_KEY,
  PAYSLIP_HISTORY_SYNC_EVENT,
  sanitizePayslipHistoryState,
} from "@/components/payslip-import/payslip-history-storage";
import { useCloudDocumentState } from "@/hooks/useCloudDocumentState";

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `psl_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function loadGuestPayslipHistoryState(): PayslipHistoryState {
  if (typeof window === "undefined") return defaultPayslipHistoryState();
  try {
    const s = window.localStorage.getItem(PAYSLIP_HISTORY_STORAGE_KEY);
    if (!s) return defaultPayslipHistoryState();
    return sanitizePayslipHistoryState(JSON.parse(s) as unknown);
  } catch {
    return defaultPayslipHistoryState();
  }
}

export function saveGuestPayslipHistoryState(state: PayslipHistoryState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PAYSLIP_HISTORY_STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new Event(PAYSLIP_HISTORY_SYNC_EVENT));
  } catch {
    /* quota */
  }
}

export function clearPayslipHistoryLocalCache(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(PAYSLIP_HISTORY_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function usePayslipHistoryState() {
  const { state, setState, hydrated, cloudReady, persistNow } = useCloudDocumentState({
    moduleKey: "payslip_history",
    getDefault: defaultPayslipHistoryState,
    sanitize: sanitizePayslipHistoryState,
    loadLocal: loadGuestPayslipHistoryState,
    saveLocal: saveGuestPayslipHistoryState,
    clearLocal: clearPayslipHistoryLocalCache,
  });

  const appendEntry = useCallback(
    (entry: Omit<PayslipHistoryEntry, "id" | "importedAt"> & { id?: string }) => {
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
      let created = full;
      setState((cur) => {
        created = full;
        return { version: PAYSLIP_HISTORY_VERSION, entries: [full, ...cur.entries].slice(0, 36) };
      });
      return created;
    },
    [setState],
  );

  const markEntryApplied = useCallback(
    (
      id: string,
      patch: { appliedSalaryNpr: number; appliedOvertimeNpr: number; krwPerNprUsed: number },
    ) => {
      setState((cur) => ({
        ...cur,
        entries: cur.entries.map((e) =>
          e.id === id
            ? {
                ...e,
                applied: true,
                appliedSalaryNpr: patch.appliedSalaryNpr,
                appliedOvertimeNpr: patch.appliedOvertimeNpr,
                krwPerNprUsed: patch.krwPerNprUsed,
              }
            : e,
        ),
      }));
    },
    [setState],
  );

  return useMemo(
    () => ({
      state,
      entries: state.entries,
      hydrated,
      cloudReady,
      setState,
      appendEntry,
      markEntryApplied,
      persistNow,
    }),
    [state, hydrated, cloudReady, setState, appendEntry, markEntryApplied, persistNow],
  );
}
