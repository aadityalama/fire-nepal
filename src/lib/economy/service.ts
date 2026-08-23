import { LIVE_CAPABLE, METRIC_NAMES, shouldRefresh } from "@/lib/economy/freshness";
import {
  loadEconomyHistory,
  loadLatestEconomyMetrics,
  logEconomyRefreshRun,
  markEconomyAttempt,
  persistEconomyMetric,
} from "@/lib/economy/store";
import { fetchNrbForexMetrics } from "@/lib/economy/sources/forex";
import { fetchWorldBankGdp } from "@/lib/economy/sources/gdp";
import { fetchFenegosidaMetalMetrics } from "@/lib/economy/sources/metals";
import { fetchNepseIndexMetric } from "@/lib/economy/sources/nepse";
import { fetchNrbMacroMetrics } from "@/lib/economy/sources/nrb-macro";
import { fetchNrbPolicyRate } from "@/lib/economy/sources/nrb-policy";
import {
  ALL_ECONOMY_METRIC_KEYS,
  type EconomyDebugSnapshot,
  type EconomyFetchOutcome,
  type EconomyMetric,
  type EconomyMetricKey,
  type EconomyRefreshItemResult,
  type EconomyRefreshReport,
} from "@/lib/economy/types";

async function collectOutcomes(): Promise<EconomyFetchOutcome[]> {
  const [forex, gdp, metals, nepse, macro, policy] = await Promise.all([
    fetchNrbForexMetrics(),
    fetchWorldBankGdp(),
    fetchFenegosidaMetalMetrics(),
    fetchNepseIndexMetric(),
    fetchNrbMacroMetrics(),
    fetchNrbPolicyRate(),
  ]);
  return [...forex, gdp, ...metals, nepse, ...macro, policy];
}

function indexOutcomes(outcomes: EconomyFetchOutcome[]) {
  const map = new Map<EconomyMetricKey, EconomyFetchOutcome>();
  for (const outcome of outcomes) {
    const key = outcome.ok ? outcome.metric.key : outcome.key;
    const existing = map.get(key);
    if (existing?.ok) continue;
    map.set(key, outcome);
  }
  return map;
}

export async function refreshEconomyMetrics(options?: {
  force?: boolean;
  keys?: EconomyMetricKey[];
}): Promise<EconomyRefreshReport> {
  const startedAt = new Date().toISOString();
  const force = options?.force === true;
  const wanted = new Set(options?.keys?.length ? options.keys : ALL_ECONOMY_METRIC_KEYS);
  const items: EconomyRefreshItemResult[] = [];
  const errors: string[] = [];

  const existing = await loadLatestEconomyMetrics();
  const eligible = [...wanted].filter((key) =>
    shouldRefresh(existing.get(key)?.lastAttemptAt ?? null, key, force),
  );

  for (const key of wanted) {
    if (!eligible.includes(key)) {
      const current = existing.get(key);
      items.push({
        key,
        status: "skipped",
        message: "Refresh interval not elapsed",
        value: current?.value,
        sourceUrl: current?.sourceUrl,
      });
    }
  }

  if (eligible.length === 0) {
    return { startedAt, finishedAt: new Date().toISOString(), ok: true, items, errors };
  }

  const outcomes = indexOutcomes(await collectOutcomes());

  for (const key of eligible) {
    const outcome = outcomes.get(key);
    if (!outcome) {
      await markEconomyAttempt(key, "No source adapter returned this metric");
      errors.push(`${key}: no source adapter result`);
      items.push({ key, status: "failed", message: "No source adapter result" });
      continue;
    }

    if (outcome.ok) {
      const persistStatus = await persistEconomyMetric(outcome.metric);
      items.push({
        key,
        status: persistStatus === "inserted" || persistStatus === "updated" ? "updated" : "unchanged",
        message: `Fetched via ${outcome.via} (${persistStatus})`,
        value: outcome.metric.value,
        sourceUrl: outcome.metric.sourceUrl,
      });
      continue;
    }

    await markEconomyAttempt(key, outcome.error);
    const cached = existing.get(key);
    if (cached) {
      items.push({
        key,
        status: "cached_fallback",
        message: `Source failed — using last verified value. ${outcome.error}`,
        value: cached.value,
        sourceUrl: cached.sourceUrl,
      });
      errors.push(`${key}: ${outcome.error} (served cached)`);
    } else {
      items.push({ key, status: "failed", message: outcome.error });
      errors.push(`${key}: ${outcome.error}`);
    }
  }

  const finishedAt = new Date().toISOString();
  const failed = items.filter((i) => i.status === "failed").length;
  const partial =
    items.some((i) => i.status === "cached_fallback") || (failed > 0 && failed < eligible.length);
  const runStatus = failed === eligible.length ? "error" : partial ? "partial" : "ok";

  await logEconomyRefreshRun({
    status: runStatus,
    items: items.filter((i) => i.status === "updated" || i.status === "unchanged").length,
    message: `Refreshed ${eligible.length} eligible metric(s)`,
    startedAt,
    finishedAt,
    details: { items, errors },
  });

  return { startedAt, finishedAt, ok: runStatus !== "error", items, errors };
}

