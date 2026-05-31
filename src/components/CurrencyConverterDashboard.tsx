"use client";

import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRightLeft,
  Banknote,
  BarChart3,
  CircleDollarSign,
  Clock3,
  Globe2,
  Heart,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingDown,
  TrendingUp,
  WifiOff,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const API_URL = "https://open.er-api.com/v6/latest/USD";
const CACHE_KEY = "fire-nepal-global-exchange-rates-v2";
const REFRESH_MS = 60_000;
const BANK_SPREAD = 0.006;

const currencies = [
  "USD",
  "KRW",
  "NPR",
  "JPY",
  "EUR",
  "GBP",
  "AUD",
  "CAD",
  "SGD",
  "INR",
  "CNY",
  "SAR",
  "QAR",
  "AED",
  "THB",
  "MYR",
  "HKD",
  "CHF",
  "SEK",
  "NOK",
  "DKK",
  "KWD",
  "BHD",
  "OMR",
  "NZD",
  "PHP",
  "IDR",
  "VND",
  "TWD",
  "ZAR",
  "TRY",
  "BRL",
  "MXN",
  "PLN",
  "CZK",
  "HUF",
] as const;

type CurrencyCode = (typeof currencies)[number];
type RateMap = Record<CurrencyCode, number>;
type SnapshotSource = "live" | "cached" | "fallback";
type Trend = "up" | "down" | "flat";
type SortMode = "favorite" | "rateHigh" | "rateLow" | "trend";

type CurrencyMeta = {
  name: string;
  country: string;
  flag: string;
  symbol: string;
  locale: string;
  decimals: number;
};

type RateSnapshot = {
  rates: RateMap;
  updatedAt: string;
  source: SnapshotSource;
};

type CachedRates = {
  snapshot: RateSnapshot;
  previousRates: RateMap | null;
};

type ForexRow = {
  code: CurrencyCode;
  meta: CurrencyMeta;
  midRate: number;
  buyRate: number;
  sellRate: number;
  trend: Trend;
  trendPct: number;
  isFavorite: boolean;
};

