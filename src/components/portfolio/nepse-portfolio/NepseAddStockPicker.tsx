"use client";

import { Search } from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import type { InvestmentRow, WealthPortfolioStateV2 } from "@/components/portfolio/types";
import { portfolioTxnTodayIso } from "@/components/portfolio/transaction-ui/PortfolioTransactionStrip";
import {
  filterMasterInstruments,
  primaryLabel,
  secondaryLabel,
} from "@/lib/investment-market/registry";
import type { MasterInstrument } from "@/lib/investment-market/types";
import type { NepseSecurityTick } from "@/types/market";

function newPortfolioRowId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Find an existing NEPSE holding or append a zero-quantity watch row so Stock Detail can open.
 * Does not record a ledger buy — the user buys from Stock Detail.
 */
export function ensureNepseHoldingRow(
  state: WealthPortfolioStateV2,
  selection: Pick<InvestmentRow, "instrumentKey" | "name" | "currency">,
): { next: WealthPortfolioStateV2; rowId: string } | null {
  const key = selection.instrumentKey?.trim();
  const name = selection.name.trim();
  if (!key && !name) return null;

  const existing = state.investments.find(
    (r) =>
      r.kind === "nepse" &&
      ((key && r.instrumentKey === key) || (!!name && r.name.trim().toLowerCase() === name.toLowerCase())),
  );
  if (existing) return { next: state, rowId: existing.id };

  const row: InvestmentRow = {
    id: newPortfolioRowId(),
    kind: "nepse",
    name: name || key || "NEPSE",
    quantity: undefined,
    buyPrice: undefined,
    currency: selection.currency ?? "NPR",
    instrumentKey: key,
    purchaseDate: portfolioTxnTodayIso(),
  };
  return { next: { ...state, investments: [...state.investments, row] }, rowId: row.id };
}

type ComboRow = { kind: "live"; hit: NepseSecurityTick } | { kind: "reg"; inst: MasterInstrument };

function selectionFromRow(row: ComboRow): Pick<InvestmentRow, "instrumentKey" | "name" | "currency"> {
  if (row.kind === "live") {
    const sym = row.hit.symbol.toUpperCase();
    return {
      instrumentKey: `yonepse:nepse:${sym}`,
      name: row.hit.companyName?.trim() || sym,
      currency: "NPR",
    };
  }
  const inst = row.inst;
  if (inst.universe === "nepse") {
    return {
      instrumentKey: inst.key,
      name: inst.companyName,
      currency: "NPR",
    };
  }
  return {
    instrumentKey: inst.key,
    name: primaryLabel(inst),
    currency: "NPR",
  };
}

