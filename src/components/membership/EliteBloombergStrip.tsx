"use client";

import { Activity, Globe2, Radio, TrendingUp } from "lucide-react";
import { useFireMembership } from "@/contexts/FireMembershipContext";

/** Elite-only terminal accent row (Bloomberg-inspired, no live market data). */
export function EliteBloombergStrip() {
  const { tier } = useFireMembership();
  if (tier !== "elite") return null;

  const tiles = [
    { icon: Radio, label: "Live risk band", value: "Balanced · stable" },
    { icon: TrendingUp, label: "Scenario beta", value: "Monte-Carlo ready" },
    { icon: Globe2, label: "Cross-border", value: "KRW / USD / NPR" },
    { icon: Activity, label: "Automation", value: "Rules engine (preview)" },
  ];

  return (
    <section className="relative overflow-hidden rounded-2xl border border-amber-500/25 bg-gradient-to-r from-[#1a1204]/90 via-[#0c1410]/95 to-[#04140f]/95 p-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl">
      <div className="pointer-events-none absolute -right-20 top-0 h-40 w-40 rounded-full bg-amber-400/10 blur-3xl" />
      <div className="relative mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-200/80">
          Elite terminal · Bloomberg-style layer
        </p>
        <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2.5 py-1 text-[10px] font-black text-amber-100">
          Prototype UI
        </span>
      </div>
      <div className="relative grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map(({ icon: Icon, label, value }) => (
          <div
            key={label}
            className="rounded-xl border border-white/10 bg-black/35 px-3 py-3 text-left shadow-inner shadow-black/30"
          >
            <div className="flex items-center gap-2 text-amber-200/90">
              <Icon size={16} strokeWidth={2.2} aria-hidden />
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">{label}</span>
            </div>
            <p className="mt-1.5 text-sm font-black text-white">{value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
