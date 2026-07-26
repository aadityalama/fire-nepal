import { createMarketDataServiceClient } from "@/services/market/nepse-market-data-engine";
import type { IngestResult } from "@/services/market/nepse-market-data-engine";
import { authenticateNepsePublicApi } from "@/services/market/nepse-ownership-provider";
import type { SupabaseClient } from "@supabase/supabase-js";

const NEPSE_ROOT = "https://www.nepalstock.com.np";
const HISTORY_SIZE = 500;

const INDEXES = [
  { id: 58, key: "NEPSE", name: "NEPSE Index" },
  { id: 57, key: "SENSITIVE", name: "Sensitive Index" },
  { id: 62, key: "FLOAT", name: "Float Index" },
  { id: 63, key: "SENSITIVE_FLOAT", name: "Sensitive Float Index" },
  { id: 51, key: "COMMERCIAL_BANKS", name: "Banking SubIndex" },
  { id: 55, key: "DEVELOPMENT_BANKS", name: "Development Bank Ind." },
  { id: 60, key: "FINANCE", name: "Finance Index" },
  { id: 52, key: "HOTELS_AND_TOURISM", name: "Hotels And Tourism" },
  { id: 54, key: "HYDRO_POWER", name: "HydroPower Index" },
  { id: 67, key: "INVESTMENT", name: "Investment" },
  { id: 65, key: "LIFE_INSURANCE", name: "Life Insurance" },
  { id: 56, key: "MANUFACTURING_AND_PROCESSING", name: "Manufacturing And Pr." },
  { id: 64, key: "MICROFINANCE", name: "Microfinance Index" },
  { id: 66, key: "MUTUAL_FUND", name: "Mutual Fund" },
  { id: 59, key: "NON_LIFE_INSURANCE", name: "Non Life Insurance" },
  { id: 53, key: "OTHERS", name: "Others Index" },
  { id: 61, key: "TRADING", name: "Trading Index" },
] as const;

export function indexKeyFromName(name: string): string {
  const n = name.trim();
  if (/nepse/i.test(n) && !/sensitive|float|sub/i.test(n)) return "NEPSE";
  if (/sensitive.*float/i.test(n)) return "SENSITIVE_FLOAT";
  if (/float/i.test(n)) return "FLOAT";
  if (/sensitive/i.test(n)) return "SENSITIVE";
  const configured = INDEXES.find((index) => index.name.toLowerCase() === n.toLowerCase());
  if (configured) return configured.key;
  return n
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 64);
}

function isMissingRelation(message: string): boolean {
  return /PGRST205|schema cache|does not exist|relation .* does not exist/i.test(message);
}

type OfficialIndexHistoryRow = {
  businessDate?: unknown;
  closingIndex?: unknown;
  percentageChange?: unknown;
  highIndex?: unknown;
  lowIndex?: unknown;
};

type OfficialIndexHistoryPayload = {
  content?: OfficialIndexHistoryRow[];
};

function finiteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

async function fetchOfficialIndexHistory(
  authorization: string,
  index: (typeof INDEXES)[number],
): Promise<Record<string, unknown>[]> {
  const response = await fetch(
    `${NEPSE_ROOT}/api/nots/index/history/${index.id}?size=${HISTORY_SIZE}`,
    {
      headers: {
        authorization,
        accept: "application/json",
        "user-agent": "FIRENepal-IndexHistory/1.0 (+https://firenepal.com)",
      },
      signal: AbortSignal.timeout(30_000),
    },
  );
  if (!response.ok) throw new Error(`${index.name}: HTTP ${response.status}`);
  const payload = (await response.json()) as OfficialIndexHistoryPayload;
  const rows: Record<string, unknown>[] = [];
  for (const raw of payload.content ?? []) {
    const tradeDate =
      typeof raw.businessDate === "string" ? raw.businessDate.trim().slice(0, 10) : "";
    const close = finiteNumber(raw.closingIndex);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(tradeDate) || close == null || close <= 0) continue;
    rows.push({
      index_key: index.key,
      index_name: index.name,
      trade_date: tradeDate,
      close_value: close,
      previous_close: null,
      change_pct: finiteNumber(raw.percentageChange),
      high_value: finiteNumber(raw.highIndex),
      low_value: finiteNumber(raw.lowIndex),
      source: `nepalstock:index-history:${index.id}`,
    });
  }
  return rows;
}

