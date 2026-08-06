#!/usr/bin/env node
/**
 * Activate Phase 6: ingest typed company actions + symbol-tagged disclosures/exchange notices
 * into production Supabase (same logic as the authenticated cron handlers).
 *
 * Usage: node scripts/ingest-nepse-company-actions.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { loadDotEnvLocal } from "./load-dotenv-local.mjs";

loadDotEnvLocal();

const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim().replace(/\/+$/, "");
const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const DISCLOSURES_URL = "https://shubhamnpk.github.io/yonepse/data/notify/disclosures.json";
const EXCHANGE_MESSAGES_URL = "https://shubhamnpk.github.io/yonepse/data/notify/exchange_messages.json";
const DIVIDENDS_URL = "https://shubhamnpk.github.io/yonepse/data/proposed_dividend/history_all_years.json";

const str = (v) => (typeof v === "string" && v.trim() ? v.trim() : null);
const num = (v) =>
  typeof v === "number" && Number.isFinite(v)
    ? v
    : typeof v === "string" && v.trim() && Number.isFinite(Number(v))
      ? Number(v)
      : null;

function classifyCorporateAction(text) {
  const t = text.toLowerCase();
  if (/\b(merger|amalgamat|acquisit|acquire)\b/.test(t)) return "merger";
  if (/\b(right share|rights? issue|right shares)\b/.test(t)) return "rights";
  if (/\bfpo\b|further public offer/.test(t)) return "fpo";
  if (/\bipo\b|initial public offer|allotment/.test(t)) return "ipo";
  if (/bonus share|bonus dividend/.test(t)) return "bonus";
  if (/dividend/.test(t)) return "dividend";
  if (/\bagm\b|\bsgm\b|annual general meeting|special general meeting/.test(t)) return "agm";
  if (/book clos|book-clos/.test(t)) return "book_close";
  if (/listing|listed .*shares?|commence.*trading/.test(t)) return "ipo";
  return null;
}

function isCorporateActionHeadline(headline) {
  return /\b(dividend|bonus share|right share|rights? issue|book closure|agm|sgm|ipo|allotment|merger|acquisition|listing)\b/i.test(
    headline,
  );
}

function categorizeHeadline(headline) {
  const pairs = [
    ["IPO", /\b(ipo|allotment|book building|right share|rights? issue|fpo)\b/i],
    ["Banking", /\b(bank|banking|nrb|interest rate|deposit|lending)\b/i],
    ["Hydropower", /\b(hydro|hydropower|megawatt|mw project|electricity|nea)\b/i],
    ["Insurance", /\b(insurance|insurer|beema|reinsurance)\b/i],
    ["Finance", /\b(finance company|microfinance|laghubitta|leasing)\b/i],
    ["Manufacturing", /\b(cement|manufacturing|industry|factory|production)\b/i],
    ["Hotels", /\b(hotel|tourism|resort)\b/i],
  ];
  for (const [category, pattern] of pairs) {
    if (pattern.test(headline)) return category;
  }
  return "Economy";
}

function scoreSentiment(text) {
  const positive = /\b(profit|gain|surge|rise|rises|rose|up|record|growth|bonus|dividend|approved|jumps?|high|bullish|expands?)\b/i.test(
    text,
  );
  const negative = /\b(loss|losses|fall|falls|fell|drop|drops|decline|down|plunge|penalt|fine|scam|fraud|suspend|bearish|weak|crash)\b/i.test(
    text,
  );
  if (positive && !negative) return "positive";
  if (negative && !positive) return "negative";
  return "neutral";
}

async function fetchJson(u) {
  const res = await fetch(u, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${u}`);
  return res.json();
}

function mapDisclosures(payload, limit, { idPrefix = "", defaultSource = null, fileUrlFromRaw } = {}) {
  const rows = [];
  for (const raw of Array.isArray(payload) ? payload : []) {
    const symbol = str(raw.symbol)?.toUpperCase();
    const title = str(raw.title);
    if (!symbol || !title) continue;
    const id = raw.id != null ? String(raw.id) : `${symbol}-${title}`.slice(0, 80);
    const sourceUrl =
      (typeof fileUrlFromRaw === "function" ? fileUrlFromRaw(raw) : null) ||
      (Array.isArray(raw.documents)
        ? raw.documents.map((doc) => str(doc.fileUrl)).find(Boolean)
        : null) ||
      str(raw.fileUrl) ||
      `https://shubhamnpk.github.io/yonepse/disclosure/${id}`;
    rows.push({
      id: `${idPrefix}${id}`,
      symbol,
      title,
      body: str(raw.body),
      source: str(raw.source) ?? defaultSource,
      publishedAt: str(raw.publishedAt),
      sourceUrl,
    });
    if (rows.length >= limit) break;
  }
  return rows;
}

const toDate = (value) => {
  if (!value) return null;
  const iso = value.length >= 10 ? value.slice(0, 10) : value;
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : null;
};

console.log("Fetching public feeds…");
const [discPayload, exmPayload, divPayload] = await Promise.all([
  fetchJson(DISCLOSURES_URL),
  fetchJson(EXCHANGE_MESSAGES_URL),
  fetchJson(DIVIDENDS_URL),
]);

const companyDisclosures = mapDisclosures(discPayload, 600);
const exchangeMessages = mapDisclosures(exmPayload, 400, {
  idPrefix: "exm-",
  defaultSource: "NEPSE",
  fileUrlFromRaw: (raw) => str(raw.fileUrl),
});

// --- News ingest (disclosures + exchange notices) ---
{
  const seen = new Set();
  const disclosures = [...companyDisclosures, ...exchangeMessages].filter((row) => {
    if (seen.has(row.sourceUrl)) return false;
    seen.add(row.sourceUrl);
    return true;
  });
  const newsRows = disclosures.map((row) => {
    const headline = `[${row.symbol}] ${row.title}`.slice(0, 400);
    const summary = `${row.symbol}${row.body ? ` · ${row.body}` : ""}`.slice(0, 500);
    return {
      headline,
      source_name: row.source ?? "NEPSE disclosure",
      source_url: row.sourceUrl,
      published_at: row.publishedAt,
      category: categorizeHeadline(row.title),
      sentiment: scoreSentiment(`${row.title} ${row.body ?? ""}`),
      summary,
      is_corporate_action: isCorporateActionHeadline(row.title),
    };
  });
  let newsPersisted = 0;
  for (let i = 0; i < newsRows.length; i += 200) {
    const chunk = newsRows.slice(i, i + 200);
    const { error } = await sb.from("nepse_market_news").upsert(chunk, { onConflict: "source_url", ignoreDuplicates: true });
    if (error) throw new Error(`news: ${error.message}`);
    newsPersisted += chunk.length;
  }
  console.log(`News/disclosures: upserted ${newsPersisted} rows`);
}

// --- Typed company actions ---
const actionRows = [];
const seenActions = new Set();
const push = (row) => {
  const dedupe_key = `${row.symbol}|${row.action_type}|${row.action_date ?? ""}|${row.title.slice(0, 80)}`;
  if (seenActions.has(dedupe_key)) return;
  seenActions.add(dedupe_key);
  actionRows.push({ ...row, dedupe_key });
};

for (const d of [...companyDisclosures, ...exchangeMessages]) {
  const actionType = classifyCorporateAction(`${d.title} ${d.body ?? ""}`);
  if (!actionType) continue;
  push({
    symbol: d.symbol,
    action_type: actionType,
    title: d.title.slice(0, 300),
    action_date: toDate(d.publishedAt),
    details: d.body ? d.body.slice(0, 400) : null,
    source_url: d.sourceUrl,
    source: d.source ?? "NEPSE",
  });
}

for (const raw of Array.isArray(divPayload) ? divPayload : []) {
  const symbol = str(raw.symbol)?.toUpperCase();
  const fiscalYear = str(raw.fiscal_year);
  if (!symbol || !fiscalYear) continue;
  const cash = num(raw.cash_dividend) ?? 0;
  const bonus = num(raw.bonus_share) ?? 0;
  const total = num(raw.total_dividend) ?? 0;
  const parts = [];
  if (cash > 0) parts.push(`Cash ${cash}%`);
  if (bonus > 0) parts.push(`Bonus ${bonus}%`);
  const details = parts.length ? `FY ${fiscalYear} · ${parts.join(" · ")}` : `FY ${fiscalYear}`;
  const annDate = toDate(str(raw.announcement_date));
  if (total > 0 && cash > 0) {
    push({
      symbol,
      action_type: "dividend",
      title: `Cash dividend ${cash}% (FY ${fiscalYear})`,
      action_date: annDate,
      details,
      source_url: null,
      source: "NEPSE proposed dividend",
    });
  }
  if (bonus > 0) {
    push({
      symbol,
      action_type: "bonus",
      title: `Bonus share ${bonus}% (FY ${fiscalYear})`,
      action_date: annDate,
      details,
      source_url: null,
      source: "NEPSE proposed dividend",
    });
  }
  const bookClose = toDate(str(raw.bookclose_date));
  if (bookClose) {
    push({
      symbol,
      action_type: "book_close",
      title: `Book closure (FY ${fiscalYear})`,
      action_date: bookClose,
      details,
      source_url: null,
      source: "NEPSE proposed dividend",
    });
  }
}

let actionsPersisted = 0;
for (let i = 0; i < actionRows.length; i += 200) {
  const chunk = actionRows.slice(i, i + 200);
  const { error } = await sb.from("nepse_company_actions").upsert(chunk, { onConflict: "dedupe_key", ignoreDuplicates: true });
  if (error) throw new Error(`actions: ${error.message}`);
  actionsPersisted += chunk.length;
}

const symbolsCovered = new Set(actionRows.map((r) => r.symbol)).size;
const byType = {};
for (const r of actionRows) byType[r.action_type] = (byType[r.action_type] || 0) + 1;

console.log(
  JSON.stringify(
    {
      ok: true,
      actionsPersisted,
      symbolsCovered,
      byType,
      sampleTargets: Object.fromEntries(
        ["NABIL", "VLBS", "SAHAS", "UPPER"].map((s) => [
          s,
          actionRows.filter((r) => r.symbol === s).reduce((acc, r) => {
            acc[r.action_type] = (acc[r.action_type] || 0) + 1;
            return acc;
          }, {}),
        ]),
      ),
    },
    null,
    2,
  ),
);
