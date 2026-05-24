"use client";

import { DashboardSectionHeader } from "@/components/DashboardSectionHeader";
import { FireFeatureGate } from "@/components/membership/FireFeatureGate";
import { AiFinancialCoachSection } from "@/components/financial-coach/AiFinancialCoachSection";
import { SmartFinancialIntelligenceSection } from "@/components/financial-intelligence";
import { AiWealthIntelligenceSection } from "@/components/portfolio/AiWealthIntelligenceSection";
import { GlobalRetirementAssetsPanel } from "@/components/portfolio/GlobalRetirementAssetsPanel";
import { GlobalMasterLedgerPanel } from "@/components/portfolio/ledger-ui/GlobalMasterLedgerPanel";
import { InteractivePortfolioTable } from "@/components/portfolio/InteractivePortfolioTable";
import { InvestmentsPanel } from "@/components/portfolio/InvestmentsPanel";
import { LiabilitiesPanel } from "@/components/portfolio/LiabilitiesPanel";
import { LiquidCashPanel } from "@/components/portfolio/LiquidCashPanel";
import { MetalsPanel } from "@/components/portfolio/MetalsPanel";
import { RealEstatePanel } from "@/components/portfolio/RealEstatePanel";
import { VehiclesPanel } from "@/components/portfolio/VehiclesPanel";
import { useWealthPortfolio } from "@/contexts/WealthPortfolioContext";
import { useRealtimeMarket } from "@/providers/realtime-provider";

const flow = "flex min-w-0 max-w-full flex-col gap-6 lg:gap-7";

export function PortfolioBankingPage() {
  const {
    state,
    ledgerFx,
    applyPortfolioMutate,
    updateLiquid,
    addLiquid,
    removeLiquid,
    updateFd,
    addFd,
    removeFd,
  } = useWealthPortfolio();
  return (
    <div className={flow}>
      <DashboardSectionHeader
        accent="emerald"
        title="Banking & Cash"
        subtitle="Liquid lines, fixed deposits, and ledger-linked cash — NPR, KRW, and USD."
      />
      <LiquidCashPanel
        lines={state.liquidCash}
        fixedDeposits={state.fixedDeposits ?? []}
        ledger={state.ledger}
        ledgerFx={ledgerFx}
        onMutate={applyPortfolioMutate}
        onChange={updateLiquid}
        onAdd={addLiquid}
        onRemove={removeLiquid}
        onFdChange={updateFd}
        onAddFd={addFd}
        onRemoveFd={removeFd}
      />
    </div>
  );
}

export function PortfolioInvestmentsPage() {
  const { state, krwPerNpr, usdPerNpr, ledgerFx, applyPortfolioMutate, updateInv, addInv, removeInv } =
    useWealthPortfolio();
  const { snapshot, overlay } = useRealtimeMarket();
  return (
    <div className={flow}>
      <DashboardSectionHeader
        accent="emerald"
        title="Investments"
        subtitle="Nepse, global equities, funds, and crypto — live FX where applicable."
      />
      <InteractivePortfolioTable
        rows={state.investments}
        krwPerNpr={krwPerNpr}
        usdPerNpr={usdPerNpr}
        liveMarket={snapshot}
        netWorthLiveNpr={overlay?.totalsLive.netWorthNpr ?? null}
        onChange={updateInv}
        onAdd={addInv}
        onRemove={removeInv}
      />
      <InvestmentsPanel
        rows={state.investments}
        ledger={state.ledger}
        krwPerNpr={krwPerNpr}
        usdPerNpr={usdPerNpr}
        ledgerFx={ledgerFx}
        onMutate={applyPortfolioMutate}
        onChange={updateInv}
        onAdd={addInv}
        onRemove={removeInv}
        hideAddButton
      />
    </div>
  );
}

export function PortfolioGoldPage() {
  const { state, applyPortfolioMutate, updateMetal, addMetal, removeMetal } = useWealthPortfolio();
  return (
    <div className={flow}>
      <DashboardSectionHeader
        accent="emerald"
        title="Gold & Silver"
        subtitle="Bullion and jewelry holdings with NPR marks."
      />
      <MetalsPanel
        rows={state.metals}
        ledger={state.ledger}
        onChange={updateMetal}
        onAdd={addMetal}
        onRemove={removeMetal}
        onMutate={applyPortfolioMutate}
      />
    </div>
  );
}

