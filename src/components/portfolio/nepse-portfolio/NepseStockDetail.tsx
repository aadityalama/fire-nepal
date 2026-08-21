"use client";

import { ArrowLeft, Trash2 } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import type { PortfolioLedgerEntry } from "@/components/portfolio/types";
import { formatMoney } from "@/lib/expense-utils";
import {
  buildNepsePerformanceSeriesFromCurve,
  CORPORATE_TX_TYPES,
  formatSignedPct,
  investmentLedgerEntries,
  isIpoOrFpo,
  NEPSE_CHART_RANGES,
  TRADE_TX_TYPES,
  type NepseChartRange,
  type NepseHoldingRow,
} from "./nepse-portfolio-metrics";
import { DATA_UNAVAILABLE } from "@/types/market/nepse-company-fundamentals";
import {
  DetailMetric,
  NEPSE_GLASS,
  NepseEmptyState,
  NepsePerformanceChart,
  NepseSectionTitle,
  NepseSymbolLogo,
} from "./NepsePortfolioUi";

function txLabel(e: PortfolioLedgerEntry): string {
  if (isIpoOrFpo(e)) return e.notes?.toLowerCase().includes("fpo") ? "FPO" : "IPO";
  if (e.ledgerAction) return e.ledgerAction;
  switch (e.txType) {
    case "buy":
      return "Buy";
    case "sell":
      return "Sell";
    case "cash_dividend":
      return "Dividend";
    case "bonus_share":
      return "Bonus";
    case "right_share":
      return "Rights";
    default:
      return e.txType;
  }
}

