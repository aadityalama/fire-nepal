"use client";

import { useCallback, useMemo, useState } from "react";
import {
  buildInvestmentCardModels,
  summarizeInvestmentPortfolio,
} from "@/components/portfolio/investments/investment-card-model";
import { InvestmentAddSheet } from "@/components/portfolio/investments/InvestmentAddSheet";
import { InvestmentAnalyticsScreen } from "@/components/portfolio/investments/InvestmentAnalyticsScreen";
import { InvestmentCorporateActionsScreen } from "@/components/portfolio/investments/InvestmentCorporateActionsScreen";
import { InvestmentHeroSummary } from "@/components/portfolio/investments/InvestmentHeroSummary";
import { InvestmentHoldingDetail } from "@/components/portfolio/investments/InvestmentHoldingDetail";
import { InvestmentHoldingsList } from "@/components/portfolio/investments/InvestmentHoldingsList";
import { InvestmentAddStockFab, InvestmentTopNav, type InvNavTab } from "@/components/portfolio/investments/InvestmentNav";
import { InvestmentTransactionsScreen } from "@/components/portfolio/investments/InvestmentTransactionsScreen";
import { InvSectionTitle } from "@/components/portfolio/investments/InvestmentUi";
import {
  AssetEditorModal,
  ConfirmDeleteModal,
} from "@/components/portfolio/InteractivePortfolioTable";
import type { LedgerFx } from "@/components/portfolio/portfolio-ledger";
import type {
  InvestmentRow,
  PortfolioLedgerEntry,
  WealthPortfolioStateV2,
} from "@/components/portfolio/types";
import type { MarketSnapshot } from "@/types/market";

type View =
  | { kind: "tab"; tab: InvNavTab }
  | { kind: "detail"; id: string };

export function InvestmentPremiumApp({
  rows,
  ledger,
  krwPerNpr,
  usdPerNpr,
  ledgerFx,
  liveMarket,
  netWorthLiveNpr,
  onMutate,
  onChange,
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
  onChange: (id: string, patch: Partial<InvestmentRow>) => void;
  onRemove: (id: string) => void;
}) {
  const [view, setView] = useState<View>({ kind: "tab", tab: "overview" });
  const [addOpen, setAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const models = useMemo(
    () => buildInvestmentCardModels(rows, ledger, krwPerNpr, usdPerNpr, liveMarket, netWorthLiveNpr),
    [rows, ledger, krwPerNpr, usdPerNpr, liveMarket, netWorthLiveNpr],
  );
  const summary = useMemo(() => summarizeInvestmentPortfolio(models), [models]);
  const modelById = useMemo(() => new Map(models.map((m) => [m.row.id, m])), [models]);

  const activeTab: InvNavTab = view.kind === "tab" ? view.tab : "holdings";
  const showChrome = view.kind === "tab";
  const detailModel = view.kind === "detail" ? modelById.get(view.id) : undefined;
  const editingRow = editingId ? rows.find((r) => r.id === editingId) : undefined;

  const openHolding = useCallback((id: string) => setView({ kind: "detail", id }), []);
  const goTab = useCallback((tab: InvNavTab) => setView({ kind: "tab", tab }), []);

  return (
    <section className="relative w-full">
      <div className="pointer-events-none absolute -inset-4 -z-10 rounded-[2rem] bg-[radial-gradient(ellipse_at_15%_0%,rgba(16,185,129,0.16),transparent_48%),radial-gradient(ellipse_at_90%_8%,rgba(45,212,191,0.1),transparent_42%)]" />

      <div className="mx-auto w-full max-w-[100%] pb-28 md:max-w-5xl md:pb-10 lg:max-w-[90rem] lg:pb-8">
        {showChrome ? <InvestmentTopNav active={activeTab} onChange={goTab} /> : null}

        {view.kind === "tab" && view.tab === "overview" ? (
          <div className="space-y-5 md:space-y-6">
            <InvestmentHeroSummary summary={summary} />
            <div>
              <InvSectionTitle
                title="Your holdings"
                subtitle="Compact cards — open any stock for WACC, history, and analytics"
                action={
                  models.length > 3 ? (
                    <button
                      type="button"
                      onClick={() => goTab("holdings")}
                      className="text-xs font-black text-emerald-300 hover:text-lime-200"
                    >
                      See all
                    </button>
                  ) : null
                }
              />
              <InvestmentHoldingsList
                models={models}
                onOpenHolding={openHolding}
                compact
                limit={6}
                showHeader={false}
                showSearch={false}
              />
            </div>
          </div>
        ) : null}

        {view.kind === "tab" && view.tab === "holdings" ? (
          <InvestmentHoldingsList models={models} onOpenHolding={openHolding} />
        ) : null}

        {view.kind === "tab" && view.tab === "transactions" ? (
          <InvestmentTransactionsScreen rows={rows} ledger={ledger} onOpenHolding={openHolding} />
        ) : null}

        {view.kind === "tab" && view.tab === "corporate" ? (
          <InvestmentCorporateActionsScreen rows={rows} ledger={ledger} onOpenHolding={openHolding} />
        ) : null}

        {view.kind === "tab" && view.tab === "analytics" ? (
          <InvestmentAnalyticsScreen
            models={models}
            summary={summary}
            rows={rows}
            krwPerNpr={krwPerNpr}
            usdPerNpr={usdPerNpr}
            liveMarket={liveMarket}
            netWorthLiveNpr={netWorthLiveNpr}
            onChange={onChange}
            onRemove={onRemove}
            onOpenHolding={openHolding}
          />
        ) : null}

        {view.kind === "detail" ? (
          detailModel ? (
            <InvestmentHoldingDetail
              model={detailModel}
              ledger={ledger}
              onBack={() => setView({ kind: "tab", tab: "holdings" })}
              onEdit={() => setEditingId(detailModel.row.id)}
              onRemove={() => setDeleteId(detailModel.row.id)}
            />
          ) : (
            <div className="space-y-3 p-6 text-center">
              <p className="text-sm font-bold text-emerald-100">Holding not found</p>
              <button type="button" onClick={() => goTab("holdings")} className="text-xs font-black text-emerald-300">
                Back to holdings
              </button>
            </div>
          )
        ) : null}
      </div>

      {showChrome ? <InvestmentAddStockFab onClick={() => setAddOpen(true)} /> : null}

      <InvestmentAddSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        ledger={ledger}
        usdPerNpr={usdPerNpr}
        ledgerFx={ledgerFx}
        onMutate={(fn) => {
          const ok = onMutate(fn);
          if (ok) setAddOpen(false);
          return ok;
        }}
      />

      {editingRow ? (
        <AssetEditorModal
          key={editingRow.id}
          row={editingRow}
          usdPerNpr={usdPerNpr}
          onClose={() => setEditingId(null)}
          onSave={(patch) => {
            onChange(editingRow.id, patch);
            setEditingId(null);
          }}
        />
      ) : null}

      {deleteId ? (
        <ConfirmDeleteModal
          name={rows.find((r) => r.id === deleteId)?.name?.trim() || "this holding"}
          onCancel={() => setDeleteId(null)}
          onConfirm={() => {
            onRemove(deleteId);
            setDeleteId(null);
            setView({ kind: "tab", tab: "holdings" });
          }}
        />
      ) : null}
    </section>
  );
}
