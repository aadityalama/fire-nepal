"use client";

import { useEffect, useState } from "react";
import { useFireTheme } from "@/contexts/FireThemeContext";
import { LendingAnimatedNumber } from "@/components/fire-lending/FireLendingUiPrimitives";
import { formatLendingMoney } from "@/lib/fire-lending/format";
import type { PortfolioSummary } from "@/lib/fire-lending/types";

function HealthRing({ score, light }: { score: number; light: boolean }) {
  const [progress, setProgress] = useState(0);
  const radius = 54;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (progress / 100) * circ;

  useEffect(() => {
    const t = window.setTimeout(() => setProgress(score), 120);
    return () => window.clearTimeout(t);
  }, [score]);

  return (
    <div className="relative grid h-[140px] w-[140px] place-items-center sm:h-[156px] sm:w-[156px]">
      <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
        <circle cx="64" cy="64" r={radius} fill="none" stroke={light ? "#d1fae5" : "#064e3b"} strokeWidth="10" />
        <circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          stroke="url(#healthGrad)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-1000 ease-out"
        />
        <defs>
          <linearGradient id="healthGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="55%" stopColor="#84cc16" />
            <stop offset="100%" stopColor="#fbbf24" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className={`text-[10px] font-black uppercase tracking-[0.16em] ${light ? "text-emerald-700" : "text-emerald-300/80"}`}>Health</p>
          <p className={`text-3xl font-black tabular-nums ${light ? "text-slate-900" : "text-white"}`}>{Math.round(progress)}</p>
        </div>
      </div>
    </div>
  );
}

export function FireLendingHeroCard({ summary, loading }: { summary: PortfolioSummary; loading: boolean }) {
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const updated = (() => {
    try {
      const raw = summary.lastUpdated || "2026-01-01T00:00:00.000Z";
      return new Intl.DateTimeFormat("en-NP", { hour: "numeric", minute: "2-digit", day: "numeric", month: "short" }).format(new Date(raw));
    } catch {
      return "Just now";
    }
  })();

  const metrics = [
    { label: "Net Outstanding", value: formatLendingMoney(summary.netOutstanding) },
    { label: "Active Loans", value: String(summary.totalActiveLoans) },
    { label: "Total Lent", value: formatLendingMoney(summary.totalLent) },
    { label: "Total Borrowed", value: formatLendingMoney(summary.totalBorrowed) },
    { label: "Today's Collection", value: formatLendingMoney(summary.dueToday) },
    { label: "Expected Interest", value: formatLendingMoney(summary.expectedInterest) },
  ];

  return (
    <section
      className={`relative overflow-hidden rounded-[1.5rem] border p-4 backdrop-blur-xl sm:rounded-[1.75rem] sm:p-5 lg:p-6 ${
        light
          ? "border-emerald-200/70 bg-gradient-to-br from-white via-emerald-50/50 to-amber-50/40 shadow-[0_24px_60px_-28px_rgba(15,23,42,0.18)]"
          : "border-emerald-400/15 bg-gradient-to-br from-emerald-950/70 via-[#04140f]/80 to-amber-950/30 shadow-[0_1px_0_rgba(255,255,255,0.05)_inset]"
      }`}
    >
      <div
        className={`pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full blur-3xl ${light ? "bg-emerald-400/25" : "bg-emerald-500/20"}`}
        aria-hidden
      />
      <div
        className={`pointer-events-none absolute -bottom-20 left-10 h-48 w-48 rounded-full blur-3xl ${light ? "bg-amber-300/20" : "bg-amber-500/10"}`}
        aria-hidden
      />

      <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-500">Loan Portfolio</p>
            <span
              className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                light ? "border-amber-300/70 bg-amber-50 text-amber-800" : "border-amber-400/35 bg-amber-500/15 text-amber-200"
              }`}
            >
              Elite
            </span>
          </div>
          <h1 className={`mt-1.5 text-2xl font-black tracking-tight sm:text-3xl ${light ? "text-slate-900" : "text-white"}`}>
            Loan & P2P Lending Portfolio
          </h1>
          <p className={`mt-2 max-w-2xl text-sm font-semibold leading-relaxed ${light ? "text-slate-600" : "text-emerald-100/75"}`}>
            {loading ? "Syncing portfolio intelligence…" : summary.aiSummary}
          </p>
          <p className={`mt-3 text-[11px] font-bold ${light ? "text-slate-500" : "text-emerald-200/55"}`}>Last updated · {updated}</p>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {metrics.map((m) => (
              <div
                key={m.label}
                className={`rounded-xl border px-3 py-2.5 backdrop-blur-md ${
                  light ? "border-white/80 bg-white/75" : "border-emerald-400/15 bg-black/25"
                }`}
              >
                <p className={`text-[9px] font-black uppercase tracking-wider ${light ? "text-slate-500" : "text-emerald-200/55"}`}>{m.label}</p>
                <p className={`mt-1 truncate text-sm font-black tabular-nums sm:text-base ${light ? "text-slate-900" : "text-emerald-50"}`}>
                  <LendingAnimatedNumber value={loading ? "…" : m.value} loading={loading} />
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex shrink-0 justify-center lg:justify-end">
          <HealthRing score={loading ? 0 : summary.healthScore} light={light} />
        </div>
      </div>
    </section>
  );
}
