"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  NEPSE_HUB_ADMIN_FIELDS,
  NEPSE_HUB_CMS_TABS,
  type NepseHubAdminDomain,
  type NepseHubCmsTabId,
} from "@/lib/market/nepse-hub-admin-fields";
import { appToast } from "@/lib/toast";

type CompanyHit = { symbol: string; company_name: string | null; sector: string | null };

type CmsFieldCell = {
  key: string;
  label: string;
  type: string;
  value: unknown;
  officialValue: unknown;
  overridden: boolean;
  options?: { value: string; label: string }[];
};

type CmsRow = {
  recordKey: string;
  origin: "official" | "cms";
  label: string;
  values: Record<string, unknown>;
  officialValues: Record<string, unknown>;
  overriddenFields: string[];
  deleted: boolean;
};

type CmsSection = {
  tabId: NepseHubCmsTabId;
  label: string;
  domain: NepseHubAdminDomain;
  kind: "fields" | "rows";
  description?: string;
  allowCreate: boolean;
  fields: CmsFieldCell[];
  rows: CmsRow[];
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

type OverrideRow = {
  id: string;
  domain: string;
  record_key: string;
  field_key: string;
  value_json: unknown;
  updated_at: string;
  updated_by_email: string;
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
    advancing: number | null;
    declining: number | null;
    unchanged: number | null;
  } | null;
  source: string;
};

function unwrap(valueJson: unknown): unknown {
  if (valueJson && typeof valueJson === "object" && !Array.isArray(valueJson) && "v" in (valueJson as object)) {
    return (valueJson as { v: unknown }).v;
  }
  return valueJson;
}

