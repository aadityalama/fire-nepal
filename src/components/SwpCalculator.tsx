"use client";

import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from "chart.js";
import type { TooltipItem } from "chart.js";
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  Gauge,
  LineChart,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { Bar, Line } from "react-chartjs-2";
import { NumericMoneyInput } from "@/components/NumericMoneyInput";
import {
  buildSwpAiInsight,
  formatSwpCurrency,
  runSwpSimulation,
  type SwpCurrency,
} from "@/lib/swp-calculator";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
  Filler,
);

function StatCard({
  label,
  nepaliLabel,
  value,
  hint,
}: {
  label: string;
  nepaliLabel?: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-emerald-100/80 bg-white/80 p-4 shadow-sm backdrop-blur sm:p-5">
      <p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p>
      {nepaliLabel ? <NepaliSubLabel>{nepaliLabel}</NepaliSubLabel> : null}
      <p className="mt-2 text-xl font-black leading-tight tracking-tight text-emerald-950 sm:text-2xl">{value}</p>
      {hint ? <p className="mt-1.5 text-sm font-bold leading-snug text-slate-500">{hint}</p> : null}
    </div>
  );
}

function NepaliSubLabel({
  children,
  className = "",
}: Readonly<{
  children: ReactNode;
  className?: string;
}>) {
  return (
    <span className={`font-nepali block text-[0.72rem] font-semibold leading-snug tracking-normal text-slate-400 ${className}`}>
      {children}
    </span>
  );
}

function BilingualInputLabel({
  label,
  nepaliLabel,
  children,
}: Readonly<{
  label: string;
  nepaliLabel: string;
  children: ReactNode;
}>) {
  return (
    <div className="min-w-0">
      <div className="mb-2">
        <p className="text-sm font-bold text-zinc-600">{label}</p>
        <NepaliSubLabel>{nepaliLabel}</NepaliSubLabel>
      </div>
      {children}
    </div>
  );
}

