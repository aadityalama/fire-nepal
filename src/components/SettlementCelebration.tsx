"use client";

import { useEffect } from "react";
import { CheckCircle2 } from "lucide-react";

type SettlementCelebrationProps = {
  show: boolean;
  onComplete?: () => void;
};

const CONFETTI_COLORS = ["#007a3d", "#22c55e", "#d6a83e", "#064e3b", "#86efac", "#ffffff"];

export function SettlementCelebration({ show, onComplete }: SettlementCelebrationProps) {
  useEffect(() => {
    if (!show) return;
    const timer = window.setTimeout(() => onComplete?.(), 4200);
    return () => window.clearTimeout(timer);
  }, [show, onComplete]);

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-emerald-950/50 p-4 backdrop-blur-md"
      role="dialog"
      aria-label="Settlement complete"
    >
      {Array.from({ length: 48 }).map((_, index) => (
        <span
          key={index}
          className="confetti-piece"
          style={{
            left: `${(index * 17) % 100}%`,
            animationDelay: `${(index % 12) * 0.08}s`,
            backgroundColor: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
          }}
        />
      ))}

      <div className="settlement-success-card animate-fade-in relative max-w-md rounded-[2rem] border border-emerald-200 bg-white p-8 text-center shadow-2xl">
        <div className="mx-auto mb-4 grid h-20 w-20 place-items-center rounded-full bg-emerald-100 text-emerald-700 settlement-pulse">
          <CheckCircle2 size={42} />
        </div>
        <p className="font-nepali text-sm font-black uppercase tracking-[0.2em] text-emerald-700">
          सबै मिल्यो
        </p>
        <h2 className="mt-2 text-3xl font-black text-emerald-950">All settled 🎉</h2>
        <p className="mt-3 text-sm font-bold leading-7 text-slate-600">
          Every roommate balance is zero. Premium settlement complete for this month.
        </p>
      </div>
    </div>
  );
}
