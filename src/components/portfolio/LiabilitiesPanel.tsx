"use client";

import { Landmark, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { NumericMoneyInput } from "@/components/NumericMoneyInput";
import { CurrencySelect } from "@/components/portfolio/CurrencySelect";
import { PortfolioDateMeta } from "@/components/portfolio/PortfolioDateMeta";
import { PortfolioIsoDateField } from "@/components/portfolio/PortfolioIsoDateField";
import { recordLiabilityAddLoan, recordLiabilityPayLoan } from "@/components/portfolio/portfolio-ledger";
import {
  PortfolioTransactionStrip,
  portfolioTxnTodayIso,
  type TxnSegmentDef,
} from "@/components/portfolio/transaction-ui/PortfolioTransactionStrip";
import type { LiabilityKind, LiabilityRow, WealthPortfolioStateV2 } from "@/components/portfolio/types";

const LIAB_TX_SEGMENTS: TxnSegmentDef[] = [
  { id: "add", label: "Add loan", tone: "out" },
  { id: "pay", label: "Pay loan", tone: "in" },
];

function LiabilityTxnStrip({
  row,
  onMutate,
}: {
  row: LiabilityRow;
  onMutate: (fn: (s: WealthPortfolioStateV2) => WealthPortfolioStateV2 | null) => boolean;
}) {
  const [open, setOpen] = useState(false);
  const [segmentId, setSegmentId] = useState("pay");
  const [amtStr, setAmtStr] = useState("");
  const [feesStr, setFeesStr] = useState("");
  const [notes, setNotes] = useState("");
  const [tradeDate, setTradeDate] = useState(portfolioTxnTodayIso);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setErr(null);
    setTradeDate(portfolioTxnTodayIso());
  }, [open, segmentId, row.id]);

  const submit = () => {
    setErr(null);
    const amount = Number(amtStr.replace(/,/g, ""));
    if (!Number.isFinite(amount) || amount <= 0) {
      setErr("Enter a valid amount.");
      return;
    }
    const fees = feesStr.trim() === "" ? undefined : Number(feesStr.replace(/,/g, ""));
    if (fees != null && (!Number.isFinite(fees) || fees < 0)) {
      setErr("Fees must be non-negative.");
      return;
    }
    const payload = { amount, tradeDate, fees, notes: notes.trim() || undefined };
    const ok =
      segmentId === "add"
        ? onMutate((s) => recordLiabilityAddLoan(s, row.id, payload))
        : onMutate((s) => recordLiabilityPayLoan(s, row.id, payload));
    if (!ok) {
      setErr(segmentId === "pay" ? "Payment exceeds balance or invalid date." : "Could not record transaction.");
      return;
    }
    setAmtStr("");
    setFeesStr("");
    setNotes("");
  };

  return (
    <PortfolioTransactionStrip
      open={open}
      onOpenChange={setOpen}
      headerLabel="Transactions"
      summaryRight={`Bal. ${(row.amount ?? 0).toLocaleString()} ${row.currency}`}
      segments={LIAB_TX_SEGMENTS}
      segmentId={segmentId}
      onSegmentId={setSegmentId}
      tradeDate={tradeDate}
      onTradeDate={setTradeDate}
      feesLabel={`Fees (${row.currency})`}
      feesStr={feesStr}
      onFeesStrChange={setFeesStr}
      notes={notes}
      onNotesChange={setNotes}
      error={err}
      submitLabel={segmentId === "add" ? "Record add loan" : "Record pay loan"}
      onSubmit={submit}
      accent="rose"
    >
      <label className="block">
        <span className="mb-0.5 block text-[10px] font-bold uppercase text-emerald-200/55">Amount ({row.currency})</span>
        <input
          value={amtStr}
          onChange={(e) => setAmtStr(e.target.value)}
          inputMode="decimal"
          className="wealth-input-text w-full px-2 py-1.5 text-xs font-bold"
          placeholder="Principal change"
        />
      </label>
    </PortfolioTransactionStrip>
  );
}

