"use client";

import { useFireTheme } from "@/contexts/FireThemeContext";

type CircularProgressProps = {
  value: number | null;
  max?: number;
  size?: number;
  strokeWidth?: number;
  /** Force SWP-style dark-on-light contrast (for white glass cards). */
  tone?: "auto" | "light";
};

export function CircularProgress({
  value,
  max = 100,
  size = 88,
  strokeWidth = 7,
  tone = "auto",
}: CircularProgressProps) {
  const resolved = useFireTheme().resolvedTheme;
  const light = tone === "light" || resolved === "light";
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
          stroke={light ? "rgba(6,78,59,0.14)" : "rgba(52,211,153,0.18)"}
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
            <stop offset="0%" stopColor="#064E3B" />
            <stop offset="55%" stopColor="#059669" />
            <stop offset="100%" stopColor="#10B981" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {value !== null ? (
          <>
            <span className={`text-2xl font-black tracking-tight ${light ? "text-emerald-950" : "text-white"}`}>
              {value}
            </span>
            <span className={`text-[10px] font-bold ${light ? "text-gray-500" : "text-emerald-200/80"}`}>
              / {max}
            </span>
          </>
        ) : (
          <span className={`text-lg font-black ${light ? "text-gray-400" : "text-emerald-400/50"}`}>—</span>
        )}
      </div>
    </div>
  );
}
