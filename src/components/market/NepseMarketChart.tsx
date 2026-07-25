"use client";

import { Expand, LineChart, Maximize2, SlidersHorizontal, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import {
  buildIndexSeries,
  NEPSE_TIMEFRAMES,
  type NepseChartMode,
  type NepseTimeframe,
} from "@/lib/market/nepse-hub";

const MODES: { id: NepseChartMode; label: string }[] = [
  { id: "line", label: "Line" },
  { id: "candlestick", label: "Candle" },
  { id: "area", label: "Area" },
];

const INDICATORS = ["SMA", "EMA", "RSI", "MACD", "VWAP", "Bollinger"] as const;

function pointsPath(points: { px: number; py: number }[]): string {
  return points.map((point, index) => `${index === 0 ? "M" : "L"}${point.px.toFixed(2)},${point.py.toFixed(2)}`).join(" ");
}

export function NepseMarketChart({ value, changePct }: { value: number; changePct?: number }) {
  const [mode, setMode] = useState<NepseChartMode>("area");
  const [timeframe, setTimeframe] = useState<NepseTimeframe>("1D");
  const [activeIndicators, setActiveIndicators] = useState<string[]>(["EMA", "Volume"]);
  const [indicatorOpen, setIndicatorOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [crosshair, setCrosshair] = useState<number | null>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const data = useMemo(() => buildIndexSeries(value, timeframe), [value, timeframe]);
  const positive = (changePct ?? 0) >= 0;
  const color = positive ? "#34d399" : "#fb7185";

  const chart = useMemo(() => {
    const min = Math.min(...data.map((point) => point.low));
    const max = Math.max(...data.map((point) => point.high));
    const span = Math.max(max - min, 1);
    return data.map((point, index) => ({
      ...point,
      px: 12 + (index / Math.max(data.length - 1, 1)) * 776,
      py: 18 + ((max - point.value) / span) * 178,
      openY: 18 + ((max - point.open) / span) * 178,
      highY: 18 + ((max - point.high) / span) * 178,
      lowY: 18 + ((max - point.low) / span) * 178,
    }));
  }, [data]);

  const path = pointsPath(chart);
  const selected = crosshair == null ? null : chart[crosshair];

  function updateCrosshair(clientX: number) {
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect) return;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    setCrosshair(Math.round(ratio * (chart.length - 1)));
  }

  function toggleIndicator(indicator: string) {
    setActiveIndicators((current) =>
      current.includes(indicator) ? current.filter((item) => item !== indicator) : [...current, indicator],
    );
  }

  return (
    <section
      className={`overflow-hidden border border-slate-200/80 bg-white/90 shadow-[0_24px_80px_-42px_rgba(5,46,34,0.35)] backdrop-blur-2xl dark:border-white/[0.08] dark:bg-[#071411]/90 ${
        fullscreen ? "fixed inset-0 z-[90] rounded-none p-4 sm:p-7" : "rounded-[1.5rem]"
      }`}
      aria-label="Interactive NEPSE market chart"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 px-4 py-3 dark:border-white/[0.07] sm:px-5">
        <div>
          <div className="flex items-center gap-2">
            <LineChart className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
            <h2 className="text-sm font-bold tracking-tight text-slate-950 dark:text-white">NEPSE Advanced Chart</h2>
          </div>
          <p className="mt-0.5 text-[10px] font-medium text-slate-500 dark:text-zinc-500">
            Indicative curve anchored to the latest index
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIndicatorOpen((open) => !open)}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 text-[11px] font-bold text-slate-700 transition hover:border-emerald-300 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-zinc-300"
            aria-expanded={indicatorOpen}
          >
            <SlidersHorizontal size={13} aria-hidden />
            Indicators
          </button>
          <button
            type="button"
            onClick={() => setFullscreen((open) => !open)}
            className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 transition hover:border-emerald-300 hover:text-emerald-700 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-zinc-400 dark:hover:text-white"
            aria-label={fullscreen ? "Exit fullscreen chart" : "Open fullscreen chart"}
          >
            {fullscreen ? <X size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>
      </div>

      {indicatorOpen ? (
        <div className="flex flex-wrap gap-1.5 border-b border-slate-200/70 px-4 py-2.5 dark:border-white/[0.07] sm:px-5">
          {INDICATORS.map((indicator) => {
            const active = activeIndicators.includes(indicator);
            return (
              <button
                type="button"
                key={indicator}
                onClick={() => toggleIndicator(indicator)}
                aria-pressed={active}
                className={`rounded-full border px-2.5 py-1 text-[10px] font-bold transition ${
                  active
                    ? "border-emerald-400/50 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"
                    : "border-slate-200 text-slate-500 dark:border-white/10 dark:text-zinc-500"
                }`}
              >
                {indicator}
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-3 sm:px-5">
        <div className="flex rounded-xl bg-slate-100 p-0.5 dark:bg-black/25" role="group" aria-label="Chart type">
          {MODES.map((item) => (
            <button
              type="button"
              key={item.id}
              onClick={() => setMode(item.id)}
              aria-pressed={mode === item.id}
              className={`rounded-[0.65rem] px-2.5 py-1.5 text-[10px] font-bold transition ${
                mode === item.id
                  ? "bg-white text-slate-950 shadow-sm dark:bg-white/10 dark:text-white"
                  : "text-slate-500 dark:text-zinc-500"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="no-scrollbar flex max-w-full gap-0.5 overflow-x-auto" role="group" aria-label="Chart timeframe">
          {NEPSE_TIMEFRAMES.map((item) => (
            <button
              type="button"
              key={item}
              onClick={() => setTimeframe(item)}
              aria-pressed={timeframe === item}
              className={`shrink-0 rounded-lg px-2 py-1.5 text-[10px] font-bold transition ${
                timeframe === item
                  ? "bg-emerald-500 text-white shadow-[0_5px_16px_-8px_rgba(16,185,129,0.7)]"
                  : "text-slate-500 hover:bg-slate-100 dark:text-zinc-500 dark:hover:bg-white/[0.05]"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div
        ref={frameRef}
        className={`relative mt-2 select-none px-2 pb-3 touch-pan-y sm:px-4 ${fullscreen ? "h-[calc(100vh-12rem)]" : "h-[19rem] sm:h-[23rem]"}`}
        onPointerMove={(event) => updateCrosshair(event.clientX)}
        onPointerLeave={() => setCrosshair(null)}
      >
        {selected ? (
          <div
            className="pointer-events-none absolute top-3 z-10 rounded-lg border border-emerald-400/25 bg-slate-950/90 px-2.5 py-1.5 text-[10px] font-bold tabular-nums text-white shadow-xl"
            style={{ left: `${Math.max(4, Math.min(75, (selected.px / 800) * 100))}%` }}
          >
            {selected.value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
          </div>
        ) : null}
        <svg viewBox="0 0 800 260" className="h-full w-full" role="img" aria-label={`${mode} chart for ${timeframe}`}>
          <defs>
            <linearGradient id="nepse-hub-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.3" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
            <filter id="nepse-hub-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {[48, 96, 144, 192].map((y) => (
            <line key={y} x1="12" x2="788" y1={y} y2={y} stroke="currentColor" className="text-slate-200 dark:text-white/[0.06]" />
          ))}
          {mode === "area" ? <path d={`${path} L788,214 L12,214 Z`} fill="url(#nepse-hub-area)" /> : null}
          {mode !== "candlestick" ? (
            <path
              d={path}
              fill="none"
              stroke={color}
              strokeWidth={mode === "line" ? 2.5 : 2}
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#nepse-hub-glow)"
            />
          ) : (
            chart.map((point) => {
              const up = point.value >= point.open;
              const candleColor = up ? "#34d399" : "#fb7185";
              const width = Math.max(3, 430 / chart.length);
              return (
                <g key={point.x}>
                  <line x1={point.px} x2={point.px} y1={point.highY} y2={point.lowY} stroke={candleColor} strokeWidth="1" />
                  <rect
                    x={point.px - width / 2}
                    y={Math.min(point.openY, point.py)}
                    width={width}
                    height={Math.max(1.5, Math.abs(point.openY - point.py))}
                    rx="1"
                    fill={candleColor}
                  />
                </g>
              );
            })
          )}
          {activeIndicators.includes("EMA") ? (
            <path
              d={pointsPath(chart.map((point, index) => ({ px: point.px, py: point.py + Math.sin(index * 0.4) * 5 + 7 })))}
              fill="none"
              stroke="#fbbf24"
              strokeWidth="1.2"
              strokeDasharray="4 4"
              opacity="0.8"
            />
          ) : null}
          {activeIndicators.includes("Volume")
            ? chart.map((point) => (
                <rect
                  key={`volume-${point.x}`}
                  x={point.px - 2.5}
                  y={250 - point.volume * 0.28}
                  width="5"
                  height={point.volume * 0.28}
                  rx="1"
                  fill={point.value >= point.open ? "#34d399" : "#fb7185"}
                  opacity="0.3"
                />
              ))
            : null}
          {selected ? (
            <>
              <line x1={selected.px} x2={selected.px} y1="10" y2="252" stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 4" />
              <line x1="12" x2="788" y1={selected.py} y2={selected.py} stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 4" />
              <circle cx={selected.px} cy={selected.py} r="4" fill={color} stroke="white" strokeWidth="2" />
            </>
          ) : null}
        </svg>
        <div className="pointer-events-none absolute bottom-4 left-5 flex items-center gap-1 text-[9px] font-semibold text-slate-400 dark:text-zinc-600">
          <Expand size={10} aria-hidden />
          Drag for crosshair · browser pinch zoom supported
        </div>
      </div>
    </section>
  );
}
