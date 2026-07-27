import { createMemoryTtlCache } from "@/lib/api/memory-ttl-cache";
import { authenticateNepsePublicApi } from "@/services/market/nepse-ownership-provider";
import type { NepseSecurityTick } from "@/types/market";
import type { SupabaseClient } from "@supabase/supabase-js";

const ROOT = "https://www.nepalstock.com.np";
const cache = createMemoryTtlCache();
const MASTER_TTL_MS = 5 * 60_000;

type OfficialSecurityRow = {
  id: number;
  symbol: string;
  securityName?: string | null;
  companyName?: string | null;
  sectorName?: string | null;
  instrumentType?: string | null;
  activeStatus?: string | null;
  website?: string | null;
  email?: string | null;
  listingDate?: string | null;
  listedDate?: string | null;
  [key: string]: unknown;
};

export type NepseCompanyMasterRow = {
  symbol: string;
  securityId: number | null;
  companyName: string;
  sector: string | null;
  instrument: string | null;
  status: string;
  website: string | null;
  email: string | null;
  listingDate: string | null;
  delistedDate: string | null;
  isListed: boolean;
  source: string;
  officialPayload: Record<string, unknown>;
};

export type CompanyMasterSyncMode = "preopen" | "postclose" | "weekly_validation" | "manual";

export type CompanyMasterSyncResult = {
  mode: CompanyMasterSyncMode;
  status: "ok" | "partial" | "error";
  totalSeen: number;
  totalActive: number;
  totalListed: number;
  newSymbols: number;
  changedSymbols: number;
  delistedSymbols: number;
  suspendedSymbols: number;
  runId: string | null;
  message: string;
  sectorCounts: Record<string, number>;
};

