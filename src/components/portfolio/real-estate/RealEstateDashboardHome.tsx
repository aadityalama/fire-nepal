"use client";

import { BarChart3, Building2, Plus, RotateCcw } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import { PortfolioModuleDataResetButton } from "@/components/fire-nepal/PortfolioModuleDataResetButton";
import {
  computeRealEstatePortfolioStats,
  formatReStatMoney,
  propertyCardMetrics,
} from "@/components/portfolio/real-estate-portfolio-stats";
import { realEstateAllPhotos } from "@/components/portfolio/real-estate-documents";
import type { RealEstateRow, WealthPortfolioStateV2 } from "@/components/portfolio/types";
import {
  PropertyIllustration,
  ReBadge,
  ReGlass,
  ReIconButton,
  ReSectionTitle,
  buildGrowthSeries,
  formatReCcy,
  formatReSignedCcy,
  RE_KIND_LABEL,
} from "@/components/portfolio/real-estate/RealEstateUi";

export function RealEstateDashboardHome({
  rows,
  krwPerNpr,
  usdPerNpr,
  onMutate,
  onOpenProperties,
  onOpenAnalytics,
  onOpenAdd,
  onOpenProperty,
}: {
  rows: RealEstateRow[];
  krwPerNpr: number;
  usdPerNpr: number;
  onMutate: (fn: (s: WealthPortfolioStateV2) => WealthPortfolioStateV2 | null) => boolean;
  onOpenProperties: () => void;
  onOpenAnalytics: () => void;
  onOpenAdd: () => void;
  onOpenProperty: (id: string) => void;
}) {
  const stats = computeRealEstatePortfolioStats(rows, krwPerNpr, usdPerNpr);
  const chartData = buildGrowthSeries(stats.totalInvestmentNpr || undefined, stats.currentMarketValueNpr || undefined, 10);
  const previewMobile = rows.slice(0, 3);
  const previewWide = rows.slice(0, 6);

  const kpiCards = [
    { label: "Total Properties", value: String(stats.propertyCount) },
    { label: "Total Investment", value: formatReStatMoney(stats.totalInvestmentNpr) },
    { label: "Current Market Value", value: formatReStatMoney(stats.currentMarketValueNpr) },
    {
      label: "Total Profit",
      value: formatReStatMoney(stats.totalProfitNpr),
      positive: stats.totalProfitNpr >= 0,
    },
  ];

  return (
    <div className="space-y-5 md:space-y-6 lg:space-y-7">
      {/* —— HERO ——
          Mobile: stacked brand + metrics + mini chart
          Tablet: 2-zone hero (copy/metrics | illustration + chart)
          Desktop: 3-zone cinematic strip (brand | net worth + chart | illustration)
      */}
      <ReGlass className="overflow-hidden p-0">
        {/* Mobile hero */}
        <div className="space-y-4 p-5 md:hidden">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-400/80">FIRE Nepal</p>
              <h1 className="mt-1 text-3xl font-black tracking-tight text-emerald-50">Real Estate</h1>
              <p className="mt-2 text-sm font-semibold leading-snug text-emerald-200/65">
                Track. Analyze. Grow your Property Wealth.
              </p>
            </div>
            <div className="h-20 w-24 shrink-0">
              <PropertyIllustration />
            </div>
          </div>
          <div className="rounded-2xl border border-emerald-400/15 bg-black/35 p-4">
            <p className="text-[10px] font-black uppercase tracking-wider text-emerald-200/55">Total Net Worth</p>
            <p className="mt-1 text-2xl font-black tabular-nums tracking-tight text-lime-200">
              {formatReStatMoney(stats.currentMarketValueNpr)}
            </p>
            <p className="mt-2 text-xs font-semibold text-emerald-200/55">
              Yearly profit{" "}
              <span className={`font-black tabular-nums ${(stats.yearlyProfitNpr ?? 0) >= 0 ? "text-lime-300" : "text-rose-300"}`}>
                {stats.yearlyProfitNpr == null ? "—" : formatReStatMoney(stats.yearlyProfitNpr)}
              </span>
            </p>
          </div>
          <div className="h-[6.5rem] rounded-2xl border border-emerald-400/15 bg-black/35 p-2">
            <GrowthChart data={chartData} gradientId="reDashGrowMobile" />
          </div>
        </div>

        {/* Tablet hero */}
        <div className="hidden p-6 md:grid md:grid-cols-[1.25fr_0.9fr] md:items-stretch md:gap-5 lg:hidden">
          <div className="flex min-w-0 flex-col justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-400/80">FIRE Nepal</p>
              <h1 className="mt-1 text-4xl font-black tracking-tight text-emerald-50">Real Estate</h1>
              <p className="mt-2 max-w-md text-sm font-semibold leading-snug text-emerald-200/65">
                Track. Analyze. Grow your Property Wealth.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-emerald-400/15 bg-black/35 p-4">
                <p className="text-[10px] font-black uppercase tracking-wider text-emerald-200/55">Total Net Worth</p>
                <p className="mt-1 text-2xl font-black tabular-nums text-lime-200">
                  {formatReStatMoney(stats.currentMarketValueNpr)}
                </p>
              </div>
              <div className="rounded-2xl border border-emerald-400/15 bg-black/35 p-4">
                <p className="text-[10px] font-black uppercase tracking-wider text-emerald-200/55">Yearly Profit</p>
                <p
                  className={`mt-1 text-2xl font-black tabular-nums ${
                    (stats.yearlyProfitNpr ?? 0) >= 0 ? "text-lime-200" : "text-rose-300"
                  }`}
                >
                  {stats.yearlyProfitNpr == null ? "—" : formatReStatMoney(stats.yearlyProfitNpr)}
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <div className="mx-auto h-28 w-36">
              <PropertyIllustration />
            </div>
            <div className="min-h-0 flex-1 rounded-2xl border border-emerald-400/15 bg-black/35 p-2">
              <GrowthChart data={chartData} gradientId="reDashGrowTablet" />
            </div>
          </div>
        </div>

        {/* Desktop hero */}
        <div className="hidden lg:grid lg:grid-cols-[0.95fr_1.35fr_0.85fr] lg:items-stretch lg:gap-0">
          <div className="flex flex-col justify-center border-r border-emerald-400/10 p-8">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-400/80">FIRE Nepal</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight text-emerald-50 xl:text-5xl">Real Estate</h1>
            <p className="mt-3 max-w-xs text-sm font-semibold leading-relaxed text-emerald-200/65">
              Track. Analyze. Grow your Property Wealth.
            </p>
            <button
              type="button"
              onClick={onOpenAdd}
              className="mt-6 inline-flex min-h-11 w-fit items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-500 px-4 text-sm font-black text-emerald-950"
            >
              <Plus size={16} /> Add Property
            </button>
          </div>
          <div className="flex flex-col justify-center gap-4 border-r border-emerald-400/10 p-8">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-emerald-200/55">Total Net Worth</p>
                <p className="mt-1 text-3xl font-black tabular-nums tracking-tight text-lime-200 xl:text-4xl">
                  {formatReStatMoney(stats.currentMarketValueNpr)}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-emerald-200/55">Yearly Profit</p>
                <p
                  className={`mt-1 text-3xl font-black tabular-nums xl:text-4xl ${
                    (stats.yearlyProfitNpr ?? 0) >= 0 ? "text-emerald-100" : "text-rose-300"
                  }`}
                >
                  {stats.yearlyProfitNpr == null ? "—" : formatReStatMoney(stats.yearlyProfitNpr)}
                </p>
              </div>
            </div>
            <div className="h-36 rounded-2xl border border-emerald-400/15 bg-black/35 p-3">
              <GrowthChart data={chartData} gradientId="reDashGrowDesktop" />
            </div>
          </div>
          <div className="flex items-center justify-center bg-gradient-to-br from-emerald-950/40 to-transparent p-6">
            <div className="h-44 w-52 xl:h-52 xl:w-60">
              <PropertyIllustration />
            </div>
          </div>
        </div>
      </ReGlass>

      {/* —— KPI STRIP ——
          Mobile: 2×2 · Tablet: 4-col · Desktop: 4-col wider cards
      */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-3.5 lg:gap-4">
        {kpiCards.map((card) => (
          <ReGlass key={card.label} className="p-3.5 lg:p-5">
            <p className="text-[10px] font-black uppercase tracking-wider text-emerald-200/50">{card.label}</p>
            <p
              className={`mt-2 text-sm font-black tabular-nums leading-snug md:text-base lg:text-lg ${
                "positive" in card ? (card.positive ? "text-lime-200" : "text-rose-300") : "text-emerald-50"
              }`}
            >
              {card.value}
            </p>
          </ReGlass>
        ))}
      </div>

      {/* —— MAIN STAGE ——
          Mobile: properties then actions (stacked)
          Tablet: properties 2-col + actions full width below
          Desktop: properties (2fr) | actions rail (1fr) side-by-side
      */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(16rem,0.85fr)] lg:items-start lg:gap-6">
        <div>
          <ReSectionTitle
            title="My Properties"
            subtitle={rows.length ? "Holdings preview" : "Add your first property"}
            action={
              rows.length > 3 ? (
                <button
                  type="button"
                  onClick={onOpenProperties}
                  className="text-[11px] font-black uppercase tracking-wide text-emerald-300"
                >
                  See all
                </button>
              ) : null
            }
          />

          {/* Empty */}
          {rows.length === 0 ? (
            <ReGlass className="p-5 text-center md:p-8">
              <p className="text-sm font-semibold text-emerald-200/60">No properties yet — start with Add Property.</p>
              <button
                type="button"
                onClick={onOpenAdd}
                className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-500 px-4 text-sm font-black text-emerald-950"
              >
                <Plus size={16} /> Add Property
              </button>
            </ReGlass>
          ) : (
            <>
              {/* Mobile list */}
              <div className="space-y-2.5 md:hidden">
                {previewMobile.map((row) => (
                  <PropertyPreviewCard key={row.id} row={row} onOpen={() => onOpenProperty(row.id)} compact />
                ))}
              </div>
              {/* Tablet / Desktop grid */}
              <div className="hidden gap-3 md:grid md:grid-cols-2 lg:gap-4">
                {previewWide.map((row) => (
                  <PropertyPreviewCard key={row.id} row={row} onOpen={() => onOpenProperty(row.id)} />
                ))}
              </div>
            </>
          )}
        </div>

        <div>
          <ReSectionTitle title="Quick Actions" />
          {/* Mobile / tablet: 2×2 */}
          <div className="grid grid-cols-2 gap-3 lg:hidden">
            <ReIconButton label="+ Add Property" icon={<Plus size={20} />} onClick={onOpenAdd} />
            <ReIconButton label="My Properties" icon={<Building2 size={20} />} onClick={onOpenProperties} tone="sky" />
            <ReIconButton label="Analytics" icon={<BarChart3 size={20} />} onClick={onOpenAnalytics} tone="amber" />
            <ResetAction onMutate={onMutate} />
          </div>
          {/* Desktop: vertical action stack */}
          <div className="hidden flex-col gap-3 lg:flex">
            <ReIconButton label="+ Add Property" icon={<Plus size={20} />} onClick={onOpenAdd} />
            <ReIconButton label="My Properties" icon={<Building2 size={20} />} onClick={onOpenProperties} tone="sky" />
            <ReIconButton label="Analytics" icon={<BarChart3 size={20} />} onClick={onOpenAnalytics} tone="amber" />
            <ResetAction onMutate={onMutate} />
          </div>
        </div>
      </div>
    </div>
  );
}

function GrowthChart({
  data,
  gradientId,
}: {
  data: { label: string; value: number }[];
  gradientId: string;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#34d399" stopOpacity={0.55} />
            <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
          </linearGradient>
        </defs>
        <YAxis hide domain={["dataMin", "dataMax"]} />
        <Tooltip
          contentStyle={{
            background: "#04140f",
            border: "1px solid rgba(52,211,153,0.25)",
            borderRadius: 12,
            fontSize: 11,
          }}
          formatter={(v: number) => [formatReStatMoney(v), "Value"]}
        />
        <Area type="monotone" dataKey="value" stroke="#6ee7b7" strokeWidth={2.2} fill={`url(#${gradientId})`} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function PropertyPreviewCard({
  row,
  onOpen,
  compact,
}: {
  row: RealEstateRow;
  onOpen: () => void;
  compact?: boolean;
}) {
  const m = propertyCardMetrics(row);
  const photos = realEstateAllPhotos(row);
  return (
    <ReGlass className={compact ? "p-3" : "p-3.5"} onClick={onOpen}>
      <div className={`flex ${compact ? "items-center gap-3" : "flex-col gap-3 md:flex-row md:items-center"}`}>
        <div
          className={`shrink-0 overflow-hidden rounded-2xl bg-emerald-950/80 ring-1 ring-emerald-400/20 ${
            compact ? "h-14 w-14" : "h-20 w-full md:h-16 md:w-16 lg:h-[4.5rem] lg:w-[4.5rem]"
          }`}
        >
          {photos[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photos[0]} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full place-items-center text-emerald-400/50">
              <Building2 size={22} />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-black text-emerald-50">{row.name || "Untitled property"}</p>
            <ReBadge>{RE_KIND_LABEL[row.propertyType]}</ReBadge>
          </div>
          <p className="mt-0.5 truncate text-[11px] font-semibold text-emerald-200/50">
            {row.location?.trim() || "Location not set"}
          </p>
          <p className="mt-1 text-xs font-bold tabular-nums text-lime-200/90">
            {formatReCcy(row.estimatedValue, row.currency)}
            {m.profit != null ? (
              <span className={m.profit >= 0 ? " text-lime-300" : " text-rose-300"}>
                {" "}
                · {formatReSignedCcy(m.profit, row.currency)}
              </span>
            ) : null}
          </p>
        </div>
      </div>
    </ReGlass>
  );
}

function ResetAction({
  onMutate,
}: {
  onMutate: (fn: (s: WealthPortfolioStateV2) => WealthPortfolioStateV2 | null) => boolean;
}) {
  return (
    <div className="flex min-h-[5.5rem] flex-col items-center justify-center gap-2 rounded-3xl border border-rose-400/25 bg-rose-500/10 px-3 py-3 text-center shadow-inner">
      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-black/30 text-rose-100 ring-1 ring-white/10">
        <RotateCcw size={20} />
      </span>
      <div className="[&_button]:border-0 [&_button]:bg-transparent [&_button]:px-0 [&_button]:py-0 [&_button]:text-[11px] [&_button]:font-black [&_button]:text-rose-100">
        <PortfolioModuleDataResetButton module="real_estate" onMutate={onMutate} />
      </div>
    </div>
  );
}
