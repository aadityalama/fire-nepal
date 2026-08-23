import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/supabase-database";
import {
  LIVE_CAPABLE,
  METRIC_NAMES,
  isStale,
  nextRefreshAt,
} from "@/lib/economy/freshness";
import type {
  EconomyMetric,
  EconomyMetricKey,
  EconomySourceResult,
  EconomyStatus,
} from "@/lib/economy/types";

export type EconomyIndicatorRow = {
  id: string;
  metric_key: EconomyMetricKey;
  metric_name: string;
  value: number;
  display_value: string;
  unit: string;
  currency: string | null;
  source: string;
  source_url: string;
  period: string | null;
  published_at: string | null;
  observed_at: string;
  frequency: string;
  status: EconomyStatus;
  value_kind: string;
  change_value: number | null;
  change_percent: number | null;
  change_label: string | null;
  tone: string;
  raw_data: Record<string, unknown> | null;
  fetch_error: string | null;
  last_attempt_at: string | null;
  last_success_at: string | null;
  created_at: string;
};

function defaultDisplay(metric: EconomySourceResult): string {
  if (metric.displayValue) return metric.displayValue;
  if (metric.unit === "%") {
    return `${metric.value.toLocaleString("en-US", { maximumFractionDigits: 2 })}%`;
  }
  return metric.value.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

function resolveStatus(
  metric: EconomySourceResult,
  opts: { fromCache: boolean; stale: boolean },
): EconomyStatus {
  if (opts.stale) return "stale";
  if (opts.fromCache) return "cached";
  if (metric.liveCapable && LIVE_CAPABLE[metric.key]) return "live";
  return "official";
}

export function rowToMetric(row: EconomyIndicatorRow): EconomyMetric {
  const successAt = row.last_success_at ?? row.observed_at;
  const stale = isStale(successAt, row.metric_key);
  let status = row.status;
  if (stale && status !== "unavailable") status = "stale";

  return {
    key: row.metric_key,
    name: row.metric_name || METRIC_NAMES[row.metric_key],
    value: Number(row.value),
    displayValue: row.display_value,
    unit: row.unit,
    currency: row.currency,
    source: row.source,
    sourceUrl: row.source_url,
    period: row.period,
    publishedAt: row.published_at,
    updatedAt: successAt,
    lastAttemptAt: row.last_attempt_at,
    frequency: row.frequency as EconomyMetric["frequency"],
    status,
    valueKind: row.value_kind as EconomyMetric["valueKind"],
    change: row.change_value,
    changePercent: row.change_percent,
    changeLabel: row.change_label,
    tone: (row.tone as EconomyMetric["tone"]) || "neutral",
    stale,
    staleReason: stale
      ? "Data may be outdated — newer official publication may exist or refresh window exceeded"
      : null,
    errorMessage: row.fetch_error,
    nextRefreshAt: nextRefreshAt(row.last_attempt_at, row.metric_key),
    raw: row.raw_data,
  };
}

export async function loadLatestEconomyMetrics(): Promise<Map<EconomyMetricKey, EconomyMetric>> {
  const sb = createSupabaseServiceRoleClient();
  const map = new Map<EconomyMetricKey, EconomyMetric>();
  if (!sb) return map;

  const { data, error } = await sb
    .from("economic_indicators")
    .select("*")
    .order("observed_at", { ascending: false })
    .limit(200);

  if (error || !data) {
    console.error("[economy-store] loadLatest failed", error?.message);
    return map;
  }

  for (const row of data as EconomyIndicatorRow[]) {
    if (map.has(row.metric_key)) continue;
    map.set(row.metric_key, rowToMetric(row));
  }
  return map;
}

export async function loadEconomyHistory(
  key: EconomyMetricKey,
  limit = 24,
): Promise<EconomyMetric[]> {
  const sb = createSupabaseServiceRoleClient();
  if (!sb) return [];
  const { data, error } = await sb
    .from("economic_indicators")
    .select("*")
    .eq("metric_key", key)
    .order("observed_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return (data as EconomyIndicatorRow[]).map(rowToMetric);
}

export async function markEconomyAttempt(
  key: EconomyMetricKey,
  errorMessage: string | null,
): Promise<void> {
  const sb = createSupabaseServiceRoleClient();
  if (!sb) return;
  const now = new Date().toISOString();
  const { data: latest } = await sb
    .from("economic_indicators")
    .select("id")
    .eq("metric_key", key)
    .order("observed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latest?.id) {
    await sb
      .from("economic_indicators")
      .update({ last_attempt_at: now, fetch_error: errorMessage })
      .eq("id", latest.id);
  }
}

export async function persistEconomyMetric(
  metric: EconomySourceResult,
  opts?: { fromCache?: boolean },
): Promise<"inserted" | "updated" | "skipped"> {
  const sb = createSupabaseServiceRoleClient();
  if (!sb) return "skipped";

  const now = new Date().toISOString();
  const fromCache = opts?.fromCache === true;
  const stale = isStale(metric.publishedAt ?? now, metric.key);
  const status = resolveStatus(metric, { fromCache, stale });
  const displayValue = defaultDisplay(metric);
  const observedAt = metric.publishedAt ?? now;

  const { data: latest } = await sb
    .from("economic_indicators")
    .select("*")
    .eq("metric_key", metric.key)
    .order("observed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const latestRow = latest as EconomyIndicatorRow | null;
  const sameValue =
    latestRow &&
    Number(latestRow.value) === metric.value &&
    (latestRow.period ?? null) === (metric.period ?? null);

  if (sameValue && latestRow) {
    const { error } = await sb
      .from("economic_indicators")
      .update({
        display_value: displayValue,
        source: metric.source,
        source_url: metric.sourceUrl,
        published_at: metric.publishedAt ?? latestRow.published_at,
        status,
        change_value: metric.change ?? latestRow.change_value,
        change_percent: metric.changePercent ?? latestRow.change_percent,
        change_label: metric.changeLabel ?? latestRow.change_label,
        tone: metric.tone ?? latestRow.tone,
        raw_data: (metric.raw ?? latestRow.raw_data) as Json,
        fetch_error: null,
        last_attempt_at: now,
        last_success_at: now,
      })
      .eq("id", latestRow.id);
    if (error) {
      console.error("[economy-store] update failed", error.message);
      return "skipped";
    }
    return "updated";
  }

  const { error } = await sb.from("economic_indicators").insert({
    metric_key: metric.key,
    metric_name: METRIC_NAMES[metric.key],
    value: metric.value,
    display_value: displayValue,
    unit: metric.unit,
    currency: metric.currency ?? null,
    source: metric.source,
    source_url: metric.sourceUrl,
    period: metric.period ?? null,
    published_at: metric.publishedAt ?? null,
    observed_at: observedAt,
    frequency: metric.frequency,
    status,
    value_kind: metric.valueKind ?? "actual",
    change_value: metric.change ?? null,
    change_percent: metric.changePercent ?? null,
    change_label: metric.changeLabel ?? null,
    tone: metric.tone ?? "neutral",
    raw_data: (metric.raw ?? null) as Json,
    fetch_error: null,
    last_attempt_at: now,
    last_success_at: now,
  });

  if (error) {
    console.error("[economy-store] insert failed", error.message);
    return "skipped";
  }
  return "inserted";
}

export async function logEconomyRefreshRun(input: {
  status: "ok" | "partial" | "error";
  items: number;
  message: string;
  startedAt: string;
  finishedAt: string;
  details?: Record<string, unknown>;
}) {
  const sb = createSupabaseServiceRoleClient();
  if (!sb) return;
  await sb.from("economic_refresh_runs").insert({
    status: input.status,
    items: input.items,
    message: input.message,
    started_at: input.startedAt,
    finished_at: input.finishedAt,
    details: (input.details ?? null) as Json,
  });
  await sb.from("system_health").upsert(
    {
      id: "nepal_economy_refresh",
      label: "Nepal Economy data refresh",
      last_run_at: input.finishedAt,
      last_status: input.status,
      metadata: {
        items: input.items,
        message: input.message,
        details: (input.details ?? null) as Json,
      },
      updated_at: input.finishedAt,
    },
    { onConflict: "id" },
  );
}
