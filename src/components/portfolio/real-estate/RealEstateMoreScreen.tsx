"use client";

import { FileStack, Lightbulb, RotateCcw, Shield } from "lucide-react";
import { PortfolioModuleDataResetButton } from "@/components/fire-nepal/PortfolioModuleDataResetButton";
import { ModuleLedgerCard } from "@/components/portfolio/ledger-ui/ModuleLedgerCard";
import type { PortfolioLedgerEntry, WealthPortfolioStateV2 } from "@/components/portfolio/types";
import { ReGlass, ReSectionTitle } from "@/components/portfolio/real-estate/RealEstateUi";

export function RealEstateMoreScreen({
  ledger,
  onMutate,
  onOpenVaultOverview,
}: {
  ledger: readonly PortfolioLedgerEntry[];
  onMutate: (fn: (s: WealthPortfolioStateV2) => WealthPortfolioStateV2 | null) => boolean;
  onOpenVaultOverview: () => void;
}) {
  const reLedger = ledger.filter((e) => e.bucket === "real_estate");

  return (
    <div className="space-y-5 md:space-y-6">
      <ReSectionTitle title="More" subtitle="Tools, tips, and data controls" />

      {/* Mobile: stacked · Tablet/Desktop: 2-col tools, ledger full width below on tablet, side-by-side on desktop */}
      <div className="grid gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start">
        <div className="space-y-3 md:col-span-2 lg:col-span-1 lg:space-y-4">
          <ReGlass className="p-4 lg:p-5" onClick={onOpenVaultOverview}>
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-500/15 text-emerald-200">
                <FileStack size={20} />
              </span>
              <div>
                <p className="text-sm font-black text-emerald-50">Document vault overview</p>
                <p className="mt-0.5 text-xs font-semibold text-emerald-200/55">Browse properties to open each vault</p>
              </div>
            </div>
          </ReGlass>

          <ReGlass className="p-4 lg:p-5">
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-amber-500/15 text-amber-100">
                <Lightbulb size={20} />
              </span>
              <div>
                <p className="text-sm font-black text-emerald-50">Property wealth tips</p>
                <ul className="mt-2 space-y-1.5 text-xs font-semibold leading-relaxed text-emerald-200/65">
                  <li>· Keep purchase basis and current market value current for accurate ROI & CAGR.</li>
                  <li>· Upload Lalpurja, sale deeds, and insurance into the vault — never lose title papers.</li>
                  <li>· Log rental income annually to unlock yield analytics.</li>
                  <li>· Review AI Insights after each valuation update.</li>
                </ul>
              </div>
            </div>
          </ReGlass>

          <ReGlass className="p-4 lg:p-5">
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-sky-500/15 text-sky-100">
                <Shield size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-emerald-50">Reset module data</p>
                <p className="mt-1 text-xs font-semibold text-emerald-200/55">
                  Clears all properties and real-estate ledger entries.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <RotateCcw size={14} className="text-rose-300" />
                  <PortfolioModuleDataResetButton module="real_estate" onMutate={onMutate} />
                </div>
              </div>
            </div>
          </ReGlass>
        </div>

        {reLedger.length > 0 ? (
          <div className="md:col-span-2 lg:col-span-1">
            <ReSectionTitle title="Ledger" subtitle="Buy / sell history for this module" />
            <ModuleLedgerCard
              title="Real estate ledger"
              subtitle="Buy / sell history for this module"
              bucket="real_estate"
              ledger={reLedger}
              ledgerMutate={onMutate}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
