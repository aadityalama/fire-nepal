"use client";

import { Building2, Landmark, Pencil, PiggyBank, Plus, Trash2, Wallet } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { NumericMoneyInput } from "@/components/NumericMoneyInput";
import {
  aggregateFdMonthlyInterestNpr,
  fdDerivedMetricsForRow,
  sumFixedDepositPrincipalNpr,
} from "@/components/portfolio/banking-fd";
import { CurrencySelect } from "@/components/portfolio/CurrencySelect";
import { sumSimpleLinesNpr } from "@/components/portfolio/calculations";
import { PortfolioDateMeta } from "@/components/portfolio/PortfolioDateMeta";
import { PortfolioIsoDateField } from "@/components/portfolio/PortfolioIsoDateField";
import type { LedgerFx } from "@/components/portfolio/portfolio-ledger";
import { recordLiquidCashAdd, recordLiquidCashWithdraw } from "@/components/portfolio/portfolio-ledger";
import { ModuleLedgerCard } from "@/components/portfolio/ledger-ui/ModuleLedgerCard";
import {
  PortfolioTransactionStrip,
  portfolioTxnTodayIso,
  type TxnSegmentDef,
} from "@/components/portfolio/transaction-ui/PortfolioTransactionStrip";
import type {
  FdCompounding,
  FixedDepositRow,
  PortfolioLedgerEntry,
  SimpleMoneyLine,
  WealthPortfolioStateV2,
} from "@/components/portfolio/types";
import { formatMoney } from "@/lib/expense-utils";
import { emptySimpleLine } from "@/components/portfolio/storage";

const LIQ_TX_SEGMENTS: TxnSegmentDef[] = [
  { id: "add", label: "Add cash", tone: "in" },
  { id: "withdraw", label: "Withdraw", tone: "out" },
];

const FD_COMPOUNDING: { value: FdCompounding; label: string }[] = [
  { value: "simple", label: "Simple" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annual", label: "Annual" },
];

type BankingTab = "liquid" | "fixed";

function LiquidCashTxnStrip({
  line,
  ledgerFx,
  onMutate,
}: {
  line: SimpleMoneyLine;
  ledgerFx: LedgerFx;
  onMutate: (fn: (s: WealthPortfolioStateV2) => WealthPortfolioStateV2 | null) => boolean;
}) {
  const [open, setOpen] = useState(false);
  const [segmentId, setSegmentId] = useState("add");
  const [amtStr, setAmtStr] = useState("");
  const [feesStr, setFeesStr] = useState("");
  const [notes, setNotes] = useState("");
  const [tradeDate, setTradeDate] = useState(portfolioTxnTodayIso);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setErr(null);
    setTradeDate(portfolioTxnTodayIso());
  }, [open, segmentId, line.id]);

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
        ? onMutate((s) => recordLiquidCashAdd(s, line.id, payload, ledgerFx))
        : onMutate((s) => recordLiquidCashWithdraw(s, line.id, payload, ledgerFx));
    if (!ok) {
      setErr(segmentId === "withdraw" ? "Withdraw exceeds balance or invalid date." : "Could not record transaction.");
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
      summaryRight={`${formatMoney(line.amount ?? 0, line.currency)}`}
      segments={LIQ_TX_SEGMENTS}
      segmentId={segmentId}
      onSegmentId={setSegmentId}
      innerPanelClassName="mt-2 space-y-2 rounded-xl border border-sky-400/20 bg-gradient-to-br from-slate-950/80 via-black/45 to-sky-950/20 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-md sm:p-3"
      tradeDate={tradeDate}
      onTradeDate={setTradeDate}
      feesLabel={`Fees (${line.currency})`}
      feesStr={feesStr}
      onFeesStrChange={setFeesStr}
      notes={notes}
      onNotesChange={setNotes}
      error={err}
      submitLabel={segmentId === "add" ? "Record add cash" : "Record withdraw"}
      onSubmit={submit}
      accent="sky"
    >
      <label className="block">
        <span className="mb-0.5 block text-[10px] font-bold uppercase text-emerald-200/55">Amount ({line.currency})</span>
        <input
          value={amtStr}
          onChange={(e) => setAmtStr(e.target.value)}
          inputMode="decimal"
          className="wealth-input-text w-full px-2 py-1.5 text-xs font-bold"
          placeholder="0"
        />
      </label>
    </PortfolioTransactionStrip>
  );
}

