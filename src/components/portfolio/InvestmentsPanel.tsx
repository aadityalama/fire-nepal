"use client";

import { LineChart, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
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

  useEffect(() => {
    if (!open) return;
    setErr(null);
    setTradeDate(todayIso());
  }, [open, segmentId, row.id]);

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
      onOpenChange={setOpen}
      headerLabel="Transactions"
      summaryRight={
        <>
          Held {held.toLocaleString()} · avg {avg != null && avg > 0 ? `${avg} ${row.currency}` : "—"}
        </>
      }
      segments={INV_TX_SEGMENTS}
      segmentId={segmentId}
      onSegmentId={setSegmentId}
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
