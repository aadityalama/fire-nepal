import type { EconomyFrequency, EconomyMetricKey } from "@/lib/economy/types";

export const METRIC_NAMES: Record<EconomyMetricKey, string> = {
  inflation: "Nepal Inflation",
  gdp: "GDP Growth",
  policy_rate: "NRB Policy Rate",
  fd_rates: "Commercial Bank Deposit Rate",
  usd_npr: "USD/NPR Exchange Rate",
  krw_npr: "KRW/NPR Exchange Rate",
  gold: "Gold Price",
  silver: "Silver Price",
  remittance: "Remittance",
  nepse: "NEPSE Index",
};

export const METRIC_FREQUENCY: Record<EconomyMetricKey, EconomyFrequency> = {
  usd_npr: "daily",
  krw_npr: "daily",
  gold: "daily",
  silver: "daily",
  nepse: "daily",
  policy_rate: "irregular",
  fd_rates: "monthly",
  inflation: "monthly",
  remittance: "monthly",
  gdp: "annual",
};

export const LIVE_CAPABLE: Record<EconomyMetricKey, boolean> = {
  usd_npr: true,
  krw_npr: true,
  gold: true,
  silver: true,
  nepse: true,
  policy_rate: false,
  fd_rates: false,
  inflation: false,
  remittance: false,
  gdp: false,
};

export const FRESHNESS_MAX_AGE_MS: Record<EconomyMetricKey, number> = {
  usd_npr: 36 * 60 * 60 * 1000,
  krw_npr: 36 * 60 * 60 * 1000,
  gold: 36 * 60 * 60 * 1000,
  silver: 36 * 60 * 60 * 1000,
  nepse: 36 * 60 * 60 * 1000,
  policy_rate: 120 * 24 * 60 * 60 * 1000,
  fd_rates: 45 * 24 * 60 * 60 * 1000,
  inflation: 45 * 24 * 60 * 60 * 1000,
  remittance: 45 * 24 * 60 * 60 * 1000,
  gdp: 400 * 24 * 60 * 60 * 1000,
};

export const REFRESH_INTERVAL_MS: Record<EconomyMetricKey, number> = {
  usd_npr: 6 * 60 * 60 * 1000,
  krw_npr: 6 * 60 * 60 * 1000,
  gold: 6 * 60 * 60 * 1000,
  silver: 6 * 60 * 60 * 1000,
  nepse: 6 * 60 * 60 * 1000,
  policy_rate: 24 * 60 * 60 * 1000,
  fd_rates: 24 * 60 * 60 * 1000,
  inflation: 24 * 60 * 60 * 1000,
  remittance: 24 * 60 * 60 * 1000,
  gdp: 7 * 24 * 60 * 60 * 1000,
};

export function isStale(
  updatedAt: string | null | undefined,
  key: EconomyMetricKey,
  now = Date.now(),
): boolean {
  if (!updatedAt) return true;
  const ts = Date.parse(updatedAt);
  if (!Number.isFinite(ts)) return true;
  return now - ts > FRESHNESS_MAX_AGE_MS[key];
}

export function nextRefreshAt(
  lastAttemptAt: string | null | undefined,
  key: EconomyMetricKey,
): string {
  const base =
    lastAttemptAt && Number.isFinite(Date.parse(lastAttemptAt))
      ? Date.parse(lastAttemptAt)
      : Date.now();
  return new Date(base + REFRESH_INTERVAL_MS[key]).toISOString();
}

export function shouldRefresh(
  lastAttemptAt: string | null | undefined,
  key: EconomyMetricKey,
  force = false,
  now = Date.now(),
): boolean {
  if (force) return true;
  if (!lastAttemptAt) return true;
  const ts = Date.parse(lastAttemptAt);
  if (!Number.isFinite(ts)) return true;
  return now - ts >= REFRESH_INTERVAL_MS[key];
}
