"use client";

import { useState, type ReactNode } from "react";
import { AutoFitSingleLine } from "@/components/portfolio/AutoFitSingleLine";
import type { WealthTotals } from "@/components/portfolio/calculations";
import {
  annualizedCagrFraction,
  formatCagrPct,
  formatHoldingDurationApprox,
} from "@/components/portfolio/holding-stats";
import {
  metalHoldingCalendarDays,
  roiPct,
  rollupAllMetals,
  rollupMetalBucket,
  weightedBasisCostPerGram,
  type MetalRatePair,
} from "@/components/portfolio/metals-premium-metrics";
import type { MetalRow, PortfolioLedgerEntry } from "@/components/portfolio/types";
import { NumericMoneyInput } from "@/components/NumericMoneyInput";
import { formatMoney } from "@/lib/expense-utils";
import { gramsToTolaUi, NEPAL_UI_GRAMS_PER_TOLA, tolaUiToGrams } from "@/lib/portfolio/nepal-metal-ui-convert";

function formatRoiPct(pct: number | null): string {
  if (pct == null || !Number.isFinite(pct)) return "—";
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 0 })}%`;
}

function MetalPremiumKpiCard({
  label,
  labelClassName,
  shellClassName,
  valueText,
  valueClassName,
  maxRem,
  minRem,
  footer,
}: {
  label: string;
  labelClassName: string;
  shellClassName: string;
  valueText: string;
  valueClassName: string;
  maxRem: number;
  minRem: number;
  footer: ReactNode;
}) {
  return (
    <div
      className={`group flex h-full min-h-[6.875rem] min-w-0 flex-col rounded-2xl border px-3 py-2.5 shadow-inner transition hover:ring-1 hover:ring-lime-400/20 sm:min-h-[7.25rem] sm:px-3.5 sm:py-3 ${shellClassName}`}
    >
      <p className={`shrink-0 text-[10px] font-black uppercase leading-tight tracking-[0.06em] ${labelClassName}`}>{label}</p>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-center py-1 sm:py-1.5">
        <AutoFitSingleLine text={valueText} maxRem={maxRem} minRem={minRem} className={valueClassName} />
      </div>
      <div className="mt-auto flex min-h-[2.625rem] w-full min-w-0 shrink-0 flex-col justify-end gap-0.5 text-[10px] leading-snug [&_p]:min-w-0 [&_p]:max-w-full [&_p]:break-words">
        {footer}
      </div>
    </div>
  );
}

function premiumShell(emphasis: boolean) {
  if (emphasis) {
    return "border-lime-400/30 bg-gradient-to-br from-lime-950/45 via-emerald-950/35 to-black/45 shadow-inner shadow-black/40 ring-1 ring-lime-400/15 hover:shadow-[0_0_28px_-8px_rgba(163,230,53,0.35)]";
  }
  return "border-emerald-400/25 bg-gradient-to-br from-emerald-950/40 to-black/40 shadow-inner shadow-black/35 ring-1 ring-emerald-400/10 hover:border-emerald-400/35";
}

function metalInsightBlock(opts: {
  title: string;
  accent: "amber" | "slate";
  avgPurchasePerGram: number | null;
  boardPerGram: number;
  hasBasisLots: boolean;
}) {
  const { title, accent, avgPurchasePerGram, boardPerGram, hasBasisLots } = opts;
  const diff =
    avgPurchasePerGram != null && avgPurchasePerGram > 0 && boardPerGram > 0 ? boardPerGram - avgPurchasePerGram : null;
  const profitPerG = diff;
  const ring = accent === "amber" ? "ring-amber-400/15" : "ring-slate-400/15";
  const border = accent === "amber" ? "border-amber-400/25" : "border-slate-400/25";
  const labelTone = accent === "amber" ? "text-amber-200/70" : "text-slate-200/70";
  return (
    <div className={`min-w-0 rounded-2xl border ${border} bg-black/30 p-3 shadow-inner ${ring}`}>
      <h3 className={`text-[11px] font-black uppercase tracking-[0.08em] ${labelTone}`}>{title}</h3>
      <dl className="mt-2 space-y-1.5 text-[11px] font-bold leading-snug">
        <div className="flex justify-between gap-2">
          <dt className="text-emerald-200/55">Avg purchase / g</dt>
          <dd className="tabular-nums text-emerald-50">
            {avgPurchasePerGram != null && hasBasisLots ? formatMoney(avgPurchasePerGram, "NPR") : "—"}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-emerald-200/55">Nepal board / g</dt>
          <dd className="tabular-nums text-emerald-50">{formatMoney(boardPerGram, "NPR")}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-emerald-200/55">Board − avg / g</dt>
          <dd className={`tabular-nums ${diff != null && diff >= 0 ? "text-lime-200" : diff != null ? "text-rose-200" : "text-emerald-200/50"}`}>
            {diff != null ? `${diff >= 0 ? "+" : ""}${formatMoney(diff, "NPR")}` : "—"}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-emerald-200/55">Profit / g (unrealized)</dt>
          <dd className={`tabular-nums ${profitPerG != null && profitPerG >= 0 ? "text-lime-200" : profitPerG != null ? "text-rose-200" : "text-emerald-200/50"}`}>
            {profitPerG != null ? `${profitPerG >= 0 ? "+" : ""}${formatMoney(profitPerG, "NPR")}` : "—"}
          </dd>
        </div>
      </dl>
      {!hasBasisLots ? (
        <p className="mt-2 text-[10px] font-semibold text-emerald-200/45">Record BUY transactions with price to unlock averages.</p>
      ) : null}
    </div>
  );
}

function holdingFooter(days: number | null) {
  if (days == null) return <p className="font-semibold text-emerald-200/40">Record BUY transactions with dates to anchor holding time</p>;
  return (
    <p className="font-semibold text-emerald-200/50">
      {days.toLocaleString()} calendar day{days === 1 ? "" : "s"}
    </p>
  );
}

export function MetalGramTolaFields({
  grams,
  onGramsChange,
}: {
  grams: number | undefined;
  onGramsChange: (n: number | undefined) => void;
}) {
  const g = grams ?? 0;
  const [tolaFocused, setTolaFocused] = useState(false);
  const [tolaDraft, setTolaDraft] = useState("");
  const derivedTola = g > 0 ? gramsToTolaUi(g).toFixed(4) : "";
  const tolaInputValue = tolaFocused ? tolaDraft : derivedTola;

  return (
    <div className="grid min-w-0 gap-2 sm:grid-cols-2 sm:items-end">
      <div className="min-w-0">
        <NumericMoneyInput
          tone="dark"
          label="Grams"
          value={grams}
          onChange={onGramsChange}
          variant="amount"
          placeholder="0"
          className="text-[10px] font-bold uppercase tracking-wide text-zinc-200 [&>span]:block"
          wrapperClassName="rounded-xl border border-emerald-400/15 bg-black/30 px-2 py-2 focus-within:border-emerald-400/40"
          inputClassName="min-w-0 flex-1 bg-transparent text-xs font-bold text-emerald-50 outline-none"
        />
        <p className="mt-1 text-[10px] font-bold text-emerald-200/55">
          ≈ <span className="tabular-nums text-amber-100/95">{g > 0 ? gramsToTolaUi(g).toFixed(4) : "0"}</span> tola
          <span className="text-emerald-200/40"> · UI 1 tola = {NEPAL_UI_GRAMS_PER_TOLA} g</span>
        </p>
      </div>
      <label className="block min-w-0">
        <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wide text-emerald-200/55">Tola (UI)</span>
        <input
          value={tolaInputValue}
          onChange={(e) => {
            const raw = e.target.value;
            setTolaDraft(raw);
            const t = String(raw).replace(/,/g, "").trim();
            if (t === "") return;
            const n = Number(t);
            if (!Number.isFinite(n) || n <= 0) return;
            onGramsChange(Number(tolaUiToGrams(n).toFixed(4)));
          }}
          onFocus={() => {
            setTolaFocused(true);
            setTolaDraft(derivedTola);
          }}
          onBlur={() => {
            setTolaFocused(false);
            const n = Number(String(tolaDraft).replace(/,/g, "").trim());
            if (Number.isFinite(n) && n > 0) {
              onGramsChange(Number(tolaUiToGrams(n).toFixed(4)));
            }
            setTolaDraft("");
          }}
          inputMode="decimal"
          className="wealth-input-text w-full rounded-xl border border-emerald-400/15 bg-black/30 px-2 py-2 text-xs font-bold text-emerald-50 outline-none focus:border-emerald-400/40"
          placeholder="0"
        />
        <p className="mt-1 text-[10px] font-bold text-emerald-200/55">
          ≈ <span className="tabular-nums text-amber-100/95">{g > 0 ? g.toLocaleString("en-US", { maximumFractionDigits: 4 }) : "0"}</span> g
        </p>
      </label>
    </div>
  );
}

export function MetalsPremiumDashboard({
  rows,
  gramRates,
  totals,
  ledger = [],
}: {
  rows: readonly MetalRow[];
  gramRates: MetalRatePair;
  totals: WealthTotals;
  ledger?: readonly PortfolioLedgerEntry[];
}) {
  const all = rollupAllMetals(rows, gramRates);
  const gold = rollupMetalBucket(rows, "gold", gramRates);
  const silver = rollupMetalBucket(rows, "silver", gramRates);
  const days = metalHoldingCalendarDays(rows, ledger);
  const purchase = all.basisSumNpr;
  const current = all.currentNpr;
  const netPl = purchase > 0 ? current - purchase : null;
  const roi = roiPct(purchase, current);
  const cagrFrac = days != null && days >= 1 && purchase > 0 ? annualizedCagrFraction(purchase, current, days) : null;
  const unrealized = netPl;
  const appreciation = roi;
  const nw = totals.netWorthNpr;
  const contributionPct = nw > 0 && Number.isFinite(totals.metalsNpr) ? (totals.metalsNpr / nw) * 100 : null;

  const goldAvgPerG = weightedBasisCostPerGram(rows, "gold");
  const silverAvgPerG = weightedBasisCostPerGram(rows, "silver");
  const goldHasBasisLots = goldAvgPerG != null;
  const silverHasBasisLots = silverAvgPerG != null;

  const holdingApprox = days != null ? formatHoldingDurationApprox(days) : "—";
  const holdingDaysText = days != null ? String(days) : "—";

  const netTone =
    netPl == null ? "text-emerald-200/50" : netPl >= 0 ? "text-lime-200" : "text-rose-300";
  const roiTone = roi == null ? "text-emerald-200/50" : roi >= 0 ? "text-lime-200" : "text-rose-300";
  const cagrTone =
    cagrFrac == null ? "text-emerald-200/50" : cagrFrac >= 0 ? "text-lime-200" : "text-rose-300";

  const summaryCard = (opts: {
    title: string;
    accent: "amber" | "slate";
    rollup: typeof gold;
  }) => {
    const { title, accent, rollup: r } = opts;
    const tola = r.grams > 0 ? gramsToTolaUi(r.grams) : 0;
    const border = accent === "amber" ? "border-amber-400/25" : "border-slate-400/25";
    const glow = accent === "amber" ? "from-amber-950/35" : "from-slate-900/40";
    return (
      <div
        className={`min-w-0 rounded-2xl border ${border} bg-gradient-to-br ${glow} to-black/45 p-3 shadow-inner ring-1 ring-white/5`}
      >
        <h3 className="text-xs font-black uppercase tracking-[0.08em] text-emerald-100/90">{title}</h3>
        <dl className="mt-2 grid gap-1.5 text-[11px] font-bold sm:grid-cols-2">
          <div className="flex justify-between gap-2 sm:block sm:space-y-0.5">
            <dt className="text-emerald-200/55">Grams</dt>
            <dd className="tabular-nums text-emerald-50">{r.grams > 0 ? r.grams.toLocaleString() : "—"}</dd>
          </div>
          <div className="flex justify-between gap-2 sm:block sm:space-y-0.5">
            <dt className="text-emerald-200/55">Tola (UI)</dt>
            <dd className="tabular-nums text-amber-100/95">{r.grams > 0 ? tola.toFixed(4) : "—"}</dd>
          </div>
          <div className="flex justify-between gap-2 sm:block sm:space-y-0.5">
            <dt className="text-emerald-200/55">Purchase</dt>
            <dd className="tabular-nums text-emerald-50">{r.basisSumNpr > 0 ? formatMoney(r.basisSumNpr, "NPR") : "—"}</dd>
          </div>
          <div className="flex justify-between gap-2 sm:block sm:space-y-0.5">
            <dt className="text-emerald-200/55">Current</dt>
            <dd className="tabular-nums text-emerald-50">{r.grams > 0 ? formatMoney(r.currentNpr, "NPR") : "—"}</dd>
          </div>
        </dl>
      </div>
    );
  };

  return (
    <div className="mb-4 space-y-4">
      <div className="rounded-2xl border border-emerald-400/20 bg-gradient-to-br from-emerald-950/25 via-black/35 to-lime-950/20 p-3 shadow-inner sm:p-3.5">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-lime-500/25 to-emerald-600/20 text-lime-100 ring-1 ring-lime-400/25">
            <span className="text-sm font-black">Au</span>
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-[0.1em] text-emerald-50 sm:text-sm">Premium wealth KPIs</h3>
            <p className="text-[10px] font-bold text-emerald-200/55 sm:text-[11px]">
              Cost basis from BUY transactions, live marks, return, and holding duration.
            </p>
          </div>
        </div>
        <div className="grid min-h-0 min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-2.5 lg:grid-cols-3 xl:grid-cols-6">
          <MetalPremiumKpiCard
            label="Purchase (cost basis)"
            labelClassName="text-lime-200/70"
            shellClassName={premiumShell(true)}
            valueText={purchase > 0 ? formatMoney(purchase, "NPR") : "—"}
            valueClassName="text-emerald-50"
            maxRem={1.5}
            minRem={0.5}
            footer={<p className="font-semibold text-emerald-200/45">From BUY transactions (cost basis)</p>}
          />
          <MetalPremiumKpiCard
            label="Current market value"
            labelClassName="text-emerald-200/70"
            shellClassName={premiumShell(false)}
            valueText={all.grams > 0 ? formatMoney(current, "NPR") : "—"}
            valueClassName="text-emerald-50"
            maxRem={1.5}
            minRem={0.5}
            footer={<p className="font-semibold text-emerald-200/45">Grams × Nepal board / g</p>}
          />
          <MetalPremiumKpiCard
            label="Net profit / loss"
            labelClassName="text-emerald-200/70"
            shellClassName={premiumShell(false)}
            valueText={netPl != null ? `${netPl >= 0 ? "+" : ""}${formatMoney(netPl, "NPR")}` : "—"}
            valueClassName={netTone}
            maxRem={1.35}
            minRem={0.5}
            footer={<p className="font-semibold text-emerald-200/45">Current − purchase</p>}
          />
          <MetalPremiumKpiCard
            label="ROI %"
            labelClassName="text-lime-200/70"
            shellClassName={premiumShell(true)}
            valueText={formatRoiPct(roi)}
            valueClassName={roiTone}
            maxRem={2}
            minRem={0.5}
            footer={<p className="font-semibold text-emerald-200/45">Vs cost basis</p>}
          />
          <MetalPremiumKpiCard
            label="CAGR %"
            labelClassName="text-amber-200/70"
            shellClassName={premiumShell(false)}
            valueText={formatCagrPct(cagrFrac, 2).replace(" p.a.", "")}
            valueClassName={cagrTone}
            maxRem={1.75}
            minRem={0.5}
            footer={holdingFooter(days)}
          />
          <MetalPremiumKpiCard
            label="Holding duration"
            labelClassName="text-violet-200/70"
            shellClassName={premiumShell(false)}
            valueText={holdingApprox}
            valueClassName="text-emerald-50"
            maxRem={1.5}
            minRem={0.4375}
            footer={holdingFooter(days)}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-lime-400/20 bg-black/30 p-3 shadow-inner ring-1 ring-lime-400/10 sm:p-3.5">
        <h3 className="text-xs font-black uppercase tracking-[0.1em] text-lime-100/95 sm:text-sm">Premium performance</h3>
        <p className="mb-2 text-[10px] font-bold text-emerald-200/55 sm:text-[11px]">Same metrics as real-estate KPI tiles — large type, gradients, hover ring.</p>
        <div className="grid min-h-0 min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4 lg:items-stretch lg:gap-2.5">
          <MetalPremiumKpiCard
            label="Purchase value"
            labelClassName="text-lime-200/70"
            shellClassName={premiumShell(true)}
            valueText={purchase > 0 ? formatMoney(purchase, "NPR") : "—"}
            valueClassName="text-emerald-50"
            maxRem={1.5}
            minRem={0.5}
            footer={<p className="font-semibold text-emerald-200/45">Cost basis</p>}
          />
          <MetalPremiumKpiCard
            label="Current value"
            labelClassName="text-emerald-200/70"
            shellClassName={premiumShell(false)}
            valueText={all.grams > 0 ? formatMoney(current, "NPR") : "—"}
            valueClassName="text-emerald-50"
            maxRem={1.5}
            minRem={0.5}
            footer={<p className="font-semibold text-emerald-200/45">Live mark</p>}
          />
          <MetalPremiumKpiCard
            label="Net profit"
            labelClassName="text-sky-200/70"
            shellClassName="border-sky-400/20 bg-gradient-to-br from-sky-950/30 to-black/40 shadow-inner ring-1 ring-sky-400/10"
            valueText={netPl != null ? `${netPl >= 0 ? "+" : ""}${formatMoney(netPl, "NPR")}` : "—"}
            valueClassName={netTone}
            maxRem={1.35}
            minRem={0.5}
            footer={<p className="font-semibold text-emerald-200/45">Unrealized (module)</p>}
          />
          <MetalPremiumKpiCard
            label="ROI %"
            labelClassName="text-lime-200/70"
            shellClassName={premiumShell(true)}
            valueText={formatRoiPct(roi)}
            valueClassName={roiTone}
            maxRem={2}
            minRem={0.5}
            footer={<p className="font-semibold text-emerald-200/45">Return on basis</p>}
          />
        </div>
        <div className="mt-2 grid min-h-0 min-w-0 grid-cols-1 gap-2 sm:grid-cols-3 lg:items-stretch lg:gap-2.5">
          <MetalPremiumKpiCard
            label="CAGR %"
            labelClassName="text-amber-200/70"
            shellClassName="border-amber-400/20 bg-black/35 shadow-inner ring-1 ring-amber-400/10"
            valueText={formatCagrPct(cagrFrac, 2).replace(" p.a.", "")}
            valueClassName={cagrTone}
            maxRem={1.75}
            minRem={0.5}
            footer={<p className="font-semibold text-emerald-200/45">Geometric annualized</p>}
          />
          <MetalPremiumKpiCard
            label="Holding days"
            labelClassName="text-violet-200/70"
            shellClassName="border-violet-400/20 bg-black/35 shadow-inner ring-1 ring-violet-400/10"
            valueText={holdingDaysText}
            valueClassName="text-emerald-50"
            maxRem={2.25}
            minRem={0.5}
            footer={<p className="font-semibold text-emerald-200/45">Calendar days since oldest lot</p>}
          />
          <MetalPremiumKpiCard
            label="Annualized growth"
            labelClassName="text-lime-200/70"
            shellClassName={premiumShell(true)}
            valueText={formatCagrPct(cagrFrac, 2).replace(" p.a.", "")}
            valueClassName={cagrTone}
            maxRem={1.75}
            minRem={0.5}
            footer={<p className="font-semibold text-emerald-200/45">Matches CAGR over hold</p>}
          />
        </div>
      </div>

      <div className="grid min-w-0 gap-2 lg:grid-cols-2">
        {summaryCard({ title: "Gold holdings", accent: "amber", rollup: gold })}
        {summaryCard({ title: "Silver holdings", accent: "slate", rollup: silver })}
      </div>

      <div>
        <h3 className="mb-2 text-xs font-black uppercase tracking-[0.08em] text-emerald-100/90">Metal insights (per gram)</h3>
        <div className="grid min-w-0 gap-2 sm:grid-cols-2">
          {metalInsightBlock({
            title: "Gold insights",
            accent: "amber",
            avgPurchasePerGram: goldAvgPerG,
            boardPerGram: gramRates.goldNprPerGram,
            hasBasisLots: goldHasBasisLots,
          })}
          {metalInsightBlock({
            title: "Silver insights",
            accent: "slate",
            avgPurchasePerGram: silverAvgPerG,
            boardPerGram: gramRates.silverNprPerGram,
            hasBasisLots: silverHasBasisLots,
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-emerald-400/15 bg-black/25 p-3 sm:p-3.5">
        <h3 className="text-xs font-black uppercase tracking-[0.08em] text-emerald-100/90">Wealth analytics</h3>
        <div className="mt-2 grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <MetalPremiumKpiCard
            label="Unrealized gain / loss"
            labelClassName="text-emerald-200/70"
            shellClassName={premiumShell(false)}
            valueText={unrealized != null ? `${unrealized >= 0 ? "+" : ""}${formatMoney(unrealized, "NPR")}` : "—"}
            valueClassName={netTone}
            maxRem={1.25}
            minRem={0.4375}
            footer={<p className="font-semibold text-emerald-200/45">Module-level</p>}
          />
          <MetalPremiumKpiCard
            label="Total appreciation %"
            labelClassName="text-lime-200/70"
            shellClassName={premiumShell(true)}
            valueText={formatRoiPct(appreciation)}
            valueClassName={roiTone}
            maxRem={2}
            minRem={0.5}
            footer={<p className="font-semibold text-emerald-200/45">(Current − basis) / basis</p>}
          />
          <MetalPremiumKpiCard
            label="Annualized return %"
            labelClassName="text-amber-200/70"
            shellClassName="border-amber-400/20 bg-black/35 shadow-inner"
            valueText={formatCagrPct(cagrFrac, 2).replace(" p.a.", "")}
            valueClassName={cagrTone}
            maxRem={1.75}
            minRem={0.5}
            footer={<p className="font-semibold text-emerald-200/45">CAGR from basis → mark</p>}
          />
          <MetalPremiumKpiCard
            label="Wealth contribution %"
            labelClassName="text-teal-200/70"
            shellClassName="border-teal-400/20 bg-black/35 shadow-inner"
            valueText={contributionPct != null ? `${contributionPct.toFixed(1)}%` : "—"}
            valueClassName="text-emerald-50"
            maxRem={2}
            minRem={0.5}
            footer={
              nw > 0 ? (
                <p className="font-semibold text-emerald-200/45">
                  Metals NPR ÷ FIRE Nepal net worth ({formatMoney(totals.metalsNpr, "NPR")} / {formatMoney(nw, "NPR")})
                </p>
              ) : (
                <p className="font-semibold text-emerald-200/40">Net worth not available for share</p>
              )
            }
          />
        </div>
      </div>
    </div>
  );
}
