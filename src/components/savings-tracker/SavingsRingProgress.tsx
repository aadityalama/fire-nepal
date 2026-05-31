"use client";

type SavingsRingProgressProps = {
  pct: number;
  label: string;
  sublabel?: string;
  size?: number;
  stroke?: number;
  /** Tailwind text class for center value */
  valueClassName?: string;
};

export function SavingsRingProgress({
  pct,
  label,
  sublabel,
  size = 132,
  stroke = 9,
  valueClassName = "text-emerald-900 dark:text-white",
}: SavingsRingProgressProps) {
  const clamped = Math.min(100, Math.max(0, pct));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (clamped / 100) * c;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative grid place-items-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" aria-hidden>
          <defs>
            <linearGradient id="savings-ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="55%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#84cc16" />
            </linearGradient>
          </defs>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            className="stroke-slate-200/90 dark:stroke-white/10"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="url(#savings-ring-grad)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${c - dash}`}
            className="motion-safe:transition-[stroke-dasharray] motion-safe:duration-1000 motion-safe:ease-out"
          />
        </svg>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <p className={`text-2xl font-black leading-none sm:text-[1.65rem] ${valueClassName}`}>{Math.round(clamped)}%</p>
            {sublabel ? (
              <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-emerald-600/85 dark:text-emerald-200/60">{sublabel}</p>
            ) : null}
          </div>
        </div>
      </div>
      <p className="text-center text-[11px] font-black uppercase tracking-[0.14em] text-slate-500 dark:text-zinc-400">{label}</p>
    </div>
  );
}
