"use client";

import { BarChart3, Building2, Home, MoreHorizontal, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export type ReNavTab = "dashboard" | "properties" | "add" | "analytics" | "more";

const ITEMS: { id: ReNavTab; label: string; icon: typeof Home; elevate?: boolean }[] = [
  { id: "dashboard", label: "Dashboard", icon: Home },
  { id: "properties", label: "Properties", icon: Building2 },
  { id: "add", label: "Add", icon: Plus, elevate: true },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "more", label: "More", icon: MoreHorizontal },
];

/** Mobile-only bottom navigation (&lt; md). Hidden on tablet/desktop which use their own nav. */
export function RealEstateBottomNav({
  active,
  onChange,
}: {
  active: ReNavTab;
  onChange: (tab: ReNavTab) => void;
}) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[55] border-t border-emerald-400/15 bg-[#04140f]/95 px-2 pb-[max(0.45rem,env(safe-area-inset-bottom,0px))] pt-2 backdrop-blur-xl md:hidden"
      aria-label="Real Estate mobile navigation"
    >
      <div className="mx-auto flex max-w-lg items-end justify-between gap-0.5">
        {ITEMS.map((item) => {
          const activeTab = active === item.id;
          if (item.elevate) {
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onChange(item.id)}
                className="-mt-5 flex min-w-0 flex-1 flex-col items-center gap-1"
                aria-label="Add property"
              >
                <span
                  className={cn(
                    "grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 text-emerald-950 shadow-[0_12px_32px_-8px_rgba(52,211,153,0.75)] ring-4 ring-[#04140f] transition active:scale-95",
                    activeTab && "ring-emerald-400/40",
                  )}
                >
                  <Plus size={26} strokeWidth={2.6} />
                </span>
                <span className="text-[9px] font-black uppercase tracking-tight text-lime-300">{item.label}</span>
              </button>
            );
          }
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              className={cn(
                "flex min-h-[56px] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-0.5 py-1 transition",
                activeTab
                  ? "bg-emerald-500/15 text-lime-300 shadow-sm shadow-emerald-500/15"
                  : "text-zinc-500 hover:bg-white/[0.04] hover:text-emerald-200",
              )}
            >
              <item.icon size={20} strokeWidth={activeTab ? 2.4 : 2} />
              <span className="line-clamp-1 w-full text-[9px] font-black uppercase tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
