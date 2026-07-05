"use client";

import { CheckCircle2, LineChart, Plus, Sparkles, Trash2 } from "lucide-react";
import { useMemo, useEffect, useState } from "react";
import { lineToNpr, valueInvestmentRow } from "@/components/portfolio/calculations";
import { CurrencySelect } from "@/components/portfolio/CurrencySelect";
import { InvestmentMasterSelector } from "@/components/portfolio/InvestmentMasterSelector";
import { PortfolioDateMeta } from "@/components/portfolio/PortfolioDateMeta";
import { PortfolioIsoDateField } from "@/components/portfolio/PortfolioIsoDateField";
import { mockLiveMultiplier } from "@/components/portfolio/mock-prices";
import { ModuleLedgerCard } from "@/components/portfolio/ledger-ui/ModuleLedgerCard";
import type { LedgerFx } from "@/components/portfolio/portfolio-ledger";
import {
  recordInvestmentBonusShare,
  recordInvestmentBuy,
  recordInvestmentCashDividend,
  recordInvestmentRightShare,
  recordInvestmentSell,
} from "@/components/portfolio/portfolio-ledger";
import {
  PortfolioTransactionStrip,
  portfolioTxnTodayIso,
  type PortfolioTxnAccent,
  type TxnSegmentDef,
} from "@/components/portfolio/transaction-ui/PortfolioTransactionStrip";
import type { InvestmentKind, InvestmentRow, PortfolioLedgerEntry, WealthPortfolioStateV2 } from "@/components/portfolio/types";
import { resolveLiveUnitNpr } from "@/lib/investment-market/quotes";
import type { PortfolioDisplayCurrency } from "@/lib/portfolio-convert";
import { formatMoney } from "@/lib/expense-utils";
import { useProductAuth } from "@/contexts/ProductAuthContext";

const KINDS: { value: InvestmentKind; label: string }[] = [
  { value: "nepse", label: "NEPSE" },
  { value: "sip", label: "Open MF" },
  { value: "closed_end_mf", label: "Closed MF" },
  { value: "us_stock", label: "US stocks" },
  { value: "etf", label: "ETFs" },
  { value: "crypto", label: "Crypto" },
];

function nprToDisplayAmount(npr: number, currency: PortfolioDisplayCurrency, krwPerNpr: number, usdPerNpr: number): number {
  if (currency === "NPR") return npr;
  if (currency === "KRW") return npr * krwPerNpr;
  return npr * usdPerNpr;
}

function todayIso() {
  return portfolioTxnTodayIso();
}

const INV_TX_SEGMENTS: TxnSegmentDef[] = [
  { id: "buy", label: "Buy", tone: "in" },
  { id: "sell", label: "Sell", tone: "out" },
  { id: "ipo", label: "IPO", tone: "mid" },
  { id: "right", label: "Right share", tone: "mid" },
  { id: "bonus", label: "Bonus share", tone: "in" },
  { id: "dividend", label: "Cash dividend", tone: "div" },
];

type QuickNepseTxnType = "buy" | "sell" | "dividend" | "bonus" | "right" | "ipo" | "fpo" | "auction";

const QUICK_NEPSE_TXNS: { id: QuickNepseTxnType; label: string }[] = [
  { id: "buy", label: "Buy" },
  { id: "sell", label: "Sell" },
  { id: "dividend", label: "Dividend" },
  { id: "bonus", label: "Bonus" },
  { id: "right", label: "Right" },
  { id: "ipo", label: "IPO" },
  { id: "fpo", label: "FPO" },
  { id: "auction", label: "Auction" },
];

function numericFromDraft(value: string): number {
  const n = Number(value.replace(/,/g, ""));
  return Number.isFinite(n) ? n : Number.NaN;
}

