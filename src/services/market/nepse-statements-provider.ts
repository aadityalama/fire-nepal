/**
 * Official NEPSE financial-statement provider.
 *
 * Sources (verified only):
 * 1) NEPSE `/api/nots/application/reports/{securityId}` — structured EPS/PE/profit/paid-up/NWPS
 * 2) Attached official PDF via NEPSE `fetchFiles` — additional line items when text-extractable
 *
 * Never fabricates values. Image-only PDFs leave line items null.
 */

import { createHash } from "node:crypto";
import { createMemoryTtlCache } from "@/lib/api/memory-ttl-cache";
import { authenticateNepsePublicApi } from "@/services/market/nepse-ownership-provider";
import {
  extractStatementFieldsFromText,
  isExtractableStatementText,
  type StatementNumericField,
} from "@/services/market/nepse-statement-pdf-parser";

const ROOT = "https://www.nepalstock.com.np";
const TTL_MS = 2 * 60 * 60 * 1000;
const cache = createMemoryTtlCache();

export type OfficialStatementPeriodType = "annual" | "quarterly";

export type OfficialStatementRow = {
  symbol: string;
  securityId: number;
  periodKey: string;
  periodType: OfficialStatementPeriodType;
  fiscalYear: string;
  fiscalYearNepali: string | null;
  quarter: number | null;
  periodLabel: string;
  reportId: string;
  documentPath: string | null;
  documentHash: string | null;
  submittedDate: string | null;
  reportModifiedAt: string | null;
  pe: number | null;
  eps: number | null;
  dilutedEps: number | null;
  paidUpCapitalNpr: number | null;
  netProfitNpr: number | null;
  netWorthPerShareNpr: number | null;
  fields: Partial<Record<StatementNumericField, number | null>>;
  extractionStatus: "structured_only" | "pdf_parsed" | "pdf_unreadable" | "no_document";
  source: string;
};

