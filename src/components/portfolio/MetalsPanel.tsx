"use client";

import { Gem, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { NumericMoneyInput } from "@/components/NumericMoneyInput";
import { mockMetalRateNprPerGram } from "@/components/portfolio/mock-prices";
import { PortfolioDateMeta } from "@/components/portfolio/PortfolioDateMeta";
import { PortfolioIsoDateField } from "@/components/portfolio/PortfolioIsoDateField";
import { ModuleLedgerCard } from "@/components/portfolio/ledger-ui/ModuleLedgerCard";
import { recordMetalBuy, recordMetalSell } from "@/components/portfolio/portfolio-ledger";
import {
  PortfolioTransactionStrip,
  portfolioTxnTodayIso,
  type TxnSegmentDef,
} from "@/components/portfolio/transaction-ui/PortfolioTransactionStrip";
import type { MetalRow, PortfolioLedgerEntry, WealthPortfolioStateV2 } from "@/components/portfolio/types";
import { formatMoney } from "@/lib/expense-utils";

function todayIso() {
  return portfolioTxnTodayIso();
}

const METAL_TX_SEGMENTS: TxnSegmentDef[] = [
  { id: "buy", label: "Buy", tone: "in" },
  { id: "sell", label: "Sell", tone: "out" },
];

function MetalTradeStrip({
  row,
  onMutate,
}: {
  row: MetalRow;
  onMutate: (fn: (s: WealthPortfolioStateV2) => WealthPortfolioStateV2 | null) => boolean;
}) {
  const [open, setOpen] = useState(false);
  const [segmentId, setSegmentId] = useState<string>("sell");
  const [gramsStr, setGramsStr] = useState("");
  const [pxStr, setPxStr] = useState("");
  const [basisStr, setBasisStr] = useState("");
  const [feesStr, setFeesStr] = useState("");
  const [notes, setNotes] = useState("");
  const [tradeDate, setTradeDate] = useState(todayIso);
  const [err, setErr] = useState<string | null>(null);

  const held = row.grams ?? 0;
  const basis = row.totalCostBasisNpr;
  const avgPerG = held > 0 && basis != null && basis > 0 ? basis / held : null;

  useEffect(() => {
    if (!open) return;
    setErr(null);
    setTradeDate(todayIso());
  }, [open, segmentId, row.id]);

  const submit = () => {
    setErr(null);
    const grams = Number(gramsStr.replace(/,/g, ""));
    if (!Number.isFinite(grams) || grams <= 0) {
      setErr("Enter valid grams.");
      return;
    }
    if (segmentId === "sell" && grams > held + 1e-9) {
      setErr("Cannot sell more grams than you hold.");
      return;
    }
    const feesNpr = feesStr.trim() === "" ? undefined : Number(feesStr.replace(/,/g, ""));
    if (feesNpr != null && (!Number.isFinite(feesNpr) || feesNpr < 0)) {
      setErr("Fees must be non-negative NPR.");
      return;
    }
    if (segmentId === "sell") {
      const unitPriceNprPerGram = Number(pxStr.replace(/,/g, ""));
      if (!Number.isFinite(unitPriceNprPerGram) || unitPriceNprPerGram < 0) {
        setErr("Enter sell price per gram (NPR).");
        return;
      }
      const ok = onMutate((s) =>
        recordMetalSell(s, row.id, { grams, unitPriceNprPerGram, tradeDate, feesNpr, notes }),
      );
      if (!ok) {
        setErr("Could not record sell.");
        return;
      }
    } else {
      const basisNprAdded = basisStr.trim() === "" ? undefined : Number(basisStr.replace(/,/g, ""));
      if (basisNprAdded != null && (!Number.isFinite(basisNprAdded) || basisNprAdded < 0)) {
        setErr("Cost basis added must be non-negative NPR.");
        return;
      }
      const ok = onMutate((s) =>
        recordMetalBuy(s, row.id, { grams, tradeDate, basisNprAdded, feesNpr, notes }),
      );
      if (!ok) {
        setErr("Could not record buy.");
        return;
      }
    }
    setGramsStr("");
    setPxStr("");
    setBasisStr("");
    setFeesStr("");
    setNotes("");
  };

  return (
    <PortfolioTransactionStrip
      open={open}
      onOpenChange={setOpen}
      headerLabel="Transactions"
      summaryRight={
        <>
          {held.toLocaleString()} g · basis {basis != null ? formatMoney(basis, "NPR") : "—"}
          {avgPerG != null ? ` · ~${formatMoney(avgPerG, "NPR")}/g` : ""}
        </>
      }
      segments={METAL_TX_SEGMENTS}
      segmentId={segmentId}
      onSegmentId={setSegmentId}
      tradeDate={tradeDate}
      onTradeDate={setTradeDate}
      feesLabel="Fees (NPR)"
      feesStr={feesStr}
      onFeesStrChange={setFeesStr}
      notes={notes}
      onNotesChange={setNotes}
      error={err}
      submitLabel={segmentId === "sell" ? "Record sell" : "Record buy"}
      onSubmit={submit}
      accent="amber"
    >
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block">
          <span className="mb-0.5 block text-[10px] font-bold uppercase text-emerald-200/55">Grams</span>
          <input
            value={gramsStr}
            onChange={(e) => setGramsStr(e.target.value)}
            inputMode="decimal"
            className="wealth-input-text w-full px-2 py-1.5 text-xs font-bold"
            placeholder="0"
          />
        </label>
        {segmentId === "sell" ? (
          <label className="block">
            <span className="mb-0.5 block text-[10px] font-bold uppercase text-emerald-200/55">Sell NPR / g</span>
            <input
              value={pxStr}
              onChange={(e) => setPxStr(e.target.value)}
              inputMode="decimal"
              className="wealth-input-text w-full px-2 py-1.5 text-xs font-bold"
              placeholder="0"
            />
          </label>
        ) : (
          <label className="block">
            <span className="mb-0.5 block text-[10px] font-bold uppercase text-emerald-200/55">
              Cost basis added (NPR)
            </span>
            <input
              value={basisStr}
              onChange={(e) => setBasisStr(e.target.value)}
              inputMode="decimal"
              className="wealth-input-text w-full px-2 py-1.5 text-xs font-bold"
              placeholder="Optional — for P/L on sells"
            />
          </label>
        )}
      </div>
    </PortfolioTransactionStrip>
  );
}

export function MetalsPanel({
  rows,
  ledger,
  onChange,
  onAdd,
  onRemove,
  onMutate,
}: {
  rows: MetalRow[];
  ledger: readonly PortfolioLedgerEntry[];
  onChange: (id: string, patch: Partial<MetalRow>) => void;
  onAdd: (metal: "gold" | "silver") => void;
  onRemove: (id: string) => void;
  onMutate: (fn: (s: WealthPortfolioStateV2) => WealthPortfolioStateV2 | null) => boolean;
}) {
  return (
    <section className="wealth-glass rounded-[1.35rem] p-3.5 sm:rounded-[1.5rem] sm:p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-400/15 text-amber-200">
            <Gem size={18} />
          </div>
          <div>
            <h2 className="text-base font-black text-emerald-50 sm:text-lg">Gold & silver</h2>
            <p className="text-xs font-bold leading-snug text-emerald-200/65 sm:text-sm">Grams · demo spot (NPR/g) placeholder</p>
          </div>
        </div>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => onAdd("gold")}
            className="rounded-full border border-amber-400/25 bg-amber-500/10 px-2.5 py-1 text-[11px] font-black text-amber-100 transition hover:bg-amber-500/20"
          >
            <Plus size={12} className="inline" /> Gold
          </button>
          <button
            type="button"
            onClick={() => onAdd("silver")}
            className="rounded-full border border-slate-400/25 bg-slate-500/10 px-2.5 py-1 text-[11px] font-black text-slate-100 transition hover:bg-slate-500/20"
          >
            <Plus size={12} className="inline" /> Silver
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {rows.map((row) => {
          const g = row.grams ?? 0;
          const rate = mockMetalRateNprPerGram(row.metal);
          const total = g * rate;
          return (
            <div
              key={row.id}
              className="wealth-row-card flex flex-col gap-2 rounded-xl p-2.5 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="flex min-w-0 flex-col gap-2">
                <div className="grid gap-2 sm:grid-cols-3 sm:items-end">
                  <label className="block">
                    <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wide text-emerald-200/55">Metal</span>
                    <select
                      value={row.metal}
                      onChange={(e) => onChange(row.id, { metal: e.target.value as "gold" | "silver" })}
                      className="wealth-input w-full px-2 py-2 text-xs font-black sm:text-sm"
                    >
                      <option value="gold">Gold</option>
                      <option value="silver">Silver</option>
                    </select>
                  </label>
                  <div className="min-w-0 sm:col-span-1">
                    <NumericMoneyInput tone="dark"
                      label="Grams"
                      value={row.grams}
                      onChange={(n) => onChange(row.id, { grams: n })}
                      variant="amount"
                      placeholder="0"
                      className="text-[10px] font-bold uppercase tracking-wide text-zinc-200 [&>span]:block"
                      wrapperClassName="rounded-xl border border-emerald-400/15 bg-black/30 px-2 py-2 focus-within:border-emerald-400/40"
                      inputClassName="min-w-0 flex-1 bg-transparent text-xs font-bold text-emerald-50 outline-none"
                    />
                  </div>
                  <div className="rounded-lg bg-black/25 px-2 py-2 text-[11px] font-bold sm:text-xs">
                    <p className="text-emerald-200/55">Live rate (demo)</p>
                    <p className="mt-0.5 font-black text-amber-200/95">{formatMoney(rate, "NPR")} / g</p>
                    <p className="mt-1 text-emerald-100/90">
                      Value: <span className="font-black text-emerald-50">{formatMoney(total, "NPR")}</span>
                    </p>
                  </div>
                  <div className="min-w-0 sm:col-span-3">
                    <NumericMoneyInput tone="dark"
                      label="Total cost basis (NPR)"
                      value={row.totalCostBasisNpr}
                      onChange={(n) => onChange(row.id, { totalCostBasisNpr: n })}
                      variant="amount"
                      placeholder="Optional — for realized P/L"
                      className="text-[10px] font-bold uppercase tracking-wide text-zinc-200 [&>span]:block"
                      wrapperClassName="rounded-xl border border-emerald-400/15 bg-black/30 px-2 py-2 focus-within:border-emerald-400/40"
                      inputClassName="min-w-0 flex-1 bg-transparent text-xs font-bold text-emerald-50 outline-none"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2 border-t border-emerald-400/10 pt-2 sm:flex-row sm:flex-wrap sm:items-start sm:gap-x-4 sm:gap-y-2">
                  <PortfolioIsoDateField
                    label="Bought date"
                    value={row.boughtDate}
                    onChange={(next) => onChange(row.id, { boughtDate: next })}
                  />
                  <PortfolioDateMeta dateIso={row.boughtDate} leadText="Owned" />
                </div>
                <MetalTradeStrip row={row} onMutate={onMutate} />
              </div>
              <button
                type="button"
                aria-label="Remove"
                onClick={() => onRemove(row.id)}
                className="self-end rounded-xl p-2 text-emerald-300/40 transition hover:bg-rose-500/15 hover:text-rose-300 sm:self-center"
              >
                <Trash2 size={16} />
              </button>
            </div>
          );
        })}
      </div>
      <ModuleLedgerCard
        bucket="metal"
        ledger={ledger}
        title="Gold & Silver ledger"
        subtitle="Buys and sells for precious metals in this module."
      />
    </section>
  );
}
