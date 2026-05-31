"use client";

import { motion } from "framer-motion";
import {
  Activity,
  ArrowLeft,
  ArrowRightLeft,
  Banknote,
  BarChart3,
  Bitcoin,
  Coins,
  Gem,
  Globe2,
  LineChart as LineChartIcon,
  RefreshCw,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  WifiOff,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useGlobalFinancialIntelligence } from "@/hooks/useGlobalFinancialIntelligence";
import type { GlobalForexCode, GlobalForexQuote } from "@/types/global-financial-intelligence";
import type { NepseSecurityTick } from "@/types/market";

type ConverterCode = GlobalForexCode | "NPR";

const converterCodes: ConverterCode[] = ["KRW", "NPR", "USD", "EUR", "GBP", "JPY", "AED", "QAR", "SAR"];

const formatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
const compactFormatter = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 });

function fmt(value: number, digits = 2) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(value);
}

function pct(value?: number) {
  const n = value ?? 0;
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

function rateFor(code: ConverterCode, forex: GlobalForexQuote[]) {
  if (code === "NPR") return 1;
  return forex.find((q) => q.code === code)?.nprRate ?? 1;
}

function TrendBadge({ value }: { value?: number }) {
  const positive = (value ?? 0) >= 0;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black ${
        positive ? "bg-emerald-400/15 text-emerald-200" : "bg-rose-400/15 text-rose-200"
      }`}
    >
      {positive ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
      {pct(value)}
    </span>
  );
}

function MiniSparkline({ values, color = "#34d399", id }: { values: number[]; color?: string; id: string }) {
  const data = values.map((value, index) => ({ index, value }));
  return (
    <div className="h-14 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.45} />
              <stop offset="95%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={`url(#${id})`} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function ShellCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-[1.7rem] border border-white/10 bg-white/[0.065] p-4 shadow-2xl shadow-emerald-950/20 backdrop-blur-xl sm:p-5 ${className}`}>
      {children}
    </section>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="h-36 animate-pulse rounded-[1.5rem] border border-white/10 bg-white/[0.06]" />
      ))}
    </div>
  );
}

