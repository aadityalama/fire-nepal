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

  return (
    <div className="space-y-5">
      <ReSectionTitle title="Analytics" subtitle="Portfolio-wide property performance" />

      <div className="grid grid-cols-2 gap-3">
        <ReGlass className="p-3.5">
          <p className="text-[10px] font-black uppercase tracking-wider text-emerald-200/50">Market value</p>
          <p className="mt-1.5 text-base font-black tabular-nums text-lime-200">{formatReStatMoney(stats.currentMarketValueNpr)}</p>
        </ReGlass>
        <ReGlass className="p-3.5">
          <p className="text-[10px] font-black uppercase tracking-wider text-emerald-200/50">Total ROI</p>
          <p className="mt-1.5 text-base font-black tabular-nums text-emerald-50">
            {stats.totalRoiPct != null ? `${stats.totalRoiPct.toFixed(1)}%` : "—"}
          </p>
        </ReGlass>
        <ReGlass className="p-3.5">
          <p className="text-[10px] font-black uppercase tracking-wider text-emerald-200/50">Profit</p>
          <p
            className={`mt-1.5 text-base font-black tabular-nums ${
              stats.totalProfitNpr >= 0 ? "text-lime-200" : "text-rose-300"
            }`}
          >
            {formatReStatMoney(stats.totalProfitNpr)}
          </p>
        </ReGlass>
        <ReGlass className="p-3.5">
          <p className="text-[10px] font-black uppercase tracking-wider text-emerald-200/50">Yearly profit</p>
          <p className="mt-1.5 text-base font-black tabular-nums text-emerald-50">
            {stats.yearlyProfitNpr == null ? "—" : formatReStatMoney(stats.yearlyProfitNpr)}
          </p>
        </ReGlass>
      </div>

      <ReGlass className="p-4">
        <p className="mb-3 text-xs font-black uppercase tracking-wider text-emerald-200/55">Portfolio growth</p>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={portfolioSeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
        </div>
      </ReGlass>

      <div>
        <ReSectionTitle title="By property" subtitle="Tap a row for detail analytics" />
        {allocation.length === 0 ? (
          <ReGlass className="p-5 text-center text-sm font-semibold text-emerald-200/55">
            Add property values to unlock allocation analytics.
          </ReGlass>
        ) : (
          <div className="space-y-2.5">
            {allocation.map((item) => (
              <ReGlass key={item.id} className="p-3.5" onClick={() => onOpenProperty(item.id)}>
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
                    <p
                      className={`text-[11px] font-bold tabular-nums ${
                        (item.roi ?? 0) >= 0 ? "text-lime-300" : "text-rose-300"
                      }`}
                    >
                      ROI {item.roi != null ? `${item.roi >= 0 ? "+" : ""}${item.roi.toFixed(1)}%` : "—"}
                    </p>
                  </div>
                </div>
              </ReGlass>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
