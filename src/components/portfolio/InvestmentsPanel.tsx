"use client";

import { CheckCircle2, LineChart, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { InvestmentMasterSelector } from "@/components/portfolio/InvestmentMasterSelector";
import { PortfolioIsoDateField } from "@/components/portfolio/PortfolioIsoDateField";
import type { LedgerFx } from "@/components/portfolio/portfolio-ledger";
import {
  recordInvestmentBonusShare,
  recordInvestmentBuy,
  recordInvestmentCashDividend,
  recordInvestmentRightShare,
  recordInvestmentSell,
} from "@/components/portfolio/portfolio-ledger";
import { portfolioTxnTodayIso } from "@/components/portfolio/transaction-ui/PortfolioTransactionStrip";
import type { InvestmentKind, InvestmentRow, PortfolioLedgerEntry, WealthPortfolioStateV2 } from "@/components/portfolio/types";
import { useProductAuth } from "@/contexts/ProductAuthContext";

function todayIso() {
  return portfolioTxnTodayIso();
}

type QuickInvestmentTxnType = "buy" | "sell" | "ipo" | "fpo" | "right" | "bonus" | "dividend";
type QuickInvestmentType = InvestmentKind | "gold" | "real_estate";

const QUICK_TXNS: { id: QuickInvestmentTxnType; label: string }[] = [
  { id: "buy", label: "Buy" },
  { id: "sell", label: "Sell" },
  { id: "ipo", label: "IPO" },
  { id: "fpo", label: "FPO" },
  { id: "right", label: "Right" },
  { id: "bonus", label: "Bonus" },
  { id: "dividend", label: "Dividend" },
];

const QUICK_INVESTMENT_TYPES: { id: QuickInvestmentType; label: string; investmentKind?: InvestmentKind }[] = [
  { id: "nepse", label: "NEPSE", investmentKind: "nepse" },
  { id: "us_stock", label: "Global Stocks", investmentKind: "us_stock" },
  { id: "sip", label: "Mutual Fund", investmentKind: "sip" },
  { id: "etf", label: "ETF", investmentKind: "etf" },
  { id: "crypto", label: "Crypto", investmentKind: "crypto" },
  { id: "gold", label: "Gold" },
  { id: "real_estate", label: "Real Estate" },
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

function defaultDraft(kind: InvestmentKind = "nepse"): InvestmentRow {
  return {
    id: "quick-investment-draft",
    kind,
    name: "",
    quantity: undefined,
    buyPrice: undefined,
    currency: kind === "us_stock" || kind === "etf" || kind === "crypto" ? "USD" : "NPR",
    purchaseDate: todayIso(),
  };
}

function QuickInvestmentTransactionForm({
  usdPerNpr,
  ledgerFx,
  onMutate,
}: {
  usdPerNpr: number;
  ledgerFx: LedgerFx;
  onMutate: (fn: (s: WealthPortfolioStateV2) => WealthPortfolioStateV2 | null) => boolean;
}) {
  const { user } = useProductAuth();
  const [investmentType, setInvestmentType] = useState<QuickInvestmentType>("nepse");
  const [draft, setDraft] = useState<InvestmentRow>(() => defaultDraft("nepse"));
  const [txnType, setTxnType] = useState<QuickInvestmentTxnType>("buy");
  const [unitsStr, setUnitsStr] = useState("");
  const [priceStr, setPriceStr] = useState("");
  const [notes, setNotes] = useState("");
  const [tradeDate, setTradeDate] = useState(todayIso);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const selectedName = draft.name.trim();
  const marketPrice = typeof draft.buyPrice === "number" && Number.isFinite(draft.buyPrice) ? draft.buyPrice : undefined;
  const units = numericFromDraft(unitsStr);
  const price = numericFromDraft(priceStr);
  const investmentKind = QUICK_INVESTMENT_TYPES.find((t) => t.id === investmentType)?.investmentKind;
  const showInstrumentSearch = investmentKind != null && investmentKind !== "crypto";
  const showPrice = txnType !== "bonus";
  const submitLabel =
    txnType === "sell" ? "Sell Investment" : txnType === "buy" ? "Buy Investment" : "Save Transaction";
  const submitTone =
    txnType === "sell"
      ? "from-rose-500 via-red-500 to-rose-700 text-white shadow-rose-950/35"
      : "from-emerald-400 via-emerald-500 to-teal-500 text-slate-950 shadow-emerald-950/35";

  useEffect(() => {
    if (!saved) return;
    const t = window.setTimeout(() => setSaved(false), 2200);
    return () => window.clearTimeout(t);
  }, [saved]);

  const resetForm = () => {
    setInvestmentType("nepse");
    setDraft(defaultDraft("nepse"));
    setTxnType("buy");
    setUnitsStr("");
    setPriceStr("");
    setNotes("");
    setTradeDate(todayIso());
  };

  const onInvestmentTypeChange = (nextType: QuickInvestmentType) => {
    setInvestmentType(nextType);
    const nextKind = QUICK_INVESTMENT_TYPES.find((t) => t.id === nextType)?.investmentKind ?? "nepse";
    setDraft(defaultDraft(nextKind));
    setPriceStr("");
    setErr(null);
  };

  const submit = () => {
    setErr(null);
    setSaved(false);
    if (!investmentKind) {
      setErr("Gold and Real Estate transactions stay in their dedicated portfolio modules.");
      return;
    }
    if (!selectedName) {
      setErr("Enter or select a company / instrument.");
      return;
    }
    if (!Number.isFinite(units) || units <= 0) {
      setErr("Enter a valid quantity.");
      return;
    }
    if (showPrice && (!Number.isFinite(price) || price < 0)) {
      setErr(txnType === "dividend" ? "Enter dividend per unit." : "Enter a valid price per unit.");
      return;
    }

    const needsExisting = txnType === "sell" || txnType === "dividend" || txnType === "bonus";
    const trimmedNotes = notes.trim();
    const txNotes =
      txnType === "fpo"
        ? [trimmedNotes, "FPO"].filter(Boolean).join(" · ")
        : trimmedNotes || undefined;
    const ok = onMutate((state) => {
      const key = draft.instrumentKey;
      const name = selectedName.toLowerCase();
      let row = state.investments.find(
        (r) =>
          r.kind === investmentKind &&
          ((key && r.instrumentKey === key) || (!!name && r.name.trim().toLowerCase() === name)),
      );
      let nextState = state;

      if (!row) {
        if (needsExisting) return null;
        row = {
          id: newPortfolioRowId(),
          kind: investmentKind,
          name: selectedName,
          quantity: undefined,
          buyPrice: undefined,
          currency: draft.currency,
          instrumentKey: draft.instrumentKey,
          purchaseDate: tradeDate,
        };
        nextState = { ...state, investments: [...state.investments, row] };
      }

      if (txnType === "sell") {
        return recordInvestmentSell(
          nextState,
          row.id,
          { quantity: units, unitPrice: price, currency: row.currency, tradeDate, notes: txNotes },
          ledgerFx,
        );
      }
      if (txnType === "dividend") {
        return recordInvestmentCashDividend(
          nextState,
          row.id,
          { grossAmount: units * price, currency: row.currency, tradeDate, notes: txNotes },
          ledgerFx,
          user?.id,
        );
      }
      if (txnType === "bonus") {
        return recordInvestmentBonusShare(nextState, row.id, { bonusQuantity: units, tradeDate, notes: txNotes });
      }
      if (txnType === "right") {
        return recordInvestmentRightShare(
          nextState,
          row.id,
          { quantity: units, unitPrice: price, currency: row.currency, tradeDate, notes: txNotes },
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
          notes: txNotes,
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

    resetForm();
    setSaved(true);
  };

  return (
    <section>
      <div className="relative overflow-hidden rounded-[1.75rem] border border-emerald-300/20 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.24),transparent_42%),linear-gradient(145deg,rgba(2,6,23,0.96),rgba(6,78,59,0.58))] p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[0_24px_70px_rgba(0,0,0,0.5)] sm:p-5">
        <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-emerald-200/70 to-transparent" />
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-100">
              <Sparkles size={12} /> Quick transaction
            </p>
            <h2 className="text-2xl font-black tracking-tight text-white">Add investment</h2>
            <p className="mt-1 text-xs font-semibold leading-relaxed text-emerald-100/65">
              Seven fields. No previews. Your portfolio updates from the existing transaction ledger.
            </p>
          </div>
          {saved ? <CheckCircle2 className="mt-1 shrink-0 text-lime-300" size={22} /> : null}
        </div>

        <div className="space-y-3.5">
          <div>
            <span className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-emerald-100/70">
              Transaction type
            </span>
            <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-7">
              {QUICK_TXNS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTxnType(t.id)}
                  className={`min-h-11 rounded-2xl px-2 text-[11px] font-black transition ${
                    txnType === t.id
                      ? t.id === "sell"
                        ? "bg-gradient-to-br from-rose-500 to-red-700 text-white shadow-lg shadow-rose-950/35"
                        : "bg-gradient-to-br from-emerald-400 to-teal-500 text-slate-950 shadow-lg shadow-emerald-950/35"
                      : "border border-emerald-300/15 bg-white/[0.045] text-emerald-50/75"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-emerald-100/70">
              Investment type
            </span>
            <select
              value={investmentType}
              onChange={(e) => onInvestmentTypeChange(e.target.value as QuickInvestmentType)}
              className="wealth-input min-h-12 w-full rounded-2xl px-3 text-base font-black text-white"
            >
              {QUICK_INVESTMENT_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-emerald-100/70">
              Company / Instrument
            </span>
            {showInstrumentSearch && investmentKind ? (
              <InvestmentMasterSelector
                kind={investmentKind}
                instrumentKey={draft.instrumentKey}
                name={draft.name}
                usdPerNpr={usdPerNpr}
                onApplyInstrument={(patch) => {
                  setDraft((prev) => ({ ...prev, ...patch, kind: investmentKind }));
                  if (typeof patch.buyPrice === "number" && Number.isFinite(patch.buyPrice)) {
                    setPriceStr(String(patch.buyPrice));
                  }
                }}
              />
            ) : (
              <input
                value={draft.name}
                onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
                placeholder={investmentType === "gold" ? "Gold" : investmentType === "real_estate" ? "Property name" : "BTC, ETH, SOL..."}
                className="wealth-input-text min-h-12 w-full rounded-2xl px-3 text-base font-black text-white"
              />
            )}
          </label>

          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-emerald-100/70">
                Units / Quantity
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
                disabled={!showPrice}
                className="wealth-input-text min-h-12 w-full rounded-2xl px-3 text-base font-black text-white disabled:opacity-55"
              />
              {marketPrice != null ? (
                <p className="mt-1 text-[10px] font-bold text-emerald-100/55">
                  Market price: {marketPrice.toLocaleString("en-US", { maximumFractionDigits: 2 })} {draft.currency}
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

          <label className="block">
            <span className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-emerald-100/70">
              Notes
            </span>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional"
              className="wealth-input-text min-h-12 w-full rounded-2xl px-3 text-base font-semibold text-white"
            />
          </label>

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
            className={`min-h-14 w-full rounded-2xl bg-gradient-to-r px-5 text-base font-black shadow-[0_18px_42px_rgba(0,0,0,0.32)] transition active:scale-[0.99] ${submitTone}`}
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </section>
  );
}

export function InvestmentsPanel({
  ledger,
  usdPerNpr,
  ledgerFx,
  onMutate,
}: {
  ledger: readonly PortfolioLedgerEntry[];
  usdPerNpr: number;
  ledgerFx: LedgerFx;
  onMutate: (fn: (s: WealthPortfolioStateV2) => WealthPortfolioStateV2 | null) => boolean;
}) {
  void ledger;
  return (
    <section className="wealth-glass rounded-[1.35rem] p-2.5 sm:rounded-[1.5rem] sm:p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-lime-400/15 text-lime-200">
            <LineChart size={18} />
          </div>
          <div>
            <h2 className="text-base font-black text-emerald-50 sm:text-lg">Add Investment / Transaction</h2>
            <p className="text-xs font-bold leading-snug text-emerald-200/65 sm:text-sm">
              Minimal entry only. Holdings, FIFO, gain/loss, and dashboard totals update from the existing portfolio engine.
            </p>
          </div>
        </div>
      </div>

      <QuickInvestmentTransactionForm usdPerNpr={usdPerNpr} ledgerFx={ledgerFx} onMutate={onMutate} />
    </section>
  );
}
