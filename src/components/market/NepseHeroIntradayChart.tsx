"use client";

import { useId, useMemo } from "react";
import type { NepseIntradayPoint } from "@/services/market/nepse-index-intraday";

type Props = {
  points: NepseIntradayPoint[];
  positive: boolean;
  previousClose?: number | null;
  className?: string;
};

function formatIndex(value: number): string {
  return value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Official NEPSE intraday line chart with gradient fill and High / Low / Last markers.
 */
export function NepseHeroIntradayChart({ points, positive, previousClose, className }: Props) {
  const uid = useId().replace(/:/g, "");
  const stroke = positive ? "#34d399" : "#fb7185";
  const chart = useMemo(() => {
    if (!points.length) return null;
    const width = 640;
    const height = 220;
    const padL = 8;
    const padR = 56;
    const padT = 22;
    const padB = 18;
    const values = points.map((point) => point.value);
    const rawMin = Math.min(...values);
    const rawMax = Math.max(...values);
    const withPrev =
      previousClose != null && Number.isFinite(previousClose)
        ? [rawMin, rawMax, previousClose]
        : [rawMin, rawMax];
    const min = Math.min(...withPrev);
    const max = Math.max(...withPrev);
    const span = Math.max(max - min, 0.5);
    const innerW = width - padL - padR;
    const innerH = height - padT - padB;

    const coords = points.map((point, index) => {
      const x = padL + (index / Math.max(points.length - 1, 1)) * innerW;
      const y = padT + ((max - point.value) / span) * innerH;
      return { x, y, ...point };
    });

    const line = coords
      .map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(2)},${point.y.toFixed(2)}`)
      .join(" ");
    const area = `${line} L${coords[coords.length - 1]!.x.toFixed(2)},${(height - padB).toFixed(2)} L${coords[0]!.x.toFixed(2)},${(height - padB).toFixed(2)} Z`;

    const highIdx = values.indexOf(rawMax);
    const lowIdx = values.indexOf(rawMin);
    const last = coords[coords.length - 1]!;
    const high = coords[highIdx]!;
    const low = coords[lowIdx]!;
    const prevY =
      previousClose != null && Number.isFinite(previousClose)
        ? padT + ((max - previousClose) / span) * innerH
        : null;

    return { width, height, line, area, last, high, low, prevY, rawMax, rawMin };
  }, [points, previousClose]);

  if (!chart) {
    return (
      <div
        className={`grid min-h-[11rem] place-items-center rounded-2xl border border-white/10 bg-white/[0.03] text-[11px] font-semibold text-emerald-100/45 ${className ?? ""}`}
      >
        Waiting for official NEPSE intraday series…
      </div>
    );
  }

  return (
    <div className={`relative min-w-0 ${className ?? ""}`}>
      <svg
        viewBox={`0 0 ${chart.width} ${chart.height}`}
        className="h-[11.5rem] w-full sm:h-[14rem] lg:h-[15.5rem]"
        role="img"
        aria-label="Official NEPSE intraday index chart"
      >
        <defs>
          <linearGradient id={`hero-intra-fill-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.34" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0" />
          </linearGradient>
          <filter id={`hero-intra-glow-${uid}`} x="-8%" y="-8%" width="116%" height="116%">
            <feGaussianBlur stdDeviation="1.6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {chart.prevY != null ? (
          <line
            x1="8"
            x2={chart.width - 56}
            y1={chart.prevY}
            y2={chart.prevY}
            stroke="rgba(255,255,255,0.18)"
            strokeWidth="1"
            strokeDasharray="4 5"
          />
        ) : null}

        <path d={chart.area} fill={`url(#hero-intra-fill-${uid})`} />
        <path
          d={chart.line}
          fill="none"
          stroke={stroke}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter={`url(#hero-intra-glow-${uid})`}
        />

        {/* High marker */}
        <g>
          <circle cx={chart.high.x} cy={chart.high.y} r="3.2" fill="#34d399" stroke="#ecfdf5" strokeWidth="1.2" />
          <text
            x={Math.min(chart.high.x + 6, chart.width - 54)}
            y={Math.max(12, chart.high.y - 8)}
            fill="#6ee7b7"
            fontSize="9"
            fontWeight="700"
          >
            H {formatIndex(chart.rawMax)}
          </text>
        </g>

        {/* Low marker */}
        <g>
          <circle cx={chart.low.x} cy={chart.low.y} r="3.2" fill="#fb7185" stroke="#fff1f2" strokeWidth="1.2" />
          <text
            x={Math.min(chart.low.x + 6, chart.width - 54)}
            y={Math.min(chart.height - 6, chart.low.y + 14)}
            fill="#fda4af"
            fontSize="9"
            fontWeight="700"
          >
            L {formatIndex(chart.rawMin)}
          </text>
        </g>

        {/* Current / last marker */}
        <g>
          <circle cx={chart.last.x} cy={chart.last.y} r="4.2" fill={stroke} stroke="#ffffff" strokeWidth="1.6">
            <animate attributeName="r" values="3.6;4.8;3.6" dur="2.4s" repeatCount="indefinite" />
          </circle>
          <text x={chart.width - 52} y={chart.last.y + 3} fill="#ecfdf5" fontSize="10" fontWeight="800">
            {formatIndex(chart.last.value)}
          </text>
        </g>
      </svg>
    </div>
  );
}

type SparkProps = {
  values: number[];
  positive?: boolean;
  className?: string;
};

/** Compact real-data sparkline for hero KPI rows. */
export function NepseHeroSparkline({ values, positive = true, className }: SparkProps) {
  const uid = useId().replace(/:/g, "");
  const stroke = positive ? "#34d399" : "#fb7185";
  if (values.length < 2) {
    return <div className={`h-7 w-16 rounded bg-white/[0.04] ${className ?? ""}`} aria-hidden />;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 1e-9);
  const coords = values.map((value, index) => {
    const x = (index / (values.length - 1)) * 100;
    const y = 2 + ((max - value) / span) * 24;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  const line = `M${coords.join(" L")}`;
  const area = `${line} L100,28 L0,28 Z`;
  return (
    <svg viewBox="0 0 100 28" className={`h-7 w-16 ${className ?? ""}`} aria-hidden>
      <defs>
        <linearGradient id={`kpi-spark-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.35" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#kpi-spark-${uid})`} />
      <path d={line} fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
