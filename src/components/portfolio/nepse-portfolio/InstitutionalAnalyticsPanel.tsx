"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMoney } from "@/lib/expense-utils";
import {
  buildInstitutionalPortfolioAnalytics,
  type AllocationSlice,
  type InstitutionalPortfolioAnalytics,
  type PortfolioMarketContext,
} from "@/lib/portfolio/institutional-analytics";
import type { InvestmentRow, PortfolioLedgerEntry } from "@/components/portfolio/types";
import { DATA_UNAVAILABLE } from "@/types/market/nepse-company-fundamentals";
import {
  formatSignedPct,
  type NepseHoldingRow,
  type NepsePortfolioSummary,
} from "./nepse-portfolio-metrics";
import { NEPSE_GLASS } from "./NepsePortfolioUi";

const DONUT = ["#34d399", "#2dd4bf", "#fbbf24", "#60a5fa", "#f472b6", "#a3e635", "#c084fc", "#fb7185"];

function fmtMetric(value: number | null | undefined, kind: "money" | "pct" | "num" | "ratio" = "num"): string {
  if (value == null || !Number.isFinite(value)) return DATA_UNAVAILABLE;
  if (kind === "money") return formatMoney(value, "NPR");
  if (kind === "pct") return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
  if (kind === "ratio") return value.toFixed(2);
  return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function MetricCard({
  label,
  value,
  tone,
  unavailableReason,
}: {
  label: string;
  value: string;
  tone?: "pos" | "neg" | "neutral";
  /** Shown under the value when the metric could not be calculated from real history. */
  unavailableReason?: string | null;
}) {
  const isUnavailable = value === DATA_UNAVAILABLE;
  const color =
    tone === "pos" ? "text-emerald-400" : tone === "neg" ? "text-rose-400/90" : "text-white";
  return (
    <div className={`${NEPSE_GLASS} px-3 py-3`}>
      <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-zinc-500">{label}</p>
      {isUnavailable && unavailableReason ? (
        <p className="mt-1.5 text-[11px] font-semibold leading-snug text-zinc-500">{unavailableReason}</p>
      ) : (
        <p className={`mt-1.5 truncate text-sm font-black tabular-nums tracking-tight sm:text-[15px] ${color}`}>
          {value}
        </p>
      )}
    </div>
  );
}

function Section({ title, children, hint }: { title: string; children: ReactNode; hint?: string }) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400">{title}</h3>
        {hint ? <p className="mt-1 text-[10px] font-medium leading-relaxed text-zinc-600">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

function toneFromNumber(value: number | null | undefined): "pos" | "neg" | "neutral" {
  if (value == null || !Number.isFinite(value)) return "neutral";
  if (value > 0) return "pos";
  if (value < 0) return "neg";
  return "neutral";
}

function DonutBlock({ title, slices }: { title: string; slices: AllocationSlice[] }) {
  const data = slices.map((s, i) => ({
    name: s.label,
    value: s.valueNpr,
    pct: s.weightPct,
    color: DONUT[i % DONUT.length]!,
  }));
  if (!data.length) {
    return (
      <div className={`${NEPSE_GLASS} p-4`}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">{title}</p>
        <p className="mt-3 text-xs font-semibold text-zinc-500">{DATA_UNAVAILABLE}</p>
      </div>
    );
  }
  return (
    <div className={`${NEPSE_GLASS} p-4`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">{title}</p>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative mx-auto h-36 w-36 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius="58%"
                outerRadius="82%"
                paddingAngle={2}
                stroke="#020617"
                strokeWidth={1.5}
              >
                {data.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="min-w-0 flex-1 space-y-1.5">
          {data.slice(0, 6).map((row) => (
            <li key={row.name} className="flex items-center justify-between gap-2 text-[11px]">
              <span className="flex min-w-0 items-center gap-2">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: row.color }} />
                <span className="truncate font-semibold text-zinc-300">{row.name}</span>
              </span>
              <span className="shrink-0 font-bold tabular-nums text-white">{row.pct.toFixed(1)}%</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function LineBlock({
  title,
  data,
  dataKey,
  empty,
  seriesId,
}: {
  title: string;
  data: Record<string, string | number>[];
  dataKey: string;
  empty?: string;
  seriesId: string;
}) {
  return (
    <div className={`${NEPSE_GLASS} p-4`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">{title}</p>
      {data.length < 2 ? (
        <p className="mt-6 px-2 text-center text-xs font-semibold leading-snug text-zinc-500">
          {empty ?? DATA_UNAVAILABLE}
        </p>
      ) : (
        <div className="mt-3 h-40 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`ia-${seriesId}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34d399" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="date" hide />
              <YAxis hide domain={["auto", "auto"]} />
              <Tooltip
                contentStyle={{
                  background: "rgba(2,6,23,0.96)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 12,
                  fontSize: 11,
                }}
              />
              <Area type="monotone" dataKey={dataKey} stroke="#34d399" fill={`url(#ia-${seriesId})`} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item} className={`${NEPSE_GLASS} px-3.5 py-2.5 text-[12px] font-medium leading-relaxed text-zinc-300`}>
          {item}
        </li>
      ))}
    </ul>
  );
}

export function InstitutionalAnalyticsPanel({
  analytics,
  loading,
}: {
  analytics: InstitutionalPortfolioAnalytics | null;
  loading?: boolean;
}) {
  if (!analytics) {
    return (
      <div className={`${NEPSE_GLASS} px-4 py-10 text-center text-sm font-semibold text-zinc-500`}>
        {loading
          ? "Loading published market history…"
          : "Add a holding to unlock institutional portfolio analytics."}
      </div>
    );
  }

  const p = analytics.performance;
  const r = analytics.risk;
  const income = analytics.income;
  const intel = analytics.intelligence;
  const scen = analytics.scenarios;

  return (
    <div className="space-y-7" data-testid="institutional-portfolio-analytics">
      {loading ? (
        <p className="text-[11px] font-semibold text-emerald-400/80">Refreshing published market history…</p>
      ) : null}

      <Section title="Performance dashboard" hint="Calculated from your holdings, ledger cashflows, and published EOD closes.">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          <MetricCard label="Total portfolio value" value={fmtMetric(p.totalPortfolioValueNpr, "money")} />
          <MetricCard label="Total invested" value={fmtMetric(p.totalInvestedNpr, "money")} />
          <MetricCard label="Unrealized P/L" value={fmtMetric(p.unrealizedGainNpr, "money")} tone={toneFromNumber(p.unrealizedGainNpr)} />
          <MetricCard label="Realized P/L" value={fmtMetric(p.realizedGainNpr, "money")} tone={toneFromNumber(p.realizedGainNpr)} />
          <MetricCard label="Total return %" value={fmtMetric(p.totalReturnPct, "pct")} tone={toneFromNumber(p.totalReturnPct)} />
          <MetricCard label="XIRR" value={fmtMetric(p.xirrPct, "pct")} tone={toneFromNumber(p.xirrPct)} />
          <MetricCard label="CAGR" value={fmtMetric(p.cagrPct, "pct")} tone={toneFromNumber(p.cagrPct)} />
          <MetricCard label="Annualized return" value={fmtMetric(p.annualizedReturnPct, "pct")} tone={toneFromNumber(p.annualizedReturnPct)} />
          <MetricCard label="Daily change" value={fmtMetric(p.dailyChangePct, "pct")} tone={toneFromNumber(p.dailyChangePct)} />
          <MetricCard label="Weekly change" value={fmtMetric(p.weeklyChangePct, "pct")} tone={toneFromNumber(p.weeklyChangePct)} />
          <MetricCard label="Monthly change" value={fmtMetric(p.monthlyChangePct, "pct")} tone={toneFromNumber(p.monthlyChangePct)} />
          <MetricCard label="Yearly change" value={fmtMetric(p.yearlyChangePct, "pct")} tone={toneFromNumber(p.yearlyChangePct)} />
        </div>
      </Section>

      <Section
        title="Asset allocation"
        hint={
          analytics.allocation.topConcentrationPct != null
            ? `Top concentration ${analytics.allocation.topConcentrationPct.toFixed(1)}%`
            : undefined
        }
      >
        <div className="grid gap-3 lg:grid-cols-2">
          <DonutBlock title="Sector allocation" slices={analytics.allocation.sector} />
          <DonutBlock title="Company allocation" slices={analytics.allocation.company} />
          <DonutBlock title="Market cap allocation" slices={analytics.allocation.marketCap} />
          <DonutBlock title="Asset class allocation" slices={analytics.allocation.assetClass} />
        </div>
      </Section>

      <Section title="Risk analysis" hint="Volatility, drawdown and ratios require a reconstructed equity curve from EOD history.">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          <MetricCard
            label="Portfolio beta"
            value={fmtMetric(r.portfolioBeta, "ratio")}
            unavailableReason={analytics.history.riskUnavailable.portfolioBeta}
          />
          <MetricCard
            label="Volatility (ann.)"
            value={fmtMetric(r.portfolioVolatilityPct, "pct")}
            unavailableReason={analytics.history.riskUnavailable.portfolioVolatilityPct}
          />
          <MetricCard
            label="Max drawdown"
            value={fmtMetric(r.maximumDrawdownPct, "pct")}
            unavailableReason={analytics.history.riskUnavailable.maximumDrawdownPct}
          />
          <MetricCard
            label="Sharpe ratio"
            value={fmtMetric(r.sharpeRatio, "ratio")}
            unavailableReason={analytics.history.riskUnavailable.sharpeRatio}
          />
          <MetricCard
            label="Sortino ratio"
            value={fmtMetric(r.sortinoRatio, "ratio")}
            unavailableReason={analytics.history.riskUnavailable.sortinoRatio}
          />
          <MetricCard label="Diversification score" value={fmtMetric(r.diversificationScore, "num")} />
          <MetricCard label="Concentration risk" value={fmtMetric(r.concentrationRiskPct, "pct")} />
          <MetricCard
            label="Risk score (0–100)"
            value={fmtMetric(r.riskScore, "num")}
            unavailableReason={analytics.history.riskUnavailable.riskScore}
          />
        </div>
      </Section>

      <Section title="Performance charts">
        <div className="grid gap-3 lg:grid-cols-2">
          <LineBlock
            title="Portfolio growth"
            seriesId="growth"
            data={analytics.charts.growth.map((pt) => ({ date: pt.date, value: pt.portfolioValueNpr }))}
            dataKey="value"
            empty={analytics.history.chartsUnavailableMessage}
          />
          <div className={`${NEPSE_GLASS} p-4`}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Invested vs current</p>
            {analytics.charts.investedVsCurrent.length < 2 ? (
              <p className="mt-6 text-center text-xs font-semibold text-zinc-500">
                {analytics.history.chartsUnavailableMessage}
              </p>
            ) : (
              <div className="mt-3 h-40 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics.charts.investedVsCurrent}>
                    <XAxis dataKey="date" hide />
                    <YAxis hide domain={["auto", "auto"]} />
                    <Tooltip
                      contentStyle={{
                        background: "rgba(2,6,23,0.96)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: 12,
                        fontSize: 11,
                      }}
                    />
                    <Line type="monotone" dataKey="investedNpr" stroke="#64748b" strokeWidth={1.5} dot={false} name="Invested" />
                    <Line type="monotone" dataKey="currentNpr" stroke="#34d399" strokeWidth={2} dot={false} name="Current" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
          <LineBlock
            title="Profit / loss history"
            seriesId="pnl"
            data={analytics.charts.pnlHistory.map((pt) => ({ date: pt.date, value: pt.pnlNpr }))}
            dataKey="value"
            empty={analytics.history.chartsUnavailableMessage}
          />
          <LineBlock
            title="Daily equity curve"
            seriesId="equity"
            data={analytics.charts.dailyEquity.map((pt) => ({ date: pt.date, value: pt.portfolioValueNpr }))}
            dataKey="value"
            empty={analytics.history.chartsUnavailableMessage}
          />
          <LineBlock
            title="Drawdown"
            seriesId="drawdown"
            data={analytics.charts.drawdown.map((pt) => ({ date: pt.date, value: -pt.drawdownPct }))}
            dataKey="value"
            empty={analytics.history.chartsUnavailableMessage}
          />
          <LineBlock
            title="Dividend income history"
            seriesId="div"
            data={analytics.charts.dividendIncome.map((pt) => ({ date: pt.period, value: pt.amountNpr }))}
            dataKey="value"
            empty="No booked cash dividend transactions in the portfolio ledger yet."
          />
        </div>
      </Section>

      <Section title="Income analytics" hint="Booked ledger dividends + officially published cash dividend % only.">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <MetricCard label="Dividend income (monthly)" value={fmtMetric(income.dividendIncomeMonthlyNpr, "money")} />
          <MetricCard label="Dividend income (yearly)" value={fmtMetric(income.dividendIncomeYearlyNpr, "money")} />
          <MetricCard label="Dividend yield" value={fmtMetric(income.dividendYieldPct, "pct")} />
          <MetricCard label="Yield on cost" value={fmtMetric(income.yieldOnCostPct, "pct")} />
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          <div className={`${NEPSE_GLASS} p-4`}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Upcoming / expected calendar</p>
            {!income.upcomingDividends.length ? (
              <p className="mt-3 text-xs font-semibold text-zinc-500">{DATA_UNAVAILABLE}</p>
            ) : (
              <ul className="mt-3 divide-y divide-white/[0.06]">
                {income.upcomingDividends.map((row) => (
                  <li key={`${row.symbol}-${row.fiscalYear}`} className="flex items-center justify-between gap-2 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-black text-white">{row.symbol}</p>
                      <p className="text-[10px] font-semibold text-zinc-500">
                        FY {row.fiscalYear} · book close {row.bookCloseDate ?? DATA_UNAVAILABLE}
                        {row.cashPct != null ? ` · cash ${row.cashPct}%` : ""}
                      </p>
                    </div>
                    <p className="text-xs font-bold tabular-nums text-emerald-400">
                      {fmtMetric(row.expectedCashNpr, "money")}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className={`${NEPSE_GLASS} p-4`}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Dividend by company</p>
            {!income.dividendContribution.length ? (
              <p className="mt-3 text-xs font-semibold text-zinc-500">{DATA_UNAVAILABLE}</p>
            ) : (
              <ul className="mt-3 divide-y divide-white/[0.06]">
                {income.dividendContribution.map((row) => (
                  <li key={row.symbol} className="flex items-center justify-between gap-2 py-2.5">
                    <span className="text-sm font-black text-white">{row.symbol}</span>
                    <span className="text-xs font-bold tabular-nums text-zinc-300">
                      {formatMoney(row.amountNpr, "NPR")} · {row.weightPct.toFixed(1)}%
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Section>

      <Section title="AI portfolio intelligence" hint="Deterministic scoring from holdings and market data — no LLM.">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <MetricCard label="Portfolio health score" value={fmtMetric(intel.portfolioHealthScore, "num")} />
          <MetricCard label="Diversification score" value={fmtMetric(intel.diversificationScore, "num")} />
          <MetricCard label="Sector concentration" value={intel.sectorConcentration} />
        </div>
        <div className={`${NEPSE_GLASS} px-4 py-3`}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Risk summary</p>
          <p className="mt-2 text-sm font-medium leading-relaxed text-zinc-200">{intel.riskSummary}</p>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Top performing</p>
            {!intel.topPerforming.length ? (
              <p className="text-xs font-semibold text-zinc-500">{DATA_UNAVAILABLE}</p>
            ) : (
              <ul className="space-y-1.5">
                {intel.topPerforming.map((h) => (
                  <li key={h.symbol} className={`${NEPSE_GLASS} flex justify-between px-3 py-2 text-xs`}>
                    <span className="font-black text-white">{h.symbol}</span>
                    <span className="font-bold text-emerald-400">{formatSignedPct(h.returnPct)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Worst performing</p>
            {!intel.worstPerforming.length ? (
              <p className="text-xs font-semibold text-zinc-500">{DATA_UNAVAILABLE}</p>
            ) : (
              <ul className="space-y-1.5">
                {intel.worstPerforming.map((h) => (
                  <li key={h.symbol} className={`${NEPSE_GLASS} flex justify-between px-3 py-2 text-xs`}>
                    <span className="font-black text-white">{h.symbol}</span>
                    <span className="font-bold text-rose-400">{formatSignedPct(h.returnPct)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Strengths</p>
            <BulletList items={intel.strengths} />
          </div>
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Weaknesses</p>
            <BulletList items={intel.weaknesses} />
          </div>
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Suggested rebalancing</p>
            <BulletList items={intel.suggestedRebalancing} />
          </div>
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Dividend opportunities</p>
            <BulletList items={intel.dividendOpportunities} />
          </div>
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Value opportunities</p>
            <BulletList items={intel.valueOpportunities} />
          </div>
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Growth opportunities</p>
            <BulletList items={intel.growthOpportunities} />
          </div>
        </div>
      </Section>

      <Section title="Scenario analysis" hint={scen.assumptions.note}>
        <div className={`${NEPSE_GLASS} mb-3 px-4 py-3 text-[11px] font-medium leading-relaxed text-zinc-400`}>
          Assumptions: bull +{scen.assumptions.bullReturnPct}% · base +{scen.assumptions.baseReturnPct}% · bear{" "}
          {scen.assumptions.bearReturnPct}% · inflation {scen.assumptions.inflationPct}% · crash −
          {scen.assumptions.crashLevelsPct.join("% / −")}% · recovery {scen.assumptions.recoveryHorizonYears}y at base rate.
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <MetricCard label="Bull scenario" value={fmtMetric(scen.bullValueNpr, "money")} tone="pos" />
          <MetricCard label="Base scenario" value={fmtMetric(scen.baseValueNpr, "money")} />
          <MetricCard label="Bear scenario" value={fmtMetric(scen.bearValueNpr, "money")} tone="neg" />
          <MetricCard label="Inflation impact (real)" value={fmtMetric(scen.inflationImpactNpr, "money")} />
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {scen.crashImpacts.map((c) => (
            <MetricCard
              key={c.dropPct}
              label={`Market crash −${c.dropPct}%`}
              value={fmtMetric(c.valueNpr, "money")}
              tone="neg"
            />
          ))}
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {scen.recoveryValues.map((c) => (
            <MetricCard
              key={c.fromCrashPct}
              label={`Recovery ${c.afterYears}y from −${c.fromCrashPct}%`}
              value={fmtMetric(c.valueNpr, "money")}
            />
          ))}
        </div>
      </Section>

      <Section title="Portfolio benchmark" hint="Alpha / relative return use overlapping index EOD when available; otherwise session change or Data unavailable.">
        <div className="space-y-2">
          {analytics.benchmarks.map((b) => (
            <div key={b.indexKey} className={`${NEPSE_GLASS} px-4 py-3`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-black text-white">{b.label}</p>
                {b.status === "unavailable" ? (
                  <p className="text-xs font-semibold text-zinc-500">{DATA_UNAVAILABLE}</p>
                ) : (
                  <p className={`text-xs font-bold tabular-nums ${b.outperformance ? "text-emerald-400" : "text-rose-400"}`}>
                    {b.outperformance ? "Outperformance" : "Underperformance"} · rel{" "}
                    {formatSignedPct(b.relativeReturnPct)}
                  </p>
                )}
              </div>
              {b.status === "ok" ? (
                <dl className="mt-2 grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4">
                  <div>
                    <dt className="text-zinc-500">Index</dt>
                    <dd className="font-bold tabular-nums text-zinc-200">{formatSignedPct(b.indexReturnPct)}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Portfolio</dt>
                    <dd className="font-bold tabular-nums text-zinc-200">{formatSignedPct(b.portfolioReturnPct)}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Relative</dt>
                    <dd className="font-bold tabular-nums text-zinc-200">{formatSignedPct(b.relativeReturnPct)}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Alpha</dt>
                    <dd className="font-bold tabular-nums text-zinc-200">{formatSignedPct(b.alphaPct)}</dd>
                  </div>
                </dl>
              ) : null}
              {b.message ? <p className="mt-2 text-[10px] font-medium text-zinc-600">{b.message}</p> : null}
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

/** Hook used by the dashboard to share equity curve with the hero chart. */
export function useInstitutionalAnalytics(args: {
  summary: NepsePortfolioSummary;
  holdings: NepseHoldingRow[];
  rows: InvestmentRow[];
  ledger: readonly PortfolioLedgerEntry[];
}): {
  analytics: InstitutionalPortfolioAnalytics | null;
  loading: boolean;
} {
  const { summary, holdings, rows, ledger } = args;
  const symbolsKey = useMemo(
    () =>
      [...new Set(holdings.map((h) => h.symbol).filter((s) => s && s !== "—"))]
        .sort()
        .join("|"),
    [holdings],
  );
  const [market, setMarket] = useState<PortfolioMarketContext | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!symbolsKey) {
      setMarket(null);
      return;
    }
    const symbols = symbolsKey.split("|").filter(Boolean);
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/market/nepse/portfolio-analytics-context", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ symbols }),
        });
        const json = (await res.json()) as { ok?: boolean; context?: PortfolioMarketContext };
        if (!cancelled && json.ok && json.context) setMarket(json.context);
      } catch {
        if (!cancelled) setMarket(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [symbolsKey]);

  const analytics = useMemo(() => {
    if (!holdings.length) return null;
    return buildInstitutionalPortfolioAnalytics({ summary, holdings, rows, ledger, market });
  }, [summary, holdings, rows, ledger, market]);

  return { analytics, loading };
}
