"use client";

import { Plus } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
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
import { NepseAddStockPicker } from "./NepseAddStockPicker";
import { NepseBuySellForm, type NepseTradeMode } from "./NepseBuySellForm";
import {
  NepseCorporateActionsPanel,
  NepseStockDetail,
  NepseTransactionsPanel,
} from "./NepseStockDetail";
import { InstitutionalAnalyticsPanel, useInstitutionalAnalytics } from "./InstitutionalAnalyticsPanel";

type View = { kind: "tabs"; tab: NepseTabId } | { kind: "detail"; id: string };
type TradeSheet = { mode: NepseTradeMode; holdingId: string } | null;

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
  const [tradeSheet, setTradeSheet] = useState<TradeSheet>(null);
  const [range, setRange] = useState<NepseChartRange>("1M");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<NepseHoldingFilter>("all");
  const searchRef = useRef<HTMLInputElement>(null);

  const summary = useMemo(
    () => buildNepsePortfolioSummary(rows, ledger, krwPerNpr, usdPerNpr, liveMarket, netWorthLiveNpr),
    [rows, ledger, krwPerNpr, usdPerNpr, liveMarket, netWorthLiveNpr],
  );

  const { analytics, loading: analyticsLoading } = useInstitutionalAnalytics({
    summary,
    holdings: summary.holdings,
    rows,
    ledger,
  });

  const holdingsById = useMemo(
    () => new Map(summary.holdings.map((h) => [h.row.id, h])),
    [summary.holdings],
  );

  /** Holdings list shows positions with units (appear after first BUY). */
  const openHoldings = useMemo(
    () => summary.holdings.filter((h) => h.currentUnits > 0),
    [summary.holdings],
  );

  const visibleHoldings = useMemo(
    () => filterNepseHoldings(openHoldings, query, filter),
    [openHoldings, query, filter],
  );

  const detailHolding = view.kind === "detail" ? holdingsById.get(view.id) : undefined;
  const tradeHolding = tradeSheet ? holdingsById.get(tradeSheet.holdingId) : undefined;
  const activeTab = view.kind === "tabs" ? view.tab : "overview";
  const isDetail = view.kind === "detail" && detailHolding != null;
  const showFab = !isDetail && (activeTab === "overview" || activeTab === "holdings");
  const hasOpenHoldings = openHoldings.length > 0;

  const openHolding = useCallback((id: string) => setView({ kind: "detail", id }), []);

  const openAddStock = useCallback(() => setAddOpen(true), []);

  const focusSearch = useCallback(() => {
    setView({ kind: "tabs", tab: "holdings" });
    window.requestAnimationFrame(() => searchRef.current?.focus());
  }, []);

  const filteredEmptyLabel =
    query.trim() || filter !== "all"
      ? "No holdings match this search or filter."
      : "No holdings yet. Add a NEPSE company, then tap BUY to record shares.";

  return (
    <div className="relative w-full min-w-0 pb-28">
      {isDetail && detailHolding ? (
        <NepseStockDetail
          holding={detailHolding}
          ledger={ledger}
          equityCurve={analytics?.charts.growth}
          onBack={() => setView({ kind: "tabs", tab: "holdings" })}
          onRemove={(id) => {
            onRemove(id);
            setView({ kind: "tabs", tab: "holdings" });
          }}
          onBuy={() => setTradeSheet({ mode: "buy", holdingId: detailHolding.row.id })}
          onSell={() => setTradeSheet({ mode: "sell", holdingId: detailHolding.row.id })}
        />
      ) : (
        <div className="space-y-6">
          <NepseWorkspaceHeader onSearch={focusSearch} notificationCount={0} />

          <NepseTopTabs active={activeTab} onChange={(tab) => setView({ kind: "tabs", tab })} />

          {activeTab === "overview" ? (
            <div className="animate-fade-in space-y-3 sm:space-y-3.5">
              <NepseHeroCard
                summary={summary}
                range={range}
                onRangeChange={setRange}
                equityCurve={analytics?.charts.growth}
              />
              <NepseQuickStats summary={summary} />
              <section>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
                    Holdings
                  </h2>
                  <button
                    type="button"
                    onClick={openAddStock}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-3 text-[11px] font-black text-emerald-200 transition hover:bg-emerald-400/15"
                  >
                    <Plus size={14} strokeWidth={2.5} aria-hidden />
                    Add Stock
                  </button>
                </div>
                <NepseHoldingsList
                  holdings={openHoldings}
                  onOpen={openHolding}
                  emptyLabel="No holdings yet. Add a NEPSE company, then tap BUY to record shares."
                  emptyActionLabel="+ Add Stock"
                  onEmptyAction={openAddStock}
                />
              </section>
            </div>
          ) : null}

          {activeTab === "holdings" ? (
            <div className="animate-fade-in space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <NepseHoldingsFilterBar
                    query={query}
                    onQueryChange={setQuery}
                    filter={filter}
                    onFilterChange={setFilter}
                    inputRef={searchRef}
                  />
                </div>
                <button
                  type="button"
                  onClick={openAddStock}
                  className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500 px-4 text-xs font-black text-slate-950 shadow-[0_10px_24px_-12px_rgba(16,185,129,0.55)] transition active:scale-[0.99] sm:mt-0"
                >
                  <Plus size={15} strokeWidth={2.5} aria-hidden />
                  Add Stock
                </button>
              </div>
              <NepseHoldingsList
                holdings={visibleHoldings}
                onOpen={openHolding}
                emptyLabel={filteredEmptyLabel}
                emptyActionLabel={query.trim() || filter !== "all" ? undefined : "+ Add Stock"}
                onEmptyAction={query.trim() || filter !== "all" ? undefined : openAddStock}
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
              <InstitutionalAnalyticsPanel analytics={analytics} loading={analyticsLoading} />
            </div>
          ) : null}
        </div>
      )}

      {showFab ? <NepseAddStockFab onClick={openAddStock} /> : null}

      <NepseSheet open={addOpen} title="Add Stock" onClose={() => setAddOpen(false)}>
        <NepseAddStockPicker
          onMutate={onMutate}
          onSelected={(rowId) => {
            setAddOpen(false);
            setView({ kind: "detail", id: rowId });
          }}
        />
      </NepseSheet>

      <NepseSheet
        open={tradeSheet != null && tradeHolding != null}
        title={tradeSheet?.mode === "sell" ? `Sell ${tradeHolding?.symbol ?? ""}` : `Buy ${tradeHolding?.symbol ?? ""}`}
        onClose={() => setTradeSheet(null)}
      >
        {tradeSheet && tradeHolding ? (
          <NepseBuySellForm
            key={`${tradeSheet.mode}-${tradeHolding.row.id}`}
            mode={tradeSheet.mode}
            holding={tradeHolding}
            ledgerFx={ledgerFx}
            onMutate={onMutate}
            onComplete={() => {
              setTradeSheet(null);
              // After first BUY, return to holdings so the new position is visible.
              if (tradeSheet.mode === "buy" && !hasOpenHoldings) {
                setView({ kind: "tabs", tab: "holdings" });
              }
            }}
          />
        ) : null}
      </NepseSheet>
    </div>
  );
}
