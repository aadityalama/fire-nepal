"use client";

import {
  ArrowRight,
  Bitcoin,
  Bot,
  Building2,
  Car,
  ChevronDown,
  Coins,
  Landmark,
  LineChart,
  PiggyBank,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { PremiumGlassCard } from "@/components/portfolio/premium/PremiumGlassCard";
import { useWealthPortfolio } from "@/contexts/WealthPortfolioContext";
import { useMarketData } from "@/hooks/use-market-data";

const quickAdds = [
  { label: "Add Bank", href: "/portfolio/banking", icon: Landmark },
  { label: "Add Investment", href: "/portfolio/investments", icon: LineChart },
  { label: "Add Gold", href: "/portfolio/gold", icon: Coins },
  { label: "Add Real Estate", href: "/portfolio/real-estate", icon: Building2 },
  { label: "Add Vehicle", href: "/portfolio/vehicles", icon: Car },
  { label: "Add Liability", href: "/portfolio/liabilities", icon: ShieldAlert },
] as const;

function SectionOverline({ children }: { children: string }) {
  return <p className="text-xs font-bold uppercase leading-snug tracking-wider text-white/65">{children}</p>;
}

function accordionChevron(open: boolean) {
  return (
    <ChevronDown
      size={16}
      className={`shrink-0 opacity-80 transition-transform duration-300 ease-out ${open ? "rotate-180" : "rotate-0"}`}
      aria-hidden
    />
  );
}

export function InsightsSidebar() {
  const { intelModel, totals, hydrated } = useWealthPortfolio();
  const { snapshot, status } = useMarketData({
    symbolsCsv: "NEPSE",
    cryptoCsv: "",
    enabled: true,
  });

  const [coachOpen, setCoachOpen] = useState(false);
  const [marketsOpen, setMarketsOpen] = useState(false);

  const coachBody = useMemo(() => {
    if (!hydrated) return "Loading your workspace…";
    const head = intelModel.monthlyReport?.headline?.trim();
    if (head) return head;
    if (totals.totalAssetsNpr <= 0 && totals.liabilitiesNpr <= 0) {
      return "Create Your First Goal in cashflow and add assets here — coach insights appear from your own numbers.";
    }
    return intelModel.cashBurn?.narrative?.trim() || "Track income and spending in cashflow to unlock tailored guidance.";
  }, [hydrated, intelModel, totals.liabilitiesNpr, totals.totalAssetsNpr]);

  const marketRows = useMemo(() => {
    const rows: { label: string; value: string; changePct: number }[] = [];
    if (!snapshot) return rows;
    if (snapshot.nepseIndex && typeof snapshot.nepseIndex.value === "number") {
      rows.push({
        label: snapshot.nepseIndex.name || "NEPSE",
        value: snapshot.nepseIndex.value.toLocaleString("en-US", { maximumFractionDigits: 2 }),
        changePct: snapshot.nepseIndex.changePct ?? 0,
      });
    }
    if (snapshot.forex?.nprPerUsd) {
      rows.push({
        label: "USD / NPR",
        value: snapshot.forex.nprPerUsd.toFixed(2),
        changePct: 0,
      });
    }
    if (snapshot.forex?.krwPerNpr) {
      rows.push({
        label: "KRW / NPR",
        value: snapshot.forex.krwPerNpr.toFixed(4),
        changePct: 0,
      });
    }
    return rows;
  }, [snapshot]);

  const primaryMarket = marketRows[0];
  const coachExpandedBullets = intelModel.monthlyReport?.bullets ?? [];
  const coachExpandedCards = intelModel.smartCards?.slice(0, 4) ?? [];
  const primaryInsight = coachExpandedCards[0];
  const cashNarrative = intelModel.cashBurn?.narrative?.trim();

  return (
    <aside className="flex w-full min-w-0 flex-col gap-4">
      <PremiumGlassCard className="relative overflow-hidden p-4 xl:p-4">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#C06CFF]/[0.09] via-transparent to-[#38F2A0]/[0.035]" />
        <div className="relative z-10 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setCoachOpen((o) => !o)}
            className="flex w-full items-start justify-between gap-2 rounded-lg text-left transition-colors hover:bg-white/[0.04]"
            aria-expanded={coachOpen}
          >
            <div className="flex min-w-0 flex-1 items-start gap-2">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#C06CFF]/10 text-[#C06CFF] ring-1 ring-[#C06CFF]/20">
                <Bot className="h-3.5 w-3.5" strokeWidth={2} />
              </div>
              <div className="min-w-0 flex-1 space-y-0.5">
                <SectionOverline>Guidance</SectionOverline>
                <h2 className="min-w-0 text-sm font-bold leading-snug tracking-tight text-white">AI financial coach</h2>
                <p className="line-clamp-2 text-xs font-medium leading-snug text-[#A7B4C4]">{coachBody}</p>
              </div>
            </div>
            <span className="flex shrink-0 flex-col items-center gap-0.5 pt-0.5">
              {accordionChevron(coachOpen)}
              <span className="text-[8px] font-bold uppercase tracking-wide text-[#A7B4C4]">{coachOpen ? "Less" : "More"}</span>
            </span>
          </button>

          {coachOpen ? (
            <div className="space-y-2 border-t border-white/[0.08] pt-2 text-[11px] leading-snug text-[#A7B4C4]">
              {coachExpandedBullets.length ? (
                <ul className="list-inside list-disc space-y-1 text-[#A7B4C4]">
                  {coachExpandedBullets.map((b, i) => (
                    <li key={`coach-bullet-${i}`} className="pl-0.5">
                      {b}
                    </li>
                  ))}
                </ul>
              ) : null}
              {cashNarrative && cashNarrative !== coachBody ? <p className="text-[#A7B4C4]">{cashNarrative}</p> : null}
              {coachExpandedCards.length ? (
                <ul className="space-y-1.5">
                  {coachExpandedCards.map((c) => (
                    <li key={c.id} className="min-w-0 rounded-lg border border-white/[0.08] bg-[#07111A]/70 px-2.5 py-2">
                      <p className="min-w-0 font-semibold leading-snug text-zinc-200">{c.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-[10px] text-[#A7B4C4]">{c.subtitle}</p>
                    </li>
                  ))}
                </ul>
              ) : null}
              <Link
                href="/portfolio/ai-insights"
                className="group/cta inline-flex min-h-[38px] w-fit items-center gap-1.5 rounded-lg border border-[#38F2A0]/20 bg-[#38F2A0]/10 px-2.5 py-1.5 text-[11px] font-bold text-[#38F2A0] ring-1 ring-white/[0.03] transition hover:border-[#38F2A0]/35 hover:bg-[#38F2A0]/14 hover:text-white"
              >
                Full recommendations
                <ArrowRight className="h-3 w-3 transition-transform group-hover/cta:translate-x-0.5" />
              </Link>
            </div>
          ) : null}
        </div>
      </PremiumGlassCard>

      <PremiumGlassCard className="p-4 xl:p-4">
        <button
          type="button"
          onClick={() => setMarketsOpen((o) => !o)}
          className="flex w-full items-center justify-between gap-2 rounded-lg text-left hover:bg-white/[0.03]"
          aria-expanded={marketsOpen}
        >
          <div className="min-w-0 flex-1 space-y-0.5">
            <SectionOverline>Markets</SectionOverline>
            <h2 className="text-sm font-bold leading-snug tracking-tight text-white">Overview</h2>
            {!marketsOpen && primaryMarket ? (
              <p className="text-xs font-semibold leading-snug tabular-nums text-[#A7B4C4]">
                <span className="text-[#A7B4C4]">{primaryMarket.label}</span>{" "}
                <span className="text-white">{primaryMarket.value}</span>{" "}
                <span className={primaryMarket.changePct >= 0 ? "text-[#38F2A0]" : "text-rose-300"}>
                  {primaryMarket.changePct >= 0 ? "+" : ""}
                  {primaryMarket.changePct.toFixed(2)}%
                </span>
              </p>
            ) : !marketsOpen ? (
              <p className="text-xs text-[#A7B4C4]">Expand for FX and index detail.</p>
            ) : null}
          </div>
          <span className="flex shrink-0 flex-col items-center gap-0.5">
            {accordionChevron(marketsOpen)}
            <span className="text-[8px] font-bold uppercase tracking-wide text-[#A7B4C4]">{marketsOpen ? "Less" : "Expand"}</span>
          </span>
        </button>

        {marketsOpen ? (
          <div className="mt-2 border-t border-white/[0.08] pt-2">
            {status === "loading" && !marketRows.length ? (
              <p className="text-[11px] font-medium text-[#A7B4C4]">Loading live snapshot…</p>
            ) : marketRows.length ? (
              <ul className="space-y-1">
                {marketRows.map((m) => {
                  const up = m.changePct >= 0;
                  return (
                    <li
                      key={m.label}
                      className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-white/[0.08] bg-[#07111A]/70 px-2.5 py-2 text-[11px] backdrop-blur-sm"
                    >
                      <span className="min-w-0 font-semibold leading-snug text-[#A7B4C4]">{m.label}</span>
                      <span className="shrink-0 font-bold tabular-nums text-white">{m.value}</span>
                      <span className={`font-bold tabular-nums ${up ? "text-[#38F2A0]" : "text-rose-300"}`}>
                        {up ? "+" : ""}
                        {m.changePct.toFixed(2)}%
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-[11px] font-medium text-[#A7B4C4]">Market snapshot unavailable — check your connection or try again later.</p>
            )}
          </div>
        ) : null}
      </PremiumGlassCard>

      <PremiumGlassCard className="p-4 xl:p-4">
        <div className="flex items-start gap-2">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#F7C948]/10 text-[#F7C948] ring-1 ring-[#F7C948]/20">
            <Bitcoin className="h-3.5 w-3.5" strokeWidth={2} />
          </div>
          <div className="min-w-0 flex-1 space-y-0.5">
            <SectionOverline>Insights</SectionOverline>
            <h2 className="text-sm font-bold leading-snug tracking-tight text-white">{primaryInsight?.title ?? "Portfolio intelligence"}</h2>
            <p className="line-clamp-3 text-xs font-medium leading-snug text-[#A7B4C4]">
              {primaryInsight?.subtitle ?? "AI insights, concentration reads, and alternative sleeves are staged inside your premium workspace."}
            </p>
          </div>
        </div>
      </PremiumGlassCard>

      <PremiumGlassCard className="p-4 xl:p-4">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#38F2A0]/10 text-[#38F2A0] ring-1 ring-[#38F2A0]/20">
            <PiggyBank className="h-3 w-3 sm:h-3.5 sm:w-3.5" strokeWidth={2} />
          </div>
          <div className="min-w-0 space-y-0.5">
            <SectionOverline>Shortcuts</SectionOverline>
            <h2 className="text-sm font-bold leading-snug tracking-tight text-white">Quick Actions</h2>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          {quickAdds.map(({ label, href, icon: Icon }) => (
            <Link
              key={label}
              href={href}
              className="group/qa flex min-h-[38px] min-w-0 items-center gap-2 rounded-lg border border-white/[0.08] bg-[#07111A]/70 px-2.5 py-2 text-[10px] font-semibold text-[#A7B4C4] ring-1 ring-transparent transition hover:border-[#38F2A0]/25 hover:bg-[#38F2A0]/10 hover:text-white"
            >
              <Icon className="h-3.5 w-3.5 shrink-0 text-[#38F2A0] group-hover/qa:text-[#38F2A0]" />
              <span className="min-w-0 leading-snug">{label}</span>
            </Link>
          ))}
        </div>
      </PremiumGlassCard>
    </aside>
  );
}
