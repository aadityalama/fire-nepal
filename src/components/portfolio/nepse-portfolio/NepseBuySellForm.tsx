"use client";

import { useMemo, useState, type FocusEvent } from "react";
import { PortfolioIsoDateField } from "@/components/portfolio/PortfolioIsoDateField";
import type { LedgerFx } from "@/components/portfolio/portfolio-ledger";
import {
  estimateInvestmentSellRealized,
  recordInvestmentBuy,
  recordInvestmentSell,
} from "@/components/portfolio/portfolio-ledger";
import { portfolioTxnTodayIso } from "@/components/portfolio/transaction-ui/PortfolioTransactionStrip";
import type { WealthPortfolioStateV2 } from "@/components/portfolio/types";
import { formatMoney } from "@/lib/expense-utils";
import type { NepseHoldingRow } from "./nepse-portfolio-metrics";
import { NepseSymbolLogo } from "./NepsePortfolioUi";

export type NepseTradeMode = "buy" | "sell";

export const NEPSE_BUY_SELL_FORM_ID = "nepse-buy-sell-form";

function numericFromDraft(value: string): number {
  const n = Number(value.replace(/,/g, ""));
  return Number.isFinite(n) ? n : Number.NaN;
}

function optionalNonNeg(value: string): number | undefined {
  const t = value.trim();
  if (!t) return undefined;
  const n = numericFromDraft(t);
  if (!Number.isFinite(n) || n < 0) return Number.NaN;
  return n;
}

function scrollFieldIntoView(e: FocusEvent<HTMLElement>) {
  // Keep focused fields visible above the sticky Save CTA / keyboard on iPhone Safari.
  window.requestAnimationFrame(() => {
    e.target.scrollIntoView({ block: "center", behavior: "smooth" });
  });
}

export function NepseBuySellSubmitButton({
  mode,
  formId = NEPSE_BUY_SELL_FORM_ID,
}: {
  mode: NepseTradeMode;
  formId?: string;
}) {
  const isSell = mode === "sell";
  const submitLabel = isSell ? "Save Sell Transaction" : "Save Buy Transaction";
  const submitTone = isSell
    ? "from-rose-500 via-red-500 to-rose-700 text-white shadow-rose-950/35"
    : "from-emerald-400 via-emerald-500 to-teal-500 text-slate-950 shadow-emerald-950/35";

  return (
    <button
      type="submit"
      form={formId}
      className={`min-h-14 w-full rounded-2xl bg-gradient-to-r px-5 text-base font-black shadow-[0_18px_42px_rgba(0,0,0,0.32)] transition active:scale-[0.99] ${submitTone}`}
    >
      {submitLabel}
    </button>
  );
}

