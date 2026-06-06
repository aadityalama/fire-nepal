"use client";

import { Globe2, Plus, Trash2 } from "lucide-react";
import { NumericMoneyInput } from "@/components/NumericMoneyInput";
import { CurrencySelect } from "@/components/portfolio/CurrencySelect";
import { PortfolioIsoDateField } from "@/components/portfolio/PortfolioIsoDateField";
import { projectRetirementRowFvNpr } from "@/components/portfolio/calculations";
import { ModuleLedgerCard } from "@/components/portfolio/ledger-ui/ModuleLedgerCard";
import type { GlobalRetirementAssetRow, PortfolioLedgerEntry, RetirementAccountKind, WealthPortfolioStateV2 } from "@/components/portfolio/types";
import { PortfolioModuleDataResetButton } from "@/components/fire-nepal/PortfolioModuleDataResetButton";
import { formatMoney } from "@/lib/expense-utils";

const KIND_GROUPS: { group: string; options: { value: RetirementAccountKind; label: string }[] }[] = [
  {
    group: "Nepal & worldwide",
    options: [
      { value: "ssf", label: "SSF" },
      { value: "cit", label: "CIT" },
      { value: "epf", label: "EPF" },
      { value: "pension_savings", label: "Pension savings" },
      { value: "employer_retirement", label: "Employer retirement" },
      { value: "retirement_sip", label: "Retirement SIPs" },
      { value: "global_retirement_account", label: "Global retirement account" },
    ],
  },
  {
    group: "South Korea (diaspora)",
    options: [
      { value: "kr_nps", label: "Korea National Pension (NPS)" },
      { value: "kr_severance", label: "Korea severance pay (퇴직금)" },
      { value: "kr_dc_irp", label: "Korea DC / IRP pension" },
    ],
  },
];

function isKoreaRetirementKind(k: RetirementAccountKind): boolean {
  return k === "kr_nps" || k === "kr_severance" || k === "kr_dc_irp";
}