const currencyMeta: Record<CurrencyCode, CurrencyMeta> = {
  USD: { name: "US Dollar", country: "United States", flag: "🇺🇸", symbol: "$", locale: "en-US", decimals: 2 },
  KRW: { name: "South Korean Won", country: "South Korea", flag: "🇰🇷", symbol: "₩", locale: "ko-KR", decimals: 0 },
  NPR: { name: "Nepalese Rupee", country: "Nepal", flag: "🇳🇵", symbol: "रु", locale: "en-NP", decimals: 2 },
  JPY: { name: "Japanese Yen", country: "Japan", flag: "🇯🇵", symbol: "¥", locale: "ja-JP", decimals: 0 },
  EUR: { name: "Euro", country: "Euro Area", flag: "🇪🇺", symbol: "€", locale: "de-DE", decimals: 2 },
  GBP: { name: "British Pound", country: "United Kingdom", flag: "🇬🇧", symbol: "£", locale: "en-GB", decimals: 2 },
  AUD: { name: "Australian Dollar", country: "Australia", flag: "🇦🇺", symbol: "A$", locale: "en-AU", decimals: 2 },
  CAD: { name: "Canadian Dollar", country: "Canada", flag: "🇨🇦", symbol: "C$", locale: "en-CA", decimals: 2 },
  SGD: { name: "Singapore Dollar", country: "Singapore", flag: "🇸🇬", symbol: "S$", locale: "en-SG", decimals: 2 },
  INR: { name: "Indian Rupee", country: "India", flag: "🇮🇳", symbol: "₹", locale: "en-IN", decimals: 2 },
  CNY: { name: "Chinese Yuan", country: "China", flag: "🇨🇳", symbol: "¥", locale: "zh-CN", decimals: 2 },
  SAR: { name: "Saudi Riyal", country: "Saudi Arabia", flag: "🇸🇦", symbol: "﷼", locale: "en-SA", decimals: 2 },
  QAR: { name: "Qatari Riyal", country: "Qatar", flag: "🇶🇦", symbol: "ر.ق", locale: "en-QA", decimals: 2 },
  AED: { name: "UAE Dirham", country: "United Arab Emirates", flag: "🇦🇪", symbol: "د.إ", locale: "en-AE", decimals: 2 },
  THB: { name: "Thai Baht", country: "Thailand", flag: "🇹🇭", symbol: "฿", locale: "th-TH", decimals: 2 },
  MYR: { name: "Malaysian Ringgit", country: "Malaysia", flag: "🇲🇾", symbol: "RM", locale: "ms-MY", decimals: 2 },
  HKD: { name: "Hong Kong Dollar", country: "Hong Kong", flag: "🇭🇰", symbol: "HK$", locale: "zh-HK", decimals: 2 },
  CHF: { name: "Swiss Franc", country: "Switzerland", flag: "🇨🇭", symbol: "CHF", locale: "de-CH", decimals: 2 },
  SEK: { name: "Swedish Krona", country: "Sweden", flag: "🇸🇪", symbol: "kr", locale: "sv-SE", decimals: 2 },
  NOK: { name: "Norwegian Krone", country: "Norway", flag: "🇳🇴", symbol: "kr", locale: "nb-NO", decimals: 2 },
  DKK: { name: "Danish Krone", country: "Denmark", flag: "🇩🇰", symbol: "kr", locale: "da-DK", decimals: 2 },
  KWD: { name: "Kuwaiti Dinar", country: "Kuwait", flag: "🇰🇼", symbol: "KD", locale: "en-KW", decimals: 3 },
  BHD: { name: "Bahraini Dinar", country: "Bahrain", flag: "🇧🇭", symbol: "BD", locale: "en-BH", decimals: 3 },
  OMR: { name: "Omani Rial", country: "Oman", flag: "🇴🇲", symbol: "OMR", locale: "en-OM", decimals: 3 },
  NZD: { name: "New Zealand Dollar", country: "New Zealand", flag: "🇳🇿", symbol: "NZ$", locale: "en-NZ", decimals: 2 },
  PHP: { name: "Philippine Peso", country: "Philippines", flag: "🇵🇭", symbol: "₱", locale: "en-PH", decimals: 2 },
  IDR: { name: "Indonesian Rupiah", country: "Indonesia", flag: "🇮🇩", symbol: "Rp", locale: "id-ID", decimals: 2 },
  VND: { name: "Vietnamese Dong", country: "Vietnam", flag: "🇻🇳", symbol: "₫", locale: "vi-VN", decimals: 0 },
  TWD: { name: "Taiwan Dollar", country: "Taiwan", flag: "🇹🇼", symbol: "NT$", locale: "zh-TW", decimals: 2 },
  ZAR: { name: "South African Rand", country: "South Africa", flag: "🇿🇦", symbol: "R", locale: "en-ZA", decimals: 2 },
  TRY: { name: "Turkish Lira", country: "Turkey", flag: "🇹🇷", symbol: "₺", locale: "tr-TR", decimals: 2 },
  BRL: { name: "Brazilian Real", country: "Brazil", flag: "🇧🇷", symbol: "R$", locale: "pt-BR", decimals: 2 },
  MXN: { name: "Mexican Peso", country: "Mexico", flag: "🇲🇽", symbol: "$", locale: "es-MX", decimals: 2 },
  PLN: { name: "Polish Zloty", country: "Poland", flag: "🇵🇱", symbol: "zł", locale: "pl-PL", decimals: 2 },
  CZK: { name: "Czech Koruna", country: "Czechia", flag: "🇨🇿", symbol: "Kč", locale: "cs-CZ", decimals: 2 },
  HUF: { name: "Hungarian Forint", country: "Hungary", flag: "🇭🇺", symbol: "Ft", locale: "hu-HU", decimals: 0 },
};

const fallbackRates: RateMap = {
  USD: 1,
  KRW: 1365,
  NPR: 133.5,
  JPY: 156,
  EUR: 0.92,
  GBP: 0.79,
  AUD: 1.51,
  CAD: 1.36,
  SGD: 1.35,
  INR: 83.4,
  CNY: 7.24,
  SAR: 3.75,
  QAR: 3.64,
  AED: 3.67,
  THB: 36.7,
  MYR: 4.71,
  HKD: 7.82,
  CHF: 0.9,
  SEK: 10.55,
  NOK: 10.72,
  DKK: 6.86,
  KWD: 0.31,
  BHD: 0.38,
  OMR: 0.38,
  NZD: 1.64,
  PHP: 58.6,
  IDR: 16200,
  VND: 25400,
  TWD: 32.3,
  ZAR: 18.2,
  TRY: 32.2,
  BRL: 5.18,
  MXN: 16.9,
  PLN: 3.93,
  CZK: 22.8,
  HUF: 360,
};

