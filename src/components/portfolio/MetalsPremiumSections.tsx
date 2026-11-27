"use client";

import { useId, useMemo, useState, type ReactNode } from "react";
import {
  ArrowLeftRight,
  BarChart3,
  CalendarDays,
  ImagePlus,
  PieChart as PieChartIcon,
  Plus,
  Target,
  TrendingUp,
  Layers,
} from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { AutoFitSingleLine } from "@/components/portfolio/AutoFitSingleLine";
import { MetalsPortfolioReportModal } from "@/components/portfolio/MetalsPortfolioReportModal";
import { useWealthPortfolio } from "@/contexts/WealthPortfolioContext";
import {
  annualizedCagrFraction,
  formatCagrPct,
  formatHoldingDurationApprox,
} from "@/components/portfolio/holding-stats";
import {
  metalHoldingCalendarDays,
  metalHoldingCalendarDaysForMetal,
  roiPct,
  rollupAllMetals,
  rollupMetalBucket,
  weightedBasisCostPerGram,
  type MetalRatePair,
} from "@/components/portfolio/metals-premium-metrics";
import type { MetalRow, PortfolioLedgerEntry, WealthPortfolioStateV2 } from "@/components/portfolio/types";
import { NumericMoneyInput } from "@/components/NumericMoneyInput";
import { PortfolioModuleDataResetButton } from "@/components/fire-nepal/PortfolioModuleDataResetButton";
import { formatMoney } from "@/lib/expense-utils";
import { gramsToTolaUi, NEPAL_UI_GRAMS_PER_TOLA, tolaUiToGrams } from "@/lib/portfolio/nepal-metal-ui-convert";
import Image from "next/image";

function formatRoiPct(pct: number | null): string {
  if (pct == null || !Number.isFinite(pct)) return "—";
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 0 })}%`;
}

function formatSignedMoney(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${n >= 0 ? "+" : ""}${formatMoney(n, "NPR")}`;
}

function KpiCard({
  label,
  valueText,
  valueClassName,
  shellClassName,
  icon,
  maxRem = 1.35,
}: {
  label: string;
  valueText: string;
  valueClassName: string;
  shellClassName: string;
  icon: ReactNode;
  maxRem?: number;
}) {
  return (
    <div className={`gs-kpi-card flex min-h-[5.25rem] min-w-0 flex-col rounded-xl border px-2.5 py-2 sm:min-h-[5.75rem] sm:px-3 sm:py-2.5 ${shellClassName}`}>
      <div className="flex items-start justify-between gap-1">
        <p className="text-[9px] font-black uppercase leading-tight tracking-[0.08em] text-[#CBD5E1]/75 sm:text-[10px]">
          {label}
        </p>
        <span className="shrink-0 opacity-80">{icon}</span>
      </div>
      <div className="mt-auto flex min-h-0 min-w-0 flex-1 items-end pt-1">
        <AutoFitSingleLine text={valueText} maxRem={maxRem} minRem={0.55} className={`font-black tabular-nums ${valueClassName}`} />
      </div>
    </div>
  );
}

