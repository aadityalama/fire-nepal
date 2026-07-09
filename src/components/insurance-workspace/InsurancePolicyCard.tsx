"use client";

import { CalendarDays, MoreHorizontal, Pencil, Trash2, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { InsurancePolicy } from "@/lib/insurance/insurance-types";
import { INSURANCE_TYPE_ICONS } from "@/lib/insurance/insurance-types";
import {
  buildPremiumDisplay,
  daysUntil,
  formatDisplayDate,
  formatRs,
  statusTone,
  typeLabel,
} from "@/lib/insurance/insurance-utils";

const glassCard = "rounded-[1.5rem] border border-white/10 bg-white/[0.055] backdrop-blur-xl sm:rounded-[1.65rem]";

const STATUS_STYLES = {
  green: "border-emerald-300/35 bg-emerald-400/15 text-lime-100",
  orange: "border-amber-300/40 bg-amber-400/15 text-amber-100",
  red: "border-rose-300/40 bg-rose-400/15 text-rose-100",
  slate: "border-white/15 bg-white/[0.06] text-emerald-100/70",
} as const;

type InsurancePolicyCardProps = {
  policy: InsurancePolicy;
  index: number;
  onEdit: (policy: InsurancePolicy) => void;
  onDelete: (policy: InsurancePolicy) => void;
};

export function InsurancePolicyCard({ policy, index, onEdit, onDelete }: InsurancePolicyCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const tone = statusTone(policy.status);
  const days = daysUntil(policy.expiryDate);
  const premium = buildPremiumDisplay(policy.premiumNpr, policy.paymentFrequency);
  const isLife = policy.type === "life";
  const isHealth = policy.type === "health";

  useEffect(() => {
    if (!menuOpen) return;
    const onPointer = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    window.addEventListener("mousedown", onPointer);
    return () => window.removeEventListener("mousedown", onPointer);
  }, [menuOpen]);

  return (
    <article
      className={`${glassCard} relative overflow-hidden p-4 sm:p-5`}
      style={{ animationDelay: `${Math.min(index, 6) * 40}ms` }}
    >
      <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-emerald-400/10 blur-2xl" aria-hidden />
      <div className="relative flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/[0.06] text-2xl">
            {INSURANCE_TYPE_ICONS[policy.type]}
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-emerald-100/45">{typeLabel(policy.type)}</p>
            <h3 className="mt-0.5 truncate text-lg font-black tracking-[-0.03em] text-white">{policy.provider}</h3>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${STATUS_STYLES[tone]}`}>
                {policy.status}
              </span>
              {days <= 45 && Number.isFinite(days) ? (
                <span className="rounded-full border border-amber-300/35 bg-amber-400/12 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-amber-100">
                  {days < 0 ? "Renewal overdue" : `Renew in ${days}d`}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="grid h-10 w-10 place-items-center rounded-full bg-white/[0.06] text-emerald-100"
            aria-label="Policy actions"
          >
            <MoreHorizontal size={18} />
          </button>
          {menuOpen ? (
            <div className="absolute right-0 top-12 z-20 min-w-[148px] overflow-hidden rounded-2xl border border-white/10 bg-[#04150f]/95 p-1 shadow-2xl backdrop-blur-xl">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onEdit(policy);
                }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-emerald-50 hover:bg-white/[0.06]"
              >
                <Pencil size={15} /> Edit
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onDelete(policy);
                }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-rose-200 hover:bg-rose-400/10"
              >
                <Trash2 size={15} /> Delete
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="relative mt-4 grid grid-cols-2 gap-2.5">
        <div className="rounded-2xl border border-white/10 bg-black/15 px-3 py-3">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100/40">Coverage</p>
          <p className="mt-1 text-base font-black tracking-[-0.03em] text-white">{formatRs(policy.coverageAmountNpr)}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/15 px-3 py-3">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100/40">{premium.label}</p>
          <p className="mt-1 text-base font-black tracking-[-0.03em] text-lime-100">{premium.value}</p>
        </div>
      </div>

      <div className="relative mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-semibold text-emerald-100/55">
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays size={13} />
          Expiry {formatDisplayDate(policy.expiryDate)}
        </span>
        {isLife && policy.nominee ? <span>Nominee · {policy.nominee}</span> : null}
        {(isHealth || policy.familyMembersCovered.length > 0) && (
          <span className="inline-flex items-center gap-1.5">
            <Users size={13} />
            {policy.familyMembersCovered.length > 0
              ? `${policy.familyMembersCovered.length} covered`
              : "Family cover"}
          </span>
        )}
      </div>
    </article>
  );
}
