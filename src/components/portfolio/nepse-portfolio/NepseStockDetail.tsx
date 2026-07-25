"use client";

import { ArrowLeft, Trash2 } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import type { InvestmentRow, PortfolioLedgerEntry } from "@/components/portfolio/types";
import { formatMoney } from "@/lib/expense-utils";
import {
  buildNepsePerformanceSeries,
  CORPORATE_TX_TYPES,
  formatSignedPct,
  investmentLedgerEntries,
  isIpoOrFpo,
  NEPSE_CHART_RANGES,
  TRADE_TX_TYPES,
  type NepseChartRange,
  type NepseHoldingRow,
  type NepsePortfolioSummary,
} from "./nepse-portfolio-metrics";
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
  onBack,
  onRemove,
}: {
  holding: NepseHoldingRow;
  ledger: readonly PortfolioLedgerEntry[];
  onBack: () => void;
  onRemove: (id: string) => void;
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
  const series = buildNepsePerformanceSeries(holding.liveNpr, range);

  return (
    <div className="space-y-5 pb-10">
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

      <section className="relative overflow-hidden rounded-[1.5rem] border border-emerald-300/20 bg-[radial-gradient(ellipse_at_top_left,rgba(16,185,129,0.24),transparent_58%),linear-gradient(155deg,#03251d_0%,#071b17_48%,#020617_100%)] p-5 shadow-[0_24px_60px_-28px_rgba(0,0,0,0.9)] sm:p-6">
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-emerald-200/45 to-transparent" />
        <div className="flex items-center gap-4">
          <NepseSymbolLogo symbol={holding.symbol} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xl font-black tracking-tight text-white sm:text-2xl">
              {holding.symbol}
            </p>
            <p className="mt-0.5 truncate text-xs font-semibold text-emerald-100/45 sm:text-sm">
              {holding.companyName}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-base font-black tabular-nums text-white sm:text-lg">
              {formatMoney(holding.liveNpr, "NPR")}
            </p>
            <p
              className={`mt-0.5 text-xs font-bold tabular-nums ${dayPos ? "text-emerald-300" : "text-rose-300"}`}
            >
              {formatSignedPct(holding.dayChangePct)} today
            </p>
          </div>
        </div>

        <div className="mt-5 h-32 w-full sm:h-40">
          <NepsePerformanceChart data={series} positive={holding.pnlNpr >= 0} />
        </div>
        <div
          className="mt-3 flex gap-1 rounded-2xl border border-white/[0.08] bg-black/30 p-1"
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
                className={`flex-1 rounded-xl px-2 py-2 text-[11px] font-black tracking-wide transition-all duration-300 ${
                  on
                    ? "bg-emerald-400/95 text-slate-950 shadow-[0_6px_18px_-6px_rgba(16,185,129,0.8)]"
                    : "text-emerald-100/50 hover:bg-white/[0.06] hover:text-emerald-50"
                }`}
              >
                {r}
              </button>
            );
          })}
        </div>
      </section>

      <Section title="Position">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <DetailMetric label="Units" value={units(holding.currentUnits)} />
          <DetailMetric label="Average cost" value={formatMoney(holding.avgCostNpr, "NPR")} />
          <DetailMetric label="WACC" value={formatMoney(holding.waccNpr, "NPR")} />
          <DetailMetric label="Current value" value={formatMoney(holding.liveNpr, "NPR")} />
          <DetailMetric label="Investment cost" value={formatMoney(holding.costNpr, "NPR")} />
          <DetailMetric
            label="Profit/loss"
            value={formatMoney(totalPnl, "NPR")}
            tone={totalPnl >= 0 ? "pos" : "neg"}
          />
          <DetailMetric
            label="Unrealized gain"
            value={formatMoney(holding.pnlNpr, "NPR")}
            tone={holding.pnlNpr >= 0 ? "pos" : "neg"}
          />
          <DetailMetric
            label="Realized gain"
            value={formatMoney(holding.realizedGainNpr, "NPR")}
            tone={holding.realizedGainNpr >= 0 ? "pos" : "neg"}
          />
          <DetailMetric label="Receivable" value={formatMoney(holding.dividendNpr, "NPR")} />
          <DetailMetric label="Sold units" value={units(holding.soldUnits)} />
          <DetailMetric label="Sold value" value={formatMoney(holding.soldValueNpr, "NPR")} />
          <DetailMetric label="Dividend" value={formatMoney(holding.dividendNpr, "NPR")} />
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
    </div>
  );
}

