"use client";

import {
  Activity,
  ArrowLeft,
  ArrowUpRight,
  BadgeDollarSign,
  Banknote,
  BarChart3,
  Clock3,
  ExternalLink,
  Flame,
  Gem,
  Globe2,
  Landmark,
  LineChart as LineChartIcon,
  Newspaper,
  RefreshCcw,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  NepalEconomyCard,
  NepalEconomyCardId,
  NepalEconomyDashboardData,
  NepalEconomyDataMode,
  NepalEconomyMover,
  NepalEconomyNewsItem,
} from "@/types/nepal-economy";

const AUTO_REFRESH_MS = 15 * 60 * 1000;
const LOCAL_STORAGE_KEY = "fire-nepal:nepal-economy-dashboard";

const cardIcons: Record<NepalEconomyCardId, LucideIcon> = {
  inflation: TrendingDown,
  gdp: BarChart3,
  policyRate: Landmark,
  fdRates: Banknote,
  usdNpr: Globe2,
  krwNpr: BadgeDollarSign,
  gold: Gem,
  silver: Gem,
  remittance: RefreshCcw,
  nepse: LineChartIcon,
};

const NEWS_TAGS = ["Economy", "Banking", "NEPSE", "Remittance", "Government Policy"] as const;

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function formatDateTime(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function modeBadge(mode: NepalEconomyDataMode) {
  if (mode === "live") return { label: "LIVE", className: "bg-lime-400/15 text-lime-200 border-lime-300/30" };
  if (mode === "cached") return { label: "CACHED", className: "bg-amber-400/10 text-amber-100 border-amber-300/25" };
  return { label: "OFFICIAL", className: "bg-sky-400/10 text-sky-100 border-sky-300/25" };
}

function toneClasses(tone: NepalEconomyCard["tone"]) {
  if (tone === "up") return "text-emerald-300";
  if (tone === "down") return "text-red-300";
  return "text-slate-300";
}

function readLocalCache(): NepalEconomyDashboardData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as NepalEconomyDashboardData) : null;
  } catch {
    return null;
  }
}

function writeLocalCache(payload: NepalEconomyDashboardData) {
  try {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* quota */
  }
}

function BrandMark() {
  return (
    <Link href="/" className="group inline-flex items-center gap-3" aria-label="FIRE Nepal home">
      <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-700 text-white shadow-lg">
        <Flame className="h-5 w-5 fill-current" aria-hidden />
      </span>
      <span>
        <span className="block text-sm font-black uppercase tracking-[0.2em] text-white">FIRE Nepal</span>
        <span className="block text-[10px] font-bold uppercase tracking-[0.28em] text-emerald-200/60">Economy Terminal</span>
      </span>
    </Link>
  );
}

function TerminalSkeleton() {
  return (
    <article className="flex h-full min-h-[168px] flex-col rounded-xl border border-white/8 bg-[#0a1612]/90 p-4">
      <div className="h-3 w-20 animate-pulse rounded bg-white/10" />
      <div className="mt-4 h-8 w-28 animate-pulse rounded bg-white/10" />
      <div className="mt-auto h-3 w-full animate-pulse rounded bg-white/5" />
    </article>
  );
}

function MetricTile({ card }: { card: NepalEconomyCard }) {
  const Icon = cardIcons[card.id];
  const badge = modeBadge(card.dataMode);
  const Direction = card.tone === "up" ? TrendingUp : card.tone === "down" ? TrendingDown : Activity;

  return (
    <article className="group flex h-full min-h-[168px] flex-col rounded-xl border border-white/8 bg-[linear-gradient(180deg,rgba(10,22,18,0.95)_0%,rgba(6,14,11,0.98)_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition hover:border-emerald-400/25 hover:shadow-[0_0_0_1px_rgba(16,185,129,0.15)]">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-emerald-400" aria-hidden />
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-100/45">{card.label}</p>
        </div>
        <span className={`rounded border px-2 py-0.5 text-[9px] font-black tracking-[0.14em] ${badge.className}`}>{badge.label}</span>
      </div>
      <p className="mt-3 font-mono text-2xl font-bold tracking-tight text-white sm:text-[1.65rem]">{card.value}</p>
      <div className="mt-2 flex items-center gap-1.5 text-xs font-bold">
        <Direction className={`h-3.5 w-3.5 ${toneClasses(card.tone)}`} aria-hidden />
        <span className={toneClasses(card.tone)}>{card.change ?? card.detail}</span>
      </div>
      <div className="mt-auto space-y-1 border-t border-white/6 pt-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-emerald-100/35">
        <p>Source: {card.source}</p>
        <p>Updated: {formatDate(card.updatedAt)}</p>
      </div>
    </article>
  );
}

