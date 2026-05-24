"use client";

import { ChevronDown, Search } from "lucide-react";
import { useCallback, useDeferredValue, useEffect, useId, useMemo, useRef, useState } from "react";
import type { InvestmentKind, InvestmentRow } from "@/components/portfolio/types";
import {
  filterMasterInstruments,
  getInstrumentByKey,
  primaryLabel,
  secondaryLabel,
} from "@/lib/investment-market/registry";
import type { MasterInstrument } from "@/lib/investment-market/types";
import { demoLiveUnitNpr } from "@/lib/investment-market/quotes";
import type { NepseSecurityTick } from "@/types/market";

function applyInstrumentSelection(inst: MasterInstrument): Partial<InvestmentRow> {
  switch (inst.universe) {
    case "nepse":
      return {
        instrumentKey: inst.key,
        name: inst.companyName,
        buyPrice: inst.demoLastPriceNpr,
        currency: "NPR",
      };
    case "open_end_mf":
      return {
        instrumentKey: inst.key,
        name: inst.fundName,
        buyPrice: inst.demoNavNpr,
        currency: "NPR",
      };
    case "closed_end_mf":
      return {
        instrumentKey: inst.key,
        name: inst.fundName,
        buyPrice: inst.demoLastPriceNpr,
        currency: "NPR",
      };
    case "us_stock":
      return {
        instrumentKey: inst.key,
        name: inst.companyName,
        buyPrice: inst.demoLastPriceUsd,
        currency: "USD",
      };
    case "etf":
      return {
        instrumentKey: inst.key,
        name: inst.name,
        buyPrice: inst.demoLastPriceUsd,
        currency: "USD",
      };
  }
}

function liveDirectoryPatch(kind: InvestmentKind, hit: NepseSecurityTick): Partial<InvestmentRow> {
  const sym = hit.symbol.toUpperCase();
  const nm = hit.companyName?.trim() || sym;
  const px = Number.isFinite(hit.ltpNpr) ? hit.ltpNpr : undefined;
  if (kind === "nepse") {
    return { instrumentKey: `yonepse:nepse:${sym}`, name: nm, buyPrice: px, currency: "NPR" };
  }
  if (kind === "sip") {
    return { instrumentKey: `yonepse:mf:${sym}`, name: nm, buyPrice: px, currency: "NPR" };
  }
  if (kind === "closed_end_mf") {
    return { instrumentKey: `yonepse:cef:${sym}`, name: nm, buyPrice: px, currency: "NPR" };
  }
  return {};
}

type ComboRow = { kind: "live"; hit: NepseSecurityTick } | { kind: "reg"; inst: MasterInstrument };

type Props = {
  kind: InvestmentKind;
  instrumentKey: string | undefined;
  name: string;
  usdPerNpr: number;
  onApplyInstrument: (patch: Partial<InvestmentRow>) => void;
};

const LIVE_KINDS: InvestmentKind[] = ["nepse", "sip", "closed_end_mf"];

