"use client";

import { Star } from "lucide-react";
import { formatMoney } from "@/lib/expense-utils";
import type { NepseSecurityTick } from "@/types/market";

export type NepseQuoteMiniCardProps = {
  t: NepseSecurityTick;
  onWatch?: (sym: string) => void;
  watched?: boolean;
};

export function NepseQuoteMiniCard({ t, onWatch, watched }: NepseQuoteMiniCardProps) {
  const ch = t.changePct;
  const pos = ch != null && ch >= 0;
  return (
    <div className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-white/8 bg-black/30 px-2 py-1.5 text-[10px] font-bold text-emerald-100/90">
      <div className="min-w-0">
        <p className="truncate font-black text-emerald-50">{t.symbol}</p>
        <p className="truncate text-[9px] font-semibold text-emerald-200/55">{t.companyName ?? "—"}</p>
      </div>
      <div className="shrink-0 text-right tabular-nums">
        <p className="text-emerald-50">{formatMoney(t.ltpNpr, "NPR")}</p>
        {ch != null && Number.isFinite(ch) ? (
          <p className={pos ? "text-lime-300" : "text-rose-300"}>
            {pos ? "+" : ""}
            {ch.toFixed(2)}%
          </p>
        ) : (
          <p className="text-zinc-500">—</p>
        )}
      </div>
      {onWatch ? (
        <button
          type="button"
          aria-label={watched ? `Unwatch ${t.symbol}` : `Watch ${t.symbol}`}
          className={`grid h-7 w-7 shrink-0 place-items-center rounded-md border text-amber-200/70 hover:border-amber-400/35 hover:text-amber-100 ${
            watched ? "border-amber-400/50 bg-amber-500/15 text-amber-100" : "border-white/10"
          }`}
          onClick={() => onWatch(t.symbol)}
        >
          <Star size={13} className={watched ? "fill-amber-300/40" : ""} />
        </button>
      ) : null}
    </div>
  );
}
