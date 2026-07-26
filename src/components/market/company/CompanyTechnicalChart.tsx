"use client";

import { LineChart, Maximize2, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { bollingerBands, emaSeries, sma, type Candle } from "@/lib/market/technical-indicators";
import { DATA_UNAVAILABLE } from "@/types/market/nepse-company-fundamentals";
import type { NepseOhlcBar } from "@/services/market/nepse-company-ohlc";

type ChartMode = "line" | "candlestick";
type ChartRange = "1W" | "1M" | "3M" | "6M" | "1Y" | "ALL";

const RANGES: { id: ChartRange; bars: number | null; label: string }[] = [
  { id: "1W", bars: 7, label: "1W" },
  { id: "1M", bars: 22, label: "1M" },
  { id: "3M", bars: 66, label: "3M" },
  { id: "6M", bars: 132, label: "6M" },
  { id: "1Y", bars: 252, label: "1Y" },
  { id: "ALL", bars: null, label: "ALL" },
];

const OVERLAYS = ["SMA", "EMA", "Bollinger", "Volume"] as const;

function pointsPath(points: { px: number; py: number }[]): string {
  if (!points.length) return "";
  return points.map((point, index) => `${index === 0 ? "M" : "L"}${point.px.toFixed(2)},${point.py.toFixed(2)}`).join(" ");
}

function sliceBars(bars: NepseOhlcBar[], range: ChartRange): NepseOhlcBar[] {
  const rule = RANGES.find((item) => item.id === range);
  if (!rule?.bars) return bars;
  return bars.slice(Math.max(0, bars.length - rule.bars));
}

function rollingSma(closes: number[], period: number): (number | null)[] {
  return closes.map((_, index) => {
    if (index + 1 < period) return null;
    return sma(closes.slice(0, index + 1), period);
  });
}

export function CompanyTechnicalChart({
  bars,
  loaded,
}: {
  bars: NepseOhlcBar[];
  loaded: boolean;
}) {
  const [mode, setMode] = useState<ChartMode>("candlestick");
  const [range, setRange] = useState<ChartRange>("3M");
  const [overlays, setOverlays] = useState<string[]>(["EMA", "Volume"]);
  const [fullscreen, setFullscreen] = useState(false);
  const [crosshair, setCrosshair] = useState<number | null>(null);
  const frameRef = useRef<HTMLDivElement>(null);

  const visible = useMemo(() => sliceBars(bars, range), [bars, range]);
  const candles = useMemo<Candle[]>(
    () => visible.map((bar) => ({ open: bar.open, high: bar.high, low: bar.low, close: bar.close, volume: bar.volume })),
    [visible],
  );
  const closes = useMemo(() => candles.map((c) => c.close), [candles]);
  const positive = (visible.at(-1)?.changePct ?? (visible.length > 1 ? visible.at(-1)!.close - visible.at(-2)!.close : 0)) >= 0;
  const color = positive ? "#34d399" : "#fb7185";

  const chart = useMemo(() => {
    if (!visible.length) return [];
    const min = Math.min(...visible.map((bar) => bar.low));
    const max = Math.max(...visible.map((bar) => bar.high));
    const span = Math.max(max - min, 0.01);
    const maxVol = Math.max(1, ...visible.map((bar) => bar.volume));
    return visible.map((bar, index) => ({
      ...bar,
      px: 12 + (index / Math.max(visible.length - 1, 1)) * 776,
      py: 18 + ((max - bar.close) / span) * 168,
      openY: 18 + ((max - bar.open) / span) * 168,
      highY: 18 + ((max - bar.high) / span) * 168,
      lowY: 18 + ((max - bar.low) / span) * 168,
      volH: (bar.volume / maxVol) * 42,
    }));
  }, [visible]);

  const smaSeries = useMemo(() => rollingSma(closes, 20), [closes]);
  const emaOverlay = useMemo(() => {
    const series = emaSeries(closes, 20);
    const pad = closes.length - series.length;
    return closes.map((_, index) => (index < pad ? null : series[index - pad]));
  }, [closes]);
  const bbOverlay = useMemo(() => {
    if (closes.length < 20) return { upper: [] as (number | null)[], middle: [] as (number | null)[], lower: [] as (number | null)[] };
    const upper: (number | null)[] = [];
    const middle: (number | null)[] = [];
    const lower: (number | null)[] = [];
    for (let i = 0; i < closes.length; i++) {
      if (i + 1 < 20) {
        upper.push(null);
        middle.push(null);
        lower.push(null);
        continue;
      }
      const band = bollingerBands(closes.slice(0, i + 1), 20, 2);
      upper.push(band?.upper ?? null);
      middle.push(band?.middle ?? null);
      lower.push(band?.lower ?? null);
    }
    return { upper, middle, lower };
  }, [closes]);

  const priceMin = visible.length ? Math.min(...visible.map((b) => b.low)) : 0;
  const priceMax = visible.length ? Math.max(...visible.map((b) => b.high)) : 1;
  const priceSpan = Math.max(priceMax - priceMin, 0.01);

  function yFor(price: number | null): number | null {
    if (price == null) return null;
    return 18 + ((priceMax - price) / priceSpan) * 168;
  }

  function overlayPath(values: (number | null)[]): string {
    const points: { px: number; py: number }[] = [];
    values.forEach((value, index) => {
      const py = yFor(value);
      if (py == null || !chart[index]) return;
      points.push({ px: chart[index].px, py });
    });
    return pointsPath(points);
  }

  const selected = crosshair == null ? null : chart[crosshair];

  function updateCrosshair(clientX: number) {
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect || !chart.length) return;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    setCrosshair(Math.round(ratio * (chart.length - 1)));
  }

  function toggleOverlay(name: string) {
    setOverlays((current) => (current.includes(name) ? current.filter((item) => item !== name) : [...current, name]));
  }

  return (
    <section
      className={`overflow-hidden border border-slate-200/80 bg-white/90 shadow-[0_24px_80px_-42px_rgba(5,46,34,0.35)] backdrop-blur-2xl dark:border-white/[0.08] dark:bg-[#071411]/90 ${
        fullscreen ? "fixed inset-0 z-[90] rounded-none p-4 sm:p-7" : "rounded-[1.5rem]"
      }`}
      aria-label="Company technical chart"
      data-testid="company-technical-chart"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 px-4 py-3 dark:border-white/[0.07] sm:px-5">
        <div>
          <div className="flex items-center gap-2">
            <LineChart className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
            <h3 className="text-sm font-bold tracking-tight text-slate-950 dark:text-white">Interactive Chart</h3>
          </div>
          <p className="mt-0.5 text-[10px] font-medium text-slate-500 dark:text-zinc-500">
            {loaded
              ? visible.length
                ? `${visible.length} EOD sessions from nepse_eod_prices`
                : DATA_UNAVAILABLE
              : "Loading EOD history…"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setFullscreen((open) => !open)}
          className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 transition hover:border-emerald-300 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-zinc-400"
          aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
        >
          {fullscreen ? <X size={15} /> : <Maximize2 size={15} />}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200/70 px-4 py-2.5 dark:border-white/[0.07] sm:px-5">
        <div className="flex rounded-xl bg-slate-100 p-0.5 dark:bg-black/25" role="group" aria-label="Chart mode">
          {([
            ["candlestick", "Candle"],
            ["line", "Line"],
          ] as const).map(([id, label]) => (
            <button
              type="button"
              key={id}
              onClick={() => setMode(id)}
              className={`rounded-[0.65rem] px-3 py-1.5 text-[10px] font-black transition ${
                mode === id ? "bg-white text-slate-950 shadow-sm dark:bg-white/10 dark:text-white" : "text-slate-500 dark:text-zinc-500"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1" role="group" aria-label="Chart range">
          {RANGES.map((item) => (
            <button
              type="button"
              key={item.id}
              onClick={() => setRange(item.id)}
              className={`rounded-lg px-2.5 py-1 text-[10px] font-black transition ${
                range === item.id
                  ? "bg-emerald-500 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/[0.04] dark:text-zinc-400"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex flex-wrap gap-1">
          {OVERLAYS.map((name) => (
            <button
              type="button"
              key={name}
              onClick={() => toggleOverlay(name)}
              className={`rounded-lg px-2.5 py-1 text-[10px] font-black transition ${
                overlays.includes(name)
                  ? "bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-400/40 dark:text-emerald-300"
                  : "bg-slate-100 text-slate-500 dark:bg-white/[0.04] dark:text-zinc-500"
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      {!visible.length ? (
        <div className="grid min-h-[280px] place-items-center p-8 text-center">
          <div>
            <p className="text-sm font-black text-slate-800 dark:text-zinc-200">{DATA_UNAVAILABLE}</p>
            <p className="mt-1.5 max-w-sm text-[11px] font-medium text-slate-500 dark:text-zinc-500">
              Candlestick and line charts render only after EOD bars are ingested into nepse_eod_prices. No synthetic series is shown.
            </p>
          </div>
        </div>
      ) : (
        <>
          {selected ? (
            <div className="flex flex-wrap gap-x-4 gap-y-1 border-b border-slate-200/70 px-4 py-2 text-[10px] font-bold tabular-nums text-slate-600 dark:border-white/[0.07] dark:text-zinc-400 sm:px-5">
              <span>{selected.tradeDate}</span>
              <span>O {selected.open.toFixed(2)}</span>
              <span>H {selected.high.toFixed(2)}</span>
              <span>L {selected.low.toFixed(2)}</span>
              <span>C {selected.close.toFixed(2)}</span>
              <span>V {selected.volume.toLocaleString("en-IN")}</span>
            </div>
          ) : null}
          <div
            ref={frameRef}
            className="relative touch-pan-y px-2 pb-3 pt-2 sm:px-3"
            onPointerMove={(event) => updateCrosshair(event.clientX)}
            onPointerLeave={() => setCrosshair(null)}
          >
            <svg viewBox="0 0 800 250" className="h-[250px] w-full" role="img" aria-label="EOD price chart">
              {overlays.includes("Volume")
                ? chart.map((bar) => (
                    <rect
                      key={`v-${bar.tradeDate}`}
                      x={bar.px - 1.4}
                      y={248 - bar.volH}
                      width={2.8}
                      height={bar.volH}
                      fill={bar.close >= bar.open ? "rgba(52,211,153,0.28)" : "rgba(251,113,133,0.28)"}
                    />
                  ))
                : null}

              {mode === "line" ? (
                <path d={pointsPath(chart)} fill="none" stroke={color} strokeWidth="2.2" strokeLinejoin="round" />
              ) : (
                chart.map((bar) => {
                  const up = bar.close >= bar.open;
                  const bodyTop = Math.min(bar.openY, bar.py);
                  const bodyH = Math.max(Math.abs(bar.openY - bar.py), 1.2);
                  return (
                    <g key={bar.tradeDate}>
                      <line x1={bar.px} x2={bar.px} y1={bar.highY} y2={bar.lowY} stroke={up ? "#34d399" : "#fb7185"} strokeWidth="1.2" />
                      <rect x={bar.px - 2.2} y={bodyTop} width="4.4" height={bodyH} fill={up ? "#34d399" : "#fb7185"} rx="0.6" />
                    </g>
                  );
                })
              )}

              {overlays.includes("SMA") ? <path d={overlayPath(smaSeries)} fill="none" stroke="#38bdf8" strokeWidth="1.4" /> : null}
              {overlays.includes("EMA") ? <path d={overlayPath(emaOverlay)} fill="none" stroke="#a78bfa" strokeWidth="1.4" /> : null}
              {overlays.includes("Bollinger") ? (
                <>
                  <path d={overlayPath(bbOverlay.upper)} fill="none" stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 3" />
                  <path d={overlayPath(bbOverlay.middle)} fill="none" stroke="#64748b" strokeWidth="1" />
                  <path d={overlayPath(bbOverlay.lower)} fill="none" stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 3" />
                </>
              ) : null}

              {selected ? (
                <>
                  <line x1={selected.px} x2={selected.px} y1="8" y2="248" stroke="rgba(148,163,184,0.55)" strokeDasharray="3 3" />
                  <circle cx={selected.px} cy={selected.py} r="3.5" fill={color} />
                </>
              ) : null}
            </svg>
          </div>
        </>
      )}
    </section>
  );
}