export function NepseBuySellForm({
  mode,
  holding,
  ledgerFx,
  onMutate,
  onComplete,
  formId = NEPSE_BUY_SELL_FORM_ID,
}: {
  mode: NepseTradeMode;
  holding: NepseHoldingRow;
  ledgerFx: LedgerFx;
  onMutate: (fn: (s: WealthPortfolioStateV2) => WealthPortfolioStateV2 | null) => boolean;
  onComplete?: () => void;
  formId?: string;
}) {
  const isSell = mode === "sell";
  const currency = holding.row.currency;
  const markPrice =
    holding.currentUnits > 0 && Number.isFinite(holding.liveNpr)
      ? holding.liveNpr / holding.currentUnits
      : holding.avgCostNpr;

  const [tradeDate, setTradeDate] = useState(portfolioTxnTodayIso);
  const [qtyStr, setQtyStr] = useState("");
  const [priceStr, setPriceStr] = useState(
    Number.isFinite(markPrice) && markPrice > 0
      ? String(Number(markPrice.toFixed(2)))
      : "",
  );
  const [brokerageStr, setBrokerageStr] = useState("");
  const [otherChargesStr, setOtherChargesStr] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const quantity = numericFromDraft(qtyStr);
  const unitPrice = numericFromDraft(priceStr);
  const brokerage = optionalNonNeg(brokerageStr);
  const otherCharges = optionalNonNeg(otherChargesStr);

  const fees =
    (Number.isFinite(brokerage) ? (brokerage ?? 0) : 0) +
    (Number.isFinite(otherCharges) ? (otherCharges ?? 0) : 0);

  const gross = Number.isFinite(quantity) && Number.isFinite(unitPrice) && quantity > 0 && unitPrice >= 0
    ? quantity * unitPrice
    : null;

  const totalAmount =
    gross == null ? null : isSell ? Math.max(0, gross - fees) : gross + fees;

  const sellPreview = useMemo(() => {
    if (!isSell) return null;
    if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitPrice) || unitPrice < 0) {
      return null;
    }
    return estimateInvestmentSellRealized(
      holding.row,
      { quantity, unitPrice, currency, fees: fees > 0 ? fees : undefined },
      ledgerFx,
    );
  }, [isSell, quantity, unitPrice, currency, fees, holding.row, ledgerFx]);

  const submit = () => {
    setErr(null);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      setErr("Enter a valid quantity.");
      return;
    }
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      setErr(isSell ? "Enter a valid sell price." : "Enter a valid buy price.");
      return;
    }
    if (brokerage != null && Number.isNaN(brokerage)) {
      setErr("Brokerage/commission must be zero or positive.");
      return;
    }
    if (otherCharges != null && Number.isNaN(otherCharges)) {
      setErr("Other charges must be zero or positive.");
      return;
    }
    if (isSell && quantity > holding.currentUnits + 1e-9) {
      setErr(
        `Cannot sell more than available holdings (${holding.currentUnits.toLocaleString("en-US", {
          maximumFractionDigits: 4,
        })} units).`,
      );
      return;
    }

    const feeTotal = fees > 0 ? fees : undefined;
    const chargeNoteParts: string[] = [];
    if ((brokerage ?? 0) > 0) chargeNoteParts.push(`Brokerage ${brokerage}`);
    if ((otherCharges ?? 0) > 0) chargeNoteParts.push(`Other ${otherCharges}`);

    const ok = onMutate((state) => {
      const payload = {
        quantity,
        unitPrice,
        currency,
        tradeDate,
        fees: feeTotal,
        notes: chargeNoteParts.length ? chargeNoteParts.join(" · ") : undefined,
        brokerage: (brokerage ?? 0) > 0 ? brokerage : undefined,
        otherCharges: (otherCharges ?? 0) > 0 ? otherCharges : undefined,
        portfolioTrackingOnly: true as const,
      };

      if (isSell) {
        return recordInvestmentSell(state, holding.row.id, payload, ledgerFx);
      }
      return recordInvestmentBuy(
        state,
        holding.row.id,
        { ...payload, ledgerFlow: "market_buy" },
        ledgerFx,
      );
    });

    if (!ok) {
      setErr(
        isSell
          ? `Cannot sell more than available holdings (${holding.currentUnits.toLocaleString("en-US", {
              maximumFractionDigits: 4,
            })} units), or check the date and inputs.`
          : "Could not save this buy. Check the date and inputs.",
      );
      return;
    }

    onComplete?.();
  };

  return (
    <form
      id={formId}
      className="relative space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="flex items-center gap-3 rounded-[1.1rem] border border-white/[0.08] bg-white/[0.035] p-3.5">
        <NepseSymbolLogo symbol={holding.symbol} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-black tracking-tight text-white">{holding.symbol}</p>
          <p className="mt-0.5 truncate text-[11px] font-semibold text-emerald-100/45">
            {holding.companyName}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-100/45">Held</p>
          <p className="text-xs font-black tabular-nums text-emerald-50">
            {holding.currentUnits.toLocaleString("en-US", { maximumFractionDigits: 4 })}
          </p>
        </div>
      </div>

      <p className="rounded-2xl border border-amber-400/15 bg-amber-500/[0.07] px-3 py-2 text-[11px] font-semibold leading-relaxed text-amber-100/80">
        Portfolio tracking only — this records the trade in your FIRE Nepal ledger. It does not place
        a real order on NEPSE or with any broker.
      </p>

      <label className="block">
        <span className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-emerald-100/70">
          Stock symbol
        </span>
        <input
          value={holding.symbol}
          readOnly
          className="wealth-input-text min-h-12 w-full rounded-2xl px-3 text-base font-black text-white opacity-90"
        />
      </label>

      <div onFocusCapture={scrollFieldIntoView}>
        <PortfolioIsoDateField
          label={isSell ? "Sell date" : "Buy date"}
          value={tradeDate}
          onChange={(next) => setTradeDate(next ?? portfolioTxnTodayIso())}
          className="max-w-none sm:max-w-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-2" onFocusCapture={scrollFieldIntoView}>
        <label className="block">
          <span className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-emerald-100/70">
            Quantity
          </span>
          <input
            value={qtyStr}
            onChange={(e) => setQtyStr(e.target.value)}
            inputMode="decimal"
            placeholder="100"
            className="wealth-input-text min-h-12 w-full rounded-2xl px-3 text-base font-black text-white"
          />
          {isSell ? (
            <p className="mt-1 text-[10px] font-bold text-emerald-100/50">
              Available:{" "}
              {holding.currentUnits.toLocaleString("en-US", { maximumFractionDigits: 4 })}
            </p>
          ) : null}
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-emerald-100/70">
            {isSell ? "Sell price" : "Buy price"}
          </span>
          <input
            value={priceStr}
            onChange={(e) => setPriceStr(e.target.value)}
            inputMode="decimal"
            placeholder="450"
            className="wealth-input-text min-h-12 w-full rounded-2xl px-3 text-base font-black text-white"
          />
          {Number.isFinite(markPrice) && markPrice > 0 ? (
            <p className="mt-1 text-[10px] font-bold text-emerald-100/50">
              Market: {markPrice.toLocaleString("en-US", { maximumFractionDigits: 2 })} {currency}
            </p>
          ) : null}
        </label>
      </div>

      <div className="grid grid-cols-2 gap-2" onFocusCapture={scrollFieldIntoView}>
        <label className="block">
          <span className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-emerald-100/70">
            Brokerage / commission
          </span>
          <input
            value={brokerageStr}
            onChange={(e) => setBrokerageStr(e.target.value)}
            inputMode="decimal"
            placeholder="0"
            className="wealth-input-text min-h-12 w-full rounded-2xl px-3 text-base font-black text-white"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-emerald-100/70">
            Other charges
          </span>
          <input
            value={otherChargesStr}
            onChange={(e) => setOtherChargesStr(e.target.value)}
            inputMode="decimal"
            placeholder="0"
            className="wealth-input-text min-h-12 w-full rounded-2xl px-3 text-base font-black text-white"
          />
        </label>
      </div>

      <div className="rounded-[1.1rem] border border-white/[0.08] bg-white/[0.03] px-3.5 py-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] font-black uppercase tracking-wide text-emerald-100/55">
            {isSell ? "Net proceeds" : "Total transaction amount"}
          </span>
          <span className="text-sm font-black tabular-nums text-white">
            {totalAmount == null ? "—" : formatMoney(totalAmount, currency)}
          </span>
        </div>
        {isSell && sellPreview && quantity <= holding.currentUnits + 1e-9 ? (
          <div className="mt-2 flex items-center justify-between gap-3 border-t border-white/[0.06] pt-2">
            <span className="text-[11px] font-black uppercase tracking-wide text-emerald-100/55">
              Realized profit/loss
            </span>
            <span
              className={`text-sm font-black tabular-nums ${
                sellPreview.realizedGainNpr >= 0 ? "text-emerald-300" : "text-rose-300"
              }`}
            >
              {formatMoney(sellPreview.realizedGainNpr, "NPR")}
            </span>
          </div>
        ) : null}
      </div>

      {err ? (
        <p className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-200">
          {err}
        </p>
      ) : null}
    </form>
  );
}