function LedgerFeed({
  entries,
  holdingsById,
  showAmount,
}: {
  entries: PortfolioLedgerEntry[];
  holdingsById: Map<string, NepseHoldingRow>;
  showAmount?: boolean;
}) {
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
              {showAmount
                ? `${units(e.quantity)} × ${e.unitPrice.toLocaleString("en-US", { maximumFractionDigits: 2 })}`
                : units(e.quantity)}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

export function NepseTransactionsPanel({
  ledger,
  holdingsById,
}: {
  ledger: readonly PortfolioLedgerEntry[];
  holdingsById: Map<string, NepseHoldingRow>;
}) {
  const entries = useMemo(
    () => investmentLedgerEntries(ledger).filter((e) => TRADE_TX_TYPES.has(e.txType) || isIpoOrFpo(e)),
    [ledger],
  );

  if (entries.length === 0) {
    return <NepseEmptyState text="No buy or sell transactions yet." />;
  }

  return <LedgerFeed entries={entries} holdingsById={holdingsById} showAmount />;
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

  return <LedgerFeed entries={entries} holdingsById={holdingsById} />;
}

export function NepseAnalyticsPanel({
  summary,
}: {
  summary: NepsePortfolioSummary;
  rows: InvestmentRow[];
}) {
  const byKind = useMemo(() => {
    const map = new Map<string, number>();
    for (const h of summary.holdings) {
      map.set(h.row.kind, (map.get(h.row.kind) ?? 0) + h.liveNpr);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [summary.holdings]);

  return (
    <div className="space-y-5">
      <Section title="Portfolio metrics">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <DetailMetric label="Portfolio value" value={formatMoney(summary.portfolioValueNpr, "NPR")} />
          <DetailMetric label="Investment cost" value={formatMoney(summary.costNpr, "NPR")} />
          <DetailMetric
            label="Unrealized gain"
            value={formatMoney(summary.unrealizedGainNpr, "NPR")}
            tone={summary.unrealizedGainNpr >= 0 ? "pos" : "neg"}
          />
          <DetailMetric
            label="Realized gain"
            value={formatMoney(summary.realizedGainNpr, "NPR")}
            tone={summary.realizedGainNpr >= 0 ? "pos" : "neg"}
          />
          <DetailMetric
            label="Portfolio return"
            value={formatSignedPct(summary.portfolioReturnPct, 1)}
            tone={(summary.portfolioReturnPct ?? 0) >= 0 ? "pos" : "neg"}
          />
          <DetailMetric
            label="Today's gain"
            value={formatMoney(summary.todayGainNpr, "NPR")}
            tone={summary.todayGainNpr >= 0 ? "pos" : "neg"}
          />
          <DetailMetric label="Dividend received" value={formatMoney(summary.dividendNpr, "NPR")} />
          <DetailMetric label="Holdings" value={String(summary.holdings.length)} />
        </div>
      </Section>

      <Section title="Investment breakdown">
        {byKind.length === 0 ? (
          <NepseEmptyState text="No investment breakdown yet." />
        ) : (
          <ul className="space-y-2.5">
            {byKind.map(([kind, value]) => {
              const pct = summary.portfolioValueNpr > 0 ? (value / summary.portfolioValueNpr) * 100 : 0;
              return (
                <li key={kind} className={`${NEPSE_GLASS} px-4 py-3.5`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-black uppercase tracking-[0.12em] text-emerald-100/60">
                      {kind.replaceAll("_", " ")}
                    </span>
                    <span className="text-sm font-black tabular-nums text-white">
                      {formatMoney(value, "NPR")}
                    </span>
                  </div>
                  <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 transition-[width] duration-700"
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-[10px] font-bold text-emerald-100/35">
                    {pct.toFixed(1)}% of portfolio
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <Section title="Holdings analytics">
        {summary.holdings.length === 0 ? (
          <NepseEmptyState text="Add a holding to see analytics." />
        ) : (
          <ul className={`${NEPSE_GLASS} divide-y divide-white/[0.06] overflow-hidden`}>
            {summary.holdings.map((h) => (
              <li key={h.row.id} className="flex items-center justify-between gap-3 px-4 py-3.5">
                <div className="min-w-0">
                  <p className="text-sm font-black tracking-tight text-white">{h.symbol}</p>
                  <p className="mt-0.5 truncate text-[11px] font-semibold text-emerald-100/40">
                    WACC {formatMoney(h.waccNpr, "NPR")} · {units(h.currentUnits)} units
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p
                    className={`text-xs font-black tabular-nums ${h.pnlNpr >= 0 ? "text-emerald-300" : "text-rose-300"}`}
                  >
                    {formatMoney(h.pnlNpr, "NPR")}
                  </p>
                  <p className="mt-0.5 text-[11px] font-bold tabular-nums text-emerald-100/35">
                    {formatSignedPct(h.dayChangePct)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
