"use client";

import { useFireTheme } from "@/contexts/FireThemeContext";

type CircularProgressProps = {
  value: number | null;
  max?: number;
  size?: number;
  strokeWidth?: number;
};

export function CircularProgress({ value, max = 100, size = 88, strokeWidth = 7 }: CircularProgressProps) {
  const light = useFireTheme().resolvedTheme === "light";
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = value === null ? 0 : Math.min(100, Math.max(0, (value / max) * 100));
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={light ? "rgba(0,122,61,0.12)" : "rgba(52,211,153,0.15)"}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#fireAiProgressGrad)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
        <defs>
          <linearGradient id="fireAiProgressGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#007a3d" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {value !== null ? (
          <>
            <span className={`text-2xl font-black tracking-tight ${light ? "text-emerald-900" : "text-white"}`}>
              {value}
            </span>
            <span className={`text-[10px] font-bold ${light ? "text-slate-500" : "text-emerald-300/70"}`}>
              / {max}
            </span>
          </>
        ) : (
          <span className={`text-lg font-black ${light ? "text-slate-400" : "text-emerald-400/50"}`}>—</span>
        )}
      </div>
    </div>
  );
}