const initialFavorites: CurrencyCode[] = ["KRW", "USD", "NPR", "JPY", "EUR", "GBP", "AUD", "CAD", "SGD", "INR", "CNY"];
const koreaAmounts = [100_000, 500_000, 1_000_000, 5_000_000] as const;
const quickPairs: Array<{ label: string; amount: number; from: CurrencyCode; to: CurrencyCode }> = [
  { label: "KRW → NPR", amount: 1_000_000, from: "KRW", to: "NPR" },
  { label: "USD → NPR", amount: 1_000, from: "USD", to: "NPR" },
  { label: "NPR → KRW", amount: 100_000, from: "NPR", to: "KRW" },
];

function isCurrencyCode(value: string): value is CurrencyCode {
  return (currencies as readonly string[]).includes(value);
}

function sanitizeAmountInput(value: string) {
  const cleaned = value.replace(/,/g, "").replace(/[^\d.]/g, "");
  const firstDot = cleaned.indexOf(".");
  if (firstDot === -1) return cleaned;
  return `${cleaned.slice(0, firstDot + 1)}${cleaned.slice(firstDot + 1).replace(/\./g, "")}`;
}

function parseAmount(value: string) {
  const parsed = Number(value.replace(/,/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function convert(amount: number, from: CurrencyCode, to: CurrencyCode, rates: RateMap) {
  if (from === to) return amount;
  return (amount / rates[from]) * rates[to];
}

function nprRate(code: CurrencyCode, rates: RateMap) {
  return convert(1, code, "NPR", rates);
}

function trendFor(code: CurrencyCode, rates: RateMap, previousRates: RateMap | null): { trend: Trend; pct: number } {
  if (!previousRates) return { trend: "flat", pct: 0 };
  const current = nprRate(code, rates);
  const previous = nprRate(code, previousRates);
  if (!Number.isFinite(previous) || previous <= 0) return { trend: "flat", pct: 0 };
  const pct = ((current - previous) / previous) * 100;
  if (Math.abs(pct) < 0.01) return { trend: "flat", pct: 0 };
  return { trend: pct > 0 ? "up" : "down", pct };
}

function formatCurrency(value: number, code: CurrencyCode, compact = false) {
  const meta = currencyMeta[code];
  return `${meta.symbol}${new Intl.NumberFormat(meta.locale, {
    maximumFractionDigits: compact ? Math.min(meta.decimals, 1) : meta.decimals,
    minimumFractionDigits: compact ? 0 : Math.min(meta.decimals, 2),
    notation: compact ? "compact" : "standard",
  }).format(value)}`;
}

function formatRate(value: number) {
  if (value >= 100) return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (value >= 1) return value.toLocaleString("en-US", { maximumFractionDigits: 4 });
  return value.toLocaleString("en-US", { maximumFractionDigits: 6 });
}

function readCachedRates(): CachedRates | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedRates;
    if (!parsed.snapshot?.rates || !parsed.snapshot.updatedAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCachedRates(snapshot: RateSnapshot, previousRates: RateMap | null) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CACHE_KEY, JSON.stringify({ snapshot, previousRates }));
}

function normalizeRates(data: { rates?: Record<string, number> }): RateMap | null {
  if (!data.rates) return null;
  const entries = currencies.map((code) => [code, data.rates?.[code]] as const);
  if (entries.some(([, rate]) => typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0)) return null;
  return Object.fromEntries(entries) as RateMap;
}

function sourceLabel(source: SnapshotSource) {
  if (source === "live") return "Live API";
  if (source === "cached") return "Cached backup";
  return "Offline fallback";
}

function LoadingSkeleton() {
  return (
    <main className="premium-shell min-h-screen overflow-hidden px-4 py-6 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-7xl">
        <div className="mb-5 h-10 w-40 animate-pulse rounded-full bg-emerald-100/80" />
        <div className="dark-glass-card rounded-[2rem] p-5 sm:p-7 lg:p-8">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-5">
              <div className="h-8 w-56 animate-pulse rounded-full bg-white/15" />
              <div className="h-24 max-w-xl animate-pulse rounded-3xl bg-white/15" />
              <div className="grid gap-3 sm:grid-cols-3">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="h-20 animate-pulse rounded-2xl bg-white/10" />
                ))}
              </div>
            </div>
            <div className="space-y-4 rounded-[1.75rem] border border-white/15 bg-white/10 p-5">
              <div className="h-28 animate-pulse rounded-3xl bg-white/20" />
              <div className="h-12 animate-pulse rounded-2xl bg-white/15" />
              <div className="h-28 animate-pulse rounded-3xl bg-white/20" />
            </div>
          </div>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="h-32 animate-pulse rounded-3xl border border-white/70 bg-white/70" />
          ))}
        </div>
        <div className="mt-6 h-96 animate-pulse rounded-[2rem] border border-white/70 bg-white/70" />
      </section>
    </main>
  );
}

