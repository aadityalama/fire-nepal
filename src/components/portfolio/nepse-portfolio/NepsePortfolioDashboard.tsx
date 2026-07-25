"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { QuickInvestmentTransactionForm } from "@/components/portfolio/InvestmentsPanel";
import type { LedgerFx } from "@/components/portfolio/portfolio-ledger";
import type { InvestmentRow, PortfolioLedgerEntry, WealthPortfolioStateV2 } from "@/components/portfolio/types";
import type { MarketSnapshot } from "@/types/market";
import {
  buildNepsePortfolioSummary,
  filterNepseHoldings,
  type NepseChartRange,
  type NepseHoldingFilter,
} from "./nepse-portfolio-metrics";
import {
  NepseAddStockFab,
  NepseHeroCard,
  NepseHoldingsFilterBar,
  NepseHoldingsList,
  NepseQuickStats,
  NepseSheet,
  NepseTopTabs,
  NepseWorkspaceHeader,
  type NepseTabId,
} from "./NepsePortfolioUi";
import {
  NepseAnalyticsPanel,
  NepseCorporateActionsPanel,
  NepseStockDetail,
  NepseTransactionsPanel,
} from "./NepseStockDetail";

type View = { kind: "tabs"; tab: NepseTabId } | { kind: "detail"; id: string };

export function NepsePortfolioDashboard({
  rows,
  ledger,
  krwPerNpr,
  usdPerNpr,
  ledgerFx,
  liveMarket,
  netWorthLiveNpr,
  onMutate,
  onRemove,
}: {
  rows: InvestmentRow[];
  ledger: readonly PortfolioLedgerEntry[];
  krwPerNpr: number;
  usdPerNpr: number;
  ledgerFx: LedgerFx;
  liveMarket: MarketSnapshot | null;
  netWorthLiveNpr: number | null;
  onMutate: (fn: (s: WealthPortfolioStateV2) => WealthPortfolioStateV2 | null) => boolean;
  onRemove: (id: string) => void;
}) {
  const [view, setView] = useState<View>({ kind: "tabs", tab: "overview" });
  const [addOpen, setAddOpen] = useState(false);
  const [range, setRange] = useState<NepseChartRange>("1M");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<NepseHoldingFilter>("all");
  const searchRef = useRef<HTMLInputElement>(null);

  const summary = useMemo(
    () => buildNepsePortfolioSummary(rows, ledger, krwPerNpr, usdPerNpr, liveMarket, netWorthLiveNpr),
    [rows, ledger, krwPerNpr, usdPerNpr, liveMarket, netWorthLiveNpr],
  );

  const holdingsById = useMemo(
    () => new Map(summary.holdings.map((h) => [h.row.id, h])),
    [summary.holdings],
  );
  const visibleHoldings = useMemo(
    () => filterNepseHoldings(summary.holdings, query, filter),
    [summary.holdings, query, filter],
  );

  const detailHolding = view.kind === "detail" ? holdingsById.get(view.id) : undefined;
  const activeTab = view.kind === "tabs" ? view.tab : "overview";
  const isDetail = view.kind === "detail" && detailHolding != null;
  const showFab = !isDetail && (activeTab === "overview" || activeTab === "holdings");

  const openHolding = useCallback((id: string) => setView({ kind: "detail", id }), []);

  const focusSearch = useCallback(() => {
    setView({ kind: "tabs", tab: "holdings" });
    // Search input mounts with the Holdings tab.
    window.requestAnimationFrame(() => searchRef.current?.focus());
  }, []);

  const filteredEmptyLabel =
    query.trim() || filter !== "all"
      ? "No holdings match this search or filter."
      : "No holdings yet. Tap + Add Stock to begin.";

  return (
    <div className="relative w-full min-w-0 pb-28">
      {isDetail && detailHolding ? (
        <NepseStockDetail
          holding={detailHolding}
          ledger={ledger}
          onBack={() => setView({ kind: "tabs", tab: "holdings" })}
          onRemove={(id) => {
            onRemove(id);
            setView({ kind: "tabs", tab: "holdings" });
          }}
        />
      ) : (
        <div className="space-y-6">
          <NepseWorkspaceHeader onSearch={focusSearch} notificationCount={0} />

          <NepseTopTabs active={activeTab} onChange={(tab) => setView({ kind: "tabs", tab })} />

          {activeTab === "overview" ? (
            <div className="animate-fade-in space-y-6">
              <NepseHeroCard summary={summary} range={range} onRangeChange={setRange} />
              <NepseQuickStats summary={summary} />
              <section>
                <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
                  Holdings
                </h2>
                <NepseHoldingsList holdings={summary.holdings} onOpen={openHolding} />
              </section>
            </div>
          ) : null}

          {activeTab === "holdings" ? (
            <div className="animate-fade-in space-y-4">
              <NepseHoldingsFilterBar
                query={query}
                onQueryChange={setQuery}
                filter={filter}
                onFilterChange={setFilter}
                inputRef={searchRef}
              />
              <NepseHoldingsList
                holdings={visibleHoldings}
                onOpen={openHolding}
                emptyLabel={filteredEmptyLabel}
              />
            </div>
          ) : null}

          {activeTab === "transactions" ? (
            <div className="animate-fade-in">
              <NepseTransactionsPanel ledger={ledger} holdingsById={holdingsById} />
            </div>
          ) : null}

          {activeTab === "corporate" ? (
            <div className="animate-fade-in">
              <NepseCorporateActionsPanel ledger={ledger} holdingsById={holdingsById} />
            </div>
          ) : null}

          {activeTab === "analytics" ? (
            <div className="animate-fade-in">
              <NepseAnalyticsPanel summary={summary} rows={rows} />
            </div>
          ) : null}
        </div>
      )}

      {showFab ? <NepseAddStockFab onClick={() => setAddOpen(true)} /> : null}

      <NepseSheet open={addOpen} title="Add Stock" onClose={() => setAddOpen(false)}>
        <QuickInvestmentTransactionForm
          usdPerNpr={usdPerNpr}
          ledgerFx={ledgerFx}
          onMutate={onMutate}
          compact
          onComplete={() => setAddOpen(false)}
        />
      </NepseSheet>
    </div>
  );
}