export function GlobalRetirementAssetsPanel({
  rows,
  ledger,
  krwPerNpr,
  usdPerNpr,
  onChange,
  onAdd,
  onRemove,
  onMutate,
}: {
  rows: GlobalRetirementAssetRow[];
  ledger: readonly PortfolioLedgerEntry[];
  krwPerNpr: number;
  usdPerNpr: number;
  onChange: (id: string, patch: Partial<GlobalRetirementAssetRow>) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onMutate: (fn: (s: WealthPortfolioStateV2) => WealthPortfolioStateV2 | null) => boolean;
}) {
  return (
    <section className="wealth-glass rounded-[1.35rem] p-3.5 sm:rounded-[1.5rem] sm:p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-indigo-400/20 text-indigo-200">
            <Globe2 size={18} />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-black text-emerald-50 sm:text-lg">Global retirement assets</h2>
            <p className="text-xs font-bold leading-snug text-emerald-200/65 sm:text-sm">
              Long-term pillars for Nepalis worldwide — Nepal pillars, global accounts, and regional options (e.g. South
              Korea NPS, 퇴직금, DC/IRP). Use CCY for NPR, KRW, or USD; totals convert to NPR with live FX.
            </p>
            <p className="mt-1.5 text-[11px] font-semibold leading-relaxed text-emerald-200/45 sm:text-xs">
              NPR · KRW · USD on balances & contributions — live FX to NPR for totals and projections.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
          <PortfolioModuleDataResetButton module="pension" onMutate={onMutate} />
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-indigo-400/30 bg-indigo-500/15 px-2.5 py-1 text-[11px] font-black text-indigo-100 transition hover:bg-indigo-500/25 sm:text-xs"
          >
            <Plus size={14} /> Add
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {rows.map((row) => {
          const fvNpr = projectRetirementRowFvNpr(row, krwPerNpr, usdPerNpr);
          return (
            <div key={row.id} className="wealth-row-card space-y-2 rounded-xl p-2.5 sm:p-3">
              <div className="grid gap-2 lg:grid-cols-12 lg:items-end">
                <label className="block lg:col-span-2">
                  <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wide text-emerald-200/55">Type</span>
                  <select
                    value={row.kind}
                    onChange={(e) => {
                      const kind = e.target.value as RetirementAccountKind;
                      const patch: Partial<GlobalRetirementAssetRow> = { kind };
                      if (isKoreaRetirementKind(kind) && !row.country?.trim()) {
                        patch.country = "South Korea";
                      }
                      onChange(row.id, patch);
                    }}
                    className="wealth-input w-full px-2 py-2 text-xs font-black sm:text-sm"
                  >
                    {KIND_GROUPS.map((g) => (
                      <optgroup key={g.group} label={g.group}>
                        {g.options.map((k) => (
                          <option key={k.value} value={k.value}>
                            {k.label}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </label>
                <label className="block min-w-0 lg:col-span-3">
                  <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wide text-emerald-200/55">
                    Account name
                  </span>
                  <input
                    type="text"
                    value={row.accountName}
                    onChange={(e) => onChange(row.id, { accountName: e.target.value })}
                    placeholder="e.g. Korea DC pension"
                    className="wealth-input-text w-full px-2.5 py-2 text-xs sm:text-sm"
                  />
                </label>
                <label className="block min-w-0 lg:col-span-2">
                  <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wide text-emerald-200/55">Country</span>
                  <input
                    type="text"
                    value={row.country}
                    onChange={(e) => onChange(row.id, { country: e.target.value })}
                    placeholder="NP / KR / AE…"
                    className="wealth-input-text w-full px-2.5 py-2 text-xs sm:text-sm"
                  />
                </label>
                <div className="min-w-0 lg:col-span-2">
                  <NumericMoneyInput tone="dark"
                    label="Current balance"
                    value={row.currentBalance}
                    onChange={(n) => onChange(row.id, { currentBalance: n })}
                    variant="amount"
                    placeholder="0"
                    className="text-[10px] font-bold uppercase tracking-wide text-zinc-200 [&>span]:block"
                    wrapperClassName="rounded-xl border border-emerald-400/15 bg-black/30 px-2 py-2 focus-within:border-emerald-400/40"
                    inputClassName="min-w-0 flex-1 bg-transparent text-xs font-bold text-emerald-50 outline-none"
                  />
                </div>
                <label className="block w-full lg:col-span-1">
                  <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wide text-emerald-200/55">CCY</span>
                  <CurrencySelect value={row.currency} onChange={(c) => onChange(row.id, { currency: c })} />
                </label>
                <div className="flex justify-end lg:col-span-2 lg:items-end">
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

              <div className="rounded-lg border border-emerald-400/10 bg-black/20 px-2 py-2 backdrop-blur-[2px] sm:px-2.5">
                <p className="mb-2 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-200/45">
                  Identity & enrollment
                </p>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-12 lg:items-end">
                  {row.kind === "ssf" ? (
                    <label className="block min-w-0 sm:col-span-1 lg:col-span-4">
                      <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wide text-emerald-200/55">
                        SSF ID / Member ID
                      </span>
                      <input
                        type="text"
                        inputMode="text"
                        autoComplete="off"
                        value={row.ssfMemberId ?? ""}
                        onChange={(e) => onChange(row.id, { ssfMemberId: e.target.value })}
                        placeholder="Member reference"
                        className="wealth-input-text w-full px-2.5 py-2 text-xs sm:text-sm"
                      />
                    </label>
                  ) : null}
                  {row.kind === "kr_nps" ? (
                    <label className="block min-w-0 sm:col-span-1 lg:col-span-4">
                      <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wide text-emerald-200/55">
                        Pension ID / NPS number
                      </span>
                      <input
                        type="text"
                        inputMode="text"
                        autoComplete="off"
                        value={row.npsNumber ?? ""}
                        onChange={(e) => onChange(row.id, { npsNumber: e.target.value })}
                        placeholder="Subscriber number"
                        className="wealth-input-text w-full px-2.5 py-2 text-xs sm:text-sm"
                      />
                    </label>
                  ) : null}
                  <div
                    className={
                      row.kind === "ssf" || row.kind === "kr_nps"
                        ? "min-w-0 sm:col-span-1 lg:col-span-4"
                        : "min-w-0 sm:col-span-1 lg:col-span-6"
                    }
                  >
                    <PortfolioIsoDateField
                      label="Account starting date"
                      value={row.accountStartDate}
                      onChange={(next) => onChange(row.id, { accountStartDate: next })}
                      className="max-w-none sm:max-w-none"
                    />
                  </div>
                  <label
                    className={
                      row.kind === "ssf" || row.kind === "kr_nps"
                        ? "block min-w-0 sm:col-span-1 lg:col-span-4"
                        : "block min-w-0 sm:col-span-1 lg:col-span-6"
                    }
                  >
                    <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wide text-emerald-200/55">
                      Contribution start year
                    </span>
                    <input
                      type="number"
                      min={1970}
                      max={2100}
                      step={1}
                      value={row.contributionStartYear ?? ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        onChange(row.id, {
                          contributionStartYear: v === "" ? undefined : Number(v),
                        });
                      }}
                      placeholder="e.g. 2018"
                      className="wealth-input-text w-full px-2 py-2 text-xs font-bold"
                    />
                  </label>
                </div>
              </div>

              <div className="grid gap-2 border-t border-emerald-400/10 pt-2 sm:grid-cols-2 lg:grid-cols-12 lg:items-end">
                <div className="min-w-0 sm:col-span-1 lg:col-span-3">
                  <NumericMoneyInput tone="dark"
                    label="Monthly contribution"
                    value={row.monthlyContribution}
                    onChange={(n) => onChange(row.id, { monthlyContribution: n })}
                    variant="amount"
                    placeholder="0"
                    className="text-[10px] font-bold uppercase tracking-wide text-zinc-200 [&>span]:block"
                    wrapperClassName="rounded-xl border border-emerald-400/15 bg-black/30 px-2 py-2 focus-within:border-emerald-400/40"
                    inputClassName="min-w-0 flex-1 bg-transparent text-xs font-bold text-emerald-50 outline-none"
                  />
                </div>
                <div className="min-w-0 sm:col-span-1 lg:col-span-3">
                  <NumericMoneyInput tone="dark"
                    label="Employer (optional)"
                    value={row.employerContribution}
                    onChange={(n) => onChange(row.id, { employerContribution: n })}
                    variant="amount"
                    placeholder="0"
                    className="text-[10px] font-bold uppercase tracking-wide text-zinc-200 [&>span]:block"
                    wrapperClassName="rounded-xl border border-emerald-400/15 bg-black/30 px-2 py-2 focus-within:border-emerald-400/40"
                    inputClassName="min-w-0 flex-1 bg-transparent text-xs font-bold text-emerald-50 outline-none"
                  />
                </div>
                <label className="block lg:col-span-2">
                  <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wide text-emerald-200/55">
                    Current age
                  </span>
                  <input
                    type="number"
                    min={18}
                    max={100}
                    value={row.currentAge ?? ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      onChange(row.id, { currentAge: v === "" ? undefined : Number(v) });
                    }}
                    placeholder="e.g. 38"
                    className="wealth-input-text w-full px-2 py-2 text-xs font-bold"
                  />
                </label>
                <label className="block lg:col-span-2">
                  <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wide text-emerald-200/55">
                    Retire at age
                  </span>
                  <input
                    type="number"
                    min={40}
                    max={100}
                    value={row.expectedRetirementAge ?? ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      onChange(row.id, {
                        expectedRetirementAge: v === "" ? undefined : Number(v),
                      });
                    }}
                    placeholder="60"
                    className="wealth-input-text w-full px-2 py-2 text-xs font-bold"
                  />
                </label>
                <div className="rounded-lg bg-black/30 px-2 py-2 lg:col-span-2">
                  <p className="text-[10px] font-bold uppercase text-emerald-200/55">Projected at retirement</p>
                  <p className="mt-0.5 text-sm font-black tabular-nums text-indigo-200 sm:text-base">{formatMoney(fvNpr, "NPR")}</p>
                  <p className="mt-1 text-[10px] font-semibold leading-snug text-emerald-200/50">
                    6% nominal / yr, monthly compounding (planning estimate).
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <ModuleLedgerCard
        bucket="retirement"
        ledger={ledger}
        title="Retirement assets ledger"
        subtitle="Reserved for future contribution and transfer entries; balances above are edited directly today."
      />
    </section>
  );
}
