"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  NEPSE_HUB_ADMIN_DOMAIN_LABELS,
  NEPSE_HUB_ADMIN_FIELDS,
  type NepseHubAdminDomain,
} from "@/lib/market/nepse-hub-admin-fields";

type CompanyHit = { symbol: string; company_name: string | null; sector: string | null };
type OverrideRow = {
  id: string;
  symbol: string;
  domain: string;
  record_key: string;
  field_key: string;
  value_json: unknown;
  official_snapshot_json: unknown;
  note: string | null;
  updated_at: string;
  updated_by_email: string;
};
type AuditRow = {
  id: string;
  domain: string;
  record_key: string;
  field_key: string | null;
  action: string;
  actor_email: string;
  note: string | null;
  created_at: string;
};
type CompanyMasterSyncView = {
  latestRun: Record<string, unknown> | null;
  latestValidation: Record<string, unknown> | null;
  liveSectorCounts: Record<string, number>;
};
type OfficialLiveSyncView = {
  latestSnapshot: {
    syncedAt: string;
    tradeDate: string;
    indexName: string | null;
    indexValue: number | null;
    indexChangeNpr: number | null;
    indexChangePct: number | null;
    totalTurnoverNpr: number | null;
    totalVolume: number | null;
    totalTrades: number | null;
    advancing: number | null;
    declining: number | null;
    unchanged: number | null;
    upperCircuit: number | null;
    lowerCircuit: number | null;
    isMarketOpen: boolean | null;
  } | null;
  latestRun: Record<string, unknown> | null;
  source: string;
};

function unwrap(valueJson: unknown): unknown {
  if (valueJson && typeof valueJson === "object" && !Array.isArray(valueJson) && "v" in (valueJson as object)) {
    return (valueJson as { v: unknown }).v;
  }
  return valueJson;
}

