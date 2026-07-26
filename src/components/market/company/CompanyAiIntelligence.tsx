"use client";

import { Check, CircleHelp, Minus, X } from "lucide-react";
import { formatFundamentalValue } from "@/lib/market/nepse-fundamentals-format";
import { DATA_UNAVAILABLE } from "@/types/market/nepse-company-fundamentals";
import type {
  AiChecklistItem,
  ChecklistStatus,
  FairValueBadge,
  NepseAiIntelligencePayload,
  RiskLevel,
} from "@/types/market/nepse-ai-intelligence";

const noteCls = "mt-3 text-[11px] font-medium leading-relaxed text-slate-500 dark:text-zinc-500";
const eyebrow = "text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500 dark:text-zinc-500";

function scoreTone(score: number | null): string {
  if (score == null) return "border-slate-200 bg-slate-50 text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-500";
  if (score >= 70) return "border-emerald-300/50 bg-emerald-50 text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200";
  if (score >= 45) return "border-amber-300/50 bg-amber-50 text-amber-900 dark:border-amber-300/20 dark:bg-amber-300/10 dark:text-amber-100";
  return "border-rose-300/50 bg-rose-50 text-rose-800 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200";
}

function recTone(rec: string): string {
  if (rec === "Strong Buy" || rec === "Buy") {
    return "border-emerald-300/50 bg-emerald-50 text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200";
  }
  if (rec === "Hold") {
    return "border-amber-300/50 bg-amber-50 text-amber-900 dark:border-amber-300/20 dark:bg-amber-300/10 dark:text-amber-100";
  }
  if (rec === "Reduce" || rec === "Sell") {
    return "border-rose-300/50 bg-rose-50 text-rose-800 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200";
  }
  return "border-slate-200 bg-slate-50 text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-300";
}

function fairTone(badge: FairValueBadge): string {
  if (badge === "Undervalued") return "border-emerald-300/50 bg-emerald-50 text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200";
  if (badge === "Overvalued") return "border-rose-300/50 bg-rose-50 text-rose-800 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200";
  if (badge === "Fairly Valued") return "border-sky-300/50 bg-sky-50 text-sky-900 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-100";
  return "border-slate-200 bg-slate-50 text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-300";
}

function riskTone(level: RiskLevel): string {
  if (level === "Low") return "text-emerald-700 dark:text-emerald-300";
  if (level === "Moderate") return "text-amber-700 dark:text-amber-300";
  if (level === "Elevated") return "text-orange-700 dark:text-orange-300";
  if (level === "High") return "text-rose-700 dark:text-rose-300";
  return "text-slate-500 dark:text-zinc-500";
}

function ChecklistIcon({ status }: { status: ChecklistStatus }) {
  if (status === "pass") return <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden />;
  if (status === "fail") return <X className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" aria-hidden />;
  return <CircleHelp className="h-3.5 w-3.5 text-slate-400 dark:text-zinc-600" aria-hidden />;
}

function ScoreRing({ score, label }: { score: number | null; label: string }) {
  const display = score == null ? "—" : String(score);
  const pct = score == null ? 0 : score;
  return (
    <div className={`rounded-2xl border p-3.5 ${scoreTone(score)}`}>
      <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] opacity-70">{label}</p>
      <div className="mt-2 flex items-end justify-between gap-2">
        <p className="text-2xl font-black tabular-nums leading-none">{display}</p>
        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-black/10 dark:bg-white/10" aria-hidden>
          <div className="h-full rounded-full bg-current opacity-70" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}

function SummaryBlock({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-3.5 dark:border-white/[0.06] dark:bg-white/[0.025]">
      <p className={eyebrow}>{title}</p>
      <p className="mt-2 text-[12px] font-medium leading-relaxed text-slate-700 dark:text-zinc-300">{body}</p>
    </div>
  );
}