export function MetalGramTolaFields({
  grams,
  onGramsChange,
}: {
  grams: number | undefined;
  onGramsChange: (n: number | undefined) => void;
}) {
  const g = grams ?? 0;
  const [tolaFocused, setTolaFocused] = useState(false);
  const [tolaDraft, setTolaDraft] = useState("");
  const derivedTola = g > 0 ? gramsToTolaUi(g).toFixed(4) : "";
  const tolaInputValue = tolaFocused ? tolaDraft : derivedTola;

  return (
    <div className="grid min-w-0 gap-2 sm:grid-cols-2 sm:items-end">
      <div className="min-w-0">
        <NumericMoneyInput
          tone="dark"
          label="Grams"
          value={grams}
          onChange={onGramsChange}
          variant="amount"
          placeholder="0"
          className="text-[10px] font-bold uppercase tracking-wide text-zinc-200 [&>span]:block"
          wrapperClassName="rounded-xl border border-emerald-400/15 bg-black/30 px-2 py-2 focus-within:border-emerald-400/40"
          inputClassName="min-w-0 flex-1 bg-transparent text-xs font-bold text-emerald-50 outline-none"
        />
        <p className="mt-1 text-[10px] font-bold text-emerald-200/55">
          ≈ <span className="tabular-nums text-amber-100/95">{g > 0 ? gramsToTolaUi(g).toFixed(4) : "0"}</span> tola
          <span className="text-emerald-200/40"> · UI 1 tola = {NEPAL_UI_GRAMS_PER_TOLA} g</span>
        </p>
      </div>
      <label className="block min-w-0">
        <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wide text-emerald-200/55">Tola (UI)</span>
        <input
          value={tolaInputValue}
          onChange={(e) => {
            const raw = e.target.value;
            setTolaDraft(raw);
            const t = String(raw).replace(/,/g, "").trim();
            if (t === "") return;
            const n = Number(t);
            if (!Number.isFinite(n) || n <= 0) return;
            onGramsChange(Number(tolaUiToGrams(n).toFixed(4)));
          }}
          onFocus={() => {
            setTolaFocused(true);
            setTolaDraft(derivedTola);
          }}
          onBlur={() => {
            setTolaFocused(false);
            const n = Number(String(tolaDraft).replace(/,/g, "").trim());
            if (Number.isFinite(n) && n > 0) {
              onGramsChange(Number(tolaUiToGrams(n).toFixed(4)));
            }
            setTolaDraft("");
          }}
          inputMode="decimal"
          className="wealth-input-text w-full rounded-xl border border-emerald-400/15 bg-black/30 px-2 py-2 text-xs font-bold text-emerald-50 outline-none focus:border-emerald-400/40"
          placeholder="0"
        />
        <p className="mt-1 text-[10px] font-bold text-emerald-200/55">
          ≈ <span className="tabular-nums text-amber-100/95">{g > 0 ? g.toLocaleString("en-US", { maximumFractionDigits: 4 }) : "0"}</span> g
        </p>
      </label>
    </div>
  );
}

