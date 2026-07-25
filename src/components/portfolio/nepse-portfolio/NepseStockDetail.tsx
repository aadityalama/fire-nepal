"use client";

import { ArrowLeft, Trash2 } from "lucide-react";
import { useMemo } from "react";
import type { InvestmentRow, PortfolioLedgerEntry } from "@/components/portfolio/types";
import { formatMoney } from "@/lib/expense-utils";
import {
  CORPORATE_TX_TYPES,
  formatSignedPct,
  investmentLedgerEntries,
  isIpoOrFpo,
  TRADE_TX_TYPES,
  type NepseHoldingRow,
} from "./nepse-portfolio-metrics";
import { DetailMetric, NepseSymbolLogo } from "./NepsePortfolioUi";

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

function LedgerList({ entries, empty }: { entries: PortfolioLedgerEntry[]; empty: string }) {
  if (entries.length === 0) {
    return <p className="rounded-xl border border-dashed border-emerald-400/15 px-3 py-6 text-center text-xs font-bold text-emerald-200/45">{empty}</p>;
  }
  return (
    <ul className="divide-y divide-emerald-400/10 overflow-hidden rounded-2xl border border-emerald-400/12 bg-black/25">
      {entries.map((e) => (
        <li key={e.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
          <div className="min-w-0">
            <p className="text-xs font-black text-emerald-50">{txLabel(e)}</p>
            <p className="mt-0.5 text-[11px] font-semibold text-emerald-100/45">
              {e.tradeDate}
              {e.notes ? ` · ${e.notes}` : ""}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-xs font-black tabular-nums text-white">
              {e.quantity.toLocaleString("en-US", { maximumFractionDigits: 4 })} @ {e.unitPrice.toLocaleString("en-US", { maximumFractionDigits: 2 })}
            </p>
            {typeof e.realizedGainNpr === "number" && Number.isFinite(e.realizedGainNpr) ? (
              <p className={`mt-0.5 text-[11px] font-bold tabular-nums ${e.realizedGainNpr >= 0 ? "text-lime-300" : "text-rose-300"}`}>
                {formatMoney(e.realizedGainNpr, "NPR")}
              </p>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
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
  const entries = useMemo(() => investmentLedgerEntries(ledger, holding.row.id), [ledger, holding.row.id]);
  const buys = entries.filter((e) => e.txType === "buy" || (e.txType === "right_share" && !isIpoOrFpo(e)));
  const sells = entries.filter((e) => e.txType === "sell");
  const dividends = entries.filter((e) => e.txType === "cash_dividend");
  const bonuses = entries.filter((e) => e.txType === "bonus_share");
  const rights = entries.filter((e) => e.txType === "right_share");
  const ipoFpo = entries.filter(isIpoOrFpo);
  const receivable = holding.dividendNpr; // cash dividends booked as receivable-style income

  return (
    <div className="space-y-4 pb-8">
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-300"
        >
          <ArrowLeft size={14} /> Back
        </button>
        <button
          type="button"
          onClick={() => {
            if (window.confirm(`Remove ${holding.symbol} from portfolio?`)) onRemove(holding.row.id);
          }}
          className="inline-flex items-center gap-1.5 rounded-xl border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-xs font-black text-rose-200"
        >
          <Trash2 size={14} /> Remove
        </button>
      </div>

      <div className="flex items-center gap-3 rounded-2xl border border-emerald-400/15 bg-black/30 p-4">
        <NepseSymbolLogo symbol={holding.symbol} />
        <div className="min-w-0">
          <p className="text-xl font-black text-white">{holding.symbol}</p>
          <p className="truncate text-sm font-semibold text-emerald-100/55">{holding.companyName}</p>
        </div>
        <div className="ml-auto shrink-0 text-right">
          <p className="text-sm font-black tabular-nums text-white">{formatMoney(holding.liveNpr, "NPR")}</p>
          <p className={`text-xs font-bold tabular-nums ${(holding.dayChangePct ?? 0) >= 0 ? "text-lime-300" : "text-rose-300"}`}>
            {formatSignedPct(holding.dayChangePct)} today
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        <DetailMetric label="WACC" value={formatMoney(holding.waccNpr, "NPR")} />
        <DetailMetric label="Current units" value={holding.currentUnits.toLocaleString("en-US", { maximumFractionDigits: 4 })} />
        <DetailMetric label="Sold units" value={holding.soldUnits.toLocaleString("en-US", { maximumFractionDigits: 4 })} />
        <DetailMetric label="Sold value" value={formatMoney(holding.soldValueNpr, "NPR")} />
        <DetailMetric
          label="Unreal gain"
          value={formatMoney(holding.pnlNpr, "NPR")}
          tone={holding.pnlNpr >= 0 ? "pos" : "neg"}
        />
        <DetailMetric
          label="Real gain"
          value={formatMoney(holding.realizedGainNpr, "NPR")}
          tone={holding.realizedGainNpr >= 0 ? "pos" : "neg"}
        />
        <DetailMetric label="Receivable amount" value={formatMoney(receivable, "NPR")} />
        <DetailMetric label="Investment cost" value={formatMoney(holding.costNpr, "NPR")} />
        <DetailMetric
          label="Total P/L"
          value={formatMoney(holding.pnlNpr + holding.realizedGainNpr, "NPR")}
          tone={holding.pnlNpr + holding.realizedGainNpr >= 0 ? "pos" : "neg"}
        />
      </div>

      <Section title="Buy history">
        <LedgerList entries={buys} empty="No buy history" />
      </Section>
      <Section title="Sell history">
        <LedgerList entries={sells} empty="No sell history" />
      </Section>
      <Section title="Dividend">
        <LedgerList entries={dividends} empty="No dividends recorded" />
      </Section>
      <Section title="Bonus">
        <LedgerList entries={bonuses} empty="No bonus shares" />
      </Section>
      <Section title="Rights">
        <LedgerList entries={rights} empty="No rights issues" />
      </Section>
      <Section title="IPO / FPO">
        <LedgerList entries={ipoFpo} empty="No IPO/FPO entries" />
      </Section>
      <Section title="Auction">
        <p className="rounded-xl border border-dashed border-emerald-400/15 px-3 py-6 text-center text-xs font-bold text-emerald-200/45">
          Auction lots are not tracked separately yet. Record them as buys when available.
        </p>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-[11px] font-black uppercase tracking-[0.16em] text-emerald-100/45">{title}</h3>
      {children}
    </section>
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
    () =>
      investmentLedgerEntries(ledger).filter(
        (e) => TRADE_TX_TYPES.has(e.txType) || isIpoOrFpo(e),
      ),
    [ledger],
  );

  if (entries.length === 0) {
    return <EmptyTab text="No buy or sell transactions yet." />;
  }

  return (
    <ul className="divide-y divide-emerald-400/10 overflow-hidden rounded-2xl border border-emerald-400/15 bg-black/30">
      {entries.map((e) => {
        const h = holdingsById.get(e.rowId);
        const label = h?.symbol ?? e.assetLabel;
        return (
          <li key={e.id} className="flex items-center gap-3 px-3 py-3 sm:px-4">
            <NepseSymbolLogo symbol={(h?.symbol ?? label).slice(0, 6)} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-white">
                {txLabel(e)} · {label}
              </p>
              <p className="mt-0.5 text-[11px] font-semibold text-emerald-100/45">{e.tradeDate}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-xs font-black tabular-nums text-emerald-50">
                {e.quantity.toLocaleString("en-US", { maximumFractionDigits: 4 })} × {e.unitPrice.toLocaleString("en-US", { maximumFractionDigits: 2 })}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
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
      investmentLedgerEntries(ledger).filter(
        (e) => CORPORATE_TX_TYPES.has(e.txType) || isIpoOrFpo(e),
      ),
    [ledger],
  );

  if (entries.length === 0) {
    return <EmptyTab text="No dividends, bonus, rights, or IPO/FPO actions yet." />;
  }

  return (
    <ul className="divide-y divide-emerald-400/10 overflow-hidden rounded-2xl border border-emerald-400/15 bg-black/30">
      {entries.map((e) => {
        const h = holdingsById.get(e.rowId);
        const label = h?.symbol ?? e.assetLabel;
        return (
          <li key={e.id} className="flex items-center gap-3 px-3 py-3 sm:px-4">
            <NepseSymbolLogo symbol={(h?.symbol ?? label).slice(0, 6)} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-white">
                {txLabel(e)} · {label}
              </p>
              <p className="mt-0.5 text-[11px] font-semibold text-emerald-100/45">{e.tradeDate}</p>
            </div>
            <p className="shrink-0 text-xs font-black tabular-nums text-emerald-50">
              {e.quantity.toLocaleString("en-US", { maximumFractionDigits: 4 })}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

export function NepseAnalyticsPanel({
  summary,
}: {
  summary: import("./nepse-portfolio-metrics").NepsePortfolioSummary;
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
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2.5">
        <DetailMetric label="Portfolio value" value={formatMoney(summary.portfolioValueNpr, "NPR")} />
        <DetailMetric label="Investment cost" value={formatMoney(summary.costNpr, "NPR")} />
        <DetailMetric
          label="Unreal gain"
          value={formatMoney(summary.unrealizedGainNpr, "NPR")}
          tone={summary.unrealizedGainNpr >= 0 ? "pos" : "neg"}
        />
        <DetailMetric
          label="Real gain"
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
      </div>

      <section>
        <h3 className="mb-2 text-[11px] font-black uppercase tracking-[0.16em] text-emerald-100/45">
          Investment breakdown
        </h3>
        {byKind.length === 0 ? (
          <EmptyTab text="No investment breakdown yet." />
        ) : (
          <ul className="space-y-2">
            {byKind.map(([kind, value]) => {
              const pct = summary.portfolioValueNpr > 0 ? (value / summary.portfolioValueNpr) * 100 : 0;
              return (
                <li key={kind} className="rounded-2xl border border-emerald-400/12 bg-black/25 px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2 text-xs font-black">
                    <span className="uppercase tracking-wide text-emerald-100/70">{kind.replaceAll("_", " ")}</span>
                    <span className="tabular-nums text-white">{formatMoney(value, "NPR")}</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
                    <div className="h-full rounded-full bg-emerald-400" style={{ width: `${Math.min(100, pct)}%` }} />
                  </div>
                  <p className="mt-1 text-[10px] font-bold text-emerald-100/40">{pct.toFixed(1)}% of portfolio</p>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h3 className="mb-2 text-[11px] font-black uppercase tracking-[0.16em] text-emerald-100/45">Holdings analytics</h3>
        <ul className="divide-y divide-emerald-400/10 overflow-hidden rounded-2xl border border-emerald-400/15 bg-black/30">
          {summary.holdings.map((h) => (
            <li key={h.row.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-black text-white">{h.symbol}</p>
                <p className="text-[11px] font-semibold text-emerald-100/45">
                  WACC {formatMoney(h.waccNpr, "NPR")} · {h.currentUnits.toLocaleString("en-US", { maximumFractionDigits: 2 })} units
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className={`text-xs font-black tabular-nums ${h.pnlNpr >= 0 ? "text-lime-300" : "text-rose-300"}`}>
                  {formatMoney(h.pnlNpr, "NPR")}
                </p>
                <p className="text-[11px] font-bold text-emerald-100/40">{formatSignedPct(h.dayChangePct)}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function EmptyTab({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-emerald-400/20 bg-black/20 px-4 py-12 text-center text-sm font-bold text-emerald-200/50">
      {text}
    </div>
  );
}
