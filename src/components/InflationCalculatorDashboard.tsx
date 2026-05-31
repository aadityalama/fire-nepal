"use client";

import { ArrowLeft, Calculator, Gauge, ShieldAlert, Sparkles, TrendingUp, WalletCards } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

const presets = [
  { label: "Nepal Avg 5%", value: "5", helper: "Steady planning" },
  { label: "High Inflation 8%", value: "8", helper: "Stress test" },
  { label: "Crisis 12%", value: "12", helper: "Hard scenario" },
];

function sanitizeDecimalInput(value: string) {
  const cleaned = value.replace(/,/g, "").replace(/[^\d.]/g, "");
  const dot = cleaned.indexOf(".");
  if (dot === -1) return cleaned;
  return `${cleaned.slice(0, dot + 1)}${cleaned.slice(dot + 1).replace(/\./g, "")}`;
}

function sanitizeIntegerInput(value: string) {
  return value.replace(/[^\d]/g, "");
}

function formatNpr(value: number) {
  return new Intl.NumberFormat("en-NP", {
    maximumFractionDigits: 0,
    style: "currency",
    currency: "NPR",
  }).format(Math.round(value));
}

function formatPct(value: number) {
  return `${value.toLocaleString("en-US", { maximumFractionDigits: 1 })}%`;
}

function InputField({
  label,
  value,
  onChange,
  prefix,
  suffix,
  inputMode = "decimal",
}: Readonly<{
  label: string;
  value: string;
  onChange: (next: string) => void;
  prefix?: string;
  suffix?: string;
  inputMode?: "decimal" | "numeric";
}>) {
  return (
    <label className="block rounded-3xl border border-white/70 bg-white/75 p-4 shadow-[0_18px_55px_rgba(0,63,47,0.07)] backdrop-blur-xl transition focus-within:border-emerald-300 focus-within:ring-4 focus-within:ring-emerald-100/80">
      <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{label}</span>
      <span className="mt-3 flex items-center gap-2">
        {prefix ? <span className="text-sm font-black text-emerald-700">{prefix}</span> : null}
        <input
          className="min-w-0 flex-1 bg-transparent text-right text-2xl font-black tracking-tight text-emerald-950 outline-none placeholder:text-emerald-200 sm:text-3xl"
          inputMode={inputMode}
          value={value}
          placeholder="0"
          onChange={(event) => onChange(event.target.value)}
        />
        {suffix ? <span className="text-sm font-black text-slate-500">{suffix}</span> : null}
      </span>
    </label>
  );
}

function ResultCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "emerald",
}: Readonly<{
  label: string;
  value: string;
  hint: string;
  icon: typeof TrendingUp;
  tone?: "emerald" | "gold" | "red";
}>) {
  const toneClass =
    tone === "gold"
      ? "from-amber-500 to-yellow-400 text-amber-950"
      : tone === "red"
        ? "from-rose-500 to-orange-400 text-white"
        : "from-emerald-700 to-emerald-500 text-white";

  return (
    <article className="group overflow-hidden rounded-3xl border border-white/70 bg-white/75 p-4 shadow-[0_20px_70px_rgba(0,63,47,0.09)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:shadow-[0_28px_80px_rgba(0,122,61,0.16)] sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{label}</p>
          <p className="mt-3 text-2xl font-black tracking-tight text-emerald-950 sm:text-3xl">{value}</p>
          <p className="mt-2 text-sm font-bold leading-snug text-slate-500">{hint}</p>
        </div>
        <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${toneClass} shadow-lg transition group-hover:scale-105`}>
          <Icon size={22} />
        </div>
      </div>
    </article>
  );
}

export function InflationCalculatorDashboard() {
  const [amountRaw, setAmountRaw] = useState("100000");
  const [rateRaw, setRateRaw] = useState("5");
  const [yearsRaw, setYearsRaw] = useState("10");

  const parsed = useMemo(() => {
    const amount = Math.max(0, Number(amountRaw || 0));
    const rate = Math.max(0, Math.min(100, Number(rateRaw || 0)));
    const years = Math.max(0, Math.min(60, Math.floor(Number(yearsRaw || 0))));
    const factor = Math.pow(1 + rate / 100, years);
    const futureValue = amount * factor;
    const realValueAfterYears = factor > 0 ? amount / factor : amount;
    const purchasingPowerLoss = Math.max(0, amount - realValueAfterYears);
    const impactPct = amount > 0 ? (futureValue / amount - 1) * 100 : 0;
    const lossPct = amount > 0 ? (purchasingPowerLoss / amount) * 100 : 0;

    const projection = Array.from({ length: years + 1 }, (_, index) => {
      const yearFactor = Math.pow(1 + rate / 100, index);
      const yearFutureValue = amount * yearFactor;
      const yearRealValue = yearFactor > 0 ? amount / yearFactor : amount;
      return {
        year: index,
        futureValue: yearFutureValue,
        realValue: yearRealValue,
        loss: Math.max(0, amount - yearRealValue),
        impactPct: amount > 0 ? (yearFutureValue / amount - 1) * 100 : 0,
      };
    });

    return {
      amount,
      rate,
      years,
      futureValue,
      realValueAfterYears,
      purchasingPowerLoss,
      impactPct,
      lossPct,
      projection,
    };
  }, [amountRaw, rateRaw, yearsRaw]);

  const chartPoints = useMemo(() => {
    if (parsed.projection.length <= 1) return "0,88 100,88";
    const maxValue = Math.max(...parsed.projection.map((point) => point.futureValue), 1);
    return parsed.projection
      .map((point, index) => {
        const x = (index / (parsed.projection.length - 1)) * 100;
        const y = 92 - (point.futureValue / maxValue) * 72;
        return `${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(" ");
  }, [parsed.projection]);

  const impactBarWidth = `${Math.min(100, parsed.impactPct)}%`;
  const realValueWidth = `${Math.max(4, Math.min(100, 100 - parsed.lossPct))}%`;

  return (
    <main className="premium-shell min-h-screen overflow-hidden px-4 py-6 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-7xl">
        <div className="mb-5">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white/75 px-4 py-2 text-sm font-black text-emerald-800 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-50"
          >
            <ArrowLeft size={16} />
            Back to Homepage
          </Link>
        </div>

        <div className="dark-glass-card relative overflow-hidden rounded-[2rem] p-5 text-white sm:p-7 lg:p-8">
          <div className="absolute -left-20 top-8 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl" />
          <div className="absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-yellow-300/10 blur-3xl" />
          <div className="relative grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-emerald-100">
                <Sparkles size={14} />
                Free FIRE Nepal Tool
              </p>
              <h1 className="mt-4 max-w-3xl text-4xl font-black leading-[0.95] tracking-[-0.05em] sm:text-5xl lg:text-6xl">
                Inflation Calculator Nepal
              </h1>
              <p className="mt-5 max-w-2xl text-base font-medium leading-relaxed text-emerald-50/85 sm:text-lg">
                See how much today&apos;s NPR needs to become in the future, and how inflation quietly reduces buying
                power for savings, return-to-Nepal goals, and FIRE planning.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {presets.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setRateRaw(preset.value)}
                    className={`rounded-2xl border px-4 py-3 text-left shadow-sm backdrop-blur transition hover:-translate-y-1 ${
                      rateRaw === preset.value
                        ? "border-emerald-200 bg-white text-emerald-950"
                        : "border-white/15 bg-white/10 text-white hover:bg-white/15"
                    }`}
                  >
                    <span className="block text-sm font-black">{preset.label}</span>
                    <span className="block text-xs font-bold opacity-75">{preset.helper}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-white/15 bg-white/10 p-4 shadow-2xl backdrop-blur-xl sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.16em] text-emerald-100">Future Value</p>
                  <p className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">{formatNpr(parsed.futureValue)}</p>
                </div>
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white text-emerald-800 shadow-lg">
                  <Calculator size={25} />
                </div>
              </div>
              <div className="rounded-2xl bg-emerald-950/35 p-4">
                <div className="mb-3 flex items-center justify-between text-xs font-black uppercase tracking-[0.14em] text-emerald-100">
                  <span>Inflation impact</span>
                  <span>{formatPct(parsed.impactPct)}</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-white/15">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-300 via-lime-300 to-yellow-300 transition-all duration-700"
                    style={{ width: impactBarWidth }}
                  />
                </div>
                <p className="mt-3 text-sm font-bold leading-relaxed text-emerald-50/80">
                  At {formatPct(parsed.rate)} inflation, {formatNpr(parsed.amount)} today becomes{" "}
                  {formatNpr(parsed.futureValue)} in {parsed.years} years.
                </p>
              </div>
            </div>
          </div>
        </div>

        <section className="mt-6 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="glass-card soft-gradient-border rounded-[2rem] p-4 sm:p-5">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-emerald-950">Inputs</h2>
                <p className="text-sm font-bold text-slate-500">Fast NPR inflation model for public planning.</p>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">Live</span>
            </div>
            <div className="grid gap-4">
              <InputField
                label="Current Amount"
                value={amountRaw}
                prefix="रु"
                onChange={(next) => setAmountRaw(sanitizeDecimalInput(next))}
              />
              <InputField
                label="Inflation Rate"
                value={rateRaw}
                suffix="%"
                onChange={(next) => setRateRaw(sanitizeDecimalInput(next))}
              />
              <InputField
                label="Years"
                value={yearsRaw}
                suffix="yrs"
                inputMode="numeric"
                onChange={(next) => setYearsRaw(sanitizeIntegerInput(next))}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <ResultCard
              label="Future Value"
              value={formatNpr(parsed.futureValue)}
              hint="Amount needed to match today's buying power."
              icon={TrendingUp}
            />
            <ResultCard
              label="Purchasing Power Loss"
              value={formatNpr(parsed.purchasingPowerLoss)}
              hint={`${formatPct(parsed.lossPct)} of today's value is eroded.`}
              icon={ShieldAlert}
              tone="red"
            />
            <ResultCard
              label="Inflation Impact"
              value={formatPct(parsed.impactPct)}
              hint="Total compounded price increase over the period."
              icon={Gauge}
              tone="gold"
            />
            <ResultCard
              label="Real Value Remaining"
              value={formatNpr(parsed.realValueAfterYears)}
              hint="Buying power of the same nominal cash later."
              icon={WalletCards}
            />
          </div>
        </section>

        <section className="mt-6 grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="glass-card soft-gradient-border overflow-hidden rounded-[2rem] p-5 sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-emerald-950">Projection Line</h2>
                <p className="text-sm font-bold text-slate-500">Simple path of your required future value.</p>
              </div>
              <span className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                {parsed.years}Y
              </span>
            </div>
            <div className="rounded-3xl border border-emerald-100/70 bg-gradient-to-br from-emerald-50/90 to-white/75 p-4">
              <svg className="h-52 w-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Inflation projection line">
                <defs>
                  <linearGradient id="inflationLine" x1="0" x2="1" y1="0" y2="0">
                    <stop offset="0%" stopColor="#007a3d" />
                    <stop offset="100%" stopColor="#d6a83e" />
                  </linearGradient>
                </defs>
                <polyline
                  points={chartPoints}
                  fill="none"
                  stroke="url(#inflationLine)"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="3.5"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
              <div className="mt-3 flex items-center justify-between text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                <span>Today</span>
                <span>{formatNpr(parsed.futureValue)}</span>
              </div>
            </div>
            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between text-sm font-black text-emerald-950">
                <span>Purchasing power retained</span>
                <span>{formatPct(100 - parsed.lossPct)}</span>
              </div>
              <div className="h-4 overflow-hidden rounded-full bg-rose-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-700 to-emerald-400 transition-all duration-700"
                  style={{ width: realValueWidth }}
                />
              </div>
            </div>
          </div>

          <div className="glass-card soft-gradient-border rounded-[2rem] p-5 sm:p-6">
            <div className="mb-5">
              <h2 className="text-2xl font-black tracking-tight text-emerald-950">Year-by-Year Projection</h2>
              <p className="text-sm font-bold text-slate-500">Compounded with Future Value = Present Value x (1 + rate)^years.</p>
            </div>
            <div className="max-h-[28rem] overflow-auto rounded-3xl border border-emerald-100/80 bg-white/75">
              <table className="min-w-full text-left text-sm">
                <thead className="sticky top-0 bg-emerald-950 text-xs uppercase tracking-[0.14em] text-emerald-50">
                  <tr>
                    <th className="px-4 py-3 font-black">Year</th>
                    <th className="px-4 py-3 font-black">Future Value</th>
                    <th className="px-4 py-3 font-black">Buying Power</th>
                    <th className="px-4 py-3 font-black">Impact</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-100/80">
                  {parsed.projection.map((row) => (
                    <tr key={row.year} className="transition hover:bg-emerald-50/75">
                      <td className="whitespace-nowrap px-4 py-3 font-black text-emerald-950">{row.year}</td>
                      <td className="whitespace-nowrap px-4 py-3 font-bold text-slate-700">{formatNpr(row.futureValue)}</td>
                      <td className="whitespace-nowrap px-4 py-3 font-bold text-slate-700">{formatNpr(row.realValue)}</td>
                      <td className="whitespace-nowrap px-4 py-3 font-black text-amber-700">{formatPct(row.impactPct)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