export function InvestmentMasterSelector({ kind, instrumentKey, name, usdPerNpr, onApplyInstrument }: Props) {
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const deferredQuery = useDeferredValue(query);
  const [liveHits, setLiveHits] = useState<NepseSecurityTick[]>([]);
  const [liveBusy, setLiveBusy] = useState(false);

  const list = useMemo(
    () => filterMasterInstruments(kind, deferredQuery).slice(0, 40),
    [kind, deferredQuery],
  );

  const combinedRows = useMemo((): ComboRow[] => {
    const rows: ComboRow[] = [];
    const q = deferredQuery.trim();
    if (q && LIVE_KINDS.includes(kind)) {
      for (const h of liveHits) rows.push({ kind: "live", hit: h });
    }
    for (const inst of list) rows.push({ kind: "reg", inst });
    return rows.slice(0, 56);
  }, [deferredQuery, kind, list, liveHits]);

  const selectedInst = useMemo(() => getInstrumentByKey(instrumentKey), [instrumentKey]);

  const displayValue = useMemo(() => {
    if (!selectedInst) return name;
    switch (selectedInst.universe) {
      case "nepse":
        return `${selectedInst.symbol} — ${name.trim() || selectedInst.companyName}`;
      case "open_end_mf": {
        const code = selectedInst.key.split(":").pop() ?? primaryLabel(selectedInst);
        return `${code} — ${name.trim() || selectedInst.fundName}`;
      }
      case "closed_end_mf":
        return `${selectedInst.ticker} — ${name.trim() || selectedInst.fundName}`;
      default:
        return `${primaryLabel(selectedInst)} — ${secondaryLabel(selectedInst)}`;
    }
  }, [name, selectedInst]);

  useEffect(() => {
    if (!LIVE_KINDS.includes(kind)) {
      setLiveHits([]);
      return;
    }
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
    }, 320);
    return () => {
      window.clearTimeout(t);
      ac.abort();
    };
  }, [deferredQuery, kind]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    if (highlight >= combinedRows.length) setHighlight(Math.max(0, combinedRows.length - 1));
  }, [highlight, combinedRows.length]);

  const pickRow = useCallback(
    (row: ComboRow) => {
      if (row.kind === "live") {
        onApplyInstrument(liveDirectoryPatch(kind, row.hit));
      } else {
        onApplyInstrument(applyInstrumentSelection(row.inst));
      }
      setQuery("");
      setOpen(false);
      setHighlight(0);
      inputRef.current?.blur();
    },
    [kind, onApplyInstrument],
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      setOpen(true);
      return;
    }
    if (!open) return;
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(combinedRows.length - 1, h + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(0, h - 1));
    } else if (e.key === "Enter" && combinedRows.length) {
      e.preventDefault();
      pickRow(combinedRows[highlight] ?? combinedRows[0]);
    }
  };

  if (kind === "crypto") return null;

  const showPanel = open && (combinedRows.length > 0 || (deferredQuery.trim() && LIVE_KINDS.includes(kind)));

  return (
    <div ref={wrapRef} className="relative min-w-0 w-full">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 z-[1] -translate-y-1/2 text-emerald-300/50" size={14} />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-label="Search company or instrument"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          value={open ? query : displayValue}
          placeholder="Search symbol, fund, manager…"
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setHighlight(0);
          }}
          onFocus={() => {
            setOpen(true);
            setQuery("");
          }}
          onKeyDown={onKeyDown}
          className="wealth-input-text w-full rounded-xl border border-emerald-400/20 bg-black/35 py-2 pl-8 pr-9 text-xs font-bold text-emerald-50 outline-none focus:border-emerald-400/50 sm:text-sm"
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label="Toggle list"
          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-emerald-200/60 hover:bg-white/10"
          onClick={() => setOpen((o) => !o)}
        >
          <ChevronDown size={16} className={open ? "rotate-180 transition" : "transition"} />
        </button>
      </div>

      {showPanel ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-[min(52vh,320px)] w-full overflow-auto rounded-xl border border-emerald-400/25 bg-[#041f18]/95 py-1 shadow-[0_20px_50px_rgba(0,0,0,0.45)] backdrop-blur-xl"
        >
          {LIVE_KINDS.includes(kind) && deferredQuery.trim() && liveBusy && combinedRows.length === 0 ? (
            <li className="px-3 py-2 text-[11px] font-bold text-emerald-200/55">Searching live directory…</li>
          ) : null}
          {combinedRows.map((row, idx) => {
            const active = idx === highlight;
            if (row.kind === "live") {
              const h = row.hit;
              const ch = h.changePct;
              return (
                <li key={`live-${h.symbol}`} role="option" aria-selected={active}>
                  <button
                    type="button"
                    className={`flex w-full flex-col gap-0.5 px-3 py-2.5 text-left text-xs transition sm:text-sm ${
                      active ? "bg-cyan-500/20 text-cyan-50" : "text-emerald-100/90 hover:bg-white/5"
                    }`}
                    onMouseEnter={() => setHighlight(idx)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pickRow(row)}
                  >
                    <span className="font-black">
                      {h.symbol}{" "}
                      <span className="text-[10px] font-bold uppercase tracking-wide text-cyan-200/80">Live</span>
                    </span>
                    <span className="text-[11px] font-semibold leading-snug text-emerald-200/70">
                      {h.companyName ?? "—"}
                    </span>
                    <span className="text-[10px] font-bold text-amber-200/90 tabular-nums">
                      LTP {h.ltpNpr.toLocaleString("en-US", { maximumFractionDigits: 2 })} NPR
                      {ch != null && Number.isFinite(ch) ? (
                        <span className={ch >= 0 ? " text-lime-300" : " text-rose-300"}>
                          {" "}
                          · {ch >= 0 ? "+" : ""}
                          {ch.toFixed(2)}%
                        </span>
                      ) : null}
                    </span>
                  </button>
                </li>
              );
            }
            const inst = row.inst;
            const demoNpr = demoLiveUnitNpr(inst, usdPerNpr);
            return (
              <li key={inst.key} role="option" aria-selected={active}>
                <button
                  type="button"
                  className={`flex w-full flex-col gap-0.5 px-3 py-2.5 text-left text-xs transition sm:text-sm ${
                    active ? "bg-emerald-500/20 text-emerald-50" : "text-emerald-100/90 hover:bg-white/5"
                  }`}
                  onMouseEnter={() => setHighlight(idx)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pickRow(row)}
                >
                  <span className="font-black">{primaryLabel(inst)}</span>
                  <span className="text-[11px] font-semibold leading-snug text-emerald-200/70">{secondaryLabel(inst)}</span>
                  <span className="text-[10px] font-bold text-amber-200/90 tabular-nums">
                    Demo live ≈ {demoNpr.toLocaleString("en-US", { maximumFractionDigits: 2 })} NPR/unit
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {open && deferredQuery.trim() && combinedRows.length === 0 && !liveBusy ? (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-white/10 bg-[#041f18]/95 px-3 py-2 text-xs font-bold text-emerald-200/60">
          No matches
        </div>
      ) : null}
    </div>
  );
}
