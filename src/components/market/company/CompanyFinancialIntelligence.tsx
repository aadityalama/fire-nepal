"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CompanyMetricGrid, type CompanyMetricItem } from "@/components/market/company/CompanyMetricGrid";
import { formatFundamentalDate, formatFundamentalValue } from "@/lib/market/nepse-fundamentals-format";
import { DATA_UNAVAILABLE } from "@/types/market/nepse-company-fundamentals";
import type {
  NepseAnnualReportRow,
  NepseFinancialIntelligencePayload,
  NepseQuarterlyReportRow,
} from "@/types/market/nepse-financial-intelligence";

const TABS = [
  { id: "quarterly", label: "Quarterly" },
  { id: "annual", label: "Annual" },
  { id: "ratios", label: "Ratios" },
  { id: "dividends", label: "Dividends" },
  { id: "ownership", label: "Ownership" },
  { id: "peers", label: "Peers" },
  { id: "growth", label: "Growth" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const tableWrap = "overflow-x-auto rounded-2xl border border-slate-200/70 dark:border-white/[0.06]";
const theadCls =
  "bg-slate-50/90 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:bg-white/[0.03] dark:text-zinc-500";
const rowCls = "border-t border-slate-200/70 dark:border-white/[0.06]";
const cellCls = "px-3 py-2.5 tabular-nums text-slate-700 dark:text-zinc-300 whitespace-nowrap";
const labelCellCls = "px-3 py-2.5 font-bold text-slate-800 dark:text-zinc-200 whitespace-nowrap";
const noteCls = "mt-3 text-[11px] font-medium leading-relaxed text-slate-500 dark:text-zinc-500";

function GrowthBadge({ value }: { value: number | null }) {
  if (value == null || !Number.isFinite(value)) {
    return <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-600">{DATA_UNAVAILABLE}</span>;
  }
  const positive = value >= 0;
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-black tabular-nums ${
        positive
          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300"
          : "bg-rose-50 text-rose-700 dark:bg-rose-400/10 dark:text-rose-300"
      }`}
    >
      {positive ? "+" : ""}
      {value.toFixed(1)}%
    </span>
  );
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="grid min-h-32 place-items-center rounded-2xl border border-dashed border-slate-300/90 bg-slate-50/60 p-6 text-center dark:border-white/10 dark:bg-white/[0.02]">
      <div className="max-w-md">
        <p className="text-sm font-black text-slate-800 dark:text-zinc-200">{title}</p>
        <p className="mt-1.5 text-[11px] font-medium leading-relaxed text-slate-500 dark:text-zinc-500">{detail}</p>
      </div>
    </div>
  );
}

/** Minimal real-data bar trend — renders nothing synthetic when values are missing. */
function TrendBars({ title, points }: { title: string; points: { label: string; value: number | null }[] }) {
  const usable = points.filter((point) => point.value != null && Number.isFinite(point.value)) as {
    label: string;
    value: number;
  }[];
  if (usable.length < 2) {
    return (
      <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-3.5 dark:border-white/[0.06] dark:bg-white/[0.025]">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500 dark:text-zinc-500">{title}</p>
        <p className="mt-3 text-xs font-bold text-slate-400 dark:text-zinc-600">{DATA_UNAVAILABLE}</p>
      </div>
    );
  }
  const max = Math.max(...usable.map((point) => Math.abs(point.value)));
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-3.5 dark:border-white/[0.06] dark:bg-white/[0.025]">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500 dark:text-zinc-500">{title}</p>
      <div className="mt-3 flex h-24 items-end gap-1.5" role="img" aria-label={`${title} bar trend`}>
        {usable.map((point) => {
          const heightPct = max > 0 ? Math.max((Math.abs(point.value) / max) * 100, 4) : 4;
          const negative = point.value < 0;
          return (
            <div key={point.label} className="group flex min-w-0 flex-1 flex-col items-center gap-1" title={`${point.label}: ${point.value.toLocaleString("en-IN")}`}>
              <div
                className={`w-full rounded-t-md transition group-hover:brightness-110 ${negative ? "bg-rose-400/80" : "bg-emerald-500/80"}`}
                style={{ height: `${heightPct}%` }}
              />
              <span className="w-full truncate text-center text-[8px] font-bold text-slate-400 dark:text-zinc-600">{point.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function fyShort(fiscalYear: string): string {
  const match = fiscalYear.match(/^(\d{2})?(\d{2})[-/](\d{2})?(\d{2})$/);
  if (match) return `${match[2]}/${match[4]}`;
  return fiscalYear.length > 7 ? fiscalYear.slice(2) : fiscalYear;
}

function QuarterlyTab({ rows }: { rows: NepseQuarterlyReportRow[] }) {
  if (!rows.length) {
    return (
      <EmptyState
        title="No quarterly filings published yet"
        detail="Quarterly income statement detail (revenue, cash flow) appears once the company files reports with NEPSE. Nothing is estimated."
      />
    );
  }
  return (
    <div>
      <div className={tableWrap} data-testid="fi-quarterly-table">
        <table className="min-w-full text-left text-xs">
          <thead className={theadCls}>
            <tr>
              <th className="px-3 py-2.5">Period</th>
              <th className="px-3 py-2.5">EPS</th>
              <th className="px-3 py-2.5">EPS YoY</th>
              <th className="px-3 py-2.5">Net Profit</th>
              <th className="px-3 py-2.5">Profit YoY</th>
              <th className="px-3 py-2.5">Net Worth / Share</th>
              <th className="px-3 py-2.5">PE</th>
              <th className="px-3 py-2.5">Filed</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.fiscalYear}-${row.quarter}`} className={rowCls}>
                <td className={labelCellCls}>
                  {row.quarter} {fyShort(row.fiscalYear)}
                </td>
                <td className={cellCls}>{formatFundamentalValue(row.eps)}</td>
                <td className={cellCls}>
                  <GrowthBadge value={row.yoyEpsPct} />
                </td>
                <td className={cellCls}>{formatFundamentalValue(row.netProfitNpr, { style: "compactNpr" })}</td>
                <td className={cellCls}>
                  <GrowthBadge value={row.yoyProfitPct} />
                </td>
                <td className={cellCls}>{formatFundamentalValue(row.netWorthPerShareNpr, { style: "npr" })}</td>
                <td className={cellCls}>{formatFundamentalValue(row.pe)}</td>
                <td className={cellCls}>{formatFundamentalDate(row.submittedDate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={noteCls}>
        YoY compares the same quarter of the previous fiscal year — computed only when both filings exist. Line-item income
        statement, balance sheet and cash flow detail is not published by the configured provider, so it shows “{DATA_UNAVAILABLE}”.
      </p>
    </div>
  );
}

function AnnualTab({ rows }: { rows: NepseAnnualReportRow[] }) {
  if (!rows.length) {
    return (
      <EmptyState
        title="No annual reports published yet"
        detail="Up to 10 fiscal years of audited figures appear once annual reports are filed. Nothing is estimated."
      />
    );
  }
  const chronological = [...rows].reverse();
  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-3">
        <TrendBars title="EPS trend" points={chronological.map((row) => ({ label: fyShort(row.fiscalYear), value: row.eps }))} />
        <TrendBars
          title="Net profit trend"
          points={chronological.map((row) => ({ label: fyShort(row.fiscalYear), value: row.netProfitNpr }))}
        />
        <TrendBars
          title="Net worth / share trend"
          points={chronological.map((row) => ({ label: fyShort(row.fiscalYear), value: row.netWorthPerShareNpr }))}
        />
      </div>
      <div className={tableWrap} data-testid="fi-annual-table">
        <table className="min-w-full text-left text-xs">
          <thead className={theadCls}>
            <tr>
              <th className="px-3 py-2.5">Fiscal Year</th>
              <th className="px-3 py-2.5">Revenue</th>
              <th className="px-3 py-2.5">Net Profit</th>
              <th className="px-3 py-2.5">Profit YoY</th>
              <th className="px-3 py-2.5">EPS</th>
              <th className="px-3 py-2.5">Net Worth / Share</th>
              <th className="px-3 py-2.5">Assets</th>
              <th className="px-3 py-2.5">Liabilities</th>
              <th className="px-3 py-2.5">Equity / Reserves</th>
              <th className="px-3 py-2.5">Paid-up Capital</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.fiscalYear} className={rowCls}>
                <td className={labelCellCls}>{row.fiscalYear}</td>
                <td className={cellCls}>{formatFundamentalValue(row.revenueNpr, { style: "compactNpr" })}</td>
                <td className={cellCls}>{formatFundamentalValue(row.netProfitNpr, { style: "compactNpr" })}</td>
                <td className={cellCls}>
                  <GrowthBadge value={row.profitYoyPct} />
                </td>
                <td className={cellCls}>{formatFundamentalValue(row.eps)}</td>
                <td className={cellCls}>{formatFundamentalValue(row.netWorthPerShareNpr, { style: "npr" })}</td>
                <td className={cellCls}>{formatFundamentalValue(row.assetsNpr, { style: "compactNpr" })}</td>
                <td className={cellCls}>{formatFundamentalValue(row.liabilitiesNpr, { style: "compactNpr" })}</td>
                <td className={cellCls}>{formatFundamentalValue(row.equityNpr, { style: "compactNpr" })}</td>
                <td className={cellCls}>{formatFundamentalValue(row.paidUpCapitalNpr, { style: "compactNpr" })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={noteCls}>
        Revenue, assets, liabilities and equity totals are not part of the filing summary feed; those columns fill in once audited
        statement rows are ingested into the fundamental tables — never estimated.
      </p>
    </div>
  );
}

export function CompanyFinancialIntelligence({
  data,
  loaded,
}: {
  data: NepseFinancialIntelligencePayload | null;
  loaded: boolean;
}) {
  const [tab, setTab] = useState<TabId>("quarterly");

  const ratioItems = useMemo<CompanyMetricItem[]>(() => {
    const ratios = data?.ratios;
    return [
      { label: "EPS", value: ratios?.eps ?? null, hint: ratios?.asOfPeriod ?? undefined },
      { label: "PE Ratio", value: ratios?.pe ?? null },
      { label: "PB Ratio", value: ratios?.pb ?? null },
      { label: "Book Value / Share", value: ratios?.bookValuePerShareNpr ?? null, style: "npr" },
      { label: "ROE", value: ratios?.roePct ?? null, style: "pct" },
      { label: "ROA", value: ratios?.roaPct ?? null, style: "pct" },
      { label: "Net Profit Margin", value: ratios?.netProfitMarginPct ?? null, style: "pct" },
      { label: "Operating Margin", value: ratios?.operatingMarginPct ?? null, style: "pct" },
      { label: "Debt to Equity", value: ratios?.debtToEquity ?? null },
      { label: "Current Ratio", value: ratios?.currentRatio ?? null },
      { label: "Quick Ratio", value: ratios?.quickRatio ?? null },
    ];
  }, [data?.ratios]);

  const dividendTiles = useMemo<CompanyMetricItem[]>(() => {
    const dividends = data?.dividends;
    return [
      {
        label: "Cash Dividend Yield",
        value: dividends?.cashYieldPct ?? null,
        style: "pct",
        hint: dividends?.latestFiscalYear ? `FY ${dividends.latestFiscalYear} vs live price` : undefined,
      },
      { label: "Total Dividend Yield", value: dividends?.totalYieldPct ?? null, style: "pct" },
      { label: "Dividend CAGR (5Y)", value: dividends?.dividendCagr5yPct ?? null, style: "pct" },
      { label: "Dividend CAGR (10Y)", value: dividends?.dividendCagr10yPct ?? null, style: "pct" },
      { label: "Payout Ratio", value: dividends?.payoutRatioPct ?? null, style: "pct", hint: "Total dividend ÷ annual EPS" },
    ];
  }, [data?.dividends]);

  const ownershipTiles = useMemo<CompanyMetricItem[]>(() => {
    const shareholding = data?.shareholding;
    return [
      { label: "Promoters", value: shareholding?.promoterPct ?? null, style: "pct" },
      { label: "Public", value: shareholding?.publicPct ?? null, style: "pct" },
      { label: "Mutual Funds", value: shareholding?.mutualFundsPct ?? null, style: "pct" },
      { label: "Institutions", value: shareholding?.institutionsPct ?? null, style: "pct" },
      { label: "Foreign Investors", value: shareholding?.foreignPct ?? null, style: "pct" },
      { label: "Listed Shares", value: shareholding?.listedShares ?? null, style: "shares" },
    ];
  }, [data?.shareholding]);

  const growthTiles = useMemo<CompanyMetricItem[]>(() => {
    const growth = data?.growth;
    return [
      { label: "Revenue CAGR (5Y)", value: growth?.revenueCagr5yPct ?? null, style: "pct" },
      { label: "Revenue CAGR (10Y)", value: growth?.revenueCagr10yPct ?? null, style: "pct" },
      { label: "EPS CAGR (5Y)", value: growth?.epsCagr5yPct ?? null, style: "pct" },
      { label: "EPS CAGR (10Y)", value: growth?.epsCagr10yPct ?? null, style: "pct" },
      { label: "Profit CAGR (5Y)", value: growth?.profitCagr5yPct ?? null, style: "pct" },
      { label: "Profit CAGR (10Y)", value: growth?.profitCagr10yPct ?? null, style: "pct" },
      { label: "Net Worth Growth (5Y)", value: growth?.netWorthPerShareCagr5yPct ?? null, style: "pct" },
      { label: "Asset Growth (5Y)", value: growth?.assetCagr5yPct ?? null, style: "pct" },
    ];
  }, [data?.growth]);

  if (!loaded) {
    return (
      <div className="grid min-h-40 place-items-center rounded-2xl border border-slate-200/70 bg-slate-50/60 dark:border-white/[0.06] dark:bg-white/[0.02]">
        <p className="text-xs font-bold text-slate-500 dark:text-zinc-500">Loading financial intelligence…</p>
      </div>
    );
  }

  return (
    <div data-testid="company-financial-intelligence">
      <div className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto rounded-2xl bg-slate-100/80 p-1 dark:bg-white/[0.04]" role="tablist" aria-label="Financial intelligence sections">
        {TABS.map((item) => (
          <button
            type="button"
            key={item.id}
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            className={`shrink-0 rounded-xl px-3 py-2 text-[10px] font-black transition ${
              tab === item.id ? "bg-emerald-500 text-white shadow-sm" : "text-slate-500 hover:bg-white/70 dark:text-zinc-500 dark:hover:bg-white/[0.05]"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-3.5">
        {tab === "quarterly" ? <QuarterlyTab rows={data?.quarterly ?? []} /> : null}

        {tab === "annual" ? <AnnualTab rows={data?.annual ?? []} /> : null}

        {tab === "ratios" ? (
          <div>
            <CompanyMetricGrid items={ratioItems} className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4" testId="fi-ratios" />
            <p className={noteCls}>
              EPS, PE, PB, book value and ROE come from the latest published filing and the live price. Margin, leverage and
              liquidity ratios need full statement detail no configured provider publishes — “{DATA_UNAVAILABLE}” until ingested.
            </p>
          </div>
        ) : null}

        {tab === "dividends" ? (
          <div className="space-y-3">
            <CompanyMetricGrid items={dividendTiles} className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5" testId="fi-dividend-tiles" />
            {data?.dividends.rows.length ? (
              <div className={tableWrap} data-testid="fi-dividend-table">
                <table className="min-w-full text-left text-xs">
                  <thead className={theadCls}>
                    <tr>
                      <th className="px-3 py-2.5">Fiscal Year</th>
                      <th className="px-3 py-2.5">Cash %</th>
                      <th className="px-3 py-2.5">Bonus %</th>
                      <th className="px-3 py-2.5">Total %</th>
                      <th className="px-3 py-2.5">Announced</th>
                      <th className="px-3 py-2.5">Book Close</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.dividends.rows.map((row) => (
                      <tr key={row.fiscalYear} className={rowCls}>
                        <td className={labelCellCls}>{row.fiscalYear}</td>
                        <td className={cellCls}>{formatFundamentalValue(row.cashPct, { style: "pct" })}</td>
                        <td className={cellCls}>{formatFundamentalValue(row.bonusPct, { style: "pct" })}</td>
                        <td className={cellCls}>{formatFundamentalValue(row.totalPct, { style: "pct" })}</td>
                        <td className={cellCls}>{formatFundamentalDate(row.announcementDate)}</td>
                        <td className={cellCls}>{formatFundamentalDate(row.bookCloseDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState title="No dividend announcements found" detail="Cash and bonus history appears from real NEPSE announcements only." />
            )}
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500 dark:text-zinc-500">Rights share history</p>
              {data?.dividends.rightsEvents.length ? (
                <ul className="mt-2 space-y-1.5">
                  {data.dividends.rightsEvents.map((event, index) => (
                    <li key={`${event.title}-${index}`} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50/80 px-3 py-2 text-xs dark:bg-white/[0.03]">
                      <span className="font-bold text-slate-800 dark:text-zinc-200">{event.title}</span>
                      <span className="text-slate-500 dark:text-zinc-500">{formatFundamentalDate(event.date)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs font-bold text-slate-400 dark:text-zinc-600">{DATA_UNAVAILABLE}</p>
              )}
            </div>
            <p className={noteCls}>
              Dividend percentages follow the NEPSE convention (% of NPR 100 face value), so 12.5% equals रु 12.5 per share. Yield,
              CAGR and payout are derived only from those real announcements plus the live price.
            </p>
          </div>
        ) : null}

        {tab === "ownership" ? (
          <div>
            <CompanyMetricGrid items={ownershipTiles} className="grid grid-cols-2 gap-2 sm:grid-cols-3" testId="fi-ownership" />
            <p className={noteCls}>
              Promoter/public splits appear once the capital-structure feed is ingested. Mutual fund, institutional and foreign
              ownership breakdowns are not published by any configured provider — shown as “{DATA_UNAVAILABLE}”, never estimated.
            </p>
          </div>
        ) : null}

        {tab === "peers" ? (
          data?.peers.length ? (
            <div>
              <div className={tableWrap} data-testid="fi-peers-table">
                <table className="min-w-full text-left text-xs">
                  <thead className={theadCls}>
                    <tr>
                      <th className="px-3 py-2.5">Company</th>
                      <th className="px-3 py-2.5">Market Cap</th>
                      <th className="px-3 py-2.5">LTP</th>
                      <th className="px-3 py-2.5">PE</th>
                      <th className="px-3 py-2.5">PB</th>
                      <th className="px-3 py-2.5">EPS</th>
                      <th className="px-3 py-2.5">ROE</th>
                      <th className="px-3 py-2.5">Div Yield</th>
                      <th className="px-3 py-2.5">Book Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.peers.map((peer) => (
                      <tr
                        key={peer.symbol}
                        className={`${rowCls} ${peer.isSelf ? "bg-emerald-50/70 dark:bg-emerald-400/[0.06]" : ""}`}
                      >
                        <td className={labelCellCls}>
                          {peer.isSelf ? (
                            <span className="font-black text-emerald-700 dark:text-emerald-300">{peer.symbol} · this company</span>
                          ) : (
                            <Link href={`/market/company/${encodeURIComponent(peer.symbol)}`} className="font-black text-slate-900 underline-offset-2 hover:underline dark:text-white">
                              {peer.symbol}
                            </Link>
                          )}
                        </td>
                        <td className={cellCls}>{formatFundamentalValue(peer.marketCapNpr, { style: "compactNpr" })}</td>
                        <td className={cellCls}>{formatFundamentalValue(peer.ltpNpr, { style: "npr" })}</td>
                        <td className={cellCls}>{formatFundamentalValue(peer.pe)}</td>
                        <td className={cellCls}>{formatFundamentalValue(peer.pb)}</td>
                        <td className={cellCls}>{formatFundamentalValue(peer.eps)}</td>
                        <td className={cellCls}>{formatFundamentalValue(peer.roePct, { style: "pct" })}</td>
                        <td className={cellCls}>{formatFundamentalValue(peer.dividendYieldPct, { style: "pct" })}</td>
                        <td className={cellCls}>{formatFundamentalValue(peer.bookValuePerShareNpr, { style: "npr" })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className={noteCls}>
                Same-sector peers ranked by market cap{data?.sector ? ` (${data.sector})` : ""}. Ratios use each peer's latest real
                filing and live price — cells without filings show “{DATA_UNAVAILABLE}”.
              </p>
            </div>
          ) : (
            <EmptyState title="No sector peers resolved" detail="Peer comparison needs a live sector mapping for this symbol." />
          )
        ) : null}

        {tab === "growth" ? (
          <div>
            <CompanyMetricGrid items={growthTiles} className="grid grid-cols-2 gap-2 sm:grid-cols-4" testId="fi-growth" />
            <p className={noteCls}>
              CAGRs are computed only when both the start and end fiscal-year values exist in real filings
              {data?.growth.annualPeriods ? ` (${data.growth.annualPeriods} annual reports on record)` : ""}. Revenue and asset
              growth stay “{DATA_UNAVAILABLE}” until audited statement rows are ingested.
            </p>
          </div>
        ) : null}
      </div>

      {data?.sources.length ? (
        <p className="mt-4 text-[10px] font-semibold text-slate-400 dark:text-zinc-600">Sources: {data.sources.join(" · ")}</p>
      ) : null}
    </div>
  );
}