export function LiquidCashPanel({
  lines,
  fixedDeposits,
  ledger,
  ledgerFx,
  onMutate,
  onUpsertLiquid,
  onRemove,
  onFdChange,
  onAddFd,
  onRemoveFd,
}: {
  lines: SimpleMoneyLine[];
  fixedDeposits: FixedDepositRow[];
  ledger: readonly PortfolioLedgerEntry[];
  ledgerFx: LedgerFx;
  onMutate: (fn: (s: WealthPortfolioStateV2) => WealthPortfolioStateV2 | null) => boolean;
  onUpsertLiquid: (line: SimpleMoneyLine) => void;
  onRemove: (id: string) => void;
  onFdChange: (id: string, patch: Partial<FixedDepositRow>) => void;
  onAddFd: () => void;
  onRemoveFd: (id: string) => void;
}) {
  const [tab, setTab] = useState<BankingTab>("liquid");
  const [draft, setDraft] = useState<SimpleMoneyLine>(() => emptySimpleLine());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const patchDraft = (patch: Partial<SimpleMoneyLine>) => {
    setDraft((d) => ({ ...d, ...patch }));
  };

  const resetEntryForm = () => {
    setFormError(null);
    setDraft(emptySimpleLine());
    setEditingId(null);
  };

  const saveDraft = () => {
    setFormError(null);
    const name = draft.name.trim();
    if (!name) {
      setFormError("Enter a bank or wallet name before saving.");
      return;
    }
    onUpsertLiquid({
      ...draft,
      name,
      accountNumber: draft.accountNumber?.trim() || undefined,
      openedDate: draft.openedDate?.trim() || undefined,
    });
    toast.success(editingId ? "Bank account updated." : "Bank account saved.");
    resetEntryForm();
  };

  const startEdit = (line: SimpleMoneyLine) => {
    setFormError(null);
    setDraft({ ...line });
    setEditingId(line.id);
  };

  const removeLine = (id: string) => {
    if (editingId === id) resetEntryForm();
    onRemove(id);
  };

  const { krwPerNpr, usdPerNpr } = ledgerFx;
  const totals = useMemo(
    () => ({
      liquidNpr: sumSimpleLinesNpr(lines, krwPerNpr, usdPerNpr),
      fdPrincipalNpr: sumFixedDepositPrincipalNpr(fixedDeposits, krwPerNpr, usdPerNpr),
      fdMonthlyNpr: aggregateFdMonthlyInterestNpr(fixedDeposits, krwPerNpr, usdPerNpr),
    }),
    [lines, fixedDeposits, krwPerNpr, usdPerNpr],
  );

  return (
    <section className="wealth-glass relative overflow-hidden rounded-[1.35rem] p-3.5 sm:rounded-[1.5rem] sm:p-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_0%_0%,rgba(56,189,248,0.08),transparent_45%),radial-gradient(ellipse_at_100%_100%,rgba(52,211,153,0.06),transparent_50%)]" />
      <div className="relative">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-2">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-sky-500/30 to-emerald-500/20 text-sky-200 ring-1 ring-sky-400/25">
              <Landmark size={18} />
            </div>
            <div>
              <h2 className="text-base font-black text-emerald-50 sm:text-lg">Banking & cash</h2>
              <p className="text-xs font-bold leading-snug text-emerald-200/65 sm:text-sm">
                Liquid accounts and term deposits · FX-aware totals in NPR
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-full border border-sky-400/20 bg-black/35 p-0.5 shadow-inner shadow-black/40">
              <button
                type="button"
                onClick={() => setTab("liquid")}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-wide transition sm:text-xs ${
                  tab === "liquid"
                    ? "bg-gradient-to-r from-sky-500 to-cyan-500 text-zinc-100 shadow-md shadow-sky-900/30"
                    : "text-emerald-200/75 hover:text-emerald-50"
                }`}
              >
                <Wallet size={14} className="opacity-90" />
                Liquid cash
              </button>
              <button
                type="button"
                onClick={() => setTab("fixed")}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-wide transition sm:text-xs ${
                  tab === "fixed"
                    ? "bg-gradient-to-r from-amber-500 to-orange-500 text-zinc-100 shadow-md shadow-amber-900/30"
                    : "text-emerald-200/75 hover:text-emerald-50"
                }`}
              >
                <Building2 size={14} className="opacity-90" />
                Fixed deposits
              </button>
            </div>
          </div>
        </div>

        <div className="mb-4 grid gap-2 sm:grid-cols-3">
          <div className="rounded-2xl border border-sky-400/20 bg-gradient-to-br from-slate-950/70 to-black/40 px-3 py-3 shadow-lg shadow-black/30 ring-1 ring-white/[0.04] backdrop-blur-md">
            <p className="text-[11px] font-black uppercase tracking-wide text-sky-200/60 sm:text-xs">Liquid (NPR)</p>
            <p className="mt-1 text-xl font-black tabular-nums text-sky-100 sm:text-2xl">{formatMoney(totals.liquidNpr, "NPR")}</p>
            <p className="mt-1 text-[11px] font-semibold leading-snug text-emerald-200/45 sm:text-xs">Sum of current balances</p>
          </div>
          <div className="rounded-2xl border border-amber-400/25 bg-gradient-to-br from-amber-950/50 to-black/40 px-3 py-3 shadow-lg shadow-black/30 ring-1 ring-white/[0.04] backdrop-blur-md">
            <p className="text-[11px] font-black uppercase tracking-wide text-amber-200/65 sm:text-xs">FD principal (NPR)</p>
            <p className="mt-1 text-xl font-black tabular-nums text-amber-100 sm:text-2xl">{formatMoney(totals.fdPrincipalNpr, "NPR")}</p>
            <p className="mt-1 text-[11px] font-semibold leading-snug text-emerald-200/45 sm:text-xs">Locked term deposits</p>
          </div>
          <div className="rounded-2xl border border-lime-400/20 bg-gradient-to-br from-lime-950/40 to-black/40 px-3 py-3 shadow-lg shadow-black/30 ring-1 ring-white/[0.04] backdrop-blur-md">
            <p className="text-[11px] font-black uppercase tracking-wide text-lime-200/65 sm:text-xs">FD income (est. / mo)</p>
            <p className="mt-1 text-xl font-black tabular-nums text-lime-100 sm:text-2xl">{formatMoney(totals.fdMonthlyNpr, "NPR")}</p>
            <p className="mt-1 text-[11px] font-semibold leading-snug text-emerald-200/45 sm:text-xs">Modelled · syncs to cashflow</p>
          </div>
        </div>

        {tab === "liquid" ? (
          <div className="space-y-5">
            <div className="rounded-2xl border border-sky-400/20 bg-gradient-to-br from-slate-950/65 via-black/40 to-sky-950/25 p-3 shadow-lg shadow-black/30 ring-1 ring-white/[0.05] backdrop-blur-md sm:p-4">
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wide text-sky-200/70">
                    <PiggyBank size={14} className="text-sky-300" />
                    {editingId ? "Edit bank account" : "New bank account"}
                  </div>
                  <p className="mt-1 text-xs font-semibold leading-snug text-emerald-200/55 sm:text-sm">
                    {editingId
                      ? "Update the fields below, then save. Your saved accounts stay in the list — not in this form."
                      : "Save adds the account to your list and clears this form so you can enter another bank account immediately."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={resetEntryForm}
                  className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-sky-400/35 bg-gradient-to-r from-sky-500/25 to-cyan-500/20 px-4 py-2.5 text-xs font-black text-sky-50 shadow-md shadow-sky-950/40 ring-1 ring-sky-400/25 transition hover:from-sky-500/35 hover:to-cyan-500/30 sm:w-auto sm:justify-center sm:rounded-full sm:py-2"
                >
                  <Plus size={16} strokeWidth={2.5} />
                  Add new bank account
                </button>
              </div>

              <div key={draft.id} className="space-y-2">
                <div className="grid gap-2 lg:grid-cols-12 lg:items-end lg:gap-2">
                  <label className="block min-w-0 lg:col-span-3">
                    <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wide text-emerald-200/55">
                      Bank / wallet name
                    </span>
                    <input
                      type="text"
                      value={draft.name}
                      onChange={(e) => patchDraft({ name: e.target.value })}
                      placeholder="e.g. Nabil savings"
                      className="wealth-input-text w-full px-2.5 py-2 text-xs sm:text-sm"
                    />
                  </label>
                  <label className="block min-w-0 lg:col-span-3">
                    <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wide text-emerald-200/55">
                      Account number
                    </span>
                    <input
                      type="text"
                      value={draft.accountNumber ?? ""}
                      onChange={(e) => patchDraft({ accountNumber: e.target.value || undefined })}
                      placeholder="Optional"
                      className="wealth-input-text w-full px-2.5 py-2 text-xs sm:text-sm"
                    />
                  </label>
                  <div className="min-w-0 lg:col-span-3">
                    <NumericMoneyInput
                      tone="dark"
                      label="Current balance"
                      value={draft.amount}
                      onChange={(n) => patchDraft({ amount: n })}
                      variant="amount"
                      placeholder="0"
                      className="text-[10px] font-bold uppercase tracking-wide text-zinc-200 [&>span]:block"
                      wrapperClassName="rounded-xl border border-sky-400/15 bg-black/35 px-2.5 py-2 focus-within:border-sky-400/40 focus-within:ring-2 focus-within:ring-sky-500/20"
                      inputClassName="min-w-0 flex-1 bg-transparent text-xs font-bold text-emerald-50 outline-none sm:text-sm"
                    />
                  </div>
                  <label className="block w-full lg:col-span-2">
                    <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wide text-emerald-200/55">Currency</span>
                    <CurrencySelect value={draft.currency} onChange={(c) => patchDraft({ currency: c })} />
                  </label>
                </div>
                <div className="flex flex-col gap-2 border-t border-emerald-400/10 pt-2 sm:flex-row sm:flex-wrap sm:items-end sm:gap-x-4 sm:gap-y-2">
                  <PortfolioIsoDateField
                    label="Opening date"
                    value={draft.openedDate}
                    onChange={(next) => patchDraft({ openedDate: next })}
                  />
                  <PortfolioDateMeta dateIso={draft.openedDate} leadText="Since" />
                </div>
                {formError ? <p className="text-xs font-bold text-rose-300">{formError}</p> : null}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={saveDraft}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2.5 text-xs font-black uppercase tracking-wide text-zinc-950 shadow-lg shadow-emerald-950/35 transition hover:brightness-110 sm:text-sm"
                  >
                    Save
                  </button>
                  {editingId ? (
                    <button
                      type="button"
                      onClick={resetEntryForm}
                      className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-bold text-emerald-100/90 transition hover:bg-white/10"
                    >
                      Cancel
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wide text-emerald-200/55">
                <Wallet size={14} className="text-sky-300" />
                Saved accounts
              </div>
              {lines.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-sky-400/25 bg-black/20 px-4 py-8 text-center">
                  <p className="text-sm font-bold text-emerald-200/70">No bank accounts yet.</p>
                  <p className="mt-1 text-xs font-semibold text-emerald-200/45">
                    Complete the form above and tap <span className="font-black text-sky-200">Save</span> — it will show up
                    here and the form will clear for your next entry.
                  </p>
                </div>
              ) : (
                lines.map((line) => (
                  <div
                    key={line.id}
                    className={`wealth-row-card space-y-3 rounded-2xl border bg-black/35 p-3 shadow-inner shadow-black/40 backdrop-blur-sm sm:p-4 ${
                      editingId === line.id
                        ? "border-sky-400/50 ring-2 ring-sky-400/35"
                        : "border-sky-400/18 ring-1 ring-white/[0.04]"
                    }`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1 space-y-2">
                        <p className="truncate text-base font-black text-emerald-50 sm:text-lg">
                          {line.name.trim() || "Unnamed account"}
                        </p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-bold text-emerald-200/70">
                          {line.accountNumber ? (
                            <span>
                              <span className="font-black text-emerald-200/45">Account · </span>
                              {line.accountNumber}
                            </span>
                          ) : null}
                          <span>
                            <span className="font-black text-emerald-200/45">Balance · </span>
                            {formatMoney(line.amount ?? 0, line.currency)}
                          </span>
                          <span className="font-black text-sky-200/90">{line.currency}</span>
                        </div>
                        <div className="flex flex-col gap-1 border-t border-emerald-400/10 pt-2 text-[11px] font-semibold text-emerald-200/50 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4">
                          {line.openedDate ? (
                            <span>
                              <span className="font-black text-emerald-200/40">Opened · </span>
                              {line.openedDate}
                            </span>
                          ) : (
                            <span className="text-emerald-200/35">No opening date on file</span>
                          )}
                          <PortfolioDateMeta dateIso={line.openedDate} leadText="Since" />
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
                        <button
                          type="button"
                          onClick={() => startEdit(line)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-sky-400/30 bg-sky-500/10 px-3 py-2 text-xs font-black text-sky-100 transition hover:bg-sky-500/20"
                        >
                          <Pencil size={14} />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => removeLine(line.id)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-xs font-black text-rose-100 transition hover:bg-rose-500/20"
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      </div>
                    </div>
                    <LiquidCashTxnStrip line={line} ledgerFx={ledgerFx} onMutate={onMutate} />
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wide text-emerald-200/55">
                <Building2 size={14} className="text-amber-300" />
                Term deposits
              </div>
              <button
                type="button"
                onClick={onAddFd}
                className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-400/30 bg-amber-500/15 px-2.5 py-1 text-[11px] font-black text-amber-100 transition hover:bg-amber-500/25 sm:text-xs"
              >
                <Plus size={14} /> Add FD
              </button>
            </div>
            {fixedDeposits.map((fd) => {
              const derived = fdDerivedMetricsForRow(fd);
              return (
                <div
                  key={fd.id}
                  className="wealth-row-card space-y-2 rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-950/35 via-black/35 to-slate-950/50 p-2.5 shadow-lg shadow-black/35 ring-1 ring-white/[0.04] backdrop-blur-md sm:p-3"
                >
                  <div className="grid gap-2 lg:grid-cols-12 lg:items-end lg:gap-2">
                    <label className="block min-w-0 lg:col-span-3">
                      <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wide text-amber-200/60">Bank name</span>
                      <input
                        type="text"
                        value={fd.bankName}
                        onChange={(e) => onFdChange(fd.id, { bankName: e.target.value })}
                        placeholder="e.g. Global IME Bank"
                        className="wealth-input-text w-full px-2.5 py-2 text-xs sm:text-sm"
                      />
                    </label>
                    <label className="block min-w-0 lg:col-span-3">
                      <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wide text-amber-200/60">
                        FD account number
                      </span>
                      <input
                        type="text"
                        value={fd.accountNumber}
                        onChange={(e) => onFdChange(fd.id, { accountNumber: e.target.value })}
                        placeholder="FD / receipt ref"
                        className="wealth-input-text w-full px-2.5 py-2 text-xs sm:text-sm"
                      />
                    </label>
                    <div className="min-w-0 lg:col-span-2">
                      <NumericMoneyInput tone="dark"
                        label="FD amount"
                        value={fd.principal}
                        onChange={(n) => onFdChange(fd.id, { principal: n })}
                        variant="amount"
                        placeholder="0"
                        className="text-[10px] font-bold uppercase tracking-wide text-amber-100 [&>span]:block"
                        wrapperClassName="rounded-xl border border-amber-400/20 bg-black/35 px-2.5 py-2 focus-within:border-amber-400/45 focus-within:ring-2 focus-within:ring-amber-500/25"
                        inputClassName="min-w-0 flex-1 bg-transparent text-xs font-bold text-amber-50 outline-none sm:text-sm"
                      />
                    </div>
                    <div className="min-w-0 lg:col-span-2">
                      <label className="block">
                        <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wide text-amber-200/60">
                          Interest rate % (p.a.)
                        </span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={fd.interestRatePct ?? ""}
                          onChange={(e) => {
                            const t = e.target.value.trim();
                            if (t === "") {
                              onFdChange(fd.id, { interestRatePct: undefined });
                              return;
                            }
                            const n = Number(t.replace(/,/g, ""));
                            onFdChange(fd.id, { interestRatePct: Number.isFinite(n) ? n : undefined });
                          }}
                          placeholder="e.g. 8.5"
                          className="wealth-input-text w-full px-2.5 py-2 text-xs font-bold sm:text-sm"
                        />
                      </label>
                    </div>
                    <label className="block w-full lg:col-span-2">
                      <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wide text-amber-200/60">Currency</span>
                      <CurrencySelect value={fd.currency} onChange={(c) => onFdChange(fd.id, { currency: c })} />
                    </label>
                    <div className="flex justify-end lg:col-span-1 lg:items-end lg:pb-0.5">
                      <button
                        type="button"
                        aria-label="Remove FD"
                        onClick={() => onRemoveFd(fd.id)}
                        className="rounded-xl p-2 text-emerald-300/40 transition hover:bg-rose-500/15 hover:text-rose-300"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="grid gap-2 border-t border-amber-400/15 pt-2 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
                    <PortfolioIsoDateField
                      label="Booking / value date"
                      value={fd.openedDate}
                      onChange={(next) => onFdChange(fd.id, { openedDate: next })}
                      className="min-w-0"
                    />
                    <PortfolioIsoDateField
                      label="Maturity date"
                      value={fd.maturityDate}
                      onChange={(next) => onFdChange(fd.id, { maturityDate: next })}
                      className="min-w-0"
                    />
                    <label className="block min-w-0 sm:col-span-2 lg:col-span-1">
                      <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wide text-amber-200/60">
                        Compounding
                      </span>
                      <select
                        value={fd.compounding}
                        onChange={(e) => onFdChange(fd.id, { compounding: e.target.value as FdCompounding })}
                        className="wealth-input-text w-full px-2 py-2 text-xs font-bold sm:text-sm"
                      >
                        {FD_COMPOUNDING.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="rounded-xl border border-emerald-400/15 bg-black/30 px-3 py-2 sm:col-span-2 lg:col-span-1">
                      <p className="text-[10px] font-black uppercase tracking-wide text-emerald-200/55">Est. monthly interest</p>
                      <p className="mt-0.5 text-base font-black tabular-nums text-lime-200 sm:text-lg">
                        {derived && derived.isActive
                          ? `${derived.estimatedMonthlyInterest.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${fd.currency}`
                          : "—"}
                      </p>
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="rounded-xl border border-sky-400/15 bg-black/25 px-3 py-2">
                      <p className="text-[10px] font-black uppercase tracking-wide text-sky-200/55">Maturity amount (est.)</p>
                      <p className="mt-0.5 text-base font-black tabular-nums text-sky-100 sm:text-lg">
                        {derived
                          ? `${derived.maturityAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${fd.currency}`
                          : "—"}
                      </p>
                    </div>
                    <div className="rounded-xl border border-lime-400/15 bg-black/25 px-3 py-2">
                      <p className="text-[10px] font-black uppercase tracking-wide text-lime-200/55">Est. annual return</p>
                      <p className="mt-0.5 text-base font-black tabular-nums text-lime-100 sm:text-lg">
                        {derived?.estimatedAnnualReturnPct != null
                          ? `${derived.estimatedAnnualReturnPct.toFixed(2)}% effective`
                          : "—"}
                      </p>
                      <p className="mt-1 text-[10px] font-semibold text-emerald-200/45">
                        {derived && !derived.isActive ? "Matured — no forward accrual in cashflow sync." : "Nominal rate with selected compounding"}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <ModuleLedgerCard
          bucket="liquid_cash"
          ledger={ledger}
          title="Banking ledger"
          subtitle="Cash adds and withdrawals for liquid lines only."
        />
      </div>
    </section>
  );
}
