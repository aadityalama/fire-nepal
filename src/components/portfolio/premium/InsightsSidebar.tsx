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
  return <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-zinc-500 sm:text-[10px]">{children}</p>;
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
  const cashNarrative = intelModel.cashBurn?.narrative?.trim();

  return (
    <aside className="flex w-full min-w-0 flex-col gap-5">
      <PremiumGlassCard className="relative overflow-hidden p-5 xl:p-5">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-600/[0.14] via-transparent to-emerald-500/[0.06]" />
        <div className="pointer-events-none absolute -right-6 top-0 h-20 w-20 rounded-full bg-violet-500/12 blur-2xl" />
        <div className="relative z-10 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setCoachOpen((o) => !o)}
            className="flex w-full items-start justify-between gap-2 rounded-lg text-left transition-colors hover:bg-white/[0.04]"
            aria-expanded={coachOpen}
          >
            <div className="flex min-w-0 flex-1 items-start gap-2">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-violet-500/18 text-violet-100 ring-1 ring-violet-400/30 sm:h-8 sm:w-8 sm:rounded-lg">
                <Bot className="h-3.5 w-3.5" strokeWidth={2} />
              </div>
              <div className="min-w-0 flex-1 space-y-0.5">
                <SectionOverline>Guidance</SectionOverline>
                <h2 className="min-w-0 truncate text-xs font-bold tracking-tight text-white sm:text-[13px]">AI financial coach</h2>
                <p className="line-clamp-2 text-[10px] font-medium leading-snug text-zinc-400 sm:text-[11px]">{coachBody}</p>
              </div>
            </div>
            <span className="flex shrink-0 flex-col items-center gap-0.5 pt-0.5">
              {accordionChevron(coachOpen)}
              <span className="text-[8px] font-bold uppercase tracking-wide text-zinc-500">{coachOpen ? "Less" : "More"}</span>
            </span>
          </button>

          {coachOpen ? (
            <div className="space-y-2 border-t border-white/[0.06] pt-2 text-[10px] leading-snug text-zinc-300 sm:text-[11px]">
              {coachExpandedBullets.length ? (
                <ul className="list-inside list-disc space-y-1 text-zinc-400">
                  {coachExpandedBullets.map((b, i) => (
                    <li key={`coach-bullet-${i}`} className="pl-0.5">
                      {b}
                    </li>
                  ))}
                </ul>
              ) : null}
              {cashNarrative && cashNarrative !== coachBody ? <p className="text-zinc-400">{cashNarrative}</p> : null}
              {coachExpandedCards.length ? (
                <ul className="space-y-1.5">
                  {coachExpandedCards.map((c) => (
                    <li key={c.id} className="min-w-0 rounded-md border border-white/[0.06] bg-black/25 px-2 py-1.5">
                      <p className="min-w-0 truncate font-semibold text-zinc-200">{c.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-[9px] text-zinc-500 sm:text-[10px]">{c.subtitle}</p>
                    </li>
                  ))}
                </ul>
              ) : null}
              <Link
                href="/portfolio/ai-insights"
                className="group/cta inline-flex min-h-[40px] w-fit items-center gap-1.5 rounded-lg border border-emerald-400/22 bg-emerald-500/[0.08] px-2.5 py-1.5 text-[10px] font-bold text-emerald-200/95 ring-1 ring-white/[0.04] transition hover:border-emerald-400/35 hover:bg-emerald-500/[0.12] hover:text-white sm:text-[11px]"
              >
                Full recommendations
                <ArrowRight className="h-3 w-3 transition-transform group-hover/cta:translate-x-0.5" />
              </Link>
            </div>
          ) : null}
        </div>
      </PremiumGlassCard>

      <PremiumGlassCard className="p-5 xl:p-5">
        <button
          type="button"
          onClick={() => setMarketsOpen((o) => !o)}
          className="flex w-full items-center justify-between gap-2 rounded-lg text-left hover:bg-white/[0.03]"
          aria-expanded={marketsOpen}
        >
          <div className="min-w-0 flex-1 space-y-0.5">
            <SectionOverline>Markets</SectionOverline>
            <h2 className="text-xs font-bold tracking-tight text-white sm:text-[13px]">Overview</h2>
            {!marketsOpen && primaryMarket ? (
              <p className="truncate text-[10px] font-semibold tabular-nums text-zinc-400 sm:text-[11px]">
                <span className="text-zinc-500">{primaryMarket.label}</span>{" "}
                <span className="text-white">{primaryMarket.value}</span>{" "}
                <span className={primaryMarket.changePct >= 0 ? "text-emerald-400" : "text-rose-400"}>
                  {primaryMarket.changePct >= 0 ? "+" : ""}
                  {primaryMarket.changePct.toFixed(2)}%
                </span>
              </p>
            ) : !marketsOpen ? (
              <p className="text-[10px] text-zinc-500">Expand for FX and index detail.</p>
            ) : null}
          </div>
          <span className="flex shrink-0 flex-col items-center gap-0.5">
            {accordionChevron(marketsOpen)}
            <span className="text-[8px] font-bold uppercase tracking-wide text-zinc-500">{marketsOpen ? "Less" : "Expand"}</span>
          </span>
        </button>

        {marketsOpen ? (
          <div className="mt-2 border-t border-white/[0.06] pt-2">
            {status === "loading" && !marketRows.length ? (
              <p className="text-[10px] font-medium text-zinc-500">Loading live snapshot…</p>
            ) : marketRows.length ? (
              <ul className="space-y-1">
                {marketRows.map((m) => {
                  const up = m.changePct >= 0;
                  return (
                    <li
                      key={m.label}
                      className="flex min-w-0 items-center justify-between gap-2 rounded-md border border-white/[0.06] bg-black/30 px-2 py-1.5 text-[10px] backdrop-blur-sm sm:text-[11px]"
                    >
                      <span className="min-w-0 truncate font-semibold text-zinc-500">{m.label}</span>
                      <span className="shrink-0 font-bold tabular-nums text-white">{m.value}</span>
                      <span className={`font-bold tabular-nums ${up ? "text-emerald-400" : "text-rose-400"}`}>
                        {up ? "+" : ""}
                        {m.changePct.toFixed(2)}%
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-[10px] font-medium text-zinc-500">Market snapshot unavailable — check your connection or try again later.</p>
            )}
          </div>
        ) : null}
      </PremiumGlassCard>

      <PremiumGlassCard className="p-5 xl:p-5">
        <div className="flex items-center gap-2">
          <div className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/25 sm:h-8 sm:w-8 sm:rounded-lg">
            <PiggyBank className="h-3 w-3 sm:h-3.5 sm:w-3.5" strokeWidth={2} />
          </div>
          <div className="min-w-0 space-y-0.5">
            <SectionOverline>Shortcuts</SectionOverline>
            <h2 className="text-xs font-bold tracking-tight text-white sm:text-[13px]">Quick add</h2>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          {quickAdds.map(({ label, href, icon: Icon }) => (
            <Link
              key={label}
              href={href}
              className="group/qa flex min-h-[40px] min-w-0 items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-[10px] font-semibold text-zinc-200 ring-1 ring-transparent transition hover:border-emerald-400/28 hover:bg-emerald-500/[0.07] hover:text-white"
            >
              <Icon className="h-3.5 w-3.5 shrink-0 text-emerald-300/90 group-hover/qa:text-emerald-200" />
              <span className="min-w-0 truncate">{label}</span>
            </Link>
          ))}
        </div>
      </PremiumGlassCard>

      <PremiumGlassCard glow={false} className="flex items-start gap-2 p-5 xl:p-5">
        <div className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded bg-amber-500/15 text-amber-200 ring-1 ring-amber-400/25 sm:h-7 sm:w-7 sm:rounded-md">
          <Bitcoin className="h-3 w-3 sm:h-3.5 sm:w-3.5" strokeWidth={2} />
        </div>
        <p className="text-[9px] font-medium leading-relaxed text-zinc-500 sm:text-[10px]">
          Crypto and alternative sleeves ship next — stay on the waitlist inside Settings.
        </p>
      </PremiumGlassCard>
    </aside>
  );
}
