"use client";

import { BarChart3, Building2, Plus, RotateCcw } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import { PortfolioModuleDataResetButton } from "@/components/fire-nepal/PortfolioModuleDataResetButton";
import {
  computeRealEstatePortfolioStats,
  formatReStatMoney,
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
import { propertyCardMetrics } from "@/components/portfolio/real-estate-portfolio-stats";

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
  const preview = rows.slice(0, 3);

  return (
    <div className="space-y-5">
      <ReGlass className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-400/80">FIRE Nepal</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-emerald-50 sm:text-4xl">Real Estate</h1>
            <p className="mt-2 max-w-sm text-sm font-semibold leading-snug text-emerald-200/65">
              Track. Analyze. Grow your Property Wealth.
            </p>
          </div>
          <div className="h-20 w-24 shrink-0 sm:h-24 sm:w-28">
            <PropertyIllustration />
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-emerald-400/15 bg-black/35 p-4">
            <p className="text-[10px] font-black uppercase tracking-wider text-emerald-200/55">Total Net Worth</p>
            <p className="mt-1 text-2xl font-black tabular-nums tracking-tight text-lime-200 sm:text-3xl">
              {formatReStatMoney(stats.currentMarketValueNpr)}
            </p>
            <p className="mt-2 text-xs font-semibold text-emerald-200/55">
              Yearly profit{" "}
              <span
                className={`font-black tabular-nums ${
                  (stats.yearlyProfitNpr ?? 0) >= 0 ? "text-lime-300" : "text-rose-300"
                }`}
              >
                {stats.yearlyProfitNpr == null ? "—" : formatReStatMoney(stats.yearlyProfitNpr)}
              </span>
            </p>
          </div>
          <div className="h-[7.5rem] rounded-2xl border border-emerald-400/15 bg-black/35 p-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="reDashGrow" x1="0" y1="0" x2="0" y2="1">
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
                <Area type="monotone" dataKey="value" stroke="#6ee7b7" strokeWidth={2.2} fill="url(#reDashGrow)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </ReGlass>

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Total Properties", value: String(stats.propertyCount) },
          { label: "Total Investment", value: formatReStatMoney(stats.totalInvestmentNpr) },
          { label: "Current Market Value", value: formatReStatMoney(stats.currentMarketValueNpr) },
          {
            label: "Total Profit",
            value: formatReStatMoney(stats.totalProfitNpr),
            positive: stats.totalProfitNpr >= 0,
          },
        ].map((card) => (
          <ReGlass key={card.label} className="p-3.5">
            <p className="text-[10px] font-black uppercase tracking-wider text-emerald-200/50">{card.label}</p>
            <p
              className={`mt-2 text-sm font-black tabular-nums leading-snug sm:text-base ${
                "positive" in card ? (card.positive ? "text-lime-200" : "text-rose-300") : "text-emerald-50"
              }`}
            >
              {card.value}
            </p>
          </ReGlass>
        ))}
      </div>

      <div>
        <ReSectionTitle
          title="My Properties"
          subtitle={rows.length ? "Top holdings preview" : "Add your first property"}
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
        {preview.length === 0 ? (
          <ReGlass className="p-5 text-center">
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
          <div className="space-y-2.5">
            {preview.map((row) => {
              const m = propertyCardMetrics(row);
              const photos = realEstateAllPhotos(row);
              return (
                <ReGlass key={row.id} className="p-3" onClick={() => onOpenProperty(row.id)}>
                  <div className="flex items-center gap-3">
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-emerald-950/80 ring-1 ring-emerald-400/20">
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
                      <div className="flex items-center gap-2">
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
            })}
          </div>
        )}
      </div>

      <div>
        <ReSectionTitle title="Quick Actions" />
        <div className="grid grid-cols-2 gap-3">
          <ReIconButton label="+ Add Property" icon={<Plus size={20} />} onClick={onOpenAdd} />
          <ReIconButton label="My Properties" icon={<Building2 size={20} />} onClick={onOpenProperties} tone="sky" />
          <ReIconButton label="Analytics" icon={<BarChart3 size={20} />} onClick={onOpenAnalytics} tone="amber" />
          <div className="flex min-h-[5.5rem] flex-col items-center justify-center gap-2 rounded-3xl border border-rose-400/25 bg-rose-500/10 px-3 py-3 text-center shadow-inner">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-black/30 text-rose-100 ring-1 ring-white/10">
              <RotateCcw size={20} />
            </span>
            <div className="[&_button]:border-0 [&_button]:bg-transparent [&_button]:px-0 [&_button]:py-0 [&_button]:text-[11px] [&_button]:font-black [&_button]:text-rose-100">
              <PortfolioModuleDataResetButton module="real_estate" onMutate={onMutate} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
