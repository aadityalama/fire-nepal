"use client";

import { BarChart3, Building2, Home, MoreHorizontal, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReNavTab } from "@/components/portfolio/real-estate/RealEstateBottomNav";

const ITEMS: { id: ReNavTab; label: string; icon: typeof Home; primary?: boolean }[] = [
  { id: "dashboard", label: "Dashboard", icon: Home },
  { id: "properties", label: "Properties", icon: Building2 },
  { id: "add", label: "Add Property", icon: Plus, primary: true },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "more", label: "More", icon: MoreHorizontal },
];

/** Desktop-only sticky sidebar navigation (lg+). */
export function RealEstateSideNav({
  active,
  onChange,
  className,
}: {
  active: ReNavTab;
  onChange: (tab: ReNavTab) => void;
  className?: string;
}) {
  return (
    <aside
      className={cn(
        "sticky top-4 hidden h-[calc(100vh-2rem)] w-[15.5rem] shrink-0 flex-col rounded-3xl border border-emerald-400/20 bg-gradient-to-b from-emerald-950/50 via-[#04140f]/90 to-black/60 p-4 shadow-[0_24px_60px_-32px_rgba(16,185,129,0.45)] backdrop-blur-xl lg:flex",
        className,
      )}
      aria-label="Real Estate desktop navigation"
    >
      <div className="mb-6 px-1">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-400/80">FIRE Nepal</p>
        <p className="mt-1 text-lg font-black tracking-tight text-emerald-50">Real Estate</p>
        <p className="mt-1 text-[11px] font-semibold leading-snug text-emerald-200/50">Property wealth OS</p>
      </div>

      <nav className="flex min-h-0 flex-1 flex-col gap-1.5">
        {ITEMS.map((item) => {
          const activeTab = active === item.id;
          if (item.primary) {
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onChange(item.id)}
                className="mt-2 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-500 px-3 text-sm font-black text-emerald-950 shadow-lg shadow-emerald-500/25 transition hover:brightness-105 active:scale-[0.99]"
              >
                <Plus size={18} strokeWidth={2.6} />
                {item.label}
              </button>
            );
          }
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-2xl px-3 text-sm font-bold transition",
                activeTab
                  ? "bg-emerald-500/20 text-lime-200 shadow-inner shadow-emerald-500/10 ring-1 ring-emerald-400/30"
                  : "text-emerald-200/60 hover:bg-white/[0.04] hover:text-emerald-100",
              )}
            >
              <item.icon size={18} strokeWidth={activeTab ? 2.4 : 2} />
              {item.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

/** Tablet-only horizontal top tabs (md → lg). */
export function RealEstateTabletTopNav({
  active,
  onChange,
}: {
  active: ReNavTab;
  onChange: (tab: ReNavTab) => void;
}) {
  return (
    <nav
      className="mb-5 hidden gap-1.5 overflow-x-auto rounded-3xl border border-emerald-400/15 bg-black/35 p-1.5 backdrop-blur-xl md:flex lg:hidden [scrollbar-width:none]"
      aria-label="Real Estate tablet navigation"
    >
      {ITEMS.map((item) => {
        const activeTab = active === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            className={cn(
              "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-2xl px-3.5 text-xs font-black uppercase tracking-wide transition",
              item.primary
                ? "bg-gradient-to-r from-emerald-400 to-teal-500 text-emerald-950"
                : activeTab
                  ? "bg-emerald-500/20 text-lime-200 ring-1 ring-emerald-400/30"
                  : "text-emerald-200/55 hover:bg-white/[0.04] hover:text-emerald-100",
            )}
          >
            <item.icon size={15} strokeWidth={activeTab || item.primary ? 2.4 : 2} />
            {item.primary ? "Add" : item.label}
          </button>
        );
      })}
    </nav>
  );
}