const TYPES: { value: LiabilityKind; label: string }[] = [
  { value: "loan", label: "Loans" },
  { value: "credit", label: "Credit payments" },
  { value: "mortgage", label: "Mortgage" },
  { value: "personal", label: "Personal debt" },
];

export function LiabilitiesPanel({
  rows,
  onMutate,
  onChange,
  onAdd,
  onRemove,
}: {
  rows: LiabilityRow[];
  onMutate: (fn: (s: WealthPortfolioStateV2) => WealthPortfolioStateV2 | null) => boolean;
  onChange: (id: string, patch: Partial<LiabilityRow>) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
}) {
  return (
    <section className="wealth-glass rounded-[1.35rem] p-3.5 sm:rounded-[1.5rem] sm:p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-rose-500/20 text-rose-200">
            <Landmark size={18} />
          </div>
          <div>
            <h2 className="text-base font-black text-emerald-50 sm:text-lg">Liabilities</h2>
            <p className="text-xs font-bold leading-snug text-emerald-200/65 sm:text-sm">Outstanding balances</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-rose-400/25 bg-rose-500/15 px-2.5 py-1 text-[11px] font-black text-rose-100 transition hover:bg-rose-500/25 sm:text-xs"
        >
          <Plus size={14} /> Add
        </button>
      </div>
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.id} className="wealth-row-card space-y-2 rounded-xl p-2.5">
            <div className="grid gap-2 sm:grid-cols-12 sm:items-end">
              <label className="block sm:col-span-3">
                <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wide text-emerald-200/55">Category</span>
                <select
                  value={row.liabilityType}
                  onChange={(e) => onChange(row.id, { liabilityType: e.target.value as LiabilityKind })}
                  className="wealth-input w-full px-2 py-2 text-xs font-black sm:text-sm"
                >
                  {TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block min-w-0 sm:col-span-4">
                <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wide text-emerald-200/55">Name</span>
                <input
                  type="text"
                  value={row.name}
                  onChange={(e) => onChange(row.id, { name: e.target.value })}
                  placeholder="Lender / card"
                  className="wealth-input-text w-full px-2.5 py-2 text-xs sm:text-sm"
                />
              </label>
              <div className="min-w-0 sm:col-span-2">
                <NumericMoneyInput tone="dark"
                  label="Amount"
                  value={row.amount}
                  onChange={(n) => onChange(row.id, { amount: n })}
                  variant="amount"
                  placeholder="0"
                  className="text-[10px] font-bold uppercase tracking-wide text-zinc-200 [&>span]:block"
                  wrapperClassName="rounded-xl border border-emerald-400/15 bg-black/30 px-2 py-2"
                  inputClassName="min-w-0 flex-1 bg-transparent text-xs font-bold text-emerald-50 outline-none"
                />
              </div>
              <label className="block w-full sm:col-span-1">
                <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wide text-emerald-200/55">CCY</span>
                <CurrencySelect value={row.currency} onChange={(c) => onChange(row.id, { currency: c })} />
              </label>
              <div className="flex justify-end sm:col-span-2 sm:items-end">
                <button
                  type="button"
                  aria-label="Remove"
                  onClick={() => onRemove(row.id)}
                  className="rounded-xl p-2 text-emerald-300/40 transition hover:bg-rose-500/15 hover:text-rose-300"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-2 border-t border-emerald-400/10 pt-2 sm:flex-row sm:flex-wrap sm:items-end sm:gap-x-4 sm:gap-y-2">
              <PortfolioIsoDateField
                label="Loan start date"
                value={row.loanStartDate}
                onChange={(next) => onChange(row.id, { loanStartDate: next })}
              />
              <PortfolioDateMeta dateIso={row.loanStartDate} leadText="Loan age" />
            </div>
            <LiabilityTxnStrip row={row} onMutate={onMutate} />
          </div>
        ))}
      </div>
    </section>
  );
}