/**
 * Backfill and refresh official NEPSE index history.
 * Every row comes from NEPSE's public index-history endpoint; no levels are synthesized.
 */
export async function ingestIndexEod(sb: SupabaseClient): Promise<IngestResult> {
  const startedAt = new Date();
  let result: IngestResult;
  try {
    const { authorization } = await authenticateNepsePublicApi();
    const settled = await Promise.allSettled(
      INDEXES.map((index) => fetchOfficialIndexHistory(authorization, index)),
    );
    const rows = settled.flatMap((entry) => (entry.status === "fulfilled" ? entry.value : []));
    const upstreamFailures = settled.flatMap((entry, i) =>
      entry.status === "rejected"
        ? [`${INDEXES[i]!.name}: ${entry.reason instanceof Error ? entry.reason.message : "failed"}`]
        : [],
    );

    if (!rows.length) {
      result = {
        kind: "eod",
        status: "error",
        items: 0,
        message: upstreamFailures.join("; ") || "Official NEPSE index history returned no rows",
      };
    } else {
      let persisted = 0;
      const writeFailures: string[] = [];
      for (let offset = 0; offset < rows.length; offset += 500) {
        const chunk = rows.slice(offset, offset + 500);
        const { error } = await sb
          .from("nepse_index_eod")
          .upsert(chunk, { onConflict: "index_key,trade_date" });
        if (error) writeFailures.push(error.message);
        else persisted += chunk.length;
      }
      const missingTable = writeFailures.some(isMissingRelation);
      if (writeFailures.length) {
        result = {
          kind: "eod",
          status: missingTable ? "partial" : persisted > 0 ? "partial" : "error",
          items: persisted,
          message: missingTable
            ? `nepse_index_eod missing — apply supabase/migrations/20260726200000_nepse_index_eod.sql (${writeFailures[0]})`
            : [...writeFailures, ...upstreamFailures].join("; "),
        };
      } else {
        result = {
          kind: "eod",
          status: upstreamFailures.length ? "partial" : "ok",
          items: persisted,
          message: `Stored ${persisted} official index-history rows across ${settled.length - upstreamFailures.length} indices${
            upstreamFailures.length ? `; ${upstreamFailures.join("; ")}` : ""
          }`,
        };
      }
    }
  } catch (error) {
    result = {
      kind: "eod",
      status: "error",
      items: 0,
      message: error instanceof Error ? error.message : "Index EOD ingest failed",
    };
  }

  await sb.from("nepse_ingestion_runs").insert({
    kind: "eod",
    status: result.status,
    items: result.items,
    message: `index_eod: ${result.message}`.slice(0, 500),
    started_at: startedAt.toISOString(),
  });

  return result;
}

export async function loadIndexEodSeries(
  indexKeys: string[] = ["NEPSE", "SENSITIVE"],
  limit = 400,
): Promise<Record<string, { indexName: string; bars: { tradeDate: string; closeValue: number }[] }>> {
  const sb = createMarketDataServiceClient();
  const out: Record<string, { indexName: string; bars: { tradeDate: string; closeValue: number }[] }> = {};
  if (!sb) return out;

  const capped = Math.min(Math.max(limit, 1), 1500);
  const keys = indexKeys.length ? indexKeys : ["NEPSE", "SENSITIVE", "FLOAT"];
  const { data, error } = await sb
    .from("nepse_index_eod")
    .select("index_key, index_name, trade_date, close_value")
    .in("index_key", keys)
    .order("trade_date", { ascending: false })
    .limit(capped * Math.max(keys.length, 1));

  if (error || !data?.length) return out;

  for (const row of data as Record<string, unknown>[]) {
    const key = String(row.index_key ?? "");
    const name = String(row.index_name ?? key);
    const tradeDate = String(row.trade_date ?? "").slice(0, 10);
    const close = Number(row.close_value);
    if (!key || !/^\d{4}-\d{2}-\d{2}$/.test(tradeDate) || !(close > 0)) continue;
    const bucket = out[key] ?? { indexName: name, bars: [] };
    bucket.bars.push({ tradeDate, closeValue: close });
    out[key] = bucket;
  }

  for (const key of Object.keys(out)) {
    out[key]!.bars.sort((a, b) => a.tradeDate.localeCompare(b.tradeDate));
  }
  return out;
}
