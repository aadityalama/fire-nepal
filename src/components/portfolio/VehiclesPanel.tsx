"use client";

import { Car, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { NumericMoneyInput } from "@/components/NumericMoneyInput";
import { CurrencySelect } from "@/components/portfolio/CurrencySelect";
import { PortfolioDateMeta } from "@/components/portfolio/PortfolioDateMeta";
import { PortfolioIsoDateField } from "@/components/portfolio/PortfolioIsoDateField";
import { ModuleLedgerCard } from "@/components/portfolio/ledger-ui/ModuleLedgerCard";
import { recordVehicleBuy, recordVehicleSell } from "@/components/portfolio/portfolio-ledger";
import {
  PortfolioTransactionStrip,
  portfolioTxnTodayIso,
  type TxnSegmentDef,
} from "@/components/portfolio/transaction-ui/PortfolioTransactionStrip";
import type { PortfolioLedgerEntry, VehicleKind, VehicleRow, WealthPortfolioStateV2 } from "@/components/portfolio/types";

const VEH_TX_SEGMENTS: TxnSegmentDef[] = [
  { id: "buy", label: "Buy", tone: "in" },
  { id: "sell", label: "Sell", tone: "out" },
];

function vehicleIsoOk(s: string | undefined): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function VehicleTxnStrip({
  row,
  onMutate,
}: {
  row: VehicleRow;
  onMutate: (fn: (s: WealthPortfolioStateV2) => WealthPortfolioStateV2 | null) => boolean;
}) {
  const [open, setOpen] = useState(false);
  const [segmentId, setSegmentId] = useState("buy");
  const [amtStr, setAmtStr] = useState("");
  const [feesStr, setFeesStr] = useState("");
  const [notes, setNotes] = useState("");
  const [tradeDate, setTradeDate] = useState(() => portfolioTxnTodayIso());
  const [err, setErr] = useState<string | null>(null);
  /** When false, buy ledger rows use acquisition date (no duplicate date field). */
  const [buyLedgerDateOverride, setBuyLedgerDateOverride] = useState(false);
  /** After first recorded buy, show ledger date for follow-on cash adjustments. */
  const [afterFirstBuyLedger, setAfterFirstBuyLedger] = useState(false);

  useEffect(() => {
    setAfterFirstBuyLedger(false);
    setBuyLedgerDateOverride(false);
  }, [row.id]);

  useEffect(() => {
    if (!open) return;
    setErr(null);
    if (segmentId === "sell") {
      setTradeDate(portfolioTxnTodayIso());
      setBuyLedgerDateOverride(false);
      return;
    }
    setBuyLedgerDateOverride(false);
  }, [open, segmentId, row.id]);

  useEffect(() => {
    if (!open || segmentId !== "buy") return;
    if (!buyLedgerDateOverride && vehicleIsoOk(row.purchaseDate)) {
      setTradeDate(row.purchaseDate);
    } else if (!buyLedgerDateOverride && !vehicleIsoOk(row.purchaseDate)) {
      setTradeDate(portfolioTxnTodayIso());
    }
  }, [open, segmentId, row.purchaseDate, buyLedgerDateOverride]);

  const hideBuyTradeDate =
    segmentId === "buy" &&
    !buyLedgerDateOverride &&
    !afterFirstBuyLedger &&
    vehicleIsoOk(row.purchaseDate);

  const resolvedTradeDate = (): string => {
    if (segmentId === "sell") return tradeDate;
    if (hideBuyTradeDate && vehicleIsoOk(row.purchaseDate)) return row.purchaseDate;
    return tradeDate;
  };

  const submit = () => {
    setErr(null);
    const amount = Number(amtStr.replace(/,/g, ""));
    if (!Number.isFinite(amount) || amount <= 0) {
      setErr("Enter a valid amount.");
      return;
    }
    const fees = feesStr.trim() === "" ? undefined : Number(feesStr.replace(/,/g, ""));
    if (fees != null && (!Number.isFinite(fees) || fees < 0)) {
      setErr("Fees must be non-negative.");
      return;
    }
    const td = resolvedTradeDate();
    const payload = { amount, tradeDate: td, fees, notes: notes.trim() || undefined };
    const ok =
      segmentId === "buy"
        ? onMutate((s) => recordVehicleBuy(s, row.id, payload))
        : onMutate((s) => recordVehicleSell(s, row.id, payload));
    if (!ok) {
      setErr(segmentId === "sell" ? "Sell exceeds resale estimate or invalid date." : "Could not record transaction.");
      return;
    }
    setAmtStr("");
    setFeesStr("");
    setNotes("");
    if (segmentId === "buy") {
      setAfterFirstBuyLedger(true);
      setBuyLedgerDateOverride(false);
      setTradeDate(portfolioTxnTodayIso());
    }
  };

  return (
    <PortfolioTransactionStrip
      open={open}
      onOpenChange={setOpen}
      headerLabel="Ledger transactions"
      summaryRight={`Est. ${(row.resaleEstimate ?? 0).toLocaleString()} ${row.currency}`}
      segments={VEH_TX_SEGMENTS}
      segmentId={segmentId}
      onSegmentId={setSegmentId}
      tradeDate={tradeDate}
      onTradeDate={setTradeDate}
      hideTradeDate={hideBuyTradeDate}
      tradeDateLabel={segmentId === "sell" ? "Settlement / transaction date" : "Ledger transaction date"}
      feesLabel={`Fees (${row.currency})`}
      feesStr={feesStr}
      onFeesStrChange={setFeesStr}
      notes={notes}
      onNotesChange={setNotes}
      error={err}
      submitLabel={segmentId === "buy" ? "Record buy" : "Record sell"}
      onSubmit={submit}
      accent="cyan"
    >
      {hideBuyTradeDate ? (
        <div className="rounded-lg border border-cyan-400/20 bg-cyan-950/25 px-2.5 py-2 text-[10px] font-semibold leading-snug text-emerald-100/90 sm:text-[11px]">
          <p>
            <span className="font-black text-cyan-200/90">Ledger date</span> matches your{" "}
            <span className="font-black text-emerald-100">acquisition date</span> ({row.purchaseDate}). Additional buy
            lines can use a different date below.
          </p>
          <button
            type="button"
            onClick={() => {
              setBuyLedgerDateOverride(true);
              setTradeDate(portfolioTxnTodayIso());
            }}
            className="mt-1.5 text-left text-[10px] font-black uppercase tracking-wide text-cyan-200/95 underline decoration-cyan-400/50 underline-offset-2 transition hover:text-cyan-100"
          >
            Use a different ledger date…
          </button>
        </div>
      ) : null}
      {segmentId === "buy" && afterFirstBuyLedger ? (
        <p className="text-[10px] font-semibold leading-snug text-emerald-200/55">
          Follow-on buy: set the <span className="font-bold text-emerald-100/90">ledger transaction date</span> when it
          differs from acquisition ({vehicleIsoOk(row.purchaseDate) ? row.purchaseDate : "—"}).
        </p>
      ) : null}
      <label className="block">
        <span className="mb-0.5 block text-[10px] font-bold uppercase text-emerald-200/55">
          Amount ({row.currency})
        </span>
        <input
          value={amtStr}
          onChange={(e) => setAmtStr(e.target.value)}
          inputMode="decimal"
          className="wealth-input-text w-full px-2 py-1.5 text-xs font-bold"
          placeholder="Adjusts resale estimate"
        />
      </label>
    </PortfolioTransactionStrip>
  );
}

const TYPES: { value: VehicleKind; label: string }[] = [
  { value: "bike", label: "Bike" },
  { value: "car", label: "Car" },
  { value: "ev", label: "EV" },
];

export function VehiclesPanel({
  rows,
  ledger,
  onMutate,
  onChange,
  onAdd,
  onRemove,
}: {
  rows: VehicleRow[];
  ledger: readonly PortfolioLedgerEntry[];
  onMutate: (fn: (s: WealthPortfolioStateV2) => WealthPortfolioStateV2 | null) => boolean;
  onChange: (id: string, patch: Partial<VehicleRow>) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
}) {
  return (
    <section className="wealth-glass rounded-[1.35rem] p-3.5 sm:rounded-[1.5rem] sm:p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-cyan-400/15 text-cyan-200">
            <Car size={18} />
          </div>
          <div>
            <h2 className="text-base font-black text-emerald-50 sm:text-lg">Vehicles</h2>
            <p className="text-xs font-bold leading-snug text-emerald-200/65 sm:text-sm">Resale estimate by type</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-400/25 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-black text-emerald-100 transition hover:bg-emerald-500/25 sm:text-xs"
        >
          <Plus size={14} /> Add
        </button>
      </div>
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.id} className="wealth-row-card space-y-2 rounded-xl p-2.5">
            <div className="grid gap-2 sm:grid-cols-12 sm:items-end">
              <label className="block sm:col-span-2">
                <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wide text-emerald-200/55">Type</span>
                <select
                  value={row.vehicleType}
                  onChange={(e) => onChange(row.id, { vehicleType: e.target.value as VehicleKind })}
                  className="wealth-input w-full px-2 py-2 text-xs font-black sm:text-sm"
                >
                  {TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block min-w-0 sm:col-span-4">
                <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wide text-emerald-200/55">Name</span>
                <input
                  type="text"
                  value={row.name}
                  onChange={(e) => onChange(row.id, { name: e.target.value })}
                  placeholder="Model / year"
                  className="wealth-input-text w-full px-2.5 py-2 text-xs sm:text-sm"
                />
              </label>
              <div className="min-w-0 sm:col-span-3">
                <NumericMoneyInput tone="dark"
                  label="Resale est."
                  value={row.resaleEstimate}
                  onChange={(n) => onChange(row.id, { resaleEstimate: n })}
                  variant="amount"
                  placeholder="0"
                  className="text-[10px] font-bold uppercase tracking-wide text-zinc-200 [&>span]:block"
                  wrapperClassName="rounded-xl border border-emerald-400/15 bg-black/30 px-2 py-2"
                  inputClassName="min-w-0 flex-1 bg-transparent text-xs font-bold text-emerald-50 outline-none"
                />
              </div>
              <label className="block w-full sm:col-span-1">
                <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wide text-emerald-200/55">CCY</span>
                <CurrencySelect value={row.currency} onChange={(c) => onChange(row.id, { currency: c })} />
              </label>
              <div className="flex justify-end sm:col-span-2 sm:items-end">
                <button
                  type="button"
                  aria-label="Remove"
                  onClick={() => onRemove(row.id)}
                  className="rounded-xl p-2 text-emerald-300/40 transition hover:bg-rose-500/15 hover:text-rose-300"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-2 border-t border-emerald-400/10 pt-2 sm:flex-row sm:flex-wrap sm:items-end sm:gap-x-4 sm:gap-y-2">
              <div className="min-w-0 sm:max-w-[14rem]">
                <PortfolioIsoDateField
                  label="Acquisition date"
                  value={row.purchaseDate}
                  onChange={(next) => onChange(row.id, { purchaseDate: next })}
                />
                <p className="mt-1 text-[10px] font-semibold leading-snug text-emerald-200/50">
                  When you owned the asset. Buy ledger entries default to this date unless you choose otherwise.
                </p>
              </div>
              <PortfolioDateMeta dateIso={row.purchaseDate} leadText="Owned" />
            </div>
            <VehicleTxnStrip row={row} onMutate={onMutate} />
          </div>
        ))}
      </div>
      <ModuleLedgerCard
        bucket="vehicle"
        ledger={ledger}
        title="Vehicle ledger"
        subtitle="Buy and sell cash flows recorded for vehicles."
      />
    </section>
  );
}
