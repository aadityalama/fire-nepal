"use client";

import {
  ArrowLeft,
  BellPlus,
  Bot,
  Building2,
  CalendarClock,
  ChevronRight,
  FileSpreadsheet,
  Gift,
  LineChart,
  Newspaper,
  PieChart,
  ShieldAlert,
  Star,
  Trash2,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import { CompanyActionsTimeline } from "@/components/market/company/CompanyActionsTimeline";
import { CompanyDividendTable } from "@/components/market/company/CompanyDividendTable";
import { CompanyFinancialsTable } from "@/components/market/company/CompanyFinancialsTable";
import { CompanyMetricGrid } from "@/components/market/company/CompanyMetricGrid";
import { CompanyShareholdingPanel } from "@/components/market/company/CompanyShareholdingPanel";
import { useNepseAlerts } from "@/hooks/useNepseAlerts";
import { useNepseCompanyFundamentals } from "@/hooks/useNepseCompanyFundamentals";
import { useNepseNews, type NepseNewsItem } from "@/hooks/useNepseNews";
import { useNepseWatchlist } from "@/hooks/useNepseWatchlist";
import { buildCompanyInsight } from "@/lib/market/nepse-company-insights";
import {
  formatFundamentalText,
  formatFundamentalValue,
} from "@/lib/market/nepse-fundamentals-format";
import { buildIndexSeries } from "@/lib/market/nepse-hub";
import {
  buildIndicatorReadings,
  type Candle,
  type IndicatorSignal,
} from "@/lib/market/technical-indicators";
import { useRealtimeMarket } from "@/providers/realtime-provider";
import { DATA_UNAVAILABLE } from "@/types/market/nepse-company-fundamentals";
import { NepseMarketChart } from "./NepseMarketChart";

const SECTIONS = [
  { id: "overview", label: "Overview", icon: Building2 },
  { id: "price-chart", label: "Price & Chart", icon: LineChart },
  { id: "key-metrics", label: "Key Metrics", icon: PieChart },
  { id: "financials", label: "Financials", icon: FileSpreadsheet },
  { id: "dividends", label: "Dividends", icon: Gift },
  { id: "actions", label: "Actions", icon: CalendarClock },
  { id: "shareholding", label: "Ownership", icon: Users },
  { id: "news", label: "News", icon: Newspaper },
  { id: "ai-analysis", label: "AI Analysis", icon: Bot },
] as const;

const card =
  "rounded-[1.5rem] border border-slate-200/80 bg-white/88 shadow-[0_22px_70px_-44px_rgba(5,46,34,0.32)] backdrop-blur-2xl dark:border-white/[0.08] dark:bg-white/[0.035] dark:shadow-[0_22px_70px_-44px_rgba(0,0,0,0.9)]";
const eyebrow = "text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500 dark:text-zinc-500";

function signalClasses(signal: IndicatorSignal): string {
  if (signal === "bullish") {
    return "border-emerald-300/60 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/[0.08] dark:text-emerald-300";
  }
  if (signal === "bearish") {
    return "border-rose-300/60 bg-rose-50 text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/[0.08] dark:text-rose-300";
  }
  return "border-slate-200 bg-slate-50 text-slate-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-400";
}

function stanceClasses(stance: string): string {
  if (stance === "Constructive") return "border-emerald-300/50 bg-emerald-50 text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200";
  if (stance === "Cautious") return "border-amber-300/50 bg-amber-50 text-amber-900 dark:border-amber-300/20 dark:bg-amber-300/10 dark:text-amber-100";
  return "border-slate-200 bg-slate-50 text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-300";
}

function sentimentBadge(sentiment: NepseNewsItem["sentiment"]): string {
  if (sentiment === "positive") return "border-emerald-300/50 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300";
  if (sentiment === "negative") return "border-rose-300/50 bg-rose-50 text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-300";
  return "border-slate-200 bg-slate-50 text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-400";
}

function formatPublished(value: string | null): string {
  if (!value) return "Recently";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  return date.toLocaleString("en-NP", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function mentionsSymbol(item: NepseNewsItem, symbol: string): boolean {
  const needle = symbol.toUpperCase();
  return `${item.headline} ${item.summary ?? ""}`.toUpperCase().includes(needle);
}

function SectionShell({
  id,
  icon: Icon,
  title,
  subtitle,
  children,
  action,
}: {
  id: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  title: string;
  subtitle: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section id={id} className={`${card} scroll-mt-28 p-4 sm:p-5 lg:scroll-mt-32`}>
      <div className="mb-3.5 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-500/10 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300">
              <Icon className="h-3.5 w-3.5" aria-hidden />
            </span>
            <h2 className="text-base font-extrabold tracking-tight text-slate-950 dark:text-white sm:text-lg">{title}</h2>
          </div>
          <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-zinc-500 sm:text-xs">{subtitle}</p>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function AlertComposer({ symbol, ltpNpr }: { symbol: string; ltpNpr?: number }) {
  const { alerts, addAlert, removeAlert } = useNepseAlerts();
  const [direction, setDirection] = useState<"above" | "below">("above");
  const [price, setPrice] = useState("");
  const mine = alerts.filter((alert) => alert.symbol === symbol);

  return (
    <div className="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-3.5 dark:border-white/[0.06] dark:bg-white/[0.025]">
      <div className="flex items-center gap-2">
        <BellPlus className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
        <h3 className="text-sm font-black">Price Alerts</h3>
      </div>
      <form
        className="mt-3 flex flex-wrap items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const target = Number(price);
          if (Number.isFinite(target) && target > 0) {
            addAlert(symbol, direction, target);
            setPrice("");
          }
        }}
      >
        <div className="flex rounded-xl bg-white p-0.5 dark:bg-black/25" role="group" aria-label="Alert direction">
          {(["above", "below"] as const).map((option) => (
            <button
              type="button"
              key={option}
              onClick={() => setDirection(option)}
              aria-pressed={direction === option}
              className={`rounded-[0.65rem] px-3 py-1.5 text-[10px] font-black capitalize transition ${
                direction === option
                  ? "bg-emerald-500 text-white shadow-sm"
                  : "text-slate-500 dark:text-zinc-500"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
        <input
          value={price}
          onChange={(event) => setPrice(event.target.value)}
          inputMode="decimal"
          placeholder={ltpNpr && ltpNpr > 0 ? `e.g. ${Math.round(ltpNpr)}` : "Target NPR"}
          aria-label="Alert target price in NPR"
          className="fn-mobile-numeric-input h-10 w-32 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-emerald-400 dark:border-white/10 dark:bg-white/[0.05] dark:text-white"
        />
        <button type="submit" className="h-10 rounded-xl bg-emerald-500 px-4 text-xs font-black text-white shadow-sm transition hover:brightness-105">
          Add
        </button>
      </form>
      {mine.length ? (
        <ul className="mt-3 space-y-1.5">
          {mine.map((alert) => (
            <li key={alert.id} className="flex items-center justify-between gap-3 rounded-xl bg-white/80 px-3 py-2 text-xs dark:bg-black/20">
              <span className="font-bold text-slate-800 dark:text-zinc-200">
                {alert.direction} <span className="tabular-nums">रु {alert.targetNpr.toLocaleString("en-IN")}</span>
              </span>
              <button type="button" onClick={() => removeAlert(alert.id)} className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-400/10" aria-label="Remove alert">
                <Trash2 size={13} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function NewsList({ items, empty }: { items: NepseNewsItem[]; empty: string }) {
  if (!items.length) {
    return (
      <div className="grid min-h-36 place-items-center rounded-2xl border border-dashed border-slate-300/90 bg-slate-50/60 p-6 text-center dark:border-white/10 dark:bg-white/[0.02]">
        <div className="max-w-md">
          <p className="text-sm font-black text-slate-800 dark:text-zinc-200">No matching headlines yet</p>
          <p className="mt-1.5 text-[11px] font-medium leading-relaxed text-slate-500 dark:text-zinc-500">{empty}</p>
        </div>
      </div>
    );
  }
  return (
    <ul className="divide-y divide-slate-200/70 dark:divide-white/[0.06]">
      {items.map((item) => (
        <li key={item.id} className="py-3 first:pt-0 last:pb-0">
          <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="group block">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${sentimentBadge(item.sentiment)}`}>
                {item.sentiment}
              </span>
              <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-500">
                {item.sourceName} · {formatPublished(item.publishedAt)}
              </span>
            </div>
            <p className="mt-1.5 text-sm font-black leading-snug text-slate-950 transition group-hover:text-emerald-700 dark:text-white dark:group-hover:text-emerald-300">
              {item.headline}
            </p>
            {item.summary ? (
              <p className="mt-1 line-clamp-2 text-[11px] font-medium leading-relaxed text-slate-500 dark:text-zinc-500">{item.summary}</p>
            ) : null}
          </a>
        </li>
      ))}
    </ul>
  );
}

export function NepseCompanyPage({ symbol }: { symbol: string }) {
  const { snapshot } = useRealtimeMarket();
  const { isWatched, toggle } = useNepseWatchlist();
  const { items: newsItems, corporateActions, loaded: newsLoaded } = useNepseNews({ limit: 40 });
  const { data: fundamentals, loaded: fundamentalsLoaded } = useNepseCompanyFundamentals(symbol);
  const [activeSection, setActiveSection] = useState<(typeof SECTIONS)[number]["id"]>("overview");
  const normalized = decodeURIComponent(symbol).toUpperCase();
  const tick = snapshot?.nepseBySymbol[normalized];
  const profile = fundamentals?.profile;
  const valuation = fundamentals?.valuation;
  const session = fundamentals?.session;
  const range52w = fundamentals?.range52w;
  const positive = (tick?.changePct ?? 0) >= 0;
  const hasQuote = Boolean(tick && tick.ltpNpr > 0);
  const displayPrice = hasQuote ? tick!.ltpNpr : tick?.previousCloseNpr && tick.previousCloseNpr > 0 ? tick.previousCloseNpr : null;
  const priceLabel = hasQuote ? "Live Price & Session" : displayPrice != null ? "Previous Close (live LTP unavailable)" : "Live Price & Session";
  const companyName = profile?.companyName ?? tick?.companyName ?? null;
  const sector = profile?.sector ?? tick?.sector ?? null;

  const candles = useMemo<Candle[]>(() => {
    const anchor = tick?.ltpNpr && tick.ltpNpr > 0 ? tick.ltpNpr : tick?.previousCloseNpr && tick.previousCloseNpr > 0 ? tick.previousCloseNpr : 1_000;
    return buildIndexSeries(anchor, "1Y").map((point) => ({
      open: point.open,
      high: point.high,
      low: point.low,
      close: point.value,
      volume: point.volume,
    }));
  }, [tick]);
  const readings = useMemo(() => buildIndicatorReadings(candles), [candles]);
  const insight = useMemo(() => buildCompanyInsight(tick, snapshot ?? null, readings), [tick, snapshot, readings]);

  const companyNews = useMemo(
    () => newsItems.filter((item) => mentionsSymbol(item, normalized)).slice(0, 8),
    [newsItems, normalized],
  );
  const companyActionsNews = useMemo(() => {
    const matched = corporateActions.filter((item) => mentionsSymbol(item, normalized));
    if (matched.length) return matched.slice(0, 8);
    return corporateActions.slice(0, 6);
  }, [corporateActions, normalized]);

  useEffect(() => {
    const nodes = SECTIONS.map((section) => document.getElementById(section.id)).filter(Boolean) as HTMLElement[];
    if (!nodes.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target?.id) {
          setActiveSection(visible.target.id as (typeof SECTIONS)[number]["id"]);
        }
      },
      { rootMargin: "-20% 0px -55% 0px", threshold: [0.15, 0.35, 0.6] },
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  function scrollToSection(id: (typeof SECTIONS)[number]["id"]) {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const overviewMetrics = [
    { label: "Symbol", value: normalized, style: "text" as const },
    { label: "Company Name", value: formatFundamentalText(companyName), style: "text" as const },
    { label: "Sector", value: formatFundamentalText(sector), style: "text" as const },
    { label: "Industry", value: formatFundamentalText(profile?.industry), style: "text" as const },
    { label: "Market Cap", value: profile?.marketCapNpr ?? tick?.marketCap ?? null, style: "compactNpr" as const },
    { label: "Paid-up Capital", value: profile?.paidUpCapitalNpr ?? null, style: "compactNpr" as const },
    { label: "Listed Shares", value: profile?.listedShares ?? null, style: "shares" as const },
    { label: "Public Shares", value: profile?.publicShares ?? null, style: "shares" as const },
    { label: "Promoter Shares", value: profile?.promoterShares ?? null, style: "shares" as const },
    { label: "52W High", value: range52w?.highNpr ?? null, style: "npr" as const },
    { label: "52W Low", value: range52w?.lowNpr ?? null, style: "npr" as const },
    {
      label: "Intraday Range",
      value: tick?.intradayRangePct ?? null,
      style: "pct" as const,
    },
  ];

  const sessionMetrics = [
    { label: "Open", value: session?.openNpr ?? tick?.openNpr ?? null, style: "npr" as const },
    { label: "Today's High", value: session?.highNpr ?? tick?.highNpr ?? null, style: "npr" as const },
    { label: "Today's Low", value: session?.lowNpr ?? tick?.lowNpr ?? null, style: "npr" as const },
    { label: "Close", value: session?.closeNpr ?? (hasQuote ? tick!.ltpNpr : null), style: "npr" as const },
    { label: "Previous Close", value: session?.previousCloseNpr ?? tick?.previousCloseNpr ?? null, style: "npr" as const },
    { label: "Volume", value: session?.volume ?? tick?.volume ?? null, style: "shares" as const },
    { label: "Turnover", value: session?.turnoverNpr ?? tick?.turnoverNpr ?? null, style: "compactNpr" as const },
    { label: "Trades", value: session?.trades ?? tick?.trades ?? null, style: "shares" as const },
  ];

  const valuationMetrics = [
    { label: "EPS", value: valuation?.eps ?? null },
    { label: "PE Ratio", value: valuation?.pe ?? null },
    { label: "Book Value", value: valuation?.bookValueNpr ?? null, style: "npr" as const },
    { label: "PB Ratio", value: valuation?.pb ?? null },
    { label: "ROE", value: valuation?.roePct ?? null, style: "pct" as const },
    { label: "ROA", value: valuation?.roaPct ?? null, style: "pct" as const },
    { label: "Net Worth", value: valuation?.netWorthNpr ?? null, style: "compactNpr" as const },
    { label: "Graham Number", value: valuation?.grahamNumber ?? null, style: "npr" as const },
    { label: "Market Cap", value: profile?.marketCapNpr ?? tick?.marketCap ?? null, style: "compactNpr" as const },
  ];

  return (
    <main className="min-h-screen bg-[#f4f8f6] text-slate-950 dark:bg-[#030a08] dark:text-white" data-testid="nepse-company-page">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(16,185,129,0.12),transparent_28rem),radial-gradient(circle_at_92%_18%,rgba(20,184,166,0.08),transparent_22rem)]" />
      <div className="relative mx-auto w-full max-w-7xl px-3 pb-28 pt-4 sm:px-5 lg:px-8">
        <header className="mb-4 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/market"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-200/80 bg-white/90 dark:border-white/10 dark:bg-white/[0.05]"
              aria-label="Back to NEPSE Hub"
            >
              <ArrowLeft size={17} />
            </Link>
            <div className="min-w-0">
              <p className="truncate text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-400">
                {formatFundamentalText(companyName) === DATA_UNAVAILABLE ? "NEPSE listed company" : companyName}
              </p>
              <h1 className="truncate text-xl font-black tracking-tight sm:text-2xl">{normalized}</h1>
            </div>
          </div>
          <button
            type="button"
            onClick={() => toggle(normalized)}
            className={`inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-xs font-black transition ${
              isWatched(normalized)
                ? "border-amber-300/50 bg-amber-50 text-amber-700 dark:border-amber-300/20 dark:bg-amber-300/10 dark:text-amber-200"
                : "border-slate-200/80 bg-white/90 text-slate-600 dark:border-white/10 dark:bg-white/[0.05] dark:text-zinc-300"
            }`}
          >
            <Star size={15} fill={isWatched(normalized) ? "currentColor" : "none"} />
            {isWatched(normalized) ? "Watching" : "Watch"}
          </button>
        </header>

        {/* Live Price hero */}
        <section
          className="overflow-hidden rounded-[1.75rem] border border-emerald-400/20 bg-[radial-gradient(circle_at_6%_0%,rgba(52,211,153,0.22),transparent_38%),linear-gradient(145deg,#063126,#05110e)] p-5 text-white shadow-[0_30px_80px_-40px_rgba(16,185,129,0.55)] sm:p-7"
          data-testid="company-live-price"
        >
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-100/55">{priceLabel}</p>
              <p className="mt-2 text-[2.4rem] font-black leading-none tracking-[-0.04em] tabular-nums sm:text-[3.25rem]">
                {displayPrice != null ? `रु ${displayPrice.toLocaleString("en-IN")}` : DATA_UNAVAILABLE}
              </p>
              <p className={`mt-3 text-sm font-black ${positive ? "text-emerald-300" : "text-rose-300"}`}>
                {tick?.changePct == null
                  ? "Live quote unavailable"
                  : `${positive ? "+" : ""}${tick.changePct.toFixed(2)}%${tick.changeNpr != null ? ` · रु ${tick.changeNpr >= 0 ? "+" : ""}${tick.changeNpr.toLocaleString("en-IN")}` : ""} today`}
              </p>
              <p className="mt-2 text-[11px] font-semibold text-emerald-100/55">
                {formatFundamentalText(sector)} · Updated {tick?.lastUpdated ? formatPublished(tick.lastUpdated) : snapshot?.fetchedAt ? formatPublished(snapshot.fetchedAt) : DATA_UNAVAILABLE}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-right sm:gap-3">
              {[
                ["High", formatFundamentalValue(session?.highNpr ?? tick?.highNpr, { style: "npr" })],
                ["Low", formatFundamentalValue(session?.lowNpr ?? tick?.lowNpr, { style: "npr" })],
                ["Volume", formatFundamentalValue(session?.volume ?? tick?.volume, { style: "shares" })],
              ].map(([label, value]) => (
                <div key={label} className="min-w-[4.5rem] rounded-xl bg-white/5 px-2.5 py-2 ring-1 ring-white/10">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-100/45">{label}</p>
                  <p className="mt-1 text-xs font-black tabular-nums">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <nav
          className="no-scrollbar sticky top-0 z-30 mt-3 -mx-1 flex gap-1 overflow-x-auto rounded-2xl border border-slate-200/80 bg-white/90 p-1 backdrop-blur-2xl dark:border-white/[0.08] dark:bg-[#07110f]/92"
          aria-label="Company detail sections"
          data-testid="company-section-nav"
        >
          {SECTIONS.map((section) => (
            <button
              type="button"
              key={section.id}
              onClick={() => scrollToSection(section.id)}
              className={`shrink-0 rounded-xl px-3 py-2 text-[10px] font-black transition ${
                activeSection === section.id
                  ? "bg-emerald-500 text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-100 dark:text-zinc-500 dark:hover:bg-white/[0.05]"
              }`}
            >
              {section.label}
            </button>
          ))}
        </nav>

        <div className="mt-4 space-y-4">
          {/* 1. Company Overview */}
          <SectionShell id="overview" icon={Building2} title="Company Overview" subtitle="Identity, capital structure, session stats and 52-week range">
            <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="space-y-3">
                <CompanyMetricGrid items={overviewMetrics} className="grid grid-cols-2 gap-2 sm:grid-cols-3" />
                <div>
                  <p className={`${eyebrow} mb-2`}>Session</p>
                  <CompanyMetricGrid items={sessionMetrics} className="grid grid-cols-2 gap-2 sm:grid-cols-4" />
                </div>
              </div>
              <div className="space-y-3">
                <AlertComposer symbol={normalized} ltpNpr={tick?.ltpNpr} />
                <div className="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-3.5 dark:border-white/[0.06] dark:bg-white/[0.025]">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-amber-500" aria-hidden />
                    <h3 className="text-sm font-black">Risk & Rating</h3>
                  </div>
                  <p className="mt-3 text-2xl font-black">Not rated</p>
                  <p className="mt-1.5 text-[11px] font-medium leading-relaxed text-slate-500 dark:text-zinc-500">
                    Buy / Hold / Sell scoring stays off until audited fundamentals and sufficient OHLC history are available.
                  </p>
                </div>
              </div>
            </div>
          </SectionShell>

          {/* 2. Live Price & Chart */}
          <SectionShell id="price-chart" icon={LineChart} title="Live Price & Chart" subtitle="Interactive session chart with indicative technical overlays">
            <NepseMarketChart value={displayPrice ?? 1_000} changePct={tick?.changePct} />
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {readings.slice(0, 6).map((reading) => (
                <div key={reading.name} className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-3 dark:border-white/[0.06] dark:bg-white/[0.025]">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-black">{reading.name}</p>
                    <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black capitalize ${signalClasses(reading.signal)}`}>
                      {reading.signal}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-black tabular-nums">{reading.value}</p>
                  <p className="mt-0.5 text-[10px] font-semibold text-slate-500 dark:text-zinc-500">{reading.detail}</p>
                </div>
              ))}
            </div>
          </SectionShell>

          {/* 3. Key Metrics / Valuation */}
          <SectionShell
            id="key-metrics"
            icon={PieChart}
            title="Key Metrics"
            subtitle={fundamentalsLoaded ? "Valuation from the fundamental data engine" : "Loading valuation…"}
          >
            <CompanyMetricGrid items={valuationMetrics} testId="company-key-metrics" />
          </SectionShell>

          {/* 4. Financial Statements */}
          <SectionShell id="financials" icon={FileSpreadsheet} title="Financial Statements" subtitle="Revenue, profit, reserves, cash, borrowings, assets and liabilities">
            <CompanyFinancialsTable rows={fundamentals?.financials ?? []} />
            <p className="mt-3 text-[11px] font-medium text-slate-500 dark:text-zinc-500">
              Missing cells show “{DATA_UNAVAILABLE}”. Figures appear only after audited statement rows are ingested — never estimated.
            </p>
          </SectionShell>

          {/* 5. Dividend / Bonus / Rights */}
          <SectionShell id="dividends" icon={Gift} title="Dividend / Bonus / Rights History" subtitle="Fiscal year, bonus %, cash %, book close and AGM">
            <CompanyDividendTable rows={fundamentals?.dividends ?? []} />
          </SectionShell>

          {/* 6. Corporate Actions Timeline */}
          <SectionShell
            id="actions"
            icon={CalendarClock}
            title="Corporate Actions Timeline"
            subtitle={
              fundamentals?.actions.length
                ? "Structured rights, bonus, dividend, AGM, book close, FPO, IPO and merger events"
                : newsLoaded
                  ? "Fallback headlines tagged as corporate actions until structured events are ingested"
                  : "Loading corporate action feed…"
            }
          >
            <CompanyActionsTimeline
              actions={fundamentals?.actions ?? []}
              fallbackNews={companyActionsNews.map((item) => ({
                id: item.id,
                title: item.headline,
                date: item.publishedAt,
                source: item.sourceName,
                url: item.sourceUrl,
                marketWide: !mentionsSymbol(item, normalized),
              }))}
            />
          </SectionShell>

          {/* 7. Shareholding Structure */}
          <SectionShell id="shareholding" icon={Users} title="Shareholding Structure" subtitle="Promoter, public and listed share counts">
            <CompanyShareholdingPanel
              shareholding={
                fundamentals?.shareholding ?? {
                  promoterShares: null,
                  publicShares: null,
                  listedShares: null,
                  promoterPct: null,
                  publicPct: null,
                  otherPct: null,
                }
              }
            />
          </SectionShell>

          {/* 8. Company News */}
          <SectionShell id="news" icon={Newspaper} title="Company News" subtitle={`Headlines mentioning ${normalized} from the NEPSE news engine`}>
            <div data-testid="company-news">
              <NewsList
                items={companyNews}
                empty={
                  newsLoaded
                    ? `No recent aggregated headlines mention ${normalized}. Market-wide news still updates on the hub home.`
                    : "Loading news feed…"
                }
              />
            </div>
          </SectionShell>

          {/* 9. AI Company Analysis */}
          <SectionShell
            id="ai-analysis"
            icon={Bot}
            title="AI Company Analysis"
            subtitle="Deterministic session intelligence — not investment advice"
            action={
              <Link
                href={`/fire-ai/chat?context=nepse&symbol=${encodeURIComponent(normalized)}`}
                className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 dark:text-emerald-400"
              >
                Ask FIRE AI <ChevronRight size={12} />
              </Link>
            }
          >
            <div data-testid="company-ai-analysis">
              <div className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${stanceClasses(insight.stance)}`}>
                {insight.stance}
              </div>
              <p className="mt-3 text-sm font-bold leading-relaxed text-slate-800 dark:text-zinc-200">{insight.summary}</p>
              <ul className="mt-3 space-y-2">
                {insight.bullets.map((bullet) => (
                  <li key={bullet} className="flex gap-2 text-[12px] font-medium leading-relaxed text-slate-600 dark:text-zinc-400">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
              {insight.peers.length ? (
                <div className="mt-4">
                  <p className={eyebrow}>Same-sector movers</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {insight.peers.map((peer) => (
                      <Link
                        key={peer.symbol}
                        href={`/market/company/${encodeURIComponent(peer.symbol)}`}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-slate-50/80 px-3 py-1.5 text-[11px] font-black transition hover:border-emerald-400/40 dark:border-white/10 dark:bg-white/[0.04]"
                      >
                        {peer.symbol}
                        <span className={(peer.changePct ?? 0) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
                          {peer.changePct == null ? "—" : `${peer.changePct >= 0 ? "+" : ""}${peer.changePct.toFixed(2)}%`}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </SectionShell>
        </div>
      </div>
    </main>
  );
}
