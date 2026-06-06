"use client";

import { RotateCcw } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { DataResetConfirmModal } from "@/components/fire-nepal/DataResetConfirmModal";
import type { WealthPortfolioStateV2 } from "@/components/portfolio/types";
import type { PortfolioWorkspaceModule } from "@/lib/fire-nepal/workspace-data-reset";
import { resetPortfolioModuleState } from "@/lib/fire-nepal/workspace-data-reset";

const COPY: Record<
  PortfolioWorkspaceModule,
  { title: string; body: string; toast: string; buttonClass: string }
> = {
  banking_cash: {
    title: "Reset banking & cash?",
    body: "All liquid cash lines, fixed deposits, and banking ledger entries in this module will be removed.",
    toast: "Banking & cash data cleared.",
    buttonClass:
      "inline-flex shrink-0 items-center gap-1 rounded-full border border-sky-400/35 bg-sky-500/10 px-2.5 py-1 text-[11px] font-black text-sky-100 transition hover:bg-sky-500/20 sm:text-xs",
  },
  metals: {
    title: "Reset gold & silver?",
    body: "All metal holdings, photos, and precious-metals ledger rows tied to this module will be removed.",
    toast: "Gold & silver data cleared.",
    buttonClass:
      "inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-400/35 bg-amber-500/10 px-2.5 py-1 text-[11px] font-black text-amber-100 transition hover:bg-amber-500/20 sm:text-xs",
  },
  vehicles: {
    title: "Reset vehicles?",
    body: "Every vehicle row and vehicle ledger entry will be removed from your portfolio.",
    toast: "Vehicle data cleared.",
    buttonClass:
      "inline-flex shrink-0 items-center gap-1 rounded-full border border-cyan-400/35 bg-cyan-500/10 px-2.5 py-1 text-[11px] font-black text-cyan-100 transition hover:bg-cyan-500/20 sm:text-xs",
  },
  real_estate: {
    title: "Reset real estate?",
    body: "All properties and real-estate ledger entries will be removed from your portfolio.",
    toast: "Real estate data cleared.",
    buttonClass:
      "inline-flex shrink-0 items-center gap-1 rounded-full border border-teal-400/35 bg-teal-500/10 px-2.5 py-1 text-[11px] font-black text-teal-100 transition hover:bg-teal-500/20 sm:text-xs",
  },
  pension: {
    title: "Reset retirement / pension assets?",
    body: "All global retirement account rows and retirement ledger rows will be removed. This does not change your signed-in account or subscription.",
    toast: "Retirement & pension portfolio data cleared.",
    buttonClass:
      "inline-flex shrink-0 items-center gap-1 rounded-full border border-indigo-400/35 bg-indigo-500/10 px-2.5 py-1 text-[11px] font-black text-indigo-100 transition hover:bg-indigo-500/20 sm:text-xs",
  },
};

export function PortfolioModuleDataResetButton({
  module,
  onMutate,
}: {
  module: PortfolioWorkspaceModule;
  onMutate: (fn: (s: WealthPortfolioStateV2) => WealthPortfolioStateV2 | null) => boolean;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const c = COPY[module];

  const run = useCallback(() => {
    setBusy(true);
    try {
      const ok = onMutate((s) => resetPortfolioModuleState(s, module));
      if (ok) {
        toast.success(c.toast);
        setOpen(false);
      } else {
        toast.error("Could not reset this module.");
      }
    } finally {
      setBusy(false);
    }
  }, [c.toast, module, onMutate]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={c.buttonClass} aria-haspopup="dialog">
        <RotateCcw size={14} className="shrink-0 opacity-90" />
        Reset data
      </button>
      <DataResetConfirmModal
        open={open}
        title={c.title}
        body={c.body}
        busy={busy}
        onCancel={() => !busy && setOpen(false)}
        onConfirm={run}
      />
    </>
  );
}