function ForexEngine({ forex }: { forex: GlobalForexQuote[] }) {
  const [amount, setAmount] = useState("1000000");
  const [from, setFrom] = useState<ConverterCode>("KRW");
  const [to, setTo] = useState<ConverterCode>("NPR");
  const parsed = Number(amount.replace(/,/g, ""));
  const result = Number.isFinite(parsed) ? (parsed * rateFor(from, forex)) / rateFor(to, forex) : 0;

  return (
    <ShellCard className="xl:col-span-2">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="inline-flex rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-emerald-200">
            Live Forex Engine
          </p>
          <h2 className="mt-3 text-2xl font-black tracking-tight text-white sm:text-3xl">NPR cross rates for workers abroad</h2>
        </div>
        <TrendBadge value={forex[0]?.changePct} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {forex.map((q) => (
          <div key={q.code} className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{q.code}/NPR</p>
                <p className="mt-1 text-xl font-black tabular-nums text-white">{fmt(q.nprRate, q.code === "KRW" || q.code === "JPY" ? 4 : 2)}</p>
              </div>
              <TrendBadge value={q.changePct} />
            </div>
            <MiniSparkline values={q.sparkline} id={`fx-${q.code}`} />
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl bg-white/[0.06] p-2">
                <p className="font-bold text-slate-400">Buy</p>
                <p className="font-black text-emerald-100">{fmt(q.buyRate, 4)}</p>
              </div>
              <div className="rounded-xl bg-white/[0.06] p-2">
                <p className="font-bold text-slate-400">Sell</p>
                <p className="font-black text-rose-100">{fmt(q.sellRate, 4)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-[1.4rem] border border-emerald-300/20 bg-emerald-300/10 p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-black text-emerald-100">
          <ArrowRightLeft size={17} /> Live conversion calculator
        </div>
        <div className="grid gap-3 md:grid-cols-[1fr_0.7fr_0.7fr_1fr] md:items-end">
          <label className="block">
            <span className="text-xs font-bold text-slate-300">Amount</span>
            <input
              value={amount}
              onChange={(event) => setAmount(event.target.value.replace(/[^\d.]/g, ""))}
              className="mt-1 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 font-black text-white outline-none ring-emerald-300/30 focus:ring-4"
            />
          </label>
          {[from, to].map((value, index) => (
            <label key={index} className="block">
              <span className="text-xs font-bold text-slate-300">{index === 0 ? "From" : "To"}</span>
              <select
                value={value}
                onChange={(event) => (index === 0 ? setFrom(event.target.value as ConverterCode) : setTo(event.target.value as ConverterCode))}
                className="mt-1 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 font-black text-white outline-none ring-emerald-300/30 focus:ring-4"
              >
                {converterCodes.map((code) => (
                  <option key={code} value={code}>{code}</option>
                ))}
              </select>
            </label>
          ))}
          <div className="rounded-2xl border border-white/10 bg-white/[0.08] p-4">
            <p className="text-xs font-bold text-slate-300">Converted value</p>
            <p className="mt-1 text-2xl font-black text-white">{to} {formatter.format(result)}</p>
          </div>
        </div>
      </div>
    </ShellCard>
  );
}

function NepseSystem({ snapshot }: { snapshot: NonNullable<ReturnType<typeof useGlobalFinancialIntelligence>["snapshot"]> }) {
  const term = snapshot.market.nepseTerminal;
  const index = snapshot.market.nepseIndex;
  const breadth = term?.breadth;
  const sentiment = breadth ? (breadth.advancing > breadth.declining ? "Risk-on" : breadth.declining > breadth.advancing ? "Defensive" : "Neutral") : "Waiting for feed";
  const sectors = term?.sectorPerformance.slice(0, 7) ?? [];

  const renderRows = (rows: NepseSecurityTick[], tone: "up" | "down" | "volume") => (
    <div className="space-y-2">
      {rows.slice(0, 5).map((row) => (
        <div key={row.symbol} className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.055] px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-white">{row.symbol}</p>
            <p className="truncate text-xs text-slate-400">{row.companyName ?? row.sector ?? "NEPSE"}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-black tabular-nums text-white">{fmt(row.ltpNpr)}</p>
            <p className={`text-xs font-black ${tone === "down" ? "text-rose-200" : tone === "volume" ? "text-cyan-200" : "text-emerald-200"}`}>
              {tone === "volume" ? compactFormatter.format(row.volume ?? 0) : pct(row.changePct)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <ShellCard>
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="inline-flex rounded-full bg-lime-400/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-lime-200">NEPSE Live</p>
          <h2 className="mt-3 text-2xl font-black text-white">Nepal market terminal</h2>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold uppercase text-slate-400">Sentiment</p>
          <p className="text-lg font-black text-emerald-100">{sentiment}</p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
          <p className="text-xs font-bold text-slate-400">NEPSE Index</p>
          <p className="mt-1 text-2xl font-black text-white">{index ? fmt(index.value) : "Feed pending"}</p>
          <TrendBadge value={index?.changePct} />
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
          <p className="text-xs font-bold text-slate-400">Turnover</p>
          <p className="mt-1 text-2xl font-black text-white">{compactFormatter.format(term?.totalTurnoverNpr ?? 0)}</p>
          <p className="text-xs font-bold text-slate-400">NPR session value</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
          <p className="text-xs font-bold text-slate-400">Breadth</p>
          <p className="mt-1 text-2xl font-black text-white">{breadth ? `${breadth.advancing}/${breadth.declining}` : "--"}</p>
          <p className="text-xs font-bold text-slate-400">Advancers / decliners</p>
        </div>
      </div>
      {term ? (
        <>
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            <div><p className="mb-2 text-xs font-black uppercase text-emerald-200">Top gainers</p>{renderRows(term.topGainers, "up")}</div>
            <div><p className="mb-2 text-xs font-black uppercase text-rose-200">Top losers</p>{renderRows(term.topLosers, "down")}</div>
            <div><p className="mb-2 text-xs font-black uppercase text-cyan-200">Volume leaders</p>{renderRows(term.mostActive, "volume")}</div>
          </div>
          <div className="mt-5 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sectors}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis dataKey="sector" tick={{ fill: "#94a3b8", fontSize: 10 }} interval={0} angle={-18} height={60} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "#022c22", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 16, color: "white" }} />
                <Bar dataKey="avgChangePct" fill="#34d399" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      ) : (
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.05] p-4 text-sm font-bold text-slate-300">
          NEPSE feed is temporarily unavailable. The dashboard will retry automatically.
        </div>
      )}
    </ShellCard>
  );
}

function KoreaDashboard({ snapshot }: { snapshot: NonNullable<ReturnType<typeof useGlobalFinancialIntelligence>["snapshot"]> }) {
  const kospi = snapshot.market.usdEquities["^KS11"];
  const kosdaq = snapshot.market.usdEquities["^KQ11"];
  const indexQuotes = [
    { label: "KOSPI", quote: kospi },
    { label: "KOSDAQ", quote: kosdaq },
  ];
  return (
    <ShellCard>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="inline-flex rounded-full bg-sky-400/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-sky-200">Korea Worker Investing</p>
          <h2 className="mt-3 text-2xl font-black text-white">KOSPI, KOSDAQ and Korean blue chips</h2>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {indexQuotes.map(({ label, quote }) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3 text-right">
              <p className="text-xs font-bold text-slate-400">{label}</p>
              <p className="text-lg font-black text-white">{quote ? fmt(quote.lastUsd) : "--"}</p>
              <p className={(quote?.changePct ?? 0) >= 0 ? "text-xs font-black text-emerald-200" : "text-xs font-black text-rose-200"}>{pct(quote?.changePct)}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {snapshot.koreaEquities.map((q) => (
          <div key={q.symbol} className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black text-white">{q.name}</p>
                <p className="text-xs font-bold text-slate-400">{q.symbol}</p>
              </div>
              <TrendBadge value={q.changePct} />
            </div>
            <p className="mt-3 text-2xl font-black tabular-nums text-white">KRW {formatter.format(q.lastKrw)}</p>
            <MiniSparkline values={q.sparkline} id={`kr-${q.symbol.replace(".", "-")}`} color={(q.changePct ?? 0) >= 0 ? "#34d399" : "#fb7185"} />
            <div className="mt-3 grid grid-cols-4 gap-2 text-center text-[11px]">
              <div className="rounded-xl bg-white/[0.055] p-2"><p className="text-slate-400">PE</p><p className="font-black text-white">{q.peRatio.toFixed(1)}</p></div>
              <div className="rounded-xl bg-white/[0.055] p-2"><p className="text-slate-400">EPS</p><p className="font-black text-white">{compactFormatter.format(q.epsKrw)}</p></div>
              <div className="rounded-xl bg-white/[0.055] p-2"><p className="text-slate-400">Cap</p><p className="font-black text-white">{q.marketCapKrwT}T</p></div>
              <div className="rounded-xl bg-white/[0.055] p-2"><p className="text-slate-400">Yield</p><p className="font-black text-white">{q.dividendYieldPct}%</p></div>
            </div>
          </div>
        ))}
      </div>
    </ShellCard>
  );
}

function AssetsMacroFire({ snapshot }: { snapshot: NonNullable<ReturnType<typeof useGlobalFinancialIntelligence>["snapshot"]> }) {
  const usdNpr = snapshot.forex.find((q) => q.code === "USD")?.nprRate ?? snapshot.market.forex.nprPerUsd;
  const krwNpr = snapshot.forex.find((q) => q.code === "KRW")?.nprRate ?? 0.108;
  const goldGram = (snapshot.market.metalsUsdOz.goldUsdPerOz * usdNpr) / 31.1034768;
  const silverGram = (snapshot.market.metalsUsdOz.silverUsdPerOz * usdNpr) / 31.1034768;
  const monthlyKrw = 1_800_000;
  const monthlyNpr = monthlyKrw * krwNpr;
  const fireTargetToday = 24_000_000;
  const nepalInflation = snapshot.macro.find((m) => m.region === "Nepal")?.inflationPct ?? 5.4;
  const targetIn10Years = fireTargetToday * (1 + nepalInflation / 100) ** 10;
  const swrImpact = 4 - nepalInflation * 0.18;

  const cryptoRows = [
    ["Bitcoin", "bitcoin"],
    ["Ethereum", "ethereum"],
    ["Solana", "solana"],
    ["XRP", "ripple"],
  ] as const;

  return (
    <div className="grid gap-5 xl:grid-cols-3">
      <ShellCard>
        <p className="inline-flex rounded-full bg-amber-400/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-amber-200">Gold & Silver</p>
        <h2 className="mt-3 text-2xl font-black text-white">Precious metals hedge</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
            <Gem className="mb-3 text-amber-200" />
            <p className="text-sm font-bold text-slate-400">Gold per gram</p>
            <p className="text-2xl font-black text-white">NPR {formatter.format(goldGram)}</p>
            <p className="text-xs font-bold text-slate-400">USD/oz {formatter.format(snapshot.market.metalsUsdOz.goldUsdPerOz)}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
            <Coins className="mb-3 text-slate-200" />
            <p className="text-sm font-bold text-slate-400">Silver per gram</p>
            <p className="text-2xl font-black text-white">NPR {formatter.format(silverGram)}</p>
            <p className="text-xs font-bold text-slate-400">USD/oz {formatter.format(snapshot.market.metalsUsdOz.silverUsdPerOz)}</p>
          </div>
        </div>
        <div className="mt-4 rounded-2xl bg-white/[0.055] p-4">
          <p className="text-xs font-bold text-slate-400">Jewelry estimate, 2 tola gold</p>
          <p className="mt-1 text-xl font-black text-white">NPR {formatter.format(goldGram * 23.328)}</p>
          <p className="mt-1 text-xs font-semibold text-slate-400">Before making charge and purity adjustment.</p>
        </div>
      </ShellCard>

      <ShellCard>
        <p className="inline-flex rounded-full bg-orange-400/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-orange-200">Crypto Monitor</p>
        <h2 className="mt-3 text-2xl font-black text-white">Global risk assets</h2>
        <div className="mt-4 space-y-2">
          {cryptoRows.map(([label, id]) => {
            const price = snapshot.market.crypto[id]?.lastUsd;
            return (
              <div key={id} className="flex items-center justify-between rounded-xl bg-slate-950/35 px-3 py-2">
                <div className="flex items-center gap-2">
                  <Bitcoin size={16} className="text-orange-200" />
                  <p className="font-black text-white">{label}</p>
                </div>
                <p className="font-black text-white">{price ? `USD ${formatter.format(price)}` : "Feed pending"}</p>
              </div>
            );
          })}
        </div>
        <div className="mt-4 rounded-2xl bg-white/[0.055] p-4">
          <p className="text-xs font-bold uppercase text-slate-400">Fear & greed</p>
          <p className="mt-1 text-3xl font-black text-white">{snapshot.fearGreed.score}</p>
          <p className="text-sm font-bold text-orange-100">{snapshot.fearGreed.label}</p>
        </div>
      </ShellCard>

      <ShellCard>
        <p className="inline-flex rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-emerald-200">FIRE Impact</p>
        <h2 className="mt-3 text-2xl font-black text-white">Inflation-adjusted Nepal plan</h2>
        <div className="mt-4 space-y-3">
          {[
            ["Monthly Korea savings", `KRW ${formatter.format(monthlyKrw)} -> NPR ${formatter.format(monthlyNpr)}`],
            ["10-year FIRE target", `NPR ${compactFormatter.format(targetIn10Years)}`],
            ["Inflation-adjusted SWR", `${Math.max(2.2, swrImpact).toFixed(2)}%`],
            ["Currency risk signal", krwNpr >= 0.108 ? "Favorable for remittance" : "Delay large transfer if flexible"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-slate-950/35 p-3">
              <p className="text-xs font-bold text-slate-400">{label}</p>
              <p className="mt-1 font-black text-white">{value}</p>
            </div>
          ))}
        </div>
      </ShellCard>

      <ShellCard className="xl:col-span-3">
        <div className="mb-4 flex items-center gap-2">
          <Banknote className="text-emerald-200" />
          <h2 className="text-2xl font-black text-white">Inflation and central bank intelligence</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {snapshot.macro.map((m) => (
            <div key={m.region} className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
              <p className="text-lg font-black text-white">{m.region}</p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-xl bg-white/[0.055] p-2"><p className="text-slate-400">Inflation</p><p className="font-black text-white">{m.inflationPct}%</p></div>
                <div className="rounded-xl bg-white/[0.055] p-2"><p className="text-slate-400">Policy</p><p className="font-black text-white">{m.policyRatePct}%</p></div>
                <div className="rounded-xl bg-white/[0.055] p-2"><p className="text-slate-400">COL</p><p className="font-black text-white">{m.costPressurePct}%</p></div>
              </div>
              <p className="mt-3 text-xs font-semibold text-slate-400">{m.source}</p>
            </div>
          ))}
        </div>
      </ShellCard>
    </div>
  );
}

export function GlobalFinancialIntelligenceDashboard() {
  const { snapshot, isLoading, isRefreshing, error, refresh, refreshMs } = useGlobalFinancialIntelligence();

  const lastUpdated = useMemo(() => {
    if (!snapshot) return "Waiting for first live tick";
    return new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(snapshot.fetchedAt));
  }, [snapshot]);

  const heroStats: Array<{ label: string; value: string | number; Icon: LucideIcon }> = [
    { label: "Live sources", value: snapshot ? Object.values(snapshot.sourceStatus).filter((s) => s === "ok").length : "--", Icon: Globe2 },
    { label: "NEPSE names", value: snapshot?.market.nepseTerminal?.totalsListed ?? "--", Icon: BarChart3 },
    { label: "Korea blue chips", value: snapshot?.koreaEquities.length ?? "--", Icon: LineChartIcon },
    { label: "Macro cards", value: snapshot?.macro.length ?? "--", Icon: Banknote },
  ];

  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,#064e3b_0,#020617_34%,#020617_100%)] text-white">
      <div className="pointer-events-none fixed inset-0 opacity-60 [background-image:linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px)] [background-size:44px_44px]" />
      <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-black text-emerald-100 backdrop-blur transition hover:bg-white/[0.1]">
            <ArrowLeft size={16} /> Back to FIRE Nepal
          </Link>
          <button
            type="button"
            onClick={() => void refresh()}
            className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-4 py-2 text-sm font-black text-emerald-100 transition hover:bg-emerald-300/15"
          >
            <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} /> Refresh every {Math.round(refreshMs / 1000)}s
          </button>
        </div>

        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative mb-6 overflow-hidden rounded-[2.2rem] border border-white/10 bg-white/[0.07] p-5 shadow-2xl shadow-emerald-950/30 backdrop-blur-2xl sm:p-7 lg:p-8"
        >
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-emerald-300/20 blur-3xl" />
          <div className="absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-lime-300/10 blur-3xl" />
          <div className="relative grid gap-7 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-emerald-100">
                <Zap size={14} /> Global Financial Intelligence Layer
              </p>
              <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-[-0.05em] sm:text-5xl lg:text-6xl">
                Live market operating system for Nepalis abroad.
              </h1>
              <p className="mt-4 max-w-2xl text-base font-semibold leading-relaxed text-slate-300 sm:text-lg">
                Forex, NEPSE, Korea stocks, metals, crypto, inflation, and FIRE impact analytics in one auto-refreshing command center.
              </p>
              <div className="mt-6 flex flex-wrap gap-3 text-sm font-black">
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-400/10 px-3 py-2 text-emerald-100"><Activity size={15} /> Last updated {lastUpdated}</span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/[0.07] px-3 py-2 text-slate-200"><ShieldCheck size={15} /> Rate-limit protected</span>
                {error ? <span className="inline-flex items-center gap-2 rounded-full bg-rose-400/10 px-3 py-2 text-rose-100"><WifiOff size={15} /> {error}</span> : null}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {heroStats.map(({ label, value, Icon }) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
                  <Icon className="mb-3 text-emerald-200" size={22} />
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p>
                  <p className="mt-1 text-3xl font-black text-white">{String(value)}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        {isLoading && !snapshot ? (
          <SkeletonGrid />
        ) : snapshot ? (
          <div className="space-y-5">
            <ForexEngine forex={snapshot.forex} />
            <div className="grid gap-5 xl:grid-cols-2">
              <NepseSystem snapshot={snapshot} />
              <KoreaDashboard snapshot={snapshot} />
            </div>
            <AssetsMacroFire snapshot={snapshot} />
          </div>
        ) : (
          <ShellCard>
            <WifiOff className="mb-3 text-rose-200" />
            <h2 className="text-2xl font-black text-white">Live intelligence is unavailable</h2>
            <p className="mt-2 text-sm font-semibold text-slate-300">The system will retry automatically. Check API connectivity if this persists.</p>
          </ShellCard>
        )}
      </div>
    </main>
  );
}
