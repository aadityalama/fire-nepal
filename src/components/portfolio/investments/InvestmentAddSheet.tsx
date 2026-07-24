"use client";

import { X } from "lucide-react";
import { InvestmentsPanel } from "@/components/portfolio/InvestmentsPanel";
import type { LedgerFx } from "@/components/portfolio/portfolio-ledger";
import type { PortfolioLedgerEntry, WealthPortfolioStateV2 } from "@/components/portfolio/types";

export function InvestmentAddSheet({
  open,
  onClose,
  ledger,
  usdPerNpr,
  ledgerFx,
  onMutate,
}: {
  open: boolean;
  onClose: () => void;
  ledger: readonly PortfolioLedgerEntry[];
  usdPerNpr: number;
  ledgerFx: LedgerFx;
  onMutate: (fn: (s: WealthPortfolioStateV2) => WealthPortfolioStateV2 | null) => boolean;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-stock-title"
      onClick={onClose}
    >
      <div
        className="max-h-[min(94vh,860px)] w-full max-w-lg overflow-y-auto rounded-t-[1.75rem] border border-emerald-400/20 bg-[#07111A] shadow-2xl sm:rounded-[1.75rem]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-emerald-400/10 bg-[#07111A]/95 px-4 py-3 backdrop-blur-xl">
          <div>
            <p id="add-stock-title" className="text-base font-black text-emerald-50">
              + Add Stock
            </p>
            <p className="text-[11px] font-semibold text-emerald-200/55">Buy, sell, IPO, rights, bonus, dividend</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-11 w-11 place-items-center rounded-2xl border border-emerald-400/20 text-emerald-200/70 hover:bg-white/5 hover:text-white"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-3 sm:p-4">
          <InvestmentsPanel ledger={ledger} usdPerNpr={usdPerNpr} ledgerFx={ledgerFx} onMutate={onMutate} />
        </div>
      </div>
    </div>
  );
}
