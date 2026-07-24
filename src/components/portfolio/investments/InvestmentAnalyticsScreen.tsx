"use client";

import { useMemo } from "react";
import {
  formatSignedPct,
  type InvestmentCardModel,
  type InvestmentPortfolioSummary,
} from "@/components/portfolio/investments/investment-card-model";
import { EmptyState, InvGlass, InvSectionTitle, ToneValue, formatInvMoney } from "@/components/portfolio/investments/InvestmentUi";
import { InteractivePortfolioTable } from "@/components/portfolio/InteractivePortfolioTable";
import type { InvestmentRow } from "@/components/portfolio/types";
import type { MarketSnapshot } from "@/types/market";

export function InvestmentAnalyticsScreen({
  models,
  summary,
  rows,
  krwPerNpr,
  usdPerNpr,
  liveMarket,
  netWorthLiveNpr,
  onChange,
  onRemove,
  onOpenHolding,
}: {
  models: InvestmentCardModel[];
  summary: InvestmentPortfolioSummary;
  rows: InvestmentRow[];
  krwPerNpr: number;
  usdPerNpr: number;
  liveMarket: MarketSnapshot | null;
  netWorthLiveNpr: number | null;
  onChange: (id: string, patch: Partial<InvestmentRow>) => void;
  onRemove: (id: string) => void;
  onOpenHolding: (id: string) => void;
}) {
  const top = useMemo(
    () => [...models].sort((a, b) => b.currentValueNpr - a.currentValueNpr).slice(0, 5),
    [models],
  );
  const winners = useMemo(
    () =>
      [...models]
        .filter((m) => m.totalPnlNpr > 0)
        .sort((a, b) => (b.totalPnlPct ?? -Infinity) - (a.totalPnlPct ?? -Infinity))
        .slice(0, 3),
    [models],
  );
  const laggards = useMemo(
    () =>
      [...models]
        .filter((m) => m.totalPnlNpr < 0)
        .sort((a, b) => (a.totalPnlPct ?? Infinity) - (b.totalPnlPct ?? Infinity))
        .slice(0, 3),
    [models],
  );

  return (
    <section className="space-y-5 pb-24">
      <InvSectionTitle
        title="Analytics"
        subtitle="Allocation, leaders, and the full position table for advanced edits"
      />

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <InvGlass className="p-3.5">
          <p className="text-[10px] font-black uppercase tracking-wider text-emerald-200/45">Value</p>
          <p className="mt-1 text-lg font-black tabular-nums text-white">{formatInvMoney(summary.portfolioValueNpr)}</p>
        </InvGlass>
        <InvGlass className="p-3.5">
          <p className="text-[10px] font-black uppercase tracking-wider text-emerald-200/45">Unrealized</p>
          <ToneValue value={summary.overallPnlNpr} className="mt-1 block text-lg">
            {formatInvMoney(summary.overallPnlNpr)}
          </ToneValue>
        </InvGlass>
        <InvGlass className="p-3.5">
          <p className="text-[10px] font-black uppercase tracking-wider text-emerald-200/45">Dividends</p>
          <p className="mt-1 text-lg font-black tabular-nums text-cyan-200">{formatInvMoney(summary.dividendTotalNpr)}</p>
        </InvGlass>
        <InvGlass className="p-3.5">
          <p className="text-[10px] font-black uppercase tracking-wider text-emerald-200/45">Realized</p>
          <ToneValue value={summary.realizedGainNpr} className="mt-1 block text-lg">
            {formatInvMoney(summary.realizedGainNpr)}
          </ToneValue>
        </InvGlass>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <LeaderBoard title="Largest holdings" items={top} onOpen={onOpenHolding} mode="value" />
        <div className="space-y-4">
          <LeaderBoard title="Top gainers" items={winners} onOpen={onOpenHolding} mode="pnl" />
          <LeaderBoard title="Needs attention" items={laggards} onOpen={onOpenHolding} mode="pnl" />
        </div>
      </div>

      {models.length === 0 ? (
        <EmptyState title="Nothing to analyze yet" subtitle="Add holdings to unlock allocation and performance rollups." />
      ) : (
        <div className="space-y-2">
          <InvSectionTitle title="Position table" subtitle="Full search, filters, sort, edit, and delete — unchanged engine" />
          <InteractivePortfolioTable
            rows={rows}
            krwPerNpr={krwPerNpr}
            usdPerNpr={usdPerNpr}
            liveMarket={liveMarket}
            netWorthLiveNpr={netWorthLiveNpr}
            onChange={onChange}
            onRemove={onRemove}
          />
        </div>
      )}
    </section>
  );
}

function LeaderBoard({
  title,
  items,
  onOpen,
  mode,
}: {
  title: string;
  items: InvestmentCardModel[];
  onOpen: (id: string) => void;
  mode: "value" | "pnl";
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-black uppercase tracking-wider text-emerald-200/50">{title}</p>
      {items.length === 0 ? (
        <InvGlass className="p-4 text-sm font-semibold text-emerald-200/50">No rows yet</InvGlass>
      ) : (
        <ul className="space-y-2">
          {items.map((m) => (
            <li key={m.row.id}>
              <InvGlass className="flex items-center justify-between gap-3 p-3" onClick={() => onOpen(m.row.id)}>
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-emerald-50">{m.symbol}</p>
                  <p className="truncate text-[11px] font-semibold text-emerald-200/50">{m.companyName}</p>
                </div>
                {mode === "value" ? (
                  <p className="shrink-0 text-sm font-black tabular-nums text-white">{formatInvMoney(m.currentValueNpr)}</p>
                ) : (
                  <ToneValue value={m.totalPnlNpr} className="shrink-0 text-sm">
                    {formatSignedPct(m.totalPnlPct)}
                  </ToneValue>
                )}
              </InvGlass>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