/**
 * Read path: database first, optional live fill for missing keys.
 * Never invents numbers.
 */
export async function getEconomyMetrics(options?: {
  allowLiveFill?: boolean;
}): Promise<{
  metrics: EconomyMetric[];
  source: "database" | "live" | "mixed" | "empty";
}> {
  const allowLiveFill = options?.allowLiveFill !== false;
  const fromDb = await loadLatestEconomyMetrics();
  const metrics: EconomyMetric[] = [];
  const missing: EconomyMetricKey[] = [];

  for (const key of ALL_ECONOMY_METRIC_KEYS) {
    const row = fromDb.get(key);
    if (row) metrics.push(row);
    else missing.push(key);
  }

  if (missing.length === 0) return { metrics, source: "database" };
  if (!allowLiveFill) return { metrics, source: metrics.length ? "database" : "empty" };

  const outcomes = indexOutcomes(await collectOutcomes());
  let liveCount = 0;
  for (const key of missing) {
    const outcome = outcomes.get(key);
    if (!outcome?.ok) continue;
    await persistEconomyMetric(outcome.metric);
    const refreshed = await loadLatestEconomyMetrics();
    const stored = refreshed.get(key);
    if (stored) {
      metrics.push(stored);
      liveCount += 1;
    }
  }

  if (liveCount === 0) return { metrics, source: metrics.length ? "database" : "empty" };
  if (metrics.length > liveCount) return { metrics, source: "mixed" };
  return { metrics, source: "live" };
}

export async function getEconomyDebugSnapshots(): Promise<EconomyDebugSnapshot[]> {
  const latest = await loadLatestEconomyMetrics();
  return ALL_ECONOMY_METRIC_KEYS.map((key) => {
    const m = latest.get(key);
    if (!m) {
      return {
        key,
        name: METRIC_NAMES[key],
        value: null,
        displayValue: null,
        source: null,
        sourceUrl: null,
        period: null,
        publishedAt: null,
        updatedAt: null,
        lastAttemptAt: null,
        lastSuccessAt: null,
        status: "missing",
        stale: true,
        staleReason: "No verified record in database",
        errorMessage: null,
        nextRefreshAt: null,
        frequency: null,
        valueKind: null,
      };
    }
    return {
      key,
      name: m.name,
      value: m.value,
      displayValue: m.displayValue,
      source: m.source,
      sourceUrl: m.sourceUrl,
      period: m.period,
      publishedAt: m.publishedAt,
      updatedAt: m.updatedAt,
      lastAttemptAt: m.lastAttemptAt,
      lastSuccessAt: m.updatedAt,
      status: m.status,
      stale: m.stale,
      staleReason: m.staleReason,
      errorMessage: m.errorMessage,
      nextRefreshAt: m.nextRefreshAt,
      frequency: m.frequency,
      valueKind: m.valueKind,
    };
  });
}

export async function getEconomySeries(key: EconomyMetricKey, limit = 24) {
  return loadEconomyHistory(key, limit);
}

export function economyUsesLiveBadge(key: EconomyMetricKey, liveCapable?: boolean): boolean {
  return Boolean(liveCapable && LIVE_CAPABLE[key]);
}
