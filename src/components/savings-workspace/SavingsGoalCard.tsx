"use client";

import { CheckCircle2, MoreHorizontal, PauseCircle, Pencil, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { computeGoalProgress, formatDisplayDate, formatRs, STATUS_TONE_STYLES } from "@/lib/savings/savings-utils";
import type { SavingsGoal } from "@/lib/savings/savings-types";

type SavingsGoalCardProps = {
  goal: SavingsGoal;
  index: number;
  onEdit: (goal: SavingsGoal) => void;
  onPause: (goal: SavingsGoal) => void;
  onDelete: (goal: SavingsGoal) => void;
  onComplete: (goal: SavingsGoal) => void;
};

function MiniRing({ pct }: { pct: number }) {
  const clamped = Math.max(0, Math.min(100, pct));
  const circumference = 2 * Math.PI * 18;
  return (
    <div className="relative grid h-12 w-12 place-items-center">
      <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 44 44" aria-hidden>
        <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
        <circle
          cx="22"
          cy="22"
          r="18"
          fill="none"
          stroke="#a3e635"
          strokeLinecap="round"
          strokeWidth="4"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - (clamped / 100) * circumference}
        />
      </svg>
      <span className="text-[11px] font-black text-lime-100">{clamped}%</span>
    </div>
  );
}

export function SavingsGoalCard({ goal, index, onEdit, onPause, onDelete, onComplete }: SavingsGoalCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const progress = computeGoalProgress(goal);
  const paused = goal.status === "paused";
  const completed = goal.status === "completed";

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    window.addEventListener("mousedown", onPointerDown);
    return () => window.removeEventListener("mousedown", onPointerDown);
  }, [menuOpen]);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.04, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-[1.55rem] border border-white/10 bg-white/[0.06] p-4 shadow-[0_18px_60px_-34px_rgba(0,0,0,0.8)] backdrop-blur-xl motion-safe:hover:-translate-y-0.5 motion-safe:transition-transform"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400/25 to-lime-300/20 text-2xl shadow-lg">
            {goal.icon}
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-base font-black text-white">{goal.name}</h3>
            <p className="mt-0.5 text-xs font-bold text-emerald-100/55">{goal.category}</p>
          </div>
        </div>
        <div className="relative shrink-0" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="grid min-h-[40px] min-w-[40px] touch-manipulation place-items-center rounded-full border border-white/10 bg-white/[0.05] text-emerald-100 transition active:scale-95"
            aria-label={`Actions for ${goal.name}`}
          >
            <MoreHorizontal size={18} />
          </button>
          {menuOpen ? (
            <div className="absolute right-0 top-11 z-20 min-w-[180px] overflow-hidden rounded-2xl border border-white/10 bg-[#071512]/95 p-1.5 shadow-2xl backdrop-blur-xl">
              <button type="button" onClick={() => { setMenuOpen(false); onEdit(goal); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-emerald-50 hover:bg-white/[0.06]">
                <Pencil size={16} /> Edit
              </button>
              {!completed ? (
                <button type="button" onClick={() => { setMenuOpen(false); onPause(goal); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-emerald-50 hover:bg-white/[0.06]">
                  <PauseCircle size={16} /> {paused ? "Resume" : "Pause"}
                </button>
              ) : null}
              {!completed ? (
                <button type="button" onClick={() => { setMenuOpen(false); onComplete(goal); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-emerald-50 hover:bg-white/[0.06]">
                  <CheckCircle2 size={16} /> Mark Completed
                </button>
              ) : null}
              <button type="button" onClick={() => { setMenuOpen(false); onDelete(goal); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-rose-200 hover:bg-rose-500/10">
                <Trash2 size={16} /> Delete
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-emerald-100/45">Saved / Target</p>
          <p className="mt-1 text-sm font-black text-emerald-50">
            {formatRs(goal.savedAmountNpr)} <span className="text-emerald-100/45">/ {formatRs(goal.targetAmountNpr)}</span>
          </p>
        </div>
        <MiniRing pct={progress.savedPct} />
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between text-xs font-black">
          <span className={`rounded-full border px-2.5 py-1 uppercase tracking-wide ${STATUS_TONE_STYLES[progress.statusTone]}`}>
            {progress.remainingLabel}
          </span>
          <span className="text-lime-200">{progress.savedPct}%</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-lime-300"
            initial={{ width: 0 }}
            animate={{ width: `${progress.savedPct}%` }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      </div>

      <div className="mt-4 grid gap-2 text-xs font-semibold text-emerald-100/55 sm:grid-cols-2">
        <p>Remaining: {formatRs(progress.remainingAmountNpr)}</p>
        <p>
          Expected finish: {progress.expectedCompletionDate ? formatDisplayDate(progress.expectedCompletionDate) : "—"}
        </p>
      </div>

      {goal.aiRecommendation ? (
        <p className="mt-3 rounded-2xl border border-white/10 bg-black/15 px-3 py-2 text-xs font-semibold leading-relaxed text-emerald-50/85">
          {goal.aiRecommendation}
        </p>
      ) : null}
    </motion.article>
  );
}
