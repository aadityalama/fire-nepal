"use client";

import {
  Activity,
  AlertTriangle,
  BarChart3,
  BrainCircuit,
  ChevronDown,
  Lightbulb,
  Rocket,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { useCallback, useState, type ComponentType } from "react";
import type {
  ReAiInsightIcon,
  ReAiInsightKind,
  ReAiWealthInsightCard,
  ReAiWealthInsightsBundle,
} from "@/components/portfolio/re-ai-wealth-insights";

function clampMeter(m: number): number {
  return Math.max(-100, Math.min(100, m));
}

const ICON_MAP: Record<ReAiInsightIcon, ComponentType<{ size?: number; className?: string; strokeWidth?: number }>> = {
  sparkles: Sparkles,
  "trending-up": TrendingUp,
  "alert-triangle": AlertTriangle,
  "shield-alert": ShieldAlert,
  lightbulb: Lightbulb,
  target: Target,
  "bar-chart-3": BarChart3,
  rocket: Rocket,
  activity: Activity,
};

const KIND_META: Record<
  ReAiInsightKind,
  {
    labelEn: string;
    labelNe: string;
    ring: string;
    border: string;
    glow: string;
    iconBg: string;
    chip: string;
    bar: string;
  }
> = {
  positive: {
    labelEn: "Positive",
    labelNe: "सकारात्मक",
    ring: "ring-lime-400/25",
    border: "border-lime-400/25",
    glow: "hover:shadow-[0_0_28px_-4px_rgba(163,230,53,0.35)]",
    iconBg: "from-lime-500/30 to-emerald-600/20 text-lime-100 ring-lime-400/30",
    chip: "border-lime-400/30 bg-lime-500/10 text-lime-100",
    bar: "from-lime-400 to-emerald-400",
  },
  warning: {
    labelEn: "Caution",
    labelNe: "सतर्कता",
    ring: "ring-amber-400/25",
    border: "border-amber-400/25",
    glow: "hover:shadow-[0_0_28px_-4px_rgba(251,191,36,0.28)]",
    iconBg: "from-amber-500/30 to-orange-600/15 text-amber-100 ring-amber-400/30",
    chip: "border-amber-400/30 bg-amber-500/10 text-amber-100",
    bar: "from-amber-400 to-orange-400",
  },
  risk: {
    labelEn: "Risk",
    labelNe: "जोखिम",
    ring: "ring-rose-400/30",
    border: "border-rose-400/25",
    glow: "hover:shadow-[0_0_28px_-4px_rgba(251,113,133,0.3)]",
    iconBg: "from-rose-500/35 to-red-600/20 text-rose-100 ring-rose-400/35",
    chip: "border-rose-400/35 bg-rose-500/10 text-rose-100",
    bar: "from-rose-400 to-red-500",
  },
  opportunity: {
    labelEn: "Opportunity",
    labelNe: "अवसर",
    ring: "ring-sky-400/30",
    border: "border-sky-400/25",
    glow: "hover:shadow-[0_0_28px_-4px_rgba(56,189,248,0.32)]",
    iconBg: "from-sky-500/30 to-cyan-600/20 text-sky-100 ring-sky-400/30",
    chip: "border-sky-400/30 bg-sky-500/10 text-sky-100",
    bar: "from-sky-400 to-cyan-400",
  },
  strategy: {
    labelEn: "Strategy",
    labelNe: "रणनीति",
    ring: "ring-indigo-400/28",
    border: "border-indigo-400/22",
    glow: "hover:shadow-[0_0_28px_-4px_rgba(129,140,248,0.28)]",
    iconBg: "from-indigo-500/30 to-violet-600/20 text-indigo-100 ring-indigo-400/28",
    chip: "border-indigo-400/28 bg-indigo-500/10 text-indigo-100",
    bar: "from-indigo-400 to-violet-400",
  },
};

const SENTIMENT_STYLES: Record<
  ReAiWealthInsightsBundle["sentiment"],
  { pill: string; dot: string }
> = {
  bullish: {
    pill: "border-lime-400/35 bg-lime-500/15 text-lime-100",
    dot: "bg-lime-400 shadow-[0_0_12px_rgba(163,230,53,0.65)]",
  },
  neutral: {
    pill: "border-slate-400/30 bg-slate-500/15 text-slate-100",
    dot: "bg-slate-300 shadow-[0_0_10px_rgba(203,213,225,0.45)]",
  },
  cautious: {
    pill: "border-amber-400/35 bg-amber-500/15 text-amber-100",
    dot: "bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.55)]",
  },
  bearish: {
    pill: "border-rose-400/35 bg-rose-500/15 text-rose-100",
    dot: "bg-rose-400 shadow-[0_0_12px_rgba(251,113,133,0.55)]",
  },
};

type LangMode = "en" | "ne" | "both";

function ConfidenceMeter({ value, barClass }: { value: number; barClass: string }) {
  const pct = Math.round(Math.min(100, Math.max(0, value)));
  return (
    <div className="min-w-0">
      <div className="mb-1 flex items-center justify-between gap-2 text-[9px] font-bold uppercase tracking-wide text-emerald-200/50">
        <span>AI confidence</span>
        <span className="tabular-nums text-emerald-100/90">{pct}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-black/50 ring-1 ring-white/[0.06]">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${barClass} transition-[width] duration-500 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function InsightCard({
  card: c,
  langMode,
  expanded,
  onToggleWhy,
}: {
  card: ReAiWealthInsightCard;
  langMode: LangMode;
  expanded: boolean;
  onToggleWhy: () => void;
}) {
  const meta = KIND_META[c.kind];
  const Icon = ICON_MAP[c.icon];

  const headline = langMode === "ne" ? c.headlineNe : langMode === "en" ? c.headlineEn : null;
  const body = langMode === "ne" ? c.bodyNe : langMode === "en" ? c.bodyEn : null;
  const why = langMode === "ne" ? c.whyNe : langMode === "en" ? c.whyEn : null;

  return (
    <article
      className={`group relative min-w-0 overflow-hidden rounded-2xl border bg-gradient-to-br from-white/[0.04] via-black/35 to-black/55 p-3 shadow-inner shadow-black/40 backdrop-blur-md transition duration-300 sm:p-3.5 ${meta.border} ${meta.ring} ${meta.glow} hover:border-opacity-80`}
    >
      <div
        className={`pointer-events-none absolute inset-0 opacity-0 transition duration-500 group-hover:opacity-100 bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,255,255,0.06),transparent_55%)]`}
      />
      <div className="relative flex flex-col gap-2.5">
        <div className="flex flex-wrap items-start gap-2.5">
          <div
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br ring-1 ${meta.iconBg}`}
          >
            <Icon size={18} strokeWidth={2.2} className="drop-shadow-sm" />
          </div>
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${meta.chip}`}
              >
                {langMode === "ne" ? meta.labelNe : meta.labelEn}
              </span>
              <span className="text-[9px] font-bold uppercase tracking-wide text-emerald-200/40">AI signal</span>
            </div>
            {langMode === "both" ? (
              <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
                <div className="min-w-0 space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-200/45">English</p>
                  <h4 className="text-[12px] font-black leading-snug text-emerald-50 sm:text-sm">{c.headlineEn}</h4>
                </div>
                <div className="min-w-0 space-y-1 border-t border-white/10 pt-2 sm:border-l sm:border-t-0 sm:pl-3 sm:pt-0">
                  <p className="font-nepali text-[10px] font-bold uppercase tracking-wide text-emerald-200/45">
                    नेपाली
                  </p>
                  <h4 className="font-nepali text-[12px] font-bold leading-snug text-emerald-50/95 sm:text-sm">
                    {c.headlineNe}
                  </h4>
                </div>
              </div>
            ) : (
              <h4
                className={`text-[12px] font-black leading-snug text-emerald-50 sm:text-sm ${langMode === "ne" ? "font-nepali font-bold" : ""}`}
              >
                {headline}
              </h4>
            )}
          </div>
        </div>

        {langMode === "both" ? (
          <div className="grid gap-2 border-t border-white/[0.07] pt-2.5 sm:grid-cols-2 sm:gap-3">
            <p className="min-w-0 text-[11px] font-semibold leading-relaxed text-emerald-100/88 sm:text-xs">{c.bodyEn}</p>
            <p className="font-nepali min-w-0 border-t border-white/10 pt-2 text-[11px] font-medium leading-relaxed text-emerald-100/85 sm:border-l sm:border-t-0 sm:pl-3 sm:pt-0 sm:text-[0.8125rem]">
              {c.bodyNe}
            </p>
          </div>
        ) : (
          <p
            className={`border-t border-white/[0.07] pt-2.5 text-[11px] font-semibold leading-relaxed text-emerald-100/88 sm:text-xs ${langMode === "ne" ? "font-nepali font-medium" : ""}`}
          >
            {body}
          </p>
        )}

        <div className="flex flex-wrap gap-1.5">
          {c.badges.map((b) => (
            <span
              key={b.en}
              className="inline-flex max-w-full items-center rounded-md border border-white/10 bg-black/30 px-2 py-0.5 text-[9px] font-bold text-emerald-100/85"
            >
              <span className="min-w-0 truncate">{langMode === "ne" ? b.ne : langMode === "en" ? b.en : `${b.en} · ${b.ne}`}</span>
            </span>
          ))}
        </div>

        <ConfidenceMeter value={c.confidence} barClass={meta.bar} />

        <button
          type="button"
          onClick={onToggleWhy}
          className="flex w-full items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/25 px-2.5 py-2 text-left text-[10px] font-black uppercase tracking-wide text-cyan-200/90 transition hover:border-cyan-400/35 hover:bg-cyan-950/25"
          aria-expanded={expanded}
        >
          <span>Why this insight?</span>
          <ChevronDown
            size={16}
            className={`shrink-0 text-cyan-300/80 transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}
          />
        </button>
        {expanded ? (
          langMode === "both" ? (
            <div className="grid gap-2 rounded-xl border border-cyan-400/15 bg-cyan-950/20 px-2.5 py-2 sm:grid-cols-2 sm:gap-3">
              <p className="min-w-0 text-[10px] font-medium leading-relaxed text-emerald-100/85 sm:text-[11px]">{c.whyEn}</p>
              <p className="font-nepali min-w-0 border-t border-white/10 pt-2 text-[10px] font-medium leading-relaxed text-emerald-100/82 sm:border-l sm:border-t-0 sm:pl-3 sm:pt-0 sm:text-[11px]">
                {c.whyNe}
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-cyan-400/15 bg-cyan-950/20 px-2.5 py-2">
              <p
                className={`text-[10px] font-medium leading-relaxed text-emerald-100/85 sm:text-[11px] ${langMode === "ne" ? "font-nepali" : ""}`}
              >
                {why}
              </p>
            </div>
          )
        ) : null}
      </div>
    </article>
  );
}

export function RealEstateAiInsightsEngine({ bundle }: { bundle: ReAiWealthInsightsBundle }) {
  const [langMode, setLangMode] = useState<LangMode>("both");
  const [whyOpen, setWhyOpen] = useState<Record<string, boolean>>({});

  const toggleWhy = useCallback((id: string) => {
    setWhyOpen((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const sentimentStyle = SENTIMENT_STYLES[bundle.sentiment];
  const markerLeftPct = 50 + (clampMeter(bundle.sentimentMeter) / 100) * 42;

  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-slate-950/55 via-black/45 to-teal-950/25 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ring-1 ring-white/[0.04] backdrop-blur-md sm:p-3.5">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-2.5">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-500/25 to-cyan-600/15 text-violet-100 ring-1 ring-violet-400/25">
            <BrainCircuit size={18} strokeWidth={2.2} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-[11px] font-black uppercase tracking-[0.12em] text-emerald-100/95 sm:text-xs">
                AI wealth intelligence
              </h3>
              <span className="rounded-full border border-white/10 bg-black/35 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-emerald-200/55">
                Heuristic engine · not brokerage advice
              </span>
            </div>
            <p className="mt-1 text-[10px] font-semibold leading-snug text-emerald-200/50">
              Scenario-weighted signals from your purchase, mark, hold window, and optional appreciation target.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 rounded-full border border-white/10 bg-black/35 p-0.5 shadow-inner">
          {(["en", "ne", "both"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setLangMode(m)}
              className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wide transition sm:px-3 sm:text-[10px] ${
                langMode === m
                  ? "bg-gradient-to-r from-teal-500/35 to-cyan-500/25 text-teal-50 ring-1 ring-teal-400/35"
                  : "text-emerald-200/45 hover:text-emerald-100/80"
              }`}
            >
              {m === "en" ? "EN" : m === "ne" ? "नेपाली" : "Both"}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4 rounded-2xl border border-white/[0.07] bg-black/30 px-3 py-2.5 shadow-inner">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[9px] font-black uppercase tracking-wider text-emerald-200/45">Market sentiment</span>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide ${sentimentStyle.pill}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${sentimentStyle.dot}`} />
            {bundle.sentiment}
          </span>
        </div>
        <div className="relative mt-2 h-2.5 overflow-hidden rounded-full bg-black/55 ring-1 ring-white/[0.06]">
          <div
            className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-rose-500/25 to-transparent"
            aria-hidden
          />
          <div
            className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-lime-500/25 to-transparent"
            aria-hidden
          />
          <div
            className={`absolute top-1/2 z-[1] h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/30 ${sentimentStyle.dot} shadow-lg`}
            style={{ left: `${Math.min(96, Math.max(4, markerLeftPct))}%` }}
          />
        </div>
        <div className="mt-2 grid gap-1 sm:grid-cols-2 sm:gap-2">
          <p className="text-[10px] font-semibold leading-snug text-emerald-100/80">{bundle.sentimentLabelEn}</p>
          <p className="font-nepali text-[10px] font-medium leading-snug text-emerald-100/78">{bundle.sentimentLabelNe}</p>
        </div>
      </div>

      <ul className="grid list-none grid-cols-1 gap-3 p-0 sm:gap-3.5">
        {bundle.cards.map((c) => (
          <li key={c.id} className="min-w-0">
            <InsightCard
              card={c}
              langMode={langMode}
              expanded={!!whyOpen[c.id]}
              onToggleWhy={() => toggleWhy(c.id)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
