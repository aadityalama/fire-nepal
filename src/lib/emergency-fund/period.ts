/**
 * Smart calculation period helpers for Emergency Fund.
 */

import { currentMonthKey } from "@/components/cashflow/cashflow-metrics";

export type EmergencyPeriodMode =
  | "latest_completed"
  | "current_partial"
  | "last_3_completed"
  | "last_6_completed"
  | "custom";

export const EMERGENCY_PERIOD_MODE_OPTIONS: Array<{
  id: EmergencyPeriodMode;
  labelEn: string;
}> = [
  { id: "latest_completed", labelEn: "Latest completed month" },
  { id: "current_partial", labelEn: "Current month (partial)" },
  { id: "last_3_completed", labelEn: "Last 3 completed months" },
  { id: "last_6_completed", labelEn: "Last 6 completed months" },
  { id: "custom", labelEn: "Custom period" },
];

export function monthKeyFromDate(d: Date): string {
  return currentMonthKey(d);
}

export function shiftMonthKey(monthKey: string, delta: number): string {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(y!, (m! - 1) + delta, 1);
  return monthKeyFromDate(d);
}

export function formatMonthLabel(monthKey: string, locale = "en-US"): string {
  if (!/^\d{4}-\d{2}$/.test(monthKey)) return monthKey;
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(y!, m! - 1, 1);
  return d.toLocaleDateString(locale, { month: "long", year: "numeric" });
}

export function pluralMonths(n: number, unit = "month"): string {
  const rounded = Math.round(n * 10) / 10;
  const label = Number.isInteger(rounded) ? `${rounded}` : rounded.toFixed(1);
  return `${label} ${unit}${rounded === 1 ? "" : "s"}`;
}

/**
 * Resolve which month keys participate in income/expense aggregation.
 * Default: latest completed month (reliable recent completed period).
 */
export function resolvePeriodMonthKeys(
  mode: EmergencyPeriodMode,
  options: {
    now?: Date;
    customStartMonth?: string;
    customEndMonth?: string;
  } = {},
): {
  monthKeys: string[];
  primaryMonthKey: string;
  includesPartialCurrent: boolean;
  label: string;
} {
  const now = options.now ?? new Date();
  const current = monthKeyFromDate(now);
  const latestCompleted = shiftMonthKey(current, -1);

  if (mode === "current_partial") {
    return {
      monthKeys: [current],
      primaryMonthKey: current,
      includesPartialCurrent: true,
      label: `${formatMonthLabel(current)} (partial)`,
    };
  }

  if (mode === "last_3_completed") {
    const keys = [0, 1, 2].map((i) => shiftMonthKey(latestCompleted, -i));
    return {
      monthKeys: keys,
      primaryMonthKey: latestCompleted,
      includesPartialCurrent: false,
      label: `${formatMonthLabel(keys[keys.length - 1]!)} → ${formatMonthLabel(keys[0]!)}`,
    };
  }

  if (mode === "last_6_completed") {
    const keys = [0, 1, 2, 3, 4, 5].map((i) => shiftMonthKey(latestCompleted, -i));
    return {
      monthKeys: keys,
      primaryMonthKey: latestCompleted,
      includesPartialCurrent: false,
      label: `${formatMonthLabel(keys[keys.length - 1]!)} → ${formatMonthLabel(keys[0]!)}`,
    };
  }

  if (mode === "custom" && options.customStartMonth && options.customEndMonth) {
    const start = options.customStartMonth;
    const end = options.customEndMonth;
    const keys: string[] = [];
    let cursor = start;
    // Cap at 24 months to avoid runaway loops
    for (let i = 0; i < 24; i += 1) {
      keys.push(cursor);
      if (cursor === end) break;
      cursor = shiftMonthKey(cursor, 1);
      if (cursor > end && keys[keys.length - 1] !== end) {
        // if start > end, just use start
        break;
      }
    }
    const ordered = keys[0]! <= keys[keys.length - 1]! ? [...keys].reverse() : keys;
    return {
      monthKeys: ordered,
      primaryMonthKey: ordered[0]!,
      includesPartialCurrent: ordered.includes(current),
      label:
        ordered.length === 1
          ? formatMonthLabel(ordered[0]!)
          : `${formatMonthLabel(ordered[ordered.length - 1]!)} → ${formatMonthLabel(ordered[0]!)}`,
    };
  }

  // latest_completed (default)
  return {
    monthKeys: [latestCompleted],
    primaryMonthKey: latestCompleted,
    includesPartialCurrent: false,
    label: formatMonthLabel(latestCompleted),
  };
}