export function NepseAddStockPicker({
  onMutate,
  onSelected,
}: {
  onMutate: (fn: (s: WealthPortfolioStateV2) => WealthPortfolioStateV2 | null) => boolean;
  onSelected: (rowId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [liveHits, setLiveHits] = useState<NepseSecurityTick[]>([]);
  const [liveBusy, setLiveBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const registryHits = useMemo(
    () => filterMasterInstruments("nepse", deferredQuery).slice(0, 40),
    [deferredQuery],
  );

  const combinedRows = useMemo((): ComboRow[] => {
    const rows: ComboRow[] = [];
    const q = deferredQuery.trim();
    if (q) {
      for (const h of liveHits) rows.push({ kind: "live", hit: h });
    }
    for (const inst of registryHits) {
      if (inst.universe !== "nepse") continue;
      rows.push({ kind: "reg", inst });
    }
    return rows.slice(0, 56);
  }, [deferredQuery, liveHits, registryHits]);

  useEffect(() => {
    const q = deferredQuery.trim();
    if (q.length < 1) {
      setLiveHits([]);
      return;
    }
    const ac = new AbortController();
    const t = window.setTimeout(() => {
      setLiveBusy(true);
      const u = new URL("/api/market/nepse/search", window.location.origin);
      u.searchParams.set("q", q);
      u.searchParams.set("limit", "18");
      void fetch(u.toString(), { signal: ac.signal, cache: "no-store" })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
        .then((body: { hits?: NepseSecurityTick[] }) => {
          setLiveHits(Array.isArray(body.hits) ? body.hits : []);
        })
        .catch(() => {
          if (!ac.signal.aborted) setLiveHits([]);
        })
        .finally(() => {
          if (!ac.signal.aborted) setLiveBusy(false);
        });
    }, 280);
    return () => {
      window.clearTimeout(t);
      ac.abort();
    };
  }, [deferredQuery]);

  const openCompany = (row: ComboRow) => {
    setErr(null);
    const selection = selectionFromRow(row);
    let openedId: string | null = null;
    const ok = onMutate((state) => {
      const ensured = ensureNepseHoldingRow(state, selection);
      if (!ensured) return null;
      openedId = ensured.rowId;
      return ensured.next;
    });
    if (!ok || !openedId) {
      setErr("Could not open this company. Try another symbol.");
      return;
    }
    onSelected(openedId);
  };

  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold leading-relaxed text-emerald-100/65">
        Search NEPSE by symbol or company name. Selecting a company opens Stock Detail — then use BUY to
        record shares in your portfolio.
      </p>

      <label className="block">
        <span className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-emerald-100/70">
          Company / Symbol
        </span>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-emerald-300/50"
            size={15}
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search STC, Nabil, hydropower…"
            autoFocus
            autoComplete="off"
            className="wealth-input-text min-h-12 w-full rounded-2xl py-2 pl-10 pr-3 text-base font-black text-white"
          />
        </div>
      </label>

      <div className="max-h-[min(52vh,380px)] overflow-y-auto rounded-[1.15rem] border border-white/[0.08] bg-white/[0.03]">
        {liveBusy && combinedRows.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs font-bold text-emerald-100/45">Searching…</p>
        ) : null}
        {!liveBusy && deferredQuery.trim() && combinedRows.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs font-bold text-emerald-100/45">No matches</p>
        ) : null}
        {!deferredQuery.trim() && combinedRows.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs font-bold text-emerald-100/45">
            Start typing a symbol or company name
          </p>
        ) : null}
        <ul className="divide-y divide-white/[0.06]">
          {combinedRows.map((row) => {
            if (row.kind === "live") {
              const h = row.hit;
              return (
                <li key={`live-${h.symbol}`}>
                  <button
                    type="button"
                    onClick={() => openCompany(row)}
                    className="flex w-full flex-col gap-0.5 px-4 py-3 text-left transition hover:bg-white/[0.05] active:bg-white/[0.07]"
                  >
                    <span className="text-sm font-black text-white">
                      {h.symbol}{" "}
                      <span className="text-[10px] font-bold uppercase tracking-wide text-cyan-200/80">
                        Live
                      </span>
                    </span>
                    <span className="text-[11px] font-semibold text-emerald-100/55">
                      {h.companyName ?? "—"}
                    </span>
                    <span className="text-[10px] font-bold tabular-nums text-amber-200/85">
                      LTP {h.ltpNpr.toLocaleString("en-US", { maximumFractionDigits: 2 })} NPR
                    </span>
                  </button>
                </li>
              );
            }
            const inst = row.inst;
            return (
              <li key={inst.key}>
                <button
                  type="button"
                  onClick={() => openCompany(row)}
                  className="flex w-full flex-col gap-0.5 px-4 py-3 text-left transition hover:bg-white/[0.05] active:bg-white/[0.07]"
                >
                  <span className="text-sm font-black text-white">{primaryLabel(inst)}</span>
                  <span className="text-[11px] font-semibold text-emerald-100/55">
                    {secondaryLabel(inst)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {err ? (
        <p className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-200">
          {err}
        </p>
      ) : null}

      <p className="rounded-2xl border border-amber-400/15 bg-amber-500/[0.07] px-3 py-2 text-[11px] font-semibold leading-relaxed text-amber-100/80">
        Portfolio tracking only — selecting a company does not place a NEPSE or broker order.
      </p>
    </div>
  );
}