function StatusPill({ snapshot, isOnline }: Readonly<{ snapshot: RateSnapshot | null; isOnline: boolean }>) {
  const isLive = snapshot?.source === "live" && isOnline;
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.16em] ${
        isLive
          ? "border border-emerald-300/40 bg-emerald-400/15 text-emerald-100"
          : "border border-amber-200/40 bg-amber-300/15 text-amber-100"
      }`}
    >
      <span className={`h-2.5 w-2.5 rounded-full ${isLive ? "animate-pulse bg-emerald-300" : "bg-amber-300"}`} />
      {isLive ? "Live market" : "Offline mode"}
    </span>
  );
}

function AnalyticsCard({
  icon,
  label,
  value,
  helper,
}: Readonly<{ icon: ReactNode; label: string; value: string; helper: string }>) {
  return (
    <motion.article
      whileHover={{ y: -4 }}
      className="glass-card soft-gradient-border rounded-3xl p-4 shadow-sm sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-black tracking-tight text-emerald-950">{value}</p>
        </div>
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">{icon}</div>
      </div>
      <p className="mt-3 text-sm font-bold leading-relaxed text-slate-500">{helper}</p>
    </motion.article>
  );
}

export function CurrencyConverterDashboard() {
  const [amountRaw, setAmountRaw] = useState("1000000");
  const [fromCurrency, setFromCurrency] = useState<CurrencyCode>("KRW");
  const [toCurrency, setToCurrency] = useState<CurrencyCode>("NPR");
  const [snapshot, setSnapshot] = useState<RateSnapshot | null>(null);
  const [previousRates, setPreviousRates] = useState<RateMap | null>(null);
  const [favoriteCodes, setFavoriteCodes] = useState<CurrencyCode[]>(initialFavorites);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("favorite");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  const currentSnapshotRef = useRef<RateSnapshot | null>(null);

  const amount = useMemo(() => parseAmount(amountRaw), [amountRaw]);

  const convertedAmount = useMemo(() => {
    if (!snapshot) return 0;
    return convert(amount, fromCurrency, toCurrency, snapshot.rates);
  }, [amount, fromCurrency, snapshot, toCurrency]);

  const currentRate = useMemo(() => {
    if (!snapshot) return 0;
    return convert(1, fromCurrency, toCurrency, snapshot.rates);
  }, [fromCurrency, snapshot, toCurrency]);

  const rows = useMemo<ForexRow[]>(() => {
    if (!snapshot) return [];
    return currencies.map((code) => {
      const midRate = nprRate(code, snapshot.rates);
      const movement = trendFor(code, snapshot.rates, previousRates);
      return {
        code,
        meta: currencyMeta[code],
        midRate,
        buyRate: code === "NPR" ? 1 : midRate * (1 - BANK_SPREAD),
        sellRate: code === "NPR" ? 1 : midRate * (1 + BANK_SPREAD),
        trend: movement.trend,
        trendPct: movement.pct,
        isFavorite: favoriteCodes.includes(code),
      };
    });
  }, [favoriteCodes, previousRates, snapshot]);

  const filteredRows = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const matches = rows.filter((row) => {
      if (!query) return true;
      return `${row.code} ${row.meta.name} ${row.meta.country}`.toLowerCase().includes(query);
    });

    return [...matches].sort((a, b) => {
      if (sortMode === "favorite") return Number(b.isFavorite) - Number(a.isFavorite) || b.midRate - a.midRate;
      if (sortMode === "rateHigh") return b.midRate - a.midRate;
      if (sortMode === "rateLow") return a.midRate - b.midRate;
      return Math.abs(b.trendPct) - Math.abs(a.trendPct);
    });
  }, [rows, searchTerm, sortMode]);

  const analytics = useMemo(() => {
    const nonNprRows = rows.filter((row) => row.code !== "NPR");
    const strongest = nonNprRows.reduce<ForexRow | null>((best, row) => (!best || row.midRate > best.midRate ? row : best), null);
    const weakest = nonNprRows.reduce<ForexRow | null>((best, row) => (!best || row.midRate < best.midRate ? row : best), null);
    const krw = rows.find((row) => row.code === "KRW");
    const usd = rows.find((row) => row.code === "USD");
    return { strongest, weakest, krw, usd };
  }, [rows]);

  const updatedLabel = snapshot
    ? new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "medium",
      }).format(new Date(snapshot.updatedAt))
    : "Waiting for live rates";

  const fetchRates = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const response = await fetch(API_URL, { cache: "no-store" });
      if (!response.ok) throw new Error("Exchange rate API failed");
      const data = (await response.json()) as { rates?: Record<string, number>; time_last_update_utc?: string };
      const rates = normalizeRates(data);
      if (!rates) throw new Error("Exchange rate response was incomplete");

      const nextSnapshot: RateSnapshot = {
        rates,
        updatedAt: data.time_last_update_utc ? new Date(data.time_last_update_utc).toISOString() : new Date().toISOString(),
        source: "live",
      };
      const previous = currentSnapshotRef.current?.rates ?? null;
      currentSnapshotRef.current = nextSnapshot;
      setPreviousRates(previous);
      setSnapshot(nextSnapshot);
      writeCachedRates(nextSnapshot, previous);
      setError(null);
    } catch {
      const cached = readCachedRates();
      if (cached) {
        const cachedSnapshot: RateSnapshot = { ...cached.snapshot, source: "cached" };
        currentSnapshotRef.current = cachedSnapshot;
        setSnapshot(cachedSnapshot);
        setPreviousRates(cached.previousRates);
        setError("Live rates are temporarily unavailable. Showing your last successful exchange board.");
      } else {
        const fallbackSnapshot: RateSnapshot = {
          rates: fallbackRates,
          updatedAt: new Date().toISOString(),
          source: "fallback",
        };
        currentSnapshotRef.current = fallbackSnapshot;
        setSnapshot(fallbackSnapshot);
        setPreviousRates(null);
        setError("Live rates are temporarily unavailable. Showing an offline planning board until the API reconnects.");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const cached = readCachedRates();
    if (cached) {
      const cachedSnapshot: RateSnapshot = { ...cached.snapshot, source: "cached" };
      currentSnapshotRef.current = cachedSnapshot;
      window.queueMicrotask(() => {
        setSnapshot(cachedSnapshot);
        setPreviousRates(cached.previousRates);
        setLoading(false);
      });
    }

    window.queueMicrotask(() => {
      void fetchRates(Boolean(cached));
    });

    const interval = window.setInterval(() => {
      void fetchRates(true);
    }, REFRESH_MS);
    const onOnline = () => {
      setIsOnline(true);
      void fetchRates(false);
    };
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [fetchRates]);

  function swapCurrencies() {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  }

  function applyPair(amountValue: number, from: CurrencyCode, to: CurrencyCode) {
    setAmountRaw(String(amountValue));
    setFromCurrency(from);
    setToCurrency(to);
  }

  function toggleFavorite(code: CurrencyCode) {
    setFavoriteCodes((current) =>
      current.includes(code) ? current.filter((item) => item !== code) : [code, ...current].slice(0, 18),
    );
  }

  if (loading && !snapshot) return <LoadingSkeleton />;

  return (
    <main className="premium-shell min-h-screen overflow-hidden px-4 pb-28 pt-6 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-7xl">
        <div className="mb-5">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white/75 px-4 py-2 text-sm font-black text-emerald-800 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-50"
          >
            <ArrowLeft size={16} />
            Back to Homepage
          </Link>
        </div>

        <div className="dark-glass-card relative overflow-hidden rounded-[2rem] p-5 text-white sm:p-7 lg:p-8">
          <div className="absolute -left-24 top-6 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl" />
          <div className="absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-yellow-300/10 blur-3xl" />
          <div className="relative grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill snapshot={snapshot} isOnline={isOnline} />
                <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-emerald-100">
                  <Globe2 size={14} />
                  Global bank board
                </span>
              </div>
              <h1 className="mt-4 max-w-3xl text-4xl font-black leading-[0.95] tracking-[-0.05em] sm:text-5xl lg:text-6xl">
                Real-time global forex dashboard for Nepal
              </h1>
              <p className="mt-5 max-w-2xl text-base font-medium leading-relaxed text-emerald-50/85 sm:text-lg">
                Professional buy and sell rates against NPR for Korea workers, remittance planning, and FIRE decisions.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {quickPairs.map((pair) => (
                  <button
                    key={pair.label}
                    type="button"
                    onClick={() => applyPair(pair.amount, pair.from, pair.to)}
                    className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-left shadow-sm backdrop-blur transition hover:-translate-y-1 hover:bg-white/15"
                  >
                    <span className="block text-sm font-black">{pair.label}</span>
                    <span className="block text-xs font-bold text-emerald-100/75">
                      {snapshot ? formatCurrency(convert(pair.amount, pair.from, pair.to, snapshot.rates), pair.to, true) : "Loading"}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-white/15 bg-white/10 p-4 shadow-2xl backdrop-blur-xl sm:p-5">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.16em] text-emerald-100">Quick Converter</p>
                  <p className="mt-1 text-xs font-bold text-emerald-50/75">
                    {snapshot ? sourceLabel(snapshot.source) : "Connecting"} · Last updated {updatedLabel}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void fetchRates(false)}
                  disabled={refreshing}
                  className="inline-flex w-fit items-center gap-2 rounded-2xl border border-white/15 bg-white px-4 py-2 text-xs font-black text-emerald-800 transition hover:-translate-y-0.5 hover:bg-emerald-50 disabled:opacity-60"
                >
                  <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
                  Refresh
                </button>
              </div>

              {error ? (
                <div className="mb-4 flex gap-3 rounded-2xl border border-amber-200/30 bg-amber-300/15 p-3 text-sm font-bold text-amber-50">
                  <WifiOff className="mt-0.5 shrink-0" size={17} />
                  {error}
                </div>
              ) : null}

              <div className="grid gap-3">
                <label className="rounded-3xl bg-white p-4 text-emerald-950 shadow-sm ring-1 ring-white/70">
                  <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Amount</span>
                  <input
                    className="mt-2 w-full bg-transparent text-3xl font-black tracking-tight outline-none placeholder:text-emerald-200 sm:text-4xl"
                    inputMode="decimal"
                    value={amountRaw}
                    placeholder="0"
                    onChange={(event) => setAmountRaw(sanitizeAmountInput(event.target.value))}
                  />
                  <select
                    value={fromCurrency}
                    onChange={(event) => {
                      if (isCurrencyCode(event.target.value)) setFromCurrency(event.target.value);
                    }}
                    className="mt-3 w-full rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-black text-emerald-800 outline-none"
                  >
                    {currencies.map((currency) => (
                      <option key={currency} value={currency}>
                        {currency} · {currencyMeta[currency].name}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="flex items-center justify-center">
                  <button
                    type="button"
                    onClick={swapCurrencies}
                    className="grid h-12 w-12 place-items-center rounded-full bg-white text-emerald-800 shadow-lg transition hover:-translate-y-1 hover:rotate-180"
                    aria-label="Swap currencies"
                  >
                    <ArrowRightLeft size={20} />
                  </button>
                </div>

                <div className="rounded-3xl bg-gradient-to-br from-emerald-50 to-white p-4 text-emerald-950 shadow-sm ring-1 ring-white/70">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Converted Value</span>
                      <p className="mt-2 break-words text-3xl font-black tracking-tight sm:text-4xl">
                        {formatCurrency(convertedAmount, toCurrency)}
                      </p>
                    </div>
                    <select
                      value={toCurrency}
                      onChange={(event) => {
                        if (isCurrencyCode(event.target.value)) setToCurrency(event.target.value);
                      }}
                      className="w-full rounded-2xl border border-emerald-100 bg-white px-3 py-2 text-sm font-black text-emerald-800 outline-none sm:w-48"
                    >
                      {currencies.map((currency) => (
                        <option key={currency} value={currency}>
                          {currency} · {currencyMeta[currency].name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mt-4 rounded-2xl bg-emerald-950 p-4 text-white">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-100">Exchange Rate</p>
                    <p className="mt-1 text-lg font-black">
                      1 {fromCurrency} = {formatRate(currentRate)} {toCurrency}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <AnalyticsCard
            icon={<TrendingUp size={22} />}
            label="Strongest currency"
            value={analytics.strongest ? analytics.strongest.code : "Loading"}
            helper={analytics.strongest ? `1 ${analytics.strongest.code} buys ${formatRate(analytics.strongest.midRate)} NPR` : "Waiting for rates"}
          />
          <AnalyticsCard
            icon={<TrendingDown size={22} />}
            label="Weakest currency"
            value={analytics.weakest ? analytics.weakest.code : "Loading"}
            helper={analytics.weakest ? `1 ${analytics.weakest.code} buys ${formatRate(analytics.weakest.midRate)} NPR` : "Waiting for rates"}
          />
          <AnalyticsCard
            icon={<Banknote size={22} />}
            label="KRW/NPR trend"
            value={analytics.krw ? formatRate(analytics.krw.midRate) : "Loading"}
            helper={analytics.krw ? `${analytics.krw.trendPct >= 0 ? "+" : ""}${analytics.krw.trendPct.toFixed(2)}% since last refresh` : "Korea worker watchlist"}
          />
          <AnalyticsCard
            icon={<CircleDollarSign size={22} />}
            label="USD/NPR trend"
            value={analytics.usd ? formatRate(analytics.usd.midRate) : "Loading"}
            helper={analytics.usd ? `${analytics.usd.trendPct >= 0 ? "+" : ""}${analytics.usd.trendPct.toFixed(2)}% since last refresh` : "Dollar benchmark"}
          />
        </div>

        <section className="mt-6 grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="glass-card soft-gradient-border rounded-[2rem] p-5 sm:p-6">
            <p className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
              <Sparkles size={14} />
              Korea worker mode
            </p>
            <h2 className="mt-3 text-2xl font-black tracking-tight text-emerald-950">Instant KRW to NPR</h2>
            <p className="mt-2 text-sm font-bold leading-relaxed text-slate-500">
              Tap common salary and savings amounts to convert into NPR instantly.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {koreaAmounts.map((krwAmount) => (
                <motion.button
                  key={krwAmount}
                  type="button"
                  whileHover={{ y: -3 }}
                  onClick={() => applyPair(krwAmount, "KRW", "NPR")}
                  className="rounded-3xl border border-white/70 bg-white/80 p-4 text-left shadow-sm transition hover:border-emerald-200 hover:bg-white hover:shadow-[0_18px_48px_rgba(0,122,61,0.14)]"
                >
                  <span className="text-sm font-black text-emerald-800">{formatCurrency(krwAmount, "KRW", true)}</span>
                  <span className="mt-2 block text-2xl font-black text-emerald-950">
                    {snapshot ? formatCurrency(convert(krwAmount, "KRW", "NPR", snapshot.rates), "NPR") : "Loading"}
                  </span>
                </motion.button>
              ))}
            </div>
          </div>

          <div className="glass-card soft-gradient-border rounded-[2rem] p-5 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
                  <BarChart3 size={14} />
                  Live forex table
                </p>
                <h2 className="mt-3 text-2xl font-black tracking-tight text-emerald-950">Worldwide rates against NPR</h2>
                <p className="mt-2 text-sm font-bold text-slate-500">
                  Buy and sell rates include a simulated 0.6% bank spread for board-style planning.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-[1fr_180px] lg:w-[520px]">
                <label className="flex items-center gap-2 rounded-2xl border border-emerald-100 bg-white px-3 py-2 shadow-sm">
                  <Search size={17} className="text-emerald-700" />
                  <input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search currency, country, code"
                    className="min-w-0 flex-1 bg-transparent text-sm font-bold text-emerald-950 outline-none placeholder:text-slate-400"
                  />
                </label>
                <select
                  value={sortMode}
                  onChange={(event) => setSortMode(event.target.value as SortMode)}
                  className="rounded-2xl border border-emerald-100 bg-white px-3 py-2 text-sm font-black text-emerald-800 shadow-sm outline-none"
                >
                  <option value="favorite">Favorites first</option>
                  <option value="rateHigh">Rate high to low</option>
                  <option value="rateLow">Rate low to high</option>
                  <option value="trend">Largest movement</option>
                </select>
              </div>
            </div>

            <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-emerald-100 bg-white/80 shadow-sm">
              <div className="hidden grid-cols-[1.5fr_0.7fr_0.9fr_0.9fr_0.8fr_0.8fr] gap-4 border-b border-emerald-100 bg-emerald-950 px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-emerald-50 md:grid">
                <span>Currency</span>
                <span>Code</span>
                <span>Buy rate</span>
                <span>Sell rate</span>
                <span>Trend %</span>
                <span>Status</span>
              </div>
              <div className="max-h-[620px] overflow-auto">
                {filteredRows.map((row) => {
                  const TrendIcon = row.trend === "down" ? TrendingDown : TrendingUp;
                  const trendClass =
                    row.trend === "down" ? "text-rose-600 bg-rose-50" : row.trend === "up" ? "text-emerald-700 bg-emerald-50" : "text-slate-500 bg-slate-100";
                  return (
                    <motion.article
                      key={row.code}
                      layout
                      className="grid gap-3 border-b border-emerald-50 px-4 py-4 transition hover:bg-emerald-50/70 md:grid-cols-[1.5fr_0.7fr_0.9fr_0.9fr_0.8fr_0.8fr] md:items-center md:gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => toggleFavorite(row.code)}
                          className={`grid h-9 w-9 shrink-0 place-items-center rounded-full transition ${
                            row.isFavorite ? "bg-amber-100 text-amber-600" : "bg-slate-100 text-slate-400 hover:bg-emerald-100 hover:text-emerald-700"
                          }`}
                          aria-label={`Toggle ${row.code} favorite`}
                        >
                          <Star size={16} fill={row.isFavorite ? "currentColor" : "none"} />
                        </button>
                        <span className="text-3xl leading-none">{row.meta.flag}</span>
                        <div>
                          <p className="text-sm font-black text-emerald-950">{row.meta.name}</p>
                          <p className="text-xs font-bold text-slate-500">{row.meta.country}</p>
                        </div>
                      </div>
                      <p className="text-sm font-black text-emerald-800 md:text-base">{row.code}</p>
                      <p className="text-sm font-black text-emerald-950">
                        <span className="md:hidden">Buy: </span>
                        {formatRate(row.buyRate)}
                      </p>
                      <p className="text-sm font-black text-emerald-950">
                        <span className="md:hidden">Sell: </span>
                        {formatRate(row.sellRate)}
                      </p>
                      <p className={`inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black ${trendClass}`}>
                        <TrendIcon size={13} />
                        {row.trendPct >= 0 ? "+" : ""}
                        {row.trendPct.toFixed(2)}%
                      </p>
                      <p className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700">
                        <ShieldCheck size={13} />
                        {row.code === "NPR" ? "Local base" : snapshot?.source === "live" ? "Live" : "Backup"}
                      </p>
                    </motion.article>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </section>

      <div className="fixed inset-x-3 bottom-3 z-40 rounded-[1.5rem] border border-white/40 bg-emerald-950/90 p-3 text-white shadow-2xl backdrop-blur-xl md:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-emerald-100">
              <Heart size={13} />
              Sticky converter
            </p>
            <p className="mt-1 truncate text-lg font-black">
              {formatCurrency(amount, fromCurrency, true)} = {formatCurrency(convertedAmount, toCurrency, true)}
            </p>
          </div>
          <button
            type="button"
            onClick={swapCurrencies}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-emerald-800 shadow-lg"
            aria-label="Swap currencies"
          >
            <ArrowRightLeft size={18} />
          </button>
        </div>
      </div>

      <div className="pointer-events-none fixed bottom-4 right-4 hidden rounded-full border border-emerald-100 bg-white/85 px-4 py-2 text-xs font-black text-emerald-800 shadow-lg backdrop-blur md:flex md:items-center md:gap-2">
        <Clock3 size={14} />
        Auto refresh 60s
      </div>
    </main>
  );
}
