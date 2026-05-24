"use client";

import { ArrowRightLeft, RefreshCw, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { sanitizeIntegerTyping } from "@/components/NumericMoneyInput";
import {
  fetchLiveExchangeRate,
  krwToNpr,
  type ExchangeRateSnapshot,
} from "@/lib/exchange-rate";
import { formatMoney } from "@/lib/expense-utils";

type CurrencyConverterBarProps = {
  rate: ExchangeRateSnapshot;
  onRateUpdate: (rate: ExchangeRateSnapshot) => void;
};

export function CurrencyConverterBar({ rate, onRateUpdate }: CurrencyConverterBarProps) {
  const [krwInput, setKrwInput] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [mounted, setMounted] = useState(false);

  const krwValue = useMemo(() => {
    const t = krwInput.replace(/,/g, "").trim();
    if (t === "") return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  }, [krwInput]);

  const nprValue = useMemo(
    () => (krwValue == null ? null : krwToNpr(krwValue, rate.krwPerNpr)),
    [krwValue, rate.krwPerNpr],
  );

  async function refreshRate() {
    setRefreshing(true);
    try {
      const live = await fetchLiveExchangeRate();
      onRateUpdate(live);
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    setMounted(true);
    void refreshRate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="glass-card animate-fade-in overflow-hidden rounded-[1.5rem] border border-emerald-100/80 p-4 sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-800">
            <TrendingUp size={14} /> Live KRW → NPR
          </div>
          <p className="text-sm font-bold text-slate-600">
            1 NPR = ₩{rate.krwPerNpr.toFixed(2)}
            <span className="mx-2 text-emerald-300">|</span>
            1 KRW = रु{rate.nprPerKrw.toFixed(4)}
          </p>
          <p className="mt-1 text-xs font-bold text-slate-400">
            {mounted ? (
              <>
                Updated {new Date(rate.updatedAt).toLocaleString()} · {rate.source === "live" ? "Live rate" : "Cached"}
              </>
            ) : (
              <>
                Updated <span className="tabular-nums text-slate-300">—</span> ·{" "}
                {rate.source === "live" ? "Live rate" : "Cached"}
              </>
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={refreshRate}
          disabled={refreshing}
          className="inline-flex w-fit items-center gap-2 rounded-2xl border border-emerald-200 bg-white px-4 py-2 text-xs font-black text-emerald-800 transition hover:bg-emerald-50 disabled:opacity-60"
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          Refresh rate
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
        <label className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-emerald-100">
          <span className="text-xs font-black uppercase tracking-wide text-slate-500">Korean Won (KRW)</span>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={krwInput}
            onChange={(event) => setKrwInput(sanitizeIntegerTyping(event.target.value))}
            className="mt-2 w-full bg-transparent text-2xl font-black text-emerald-900 outline-none"
            placeholder="Enter amount"
          />
        </label>
        <div className="hidden place-self-center rounded-full bg-emerald-700 p-3 text-white sm:grid">
          <ArrowRightLeft size={18} />
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald-900 p-4 text-white shadow-lg">
          <span className="text-xs font-black uppercase tracking-wide text-emerald-100">Nepali Rupee (NPR)</span>
          <p className="mt-2 text-2xl font-black">
            {nprValue == null ? <span className="text-emerald-200/90">—</span> : formatMoney(nprValue, "NPR")}
          </p>
          {krwValue != null && nprValue != null ? (
            <p className="mt-1 text-xs font-bold text-emerald-100">
              Auto-converted · ₩{krwValue.toLocaleString("en-US")} = {formatMoney(nprValue, "NPR")}
            </p>
          ) : (
            <p className="mt-1 text-xs font-bold text-emerald-100/90">Enter KRW to see NPR</p>
          )}
        </div>
      </div>

      <p className="mt-3 text-center text-xs font-bold text-emerald-700 sm:text-left">
        Example: ₩50,000 ≈ {formatMoney(krwToNpr(50000, rate.krwPerNpr), "NPR")} — shown on all expense cards
      </p>
    </section>
  );
}
