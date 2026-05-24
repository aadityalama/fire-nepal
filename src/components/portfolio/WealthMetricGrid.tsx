"use client";

import { formatMoney } from "@/lib/expense-utils";

export function WealthMetricGrid({
  tiles,
}: {
  tiles: Array<{ label: string; value: string; hint?: string; accent?: "default" | "rose" | "lime" | "amber" }>;
}) {
  return (
    <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4">
      {tiles.map((t) => {
        const border =
          t.accent === "rose"
            ? "border-rose-400/25"
            : t.accent === "lime"
              ? "border-lime-400/25"
              : t.accent === "amber"
                ? "border-amber-400/25"
                : "border-emerald-400/15";
        return (
          <div key={t.label} className={`wealth-metric-tile rounded-2xl border p-3 ${border} sm:p-3.5`}>
            <p className="text-[10px] font-black uppercase tracking-wide text-emerald-200/65 sm:text-[11px]">{t.label}</p>
            <p className="mt-1.5 text-lg font-black tabular-nums leading-tight text-emerald-50 sm:text-xl">{t.value}</p>
            {t.hint ? <p className="mt-1 text-[10px] font-bold leading-snug text-emerald-200/50 sm:text-[11px]">{t.hint}</p> : null}
          </div>
        );
      })}
    </div>
  );
}

export function WealthSignalsRow({
  fireScore,
  healthLabel,
  healthGradient,
  passiveMonthlyNpr,
  monthlyGrowthNpr,
  topAllocationLabel,
  topAllocationPct,
}: {
  fireScore: number;
  healthLabel: string;
  healthGradient: string;
  passiveMonthlyNpr: number;
  monthlyGrowthNpr: number | null;
  topAllocationLabel: string;
  topAllocationPct: number;
}) {
  const growthStr =
    monthlyGrowthNpr === null
      ? "—"
      : `${monthlyGrowthNpr >= 0 ? "+" : ""}${formatMoney(monthlyGrowthNpr, "NPR")}`;

  return (
    <div className="wealth-glass mb-5 grid gap-3 rounded-[1.35rem] p-3.5 sm:grid-cols-2 lg:grid-cols-4 sm:p-4">
      <div className="flex items-center gap-3">
        <div
          className="relative grid h-16 w-16 shrink-0 place-items-center rounded-full"
          style={{
            background: `conic-gradient(#34d399 ${fireScore * 3.6}deg, rgba(255,255,255,0.08) 0deg)`,
          }}
        >
          <div className="grid h-[68%] w-[68%] place-items-center rounded-full bg-[#04251c] text-center">
            <span className="text-lg font-black text-emerald-100 sm:text-xl">{fireScore}</span>
          </div>
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-wide text-emerald-200/65 sm:text-[11px]">FIRE readiness</p>
          <p className="text-sm font-black text-emerald-50 sm:text-base">Score / 100</p>
          <p className="text-xs font-bold leading-snug text-emerald-200/55 sm:text-sm">Composite: debt, investable, net worth, retirement</p>
        </div>
      </div>

      <div>
        <p className="text-[10px] font-black uppercase tracking-wide text-emerald-200/65 sm:text-[11px]">Financial health</p>
        <p className="mt-1 text-xl font-black text-emerald-50 sm:text-2xl">{healthLabel}</p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${healthGradient}`}
            style={{ width: `${fireScore}%` }}
          />
        </div>
      </div>

      <div>
        <p className="text-[10px] font-black uppercase tracking-wide text-emerald-200/65 sm:text-[11px]">Passive income (est.)</p>
        <p className="mt-1 text-xl font-black tabular-nums text-amber-200/95 sm:text-2xl">{formatMoney(passiveMonthlyNpr, "NPR")}</p>
        <p className="text-xs font-bold leading-snug text-emerald-200/55 sm:text-sm">4% / yr on investable → monthly NPR</p>
      </div>

      <div>
        <p className="text-[10px] font-black uppercase tracking-wide text-emerald-200/65 sm:text-[11px]">Monthly wealth Δ</p>
        <p className="mt-1 text-xl font-black tabular-nums text-lime-200/95 sm:text-2xl">{growthStr}</p>
        <p className="text-xs font-bold leading-snug text-emerald-200/55 sm:text-sm">
          vs prior month snapshot · Top bucket: {topAllocationLabel}{" "}
          <span className="text-emerald-100">({topAllocationPct.toFixed(0)}%)</span>
        </p>
      </div>
    </div>
  );
}
