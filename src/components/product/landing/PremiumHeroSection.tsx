"use client";

import { ArrowRight, Play, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useHomepageLanguage } from "@/contexts/HomepageLanguageContext";
import { useProductAuth } from "@/contexts/ProductAuthContext";

const nepalTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Kathmandu",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

const fixedHeroHeadline = [
  "आजै योजना बनाऔं,",
  "आर्थिक स्वतन्त्रता हासिल गरौं,",
  "र सम्मानका साथ नेपाल फर्कौं !",
] as const;

function ProgressRing({ value, size = "lg" }: { value: number; size?: "sm" | "lg" }) {
  const dimensions = size === "lg" ? "h-28 w-28" : "h-20 w-20";

  return (
    <div
      className={`grid ${dimensions} place-items-center rounded-full`}
      style={{
        background: `conic-gradient(#007a3d ${value * 3.6}deg, #dceee4 0deg)`,
      }}
    >
      <div className="grid h-[72%] w-[72%] place-items-center rounded-full bg-white text-center">
        <span className="text-xl font-black text-emerald-800">{value}%</span>
      </div>
    </div>
  );
}

function NepalTimeHeroOrb() {
  const { copy } = useHomepageLanguage();
  const [now, setNow] = useState<Date | null>(null);
  const heroCopy = copy.hero;

  useEffect(() => {
    setNow(new Date());
    const interval = window.setInterval(() => setNow(new Date()), 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  const liveTime = now ? nepalTimeFormatter.format(now) : "00:00:00";

  return (
    <div
      aria-label={`${heroCopy.liveNpt} ${heroCopy.kathmanduNepal}: ${liveTime}`}
      className="pointer-events-none absolute right-5 top-16 z-[1] flex w-28 items-center justify-center text-center sm:right-10 sm:top-20 sm:w-32 lg:right-[max(2rem,calc((100vw-80rem)/2+4rem))] lg:top-[5.4rem] lg:w-40"
    >
      <div className="relative flex w-full flex-col items-center justify-center text-emerald-950">
        <div className="mb-1 inline-flex items-center gap-1 rounded-full text-[0.48rem] font-semibold uppercase tracking-[0.2em] text-emerald-950 drop-shadow-[0_1px_8px_rgba(255,255,255,0.85)] sm:text-[0.52rem] lg:text-[0.56rem]">
          <span className="h-1 w-1 animate-pulse rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.9)]" />
          {heroCopy.liveNpt}
        </div>
        <time
          dateTime={now?.toISOString()}
          className="min-w-[7ch] text-base font-semibold leading-none tracking-[-0.04em] text-slate-950 drop-shadow-[0_1px_9px_rgba(255,255,255,0.95)] [font-variant-numeric:tabular-nums] sm:text-lg lg:text-2xl"
        >
          {liveTime}
        </time>
        <p className="mt-1 text-[0.5rem] font-medium uppercase tracking-[0.16em] text-emerald-950 drop-shadow-[0_1px_8px_rgba(255,255,255,0.9)] sm:text-[0.55rem] lg:text-[0.65rem]">
          {heroCopy.kathmanduNepal}
        </p>
      </div>
    </div>
  );
}

export function PremiumHeroSection() {
  const { user } = useProductAuth();
  const { copy } = useHomepageLanguage();
  const hubHref = user ? "/hub" : "/login?next=%2Fhub";
  const heroCopy = copy.hero;

  return (
    <header id="home" className="nepal-hero relative">
      <NepalTimeHeroOrb />
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#f4fbf6] to-transparent" />
      <div className="mx-auto grid min-h-[620px] max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.08fr_0.92fr] lg:px-8 lg:py-20">
        <div className="relative z-10 max-w-3xl animate-fade-up">
          <div className="glass-card mb-5 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold text-emerald-800">
            <Sparkles size={16} />
            {heroCopy.badge}
          </div>
          <h1 className="font-nepali text-4xl font-black leading-[1.2] tracking-[-0.045em] text-emerald-950 sm:text-5xl sm:leading-[1.15] md:text-6xl md:leading-[1.1] lg:text-7xl">
            {fixedHeroHeadline[0]}
            <span className="mt-2 block text-emerald-700 sm:mt-3">{fixedHeroHeadline[1]}</span>
            <span className="mt-2 block sm:mt-3">{fixedHeroHeadline[2]}</span>
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-700 sm:text-lg sm:leading-relaxed">
            {heroCopy.description}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href={hubHref}
              className="glow-button inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-emerald-700 px-6 py-3.5 text-base font-extrabold text-white transition hover:-translate-y-1 hover:bg-emerald-800 sm:px-7 sm:text-lg"
            >
              {heroCopy.startDashboard} <ArrowRight size={18} />
            </Link>
            <Link
              href="/portfolio/simulation"
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-emerald-200/90 bg-white/80 px-6 py-3.5 text-base font-extrabold text-emerald-900 shadow-lg shadow-emerald-950/5 backdrop-blur transition hover:-translate-y-1 hover:bg-white sm:text-lg"
            >
              {heroCopy.runSimulation} <ArrowRight size={18} />
            </Link>
            <Link
              href="/cashflow-dashboard#payslip-import"
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-slate-200/90 bg-slate-900/[0.04] px-6 py-3.5 text-base font-extrabold text-emerald-950 backdrop-blur transition hover:-translate-y-1 hover:border-emerald-300/60 hover:bg-white sm:text-lg"
            >
              {heroCopy.importPayslip}
            </Link>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-4">
            {heroCopy.featureCards.map(({ title, body }) => (
              <div key={title} className="glass-card rounded-2xl p-4 transition hover:-translate-y-1">
                <Sparkles className="mb-2 text-emerald-700" size={17} />
                <p className="text-sm font-black text-emerald-950">{title}</p>
                <p className="text-xs leading-relaxed text-slate-600">{body}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 mx-auto w-full max-w-md animate-fade-up lg:max-w-none" style={{ animationDelay: "80ms" }}>
          <div className="glass-card floating-widget soft-gradient-border rounded-[2rem] p-6">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <p className="text-sm font-black text-emerald-950">{heroCopy.returnReadiness}</p>
                <p className="text-sm leading-snug text-slate-500">{heroCopy.snapshot}</p>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">{heroCopy.liveUi}</span>
            </div>
            <div className="grid grid-cols-[auto_1fr] items-center gap-6">
              <ProgressRing value={82} />
              <div className="space-y-3">
                {heroCopy.progressLabels.map((label, index) => {
                  const value = ["82%", "70%", "94%"][index] ?? "82%";

                  return (
                  <div key={label}>
                    <div className="mb-1 flex justify-between text-xs font-bold text-slate-600">
                      <span>{label}</span>
                      <span>{value}</span>
                    </div>
                    <div className="h-2 rounded-full bg-emerald-100">
                      <div className="h-2 rounded-full bg-emerald-700" style={{ width: value }} />
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-gradient-to-br from-emerald-950 to-emerald-700 p-4 text-white shadow-lg shadow-emerald-950/15">
                <p className="text-xs text-emerald-100">{heroCopy.savedAbroad}</p>
                <p className="mt-1 text-2xl font-black">₩31.2M</p>
              </div>
              <div className="rounded-2xl bg-white/75 p-4 shadow-inner shadow-emerald-950/5">
                <p className="text-xs text-slate-500">{heroCopy.nepalCorpus}</p>
                <p className="mt-1 text-2xl font-black text-emerald-800">रु 42.8L</p>
              </div>
            </div>
            <button
              type="button"
              className="mt-5 flex w-full min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-emerald-100 bg-white/80 py-3 text-sm font-black text-emerald-900 transition hover:bg-white"
            >
              <Play size={17} fill="currentColor" /> {heroCopy.watchDemo}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
