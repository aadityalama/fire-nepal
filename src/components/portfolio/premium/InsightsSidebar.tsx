"use client";

import {
  ArrowRight,
  Bitcoin,
  Bot,
  Building2,
  Car,
  Coins,
  Landmark,
  LineChart,
  PiggyBank,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";
import { aiCoachInsight, marketOverview } from "@/data/fire-premium-dashboard";
import { PremiumGlassCard } from "@/components/portfolio/premium/PremiumGlassCard";

const quickAdds = [
  { label: "Add Bank", href: "/portfolio/banking", icon: Landmark },
  { label: "Add Investment", href: "/portfolio/investments", icon: LineChart },
  { label: "Add Gold", href: "/portfolio/gold", icon: Coins },
  { label: "Add Real Estate", href: "/portfolio/real-estate", icon: Building2 },
  { label: "Add Vehicle", href: "/portfolio/vehicles", icon: Car },
  { label: "Add Liability", href: "/portfolio/liabilities", icon: ShieldAlert },
] as const;

function SectionOverline({ children }: { children: string }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">{children}</p>
  );
}

export function InsightsSidebar() {
  return (
    <aside className="flex w-full min-w-0 flex-col gap-3 sm:gap-3.5 xl:gap-3">
      <PremiumGlassCard className="relative overflow-hidden p-3.5 sm:p-4 xl:p-3.5">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-600/[0.18] via-transparent to-emerald-500/[0.08]" />
        <div className="pointer-events-none absolute -right-8 top-0 h-28 w-28 rounded-full bg-violet-500/15 blur-3xl" />
        <div className="relative z-10 flex flex-col gap-2.5">
          <div className="flex items-start gap-2.5">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-violet-500/20 text-violet-100 shadow-[0_0_24px_-6px_rgba(139,92,246,0.45)] ring-1 ring-violet-400/35 sm:h-10 sm:w-10 sm:rounded-xl">
              <Bot className="h-4 w-4 sm:h-[18px] sm:w-[18px]" strokeWidth={2} />
            </div>
            <div className="min-w-0 flex-1 space-y-0.5">
              <SectionOverline>Guidance</SectionOverline>
              <h2 className="text-[13px] font-bold tracking-tight text-white sm:text-sm">AI financial coach</h2>
              <p className="text-[11px] font-medium leading-snug text-zinc-400 sm:text-xs xl:text-[12px] xl:leading-snug">{aiCoachInsight}</p>
            </div>
          </div>
          <Link
            href="/portfolio/ai-insights"
            className="group/cta relative inline-flex min-h-[44px] w-fit items-center gap-1.5 rounded-lg border border-emerald-400/20 bg-emerald-500/[0.08] px-3 py-2 text-[11px] font-bold text-emerald-200/95 ring-1 ring-white/[0.04] transition motion-safe:duration-300 motion-safe:ease-out hover:border-emerald-400/35 hover:bg-emerald-500/[0.14] hover:text-white hover:shadow-[0_0_28px_-8px_rgba(52,211,153,0.35)] sm:gap-2 sm:rounded-xl sm:px-3.5 sm:py-2 sm:text-xs"
          >
            View recommendations
            <ArrowRight className="h-3.5 w-3.5 motion-safe:transition-transform motion-safe:duration-300 group-hover/cta:translate-x-0.5" />
          </Link>
        </div>
      </PremiumGlassCard>

      <PremiumGlassCard className="p-3 sm:p-3.5 xl:p-3">
        <div className="space-y-0.5">
          <SectionOverline>Markets</SectionOverline>
          <h2 className="text-[13px] font-bold tracking-tight text-white sm:text-sm">Overview</h2>
        </div>
        <ul className="mt-2 space-y-1 sm:mt-3">
          {marketOverview.map((m) => {
            const up = m.changePct >= 0;
            return (
              <li
                key={m.label}
                className="flex items-center justify-between gap-1.5 rounded-lg border border-white/[0.06] bg-black/30 px-2.5 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-sm transition motion-safe:duration-300 motion-safe:ease-out hover:border-white/[0.1] hover:bg-white/[0.04] motion-safe:hover:-translate-y-px sm:gap-2 sm:rounded-xl sm:px-3 sm:py-2"
              >
                <span className="text-xs font-semibold text-zinc-500">{m.label}</span>
                <span className="text-xs font-bold tabular-nums text-white">{m.value}</span>
                <span className={`text-[11px] font-bold tabular-nums ${up ? "text-emerald-400" : "text-rose-400"}`}>
                  {up ? "+" : ""}
                  {m.changePct.toFixed(2)}%
                </span>
              </li>
            );
          })}
        </ul>
      </PremiumGlassCard>

      <PremiumGlassCard className="p-3.5 sm:p-4 xl:p-3.5">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/25 sm:h-9 sm:w-9 sm:rounded-lg">
            <PiggyBank className="h-3.5 w-3.5 sm:h-3.5 sm:w-3.5" strokeWidth={2} />
          </div>
          <div className="min-w-0 space-y-0.5">
            <SectionOverline>Shortcuts</SectionOverline>
            <h2 className="text-[13px] font-bold tracking-tight text-white sm:text-sm">Quick add</h2>
          </div>
        </div>
        <div className="mt-2 grid grid-cols-1 gap-1.5 sm:mt-3 sm:grid-cols-2 sm:gap-1.5 lg:grid-cols-1 xl:grid-cols-2 xl:gap-1">
          {quickAdds.map(({ label, href, icon: Icon }) => (
            <Link
              key={label}
              href={href}
              className="group/qa flex min-h-[40px] items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.03] px-2.5 py-2 text-[10px] font-semibold text-zinc-200 ring-1 ring-transparent transition motion-safe:duration-300 motion-safe:ease-out hover:border-emerald-400/30 hover:bg-emerald-500/[0.08] hover:text-white hover:shadow-[0_0_24px_-10px_rgba(52,211,153,0.25)] motion-safe:hover:-translate-y-0.5 sm:gap-2.5 sm:rounded-xl sm:px-3 sm:py-2.5 sm:text-[11px]"
            >
              <Icon className="h-4 w-4 shrink-0 text-emerald-300/90 motion-safe:transition-colors group-hover/qa:text-emerald-200" />
              {label}
            </Link>
          ))}
        </div>
      </PremiumGlassCard>

      <PremiumGlassCard glow={false} className="flex items-start gap-2 p-3 sm:gap-2.5 sm:p-3 xl:p-2.5">
        <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md bg-amber-500/15 text-amber-200 ring-1 ring-amber-400/25 sm:h-8 sm:w-8 sm:rounded-lg">
          <Bitcoin className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={2} />
        </div>
        <p className="text-[10px] font-medium leading-relaxed text-zinc-500 sm:text-[11px]">
          Crypto and alternative sleeves ship next — stay on the waitlist inside Settings.
        </p>
      </PremiumGlassCard>
    </aside>
  );
}
