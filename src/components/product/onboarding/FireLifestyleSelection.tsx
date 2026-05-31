"use client";

import { CircleHelp, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useId, useState } from "react";
import type { FireTargetStyle } from "@/lib/product-onboarding-storage";

const HELPER =
  "Choose the lifestyle you want to maintain after reaching Financial Independence.";

const FIRE_DETAILS: Record<
  FireTargetStyle,
  { title: string; description: string; exampleLabel: string }
> = {
  lean_fire: {
    title: "Lean FIRE",
    description:
      "Lower spending lifestyle. Reach financial independence sooner with a smaller target portfolio.",
    exampleLabel: "Monthly expenses: NPR 50,000–100,000",
  },
  traditional_fire: {
    title: "Traditional FIRE",
    description:
      "Balanced lifestyle with comfortable spending and sustainable long-term planning.",
    exampleLabel: "Monthly expenses: NPR 100,000–250,000",
  },
  fat_fire: {
    title: "Fat FIRE",
    description:
      "Premium lifestyle with higher spending, larger safety margins, and a bigger retirement portfolio.",
    exampleLabel: "Monthly expenses: NPR 250,000+",
  },
};

const COMPARISON_ROWS: {
  type: string;
  spending: string;
  fireTarget: string;
  speed: string;
  key: FireTargetStyle;
}[] = [
  { key: "lean_fire", type: "Lean FIRE", spending: "Low", fireTarget: "Lower", speed: "Faster" },
  {
    key: "traditional_fire",
    type: "Traditional FIRE",
    spending: "Medium",
    fireTarget: "Medium",
    speed: "Balanced",
  },
  { key: "fat_fire", type: "Fat FIRE", spending: "High", fireTarget: "Higher", speed: "Slower" },
];

type FireLifestyleSelectionProps = {
  value: FireTargetStyle;
  onChange: (next: FireTargetStyle) => void;
};

