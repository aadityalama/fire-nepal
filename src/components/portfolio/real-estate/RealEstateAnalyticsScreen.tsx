"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  computeRealEstatePortfolioStats,
  formatReStatMoney,
  propertyCardMetrics,
} from "@/components/portfolio/real-estate-portfolio-stats";
import type { RealEstateRow } from "@/components/portfolio/types";
import {
  buildGrowthSeries,
  formatReCcy,
  ReGlass,
  ReSectionTitle,
  RE_KIND_LABEL,
} from "@/components/portfolio/real-estate/RealEstateUi";

export function RealEstateAnalyticsScreen({
  rows,
  krwPerNpr,
  usdPerNpr,
  onOpenProperty,
}: {
  rows: RealEstateRow[];
  krwPerNpr: number;
  usdPerNpr: number;
  onOpenProperty: (id: string) => void;
}) {
  const stats = computeRealEstatePortfolioStats(rows, krwPerNpr, usdPerNpr);
  const portfolioSeries = buildGrowthSeries(
    stats.totalInvestmentNpr || undefined,
    stats.currentMarketValueNpr || undefined,
    12,
  );

  const allocation = rows
    .map((r) => {
      const m = propertyCardMetrics(r);
      return {
        id: r.id,
        name: r.name || RE_KIND_LABEL[r.propertyType],
        value: r.estimatedValue ?? 0,
        currency: r.currency,
        roi: m.roi,
        cagr: m.cagr,
        yield: m.rentalYield,
      };
    })
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value);

  const kpi = [
    { label: "Market value", value: formatReStatMoney(stats.currentMarketValueNpr), tone: "lime" as const },
    {
      label: "Total ROI",
      value: stats.totalRoiPct != null ? `${stats.totalRoiPct.toFixed(1)}%` : "—",
      tone: "neutral" as const,
    },
    {
      label: "Profit",
      value: formatReStatMoney(stats.totalProfitNpr),
      tone: stats.totalProfitNpr >= 0 ? ("lime" as const) : ("rose" as const),
    },
    {
      label: "Yearly profit",
      value: stats.yearlyProfitNpr == null ? "—" : formatReStatMoney(stats.yearlyProfitNpr),
      tone: "neutral" as const,
    },
  ];

  return (
    <div className="space-y-5 md:space-y-6">
      <ReSectionTitle title="Analytics" subtitle="Portfolio-wide property performance" />

      {/* Mobile: 2×2 KPIs then chart then list */}
      <div className="grid grid-cols-2 gap-3 md:hidden">
        {kpi.map((c) => (
          <Kpi key={c.label} {...c} />
        ))}
      </div>
      <ReGlass className="p-4 md:hidden">
        <p className="mb-3 text-xs font-black uppercase tracking-wider text-emerald-200/55">Portfolio growth</p>
        <div className="h-48">
          <GrowthChart data={portfolioSeries} />
        </div>
      </ReGlass>

      {/* Tablet: KPIs row + chart below */}
      <div className="hidden gap-4 md:grid md:grid-cols-4 lg:hidden">
        {kpi.map((c) => (
          <Kpi key={c.label} {...c} />
        ))}
      </div>
      <ReGlass className="hidden p-5 md:block lg:hidden">
        <p className="mb-3 text-xs font-black uppercase tracking-wider text-emerald-200/55">Portfolio growth</p>
        <div className="h-56">
          <GrowthChart data={portfolioSeries} />
        </div>
      </ReGlass>

      {/* Desktop: chart (left 2/3) + KPI column (right 1/3) */}
      <div className="hidden gap-5 lg:grid lg:grid-cols-[minmax(0,1.7fr)_minmax(14rem,0.85fr)]">
        <ReGlass className="p-6">
          <p className="mb-4 text-xs font-black uppercase tracking-wider text-emerald-200/55">Portfolio growth</p>
          <div className="h-72">
            <GrowthChart data={portfolioSeries} />
          </div>
        </ReGlass>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          {kpi.map((c) => (
            <Kpi key={c.label} {...c} large />
          ))}
        </div>
      </div>

      <div>
        <ReSectionTitle title="By property" subtitle="Open a row for property-level analytics" />
        {allocation.length === 0 ? (
          <ReGlass className="p-5 text-center text-sm font-semibold text-emerald-200/55">
            Add property values to unlock allocation analytics.
          </ReGlass>
        ) : (
          <>
            {/* Mobile / tablet stacked */}
            <div className="space-y-2.5 lg:hidden">
              {allocation.map((item) => (
                <AllocationRow key={item.id} item={item} onOpen={() => onOpenProperty(item.id)} />
              ))}
            </div>
            {/* Desktop table-like grid */}
            <div className="hidden overflow-hidden rounded-3xl border border-emerald-400/15 lg:block">
              <div className="grid grid-cols-[minmax(0,1.4fr)_1fr_0.7fr_0.7fr_0.7fr] gap-3 border-b border-emerald-400/10 bg-black/40 px-5 py-3 text-[10px] font-black uppercase tracking-wider text-emerald-200/45">
                <span>Property</span>
                <span>Market value</span>
                <span>ROI</span>
                <span>CAGR</span>
                <span>Yield</span>
              </div>
              {allocation.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onOpenProperty(item.id)}
                  className="grid w-full grid-cols-[minmax(0,1.4fr)_1fr_0.7fr_0.7fr_0.7fr] gap-3 border-b border-emerald-400/10 bg-black/20 px-5 py-3.5 text-left transition hover:bg-emerald-500/10 last:border-b-0"
                >
                  <span className="truncate text-sm font-black text-emerald-50">{item.name}</span>
                  <span className="text-sm font-black tabular-nums text-lime-200">
                    {formatReCcy(item.value, item.currency)}
                  </span>
                  <span
                    className={`text-sm font-bold tabular-nums ${(item.roi ?? 0) >= 0 ? "text-lime-300" : "text-rose-300"}`}
                  >
                    {item.roi != null ? `${item.roi >= 0 ? "+" : ""}${item.roi.toFixed(1)}%` : "—"}
                  </span>
                  <span className="text-sm font-bold tabular-nums text-emerald-100">
                    {item.cagr != null ? `${item.cagr.toFixed(1)}%` : "—"}
                  </span>
                  <span className="text-sm font-bold tabular-nums text-emerald-200/80">
                    {item.yield != null ? `${item.yield.toFixed(1)}%` : "—"}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  tone,
  large,
}: {
  label: string;
  value: string;
  tone: "lime" | "rose" | "neutral";
  large?: boolean;
}) {
  return (
    <ReGlass className={large ? "p-5" : "p-3.5"}>
      <p className="text-[10px] font-black uppercase tracking-wider text-emerald-200/50">{label}</p>
      <p
        className={`mt-1.5 font-black tabular-nums ${large ? "text-xl" : "text-base"} ${
          tone === "lime" ? "text-lime-200" : tone === "rose" ? "text-rose-300" : "text-emerald-50"
        }`}
      >
        {value}
      </p>
    </ReGlass>
  );
}

function GrowthChart({ data }: { data: { label: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="rePortGrow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#34d399" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="rgba(52,211,153,0.08)" vertical={false} />
        <XAxis dataKey="label" tick={{ fill: "rgba(167,243,208,0.45)", fontSize: 10 }} axisLine={false} tickLine={false} />
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
        <Area type="monotone" dataKey="value" stroke="#6ee7b7" strokeWidth={2.4} fill="url(#rePortGrow)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function AllocationRow({
  item,
  onOpen,
}: {
  item: {
    id: string;
    name: string;
    value: number;
    currency: string;
    roi: number | null;
    cagr: number | null;
    yield: number | null;
  };
  onOpen: () => void;
}) {
  return (
    <ReGlass className="p-3.5" onClick={onOpen}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-emerald-50">{item.name}</p>
          <p className="mt-1 text-[11px] font-bold tabular-nums text-emerald-200/55">
            CAGR {item.cagr != null ? `${item.cagr.toFixed(1)}%` : "—"} · Yield{" "}
            {item.yield != null ? `${item.yield.toFixed(1)}%` : "—"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-black tabular-nums text-lime-200">{formatReCcy(item.value, item.currency)}</p>
          <p className={`text-[11px] font-bold tabular-nums ${(item.roi ?? 0) >= 0 ? "text-lime-300" : "text-rose-300"}`}>
            ROI {item.roi != null ? `${item.roi >= 0 ? "+" : ""}${item.roi.toFixed(1)}%` : "—"}
          </p>
        </div>
      </div>
    </ReGlass>
  );
}