function MetalHoldingsCard({
  title,
  metal,
  rollup,
  cagrFrac,
}: {
  title: string;
  metal: "gold" | "silver";
  rollup: ReturnType<typeof rollupMetalBucket>;
  cagrFrac: number | null;
}) {
  const isGold = metal === "gold";
  const empty = rollup.grams <= 0;
  const tola = empty ? null : gramsToTolaUi(rollup.grams);
  const border = isGold ? "border-[#D4AF37]/40" : "border-[#94A3B8]/40";
  const glow = isGold
    ? "from-[#D4AF37]/14 via-[#062B24]/45 to-[#03100F]/90 shadow-[0_0_28px_-12px_rgba(212,175,55,0.45)]"
    : "from-[#94A3B8]/14 via-[#0c1a24]/55 to-[#03100F]/90 shadow-[0_0_28px_-12px_rgba(148,163,184,0.35)]";
  const titleTone = isGold ? "text-[#F4D06F]" : "text-[#E2E8F0]";
  const valueTone = isGold ? "text-[#F8FAFC]" : "text-[#F8FAFC]";
  const currentTone = isGold ? "text-[#F4D06F]" : "text-[#E2E8F0]";
  const cagrTone = isGold ? "text-[#F4D06F]" : "text-[#E2E8F0]";
  const cagrPanel = isGold
    ? "border-[#D4AF37]/40 bg-gradient-to-r from-[#D4AF37]/16 to-[#D4AF37]/06"
    : "border-[#94A3B8]/40 bg-gradient-to-r from-[#94A3B8]/16 to-[#94A3B8]/06";
  const art = isGold ? "/illustrations/gold-silver/gold-bars.svg" : "/illustrations/gold-silver/silver-bars.svg";

  const gramsText = empty
    ? "—"
    : `${rollup.grams.toLocaleString(undefined, { maximumFractionDigits: 4 })} g`;
  const tolaText = tola != null ? tola.toFixed(4) : "—";
  const purchaseText = rollup.basisSumNpr > 0 ? formatMoney(rollup.basisSumNpr, "NPR") : "—";
  const currentText = empty ? "—" : formatMoney(rollup.currentNpr, "NPR");
  const cagrText = empty || cagrFrac == null ? "—" : formatCagrPct(cagrFrac, 2).replace(" p.a.", "");

  const metric = (label: string, value: string, emphasize = false) => (
    <div className="min-w-0">
      <dt className="text-[14px] font-semibold leading-snug text-[#CBD5E1]/85 sm:text-[15px] md:text-[16px]">
        {label}
      </dt>
      <dd
        className={`mt-1 break-words font-extrabold tabular-nums leading-none tracking-tight ${
          emphasize
            ? `text-[20px] sm:text-[22px] md:text-[24px] ${currentTone}`
            : `text-[19px] text-[#F8FAFC] sm:text-[21px] md:text-[23px] ${valueTone}`
        }`}
      >
        {value}
      </dd>
    </div>
  );

  return (
    <article className={`gs-glass overflow-hidden rounded-2xl border ${border} bg-gradient-to-br ${glow}`}>
      <div className="px-3.5 py-3 sm:px-4 sm:py-3.5">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <div className="relative h-11 w-12 shrink-0 sm:h-12 sm:w-14" aria-hidden>
            <Image src={art} alt="" fill unoptimized className="object-contain drop-shadow-lg" sizes="56px" />
          </div>
          <h3
            className={`min-w-0 text-[22px] font-extrabold leading-none tracking-tight sm:text-[23px] md:text-[24px] ${titleTone}`}
          >
            {title}
          </h3>
        </div>

        <dl className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-2.5 sm:mt-3 sm:gap-x-5 sm:gap-y-3">
          {metric("Grams", gramsText)}
          {metric("Tola", tolaText)}
          {metric("Purchase", purchaseText)}
          {metric("Current Value", currentText, true)}
        </dl>

        <div className={`mt-3 rounded-xl border px-3.5 py-2.5 sm:mt-3.5 sm:px-4 sm:py-3 ${cagrPanel}`}>
          <p className="text-[14px] font-bold uppercase tracking-[0.06em] text-[#CBD5E1]/85 sm:text-[15px] md:text-[16px]">
            CAGR Returns
          </p>
          <p
            className={`mt-1.5 break-words text-[30px] font-black tabular-nums leading-none tracking-tight sm:text-[34px] md:text-[36px] ${cagrTone}`}
          >
            {cagrText}
          </p>
        </div>
      </div>
    </article>
  );
}

function MetalInsightsTable({
  goldAvg,
  silverAvg,
  goldBoard,
  silverBoard,
  goldHasBasis,
  silverHasBasis,
}: {
  goldAvg: number | null;
  silverAvg: number | null;
  goldBoard: number;
  silverBoard: number;
  goldHasBasis: boolean;
  silverHasBasis: boolean;
}) {
  const goldDiff =
    goldAvg != null && goldAvg > 0 && goldBoard > 0 ? goldBoard - goldAvg : null;
  const silverDiff =
    silverAvg != null && silverAvg > 0 && silverBoard > 0 ? silverBoard - silverAvg : null;

  const cell = (n: number | null, signed = false) => {
    if (n == null || !Number.isFinite(n)) return <span className="text-[#CBD5E1]/40">—</span>;
    const tone = signed ? (n >= 0 ? "text-[#4ADE80]" : "text-rose-300") : "text-[#F8FAFC]";
    return (
      <span className={`tabular-nums ${tone}`}>
        {signed ? `${n >= 0 ? "+" : ""}${formatMoney(n, "NPR")}` : formatMoney(n, "NPR")}
      </span>
    );
  };

  const rows: { metric: string; gold: ReactNode; silver: ReactNode }[] = [
    {
      metric: "Avg Purchase / g",
      gold: goldHasBasis ? cell(goldAvg) : cell(null),
      silver: silverHasBasis ? cell(silverAvg) : cell(null),
    },
    {
      metric: "Nepal Board / g",
      gold: cell(goldBoard > 0 ? goldBoard : null),
      silver: cell(silverBoard > 0 ? silverBoard : null),
    },
    {
      metric: "Board − Avg / g",
      gold: goldHasBasis ? cell(goldDiff, true) : cell(null),
      silver: silverHasBasis ? cell(silverDiff, true) : cell(null),
    },
    {
      metric: "Profit / g (Unrealized)",
      gold: goldHasBasis ? cell(goldDiff, true) : cell(null),
      silver: silverHasBasis ? cell(silverDiff, true) : cell(null),
    },
  ];

  return (
    <section className="gs-glass rounded-2xl border border-[#10B981]/25 p-3 sm:p-4" aria-labelledby="gs-insights-title">
      <h3 id="gs-insights-title" className="text-xs font-black uppercase tracking-[0.1em] text-[#F8FAFC] sm:text-sm">
        Metal Insights (Per Gram)
      </h3>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[18rem] border-collapse text-left text-[11px] font-bold">
          <thead>
            <tr className="border-b border-white/10 text-[10px] uppercase tracking-wider text-[#CBD5E1]/55">
              <th className="py-2 pr-2 font-black">Metric</th>
              <th className="py-2 px-2 font-black text-[#F4D06F]">Gold</th>
              <th className="py-2 pl-2 font-black text-[#CBD5E1]">Silver</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.metric} className="border-b border-white/[0.05]">
                <td className="py-2.5 pr-2 text-[#CBD5E1]/70">{r.metric}</td>
                <td className="px-2 py-2.5">{r.gold}</td>
                <td className="py-2.5 pl-2">{r.silver}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!goldHasBasis && !silverHasBasis ? (
        <p className="mt-2 text-[10px] font-semibold text-[#CBD5E1]/45">
          Record BUY transactions with price to unlock averages.
        </p>
      ) : null}
    </section>
  );
}

function PortfolioAllocationCard({
  goldValue,
  silverValue,
  netWorthSharePct,
}: {
  goldValue: number;
  silverValue: number;
  netWorthSharePct: number | null;
}) {
  const uid = useId().replace(/:/g, "");
  const total = goldValue + silverValue;
  const empty = total <= 0;
  const goldPct = empty ? 0 : (goldValue / total) * 100;
  const silverPct = empty ? 0 : (silverValue / total) * 100;

  const data = useMemo(() => {
    if (empty) return [{ name: "Empty", value: 1, color: "#1e293b" }];
    const slices = [
      { name: "Gold", value: goldValue, color: "#D4AF37" },
      { name: "Silver", value: silverValue, color: "#94A3B8" },
    ].filter((s) => s.value > 0);
    return slices.length ? slices : [{ name: "Empty", value: 1, color: "#1e293b" }];
  }, [empty, goldValue, silverValue]);

  return (
    <section className="gs-glass rounded-2xl border border-[#D4AF37]/25 p-3 sm:p-4" aria-labelledby="gs-alloc-title">
      <h3 id="gs-alloc-title" className="text-xs font-black uppercase tracking-[0.1em] text-[#F8FAFC] sm:text-sm">
        Portfolio Summary
      </h3>
      {empty ? (
        <p className="mt-4 text-center text-[12px] font-semibold text-[#CBD5E1]/65">
          No gold or silver holdings — allocation appears when you add metals.
        </p>
      ) : (
        <div className="mt-3 flex flex-col items-center gap-4 sm:flex-row sm:items-center">
          <div className="relative h-36 w-36 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius="62%"
                  outerRadius="88%"
                  paddingAngle={data.length > 1 ? 2 : 0}
                  stroke="#03100F"
                  strokeWidth={2}
                >
                  {data.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "rgba(3,16,15,0.96)",
                    border: "1px solid rgba(212,175,55,0.25)",
                    borderRadius: 12,
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#F8FAFC",
                  }}
                  formatter={(value: number, _n, item) => {
                    const name = (item as { payload?: { name?: string } })?.payload?.name ?? "";
                    const pct = total > 0 ? (value / total) * 100 : 0;
                    return [`${formatMoney(value, "NPR")} (${pct.toFixed(1)}%)`, name];
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span
                className={`text-sm font-black ${goldPct >= silverPct ? "text-[#F4D06F]" : "text-[#CBD5E1]"}`}
                aria-hidden
              >
                {goldPct >= silverPct ? "Au" : "Ag"}
              </span>
              <span className="sr-only">Allocation center</span>
            </div>
          </div>
          <div className="min-w-0 flex-1 space-y-2 text-[12px] font-bold">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-[#F4D06F]">
                <span className="h-2.5 w-2.5 rounded-full bg-[#D4AF37]" aria-hidden />
                Gold
              </span>
              <span className="tabular-nums text-[#F8FAFC]">{goldPct.toFixed(0)}%</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-[#CBD5E1]">
                <span className="h-2.5 w-2.5 rounded-full bg-[#94A3B8]" aria-hidden />
                Silver
              </span>
              <span className="tabular-nums text-[#F8FAFC]">{silverPct.toFixed(0)}%</span>
            </div>
            <div className="mt-2 border-t border-white/10 pt-2">
              <p className="text-[10px] font-black uppercase tracking-wider text-[#CBD5E1]/55">Net Worth Share</p>
              <p className="mt-0.5 text-lg font-black tabular-nums text-[#4ADE80]">
                {netWorthSharePct != null ? `${netWorthSharePct.toFixed(2)}%` : "—"}
              </p>
            </div>
          </div>
        </div>
      )}
      {/* silence unused uid if pie needs unique keys later */}
      <span className="hidden" aria-hidden>{uid}</span>
    </section>
  );
}

const QUICK_BTN =
  "gs-quick-btn flex min-h-11 min-w-0 flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2.5 text-[11px] font-black transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F4D06F] active:scale-[0.98] sm:min-h-12 sm:text-xs";

export function MetalsPremiumDashboard({
  rows,
  gramRates,
  ledger = [],
  onAddGold,
  onAddSilver,
  onTrades,
  onUploadBills,
  onMutate,
}: {
  rows: readonly MetalRow[];
  gramRates: MetalRatePair;
  ledger?: readonly PortfolioLedgerEntry[];
  onAddGold: () => void;
  onAddSilver: () => void;
  onTrades: () => void;
  onUploadBills: () => void;
  onMutate: (fn: (s: WealthPortfolioStateV2) => WealthPortfolioStateV2 | null) => boolean;
}) {
  const { totals } = useWealthPortfolio();
  const [reportOpen, setReportOpen] = useState(false);
  const [reportSession, setReportSession] = useState(0);
  const all = rollupAllMetals(rows, gramRates);
  const gold = rollupMetalBucket(rows, "gold", gramRates);
  const silver = rollupMetalBucket(rows, "silver", gramRates);
  const days = metalHoldingCalendarDays(rows, ledger);
  const goldDays = metalHoldingCalendarDaysForMetal(rows, "gold", ledger);
  const silverDays = metalHoldingCalendarDaysForMetal(rows, "silver", ledger);
  const purchase = all.basisSumNpr;
  const current = all.currentNpr;
  const netPl = purchase > 0 ? current - purchase : null;
  const roi = roiPct(purchase, current);
  const cagrFrac = days != null && days >= 1 && purchase > 0 ? annualizedCagrFraction(purchase, current, days) : null;
  const goldCagr =
    goldDays != null && goldDays >= 1 && gold.basisSumNpr > 0
      ? annualizedCagrFraction(gold.basisSumNpr, gold.currentNpr, goldDays)
      : null;
  const silverCagr =
    silverDays != null && silverDays >= 1 && silver.basisSumNpr > 0
      ? annualizedCagrFraction(silver.basisSumNpr, silver.currentNpr, silverDays)
      : null;

  const goldAvgPerG = weightedBasisCostPerGram(rows, "gold");
  const silverAvgPerG = weightedBasisCostPerGram(rows, "silver");
  const goldHasBasisLots = goldAvgPerG != null;
  const silverHasBasisLots = silverAvgPerG != null;

  const holdingApprox = days != null ? formatHoldingDurationApprox(days) : "—";
  const nw = totals.netWorthNpr;
  const nwContributionPct = nw > 0 && Number.isFinite(current) ? (current / nw) * 100 : null;

  const netTone = netPl == null ? "text-[#CBD5E1]/50" : netPl >= 0 ? "text-[#4ADE80]" : "text-rose-300";
  const roiTone = roi == null ? "text-[#CBD5E1]/50" : roi >= 0 ? "text-[#4ADE80]" : "text-rose-300";

  return (
    <div className="gs-premium-dash mb-3 space-y-3 sm:space-y-3.5">
      {/* KPI grid — 5 cards */}
      <div className="grid grid-cols-2 gap-2 sm:gap-2.5 lg:grid-cols-5">
        <KpiCard
          label="Current Value"
          valueText={all.grams > 0 ? formatMoney(current, "NPR") : "—"}
          valueClassName="text-[#F4D06F]"
          shellClassName="border-[#D4AF37]/40 bg-gradient-to-br from-[#D4AF37]/15 to-[#03100F]/80 shadow-[0_0_24px_-10px_rgba(212,175,55,0.45)]"
          icon={<span className="text-[#F4D06F]">⬤</span>}
        />
        <KpiCard
          label="Cost Basis"
          valueText={purchase > 0 ? formatMoney(purchase, "NPR") : "—"}
          valueClassName="text-[#F8FAFC]"
          shellClassName="border-[#10B981]/35 bg-gradient-to-br from-[#10B981]/12 to-[#03100F]/80"
          icon={<Layers size={14} className="text-[#10B981]" aria-hidden />}
        />
        <KpiCard
          label="Profit / Loss"
          valueText={formatSignedMoney(netPl)}
          valueClassName={netTone}
          shellClassName="border-[#10B981]/35 bg-gradient-to-br from-[#062B24]/60 to-[#03100F]/80"
          icon={<TrendingUp size={14} className="text-[#4ADE80]" aria-hidden />}
        />
        <KpiCard
          label="Total ROI"
          valueText={formatRoiPct(roi)}
          valueClassName={roiTone}
          shellClassName="border-[#10B981]/35 bg-gradient-to-br from-[#062B24]/60 to-[#03100F]/80"
          icon={<Target size={14} className="text-[#4ADE80]" aria-hidden />}
          maxRem={1.5}
        />
        <KpiCard
          label="CAGR"
          valueText={formatCagrPct(cagrFrac, 2).replace(" p.a.", "")}
          valueClassName="text-[#F4D06F]"
          shellClassName="col-span-2 border-[#D4AF37]/45 bg-gradient-to-br from-[#0a1f2e]/80 via-[#062B24]/50 to-[#03100F] shadow-[0_0_28px_-10px_rgba(212,175,55,0.4)] lg:col-span-1"
          icon={<BarChart3 size={14} className="text-[#F4D06F]" aria-hidden />}
          maxRem={1.55}
        />
      </div>

      {/* Holding duration + Net worth share */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div
          className="gs-glass flex min-h-11 items-center gap-2.5 rounded-xl border border-[#10B981]/25 px-3 py-2.5"
          title={days != null ? `${days.toLocaleString()} calendar days` : undefined}
        >
          <CalendarDays size={18} className="shrink-0 text-[#10B981]" aria-hidden />
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-wider text-[#CBD5E1]/55">Held For</p>
            <p className="text-sm font-black tabular-nums text-[#F8FAFC]">{holdingApprox}</p>
          </div>
          {days != null ? (
            <p className="ml-auto text-[10px] font-bold text-[#CBD5E1]/45">{days.toLocaleString()} days</p>
          ) : null}
        </div>
        <div className="gs-glass flex min-h-11 items-center gap-2.5 rounded-xl border border-[#10B981]/25 px-3 py-2.5">
          <PieChartIcon size={18} className="shrink-0 text-[#4ADE80]" aria-hidden />
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-wider text-[#CBD5E1]/55">Net Worth Share</p>
            <p className="text-sm font-black tabular-nums text-[#4ADE80]">
              {nwContributionPct != null ? `${nwContributionPct.toFixed(2)}%` : "—"}
            </p>
          </div>
        </div>
      </div>

      <MetalHoldingsCard title="Gold Items" metal="gold" rollup={gold} cagrFrac={goldCagr} />
      <MetalHoldingsCard title="Silver Items" metal="silver" rollup={silver} cagrFrac={silverCagr} />

      <div className="grid min-w-0 gap-3 lg:grid-cols-2">
        <MetalInsightsTable
          goldAvg={goldAvgPerG}
          silverAvg={silverAvgPerG}
          goldBoard={gramRates.goldNprPerGram}
          silverBoard={gramRates.silverNprPerGram}
          goldHasBasis={goldHasBasisLots}
          silverHasBasis={silverHasBasisLots}
        />
        <PortfolioAllocationCard
          goldValue={gold.grams > 0 ? gold.currentNpr : 0}
          silverValue={silver.grams > 0 ? silver.currentNpr : 0}
          netWorthSharePct={nwContributionPct}
        />
      </div>

      {/* Quick actions */}
      <section aria-labelledby="gs-quick-title">
        <h3 id="gs-quick-title" className="mb-2 text-xs font-black uppercase tracking-[0.1em] text-[#F8FAFC]">
          Quick Actions
        </h3>
        <div className="grid grid-cols-3 gap-2 sm:gap-2.5 lg:grid-cols-6">
          <button
            type="button"
            onClick={onAddGold}
            className={`${QUICK_BTN} border-[#D4AF37]/45 bg-[#D4AF37]/10 text-[#F4D06F] shadow-[0_0_20px_-8px_rgba(212,175,55,0.5)] hover:bg-[#D4AF37]/18`}
          >
            <Plus size={16} aria-hidden />
            Gold
          </button>
          <button
            type="button"
            onClick={onAddSilver}
            className={`${QUICK_BTN} border-[#94A3B8]/45 bg-[#94A3B8]/10 text-[#E2E8F0] shadow-[0_0_20px_-8px_rgba(148,163,184,0.4)] hover:bg-[#94A3B8]/18`}
          >
            <Plus size={16} aria-hidden />
            Silver
          </button>
          <button
            type="button"
            onClick={onTrades}
            className={`${QUICK_BTN} border-[#10B981]/35 bg-[#10B981]/10 text-[#6EE7B7] hover:bg-[#10B981]/18`}
          >
            <ArrowLeftRight size={16} aria-hidden />
            Trades
          </button>
          <button
            type="button"
            onClick={onUploadBills}
            className={`${QUICK_BTN} border-[#10B981]/35 bg-[#10B981]/10 text-[#6EE7B7] hover:bg-[#10B981]/18`}
          >
            <ImagePlus size={16} aria-hidden />
            Upload Bills
          </button>
          <button
            type="button"
            onClick={() => {
              setReportSession((n) => n + 1);
              setReportOpen(true);
            }}
            className={`${QUICK_BTN} border-[#10B981]/35 bg-[#10B981]/10 text-[#6EE7B7] hover:bg-[#10B981]/18`}
            aria-label="Open Gold and Silver investment report"
          >
            <BarChart3 size={16} aria-hidden />
            Report
          </button>
          <PortfolioModuleDataResetButton
            module="metals"
            onMutate={onMutate}
            className={`${QUICK_BTN} border-[#10B981]/35 bg-[#10B981]/10 text-[#6EE7B7] hover:bg-[#10B981]/18`}
          >
            <span className="inline-flex flex-col items-center gap-1">
              <span className="text-base leading-none" aria-hidden>
                ↺
              </span>
              Reset Data
            </span>
          </PortfolioModuleDataResetButton>
        </div>
      </section>

      <MetalsPortfolioReportModal
        key={reportSession}
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        rows={rows}
        ledger={ledger}
      />
    </div>
  );
}
