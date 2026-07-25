"use client";

import { ArrowLeft, BarChart3, RefreshCw, Star } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { useNepseNews } from "@/hooks/useNepseNews";
import { useNepseWatchlist } from "@/hooks/useNepseWatchlist";
import { formatCompactNpr, NEPSE_SERVICE_ITEMS, type NepseServiceSlug } from "@/lib/market/nepse-hub";
import { useRealtimeMarket } from "@/providers/realtime-provider";
import type { NepseSecurityTick, NepseTerminalSnapshot } from "@/types/market";

function rowsForService(
  slug: NepseServiceSlug,
  ticks: NepseSecurityTick[],
  term?: NepseTerminalSnapshot,
): NepseSecurityTick[] {
  if (slug === "top-gainers") return term?.topGainers ?? [];
  if (slug === "top-losers") return term?.topLosers ?? [];
  if (slug === "top-turnover") return term?.turnoverLeaders ?? [];
  if (slug === "top-volume" || slug === "live-trades") return term?.mostActive ?? [];
  return [...ticks].sort((a, b) => (b.turnoverNpr ?? 0) - (a.turnoverNpr ?? 0)).slice(0, 30);
}

export function NepseServicePage({ slug }: { slug: NepseServiceSlug }) {
  const { snapshot, status, error, reload } = useRealtimeMarket();
  const { isWatched, toggle } = useNepseWatchlist();
  const service = NEPSE_SERVICE_ITEMS.find((item) => item.slug === slug)!;
  const ticks = useMemo(() => Object.values(snapshot?.nepseBySymbol ?? {}), [snapshot?.nepseBySymbol]);
  const rows = useMemo(() => rowsForService(slug, ticks, snapshot?.nepseTerminal), [slug, ticks, snapshot?.nepseTerminal]);
  const supportedTable = ["top-gainers", "top-losers", "top-turnover", "top-volume", "live-trades", "market-depth"].includes(slug);
  const sectorPage = slug === "sector-performance";
  const heatMapPage = slug === "heat-map";
  const indexPage = slug === "market-indices";
  const heatTiles = useMemo(() => {
    if (!heatMapPage) return [];
    return [...ticks]
      .filter((tick) => tick.ltpNpr > 0)
      .sort((a, b) => (b.turnoverNpr ?? 0) - (a.turnoverNpr ?? 0))
      .slice(0, 96);
  }, [heatMapPage, ticks]);
  const sectorTurnoverMax = useMemo(
    () => Math.max(1, ...(snapshot?.nepseTerminal?.sectorPerformance ?? []).map((sector) => sector.turnoverNpr)),
    [snapshot?.nepseTerminal?.sectorPerformance],
  );
  const newsDrivenPage = slug === "corporate-actions" || slug === "ipo-results";
  const news = useNepseNews();
  const newsRows = useMemo(() => {
    if (!newsDrivenPage) return [];
    if (slug === "ipo-results") return news.corporateActions.filter((item) => item.category === "IPO");
    return news.corporateActions;
  }, [newsDrivenPage, slug, news.corporateActions]);

  return (
    <main className="min-h-screen bg-[#f4f8f6] px-3 py-4 text-slate-950 dark:bg-[#030a08] dark:text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-5 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/market" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 dark:border-white/10 dark:bg-white/[0.05] dark:text-zinc-300" aria-label="Back to NEPSE Hub">
              <ArrowLeft size={17} />
            </Link>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-400">FIRE Nepal · NEPSE Hub</p>
              <h1 className="truncate text-xl font-black tracking-tight sm:text-2xl">{service.label}</h1>
            </div>
          </div>
          <button type="button" onClick={reload} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 dark:border-white/10 dark:bg-white/[0.05] dark:text-zinc-300" aria-label="Refresh">
            <RefreshCw size={15} className={status === "loading" ? "animate-spin" : ""} />
          </button>
        </header>

        <div className="mb-5 rounded-[1.5rem] border border-emerald-400/15 bg-[radial-gradient(circle_at_0%_0%,rgba(52,211,153,0.18),transparent_35%),linear-gradient(145deg,#063126,#06120f)] p-5 text-white sm:p-7">
          <p className="text-xs font-bold text-emerald-200/60">{service.description}</p>
          <h2 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">{service.label}</h2>
          <p className="mt-2 max-w-2xl text-xs font-medium leading-relaxed text-emerald-50/60">
            Powered by the normalized FIRE Nepal market snapshot. Values refresh automatically with the configured NEPSE feed.
          </p>
        </div>

        {error ? <p className="mb-3 rounded-xl border border-amber-300/30 bg-amber-50 p-3 text-xs font-semibold text-amber-900 dark:bg-amber-300/10 dark:text-amber-200">{error}</p> : null}

        {sectorPage ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(snapshot?.nepseTerminal?.sectorPerformance ?? []).map((sector) => {
              const positive = sector.avgChangePct >= 0;
              return (
                <div
                  key={sector.sector}
                  className={`rounded-2xl border p-4 ${
                    positive
                      ? "border-emerald-300/50 bg-emerald-50 dark:border-emerald-400/15 dark:bg-emerald-400/[0.07]"
                      : "border-rose-300/50 bg-rose-50 dark:border-rose-400/15 dark:bg-rose-400/[0.07]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-black">{sector.sector}</p>
                    <p className={`text-sm font-black ${positive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                      {positive ? "+" : ""}{sector.avgChangePct.toFixed(2)}%
                    </p>
                  </div>
                  <p className="mt-3 text-[10px] font-bold text-slate-500 dark:text-zinc-500">
                    {sector.constituents} companies · {formatCompactNpr(sector.turnoverNpr)}
                  </p>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200/60 dark:bg-white/[0.06]">
                    <div
                      className={positive ? "h-full rounded-full bg-emerald-400" : "h-full rounded-full bg-rose-400"}
                      style={{ width: `${Math.max(4, (sector.turnoverNpr / sectorTurnoverMax) * 100)}%` }}
                      aria-hidden
                    />
                  </div>
                  <p className="mt-1 text-[9px] font-bold text-slate-400 dark:text-zinc-600">Turnover share vs top sector</p>
                </div>
              );
            })}
          </div>
        ) : heatMapPage ? (
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-3 text-[10px] font-bold text-slate-500 dark:text-zinc-500">
              <span>Top {heatTiles.length} companies by turnover · color = today&apos;s change</span>
              <span className="ml-auto inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-rose-500" /> −3%+
                <span className="ml-2 h-2.5 w-2.5 rounded-sm bg-slate-300 dark:bg-zinc-700" /> flat
                <span className="ml-2 h-2.5 w-2.5 rounded-sm bg-emerald-500" /> +3%+
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6 lg:grid-cols-8">
              {heatTiles.map((tick) => {
                const change = tick.changePct ?? 0;
                const intensity = Math.min(Math.abs(change) / 3, 1);
                const background =
                  change >= 0
                    ? `rgba(16, 185, 129, ${0.15 + intensity * 0.75})`
                    : `rgba(244, 63, 94, ${0.15 + intensity * 0.75})`;
                return (
                  <Link
                    key={tick.symbol}
                    href={`/market/company/${tick.symbol}`}
                    style={{ backgroundColor: background }}
                    className="group rounded-lg p-2 transition hover:scale-[1.04] hover:shadow-lg"
                    title={`${tick.symbol} · ${change >= 0 ? "+" : ""}${change.toFixed(2)}%`}
                  >
                    <p className={`truncate text-[10px] font-black ${intensity > 0.45 ? "text-white" : "text-slate-900 dark:text-white"}`}>{tick.symbol}</p>
                    <p className={`text-[9px] font-bold tabular-nums ${intensity > 0.45 ? "text-white/85" : "text-slate-700 dark:text-zinc-300"}`}>
                      {change >= 0 ? "+" : ""}{change.toFixed(1)}%
                    </p>
                  </Link>
                );
              })}
            </div>
            {!heatTiles.length ? (
              <p className="rounded-[1.5rem] border border-dashed border-slate-300 p-10 text-center text-xs font-semibold text-slate-500 dark:border-white/10">
                Waiting for live quotes to paint the heat map.
              </p>
            ) : null}
          </div>
        ) : indexPage ? (
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.04]">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">NEPSE Index</p>
            <p className="mt-2 text-4xl font-black tabular-nums">{snapshot?.nepseIndex?.value.toLocaleString("en-IN", { minimumFractionDigits: 2 }) ?? "—"}</p>
            <p className={`mt-2 text-sm font-black ${(snapshot?.nepseIndex?.changePct ?? 0) >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
              {snapshot?.nepseIndex?.changePct == null ? "Change unavailable" : `${snapshot.nepseIndex.changePct >= 0 ? "+" : ""}${snapshot.nepseIndex.changePct.toFixed(2)}%`}
            </p>
            <p className="mt-8 text-xs text-slate-500 dark:text-zinc-500">Sub-index history will populate when the configured provider exposes normalized index constituents.</p>
          </div>
        ) : supportedTable ? (
          <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.035]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left">
                <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:border-white/[0.07] dark:bg-white/[0.025] dark:text-zinc-500">
                  <tr>
                    <th className="px-4 py-3">Company</th>
                    <th className="px-3 py-3 text-right">LTP</th>
                    <th className="px-3 py-3 text-right">Change</th>
                    <th className="px-3 py-3 text-right">Volume</th>
                    <th className="px-3 py-3 text-right">Turnover</th>
                    <th className="px-4 py-3 text-right">Watch</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/[0.05]">
                  {rows.map((tick) => (
                    <tr key={tick.symbol} className="text-xs transition hover:bg-emerald-500/[0.04]">
                      <td className="px-4 py-3">
                        <Link href={`/market/company/${tick.symbol}`} className="font-black text-slate-950 hover:text-emerald-700 dark:text-white dark:hover:text-emerald-300">{tick.symbol}</Link>
                        <p className="mt-0.5 max-w-52 truncate text-[10px] font-medium text-slate-500 dark:text-zinc-500">{tick.companyName}</p>
                      </td>
                      <td className="px-3 py-3 text-right font-bold tabular-nums">रु {tick.ltpNpr.toLocaleString("en-IN")}</td>
                      <td className={`px-3 py-3 text-right font-black tabular-nums ${(tick.changePct ?? 0) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                        {tick.changePct == null ? "—" : `${tick.changePct >= 0 ? "+" : ""}${tick.changePct.toFixed(2)}%`}
                      </td>
                      <td className="px-3 py-3 text-right font-semibold tabular-nums text-slate-600 dark:text-zinc-300">{tick.volume?.toLocaleString("en-IN") ?? "—"}</td>
                      <td className="px-3 py-3 text-right font-semibold tabular-nums text-slate-600 dark:text-zinc-300">{formatCompactNpr(tick.turnoverNpr)}</td>
                      <td className="px-4 py-3 text-right">
                        <button type="button" onClick={() => toggle(tick.symbol)} className={isWatched(tick.symbol) ? "text-amber-400" : "text-slate-300 dark:text-zinc-700"} aria-label={`${isWatched(tick.symbol) ? "Remove" : "Add"} ${tick.symbol} ${isWatched(tick.symbol) ? "from" : "to"} watchlist`}>
                          <Star size={16} fill={isWatched(tick.symbol) ? "currentColor" : "none"} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!rows.length ? <p className="p-10 text-center text-xs font-semibold text-slate-500">Waiting for market rows from the live feed.</p> : null}
          </div>
        ) : newsDrivenPage && newsRows.length ? (
          <div className="space-y-2">
            {newsRows.map((item) => (
              <a
                key={item.id}
                href={item.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-emerald-400/35 dark:border-white/10 dark:bg-white/[0.035]"
              >
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
                <div className="min-w-0">
                  <p className="text-sm font-extrabold leading-snug">{item.headline}</p>
                  {item.summary ? (
                    <p className="mt-1 line-clamp-2 text-[11px] font-medium leading-relaxed text-slate-500 dark:text-zinc-500">{item.summary}</p>
                  ) : null}
                  <p className="mt-2 text-[10px] font-bold text-slate-400 dark:text-zinc-600">
                    {item.sourceName} · {item.category}
                    {item.publishedAt ? ` · ${new Date(item.publishedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}` : ""}
                  </p>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <div className="grid min-h-72 place-items-center rounded-[1.5rem] border border-dashed border-slate-300 bg-white/60 p-8 text-center dark:border-white/10 dark:bg-white/[0.025]">
            <div className="max-w-md">
              <BarChart3 className="mx-auto h-8 w-8 text-emerald-500" />
              <h2 className="mt-3 text-lg font-black">Module foundation ready</h2>
              <p className="mt-2 text-xs font-medium leading-relaxed text-slate-500 dark:text-zinc-500">
                This dedicated route is ready for the configured floorsheet, broker-activity, IPO, corporate-action or order-book provider. FIRE Nepal does not fabricate unavailable exchange data.
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
