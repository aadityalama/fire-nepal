"use client";

import {
  BarChart3,
  Building2,
  Landmark,
  LayoutGrid,
  LineChart,
  Receipt,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type InvNavTab = "overview" | "holdings" | "transactions" | "corporate" | "analytics";

const ITEMS: { id: InvNavTab; label: string; icon: typeof LayoutGrid }[] = [
  { id: "overview", label: "Overview", icon: LayoutGrid },
  { id: "holdings", label: "Holdings", icon: Building2 },
  { id: "transactions", label: "Transactions", icon: Receipt },
  { id: "corporate", label: "Corporate Actions", icon: Landmark },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
];

export function InvestmentTopNav({
  active,
  onChange,
}: {
  active: InvNavTab;
  onChange: (tab: InvNavTab) => void;
}) {
  return (
    <nav
      className="mb-4 overflow-x-auto rounded-2xl border border-emerald-400/15 bg-black/30 p-1 backdrop-blur-xl [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      aria-label="NEPSE portfolio sections"
    >
      <div className="flex min-w-max gap-1">
        {ITEMS.map((item) => {
          const on = active === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              className={cn(
                "inline-flex min-h-11 items-center gap-2 rounded-xl px-3.5 py-2 text-[11px] font-black uppercase tracking-wide transition sm:text-xs",
                on
                  ? "bg-gradient-to-r from-emerald-400 to-teal-500 text-emerald-950 shadow-md shadow-emerald-950/25"
                  : "text-emerald-100/65 hover:bg-white/[0.04] hover:text-emerald-50",
              )}
            >
              <item.icon size={15} strokeWidth={on ? 2.5 : 2} />
              {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export function InvestmentAddStockFab({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom,0px))] right-[max(1rem,env(safe-area-inset-right,0px))] z-[56] flex min-h-14 items-center gap-2 rounded-full bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 px-5 py-3.5 text-sm font-black text-emerald-950 shadow-[0_12px_40px_-8px_rgba(16,185,129,0.55),0_0_0_1px_rgba(255,255,255,0.12)_inset] ring-2 ring-emerald-300/40 transition active:scale-[0.96] motion-safe:hover:-translate-y-0.5"
      aria-label="Add stock"
    >
      <LineChart size={18} strokeWidth={2.5} aria-hidden />
      + Add Stock
    </button>
  );
}