function Panel({
  title,
  subtitle,
  children,
  action,
}: Readonly<{ title: string; subtitle?: string; children: ReactNode; action?: ReactNode }>) {
  return (
    <section className="overflow-hidden rounded-2xl border border-white/8 bg-[#081410]/95 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
      <div className="flex items-center justify-between border-b border-white/6 px-4 py-3 sm:px-5">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300/50">{subtitle}</p>
          <h2 className="mt-1 text-lg font-black tracking-tight text-white">{title}</h2>
        </div>
        {action}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

function MoversTable({ title, items }: { title: string; items: NepalEconomyMover[] }) {
  return (
    <Panel title={title} subtitle="NEPSE">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[260px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/6 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-100/35">
              <th className="pb-2 pr-3">Symbol</th>
              <th className="pb-2 pr-3">Price</th>
              <th className="pb-2 text-right">Change</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.symbol} className="border-b border-white/4 last:border-0">
                <td className="py-2.5 pr-3">
                  <p className="font-black text-white">{item.symbol}</p>
                  <p className="mt-0.5 max-w-[140px] truncate text-xs text-emerald-100/45">{item.name}</p>
                </td>
                <td className="py-2.5 pr-3 font-mono text-xs text-emerald-50/80">{item.price}</td>
                <td className={`py-2.5 text-right font-mono text-xs font-black ${item.tone === "up" ? "text-emerald-300" : "text-red-300"}`}>
                  {item.change}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function NewsFeed({
  items,
  mode,
  activeTag,
  onTagChange,
}: {
  items: NepalEconomyNewsItem[];
  mode: NepalEconomyDashboardData["newsMode"];
  activeTag: string;
  onTagChange: (tag: string) => void;
}) {
  const filtered = activeTag === "All" ? items : items.filter((item) => item.tag === activeTag);
  const badge = mode === "live" ? "LIVE FEED" : mode === "cached" ? "CACHED FEED" : "OFFICIAL FEED";

  return (
    <Panel
      title="Economic News Feed"
      subtitle={badge}
      action={<Newspaper className="h-5 w-5 text-emerald-400" aria-hidden />}
    >
      <div className="mb-4 flex flex-wrap gap-2">
        {["All", ...NEWS_TAGS].map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => onTagChange(tag)}
            className={`cursor-pointer rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] transition ${
              activeTag === tag
                ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-100"
                : "border-white/8 bg-white/4 text-emerald-100/45 hover:border-emerald-400/20"
            }`}
          >
            {tag}
          </button>
        ))}
      </div>
      <div className="grid gap-3">
        {filtered.map((item) => (
          <article key={`${item.href}-${item.title}`} className="rounded-xl border border-white/6 bg-white/[0.03] p-4 transition hover:border-emerald-400/20">
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-300/55">
              <span>{item.tag}</span>
              <span className="text-white/20">·</span>
              <span>{item.source}</span>
              <span className="text-white/20">·</span>
              <span>{formatDate(item.publishedAt)}</span>
            </div>
            <h3 className="mt-2 font-black leading-snug text-white">{item.title}</h3>
            <a
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex cursor-pointer items-center gap-1.5 text-xs font-black uppercase tracking-[0.12em] text-emerald-300 transition hover:text-emerald-200"
            >
              Read More <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </a>
          </article>
        ))}
      </div>
    </Panel>
  );
}

export function NepalEconomyDashboard() {
  const [data, setData] = useState<NepalEconomyDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [newsTag, setNewsTag] = useState("All");

  const refreshData = useCallback(async () => {
    try {
      const response = await fetch("/api/learn/nepal-economy", { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = (await response.json()) as NepalEconomyDashboardData;
      setData(payload);
      writeLocalCache(payload);
      setIsLive(true);
    } catch {
      const local = readLocalCache();
      if (local) setData(local);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const cached = readLocalCache();
    if (cached) setData(cached);
    const initial = window.setTimeout(refreshData, 0);
    const interval = window.setInterval(refreshData, AUTO_REFRESH_MS);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, [refreshData]);

  useEffect(() => {
    if (!isLive) return undefined;
    const timeout = window.setTimeout(() => setIsLive(false), 6000);
    return () => window.clearTimeout(timeout);
  }, [isLive]);

  const cards = data?.cards ?? [];
  const lastUpdated = useMemo(() => formatDateTime(data?.fetchedAt ?? null), [data?.fetchedAt]);

  return (
    <main className="premium-shell min-h-screen bg-[#020907] text-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_50%_0%,rgba(16,185,129,0.14),transparent_60%)]" />

      <div className="relative mx-auto max-w-[1440px] px-4 py-4 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 rounded-2xl border border-white/8 bg-[#071612]/90 px-4 py-3 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
          <BrandMark />
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] ${isLive ? "border-lime-300/30 bg-lime-300/10 text-lime-100" : "border-white/10 bg-white/5 text-emerald-100/60"}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${isLive ? "animate-pulse bg-lime-300" : "bg-emerald-400/50"}`} />
              {isLive ? "LIVE" : isLoading ? "SYNCING" : "READY"}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100/60">
              <Clock3 className="h-3.5 w-3.5" aria-hidden />
              {lastUpdated}
            </span>
            <button
              type="button"
              onClick={refreshData}
              className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100 transition hover:bg-emerald-400/20"
            >
              <RefreshCcw className="h-3.5 w-3.5" aria-hidden />
              Refresh
            </button>
            <Link href="/" className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100/70 transition hover:bg-white/5">
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Home
            </Link>
          </div>
        </header>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-emerald-300/45">Nepal Macro Terminal</p>
            <h1 className="mt-2 text-4xl font-black tracking-[-0.05em] text-white sm:text-5xl lg:text-6xl">Nepal Economy</h1>
            <p className="mt-4 max-w-2xl text-sm font-medium leading-7 text-emerald-100/55 sm:text-base">
              Live inflation, exchange rates, remittance trends, NEPSE market data and economic insights — with official fallback when live feeds pause.
            </p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-[#071612]/90 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300/45">Status</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {[
                ["API", data?.apiStatus ?? "syncing"],
                ["Network", data?.networkStatus ?? "syncing"],
                ["News", data?.newsMode ?? "syncing"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-white/6 bg-white/[0.03] px-3 py-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100/35">{label}</p>
                  <p className="mt-1 font-mono text-sm font-bold uppercase text-white">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {isLoading && cards.length === 0
            ? Array.from({ length: 10 }).map((_, i) => <TerminalSkeleton key={i} />)
            : cards.map((card) => <MetricTile key={card.id} card={card} />)}
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-2">
          <Panel title="GDP Growth Series" subtitle="World Bank">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data?.charts.gdpGrowth ?? []} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gdpFill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#1f3d34" strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fill: "#6ee7b7", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#6ee7b7", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "#071612", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12 }} />
                  <Area type="monotone" dataKey="value" stroke="#10b981" fill="url(#gdpFill)" strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel title="Commercial Bank FD Rates" subtitle="NRB / BFIs">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.charts.fdRates ?? []} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid stroke="#1f3d34" strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fill: "#6ee7b7", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#6ee7b7", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "#071612", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12 }} />
                  <Bar dataKey="value" fill="#059669" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr_1.15fr]">
          <MoversTable title="Top Gainers" items={data?.topGainers ?? []} />
          <MoversTable title="Top Losers" items={data?.topLosers ?? []} />
          <NewsFeed items={data?.news ?? []} mode={data?.newsMode ?? "official"} activeTag={newsTag} onTagChange={setNewsTag} />
        </section>

        <section className="mt-6 rounded-2xl border border-white/8 bg-[#071612]/90 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300/45">FIRE Nepal Intelligence</p>
              <h2 className="mt-1 text-xl font-black text-white">Macro signals for Nepali wealth decisions</h2>
            </div>
            <Link
              href="/global-financial-intelligence"
              className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-emerald-100 transition hover:bg-emerald-400/20"
            >
              Open Global Intelligence <ArrowUpRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
