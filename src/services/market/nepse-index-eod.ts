import { createMarketDataServiceClient, kathmanduTradeDate } from "@/services/market/nepse-market-data-engine";
import { getCachedNepseYonepseBundle } from "@/services/market/nepse-bundle-cache";
import type { IngestResult } from "@/services/market/nepse-market-data-engine";
import type { SupabaseClient } from "@supabase/supabase-js";

export function indexKeyFromName(name: string): string {
  const n = name.trim();
  if (/nepse/i.test(n) && !/sensitive|float|sub/i.test(n)) return "NEPSE";
  // Float before Sensitive so "Sensitive Float Index" does not collide with SENSITIVE.
  if (/float/i.test(n)) return "FLOAT";
  if (/sensitive/i.test(n)) return "SENSITIVE";
  return n
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 64);
}

/** NEPSE cash sessions are Sun–Thu. Walk back skipping Fri/Sat. */
export function priorNepseSessionDate(iso: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  for (let i = 0; i < 10; i++) {
    dt.setUTCDate(dt.getUTCDate() - 1);
    const dow = dt.getUTCDay(); // 0=Sun … 5=Fri 6=Sat
    if (dow === 5 || dow === 6) continue;
    return dt.toISOString().slice(0, 10);
  }
  return null;
}

function isMissingRelation(message: string): boolean {
  return /PGRST205|schema cache|does not exist|relation .* does not exist/i.test(message);
}

/**
 * Snapshot published index levels into `nepse_index_eod` for the Kathmandu trade date.
 * Also seeds the prior session row from published `previousClose` when available
 * (official previous close — never invented).
 */
export async function ingestIndexEod(sb: SupabaseClient): Promise<IngestResult> {
  const startedAt = new Date();
  let result: IngestResult;
  try {
    const bundle = await getCachedNepseYonepseBundle();
    const tradeDate = kathmanduTradeDate();
    const priorDate = priorNepseSessionDate(tradeDate);
    const rows: Record<string, unknown>[] = [];
    const seen = new Set<string>();

    const pushRow = (row: Record<string, unknown>) => {
      const key = `${row.index_key}|${row.trade_date}`;
      if (seen.has(key)) return;
      seen.add(key);
      rows.push(row);
    };

    for (const idx of bundle.indices) {
      if (idx.value == null || !(idx.value > 0)) continue;
      const indexKey = indexKeyFromName(idx.name);
      pushRow({
        index_key: indexKey,
        index_name: idx.name,
        trade_date: tradeDate,
        close_value: idx.value,
        previous_close: idx.previousClose,
        change_pct: idx.changePct,
        high_value: idx.high,
        low_value: idx.low,
        source: "yonepse:indices",
      });
      if (priorDate && idx.previousClose != null && idx.previousClose > 0) {
        pushRow({
          index_key: indexKey,
          index_name: idx.name,
          trade_date: priorDate,
          close_value: idx.previousClose,
          previous_close: null,
          change_pct: null,
          high_value: null,
          low_value: null,
          source: "yonepse:indices:previousClose",
        });
      }
    }

    if (bundle.index?.value != null && bundle.index.value > 0) {
      const key = indexKeyFromName(bundle.index.name || "NEPSE");
      pushRow({
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

    if (!rows.length) {
      result = { kind: "eod", status: "error", items: 0, message: "No index levels in upstream bundle" };
    } else {
      const { error } = await sb.from("nepse_index_eod").upsert(rows, { onConflict: "index_key,trade_date" });
      if (error) {
        result = {
          kind: "eod",
          status: isMissingRelation(error.message) ? "partial" : "error",
          items: 0,
          message: isMissingRelation(error.message)
            ? `nepse_index_eod missing — apply supabase/migrations/20260726200000_nepse_index_eod.sql (${error.message})`
            : error.message,
        };
      } else {
        result = {
          kind: "eod",
          status: "ok",
          items: rows.length,
          message: `Stored ${rows.length} index closes for ${tradeDate}${priorDate ? ` (+ prior ${priorDate} from previousClose)` : ""}`,
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