function displayValue(value: unknown): string {
  if (value == null || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function parseFieldValue(raw: string, type: string): { ok: true; value: unknown } | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (type === "number") {
    if (trimmed === "") return { ok: true, value: null };
    const n = Number(trimmed.replace(/,/g, ""));
    if (!Number.isFinite(n)) return { ok: false, error: "Enter a valid number." };
    return { ok: true, value: n };
  }
  if (type === "boolean") return { ok: true, value: trimmed.toLowerCase() === "true" };
  if (type === "json") {
    if (trimmed === "") return { ok: true, value: null };
    try {
      return { ok: true, value: JSON.parse(trimmed) };
    } catch {
      return { ok: false, error: "Invalid JSON." };
    }
  }
  return { ok: true, value: trimmed };
}

function toastSaved(message: string, onUndo?: () => void) {
  appToast.success(message, {
    id: "nepse-cms-save",
    action: onUndo
      ? {
          label: "Undo",
          onClick: onUndo,
        }
      : undefined,
  });
}

export function NepseHubAdminClient() {
  const searchParams = useSearchParams();
  const initialSymbol = (searchParams.get("symbol") ?? "NABIL").trim().toUpperCase() || "NABIL";
  const [query, setQuery] = useState("");
  const [companies, setCompanies] = useState<CompanyHit[]>([]);
  const [symbol, setSymbol] = useState(initialSymbol);
  const [tab, setTab] = useState<NepseHubCmsTabId>("overview");
  const [snapshot, setSnapshot] = useState<Record<string, unknown> | null>(null);
  const [busy, setBusy] = useState(false);
  const [syncBusy, setSyncBusy] = useState(false);
  const [forceSyncBusy, setForceSyncBusy] = useState(false);
  const [syncInfo, setSyncInfo] = useState<CompanyMasterSyncView | null>(null);
  const [liveSyncInfo, setLiveSyncInfo] = useState<OfficialLiveSyncView | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [creating, setCreating] = useState(false);

  const cms = (snapshot?.cms as CmsSection[] | undefined) ?? [];
  const section = cms.find((s) => s.tabId === tab) ?? cms[0] ?? null;
  const overrides = (snapshot?.overrides as OverrideRow[] | undefined) ?? [];
  const audit = (snapshot?.audit as AuditRow[] | undefined) ?? [];

  const loadCatalog = useCallback(async (q: string) => {
    const r = await fetch(`/api/admin/nepse-hub?q=${encodeURIComponent(q)}`, { credentials: "include", cache: "no-store" });
    if (r.status === 403 || r.status === 401) {
      appToast.error("Forbidden — NEPSE Hub Admin is restricted.");
      return;
    }
    if (!r.ok) {
      appToast.error("Failed to load company catalog.");
      return;
    }
    const j = (await r.json()) as { companies?: CompanyHit[] };
    setCompanies(j.companies ?? []);
  }, []);

  const loadSymbol = useCallback(async (sym: string) => {
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/nepse-hub/${encodeURIComponent(sym)}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (r.status === 403 || r.status === 401) {
        appToast.error("Forbidden — NEPSE Hub Admin is restricted.");
        setSnapshot(null);
        return;
      }
      if (!r.ok) {
        appToast.error("Failed to load company CMS snapshot.");
        return;
      }
      const j = (await r.json()) as Record<string, unknown>;
      setSnapshot(j);
      setSymbol(String(j.symbol ?? sym).toUpperCase());
      setEditingField(null);
      setEditingRow(null);
      setCreating(false);
      setDraft({});
    } finally {
      setBusy(false);
    }
  }, []);

  const loadSyncInfo = useCallback(async () => {
    const r = await fetch("/api/admin/nepse-hub/company-master-sync", { credentials: "include", cache: "no-store" });
    if (!r.ok) return;
    setSyncInfo((await r.json()) as CompanyMasterSyncView);
  }, []);

  const loadLiveSyncInfo = useCallback(async () => {
    const r = await fetch("/api/admin/nepse-hub/force-sync", { credentials: "include", cache: "no-store" });
    if (!r.ok) return;
    setLiveSyncInfo((await r.json()) as OfficialLiveSyncView);
  }, []);

  useEffect(() => {
    void loadCatalog("");
    void loadSymbol(initialSymbol);
    void loadSyncInfo();
    void loadLiveSyncInfo();
  }, [loadCatalog, loadSymbol, initialSymbol, loadSyncInfo, loadLiveSyncInfo]);

  const undo = useCallback(async () => {
    const r = await fetch(`/api/admin/nepse-hub/${encodeURIComponent(symbol)}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "undo" }),
    });
    const j = (await r.json().catch(() => ({}))) as { error?: string; undoneAction?: string };
    if (!r.ok) {
      appToast.error(j.error ?? "Undo failed");
      return;
    }
    appToast.info(`Undid ${j.undoneAction ?? "change"}`, { id: "nepse-cms-undo" });
    await loadSymbol(symbol);
  }, [symbol, loadSymbol]);

  async function patch(body: Record<string, unknown>, successMessage: string) {
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/nepse-hub/${encodeURIComponent(symbol)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string; restored?: number };
      if (!r.ok) {
        appToast.error(j.error ?? "Request failed");
        return false;
      }
      toastSaved(successMessage, () => {
        void undo();
      });
      await loadSymbol(symbol);
      return true;
    } finally {
      setBusy(false);
    }
  }

  function beginEditField(field: CmsFieldCell) {
    setEditingRow(null);
    setCreating(false);
    setEditingField(field.key);
    setDraft({ [field.key]: field.value == null ? "" : String(field.value) });
  }

  function beginEditRow(row: CmsRow) {
    setEditingField(null);
    setCreating(false);
    setEditingRow(row.recordKey);
    const next: Record<string, string> = {};
    for (const f of section?.fields ?? []) {
      const v = row.values[f.key];
      next[f.key] = v == null ? "" : String(v);
    }
    setDraft(next);
  }

  function beginCreateRow() {
    setEditingField(null);
    setEditingRow(null);
    setCreating(true);
    const next: Record<string, string> = {};
    for (const f of section?.fields ?? []) next[f.key] = "";
    setDraft(next);
  }

  async function saveField(field: CmsFieldCell) {
    if (!section) return;
    const parsed = parseFieldValue(draft[field.key] ?? "", field.type);
    if (!parsed.ok) {
      appToast.validation(parsed.error);
      return;
    }
    await patch(
      {
        action: "set",
        domain: section.domain,
        recordKey: "_",
        fieldKey: field.key,
        value: parsed.value,
        officialSnapshot: field.officialValue,
      },
      `Saved ${field.label}`,
    );
  }

  async function saveRow(recordKey: string | null) {
    if (!section) return;
    const fields: Record<string, unknown> = {};
    const officialSnapshots: Record<string, unknown> = {};
    for (const f of section.fields) {
      const parsed = parseFieldValue(draft[f.key] ?? "", f.type);
      if (!parsed.ok) {
        appToast.validation(`${f.label}: ${parsed.error}`);
        return;
      }
      if (draft[f.key] === "" && f.type !== "number") continue;
      fields[f.key] = parsed.value;
      const existing = section.rows.find((r) => r.recordKey === recordKey);
      if (existing) officialSnapshots[f.key] = existing.officialValues[f.key] ?? null;
    }

    if (creating || !recordKey) {
      // Prefer fiscal year as record key for dividends
      const preferred =
        section.domain === "dividends" && typeof fields.fiscalYear === "string"
          ? String(fields.fiscalYear)
          : undefined;
      await patch(
        {
          action: "create_record",
          domain: section.domain,
          fields,
          preferredRecordKey: preferred,
        },
        "Row created",
      );
      return;
    }

    await patch(
      {
        action: "set_fields",
        domain: section.domain,
        recordKey,
        fields,
        officialSnapshots,
      },
      "Row saved",
    );
  }

  async function restoreField(field: CmsFieldCell) {
    if (!section) return;
    await patch(
      {
        action: "restore_field",
        domain: section.domain,
        recordKey: "_",
        fieldKey: field.key,
      },
      `Restored official ${field.label}`,
    );
  }

  async function deleteRow(row: CmsRow) {
    if (!section) return;
    await patch(
      {
        action: "delete_record",
        domain: section.domain,
        recordKey: row.recordKey,
      },
      row.origin === "cms" ? "Row deleted" : "Official row hidden",
    );
  }

  async function restoreRow(row: CmsRow) {
    if (!section) return;
    await patch(
      {
        action: "restore_record",
        domain: section.domain,
        recordKey: row.recordKey,
      },
      "Restored official row",
    );
  }

  async function restoreCompany() {
    await patch({ action: "restore_company" }, "Company restored to official data");
  }

  async function runCompanyMasterSyncNow() {
    setSyncBusy(true);
    try {
      const r = await fetch("/api/admin/nepse-hub/company-master-sync", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      const j = (await r.json().catch(() => ({}))) as {
        ok?: boolean;
        result?: { message?: string };
        error?: string;
      };
      if (!r.ok || !j.ok) {
        appToast.error(j.error ?? "Company master sync failed");
        return;
      }
      appToast.success(j.result?.message ?? "Company master synchronized");
      await loadSyncInfo();
      await loadCatalog(query);
      await loadSymbol(symbol);
    } finally {
      setSyncBusy(false);
    }
  }

  async function runOfficialMarketForceSync() {
    setForceSyncBusy(true);
    try {
      const r = await fetch("/api/admin/nepse-hub/force-sync", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      const j = (await r.json().catch(() => ({}))) as {
        ok?: boolean;
        result?: { message?: string; indexValue?: number | null };
        error?: string;
      };
      if (!r.ok || !j.ok) {
        appToast.error(j.result?.message ?? j.error ?? "Official NEPSE force sync failed");
        await loadLiveSyncInfo();
        return;
      }
      appToast.success(j.result?.message ?? `Official NEPSE synchronized — index ${j.result?.indexValue ?? "n/a"}`);
      await loadLiveSyncInfo();
    } finally {
      setForceSyncBusy(false);
    }
  }

  const previewColumns = useMemo(() => {
    if (!section || section.kind !== "rows") return [];
    const preferred = (NEPSE_HUB_ADMIN_FIELDS[section.domain] ?? []).slice(0, 6);
    return preferred;
  }, [section]);

  return (
    <div className="mx-auto max-w-[1400px] px-3 py-4 sm:px-5 sm:py-6">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-white/[0.06] pb-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300/80">Institutional CMS</p>
          <h1 className="mt-1 text-xl font-black tracking-tight text-white sm:text-2xl">NEPSE Hub Admin</h1>
          <p className="mt-1 max-w-2xl text-xs font-medium text-zinc-400">
            Spreadsheet-like content management for every company page section. Edit rows and cards directly — no
            manual Record Keys. Cron keeps syncing official data; only edited fields override.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void undo()}
            className="rounded-lg border border-white/15 bg-white/[0.03] px-3 py-2 text-[11px] font-black text-zinc-200 hover:bg-white/[0.06] disabled:opacity-50"
          >
            Undo
          </button>
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
            {syncBusy ? "Syncing…" : "Sync Now (Company Master)"}
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
            Last successful sync:{" "}
            {new Date(liveSyncInfo.latestSnapshot.syncedAt).toLocaleString("en-GB", {
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
            %) · Adv/Dec/Unch {liveSyncInfo.latestSnapshot.advancing ?? "—"}/
            {liveSyncInfo.latestSnapshot.declining ?? "—"}/{liveSyncInfo.latestSnapshot.unchanged ?? "—"}
          </p>
        </section>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
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
          <div className="max-h-[70vh] space-y-1 overflow-y-auto pr-1">
            {companies.map((c) => (
              <button
                key={c.symbol}
                type="button"
                onClick={() => void loadSymbol(c.symbol)}
                className={`flex w-full flex-col rounded-lg px-2.5 py-2 text-left transition ${
                  symbol === c.symbol ? "bg-emerald-500/15 text-emerald-100" : "text-zinc-300 hover:bg-white/[0.04]"
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
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">Selected company</p>
              <p className="text-lg font-black text-white">{symbol}</p>
              <p className="text-[11px] text-zinc-500">{busy ? "Saving / loading…" : "Ready"}</p>
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
                onClick={() => void restoreCompany()}
                className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-[11px] font-black text-amber-100 hover:bg-amber-500/20 disabled:opacity-50"
              >
                Restore Official Data (Company)
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3 sm:p-4">
            <div className="mb-3 flex flex-wrap gap-1">
              {NEPSE_HUB_CMS_TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setTab(t.id);
                    setEditingField(null);
                    setEditingRow(null);
                    setCreating(false);
                    setDraft({});
                  }}
                  className={`rounded-lg px-2.5 py-1.5 text-[10px] font-black transition sm:text-[11px] ${
                    tab === t.id
                      ? "bg-emerald-500/18 text-emerald-100 shadow-[inset_0_0_0_1px_rgba(52,211,153,0.28)]"
                      : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {section ? (
              <>
                <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-black text-white">{section.label}</h2>
                    {section.description ? <p className="mt-0.5 text-[11px] text-zinc-500">{section.description}</p> : null}
                  </div>
                  {section.allowCreate ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => beginCreateRow()}
                      className="rounded-lg bg-emerald-500 px-3 py-2 text-[11px] font-black text-emerald-950 hover:bg-emerald-400 disabled:opacity-50"
                    >
                      Add Row
                    </button>
                  ) : null}
                </div>

                {section.kind === "fields" ? (
                  <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
                    <table className="min-w-full text-left text-xs">
                      <thead className="bg-white/[0.03] text-[10px] uppercase tracking-[0.12em] text-zinc-500">
                        <tr>
                          <th className="px-3 py-2 font-black">Field</th>
                          <th className="px-3 py-2 font-black">Value</th>
                          <th className="px-3 py-2 font-black">Official</th>
                          <th className="px-3 py-2 font-black">Status</th>
                          <th className="px-3 py-2 font-black">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {section.fields.map((field) => {
                          const isEditing = editingField === field.key;
                          return (
                            <tr key={field.key} className="border-t border-white/[0.04]">
                              <td className="px-3 py-2 font-bold text-zinc-200">{field.label}</td>
                              <td className="px-3 py-2 text-zinc-100">
                                {isEditing ? (
                                  field.options ? (
                                    <select
                                      value={draft[field.key] ?? ""}
                                      onChange={(e) => setDraft((d) => ({ ...d, [field.key]: e.target.value }))}
                                      className="w-full rounded border border-white/15 bg-black/50 px-2 py-1.5 text-xs text-white"
                                    >
                                      <option value="">—</option>
                                      {field.options.map((o) => (
                                        <option key={o.value} value={o.value}>
                                          {o.label}
                                        </option>
                                      ))}
                                    </select>
                                  ) : (
                                    <input
                                      value={draft[field.key] ?? ""}
                                      onChange={(e) => setDraft((d) => ({ ...d, [field.key]: e.target.value }))}
                                      className="w-full rounded border border-white/15 bg-black/50 px-2 py-1.5 text-xs text-white"
                                      autoFocus
                                    />
                                  )
                                ) : (
                                  <span className="font-mono text-[11px]">{displayValue(field.value)}</span>
                                )}
                              </td>
                              <td className="px-3 py-2 font-mono text-[11px] text-zinc-500">
                                {displayValue(field.officialValue)}
                              </td>
                              <td className="px-3 py-2">
                                {field.overridden ? (
                                  <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-black text-amber-100">
                                    Manual
                                  </span>
                                ) : (
                                  <span className="rounded bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-black text-zinc-400">
                                    Official
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2">
                                <div className="flex flex-wrap gap-1.5">
                                  {isEditing ? (
                                    <>
                                      <button
                                        type="button"
                                        disabled={busy}
                                        onClick={() => void saveField(field)}
                                        className="rounded bg-emerald-500 px-2 py-1 text-[10px] font-black text-emerald-950 disabled:opacity-50"
                                      >
                                        Save
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingField(null);
                                          setDraft({});
                                        }}
                                        className="rounded border border-white/10 px-2 py-1 text-[10px] font-bold text-zinc-300"
                                      >
                                        Cancel
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => beginEditField(field)}
                                        className="rounded border border-white/10 px-2 py-1 text-[10px] font-black text-zinc-200 hover:bg-white/[0.05]"
                                      >
                                        Edit
                                      </button>
                                      {field.overridden ? (
                                        <button
                                          type="button"
                                          disabled={busy}
                                          onClick={() => void restoreField(field)}
                                          className="rounded border border-amber-400/30 px-2 py-1 text-[10px] font-black text-amber-100 hover:bg-amber-500/10 disabled:opacity-50"
                                        >
                                          Restore Official
                                        </button>
                                      ) : null}
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(creating || editingRow) && (
                      <div className="rounded-xl border border-emerald-400/25 bg-emerald-500/[0.06] p-3">
                        <p className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-200/80">
                          {creating ? "Add row" : "Edit row"}
                        </p>
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {section.fields.map((field) => (
                            <label key={field.key} className="block text-[10px] font-black uppercase tracking-[0.12em] text-zinc-500">
                              {field.label}
                              {field.options ? (
                                <select
                                  value={draft[field.key] ?? ""}
                                  onChange={(e) => setDraft((d) => ({ ...d, [field.key]: e.target.value }))}
                                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-2.5 py-2 text-xs text-white"
                                >
                                  <option value="">—</option>
                                  {field.options.map((o) => (
                                    <option key={o.value} value={o.value}>
                                      {o.label}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <input
                                  value={draft[field.key] ?? ""}
                                  onChange={(e) => setDraft((d) => ({ ...d, [field.key]: e.target.value }))}
                                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-2.5 py-2 text-xs text-white"
                                />
                              )}
                            </label>
                          ))}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void saveRow(creating ? null : editingRow)}
                            className="rounded-lg bg-emerald-500 px-3 py-2 text-[11px] font-black text-emerald-950 hover:bg-emerald-400 disabled:opacity-50"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCreating(false);
                              setEditingRow(null);
                              setDraft({});
                            }}
                            className="rounded-lg border border-white/15 px-3 py-2 text-[11px] font-bold text-zinc-300"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
                      <table className="min-w-full text-left text-xs">
                        <thead className="bg-white/[0.03] text-[10px] uppercase tracking-[0.12em] text-zinc-500">
                          <tr>
                            <th className="px-3 py-2 font-black">Row</th>
                            {previewColumns.map((c) => (
                              <th key={c.key} className="px-3 py-2 font-black">
                                {c.label}
                              </th>
                            ))}
                            <th className="px-3 py-2 font-black">Status</th>
                            <th className="px-3 py-2 font-black">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {section.rows.length === 0 ? (
                            <tr>
                              <td colSpan={previewColumns.length + 3} className="px-3 py-6 text-center text-zinc-500">
                                No rows yet. Use Add Row to create one.
                              </td>
                            </tr>
                          ) : (
                            section.rows.map((row) => (
                              <tr
                                key={row.recordKey}
                                className={`border-t border-white/[0.04] ${row.deleted ? "opacity-50" : ""}`}
                              >
                                <td className="px-3 py-2">
                                  <p className="font-bold text-zinc-100">{row.label}</p>
                                  <p className="text-[10px] text-zinc-500">
                                    {row.origin === "cms" ? "CMS" : "Official"}
                                  </p>
                                </td>
                                {previewColumns.map((c) => (
                                  <td key={c.key} className="px-3 py-2 font-mono text-[11px] text-zinc-300">
                                    {displayValue(row.values[c.key])}
                                  </td>
                                ))}
                                <td className="px-3 py-2">
                                  {row.deleted ? (
                                    <span className="rounded bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-black text-rose-100">
                                      Deleted
                                    </span>
                                  ) : row.overriddenFields.length ? (
                                    <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-black text-amber-100">
                                      {row.overriddenFields.length} edited
                                    </span>
                                  ) : (
                                    <span className="rounded bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-black text-zinc-400">
                                      Official
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 py-2">
                                  <div className="flex flex-wrap gap-1.5">
                                    {!row.deleted ? (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => beginEditRow(row)}
                                          className="rounded border border-white/10 px-2 py-1 text-[10px] font-black text-zinc-200 hover:bg-white/[0.05]"
                                        >
                                          Edit
                                        </button>
                                        <button
                                          type="button"
                                          disabled={busy}
                                          onClick={() => void deleteRow(row)}
                                          className="rounded border border-rose-400/30 px-2 py-1 text-[10px] font-black text-rose-100 hover:bg-rose-500/10 disabled:opacity-50"
                                        >
                                          Delete
                                        </button>
                                      </>
                                    ) : null}
                                    {(row.deleted || row.overriddenFields.length > 0 || row.origin === "cms") && (
                                      <button
                                        type="button"
                                        disabled={busy}
                                        onClick={() => void restoreRow(row)}
                                        className="rounded border border-amber-400/30 px-2 py-1 text-[10px] font-black text-amber-100 hover:bg-amber-500/10 disabled:opacity-50"
                                      >
                                        Restore Official
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-xs text-zinc-500">Load a company to edit content.</p>
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">Official Company Master</p>
              <p className="mt-1 text-xs text-zinc-400">
                Automatic sync runs before open, after close, and weekly. Manual sync available above.
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
            </div>

            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">Active overrides</p>
              <div className="mt-2 max-h-56 space-y-2 overflow-y-auto">
                {overrides.length === 0 ? (
                  <p className="text-xs text-zinc-500">No manual overrides — all values from official ingestion.</p>
                ) : (
                  overrides.slice(0, 40).map((row) => (
                    <div key={row.id} className="rounded-lg border border-white/[0.05] bg-black/20 px-2.5 py-2">
                      <p className="text-[11px] font-black text-emerald-100">
                        {row.domain}.{row.field_key}
                        <span className="ml-1 font-medium text-zinc-500">({row.record_key})</span>
                      </p>
                      <p className="mt-0.5 break-all font-mono text-[10px] text-zinc-300">
                        {String(unwrap(row.value_json))}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3 lg:col-span-2">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">Audit log</p>
              <div className="mt-2 max-h-56 space-y-2 overflow-y-auto">
                {audit.length === 0 ? (
                  <p className="text-xs text-zinc-500">No admin changes recorded yet.</p>
                ) : (
                  audit.map((row) => (
                    <div key={row.id} className="rounded-lg border border-white/[0.05] bg-black/20 px-2.5 py-2">
                      <p className="text-[11px] font-black text-zinc-200">
                        {row.action}
                        {row.field_key ? ` · ${row.domain}.${row.field_key}` : ` · ${row.domain}`}
                        <span className="ml-1 font-medium text-zinc-500">({row.record_key})</span>
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