export function PortfolioRealEstatePage() {
  const { state, krwPerNpr, usdPerNpr, applyPortfolioMutate, updateRe, addRe, removeRe } = useWealthPortfolio();
  return (
    <div className={flow}>
      <DashboardSectionHeader
        accent="teal"
        title="Real Estate"
        subtitle="Primary home, rentals, land, and commercial — modeled in NPR."
      />
      <RealEstatePanel
        rows={state.realEstate}
        ledger={state.ledger}
        krwPerNpr={krwPerNpr}
        usdPerNpr={usdPerNpr}
        onMutate={applyPortfolioMutate}
        onChange={updateRe}
        onAdd={addRe}
        onRemove={removeRe}
      />
    </div>
  );
}

export function PortfolioVehiclesPage() {
  const { state, applyPortfolioMutate, updateVeh, addVeh, removeVeh } = useWealthPortfolio();
  return (
    <div className={flow}>
      <DashboardSectionHeader accent="emerald" title="Vehicles" subtitle="Cars, bikes, and other titled assets." />
      <VehiclesPanel
        rows={state.vehicles}
        ledger={state.ledger}
        onMutate={applyPortfolioMutate}
        onChange={updateVeh}
        onAdd={addVeh}
        onRemove={removeVeh}
      />
    </div>
  );
}

export function PortfolioRetirementPage() {
  const { state, krwPerNpr, usdPerNpr, updateRetirement, addRetirement, removeRetirement } = useWealthPortfolio();
  return (
    <div className={flow}>
      <DashboardSectionHeader
        accent="emerald"
        title="Retirement Assets"
        subtitle="401k, NPS, pension pots, and other long-horizon balances."
      />
      <GlobalRetirementAssetsPanel
        rows={state.globalRetirementAssets}
        ledger={state.ledger}
        krwPerNpr={krwPerNpr}
        usdPerNpr={usdPerNpr}
        onChange={updateRetirement}
        onAdd={addRetirement}
        onRemove={removeRetirement}
      />
    </div>
  );
}

export function PortfolioLiabilitiesPage() {
  const { state, applyPortfolioMutate, updateLiab, addLiab, removeLiab } = useWealthPortfolio();
  return (
    <div className={flow}>
      <DashboardSectionHeader
        accent="teal"
        title="Liabilities"
        subtitle="Loans, cards, and obligations — kept in sync with net worth."
      />
      <LiabilitiesPanel
        rows={state.liabilities}
        onMutate={applyPortfolioMutate}
        onChange={updateLiab}
        onAdd={addLiab}
        onRemove={removeLiab}
      />
    </div>
  );
}

export function PortfolioAiInsightsPage() {
  const { hydrated, totals, allocation, fireScore, passiveMonthly, monthDelta, state, coachSnapshot, intelModel } =
    useWealthPortfolio();
  return (
    <div className={`${flow} gap-6 lg:gap-8`}>
      <DashboardSectionHeader
        accent="cyan"
        title="AI Wealth Insights"
        subtitle="Narrative intelligence, coaching, and scenario rollups across your stored portfolio."
      />
      <FireFeatureGate
        feature="ai_wealth_intel"
        title="AI wealth intelligence"
        description="Premium includes narrative intelligence across your portfolio, cashflow, and FIRE trajectory."
      >
        <AiWealthIntelligenceSection
          hydrated={hydrated}
          totals={totals}
          allocation={allocation}
          fireScore={fireScore}
          passiveMonthlyNpr={passiveMonthly}
          monthDelta={monthDelta}
          historyLength={state.netWorthHistory.length}
        />
      </FireFeatureGate>
      <FireFeatureGate
        feature="ai_financial_coach"
        title="AI financial coach"
        description="Premium unlocks the full coach playbook — savings rate, runway, and cross-border cues."
      >
        <AiFinancialCoachSection snapshot={coachSnapshot} />
      </FireFeatureGate>
      <FireFeatureGate
        feature="smart_financial_intel"
        title="Smart financial intelligence"
        description="Premium unlocks the intelligence deck with scenario cards and month-over-month rollups."
      >
        <SmartFinancialIntelligenceSection model={intelModel} />
      </FireFeatureGate>
    </div>
  );
}

export function PortfolioLedgerPage() {
  const { state } = useWealthPortfolio();
  return (
    <div className={flow}>
      <DashboardSectionHeader
        accent="emerald"
        title="Master ledger"
        subtitle="Cross-asset ledger entries generated from portfolio activity."
      />
      <GlobalMasterLedgerPanel ledger={state.ledger} />
    </div>
  );
}