export function NepseHubAdminClient() {
  const searchParams = useSearchParams();
  const initialSymbol = (searchParams.get("symbol") ?? "NABIL").trim().toUpperCase() || "NABIL";
  const [query, setQuery] = useState("");
  const [companies, setCompanies] = useState<CompanyHit[]>([]);
  const [symbol, setSymbol] = useState(initialSymbol);
  const [domain, setDomain] = useState<NepseHubAdminDomain>("profile");
  const [recordKey, setRecordKey] = useState("_");
  const [fieldKey, setFieldKey] = useState("companyName");
  const [valueText, setValueText] = useState("");
  const [note, setNote] = useState("");
  const [snapshot, setSnapshot] = useState<Record<string, unknown> | null>(null);
  const [busy, setBusy] = useState(false);
  const [syncBusy, setSyncBusy] = useState(false);
  const [forceSyncBusy, setForceSyncBusy] = useState(false);
  const [syncInfo, setSyncInfo] = useState<CompanyMasterSyncView | null>(null);
  const [liveSyncInfo, setLiveSyncInfo] = useState<OfficialLiveSyncView | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fields = NEPSE_HUB_ADMIN_FIELDS[domain] ?? [];
  const overrides = (snapshot?.overrides as OverrideRow[] | undefined) ?? [];
  const audit = (snapshot?.audit as AuditRow[] | undefined) ?? [];
  const statementPeriods =
    (snapshot?.statementPeriods as { period_key: string; period_label: string | null; period_type: string }[] | undefined) ??
    [];

  const loadCatalog = useCallback(async (q: string) => {
    const r = await fetch(`/api/admin/nepse-hub?q=${encodeURIComponent(q)}`, { credentials: "include", cache: "no-store" });
    if (r.status === 403 || r.status === 401) {
      setError("Forbidden — NEPSE Hub Admin is restricted.");
      return;
    }
    if (!r.ok) {
      setError("Failed to load company catalog.");
      return;
    }
    const j = (await r.json()) as { companies?: CompanyHit[] };
    setCompanies(j.companies ?? []);
  }, []);

  const loadSymbol = useCallback(async (sym: string) => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const r = await fetch(`/api/admin/nepse-hub/${encodeURIComponent(sym)}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (r.status === 403 || r.status === 401) {
        setError("Forbidden — NEPSE Hub Admin is restricted.");
        setSnapshot(null);
        return;
      }
      if (!r.ok) {
        setError("Failed to load company admin snapshot.");
        return;
      }
      const j = (await r.json()) as Record<string, unknown>;
      setSnapshot(j);
      setSymbol(String(j.symbol ?? sym).toUpperCase());
    } finally {
      setBusy(false);
    }
  }, []);

  const loadSyncInfo = useCallback(async () => {
    const r = await fetch("/api/admin/nepse-hub/company-master-sync", { credentials: "include", cache: "no-store" });
    if (!r.ok) return;
    const j = (await r.json()) as CompanyMasterSyncView;
    setSyncInfo(j);
  }, []);

  const loadLiveSyncInfo = useCallback(async () => {
    const r = await fetch("/api/admin/nepse-hub/force-sync", { credentials: "include", cache: "no-store" });
    if (!r.ok) return;
    const j = (await r.json()) as OfficialLiveSyncView;
    setLiveSyncInfo(j);
  }, []);

  useEffect(() => {
    void loadCatalog("");
    void loadSymbol(initialSymbol);
    void loadSyncInfo();
    void loadLiveSyncInfo();
  }, [loadCatalog, loadSymbol, initialSymbol, loadSyncInfo, loadLiveSyncInfo]);

  useEffect(() => {
    const first = fields[0]?.key;
    if (first && !fields.some((f) => f.key === fieldKey)) setFieldKey(first);
  }, [domain, fields, fieldKey]);

  useEffect(() => {
    if (domain === "statements" && statementPeriods[0]?.period_key) {
      setRecordKey(statementPeriods[0].period_key);
    } else if (domain !== "statements" && domain !== "dividends" && domain !== "actions" && domain !== "news" && domain !== "technical") {
      setRecordKey("_");
    }
  }, [domain, statementPeriods]);

  const officialHint = useMemo(() => {
    if (!snapshot) return null;
    const fundamentals = snapshot.fundamentals as Record<string, unknown> | null;
    if (domain === "profile" || domain === "ownership" || domain === "market") {
      const profile = (fundamentals?.profile ?? {}) as Record<string, unknown>;
      return profile[fieldKey] ?? null;
    }
    if (domain === "ratios") {
      const valuation = (fundamentals?.valuation ?? {}) as Record<string, unknown>;
      const ratios = ((snapshot.financialIntelligence as Record<string, unknown> | null)?.ratios ?? {}) as Record<
        string,
        unknown
      >;
      return valuation[fieldKey] ?? ratios[fieldKey] ?? null;
    }
    return null;
  }, [snapshot, domain, fieldKey]);

  async function mutate(action: "set" | "restore_field" | "restore_company") {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      let value: unknown = valueText;
      const fieldDef = fields.find((f) => f.key === fieldKey);
      if (action === "set") {
        if (fieldDef?.type === "number") {
          const n = Number(valueText);
          if (!Number.isFinite(n)) {
            setError("Enter a valid number.");
            return;
          }
          value = n;
        } else if (fieldDef?.type === "boolean") {
          value = valueText.trim().toLowerCase() === "true";
        } else if (fieldDef?.type === "json") {
          try {
            value = JSON.parse(valueText);
          } catch {
            setError("Invalid JSON.");
            return;
          }
        }
      }

      const body =
        action === "restore_company"
          ? { action, note: note || undefined }
          : {
              action,
              domain,
              recordKey: recordKey || "_",
              fieldKey,
              value: action === "set" ? value : undefined,
              officialSnapshot: action === "set" ? officialHint : undefined,
              note: note || undefined,
            };

      const r = await fetch(`/api/admin/nepse-hub/${encodeURIComponent(symbol)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string; restored?: number };
      if (!r.ok) {
        setError(j.error ?? "Request failed");
        return;
      }
      setMessage(
        action === "restore_company"
          ? `Restored official data (${j.restored ?? 0} overrides removed).`
          : action === "restore_field"
            ? "Field restored to official data."
            : "Override saved. Automatic ingestion still runs; this field stays manual until restored.",
      );
      await loadSymbol(symbol);
    } finally {
      setBusy(false);
    }
  }

  async function runCompanyMasterSyncNow() {
    setSyncBusy(true);
    setError(null);
    setMessage(null);
    try {
      const r = await fetch("/api/admin/nepse-hub/company-master-sync", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      const j = (await r.json().catch(() => ({}))) as {
        ok?: boolean;
        result?: { message?: string; totalSeen?: number; sectorCounts?: Record<string, number> };
        error?: string;
      };
      if (!r.ok || !j.ok) {
        setError(j.error ?? "Company master sync failed");
        return;
      }
      setMessage(
        j.result?.message ??
          `Company master synchronized (${j.result?.totalSeen?.toLocaleString("en-IN") ?? "0"} companies).`,
      );
      await loadSyncInfo();
      await loadCatalog(query);
      await loadSymbol(symbol);
    } finally {
      setSyncBusy(false);
    }
  }

  async function runOfficialMarketForceSync() {
    setForceSyncBusy(true);
    setError(null);
    setMessage(null);
    try {
      const r = await fetch("/api/admin/nepse-hub/force-sync", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      const j = (await r.json().catch(() => ({}))) as {
        ok?: boolean;
        result?: {
          message?: string;
          lastSuccessfulSyncAt?: string | null;
          indexValue?: number | null;
        };
        error?: string;
      };
      if (!r.ok || !j.ok) {
        setError(j.result?.message ?? j.error ?? "Official NEPSE force sync failed");
        await loadLiveSyncInfo();
        return;
      }
      setMessage(
        j.result?.message ??
          `Official NEPSE synchronized — index ${j.result?.indexValue ?? "n/a"} at ${j.result?.lastSuccessfulSyncAt ?? "n/a"}.`,
      );
      await loadLiveSyncInfo();
    } finally {
      setForceSyncBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1200px] px-3 py-4 sm:px-5 sm:py-6">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-white/[0.06] pb-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300/80">Restricted</p>
          <h1 className="mt-1 text-xl font-black tracking-tight text-white sm:text-2xl">NEPSE Hub Admin</h1>
          <p className="mt-1 max-w-2xl text-xs font-medium text-zinc-400">
            Manual field overrides for company data. Cron keeps ingesting official values; overrides win only for
            edited fields. Restore returns a field or whole company to official data.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={forceSyncBusy}
            onClick={() => void runOfficialMarketForceSync()}
            className="rounded-lg border border-sky-300/40 bg-sky-500/15 px-3 py-2 text-[11px] font-black text-sky-100 hover:bg-sky-500/25 disabled:opacity-50"
          >
            {forceSyncBusy ? "Force syncing…" : "Force Sync (Official NEPSE)"}
          </button>
          <button
            type="button"
            disabled={syncBusy}
            onClick={() => void runCompanyMasterSyncNow()}
            className="rounded-lg border border-emerald-300/40 bg-emerald-500/15 px-3 py-2 text-[11px] font-black text-emerald-100 hover:bg-emerald-500/25 disabled:opacity-50"
          >
            {syncBusy ? "Syncing…" : "Sync Now (Official Company Master)"}
          </button>
          <Link
            href="/market"
            className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] font-bold text-zinc-300 hover:bg-white/[0.06]"
          >
            NEPSE Hub
          </Link>
          <Link
            href="/hub"
            className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] font-bold text-zinc-300 hover:bg-white/[0.06]"
          >
            Exit
          </Link>
        </div>
      </header>

      {liveSyncInfo?.latestSnapshot ? (
        <section className="mb-4 rounded-2xl border border-sky-300/20 bg-sky-500/[0.07] px-4 py-3 text-xs text-sky-50">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-sky-200/80">
            Official NEPSE live sync · {liveSyncInfo.source}
          </p>
          <p className="mt-1 font-bold">
            Last successful sync: {new Date(liveSyncInfo.latestSnapshot.syncedAt).toLocaleString("en-GB", {
              timeZone: "Asia/Kathmandu",
              hour12: false,
            })}{" "}
            NPT
          </p>
          <p className="mt-1 text-sky-100/90">
            {liveSyncInfo.latestSnapshot.indexName ?? "NEPSE Index"}:{" "}
            {liveSyncInfo.latestSnapshot.indexValue?.toLocaleString("en-IN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }) ?? "—"}{" "}
            ({liveSyncInfo.latestSnapshot.indexChangeNpr ?? "—"} / {liveSyncInfo.latestSnapshot.indexChangePct ?? "—"}
            %) · Turnover {liveSyncInfo.latestSnapshot.totalTurnoverNpr?.toLocaleString("en-IN") ?? "—"} · Adv/Dec/Unch{" "}
            {liveSyncInfo.latestSnapshot.advancing ?? "—"}/
            {liveSyncInfo.latestSnapshot.declining ?? "—"}/
            {liveSyncInfo.latestSnapshot.unchanged ?? "—"}
          </p>
        </section>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
          <label className="block text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">
            Find company
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                void loadCatalog(e.target.value);
              }}
              placeholder="Symbol or name"
              className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/40"
            />
          </label>
          <div className="max-h-[60vh] space-y-1 overflow-y-auto pr-1">
            {companies.map((c) => (
              <button
                key={c.symbol}
                type="button"
                onClick={() => void loadSymbol(c.symbol)}
                className={`flex w-full flex-col rounded-lg px-2.5 py-2 text-left transition ${
                  symbol === c.symbol ? "bg-emerald-500/15 text-emerald-100" : "hover:bg-white/[0.04] text-zinc-300"
                }`}
              >
                <span className="text-xs font-black">{c.symbol}</span>
                <span className="truncate text-[10px] text-zinc-500">{c.company_name ?? c.sector ?? "—"}</span>
              </button>
            ))}
          </div>
        </aside>

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">Selected</p>
              <p className="text-lg font-black text-white">{symbol}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/market/company/${encodeURIComponent(symbol)}`}
                className="rounded-lg border border-white/10 px-3 py-2 text-[11px] font-bold text-zinc-300 hover:bg-white/[0.05]"
              >
                Open company page
              </Link>
              <button
                type="button"
                disabled={busy}
                onClick={() => void mutate("restore_company")}
                className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-[11px] font-black text-amber-100 hover:bg-amber-500/20 disabled:opacity-50"
              >
                Restore Official Data (Company)
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3 sm:p-4">
            <div className="mb-3 flex flex-wrap gap-1">
              {(Object.keys(NEPSE_HUB_ADMIN_DOMAIN_LABELS) as NepseHubAdminDomain[]).map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setDomain(id)}
                  className={`rounded-lg px-2.5 py-1.5 text-[10px] font-black transition sm:text-[11px] ${
                    domain === id
                      ? "bg-emerald-500/18 text-emerald-100 shadow-[inset_0_0_0_1px_rgba(52,211,153,0.28)]"
                      : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200"
                  }`}
                >
                  {NEPSE_HUB_ADMIN_DOMAIN_LABELS[id]}
                </button>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {(domain === "statements" || domain === "dividends" || domain === "actions" || domain === "news" || domain === "technical" || domain === "custom") && (
                <label className="block text-[10px] font-black uppercase tracking-[0.14em] text-zinc-500">
                  Record key
                  {domain === "statements" && statementPeriods.length ? (
                    <select
                      value={recordKey}
                      onChange={(e) => setRecordKey(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
                    >
                      {statementPeriods.map((p) => (
                        <option key={p.period_key} value={p.period_key}>
                          {p.period_label || p.period_key} ({p.period_type})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={recordKey}
                      onChange={(e) => setRecordKey(e.target.value)}
                      placeholder={domain === "dividends" ? "fiscal year" : domain === "actions" || domain === "news" ? "row id" : "_"}
                      className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
                    />
                  )}
                </label>
              )}

              <label className="block text-[10px] font-black uppercase tracking-[0.14em] text-zinc-500">
                Field
                <select
                  value={fieldKey}
                  onChange={(e) => setFieldKey(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
                >
                  {fields.map((f) => (
                    <option key={f.key} value={f.key}>
                      {f.label}
                    </option>
                  ))}
                  {domain === "custom" ? <option value="value">Custom JSON value</option> : null}
                </select>
              </label>

              <label className="block text-[10px] font-black uppercase tracking-[0.14em] text-zinc-500 sm:col-span-2">
                Override value
                <textarea
                  value={valueText}
                  onChange={(e) => setValueText(e.target.value)}
                  rows={3}
                  placeholder="Enter the manual value (numbers without commas)"
                  className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
                />
              </label>

              <label className="block text-[10px] font-black uppercase tracking-[0.14em] text-zinc-500 sm:col-span-2">
                Note (optional)
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
                />
              </label>
            </div>

            <p className="mt-3 text-[11px] text-zinc-500">
              Current official snapshot for this field:{" "}
              <span className="font-mono text-zinc-300">
                {officialHint == null || officialHint === "" ? "null / unavailable" : String(officialHint)}
              </span>
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void mutate("set")}
                className="rounded-lg bg-emerald-500 px-3 py-2 text-[11px] font-black text-emerald-950 hover:bg-emerald-400 disabled:opacity-50"
              >
                Save override
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void mutate("restore_field")}
                className="rounded-lg border border-white/15 px-3 py-2 text-[11px] font-black text-zinc-200 hover:bg-white/[0.05] disabled:opacity-50"
              >
                Restore Official Data (Field)
              </button>
            </div>

            {error ? <p className="mt-3 text-xs font-bold text-rose-300">{error}</p> : null}
            {message ? <p className="mt-3 text-xs font-bold text-emerald-300">{message}</p> : null}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">Official Company Master</p>
              <p className="mt-1 text-xs text-zinc-400">
                Automatic sync runs before open, after close, and weekly validation. This panel can trigger manual sync.
              </p>
              {syncInfo?.latestRun ? (
                <div className="mt-3 rounded-lg border border-white/[0.05] bg-black/20 p-2.5 text-[11px] text-zinc-300">
                  <p>
                    Last run: <span className="font-black">{String(syncInfo.latestRun.status ?? "—")}</span> ·{" "}
                    {String(syncInfo.latestRun.mode ?? "—")}
                  </p>
                  <p className="mt-0.5 text-zinc-500">{String(syncInfo.latestRun.message ?? "")}</p>
                </div>
              ) : null}
              {syncInfo?.liveSectorCounts ? (
                <div className="mt-3 max-h-48 space-y-1 overflow-y-auto rounded-lg border border-white/[0.05] bg-black/20 p-2.5">
                  {Object.entries(syncInfo.liveSectorCounts)
                    .sort((a, b) => a[0].localeCompare(b[0]))
                    .map(([sector, count]) => (
                      <p key={sector} className="flex items-center justify-between text-[11px] text-zinc-300">
                        <span className="truncate pr-2">{sector}</span>
                        <span className="font-black">{count.toLocaleString("en-IN")}</span>
                      </p>
                    ))}
                </div>
              ) : null}
            </div>

            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">Active overrides</p>
              <div className="mt-2 max-h-72 space-y-2 overflow-y-auto">
                {overrides.length === 0 ? (
                  <p className="text-xs text-zinc-500">No manual overrides — all values from official ingestion.</p>
                ) : (
                  overrides.map((row) => (
                    <div key={row.id} className="rounded-lg border border-white/[0.05] bg-black/20 px-2.5 py-2">
                      <p className="text-[11px] font-black text-emerald-100">
                        {row.domain}.{row.field_key}
                        <span className="ml-1 font-medium text-zinc-500">({row.record_key})</span>
                      </p>
                      <p className="mt-0.5 break-all font-mono text-[10px] text-zinc-300">{String(unwrap(row.value_json))}</p>
                      <p className="mt-1 text-[10px] text-zinc-500">
                        {row.updated_by_email} · {new Date(row.updated_at).toLocaleString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">Audit log</p>
              <div className="mt-2 max-h-72 space-y-2 overflow-y-auto">
                {audit.length === 0 ? (
                  <p className="text-xs text-zinc-500">No admin changes recorded yet.</p>
                ) : (
                  audit.map((row) => (
                    <div key={row.id} className="rounded-lg border border-white/[0.05] bg-black/20 px-2.5 py-2">
                      <p className="text-[11px] font-black text-zinc-200">
                        {row.action}
                        {row.field_key ? ` · ${row.domain}.${row.field_key}` : ` · ${row.domain}`}
                      </p>
                      <p className="mt-1 text-[10px] text-zinc-500">
                        {row.actor_email} · {new Date(row.created_at).toLocaleString()}
                      </p>
                      {row.note ? <p className="mt-0.5 text-[10px] text-zinc-400">{row.note}</p> : null}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