export function FireLifestyleSelection({ value, onChange }: FireLifestyleSelectionProps) {
  const [infoKey, setInfoKey] = useState<FireTargetStyle | null>(null);
  const titleId = useId();

  const closeInfo = useCallback(() => setInfoKey(null), []);

  useEffect(() => {
    if (!infoKey) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeInfo();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [infoKey, closeInfo]);

  useEffect(() => {
    if (!infoKey) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [infoKey]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <p className="text-sm font-medium leading-relaxed text-emerald-100/80">{HELPER}</p>
        <Link
          href="/learn/fire-lifestyle"
          className="shrink-0 text-xs font-black uppercase tracking-[0.14em] text-emerald-400 underline-offset-4 transition hover:text-lime-300 hover:underline"
        >
          Learn More
        </Link>
      </div>

      <div className="space-y-2.5">
        {(
          [
            ["lean_fire", "Lean FIRE"] as const,
            ["traditional_fire", "Traditional FIRE"] as const,
            ["fat_fire", "Fat FIRE"] as const,
          ] as const
        ).map(([key, title]) => {
          const selected = value === key;
          const isTraditional = key === "traditional_fire";
          return (
            <div
              key={key}
              className={`flex items-stretch gap-0 rounded-xl border transition sm:gap-0 ${
                selected
                  ? "border-emerald-400/55 bg-gradient-to-br from-emerald-500/18 to-lime-400/5 shadow-[0_0_0_1px_rgba(52,211,153,0.12)]"
                  : "border-white/10 bg-black/25 hover:border-emerald-400/28 hover:bg-black/35"
              }`}
            >
              <button
                type="button"
                onClick={() => onChange(key)}
                aria-pressed={selected}
                className="flex min-w-0 flex-1 items-start gap-3 px-3.5 py-3.5 text-left sm:px-4 sm:py-3.5"
              >
                <span
                  className={`mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                    selected ? "border-lime-300 bg-lime-300 shadow-[0_0_12px_rgba(190,242,100,0.45)]" : "border-zinc-500"
                  }`}
                  aria-hidden
                >
                  {selected ? <span className="block h-1.5 w-1.5 rounded-full bg-emerald-950" /> : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-black tracking-tight text-white">{title}</span>
                    {isTraditional ? (
                      <span className="inline-flex max-w-full items-center rounded-full border border-lime-400/35 bg-lime-400/12 px-2 py-0.5 text-[9px] font-black uppercase leading-tight tracking-wider text-lime-200">
                        Recommended for most users
                      </span>
                    ) : null}
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => setInfoKey(key)}
                className="group shrink-0 self-start rounded-lg p-3 text-zinc-500 outline-none ring-emerald-400/40 transition hover:bg-white/5 hover:text-emerald-300 focus-visible:ring-2 sm:p-3.5"
                aria-label={`About ${title}`}
              >
                <CircleHelp className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />
              </button>
            </div>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-black/30">
        <p className="border-b border-white/[0.06] px-3 py-2.5 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-200/50">
          Quick comparison
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[340px] text-left text-xs">
            <thead>
              <tr className="border-b border-white/[0.06] text-[10px] font-black uppercase tracking-wider text-zinc-500">
                <th className="whitespace-nowrap px-3 py-2.5 sm:px-4">Type</th>
                <th className="whitespace-nowrap px-2 py-2.5 sm:px-3">Spending</th>
                <th className="whitespace-nowrap px-2 py-2.5 sm:px-3">FIRE Target</th>
                <th className="whitespace-nowrap px-3 py-2.5 sm:pr-4">Speed</th>
              </tr>
            </thead>
            <tbody className="font-semibold text-zinc-300">
              {COMPARISON_ROWS.map((row) => (
                <tr
                  key={row.key}
                  className={`border-b border-white/[0.04] last:border-0 ${
                    value === row.key ? "bg-emerald-500/[0.07]" : ""
                  }`}
                >
                  <td className="px-3 py-2.5 text-white sm:px-4">{row.type}</td>
                  <td className="px-2 py-2.5 text-emerald-100/85 sm:px-3">{row.spending}</td>
                  <td className="px-2 py-2.5 text-emerald-100/85 sm:px-3">{row.fireTarget}</td>
                  <td className="px-3 py-2.5 text-emerald-100/85 sm:pr-4">{row.speed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {infoKey ? (
        <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center sm:p-6">
          <button
            type="button"
            className="absolute inset-0 bg-[#030806]/85 backdrop-blur-md"
            aria-label="Close dialog"
            onClick={closeInfo}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative z-10 w-full max-w-md rounded-2xl border border-emerald-400/20 bg-[#07120c] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.65)] sm:p-6"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 id={titleId} className="text-lg font-black tracking-tight text-white">
                {FIRE_DETAILS[infoKey].title}
              </h2>
              <button
                type="button"
                onClick={closeInfo}
                className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-white/5 hover:text-white"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-3 text-sm font-medium leading-relaxed text-emerald-100/75">
              {FIRE_DETAILS[infoKey].description}
            </p>
            <div className="mt-4 rounded-xl border border-emerald-400/15 bg-emerald-500/5 px-3.5 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-200/45">Example</p>
              <p className="mt-1 text-sm font-bold text-lime-200/95">{FIRE_DETAILS[infoKey].exampleLabel}</p>
            </div>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Link
                href="/learn/fire-lifestyle"
                onClick={closeInfo}
                className="inline-flex justify-center rounded-xl border border-emerald-400/30 px-4 py-2.5 text-center text-xs font-black uppercase tracking-wide text-emerald-200 transition hover:border-emerald-400/50 hover:bg-emerald-500/10"
              >
                Learn More
              </Link>
              <button
                type="button"
                onClick={closeInfo}
                className="rounded-xl bg-gradient-to-r from-emerald-500 to-lime-400 px-4 py-2.5 text-xs font-black uppercase tracking-wide text-emerald-950 shadow-lg shadow-emerald-500/15"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