function units(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

function chargesOf(e: PortfolioLedgerEntry): number {
  if (typeof e.fees === "number" && Number.isFinite(e.fees) && e.fees > 0) return e.fees;
  return 0;
}

function totalAmountOf(e: PortfolioLedgerEntry): number {
  const gross = (e.quantity || 0) * (e.unitPrice || 0);
  const fees = chargesOf(e);
  return e.txType === "sell" ? Math.max(0, gross - fees) : gross + fees;
}

function LedgerList({ entries, empty }: { entries: PortfolioLedgerEntry[]; empty: string }) {
  if (entries.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-white/[0.1] bg-white/[0.02] px-4 py-7 text-center text-xs font-bold text-emerald-100/35">
        {empty}
      </p>
    );
  }
  return (
    <ul className={`${NEPSE_GLASS} divide-y divide-white/[0.06] overflow-hidden`}>
      {entries.map((e) => (
        <li key={e.id} className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs font-black tracking-tight text-emerald-50">{txLabel(e)}</p>
            <p className="mt-0.5 truncate text-[11px] font-semibold text-emerald-100/40">
              {e.tradeDate}
              {e.notes ? ` · ${e.notes}` : ""}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-xs font-black tabular-nums text-white">
              {units(e.quantity)} @ {e.unitPrice.toLocaleString("en-US", { maximumFractionDigits: 2 })}
            </p>
            {typeof e.realizedGainNpr === "number" && Number.isFinite(e.realizedGainNpr) ? (
              <p
                className={`mt-0.5 text-[11px] font-bold tabular-nums ${
                  e.realizedGainNpr >= 0 ? "text-emerald-300" : "text-rose-300"
                }`}
              >
                {formatMoney(e.realizedGainNpr, "NPR")}
              </p>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <NepseSectionTitle>{title}</NepseSectionTitle>
      {children}
    </section>
  );
}

export function NepseStockDetail({
  holding,
  ledger,
  equityCurve,
  onBack,
  onRemove,
  onBuy,
  onSell,
}: {
  holding: NepseHoldingRow;
  ledger: readonly PortfolioLedgerEntry[];
  /** Portfolio equity curve (shared); holding chart uses live mark only when curve unavailable. */
  equityCurve?: { date: string; portfolioValueNpr: number }[];
  onBack: () => void;
  onRemove: (id: string) => void;
  onBuy: () => void;
  onSell: () => void;
}) {
  const [range, setRange] = useState<NepseChartRange>("1M");
  const entries = useMemo(
    () => investmentLedgerEntries(ledger, holding.row.id),
    [ledger, holding.row.id],
  );

  const buys = entries.filter((e) => e.txType === "buy" && !isIpoOrFpo(e));
  const sells = entries.filter((e) => e.txType === "sell");
  const dividends = entries.filter((e) => e.txType === "cash_dividend");
  const bonuses = entries.filter((e) => e.txType === "bonus_share");
  const rights = entries.filter((e) => e.txType === "right_share");
  const ipo = entries.filter((e) => isIpoOrFpo(e) && !(e.notes ?? "").toLowerCase().includes("fpo"));
  const fpo = entries.filter((e) => isIpoOrFpo(e) && (e.notes ?? "").toLowerCase().includes("fpo"));
  const corporate = entries.filter((e) => CORPORATE_TX_TYPES.has(e.txType) || isIpoOrFpo(e));
  const totalPnl = holding.pnlNpr + holding.realizedGainNpr;
  const dayPos = (holding.dayChangePct ?? 0) >= 0;
  const series = buildNepsePerformanceSeriesFromCurve(equityCurve ?? [], range);
  const markPrice =
    holding.currentUnits > 0 && Number.isFinite(holding.liveNpr)
      ? holding.liveNpr / holding.currentUnits
      : 0;
  const unrealizedPct = holding.costNpr > 0 ? (holding.pnlNpr / holding.costNpr) * 100 : null;
  const canSell = holding.currentUnits > 0;

  return (
    <div className="space-y-5 pb-28 sm:pb-10">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-2xl border border-white/[0.09] bg-white/[0.045] px-3.5 text-xs font-black text-emerald-200 backdrop-blur-xl transition hover:bg-white/[0.09] hover:text-white"
        >
          <ArrowLeft size={15} strokeWidth={2.5} /> Back
        </button>
        <button
          type="button"
          onClick={() => {
            if (window.confirm(`Remove ${holding.symbol} from portfolio?`)) onRemove(holding.row.id);
          }}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-2xl border border-rose-400/25 bg-rose-500/10 px-3.5 text-xs font-black text-rose-200 transition hover:bg-rose-500/20"
        >
          <Trash2 size={15} strokeWidth={2.25} /> Remove
        </button>
      </div>

      <section className="relative overflow-hidden rounded-[1.25rem] border border-white/[0.09] bg-[radial-gradient(ellipse_at_top_left,rgba(16,185,129,0.14),transparent_55%),linear-gradient(155deg,#041c17_0%,#071412_48%,#020617_100%)] p-4 shadow-[0_20px_50px_-30px_rgba(0,0,0,0.9)] sm:p-5">
        <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-emerald-200/30 to-transparent" />
        <div className="flex items-center gap-3.5">
          <NepseSymbolLogo symbol={holding.symbol} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xl font-semibold tracking-tight text-white sm:text-[1.35rem]">
              {holding.symbol}
            </p>
            <p className="mt-0.5 truncate text-xs font-medium text-zinc-400 sm:text-[13px]">
              {holding.companyName}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-base font-semibold tabular-nums text-white sm:text-lg">
              {markPrice > 0 ? formatMoney(markPrice, "NPR") : formatMoney(holding.liveNpr, "NPR")}
            </p>
            <p
              className={`mt-0.5 text-xs font-semibold tabular-nums ${dayPos ? "text-emerald-400" : "text-rose-400/90"}`}
            >
              {formatSignedPct(holding.dayChangePct)} today
            </p>
          </div>
        </div>

        <div className="mt-4 h-28 w-full sm:h-32">
          {series.length >= 2 ? (
            <NepsePerformanceChart data={series} positive={holding.pnlNpr >= 0} compact />
          ) : (
            <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-white/[0.08] bg-black/20">
              <p className="px-3 text-center text-[11px] font-semibold text-zinc-500">{DATA_UNAVAILABLE}</p>
            </div>
          )}
        </div>
        <div
          className="mt-2.5 flex gap-1 rounded-full border border-white/[0.07] bg-black/25 p-0.5"
          role="group"
          aria-label="Performance range"
        >
          {NEPSE_CHART_RANGES.map((r) => {
            const on = r === range;
            return (
              <button
                key={r}
                type="button"
                aria-pressed={on}
                onClick={() => setRange(r)}
                className={`flex-1 rounded-full px-1.5 py-1.5 text-[10px] font-semibold tracking-wide transition-all duration-300 ${
                  on
                    ? "bg-gradient-to-b from-emerald-400 to-emerald-500 text-slate-950 shadow-[0_4px_14px_-6px_rgba(16,185,129,0.6)]"
                    : "text-zinc-500 hover:bg-white/[0.05] hover:text-zinc-300"
                }`}
              >
                {r}
              </button>
            );
          })}
        </div>

        <div className="mt-4 hidden gap-2.5 sm:flex">
          <button
            type="button"
            onClick={onBuy}
            className="min-h-12 flex-1 rounded-2xl bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500 text-sm font-black text-slate-950 shadow-[0_12px_28px_-12px_rgba(16,185,129,0.55)] transition active:scale-[0.99]"
          >
            BUY
          </button>
          <button
            type="button"
            onClick={onSell}
            disabled={!canSell}
            className="min-h-12 flex-1 rounded-2xl bg-gradient-to-r from-rose-500 via-red-500 to-rose-700 text-sm font-black text-white shadow-[0_12px_28px_-12px_rgba(244,63,94,0.45)] transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
          >
            SELL
          </button>
        </div>
      </section>

      <Section title="Position">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <DetailMetric label="Current market price" value={markPrice > 0 ? formatMoney(markPrice, "NPR") : "—"} />
          <DetailMetric label="Quantity held" value={units(holding.currentUnits)} />
          <DetailMetric label="Average buy price" value={formatMoney(holding.avgCostNpr, "NPR")} />
          <DetailMetric label="Total invested" value={formatMoney(holding.costNpr, "NPR")} />
          <DetailMetric label="Current market value" value={formatMoney(holding.liveNpr, "NPR")} />
          <DetailMetric
            label="Unrealized P/L"
            value={formatMoney(holding.pnlNpr, "NPR")}
            tone={holding.pnlNpr >= 0 ? "pos" : "neg"}
          />
          <DetailMetric
            label="P/L %"
            value={formatSignedPct(unrealizedPct, 1)}
            tone={(unrealizedPct ?? 0) >= 0 ? "pos" : "neg"}
          />
          <DetailMetric
            label="Realized P/L"
            value={formatMoney(holding.realizedGainNpr, "NPR")}
            tone={holding.realizedGainNpr >= 0 ? "pos" : "neg"}
          />
          <DetailMetric
            label="Overall P/L"
            value={formatMoney(totalPnl, "NPR")}
            tone={totalPnl >= 0 ? "pos" : "neg"}
          />
          <DetailMetric label="Dividend received" value={formatMoney(holding.dividendNpr, "NPR")} />
          <DetailMetric
            label="Dividend pending"
            value={holding.currentUnits > 0 && holding.dividendNpr <= 0 ? "Pending" : "—"}
          />
          <DetailMetric label="WACC" value={formatMoney(holding.waccNpr, "NPR")} />
        </div>
      </Section>

      <Section title="Analytics">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <DetailMetric
            label="Return on cost"
            value={formatSignedPct(holding.costNpr > 0 ? (holding.pnlNpr / holding.costNpr) * 100 : null, 1)}
            tone={holding.pnlNpr >= 0 ? "pos" : "neg"}
          />
          <DetailMetric label="Today's change" value={formatSignedPct(holding.dayChangePct)} tone={dayPos ? "pos" : "neg"} />
          <DetailMetric
            label="Today's gain"
            value={holding.dayChangeNpr == null ? "—" : formatMoney(holding.dayChangeNpr, "NPR")}
            tone={(holding.dayChangeNpr ?? 0) >= 0 ? "pos" : "neg"}
          />
          <DetailMetric label="Category" value={holding.row.kind.replaceAll("_", " ")} />
          <DetailMetric label="Currency" value={holding.row.currency} />
          <DetailMetric label="Since" value={holding.row.purchaseDate?.trim() || "—"} />
        </div>
      </Section>

      <Section title="Buy history">
        <LedgerList entries={buys} empty="No buy history" />
      </Section>
      <Section title="Sell history">
        <LedgerList entries={sells} empty="No sell history" />
      </Section>
      <Section title="Dividend history">
        <LedgerList entries={dividends} empty="No dividends recorded" />
      </Section>
      <Section title="Bonus shares">
        <LedgerList entries={bonuses} empty="No bonus shares" />
      </Section>
      <Section title="Rights">
        <LedgerList entries={rights} empty="No rights issues" />
      </Section>
      <Section title="IPO">
        <LedgerList entries={ipo} empty="No IPO entries" />
      </Section>
      <Section title="FPO">
        <LedgerList entries={fpo} empty="No FPO entries" />
      </Section>
      <Section title="Auction">
        <p className="rounded-2xl border border-dashed border-white/[0.1] bg-white/[0.02] px-4 py-7 text-center text-xs font-bold text-emerald-100/35">
          Auction lots are not tracked separately yet — record them as buys when allotted.
        </p>
      </Section>
      <Section title="Corporate actions">
        <LedgerList entries={corporate} empty="No corporate actions yet" />
      </Section>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.08] bg-slate-950/92 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl sm:hidden">
        <div className="mx-auto flex max-w-lg gap-2.5">
          <button
            type="button"
            onClick={onBuy}
            className="min-h-12 flex-1 rounded-2xl bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500 text-sm font-black text-slate-950 shadow-[0_12px_28px_-12px_rgba(16,185,129,0.55)] transition active:scale-[0.99]"
          >
            BUY
          </button>
          <button
            type="button"
            onClick={onSell}
            disabled={!canSell}
            className="min-h-12 flex-1 rounded-2xl bg-gradient-to-r from-rose-500 via-red-500 to-rose-700 text-sm font-black text-white shadow-[0_12px_28px_-12px_rgba(244,63,94,0.45)] transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
          >
            SELL
          </button>
        </div>
      </div>
    </div>
  );
}

function LedgerFeed({
  entries,
  holdingsById,
}: {
  entries: PortfolioLedgerEntry[];
  holdingsById: Map<string, NepseHoldingRow>;
}) {
  return (
    <ul className={`${NEPSE_GLASS} divide-y divide-white/[0.06] overflow-hidden`}>
      {entries.map((e) => {
        const h = holdingsById.get(e.rowId);
        const label = h?.symbol ?? e.assetLabel;
        const isSell = e.txType === "sell";
        const charges = chargesOf(e);
        const total = totalAmountOf(e);
        return (
          <li key={e.id} className="px-4 py-3.5 sm:px-5">
            <div className="flex items-start gap-3.5">
              <NepseSymbolLogo symbol={label.slice(0, 6)} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <p className="truncate text-sm font-black tracking-tight text-white">{label}</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${
                      isSell
                        ? "bg-rose-500/15 text-rose-200"
                        : "bg-emerald-400/15 text-emerald-200"
                    }`}
                  >
                    {txLabel(e)}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] font-semibold text-emerald-100/40">{e.tradeDate}</p>
                <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] font-semibold tabular-nums text-emerald-100/55 sm:grid-cols-4">
                  <p>
                    Qty <span className="text-emerald-50">{units(e.quantity)}</span>
                  </p>
                  <p>
                    Price{" "}
                    <span className="text-emerald-50">
                      {e.unitPrice.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                    </span>
                  </p>
                  <p>
                    Charges{" "}
                    <span className="text-emerald-50">
                      {charges > 0 ? formatMoney(charges, e.currency) : "—"}
                    </span>
                  </p>
                  <p>
                    Total <span className="text-white">{formatMoney(total, e.currency)}</span>
                  </p>
                </div>
                {isSell && typeof e.realizedGainNpr === "number" && Number.isFinite(e.realizedGainNpr) ? (
                  <p
                    className={`mt-1.5 text-[11px] font-bold tabular-nums ${
                      e.realizedGainNpr >= 0 ? "text-emerald-300" : "text-rose-300"
                    }`}
                  >
                    Realized P/L {formatMoney(e.realizedGainNpr, "NPR")}
                  </p>
                ) : null}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export type NepseTxnFilter = "all" | "buy" | "sell";

const TXN_FILTERS: { id: NepseTxnFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "buy", label: "BUY" },
  { id: "sell", label: "SELL" },
];

export function NepseTransactionsPanel({
  ledger,
  holdingsById,
}: {
  ledger: readonly PortfolioLedgerEntry[];
  holdingsById: Map<string, NepseHoldingRow>;
}) {
  const [filter, setFilter] = useState<NepseTxnFilter>("all");

  const entries = useMemo(() => {
    const base = investmentLedgerEntries(ledger).filter(
      (e) => TRADE_TX_TYPES.has(e.txType) || isIpoOrFpo(e),
    );
    if (filter === "buy") {
      return base.filter((e) => e.txType === "buy" || isIpoOrFpo(e));
    }
    if (filter === "sell") {
      return base.filter((e) => e.txType === "sell");
    }
    return base;
  }, [ledger, filter]);

  return (
    <div className="space-y-4">
      <div
        className="flex gap-1.5 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-1"
        role="group"
        aria-label="Transaction filter"
      >
        {TXN_FILTERS.map((f) => {
          const on = filter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              aria-pressed={on}
              onClick={() => setFilter(f.id)}
              className={`min-h-10 flex-1 rounded-xl text-xs font-black tracking-wide transition ${
                on
                  ? f.id === "sell"
                    ? "bg-gradient-to-br from-rose-500 to-red-700 text-white shadow-md shadow-rose-950/30"
                    : "bg-gradient-to-br from-emerald-400 to-teal-500 text-slate-950 shadow-md shadow-emerald-950/30"
                  : "text-emerald-100/55 hover:bg-white/[0.04] hover:text-emerald-50"
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {entries.length === 0 ? (
        <NepseEmptyState
          text={
            filter === "buy"
              ? "No buy transactions yet."
              : filter === "sell"
                ? "No sell transactions yet."
                : "No buy or sell transactions yet."
          }
        />
      ) : (
        <LedgerFeed entries={entries} holdingsById={holdingsById} />
      )}
    </div>
  );
}

export function NepseCorporateActionsPanel({
  ledger,
  holdingsById,
}: {
  ledger: readonly PortfolioLedgerEntry[];
  holdingsById: Map<string, NepseHoldingRow>;
}) {
  const entries = useMemo(
    () =>
      investmentLedgerEntries(ledger).filter((e) => CORPORATE_TX_TYPES.has(e.txType) || isIpoOrFpo(e)),
    [ledger],
  );

  if (entries.length === 0) {
    return <NepseEmptyState text="No dividends, bonus, rights, or IPO/FPO actions yet." />;
  }

  return (
    <ul className={`${NEPSE_GLASS} divide-y divide-white/[0.06] overflow-hidden`}>
      {entries.map((e) => {
        const h = holdingsById.get(e.rowId);
        const label = h?.symbol ?? e.assetLabel;
        return (
          <li key={e.id} className="flex items-center gap-3.5 px-4 py-3.5 sm:px-5">
            <NepseSymbolLogo symbol={label.slice(0, 6)} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black tracking-tight text-white">
                {txLabel(e)} · {label}
              </p>
              <p className="mt-0.5 text-[11px] font-semibold text-emerald-100/40">{e.tradeDate}</p>
            </div>
            <p className="shrink-0 text-right text-xs font-black tabular-nums text-emerald-50">
              {units(e.quantity)}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