function num(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function str(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  return null;
}

const QUARTER_RANK: Record<string, number> = {
  "first quarter": 1,
  "second quarter": 2,
  "third quarter": 3,
  "fourth quarter": 4,
};

function quarterFromName(name: string | null): number | null {
  if (!name) return null;
  return QUARTER_RANK[name.toLowerCase()] ?? null;
}

export function buildPeriodKey(periodType: OfficialStatementPeriodType, fiscalYear: string, quarter: number | null): string {
  if (periodType === "annual") return `A:${fiscalYear}`;
  return `Q:${fiscalYear}:${quarter ?? 0}`;
}

async function fetchJson<T>(url: string, init: RequestInit = {}, retries = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...init,
        headers: {
          "user-agent": "FIRENepal-StatementsBot/1.0 (+https://firenepal.com)",
          accept: "application/json",
          ...(init.headers ?? {}),
        },
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status} ${url}`);
      return (await response.json()) as T;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("NEPSE statements fetch failed");
}

/** Node < 22.5 / some runtimes lack Math.sumPrecise used by pdf.js via unpdf. */
function ensureMathSumPrecise() {
  const math = Math as Math & { sumPrecise?: (values: Iterable<number>) => number };
  if (typeof math.sumPrecise === "function") return;
  math.sumPrecise = (values: Iterable<number>) => {
    let total = 0;
    for (const value of values) total += Number(value) || 0;
    return total;
  };
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  ensureMathSumPrecise();
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });
  if (typeof text === "string") return text;
  if (Array.isArray(text)) return (text as string[]).join("\n");
  return String(text ?? "");
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function mapFiscalReport(raw: Record<string, unknown>, symbol: string, securityId: number): OfficialStatementRow | null {
  const fiscal = asRecord(raw.fiscalReport);
  if (!fiscal) return null;
  const reportType = asRecord(fiscal.reportTypeMaster)?.reportName;
  const typeName = str(reportType)?.toLowerCase() ?? "";
  const periodType: OfficialStatementPeriodType | null = typeName.includes("annual")
    ? "annual"
    : typeName.includes("quarter")
      ? "quarterly"
      : null;
  const fy = asRecord(fiscal.financialYear) ?? {};
  const fiscalYear = str(fy.fyName);
  if (!periodType || !fiscalYear) return null;
  const quarterName = str(asRecord(fiscal.quarterMaster)?.quarterName);
  const quarter = periodType === "quarterly" ? quarterFromName(quarterName) : null;
  const docs = Array.isArray(raw.applicationDocumentDetailsList)
    ? (raw.applicationDocumentDetailsList as Record<string, unknown>[])
    : [];
  const primaryDoc = docs[0] ?? null;
  const documentPath = primaryDoc ? str(primaryDoc.filePath) : null;
  const submittedDate = primaryDoc ? str(primaryDoc.submittedDate) : null;
  const reportId = raw.id != null ? String(raw.id) : `${symbol}-${fiscalYear}-${quarter ?? "A"}`;
  const periodKey = buildPeriodKey(periodType, fiscalYear, quarter);
  const eps = num(fiscal.epsValue);
  const netProfit = num(fiscal.profitAmount);
  const fields: Partial<Record<StatementNumericField, number | null>> = {
    eps,
    netProfitNpr: netProfit,
  };

  return {
    symbol,
    securityId,
    periodKey,
    periodType,
    fiscalYear,
    fiscalYearNepali: str(fy.fyNameNepali),
    quarter,
    periodLabel: periodType === "annual" ? `FY ${fiscalYear}` : `Q${quarter ?? "?"} ${fiscalYear}`,
    reportId,
    documentPath,
    documentHash: null,
    submittedDate,
    reportModifiedAt: str(raw.modifiedDate) ?? str(fiscal.modifiedDate),
    pe: num(fiscal.peValue),
    eps,
    dilutedEps: null,
    paidUpCapitalNpr: num(fiscal.paidUpCapital),
    netProfitNpr: netProfit,
    netWorthPerShareNpr: num(fiscal.netWorthPerShare),
    fields,
    extractionStatus: documentPath ? "structured_only" : "no_document",
    source: `nepalstock:application/reports:${reportId}`,
  };
}

async function enrichFromPdf(row: OfficialStatementRow): Promise<OfficialStatementRow> {
  if (!row.documentPath) return { ...row, extractionStatus: "no_document" };
  const url = `${ROOT}/api/nots/security/fetchFiles?fileLocation=${encodeURIComponent(row.documentPath)}`;
  try {
    const response = await fetch(url, {
      headers: {
        "user-agent": "FIRENepal-StatementsBot/1.0 (+https://firenepal.com)",
        accept: "application/pdf,*/*",
      },
      signal: AbortSignal.timeout(45_000),
    });
    if (!response.ok) return { ...row, extractionStatus: "pdf_unreadable" };
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length < 1_000) return { ...row, extractionStatus: "pdf_unreadable" };
    const documentHash = createHash("sha256").update(buffer).digest("hex");
    const text = await extractPdfText(buffer);
    if (!isExtractableStatementText(text)) {
      return { ...row, documentHash, extractionStatus: "pdf_unreadable" };
    }
    const extracted = extractStatementFieldsFromText(text);
    const fields: Partial<Record<StatementNumericField, number | null>> = { ...row.fields };
    for (const [key, value] of Object.entries(extracted.fields) as [StatementNumericField, number][]) {
      if (value == null || !Number.isFinite(value)) continue;
      // Prefer PDF line items for statement rows; keep NEPSE JSON scalars when PDF omits them.
      fields[key] = value;
    }
    // Structured NEPSE JSON remains authoritative for published scalars when present.
    if (row.eps != null) fields.eps = row.eps;
    if (row.netProfitNpr != null) fields.netProfitNpr = row.netProfitNpr;
    return {
      ...row,
      documentHash,
      dilutedEps: fields.dilutedEps ?? null,
      fields,
      extractionStatus: "pdf_parsed",
      source: `${row.source}+pdf`,
    };
  } catch {
    return { ...row, extractionStatus: "pdf_unreadable" };
  }
}

export type FetchOfficialStatementsOptions = {
  /** Max securities to process in this pass (incremental cron). */
  securityLimit?: number;
  /** Prefer these symbols first. */
  prioritize?: string[];
  /** When true, download/parse PDFs for line items. */
  parsePdfs?: boolean;
  /** Max PDFs to parse in this pass. */
  pdfLimit?: number;
  concurrency?: number;
  /** Skip PDF parse when document hash already known in DB. */
  knownDocumentHashes?: Set<string>;
  /** Skip periods already stored with same report id + hash. */
  skipPeriodKeys?: Set<string>;
};

/** List active securities (id + symbol) via official NEPSE API. */
export async function listActiveNepseSecurities(authorization: string): Promise<{ id: number; symbol: string }[]> {
  const securities = await fetchJson<{ id: number; symbol: string; activeStatus?: string }[]>(
    `${ROOT}/api/nots/security?nonDelisting=true`,
    { headers: { authorization } },
  );
  return (Array.isArray(securities) ? securities : [])
    .filter((row) => row?.symbol && row.activeStatus !== "D")
    .map((row) => ({ id: Number(row.id), symbol: String(row.symbol).toUpperCase() }))
    .filter((row) => Number.isFinite(row.id) && row.symbol);
}

/**
 * Fetch official statement rows for listed securities.
 * Structured fields always; PDF line items when parsePdfs=true and text-extractable.
 */
export async function fetchOfficialStatements(
  options: FetchOfficialStatementsOptions = {},
): Promise<OfficialStatementRow[]> {
  const cacheKey = `nepse-statements-v1:${options.securityLimit ?? "all"}:${options.parsePdfs ? 1 : 0}:${(options.prioritize ?? []).join(",")}`;
  if (!options.parsePdfs && !options.skipPeriodKeys && !options.knownDocumentHashes) {
    const hit = cache.get<OfficialStatementRow[]>(cacheKey);
    if (hit) return hit;
  }

  const { authorization } = await authenticateNepsePublicApi();
  const active = await listActiveNepseSecurities(authorization);
  const bySymbol = new Map(active.map((row) => [row.symbol, row]));
  const priorityList = (options.prioritize ?? []).map((s) => s.toUpperCase());
  const prioritySet = new Set(priorityList);
  const ordered = [
    ...priorityList.map((symbol) => bySymbol.get(symbol)).filter((row): row is { id: number; symbol: string } => Boolean(row)),
    ...active.filter((row) => !prioritySet.has(row.symbol)),
  ];
  const limit = options.securityLimit && options.securityLimit > 0 ? options.securityLimit : ordered.length;
  const targets = ordered.slice(0, limit);
  const concurrency = Math.min(Math.max(options.concurrency ?? 4, 1), 8);
  const rows: OfficialStatementRow[] = [];
  let pdfBudget = options.pdfLimit ?? Number.POSITIVE_INFINITY;

  for (let i = 0; i < targets.length; i += concurrency) {
    const chunk = targets.slice(i, i + concurrency);
    const chunkRows = await Promise.all(
      chunk.map(async (sec) => {
        try {
          const payload = await fetchJson<Record<string, unknown>[]>(`${ROOT}/api/nots/application/reports/${sec.id}`, {
            headers: { authorization },
          });
          const mapped = (Array.isArray(payload) ? payload : [])
            .map((raw) => mapFiscalReport(raw, sec.symbol, sec.id))
            .filter((row): row is OfficialStatementRow => Boolean(row));
          // Prefer latest report per period key.
          const byPeriod = new Map<string, OfficialStatementRow>();
          for (const row of mapped) {
            const prev = byPeriod.get(row.periodKey);
            if (!prev) {
              byPeriod.set(row.periodKey, row);
              continue;
            }
            const prevTs = Date.parse(prev.reportModifiedAt ?? "") || 0;
            const nextTs = Date.parse(row.reportModifiedAt ?? "") || 0;
            if (nextTs >= prevTs) byPeriod.set(row.periodKey, row);
          }
          return [...byPeriod.values()];
        } catch {
          return [] as OfficialStatementRow[];
        }
      }),
    );
    for (const list of chunkRows) rows.push(...list);
    await new Promise((resolve) => setTimeout(resolve, 120));
  }

  if (!options.parsePdfs) {
    cache.set(cacheKey, rows, TTL_MS);
    return rows;
  }

  // Parse newest filings first, round-robin across symbols so pdfLimit covers many companies.
  const rankPeriod = (row: OfficialStatementRow) => {
    const fy = Number(String(row.fiscalYear).slice(0, 4)) || 0;
    const q = row.periodType === "annual" ? 5 : row.quarter ?? 0;
    const modified = Date.parse(row.reportModifiedAt ?? "") || 0;
    return fy * 10 + q + modified / 1e15;
  };
  const bySymbolRows = new Map<string, OfficialStatementRow[]>();
  for (const row of rows) {
    const list = bySymbolRows.get(row.symbol) ?? [];
    list.push(row);
    bySymbolRows.set(row.symbol, list);
  }
  for (const list of bySymbolRows.values()) {
    list.sort((a, b) => rankPeriod(b) - rankPeriod(a));
  }
  const symbolOrder = [...bySymbolRows.keys()];
  const parseQueue: OfficialStatementRow[] = [];
  let depth = 0;
  let progressed = true;
  while (progressed) {
    progressed = false;
    for (const symbol of symbolOrder) {
      const list = bySymbolRows.get(symbol) ?? [];
      const candidate = list[depth];
      if (!candidate) continue;
      progressed = true;
      parseQueue.push(candidate);
    }
    depth += 1;
  }

  const enrichedByKey = new Map<string, OfficialStatementRow>();
  for (const row of parseQueue) {
    const key = `${row.symbol}|${row.periodKey}`;
    if (options.skipPeriodKeys?.has(`${row.symbol}|${row.periodKey}|${row.reportId}|${row.documentPath ?? ""}`)) {
      enrichedByKey.set(key, row);
      continue;
    }
    if (pdfBudget <= 0 || !row.documentPath) {
      enrichedByKey.set(key, row);
      continue;
    }
    pdfBudget -= 1;
    enrichedByKey.set(key, await enrichFromPdf(row));
  }

  return rows.map((row) => enrichedByKey.get(`${row.symbol}|${row.periodKey}`) ?? row);
}