export function SwpCalculator() {
  const [currency, setCurrency] = useState<SwpCurrency>("KRW");
  const [initialCorpus, setInitialCorpus] = useState<number | undefined>(undefined);
  const [monthlyWithdrawal, setMonthlyWithdrawal] = useState<number | undefined>(undefined);
  const [returnPct, setReturnPct] = useState<number | undefined>(undefined);
  const [inflationPct, setInflationPct] = useState<number | undefined>(undefined);
  const [horizonYearsRaw, setHorizonYearsRaw] = useState<number | undefined>(undefined);

  function applyCurrencyPreset(next: SwpCurrency) {
    setCurrency(next);
    setInitialCorpus(undefined);
    setMonthlyWithdrawal(undefined);
  }

  const parsed = useMemo(() => {
    const initial = Math.max(0, initialCorpus ?? 0);
    const monthly = Math.max(0, monthlyWithdrawal ?? 0);
    const annualReturnPct = returnPct ?? 0;
    const annualInflationPct = inflationPct ?? 0;
    const horizonYears = Math.max(1, Math.min(80, Math.round(horizonYearsRaw ?? 35)));
    return { initial, monthly, annualReturnPct, annualInflationPct, horizonYears };
  }, [initialCorpus, monthlyWithdrawal, returnPct, inflationPct, horizonYearsRaw]);

  const result = useMemo(
    () =>
      runSwpSimulation({
        initialCorpus: parsed.initial,
        monthlyWithdrawal: parsed.monthly,
        annualReturnPct: parsed.annualReturnPct,
        annualInflationPct: parsed.annualInflationPct,
        horizonYears: parsed.horizonYears,
      }),
    [parsed],
  );

  const fmt = (n: number) => formatSwpCurrency(n, currency);
  const amountPrefix = currency === "KRW" ? "₩" : "रु";

  const aiText = useMemo(
    () => buildSwpAiInsight(result, parsed.horizonYears, currency, parsed.annualInflationPct),
    [result, parsed.horizonYears, currency, parsed.annualInflationPct],
  );

  const labels = result.yearly.map((y) => `Y${y.year}`);
  const balanceLineData = {
    labels,
    datasets: [
      {
        label: "Balance (inflation on spending)",
        data: result.yearly.map((y) => Math.round(y.balanceWithInflation)),
        borderColor: "#007a3d",
        backgroundColor: "rgba(0, 122, 61, 0.12)",
        fill: true,
        tension: 0.35,
        pointRadius: 2,
        pointHoverRadius: 6,
        borderWidth: 2,
      },
      {
        label: "Balance (flat spending)",
        data: result.yearly.map((y) => Math.round(y.balanceFlatWithdrawal)),
        borderColor: "#d6a83e",
        backgroundColor: "rgba(214, 168, 62, 0.08)",
        fill: true,
        tension: 0.35,
        pointRadius: 2,
        pointHoverRadius: 6,
        borderWidth: 2,
      },
    ],
  };

  const withdrawalBarData = {
    labels,
    datasets: [
      {
        label: "Withdrawals (inflation path)",
        data: result.yearly.map((y) => Math.round(y.withdrawalsNominal)),
        backgroundColor: "rgba(0, 122, 61, 0.55)",
        borderRadius: 8,
        borderSkipped: false,
      },
      {
        label: "Withdrawals (flat)",
        data: result.yearly.map((y) => Math.round(y.withdrawalsFlat)),
        backgroundColor: "rgba(214, 168, 62, 0.45)",
        borderRadius: 8,
        borderSkipped: false,
      },
    ],
  };

  const chartCommonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        align: "start" as const,
        labels: {
          boxWidth: 10,
          boxHeight: 10,
          color: "#1e3a2f",
              font: { size: 11, weight: "bold" as const },
          usePointStyle: true,
        },
      },
      tooltip: {
        backgroundColor: "rgba(0, 63, 47, 0.92)",
        padding: 12,
        cornerRadius: 12,
        titleFont: { size: 12, weight: "bold" as const },
        bodyFont: { size: 12 },
        callbacks: {
          label: (ctx: TooltipItem<"line" | "bar">) => {
            const v =
              typeof ctx.raw === "number"
                ? ctx.raw
                : Number(ctx.parsed.y ?? ctx.parsed.x ?? 0);
            const name = ctx.dataset?.label ?? "";
            return ` ${name}: ${fmt(v)}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: "#64748b", maxRotation: 45, minRotation: 0, autoSkip: true, maxTicksLimit: 14 },
      },
      y: {
        grid: { color: "rgba(0, 63, 47, 0.06)" },
        ticks: {
          color: "#64748b",
          callback: (value: string | number) => fmt(Number(value)),
        },
      },
    },
  };

  const monthlyReturnMoney = parsed.initial * (parsed.annualReturnPct / 100 / 12);
  const showDepletionWarning =
    result.depletionMonth !== null ||
    result.safetyLevel === "risk" ||
    result.initialWithdrawalRatePct > 5;

  const safetyCopy =
    result.safetyLevel === "safe"
      ? "Comfort band"
      : result.safetyLevel === "caution"
        ? "Watch closely"
        : "High stress";

  const safetyColor =
    result.safetyLevel === "safe"
      ? "from-emerald-600 to-emerald-500"
      : result.safetyLevel === "caution"
        ? "from-amber-500 to-amber-400"
        : "from-red-600 to-rose-500";

  return (
    <main className="premium-shell min-h-screen bg-[#f4fbf6] px-4 pb-24 pt-6 text-emerald-950 sm:px-6 sm:pt-8 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/"
            className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-100 bg-white px-4 py-2.5 text-sm font-black text-emerald-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-50"
          >
            <ArrowLeft size={16} /> Back to FIRE Nepal
          </Link>
          <div className="flex gap-2 rounded-full border border-emerald-100 bg-white/90 p-1 shadow-sm backdrop-blur">
            {(["KRW", "NPR"] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => applyCurrencyPreset(c)}
                className={`rounded-full px-4 py-2 text-sm font-black transition ${
                  currency === c ? "bg-emerald-700 text-white shadow-md" : "text-emerald-800 hover:bg-emerald-50"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <section className="dark-glass-card relative overflow-hidden rounded-[2rem] p-6 text-white md:p-10">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-400/20 blur-3xl" />
          <div className="relative grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-black text-emerald-100">
                <Wallet size={18} /> SWP Calculator
              </div>
              <h1 className="text-3xl font-black leading-[1.1] tracking-[-0.04em] sm:text-4xl md:text-5xl">
                Systematic withdrawal planning
              </h1>
              <p className="font-nepali mt-3 max-w-2xl text-lg font-semibold leading-snug text-emerald-50/70 sm:text-xl md:text-2xl">
                नेपाल ↔ कोरिया जीवनको लागि व्यवस्थित निकासी योजना
              </p>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-emerald-50/85 sm:text-lg">
                Model inflation-linked spending, portfolio survival, and safe withdrawal pressure — in {currency} with
                premium visuals built for FIRE Nepal.
              </p>
            </div>
            <div className="glass-card rounded-[1.7rem] p-6 text-emerald-950">
              <div className="flex items-start gap-2 text-sm font-black text-slate-500">
                <Gauge size={18} className="text-emerald-700" />
                <div>
                  <span>FIRE withdrawal safety</span>
                  <NepaliSubLabel>FIRE निकासी सुरक्षा</NepaliSubLabel>
                </div>
              </div>
              <div className="mt-4 flex items-end justify-between gap-4">
                <div>
                  <p className="text-4xl font-black tracking-tight text-emerald-900 sm:text-5xl">
                    {result.initialWithdrawalRatePct.toFixed(2)}%
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-600">Initial withdrawal rate (annualized)</p>
                </div>
                <div
                  className={`grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${safetyColor} text-center text-xs font-black uppercase leading-tight text-white shadow-lg shadow-emerald-950/20`}
                >
                  {safetyCopy}
                </div>
              </div>
              <p className="mt-4 text-sm font-bold leading-relaxed text-slate-600">
                Benchmark: many FIRE plans anchor near 3–4% initial withdrawal for 30+ year horizons. This is an
                educational model, not tax or investment advice.
              </p>
            </div>
          </div>
        </section>

        {showDepletionWarning ? (
          <div className="mt-6 flex gap-3 rounded-2xl border border-amber-200/80 bg-amber-50/90 p-4 text-amber-950 shadow-sm backdrop-blur sm:p-5">
            <AlertTriangle className="mt-0.5 shrink-0 text-amber-600" size={22} />
            <div>
              <p className="font-black text-amber-950">Safe withdrawal warning</p>
              <NepaliSubLabel className="text-amber-800/65">सुरक्षित निकासी चेतावनी</NepaliSubLabel>
              <p className="mt-1 text-sm font-bold leading-relaxed text-amber-900/90">
                {result.depletionMonth
                  ? `Projected depletion in ${result.survivalYearsDisplay} — raise capital, lower monthly draws, or improve expected return assumptions.`
                  : result.initialWithdrawalRatePct > 5
                    ? "Initial withdrawal rate exceeds a common 5% stress threshold; long-run outcomes remain sensitive to returns and inflation."
                    : "Risk profile is stretched; review spending, sequence-of-returns risk, and buffer assets."}
              </p>
            </div>
          </div>
        ) : null}

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="glass-card rounded-[1.7rem] p-5 sm:p-7">
            <h2 className="flex items-start gap-2 text-xl font-black leading-snug text-emerald-950 sm:text-2xl">
              <LineChart className="text-emerald-700" size={22} />
              <span>
                Inputs
                <NepaliSubLabel>विवरण</NepaliSubLabel>
              </span>
            </h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <BilingualInputLabel label="Initial investment" nepaliLabel="प्रारम्भिक लगानी">
                <NumericMoneyInput
                  aria-label="Initial investment"
                  prefix={amountPrefix}
                  value={initialCorpus}
                  onChange={setInitialCorpus}
                  variant="amount"
                  placeholder="Enter amount"
                  wrapperClassName="rounded-2xl border border-emerald-100 bg-white px-4 py-3.5 shadow-sm ring-emerald-100 transition focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-100"
                  inputClassName="min-w-0 flex-1 bg-transparent text-base font-bold text-emerald-950 outline-none"
                />
              </BilingualInputLabel>
              <BilingualInputLabel label="Monthly withdrawal" nepaliLabel="मासिक निकासी">
                <NumericMoneyInput
                  aria-label="Monthly withdrawal"
                  prefix={amountPrefix}
                  value={monthlyWithdrawal}
                  onChange={setMonthlyWithdrawal}
                  variant="amount"
                  placeholder="Enter amount"
                  wrapperClassName="rounded-2xl border border-emerald-100 bg-white px-4 py-3.5 shadow-sm ring-emerald-100 transition focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-100"
                  inputClassName="min-w-0 flex-1 bg-transparent text-base font-bold text-emerald-950 outline-none"
                />
              </BilingualInputLabel>
              <BilingualInputLabel label="Expected annual return %" nepaliLabel="अपेक्षित वार्षिक प्रतिफल">
                <NumericMoneyInput
                  aria-label="Expected annual return percent"
                  value={returnPct}
                  onChange={setReturnPct}
                  variant="percent"
                  suffix="%"
                  placeholder="e.g. 7"
                  wrapperClassName="rounded-2xl border border-emerald-100 bg-white px-4 py-3.5 shadow-sm ring-emerald-100 transition focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-100"
                  inputClassName="min-w-0 flex-1 bg-transparent text-base font-bold text-emerald-950 outline-none"
                />
              </BilingualInputLabel>
              <BilingualInputLabel label="Inflation rate %" nepaliLabel="मुद्रास्फीति दर">
                <NumericMoneyInput
                  aria-label="Inflation rate percent"
                  value={inflationPct}
                  onChange={setInflationPct}
                  variant="percent"
                  suffix="%"
                  placeholder="e.g. 4"
                  wrapperClassName="rounded-2xl border border-emerald-100 bg-white px-4 py-3.5 shadow-sm ring-emerald-100 transition focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-100"
                  inputClassName="min-w-0 flex-1 bg-transparent text-base font-bold text-emerald-950 outline-none"
                />
              </BilingualInputLabel>
              <div className="sm:col-span-2">
                <BilingualInputLabel label="Investment horizon (years)" nepaliLabel="लगानी अवधि">
                  <NumericMoneyInput
                    aria-label="Investment horizon years"
                    value={horizonYearsRaw}
                    onChange={setHorizonYearsRaw}
                    variant="integer"
                    suffix="years"
                    placeholder="e.g. 35"
                    wrapperClassName="max-w-md rounded-2xl border border-emerald-100 bg-white px-4 py-3.5 shadow-sm ring-emerald-100 transition focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-100"
                    inputClassName="min-w-0 flex-1 bg-transparent text-base font-bold text-emerald-950 outline-none"
                  />
                </BilingualInputLabel>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-5">
            <div className="relative overflow-hidden rounded-[1.7rem] border border-emerald-100 bg-white/85 p-6 shadow-lg shadow-emerald-950/5 backdrop-blur">
              <div
                className="absolute inset-0 opacity-[0.12]"
                style={{
                  background: `conic-gradient(#007a3d ${Math.min(360, result.sustainabilityScore * 3.6)}deg, #e2f5eb 0deg)`,
                }}
              />
              <div className="relative text-center">
                <p className="text-xs font-black uppercase tracking-wide text-slate-500">Sustainability score</p>
                <NepaliSubLabel>दिगोपन स्कोर</NepaliSubLabel>
                <p className="mt-2 text-5xl font-black tracking-tight text-emerald-800">{result.sustainabilityScore}</p>
                <p className="mt-2 text-sm font-bold text-slate-600">Higher is better — blends runway and ending strength.</p>
              </div>
            </div>
            <div className="glass-card flex flex-1 flex-col rounded-[1.7rem] p-5 sm:p-6">
              <div className="flex items-center gap-2 text-emerald-800">
                <Bot size={20} />
                <div>
                  <p className="text-sm font-black uppercase tracking-wide">AI-style insight</p>
                  <NepaliSubLabel>एआई सुझाव</NepaliSubLabel>
                </div>
              </div>
              <p className="mt-3 text-sm font-bold leading-relaxed text-slate-700">{aiText}</p>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total withdrawals (nominal)"
            nepaliLabel="कुल निकासी"
            value={fmt(result.totalWithdrawalsNominal)}
            hint="Inflation-adjusted spending path"
          />
          <StatCard
            label="Passive monthly draw"
            nepaliLabel="मासिक निकासी"
            value={fmt(parsed.monthly)}
            hint="Starting withdrawal — lifestyle funded from portfolio"
          />
          <StatCard
            label="Gross monthly return (start)"
            nepaliLabel="सुरुको मासिक प्रतिफल"
            value={fmt(monthlyReturnMoney)}
            hint="Approx. first-month portfolio return before withdrawals"
          />
          <StatCard
            label="Survival horizon"
            nepaliLabel="टिक्ने अवधि"
            value={result.survivalYearsDisplay}
            hint={result.depletionMonth ? "Until depletion in model" : "Across full projection"}
          />
        </div>

        <section className="mt-10 grid gap-8 lg:grid-cols-2">
          <div className="glass-card rounded-[1.7rem] p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-emerald-950 sm:text-xl">Yearly balance projection</h2>
                <NepaliSubLabel>वार्षिक ब्यालेन्स प्रक्षेपण</NepaliSubLabel>
              </div>
              <ShieldCheck className="shrink-0 text-emerald-600" size={22} />
            </div>
            <p className="mb-4 text-sm font-bold leading-relaxed text-slate-600">
              Gold line shows spending held flat; green follows rising withdrawals with inflation — the gap is inflation
              impact on the portfolio.
            </p>
            <div className="h-72 w-full min-h-[16rem]">
              <Line data={balanceLineData} options={chartCommonOptions} />
            </div>
          </div>
          <div className="glass-card rounded-[1.7rem] p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-emerald-950 sm:text-xl">Withdrawals & inflation</h2>
                <NepaliSubLabel>निकासी र मुद्रास्फीति</NepaliSubLabel>
              </div>
              <TrendingDown className="shrink-0 text-amber-600" size={22} />
            </div>
            <p className="mb-4 text-sm font-bold leading-relaxed text-slate-600">
              Yearly cash pulled from the portfolio: inflation path vs flat spending (same starting withdrawal).
            </p>
            <div className="h-72 w-full min-h-[16rem]">
              <Bar
                data={withdrawalBarData}
                options={{
                  ...chartCommonOptions,
                  scales: {
                    ...chartCommonOptions.scales,
                    x: { ...chartCommonOptions.scales.x, stacked: false },
                  },
                }}
              />
            </div>
          </div>
        </section>

        <section className="mt-8 glass-card rounded-[1.7rem] p-5 sm:p-7">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="text-emerald-600" size={22} />
              <div>
                <h2 className="text-lg font-black text-emerald-950 sm:text-xl">Ending balances (model)</h2>
                <NepaliSubLabel>अन्तिम ब्यालेन्स</NepaliSubLabel>
              </div>
            </div>
            <p className="text-sm font-bold text-slate-600">
              With inflation on spending: <span className="font-black text-emerald-800">{fmt(result.endingBalanceNominal)}</span>
              {" · "}
              Flat spending path: <span className="font-black text-amber-800">{fmt(result.endingBalanceFlat)}</span>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
