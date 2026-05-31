"use client";

import { ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useProductAuth } from "@/contexts/ProductAuthContext";
import { applyOnboardingToCashflowIfEmpty } from "@/lib/apply-onboarding-profile";
import {
  DEFAULT_ONBOARDING,
  generateFireProfileFromOnboarding,
  loadProductOnboarding,
  saveProductOnboarding,
  type ProductOnboardingState,
} from "@/lib/product-onboarding-storage";
import { FireLifestyleSelection } from "@/components/product/onboarding/FireLifestyleSelection";

const COUNTRIES = [
  "South Korea",
  "Nepal",
  "United Arab Emirates",
  "Qatar",
  "Malaysia",
  "Singapore",
  "United States",
  "United Kingdom",
  "Australia",
  "Other",
];

const STEPS = ["Profile", "Income", "Location", "Savings", "FIRE goal"] as const;

export function OnboardingFlow() {
  const { user } = useProductAuth();
  const router = useRouter();
  const initial = useMemo(() => loadProductOnboarding(), []);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<ProductOnboardingState>(() => ({
    ...DEFAULT_ONBOARDING,
    ...initial,
    version: 1,
  }));
  const [busy, setBusy] = useState(false);

  function patch<K extends keyof ProductOnboardingState>(key: K, value: ProductOnboardingState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function finish() {
    setBusy(true);
    const generated = generateFireProfileFromOnboarding({
      ...form,
      completed: true,
    });
    const next: ProductOnboardingState = {
      ...form,
      completed: true,
      completedAt: new Date().toISOString(),
      generated,
    };
    saveProductOnboarding(next);
    applyOnboardingToCashflowIfEmpty(next);
    setBusy(false);
    router.replace("/hub");
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#030806] px-4 py-10 text-zinc-100 sm:px-6 sm:py-14">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(52,211,153,0.18),transparent_50%)]" />
      <div className="relative mx-auto max-w-lg">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-200/55">Onboarding</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">Shape your FIRE profile</h1>
        <p className="mt-2 text-sm font-medium text-emerald-100/65">
          {user ? `Welcome, ${user.name.split(" ")[0]}` : "Welcome"} — five quick inputs seed analytics and optional cashflow defaults.
        </p>

        <div className="mt-8 flex gap-1.5 overflow-x-auto pb-1">
          {STEPS.map((label, i) => (
            <button
              key={label}
              type="button"
              onClick={() => setStep(i)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-wide transition ${
                i === step
                  ? "bg-gradient-to-r from-emerald-500 to-lime-400 text-emerald-950"
                  : "border border-white/10 bg-black/30 text-zinc-400 hover:border-emerald-400/30"
              }`}
            >
              {i + 1}. {label}
            </button>
          ))}
        </div>

        <div className="mt-6 rounded-[1.35rem] border border-emerald-400/16 bg-white/[0.04] p-5 shadow-[0_20px_70px_rgba(0,0,0,0.45)] backdrop-blur-2xl sm:p-7">
          {step === 0 ? (
            <div className="space-y-4">
              <label className="block">
                <span className="text-[11px] font-black uppercase tracking-[0.12em] text-emerald-200/55">Age</span>
                <input
                  type="number"
                  min={18}
                  max={80}
                  value={form.age || ""}
                  onChange={(e) => patch("age", Number(e.target.value) || 0)}
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-emerald-400/40"
                />
              </label>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="space-y-4">
              <label className="block">
                <span className="text-[11px] font-black uppercase tracking-[0.12em] text-emerald-200/55">Monthly salary (NPR)</span>
                <input
                  type="number"
                  min={0}
                  value={form.salaryMonthlyNpr || ""}
                  onChange={(e) => patch("salaryMonthlyNpr", Number(e.target.value) || 0)}
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-emerald-400/40"
                  placeholder="e.g. 350000"
                />
              </label>
              <p className="text-xs font-medium text-zinc-500">Use a single monthly figure in NPR for now — KRW desks still convert live inside tools.</p>
            </div>
          ) : null}

          {step === 2 ? (
            <label className="block">
              <span className="text-[11px] font-black uppercase tracking-[0.12em] text-emerald-200/55">Country / region</span>
              <select
                value={form.country}
                onChange={(e) => patch("country", e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-emerald-400/40"
              >
                {COUNTRIES.map((c) => (
                  <option key={c} value={c} className="bg-zinc-900">
                    {c}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {step === 3 ? (
            <div className="space-y-4">
              <label className="block">
                <span className="text-[11px] font-black uppercase tracking-[0.12em] text-emerald-200/55">Monthly savings (NPR)</span>
                <input
                  type="number"
                  min={0}
                  value={form.monthlySavingsNpr || ""}
                  onChange={(e) => patch("monthlySavingsNpr", Number(e.target.value) || 0)}
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-emerald-400/40"
                  placeholder="What you invest + save after spend"
                />
              </label>
            </div>
          ) : null}

          {step === 4 ? <FireLifestyleSelection value={form.fireTarget} onChange={(next) => patch("fireTarget", next)} /> : null}

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              disabled={step === 0}
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-bold text-zinc-300 transition enabled:hover:border-emerald-400/30 enabled:hover:text-white disabled:opacity-30"
            >
              Back
            </button>
            {step < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-lime-400 px-5 py-2.5 text-sm font-black text-emerald-950 shadow-lg shadow-emerald-500/20 transition hover:-translate-y-0.5"
              >
                Continue
                <ArrowRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                disabled={busy || form.salaryMonthlyNpr <= 0}
                onClick={finish}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-lime-400 px-5 py-2.5 text-sm font-black text-emerald-950 shadow-lg shadow-emerald-500/20 transition enabled:hover:-translate-y-0.5 disabled:opacity-40"
              >
                {busy ? "Saving…" : "Generate profile"}
                <CheckCircle2 size={16} />
              </button>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-xs font-semibold text-zinc-500">
          Skip for now?{" "}
          <Link href="/hub" className="font-black text-emerald-400 hover:text-emerald-200">
            Go to hub
          </Link>
        </p>
      </div>
    </main>
  );
}