export function CompanyAiIntelligence({
  data,
  loaded,
}: {
  data: NepseAiIntelligencePayload | null;
  loaded: boolean;
}) {
  if (!loaded) {
    return (
      <div className="grid min-h-40 place-items-center rounded-2xl border border-slate-200/70 bg-slate-50/60 dark:border-white/[0.06] dark:bg-white/[0.02]">
        <p className="text-xs font-bold text-slate-500 dark:text-zinc-500">Loading AI company intelligence…</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="grid min-h-32 place-items-center rounded-2xl border border-dashed border-slate-300/90 bg-slate-50/60 p-6 text-center dark:border-white/10 dark:bg-white/[0.02]">
        <p className="text-sm font-black text-slate-800 dark:text-zinc-200">{DATA_UNAVAILABLE}</p>
        <p className="mt-1.5 text-[11px] font-medium text-slate-500 dark:text-zinc-500">
          AI intelligence could not be assembled for this symbol.
        </p>
      </div>
    );
  }

  const { summary, scores, fairValue, risk, growth, recommendation, checklist, dataCoverage } = data;
  const passed = checklist.filter((item: AiChecklistItem) => item.status === "pass").length;
  const failed = checklist.filter((item: AiChecklistItem) => item.status === "fail").length;
  const unknown = checklist.filter((item: AiChecklistItem) => item.status === "unknown").length;

  return (
    <div className="space-y-4" data-testid="company-ai-intelligence">
      {/* Recommendation hero */}
      <div className="rounded-2xl border border-emerald-400/20 bg-[radial-gradient(circle_at_8%_0%,rgba(16,185,129,0.12),transparent_55%),linear-gradient(180deg,rgba(255,255,255,0.9),rgba(248,250,249,0.95))] p-4 dark:bg-[radial-gradient(circle_at_8%_0%,rgba(16,185,129,0.12),transparent_55%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] dark:border-emerald-400/15 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className={eyebrow}>AI Recommendation</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className={`inline-flex rounded-full border px-3 py-1 text-sm font-black uppercase tracking-[0.12em] ${recTone(recommendation.recommendation)}`}>
                {recommendation.recommendation}
              </span>
              <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-500">
                Confidence · {recommendation.confidence}
              </span>
            </div>
            {scores.overall != null ? (
              <p className="mt-2 text-xs font-bold text-slate-600 dark:text-zinc-400">
                Overall investment score <span className="tabular-nums text-slate-950 dark:text-white">{scores.overall}</span>/100
              </p>
            ) : (
              <p className="mt-2 text-xs font-bold text-slate-500 dark:text-zinc-500">Overall score · {DATA_UNAVAILABLE}</p>
            )}
          </div>
          <div className={`rounded-2xl border px-3 py-2 text-center ${fairTone(fairValue.badge)}`}>
            <p className="text-[9px] font-black uppercase tracking-wider opacity-70">Fair value</p>
            <p className="mt-1 text-xs font-black">{fairValue.badge}</p>
          </div>
        </div>
        {summary.limitedData ? (
          <p className="mt-3 rounded-xl border border-amber-300/40 bg-amber-50/80 px-3 py-2 text-[11px] font-semibold text-amber-900 dark:border-amber-300/20 dark:bg-amber-300/10 dark:text-amber-100">
            Analysis is limited — one or more of filings, dividends, live price or EOD history is incomplete. No projections were invented.
          </p>
        ) : null}
        <ul className="mt-3 space-y-1.5">
          {recommendation.rationale.slice(0, 5).map((line) => (
            <li key={line} className="flex gap-2 text-[12px] font-medium leading-relaxed text-slate-600 dark:text-zinc-400">
              <Minus className="mt-1 h-3 w-3 shrink-0 text-emerald-500" aria-hidden />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Scores */}
      <div>
        <p className={eyebrow}>AI Scores (0–100)</p>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4" data-testid="ai-scores">
          <ScoreRing score={scores.overall} label="Overall" />
          {scores.cards.map((card) => (
            <div key={card.label} title={card.detail}>
              <ScoreRing score={card.score} label={card.label} />
            </div>
          ))}
        </div>
      </div>

      {/* Investment summary */}
      <div>
        <p className={eyebrow}>AI Investment Summary</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <SummaryBlock title="Overall" body={summary.overall} />
          <SummaryBlock title="Business Quality" body={summary.businessQuality} />
          <SummaryBlock title="Financial Health" body={summary.financialHealth} />
          <SummaryBlock title="Valuation" body={summary.valuation} />
          <SummaryBlock title="Growth Outlook" body={summary.growthOutlook} />
          <SummaryBlock title="Dividend Outlook" body={summary.dividendOutlook} />
          <SummaryBlock title="Risk Summary" body={summary.risk} />
        </div>
      </div>

      {/* Fair value */}
      <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-3.5 dark:border-white/[0.06] dark:bg-white/[0.02]" data-testid="ai-fair-value">
        <p className={eyebrow}>Fair Value Analysis</p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ["Fair Value", formatFundamentalValue(fairValue.fairValueNpr, { style: "npr" })],
            ["Current Price", formatFundamentalValue(fairValue.currentPriceNpr, { style: "npr" })],
            ["Discount / Premium", formatFundamentalValue(fairValue.discountPremiumPct, { style: "pct" })],
            ["Margin of Safety", formatFundamentalValue(fairValue.marginOfSafetyPct, { style: "pct" })],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-slate-50/90 px-3 py-2.5 dark:bg-white/[0.03]">
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-600">{label}</p>
              <p className="mt-1 text-sm font-black tabular-nums text-slate-950 dark:text-white">{value}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] font-medium leading-relaxed text-slate-500 dark:text-zinc-500">
          {fairValue.detail}
          {fairValue.method ? ` Method: ${fairValue.method}.` : ""} Positive discount means price is below fair value.
        </p>
      </div>

      {/* Risk + Growth */}
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200/70 p-3.5 dark:border-white/[0.06]" data-testid="ai-risk">
          <div className="flex items-center justify-between gap-2">
            <p className={eyebrow}>Risk Analysis</p>
            <span className={`text-xs font-black ${riskTone(risk.overall)}`}>{risk.overall}</span>
          </div>
          <ul className="mt-3 space-y-2">
            {risk.factors.map((factor) => (
              <li key={factor.label} className="rounded-xl bg-slate-50/80 px-3 py-2 dark:bg-white/[0.03]">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-black text-slate-800 dark:text-zinc-200">{factor.label}</span>
                  <span className={`text-[11px] font-black ${riskTone(factor.level)}`}>{factor.level}</span>
                </div>
                <p className="mt-1 text-[11px] font-medium leading-relaxed text-slate-500 dark:text-zinc-500">{factor.detail}</p>
              </li>
            ))}
          </ul>
          <p className={noteCls}>{risk.detail}</p>
        </div>

        <div className="rounded-2xl border border-slate-200/70 p-3.5 dark:border-white/[0.06]" data-testid="ai-growth">
          <p className={eyebrow}>Growth Analysis</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[
              ["EPS 5Y CAGR", growth.epsCagr5yPct],
              ["Profit 5Y CAGR", growth.profitCagr5yPct],
              ["NW/Share 5Y", growth.netWorthCagr5yPct],
            ].map(([label, value]) => (
              <div key={label as string} className="rounded-xl bg-slate-50/80 px-2.5 py-2 dark:bg-white/[0.03]">
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-600">{label as string}</p>
                <p className="mt-1 text-sm font-black tabular-nums">{formatFundamentalValue(value as number | null, { style: "pct" })}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 space-y-2">
            <SummaryBlock title="Historical Growth" body={growth.historical} />
            <SummaryBlock title="Future Growth Outlook" body={growth.futureOutlook} />
            <SummaryBlock title="Revenue Trend" body={growth.revenueTrend} />
            <SummaryBlock title="EPS Trend" body={growth.epsTrend} />
            <SummaryBlock title="Net Worth Trend" body={growth.netWorthTrend} />
          </div>
        </div>
      </div>

      {/* Checklist */}
      <div data-testid="ai-checklist">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <p className={eyebrow}>Investment Checklist</p>
          <p className="text-[10px] font-bold text-slate-500 dark:text-zinc-500">
            {passed} pass · {failed} fail · {unknown} unknown
          </p>
        </div>
        <ul className="mt-2 grid gap-2 sm:grid-cols-2">
          {checklist.map((item) => (
            <li
              key={item.id}
              className="flex gap-3 rounded-2xl border border-slate-200/70 bg-slate-50/70 px-3 py-2.5 dark:border-white/[0.06] dark:bg-white/[0.025]"
            >
              <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-white dark:bg-black/20">
                <ChecklistIcon status={item.status} />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-black text-slate-900 dark:text-white">{item.label}</p>
                <p className="mt-0.5 text-[11px] font-medium leading-relaxed text-slate-500 dark:text-zinc-500">{item.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-[10px] font-semibold text-slate-400 dark:text-zinc-600">
        Coverage · filings {dataCoverage.quarterlyPeriods}Q/{dataCoverage.annualPeriods}Y · dividends{" "}
        {dataCoverage.hasDividends ? "yes" : "no"} · EOD {dataCoverage.ohlcBars} bars · live price{" "}
        {dataCoverage.hasLivePrice ? "yes" : "no"}
        {data.sources.length ? ` · Sources: ${data.sources.join(" · ")}` : ""}
      </p>
      <p className={noteCls}>
        Deterministic scorecard — not investment advice. Values that are not published stay “{DATA_UNAVAILABLE}”; no forward
        earnings or fabricated statements are used.
      </p>
    </div>
  );
}