function newPortfolioRowId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function QuickNepseAddComposer({
  rows,
  usdPerNpr,
  ledgerFx,
  onMutate,
}: {
  rows: InvestmentRow[];
  usdPerNpr: number;
  ledgerFx: LedgerFx;
  onMutate: (fn: (s: WealthPortfolioStateV2) => WealthPortfolioStateV2 | null) => boolean;
}) {
  const { user } = useProductAuth();
  const [draft, setDraft] = useState<InvestmentRow>({
    id: "quick-nepse-draft",
    kind: "nepse",
    name: "",
    quantity: undefined,
    buyPrice: undefined,
    currency: "NPR",
    purchaseDate: todayIso(),
  });
  const [txnType, setTxnType] = useState<QuickNepseTxnType>("buy");
  const [unitsStr, setUnitsStr] = useState("");
  const [priceStr, setPriceStr] = useState("");
  const [tradeDate, setTradeDate] = useState(todayIso);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const selectedName = draft.name.trim();
  const selectedTicker = draft.instrumentKey?.split(":").pop()?.toUpperCase();
  const marketPrice = typeof draft.buyPrice === "number" && Number.isFinite(draft.buyPrice) ? draft.buyPrice : undefined;
  const units = numericFromDraft(unitsStr);
  const price = numericFromDraft(priceStr);
  const totalUnits = Number.isFinite(units) && units > 0 ? units : 0;
  const averagePrice = txnType === "bonus" ? 0 : Number.isFinite(price) && price >= 0 ? price : 0;
  const totalInvestment =
    txnType === "bonus" ? 0 : totalUnits > 0 && averagePrice >= 0 ? totalUnits * averagePrice : 0;
  const estimatedBrokerage =
    ["buy", "sell", "right", "ipo", "fpo", "auction"].includes(txnType) && totalInvestment > 0
      ? totalInvestment * 0.0036
      : 0;
  const matchingHolding = useMemo(() => {
    const key = draft.instrumentKey;
    const name = selectedName.toLowerCase();
    return rows.find((r) => (key && r.instrumentKey === key) || (!!name && r.name.trim().toLowerCase() === name));
  }, [draft.instrumentKey, rows, selectedName]);

  useEffect(() => {
    if (!saved) return;
    const t = window.setTimeout(() => setSaved(false), 2200);
    return () => window.clearTimeout(t);
  }, [saved]);

  const submit = () => {
    setErr(null);
    setSaved(false);
    if (!selectedName) {
      setErr("Search and select a NEPSE stock first.");
      return;
    }
    if (!Number.isFinite(units) || units <= 0) {
      setErr(txnType === "dividend" ? "Enter eligible units." : "Enter valid units.");
      return;
    }
    if (txnType !== "bonus" && (!Number.isFinite(price) || price < 0)) {
      setErr(txnType === "dividend" ? "Enter dividend per unit." : "Enter a valid price per unit.");
      return;
    }

    const needsExisting = txnType === "sell" || txnType === "dividend" || txnType === "bonus";
    const notes = txnType === "fpo" ? "FPO" : txnType === "auction" ? "Auction purchase" : undefined;
    const ok = onMutate((state) => {
      const key = draft.instrumentKey;
      const name = selectedName.toLowerCase();
      let row = state.investments.find(
        (r) => (key && r.instrumentKey === key) || (!!name && r.name.trim().toLowerCase() === name),
      );
      let nextState = state;

      if (!row) {
        if (needsExisting) return null;
        row = {
          id: newPortfolioRowId(),
          kind: "nepse",
          name: selectedName,
          quantity: undefined,
          buyPrice: undefined,
          currency: "NPR",
          instrumentKey: draft.instrumentKey,
          purchaseDate: tradeDate,
        };
        nextState = { ...state, investments: [...state.investments, row] };
      }

      if (txnType === "sell") {
        return recordInvestmentSell(
          nextState,
          row.id,
          { quantity: units, unitPrice: price, currency: row.currency, tradeDate, notes },
          ledgerFx,
        );
      }
      if (txnType === "dividend") {
        return recordInvestmentCashDividend(
          nextState,
          row.id,
          { grossAmount: units * price, currency: row.currency, tradeDate },
          ledgerFx,
          user?.id,
        );
      }
      if (txnType === "bonus") {
        return recordInvestmentBonusShare(nextState, row.id, { bonusQuantity: units, tradeDate });
      }
      if (txnType === "right") {
        return recordInvestmentRightShare(
          nextState,
          row.id,
          { quantity: units, unitPrice: price, currency: row.currency, tradeDate },
          ledgerFx,
        );
      }
      return recordInvestmentBuy(
        nextState,
        row.id,
        {
          quantity: units,
          unitPrice: price,
          currency: row.currency,
          tradeDate,
          notes,
          ledgerFlow: txnType === "ipo" ? "ipo" : "market_buy",
        },
        ledgerFx,
      );
    });

    if (!ok) {
      setErr(
        needsExisting
          ? "Select an existing holding for this transaction type."
          : "Could not add this stock. Check the date and inputs.",
      );
      return;
    }

    setSaved(true);
    setUnitsStr("");
    setTxnType("buy");
    setTradeDate(todayIso());
  };

  return (
    <section className="sm:hidden">
      <div className="relative overflow-hidden rounded-[1.75rem] border border-emerald-300/20 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.25),transparent_42%),linear-gradient(145deg,rgba(2,6,23,0.96),rgba(6,78,59,0.62))] p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[0_24px_70px_rgba(0,0,0,0.5)]">
        <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-emerald-200/70 to-transparent" />
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-100">
              <Sparkles size={12} /> NEPSE quick add
            </p>
            <h2 className="text-2xl font-black tracking-tight text-white">Add stock in seconds</h2>
            <p className="mt-1 text-xs font-semibold leading-relaxed text-emerald-100/65">
              Search, choose transaction, enter units and price. Your portfolio ledger updates instantly.
            </p>
          </div>
          {saved ? <CheckCircle2 className="mt-1 shrink-0 text-lime-300" size={22} /> : null}
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-emerald-100/70">
              Search stock
            </span>
            <InvestmentMasterSelector
              kind="nepse"
              instrumentKey={draft.instrumentKey}
              name={draft.name}
              usdPerNpr={usdPerNpr}
              onApplyInstrument={(patch) => {
                setDraft((prev) => ({ ...prev, ...patch, kind: "nepse", currency: "NPR" }));
                if (typeof patch.buyPrice === "number" && Number.isFinite(patch.buyPrice)) {
                  setPriceStr(String(patch.buyPrice));
                }
              }}
            />
            <p className="mt-1.5 text-[11px] font-semibold text-emerald-100/50">
              Try TTL, CIT, STC, or search by company name.
            </p>
          </label>

          <div>
            <span className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-emerald-100/70">
              Transaction type
            </span>
            <div className="grid grid-cols-4 gap-1.5">
              {QUICK_NEPSE_TXNS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTxnType(t.id)}
                  className={`min-h-11 rounded-2xl px-2 text-[11px] font-black transition ${
                    txnType === t.id
                      ? "bg-gradient-to-br from-emerald-400 to-teal-500 text-slate-950 shadow-lg shadow-emerald-950/45"
                      : "border border-emerald-300/15 bg-white/[0.045] text-emerald-50/75"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-emerald-100/70">
                Units
              </span>
              <input
                value={unitsStr}
                onChange={(e) => setUnitsStr(e.target.value)}
                inputMode="decimal"
                placeholder="100"
                className="wealth-input-text min-h-12 w-full rounded-2xl px-3 text-base font-black text-white"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-emerald-100/70">
                Price per unit
              </span>
              <input
                value={priceStr}
                onChange={(e) => setPriceStr(e.target.value)}
                inputMode="decimal"
                placeholder={txnType === "bonus" ? "0" : "450"}
                disabled={txnType === "bonus"}
                className="wealth-input-text min-h-12 w-full rounded-2xl px-3 text-base font-black text-white disabled:opacity-55"
              />
              {marketPrice != null ? (
                <p className="mt-1 text-[10px] font-bold text-emerald-100/55">
                  Today&apos;s market price: {marketPrice.toLocaleString("en-US", { maximumFractionDigits: 2 })} NPR
                </p>
              ) : null}
            </label>
          </div>

          <PortfolioIsoDateField
            label="Transaction date"
            value={tradeDate}
            onChange={(next) => setTradeDate(next ?? todayIso())}
            className="max-w-none sm:max-w-none"
          />

          <div className="rounded-[1.45rem] border border-emerald-300/15 bg-black/30 p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-sm font-black text-white">Investment Summary</h3>
              <span className="rounded-full bg-emerald-400/10 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-100/70">
                Live
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-2xl bg-white/[0.045] p-3">
                <p className="text-[10px] font-bold uppercase text-emerald-100/50">Total Units</p>
                <p className="mt-1 text-lg font-black tabular-nums text-white">{totalUnits.toLocaleString()}</p>
              </div>
              <div className="rounded-2xl bg-white/[0.045] p-3">
                <p className="text-[10px] font-bold uppercase text-emerald-100/50">Average Price</p>
                <p className="mt-1 text-lg font-black tabular-nums text-white">
                  {averagePrice.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="rounded-2xl bg-white/[0.045] p-3">
                <p className="text-[10px] font-bold uppercase text-emerald-100/50">Total Investment</p>
                <p className="mt-1 text-lg font-black tabular-nums text-white">{formatMoney(totalInvestment, "NPR")}</p>
              </div>
              <div className="rounded-2xl bg-white/[0.045] p-3">
                <p className="text-[10px] font-bold uppercase text-emerald-100/50">Est. Brokerage</p>
                <p className="mt-1 text-lg font-black tabular-nums text-emerald-100">
                  {formatMoney(estimatedBrokerage, "NPR")}
                </p>
              </div>
            </div>
            <p className="mt-3 text-[11px] font-semibold leading-relaxed text-emerald-100/55">
              {matchingHolding
                ? `Adds to existing holding: ${matchingHolding.quantity?.toLocaleString() ?? 0} units held.`
                : selectedTicker
                  ? `${selectedTicker} will be created as a NEPSE holding.`
                  : "Select a stock to preview the portfolio action."}
            </p>
          </div>

          {err ? <p className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-200">{err}</p> : null}
          {saved ? (
            <p className="rounded-2xl border border-lime-400/20 bg-lime-500/10 px-3 py-2 text-xs font-bold text-lime-200">
              Added to portfolio.
            </p>
          ) : null}
        </div>

        <div className="sticky bottom-0 z-20 -mx-4 mt-5 border-t border-emerald-300/10 bg-slate-950/80 px-4 pb-[calc(0.25rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
          <button
            type="button"
            onClick={submit}
            className="min-h-14 w-full rounded-2xl bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500 px-5 text-base font-black text-slate-950 shadow-[0_18px_42px_rgba(16,185,129,0.32)] transition active:scale-[0.99]"
          >
            + Add to Portfolio
          </button>
        </div>
      </div>
    </section>
  );
}

function invTxnAccent(segmentId: string): PortfolioTxnAccent {
  switch (segmentId) {
    case "sell":
      return "rose";
    case "dividend":
      return "cyan";
    case "bonus":
      return "teal";
    case "right":
      return "sky";
    default:
      return "emerald";
  }
}

function InvestmentTradeStrip({
  row,
  ledgerFx,
  onMutate,
}: {
  row: InvestmentRow;
  ledgerFx: LedgerFx;
  onMutate: (fn: (s: WealthPortfolioStateV2) => WealthPortfolioStateV2 | null) => boolean;
}) {
  const { user } = useProductAuth();
  const [open, setOpen] = useState(false);
  const [segmentId, setSegmentId] = useState<string>("buy");
  const [qtyStr, setQtyStr] = useState("");
  const [pxStr, setPxStr] = useState("");
  const [feesStr, setFeesStr] = useState("");
  const [notes, setNotes] = useState("");
  const [tradeDate, setTradeDate] = useState(todayIso);
  const [err, setErr] = useState<string | null>(null);

  const held = row.quantity ?? 0;
  const avg = row.buyPrice;

  const submit = () => {
    setErr(null);
    const fees = feesStr.trim() === "" ? undefined : Number(feesStr.replace(/,/g, ""));
    if (fees != null && (!Number.isFinite(fees) || fees < 0)) {
      setErr("Fees must be a non-negative number.");
      return;
    }

    if (segmentId === "dividend") {
      const grossAmount = Number(qtyStr.replace(/,/g, ""));
      if (!Number.isFinite(grossAmount) || grossAmount <= 0) {
        setErr("Enter a valid gross dividend amount.");
        return;
      }
      const ok = onMutate((s) =>
        recordInvestmentCashDividend(
          s,
          row.id,
          { grossAmount, currency: row.currency, tradeDate, fees, notes },
          ledgerFx,
          user?.id,
        ),
      );
      if (!ok) {
        setErr("Could not record dividend. Check transaction date (YYYY-MM-DD).");
        return;
      }
      setQtyStr("");
      setPxStr("");
      setFeesStr("");
      setNotes("");
      return;
    }

    if (segmentId === "bonus") {
      const bonusQuantity = Number(qtyStr.replace(/,/g, ""));
      if (!Number.isFinite(bonusQuantity) || bonusQuantity <= 0) {
        setErr("Enter a valid bonus share quantity.");
        return;
      }
      const ok = onMutate((s) =>
        recordInvestmentBonusShare(s, row.id, { bonusQuantity, tradeDate, notes }),
      );
      if (!ok) {
        setErr("Could not record bonus shares. Check transaction date (YYYY-MM-DD).");
        return;
      }
      setQtyStr("");
      setPxStr("");
      setFeesStr("");
      setNotes("");
      return;
    }

    const quantity = Number(qtyStr.replace(/,/g, ""));
    const unitPrice = Number(pxStr.replace(/,/g, ""));
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setErr("Enter a valid quantity.");
      return;
    }
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      setErr("Enter a valid price per unit.");
      return;
    }
    if (segmentId === "sell" && quantity > held + 1e-9) {
      setErr("Cannot sell more than you hold.");
      return;
    }
    const basePayload = {
      quantity,
      unitPrice,
      currency: row.currency,
      tradeDate,
      fees,
      notes,
    };
    let ok = false;
    if (segmentId === "sell") {
      ok = onMutate((s) => recordInvestmentSell(s, row.id, basePayload, ledgerFx));
    } else if (segmentId === "right") {
      ok = onMutate((s) => recordInvestmentRightShare(s, row.id, basePayload, ledgerFx));
    } else {
      ok = onMutate((s) =>
        recordInvestmentBuy(s, row.id, {
          ...basePayload,
          ledgerFlow: segmentId === "ipo" ? "ipo" : "market_buy",
        }, ledgerFx),
      );
    }
    if (!ok) {
      setErr("Could not record trade. Check transaction date (YYYY-MM-DD) and inputs.");
      return;
    }
    setQtyStr("");
    setPxStr("");
    setFeesStr("");
    setNotes("");
  };

  const submitLabel =
    segmentId === "sell"
      ? "Record sell"
      : segmentId === "ipo"
        ? "Record IPO"
        : segmentId === "right"
          ? "Record right share"
          : segmentId === "bonus"
            ? "Record bonus share"
            : segmentId === "dividend"
              ? "Record cash dividend"
              : "Record buy";

  const qtyLabel =
    segmentId === "dividend"
      ? `Gross dividend (${row.currency})`
      : segmentId === "bonus"
        ? "Bonus shares (units)"
        : segmentId === "sell"
          ? "Sell quantity"
          : segmentId === "ipo"
            ? "IPO quantity"
            : segmentId === "right"
              ? "Right share quantity"
              : "Buy quantity";
  const priceLabel =
    segmentId === "sell"
      ? "Sell price / unit"
      : segmentId === "ipo"
        ? "IPO price / unit"
        : segmentId === "right"
          ? "Right issue price / unit"
          : "Buy price / unit";

  const showPrice = segmentId !== "dividend" && segmentId !== "bonus";
  const showFees = segmentId !== "bonus";
  const feesLabel =
    segmentId === "dividend" ? `Fees / tax (${row.currency})` : `Fees (${row.currency})`;

  return (
    <PortfolioTransactionStrip
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setErr(null);
          setTradeDate(todayIso());
        }
      }}
      headerLabel="Transactions"
      summaryRight={
        <>
          Held {held.toLocaleString()} · avg {avg != null && avg > 0 ? `${avg} ${row.currency}` : "—"}
        </>
      }
      segments={INV_TX_SEGMENTS}
      segmentId={segmentId}
      onSegmentId={(next) => {
        setSegmentId(next);
        setErr(null);
      }}
      segmentsWrapClassName="-mx-0.5 flex max-w-full gap-1.5 overflow-x-auto overscroll-x-contain px-0.5 pb-0.5 [scrollbar-width:thin]"
      innerPanelClassName="mt-2 space-y-2 rounded-xl border border-emerald-400/20 bg-gradient-to-br from-slate-950/75 via-black/45 to-emerald-950/25 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md sm:p-3"
      showFees={showFees}
      tradeDate={tradeDate}
      onTradeDate={setTradeDate}
      feesLabel={feesLabel}
      feesStr={feesStr}
      onFeesStrChange={setFeesStr}
      notes={notes}
      onNotesChange={setNotes}
      error={err}
      submitLabel={submitLabel}
      onSubmit={submit}
      accent={invTxnAccent(segmentId)}
    >
      <div className={`grid gap-2 ${showPrice ? "sm:grid-cols-2" : ""}`}>
        <label className="block">
          <span className="mb-0.5 block text-[10px] font-bold uppercase text-emerald-200/55">{qtyLabel}</span>
          <input
            value={qtyStr}
            onChange={(e) => setQtyStr(e.target.value)}
            inputMode="decimal"
            className="wealth-input-text w-full px-2 py-1.5 text-xs font-bold"
            placeholder="0"
          />
        </label>
        {showPrice ? (
          <label className="block">
            <span className="mb-0.5 block text-[10px] font-bold uppercase text-emerald-200/55">{priceLabel}</span>
            <input
              value={pxStr}
              onChange={(e) => setPxStr(e.target.value)}
              inputMode="decimal"
              className="wealth-input-text w-full px-2 py-1.5 text-xs font-bold"
              placeholder="0"
            />
          </label>
        ) : null}
      </div>
    </PortfolioTransactionStrip>
  );
}

export function InvestmentsPanel({
  rows,
  ledger,
  krwPerNpr,
  usdPerNpr,
  ledgerFx,
  onMutate,
  onChange,
  onAdd,
  onRemove,
  hideAddButton = false,
}: {
  rows: InvestmentRow[];
  ledger: readonly PortfolioLedgerEntry[];
  krwPerNpr: number;
  usdPerNpr: number;
  ledgerFx: LedgerFx;
  onMutate: (fn: (s: WealthPortfolioStateV2) => WealthPortfolioStateV2 | null) => boolean;
  onChange: (id: string, patch: Partial<InvestmentRow>) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  /** When a parent surface (e.g. position table) owns “Add”, hide the header duplicate. */
  hideAddButton?: boolean;
}) {
  return (
    <section className="wealth-glass rounded-[1.35rem] p-3.5 sm:rounded-[1.5rem] sm:p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-lime-400/15 text-lime-200">
            <LineChart size={18} />
          </div>
          <div>
            <h2 className="text-base font-black text-emerald-50 sm:text-lg">Investments</h2>
            <p className="text-xs font-bold leading-snug text-emerald-200/65 sm:text-sm">
              Search the market DB · position size & cost update from Transactions (FIFO); live values use NPR with
              KRW/USD FX
            </p>
          </div>
        </div>
        {hideAddButton ? null : (
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-400/25 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-black text-emerald-100 transition hover:bg-emerald-500/25 sm:text-xs"
          >
            <Plus size={14} /> Add
          </button>
        )}
      </div>

      <QuickNepseAddComposer rows={rows} usdPerNpr={usdPerNpr} ledgerFx={ledgerFx} onMutate={onMutate} />

      <div className="space-y-3">
        {rows.map((row) => {
          const v = valueInvestmentRow(row, krwPerNpr, usdPerNpr);
          const buy = row.buyPrice ?? 0;
          const qty = row.quantity ?? 0;
          const masterLiveNpr = resolveLiveUnitNpr(row.instrumentKey, usdPerNpr);

          let liveUnitDisplay = "—";
          if (qty > 0 && buy > 0) {
            if (masterLiveNpr != null) {
              const liveInCcy = nprToDisplayAmount(masterLiveNpr, row.currency, krwPerNpr, usdPerNpr);
              liveUnitDisplay = `${liveInCcy.toLocaleString("en-US", { maximumFractionDigits: 4 })} ${row.currency}`;
            } else {
              const unitBuyNpr = lineToNpr(buy, row.currency, krwPerNpr, usdPerNpr);
              const liveUnitNpr = unitBuyNpr * mockLiveMultiplier(row.id, row.kind);
              const liveInCcy = nprToDisplayAmount(liveUnitNpr, row.currency, krwPerNpr, usdPerNpr);
              liveUnitDisplay = `${liveInCcy.toLocaleString("en-US", { maximumFractionDigits: 4 })} ${row.currency}`;
            }
          }

          const pnlTone = v.pnlNpr >= 0 ? "text-lime-300" : "text-rose-300";

          return (
            <div key={row.id} className="wealth-row-card space-y-2 rounded-xl p-2.5 sm:p-3">
              <div className="grid gap-2 lg:grid-cols-12 lg:items-end lg:gap-2">
                <label className="block min-w-0 lg:col-span-2">
                  <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wide text-emerald-200/55">
                    Investment type
                  </span>
                  <select
                    value={row.kind}
                    onChange={(e) => {
                      const k = e.target.value as InvestmentKind;
                      onChange(row.id, {
                        kind: k,
                        instrumentKey: undefined,
                        name: k === "crypto" ? row.name : "",
                        buyPrice: k === "crypto" ? row.buyPrice : undefined,
                      });
                    }}
                    className="wealth-input w-full px-2 py-2 text-xs font-black sm:text-sm"
                  >
                    {KINDS.map((k) => (
                      <option key={k.value} value={k.value}>
                        {k.label}
                      </option>
                    ))}
                  </select>
                </label>

                {row.kind === "crypto" ? (
                  <label className="block min-w-0 lg:col-span-7">
                    <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wide text-emerald-200/55">
                      Company / asset name
                    </span>
                    <input
                      type="text"
                      value={row.name}
                      onChange={(e) => onChange(row.id, { name: e.target.value })}
                      placeholder="Asset name"
                      className="wealth-input-text w-full px-2.5 py-2 text-xs sm:text-sm"
                    />
                  </label>
                ) : (
                  <div className="min-w-0 lg:col-span-7">
                    <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wide text-emerald-200/55">
                      Company / instrument
                    </span>
                    <InvestmentMasterSelector
                      kind={row.kind}
                      instrumentKey={row.instrumentKey}
                      name={row.name}
                      usdPerNpr={usdPerNpr}
                      onApplyInstrument={(patch) => onChange(row.id, patch)}
                    />
                  </div>
                )}

                <label className="block w-full lg:col-span-2">
                  <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wide text-emerald-200/55">
                    Display CCY
                  </span>
                  <CurrencySelect value={row.currency} onChange={(c) => onChange(row.id, { currency: c })} />
                </label>
                <div className="flex justify-end lg:col-span-1 lg:items-end">
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

              <div className="flex flex-col gap-3 border-t border-emerald-400/10 pt-3 sm:flex-row sm:flex-wrap sm:items-start sm:gap-x-6 sm:gap-y-2">
                <PortfolioIsoDateField
                  label="Purchase date"
                  value={row.purchaseDate}
                  onChange={(next) => onChange(row.id, { purchaseDate: next })}
                  className="sm:min-w-[11rem]"
                />
                <div className="min-w-0 flex-1">
                  <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-200/55">
                    Holding summary
                  </p>
                  <PortfolioDateMeta
                    dateIso={row.purchaseDate}
                    basisNpr={v.costNpr}
                    markNpr={v.liveValueNpr}
                    leadText="Summary"
                  />
                </div>
              </div>

              <div className="grid gap-2 border-t border-emerald-400/10 pt-3 sm:grid-cols-3">
                <div className="rounded-xl border border-emerald-400/10 bg-black/25 px-3 py-2.5 text-emerald-100/90">
                  <span className="text-[10px] font-black uppercase tracking-wide text-emerald-200/55">
                    Current value
                  </span>
                  <p className="mt-1 text-lg font-black tabular-nums text-emerald-50 sm:text-xl">
                    {formatMoney(v.liveValueNpr, "NPR")}
                  </p>
                  <p className="mt-1 text-[10px] font-semibold leading-snug text-emerald-200/50">
                    {qty > 0
                      ? `${qty.toLocaleString()} units · live ${liveUnitDisplay}`
                      : "Open Transactions to record buys, sells, IPOs, rights, bonus shares, or cash dividends — holdings update from the ledger (FIFO)."}
                  </p>
                </div>
                <div className="rounded-xl border border-emerald-400/10 bg-black/25 px-3 py-2.5 text-emerald-100/90">
                  <span className="text-[10px] font-black uppercase tracking-wide text-emerald-200/55">
                    Invested amount
                  </span>
                  <p className="mt-1 text-lg font-black tabular-nums text-emerald-50 sm:text-xl">
                    {formatMoney(v.costNpr, "NPR")}
                  </p>
                  <p className="mt-1 text-[10px] font-semibold text-emerald-200/50">
                    {buy > 0 && qty > 0 ? `Avg buy ${buy.toLocaleString()} ${row.currency}` : "Cost basis from lots"}
                  </p>
                </div>
                <div
                  className={`rounded-xl border border-emerald-400/10 bg-black/25 px-3 py-2.5 ${pnlTone} ring-1 ring-inset ring-white/[0.04]`}
                >
                  <span className="text-[10px] font-black uppercase tracking-wide text-emerald-200/55">
                    Profit / loss
                  </span>
                  <p className="mt-1 text-lg font-black tabular-nums sm:text-xl">{formatMoney(v.pnlNpr, "NPR")}</p>
                  <p className="mt-1 text-[10px] font-semibold opacity-80">Mark vs cost (NPR)</p>
                </div>
              </div>

              <InvestmentTradeStrip row={row} ledgerFx={ledgerFx} onMutate={onMutate} />
            </div>
          );
        })}
      </div>
      <ModuleLedgerCard
        bucket="investment"
        ledger={ledger}
        title="Investments ledger"
        subtitle="Buys, sells, corporate actions, and dividends for listed positions."
      />
    </section>
  );
}