function str(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function num(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function toDateOnly(value: string | null): string | null {
  if (!value) return null;
  const d = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
}

function normalizeStatus(raw: string | null): string {
  const upper = (raw ?? "").trim().toUpperCase();
  if (!upper) return "UNKNOWN";
  if (upper === "A" || upper === "ACTIVE") return "ACTIVE";
  if (upper === "D" || upper === "DELISTED") return "DELISTED";
  if (upper === "S" || upper === "SUSPENDED") return "SUSPENDED";
  return upper;
}

function isListedStatus(status: string): boolean {
  return status !== "DELISTED";
}

async function fetchJson<T>(url: string, init: RequestInit = {}, retries = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...init,
        headers: {
          "user-agent": "FIRENepal-CompanyMasterBot/1.0 (+https://firenepal.com)",
          accept: "application/json",
          ...(init.headers ?? {}),
        },
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status} ${url}`);
      return (await response.json()) as T;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 350 * (attempt + 1)));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Official NEPSE fetch failed");
}

function mapOfficialRow(input: OfficialSecurityRow, detail: Record<string, unknown> | null): NepseCompanyMasterRow | null {
  const symbol = str(input.symbol)?.toUpperCase();
  const securityId = num(input.id);
  if (!symbol || securityId == null) return null;

  const securityObj =
    detail?.security && typeof detail.security === "object" && !Array.isArray(detail.security)
      ? (detail.security as Record<string, unknown>)
      : null;
  const companyObj =
    securityObj?.companyId && typeof securityObj.companyId === "object" && !Array.isArray(securityObj.companyId)
      ? (securityObj.companyId as Record<string, unknown>)
      : null;
  const sectorObj =
    companyObj?.sectorMaster && typeof companyObj.sectorMaster === "object" && !Array.isArray(companyObj.sectorMaster)
      ? (companyObj.sectorMaster as Record<string, unknown>)
      : null;
  const instrumentObj =
    securityObj?.instrumentType && typeof securityObj.instrumentType === "object" && !Array.isArray(securityObj.instrumentType)
      ? (securityObj.instrumentType as Record<string, unknown>)
      : null;

  const companyName =
    str(securityObj?.securityName) ??
    str(companyObj?.companyName) ??
    str(detail?.securityName) ??
    str(detail?.companyName) ??
    str(input.securityName) ??
    str(input.companyName) ??
    symbol;
  const sector =
    str(sectorObj?.sectorDescription) ??
    str(detail?.sectorName) ??
    str(input.sectorName);
  const instrument =
    str(instrumentObj?.description) ??
    str(instrumentObj?.code) ??
    str(detail?.instrumentType) ??
    str(input.instrumentType);
  const status = normalizeStatus(str(securityObj?.activeStatus) ?? str(detail?.activeStatus) ?? str(input.activeStatus));
  const website = str(companyObj?.companyWebsite) ?? str(detail?.website) ?? str(input.website);
  const email = str(companyObj?.email) ?? str(detail?.email) ?? str(input.email);
  const listingDate =
    toDateOnly(
      str(securityObj?.listingDate) ??
        str(securityObj?.tradingStartDate) ??
        str(detail?.listingDate) ??
        str(detail?.listedDate) ??
        str(input.listingDate) ??
        str(input.listedDate),
    );
  const delistedDate = toDateOnly(str(detail?.delistedDate));

  const payload: Record<string, unknown> = {
    ...input,
    ...(detail ?? {}),
  };

  return {
    symbol,
    securityId,
    companyName,
    sector,
    instrument,
    status,
    website,
    email,
    listingDate,
    delistedDate,
    isListed: isListedStatus(status),
    source: "nepalstock:security",
    officialPayload: payload,
  };
}

export async function fetchOfficialCompanyMasterSnapshot(options?: { concurrency?: number }): Promise<NepseCompanyMasterRow[]> {
  const { authorization, payloadId } = await authenticateNepsePublicApi();
  const list = await fetchJson<OfficialSecurityRow[]>(`${ROOT}/api/nots/security?nonDelisting=false`, {
    headers: { authorization },
  });
  const securities = (Array.isArray(list) ? list : [])
    .filter((row) => row && row.symbol)
    .map((row) => ({ id: Number(row.id), symbol: String(row.symbol).toUpperCase(), base: row }))
    .filter((row) => Number.isFinite(row.id) && row.symbol);

  const concurrency = Math.min(Math.max(options?.concurrency ?? 4, 1), 8);
  const mapped: NepseCompanyMasterRow[] = [];

  for (let i = 0; i < securities.length; i += concurrency) {
    const chunk = securities.slice(i, i + concurrency);
    const details = await Promise.all(
      chunk.map(async (row) => {
        try {
          const detail = await fetchJson<Record<string, unknown>>(`${ROOT}/api/nots/security/${row.id}`, {
            method: "POST",
            headers: {
              authorization,
              "content-type": "application/json",
            },
            body: JSON.stringify({ id: payloadId }),
          });
          return { row, detail };
        } catch {
          return { row, detail: null };
        }
      }),
    );
    for (const entry of details) {
      const next = mapOfficialRow(entry.row.base, entry.detail);
      if (next) mapped.push(next);
    }
    await new Promise((resolve) => setTimeout(resolve, 140));
  }

  mapped.sort((a, b) => a.symbol.localeCompare(b.symbol, "en", { sensitivity: "base" }));
  return mapped;
}

function changedKeys(
  prev: Record<string, unknown>,
  next: NepseCompanyMasterRow,
): Array<"company_name" | "sector" | "instrument" | "status" | "symbol" | "metadata"> {
  const keys: Array<"company_name" | "sector" | "instrument" | "status" | "symbol" | "metadata"> = [];
  if ((prev.company_name as string | null) !== next.companyName) keys.push("company_name");
  if ((prev.sector as string | null) !== next.sector) keys.push("sector");
  if ((prev.instrument as string | null) !== next.instrument) keys.push("instrument");
  if ((prev.status as string | null) !== next.status) keys.push("status");
  if ((prev.symbol as string | null) !== next.symbol) keys.push("symbol");
  return keys;
}

function sectorCount(rows: NepseCompanyMasterRow[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const row of rows) {
    const key = row.sector ?? "Unclassified";
    out[key] = (out[key] ?? 0) + 1;
  }
  return out;
}

export async function syncOfficialCompanyMaster(
  sb: SupabaseClient,
  mode: CompanyMasterSyncMode,
): Promise<CompanyMasterSyncResult> {
  const startedAt = new Date().toISOString();
  const runInsert = await sb
    .from("nepse_company_master_sync_runs")
    .insert({ mode, status: "running", started_at: startedAt })
    .select("id")
    .maybeSingle();
  const runId = (runInsert.data as { id?: string } | null)?.id ?? null;

  try {
    const official = await fetchOfficialCompanyMasterSnapshot({ concurrency: 4 });
    const prevRes = await sb.from("nepse_company_master").select("*");
    const previous = ((prevRes.data as Record<string, unknown>[] | null) ?? []).map((row) => row);
    const bySymbol = new Map(previous.map((row) => [String(row.symbol), row]));
    const bySecurityId = new Map(
      previous
        .map((row) => [num(row.security_id), row] as const)
        .filter((pair): pair is [number, Record<string, unknown>] => pair[0] != null),
    );

    const now = new Date().toISOString();
    const upserts: Record<string, unknown>[] = [];
    const profileUpserts: Record<string, unknown>[] = [];
    const changes: Record<string, unknown>[] = [];
    let newSymbols = 0;
    let changedSymbols = 0;
    let suspendedSymbols = 0;

    const seenSymbols = new Set<string>();

    for (const row of official) {
      seenSymbols.add(row.symbol);
      const prevBySymbol = bySymbol.get(row.symbol);
      const prevBySecurityId = row.securityId != null ? bySecurityId.get(row.securityId) : undefined;

      if (!prevBySymbol) {
        newSymbols += 1;
        changes.push({
          sync_run_id: runId,
          symbol: row.symbol,
          security_id: row.securityId,
          change_type: "new_listing",
          old_values: null,
          new_values: row.officialPayload,
          detected_at: now,
        });
      } else {
        const diff = changedKeys(prevBySymbol, row);
        if (diff.length) {
          changedSymbols += 1;
          if (diff.includes("company_name")) {
            changes.push({
              sync_run_id: runId,
              symbol: row.symbol,
              security_id: row.securityId,
              change_type: "company_name_changed",
              old_values: { company_name: prevBySymbol.company_name },
              new_values: { company_name: row.companyName },
              detected_at: now,
            });
          }
          if (diff.includes("sector")) {
            changes.push({
              sync_run_id: runId,
              symbol: row.symbol,
              security_id: row.securityId,
              change_type: "sector_changed",
              old_values: { sector: prevBySymbol.sector },
              new_values: { sector: row.sector },
              detected_at: now,
            });
          }
          if (diff.includes("instrument")) {
            changes.push({
              sync_run_id: runId,
              symbol: row.symbol,
              security_id: row.securityId,
              change_type: "instrument_changed",
              old_values: { instrument: prevBySymbol.instrument },
              new_values: { instrument: row.instrument },
              detected_at: now,
            });
          }
          if (diff.includes("status")) {
            changes.push({
              sync_run_id: runId,
              symbol: row.symbol,
              security_id: row.securityId,
              change_type: "status_changed",
              old_values: { status: prevBySymbol.status },
              new_values: { status: row.status },
              detected_at: now,
            });
          }
        }
      }

      if (
        prevBySecurityId &&
        typeof prevBySecurityId.symbol === "string" &&
        prevBySecurityId.symbol !== row.symbol
      ) {
        changedSymbols += 1;
        changes.push({
          sync_run_id: runId,
          symbol: row.symbol,
          security_id: row.securityId,
          change_type: "symbol_changed",
          old_values: { symbol: prevBySecurityId.symbol },
          new_values: { symbol: row.symbol },
          detected_at: now,
        });
        upserts.push({
          symbol: prevBySecurityId.symbol,
          status: "DELISTED",
          is_listed: false,
          delisted_date: toDateOnly(now),
          updated_at: now,
          last_synced_at: now,
        });
      }

      if (row.status === "SUSPENDED") {
        suspendedSymbols += 1;
        changes.push({
          sync_run_id: runId,
          symbol: row.symbol,
          security_id: row.securityId,
          change_type: "suspended",
          old_values: null,
          new_values: { status: row.status },
          detected_at: now,
        });
      }

      upserts.push({
        symbol: row.symbol,
        security_id: row.securityId,
        company_name: row.companyName,
        sector: row.sector,
        instrument: row.instrument,
        status: row.status,
        website: row.website,
        email: row.email,
        listing_date: row.listingDate,
        delisted_date: row.delistedDate,
        is_listed: row.isListed,
        source: row.source,
        official_payload: row.officialPayload,
        first_seen_at: prevBySymbol?.first_seen_at ?? now,
        last_synced_at: now,
        updated_at: now,
      });

      profileUpserts.push({
        symbol: row.symbol,
        company_name: row.companyName,
        sector: row.sector,
        industry: row.instrument,
        official_security_id: row.securityId,
        official_status: row.status,
        official_website: row.website,
        official_email: row.email,
        official_listing_date: row.listingDate,
        official_metadata: row.officialPayload,
        source: "nepalstock:company-master",
        updated_at: now,
      });
    }

    let delistedSymbols = 0;
    for (const prev of previous) {
      const symbol = String(prev.symbol ?? "");
      if (!symbol || seenSymbols.has(symbol)) continue;
      delistedSymbols += 1;
      upserts.push({
        symbol,
        status: "DELISTED",
        is_listed: false,
        delisted_date: toDateOnly(now),
        last_synced_at: now,
        updated_at: now,
      });
      changes.push({
        sync_run_id: runId,
        symbol,
        security_id: num(prev.security_id),
        change_type: "delisted",
        old_values: { status: prev.status },
        new_values: { status: "DELISTED" },
        detected_at: now,
      });
    }

    for (let i = 0; i < upserts.length; i += 200) {
      await sb.from("nepse_company_master").upsert(upserts.slice(i, i + 200), { onConflict: "symbol" });
    }
    for (let i = 0; i < profileUpserts.length; i += 200) {
      await sb.from("nepse_company_profiles").upsert(profileUpserts.slice(i, i + 200), { onConflict: "symbol" });
    }
    for (let i = 0; i < changes.length; i += 200) {
      await sb.from("nepse_company_master_changes").insert(changes.slice(i, i + 200));
    }

    const currentRes = await sb.from("nepse_company_master").select("*");
    const current = ((currentRes.data as Record<string, unknown>[] | null) ?? []).map((row) => row);
    const duplicates: string[] = [];
    const seen = new Set<string>();
    for (const row of current) {
      const symbol = String(row.symbol ?? "");
      if (!symbol) continue;
      if (seen.has(symbol)) duplicates.push(symbol);
      seen.add(symbol);
    }
    const missing = official
      .filter((row) => !current.find((candidate) => String(candidate.symbol) === row.symbol))
      .map((row) => row.symbol);

    const validation = {
      sync_run_id: runId,
      total_companies: current.length,
      total_active: current.filter((row) => String(row.status ?? "") === "ACTIVE").length,
      total_listed: current.filter((row) => Boolean(row.is_listed)).length,
      sector_counts: sectorCount(
        current.map((row) => ({
          symbol: String(row.symbol),
          securityId: num(row.security_id),
          companyName: String(row.company_name ?? row.symbol),
          sector: str(row.sector),
          instrument: str(row.instrument),
          status: String(row.status ?? "UNKNOWN"),
          website: str(row.website),
          email: str(row.email),
          listingDate: str(row.listing_date),
          delistedDate: str(row.delisted_date),
          isListed: Boolean(row.is_listed),
          source: "db",
          officialPayload: {},
        })),
      ),
      missing_companies: missing,
      duplicate_companies: duplicates,
      sector_mismatches: [],
      symbol_mismatches: [],
      notes: "Official NEPSE company master validation snapshot",
    };
    await sb.from("nepse_company_master_validation_reports").insert(validation);

    const status: "ok" | "partial" | "error" = missing.length || duplicates.length ? "partial" : "ok";
    const message =
      status === "ok"
        ? `Synchronized ${official.length} official companies`
        : `Synchronized with validation issues: missing=${missing.length}, duplicates=${duplicates.length}`;

    await sb
      .from("nepse_company_master_sync_runs")
      .update({
        status,
        total_seen: official.length,
        total_active: official.filter((row) => row.status === "ACTIVE").length,
        total_listed: official.filter((row) => row.isListed).length,
        new_symbols: newSymbols,
        changed_symbols: changedSymbols,
        delisted_symbols: delistedSymbols,
        suspended_symbols: suspendedSymbols,
        message,
        completed_at: new Date().toISOString(),
      })
      .eq("id", runId);

    cache.set("nepse-company-master-map", new Map<string, NepseCompanyMasterRow>(), 1);

    return {
      mode,
      status,
      totalSeen: official.length,
      totalActive: official.filter((row) => row.status === "ACTIVE").length,
      totalListed: official.filter((row) => row.isListed).length,
      newSymbols,
      changedSymbols,
      delistedSymbols,
      suspendedSymbols,
      runId,
      message,
      sectorCounts: sectorCount(official),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Company master sync failed";
    if (runId) {
      await sb
        .from("nepse_company_master_sync_runs")
        .update({
          status: "error",
          message,
          completed_at: new Date().toISOString(),
        })
        .eq("id", runId);
    }
    return {
      mode,
      status: "error",
      totalSeen: 0,
      totalActive: 0,
      totalListed: 0,
      newSymbols: 0,
      changedSymbols: 0,
      delistedSymbols: 0,
      suspendedSymbols: 0,
      runId,
      message,
      sectorCounts: {},
    };
  }
}

export async function listCompanyMasterMap(
  sb: SupabaseClient | null,
): Promise<Map<string, NepseCompanyMasterRow>> {
  if (!sb) return new Map();
  const key = "nepse-company-master-map";
  const hit = cache.get<Map<string, NepseCompanyMasterRow>>(key);
  if (hit) return hit;
  const { data } = await sb.from("nepse_company_master").select("*");
  const map = new Map<string, NepseCompanyMasterRow>();
  for (const row of (data as Record<string, unknown>[] | null) ?? []) {
    const symbol = str(row.symbol)?.toUpperCase();
    const companyName = str(row.company_name);
    if (!symbol || !companyName) continue;
    map.set(symbol, {
      symbol,
      securityId: num(row.security_id),
      companyName,
      sector: str(row.sector),
      instrument: str(row.instrument),
      status: str(row.status) ?? "UNKNOWN",
      website: str(row.website),
      email: str(row.email),
      listingDate: str(row.listing_date),
      delistedDate: str(row.delisted_date),
      isListed: Boolean(row.is_listed),
      source: str(row.source) ?? "nepalstock:security",
      officialPayload:
        row.official_payload && typeof row.official_payload === "object" && !Array.isArray(row.official_payload)
          ? (row.official_payload as Record<string, unknown>)
          : {},
    });
  }
  cache.set(key, map, MASTER_TTL_MS);
  return map;
}

export function overlayCompanyMaster(
  ticks: Record<string, NepseSecurityTick>,
  masterBySymbol: Map<string, NepseCompanyMasterRow>,
): Record<string, NepseSecurityTick> {
  const out: Record<string, NepseSecurityTick> = {};
  for (const tick of Object.values(ticks)) {
    const master = masterBySymbol.get(tick.symbol.toUpperCase());
    out[tick.symbol] = {
      ...tick,
      companyName: master?.companyName ?? tick.companyName,
      sector: master?.sector ?? tick.sector,
    };
  }
  return out;
}
