"use client";

import { useMemo, useState } from "react";
import { QuickInvestmentTransactionForm } from "@/components/portfolio/InvestmentsPanel";
import type { LedgerFx } from "@/components/portfolio/portfolio-ledger";
import type { InvestmentRow, PortfolioLedgerEntry, WealthPortfolioStateV2 } from "@/components/portfolio/types";
import type { MarketSnapshot } from "@/types/market";
import { buildNepsePortfolioSummary } from "./nepse-portfolio-metrics";
import {
  NepseAddStockFab,
  NepseHeroCard,
  NepseHoldingsList,
  NepseSheet,
  NepseTopTabs,
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

  const summary = useMemo(
    () => buildNepsePortfolioSummary(rows, ledger, krwPerNpr, usdPerNpr, liveMarket, netWorthLiveNpr),
    [rows, ledger, krwPerNpr, usdPerNpr, liveMarket, netWorthLiveNpr],
  );

  const holdingsById = useMemo(() => new Map(summary.holdings.map((h) => [h.row.id, h])), [summary.holdings]);
  const detailHolding = view.kind === "detail" ? holdingsById.get(view.id) : undefined;
  const activeTab = view.kind === "tabs" ? view.tab : "overview";
  const showFab = view.kind === "tabs" && (activeTab === "overview" || activeTab === "holdings");

  return (
    <div className="relative w-full min-w-0 pb-24">
      {view.kind === "detail" && detailHolding ? (
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
        <div className="space-y-3.5 sm:space-y-4">
          <NepseTopTabs
            active={activeTab}
            onChange={(tab) => setView({ kind: "tabs", tab })}
          />

          {activeTab === "overview" ? (
            <div className="space-y-3.5 sm:space-y-4">
              <NepseHeroCard summary={summary} />
              <div>
                <h2 className="mb-2 text-[11px] font-black uppercase tracking-[0.18em] text-emerald-100/45">
                  Holdings
                </h2>
                <NepseHoldingsList
                  holdings={summary.holdings}
                  onOpen={(id) => setView({ kind: "detail", id })}
                />
              </div>
            </div>
          ) : null}

          {activeTab === "holdings" ? (
            <NepseHoldingsList
              holdings={summary.holdings}
              onOpen={(id) => setView({ kind: "detail", id })}
            />
          ) : null}

          {activeTab === "transactions" ? (
            <NepseTransactionsPanel ledger={ledger} holdingsById={holdingsById} />
          ) : null}

          {activeTab === "corporate" ? (
            <NepseCorporateActionsPanel ledger={ledger} holdingsById={holdingsById} />
          ) : null}

          {activeTab === "analytics" ? (
            <NepseAnalyticsPanel summary={summary} rows={rows} />
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
