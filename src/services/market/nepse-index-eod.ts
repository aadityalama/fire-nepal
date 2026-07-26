import { createMarketDataServiceClient, kathmanduTradeDate } from "@/services/market/nepse-market-data-engine";
import { getCachedNepseYonepseBundle } from "@/services/market/nepse-bundle-cache";
import type { IngestResult } from "@/services/market/nepse-market-data-engine";
import type { SupabaseClient } from "@supabase/supabase-js";

function indexKeyFromName(name: string): string {
  const n = name.trim();
  if (/nepse/i.test(n) && !/sensitive|float|sub/i.test(n)) return "NEPSE";
  if (/sensitive/i.test(n)) return "SENSITIVE";
  if (/float/i.test(n)) return "FLOAT";
  return n
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 64);
}

/**
 * Snapshot published index levels into `nepse_index_eod` for the Kathmandu trade date.
 * Sources: Yonepse mirror of NEPSE index board (same feed as live hub).
 */
export async function ingestIndexEod(sb: SupabaseClient): Promise<IngestResult> {
  const startedAt = new Date();
  let result: IngestResult;
  try {
    const bundle = await getCachedNepseYonepseBundle();
    const tradeDate = kathmanduTradeDate();
    const rows: Record<string, unknown>[] = [];

    for (const idx of bundle.indices) {
      if (idx.value == null || !(idx.value > 0)) continue;
      rows.push({
        index_key: indexKeyFromName(idx.name),
        index_name: idx.name,
        trade_date: tradeDate,
        close_value: idx.value,
        previous_close: idx.previousClose,
        change_pct: idx.changePct,
        high_value: idx.high,
        low_value: idx.low,
        source: "yonepse:indices",
      });
    }

    // Also capture primary NEPSE tick if missing from indices array.
    if (bundle.index?.value != null && bundle.index.value > 0) {
      const key = indexKeyFromName(bundle.index.name || "NEPSE");
      if (!rows.some((r) => r.index_key === key)) {
        rows.push({
          index_key: key,
          index_name: bundle.index.name || "NEPSE Index",
          trade_date: tradeDate,
          close_value: bundle.index.value,
          previous_close: null,
          change_pct: bundle.index.changePct ?? null,
          high_value: null,
          low_value: null,
          source: "yonepse:index",
        });
      }
    }

    if (!rows.length) {
      result = { kind: "eod", status: "error", items: 0, message: "No index levels in upstream bundle" };
    } else {
      const { error } = await sb.from("nepse_index_eod").upsert(rows, { onConflict: "index_key,trade_date" });
      result = error
        ? { kind: "eod", status: "error", items: 0, message: error.message }
        : { kind: "eod", status: "ok", items: rows.length, message: `Stored ${rows.length} index closes for ${tradeDate}` };
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
  const { data, error } = await sb
    .from("nepse_index_eod")
    .select("index_key, index_name, trade_date, close_value")
    .in("index_key", indexKeys)
    .order("trade_date", { ascending: false })
    .limit(capped * Math.max(indexKeys.length, 1));

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
