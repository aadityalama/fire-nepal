"use client";

import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from "chart.js";
import {
  ArrowRight,
  BarChart3,
  FileSpreadsheet,
  FileText,
  Pencil,
  PieChart,
  Plus,
  Share2,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";
import { Bar, Pie } from "react-chartjs-2";
import { sanitizeDecimalTyping } from "@/components/NumericMoneyInput";
import {
  Currency,
  Expense,
  RoommateProfile,
  currencyMeta,
  currentMonthKey,
  expenseMonthKey,
  formatMoney,
  formatSignedMoney,
  getSettlement,
  initials,
} from "@/lib/expense-utils";
import { memberDisplayName, resolveExpensePayerName } from "@/lib/expense-members";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

type DraftRow = {
  date: string;
  title: string;
  payerId: string;
  amount: string;
  category: string;
};

export function RoommateExpenseLite({
  members,
  expenses,
  setExpenses,
  profiles,
  currency,
  categories,
  onEditExpense,
  onDeleteExpense,
  onOpenProfile,
}: {
  members: string[];
  expenses: Expense[];
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
  profiles: Record<string, RoommateProfile>;
  currency: Currency;
  categories: string[];
  onEditExpense: (expense: Expense) => void;
  onDeleteExpense: (expense: Expense) => void;
  onOpenProfile: (member: string) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey());
  const [draft, setDraft] = useState<DraftRow>(() => ({
    date: today,
    title: "",
    payerId: members[0] ?? "",
    amount: "",
    category: categories[0] ?? "Other",
  }));

  const monthExpenses = useMemo(
    () => expenses.filter((expense) => expenseMonthKey(expense.date) === selectedMonth),
    [expenses, selectedMonth],
  );

  const settlement = useMemo(() => getSettlement(members, monthExpenses), [members, monthExpenses]);

  const draftAmountNpr = useMemo(() => {
    const entered = Number(draft.amount);
    if (!entered || entered <= 0) return 0;
    return entered / currencyMeta[currency].rate;
  }, [draft.amount, currency]);

  const liveSettlement = useMemo(() => {
    if (!draftAmountNpr || !draft.payerId) return settlement;

    const preview: Expense = {
      id: -1,
      title: draft.title.trim() || "Draft",
      amount: draftAmountNpr,
      payerId: draft.payerId,
      category: draft.category,
      splitEqually: true,
      date: draft.date,
    };

    return getSettlement(members, [...monthExpenses, preview]);
  }, [draft, draftAmountNpr, members, monthExpenses, settlement]);

  const monthOptions = useMemo(() => {
    const keys = new Set(expenses.map((expense) => expenseMonthKey(expense.date)));
    keys.add(currentMonthKey());
    return Array.from(keys).sort((a, b) => b.localeCompare(a));
  }, [expenses]);

  const contributionByMember = useMemo(() => {
    const total = liveSettlement.totalExpense || 1;
    return Object.fromEntries(
      members.map((member) => [
        member,
        ((liveSettlement.paidByMember[member] ?? 0) / total) * 100,
      ]),
    );
  }, [liveSettlement.paidByMember, liveSettlement.totalExpense, members]);

  const categoryTotals = useMemo(() => {
    const map = new Map<string, number>();
    monthExpenses.forEach((expense) => {
      map.set(expense.category, (map.get(expense.category) ?? 0) + expense.amount);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [monthExpenses]);

  const monthlyChart = useMemo(
    () => ({
      labels: monthOptions.slice(0, 6).reverse(),
      datasets: [
        {
          label: "Group expense",
          data: monthOptions
            .slice(0, 6)
            .reverse()
            .map((month) => {
              const total = expenses
                .filter((expense) => expenseMonthKey(expense.date) === month)
                .reduce((sum, expense) => sum + expense.amount, 0);
              return total * currencyMeta[currency].rate;
            }),
          backgroundColor: "#007a3d",
          borderRadius: 10,
        },
      ],
    }),
    [currency, expenses, monthOptions],
  );

  const categoryChart = useMemo(
    () => ({
      labels: categoryTotals.map(([category]) => category),
      datasets: [
        {
          data: categoryTotals.map(([, amount]) => amount * currencyMeta[currency].rate),
          backgroundColor: ["#007a3d", "#064e3b", "#d6a83e", "#22c55e", "#0f766e", "#94a3b8"],
          borderColor: "#fff",
          borderWidth: 2,
        },
      ],
    }),
    [categoryTotals, currency],
  );

  const perPersonSplit = (amount: number) => amount / Math.max(members.length, 1);

  const addDraftExpense = () => {
    if (!draft.title.trim() || draftAmountNpr <= 0 || !draft.payerId) return;

    setExpenses((current) => [
      ...current,
      {
        id: Date.now(),
        title: draft.title.trim(),
        amount: draftAmountNpr,
        payerId: draft.payerId,
        category: draft.category,
        splitEqually: true,
        date: draft.date,
      },
    ]);
    setDraft({
      date: today,
      title: "",
      payerId: members[0] ?? "",
      amount: "",
      category: categories[0] ?? "Other",
    });
  };

  const handleDraftKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addDraftExpense();
    }
  };

  const shareSummary = () => {
    const lines = liveSettlement.transfers.map(
      (transfer) => `${transfer.from} → ${transfer.to} = ${formatMoney(transfer.amount, currency)}`,
    );
    const text = [
      "Roommate Expense Lite — FIRE Nepal",
      `Month: ${selectedMonth}`,
      `Total: ${formatMoney(liveSettlement.totalExpense, currency)}`,
      `Equal split: ${formatMoney(liveSettlement.equalSplitAmount, currency)}`,
      "",
      ...members.map((member) => {
        const balance = liveSettlement.balances[member] ?? 0;
        return `${member}: ${formatSignedMoney(balance, currency)} (${(contributionByMember[member] ?? 0).toFixed(1)}%)`;
      }),
      "",
      lines.length ? "Transfers:" : "All settled.",
      ...lines,
    ].join("\n");

    if (navigator.share) {
      void navigator.share({ title: "Roommate settlement", text });
      return;
    }
    void navigator.clipboard.writeText(text);
  };

  const exportExcel = () => {
    const header = ["Date", "Expense", "Paid By", "Category", "Amount (NPR)", "Per Person Split"];
    const rows = monthExpenses.map((expense) => [
      expense.date,
      expense.title,
      resolveExpensePayerName(expense, profiles),
      expense.category,
      expense.amount,
      perPersonSplit(expense.amount),
    ]);
    const summary = [
      [],
      ["Total group expense", liveSettlement.totalExpense],
      ["Equal split", liveSettlement.equalSplitAmount],
      ...members.map((member) => [
        `${member} final`,
        liveSettlement.balances[member] ?? 0,
      ]),
    ];
    const csv = [header, ...rows, ...summary]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `roommate-expense-lite-${selectedMonth}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = () => {
    const html = `
      <html><head><title>Roommate Expense Lite</title>
      <style>
        body { font-family: -apple-system, sans-serif; padding: 32px; color: #064e3b; }
        h1 { font-size: 24px; margin-bottom: 8px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px; }
        th, td { border: 1px solid #d1fae5; padding: 10px; text-align: left; }
        th { background: #ecfdf5; }
        .pos { color: #059669; font-weight: 800; }
        .neg { color: #dc2626; font-weight: 800; }
      </style></head><body>
      <h1>Roommate Expense Lite</h1>
      <p>Month: ${selectedMonth} · Total: ${formatMoney(liveSettlement.totalExpense, currency)} · Equal split: ${formatMoney(liveSettlement.equalSplitAmount, currency)}</p>
      <table><tr><th>Date</th><th>Expense</th><th>Paid By</th><th>Amount</th></tr>
      ${monthExpenses
        .map(
          (expense) =>
            `<tr><td>${expense.date}</td><td>${expense.title}</td><td>${resolveExpensePayerName(expense, profiles)}</td><td>${formatMoney(expense.amount, currency)}</td></tr>`,
        )
        .join("")}
      </table>
      <h2>Settlement</h2>
      <ul>
      ${members
        .map((member) => {
          const balance = liveSettlement.balances[member] ?? 0;
          const cls = balance > 1 ? "pos" : balance < -1 ? "neg" : "";
          return `<li class="${cls}">${member}: ${formatSignedMoney(balance, currency)}</li>`;
        })
        .join("")}
      </ul>
      <h2>Transfers</h2>
      <ul>
      ${liveSettlement.transfers
        .map(
          (transfer) =>
            `<li>${transfer.from} → ${transfer.to} = ${formatMoney(transfer.amount, currency)}</li>`,
        )
        .join("") || "<li>All settled</li>"}
      </ul>
      </body></html>`;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  };

  return (
    <div className="relite-shell mt-6 space-y-6 pb-8">
      <header className="relite-glass animate-fade-up rounded-[2rem] border border-white/80 p-5 sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700/70">FIRE Nepal</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-emerald-950 sm:text-4xl">
              Roommate Expense Lite
            </h2>
            <p className="mt-2 max-w-2xl text-sm font-bold leading-6 text-slate-500">
              Premium spreadsheet settlement for Nepali roommates abroad. Final = Total Paid − Equal Split.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ActionButton icon={<FileText size={16} />} label="PDF" onClick={exportPdf} />
            <ActionButton icon={<FileSpreadsheet size={16} />} label="Excel" onClick={exportExcel} />
            <ActionButton icon={<Share2 size={16} />} label="Share" onClick={shareSummary} />
            <select
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
              className="relite-cell rounded-2xl px-4 py-2.5 text-xs font-black text-emerald-900"
            >
              {monthOptions.map((month) => (
                <option key={month} value={month}>
                  {month}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="Total group expense" value={formatMoney(liveSettlement.totalExpense, currency)} />
        <SummaryCard label="Equal split amount" value={formatMoney(liveSettlement.equalSplitAmount, currency)} />
        <SummaryCard
          label="Contribution leader"
          value={
            members.reduce(
              (best, member) =>
                (liveSettlement.paidByMember[member] ?? 0) > (liveSettlement.paidByMember[best] ?? 0)
                  ? member
                  : best,
              members[0],
            ) ?? "—"
          }
          meta={`${(Math.max(...members.map((m) => contributionByMember[m] ?? 0)) || 0).toFixed(1)}% of group`}
        />
      </section>

      <section className="relite-glass animate-fade-up rounded-[1.5rem] border border-white/80 p-5 sm:p-6">
        <h3 className="text-sm font-black uppercase tracking-[0.16em] text-emerald-800/70">Contribution %</h3>
        <p className="mt-1 text-xs font-bold text-slate-500">Share of total paid this month — updates live</p>
        <div className="mt-4 space-y-3">
          {members.map((member) => {
            const percent = contributionByMember[member] ?? 0;
            return (
              <div key={member} className="group">
                <div className="mb-1.5 flex items-center justify-between text-xs font-black">
                  <span className="text-emerald-950">{member}</span>
                  <span className="tabular-nums text-emerald-700">{percent.toFixed(1)}%</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-emerald-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-teal-500 transition-all duration-300 group-hover:from-emerald-500 group-hover:to-emerald-400"
                    style={{ width: `${Math.min(100, percent)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        {draftAmountNpr > 0 ? (
          <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-center text-xs font-black text-amber-800">
            Live preview — settlement includes draft amount
          </p>
        ) : null}
      </section>

      <section className="relite-glass overflow-hidden rounded-[1.6rem] border border-white/80 shadow-[0_20px_50px_rgba(0,122,61,0.1)]">
        <div className="border-b border-emerald-100/80 bg-emerald-50/50 px-4 py-4 sm:px-6">
          <h3 className="text-lg font-black text-emerald-950">Expense Entry Table</h3>
          <p className="text-xs font-bold text-slate-500">Google Sheets–style ledger with live per-person split</p>
        </div>
        <MobileExpenseList
          currency={currency}
          draft={draft}
          draftAmountNpr={draftAmountNpr}
          members={members}
          profiles={profiles}
          monthExpenses={monthExpenses}
          perPersonSplit={perPersonSplit}
          setDraft={setDraft}
          onAdd={addDraftExpense}
          onDelete={onDeleteExpense}
          onDraftKeyDown={handleDraftKeyDown}
          onEdit={onEditExpense}
        />

        <div className="hidden overflow-x-auto md:block">
          <table className="relite-table w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr>
                {["Date", "Expense", "Paid By", "Amount", "Per Person Split", ""].map((col) => (
                  <th key={col} className="px-4 py-3 text-xs font-black uppercase tracking-wider text-emerald-800/80">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {monthExpenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <p className="font-black text-emerald-950">No expenses this month</p>
                    <p className="mt-1 text-xs font-bold text-slate-500">Use the quick-add row below</p>
                  </td>
                </tr>
              ) : (
                monthExpenses.map((expense) => (
                  <tr
                    key={expense.id}
                    className="group border-t border-emerald-50 transition hover:bg-emerald-50/40"
                  >
                    <td className="px-4 py-3 font-bold text-slate-600">{expense.date}</td>
                    <td className="px-4 py-3 font-black text-emerald-950">{expense.title}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => onOpenProfile(expense.payerId)}
                        className="font-bold text-emerald-700 underline-offset-2 hover:underline"
                      >
                        {resolveExpensePayerName(expense, profiles)}
                      </button>
                    </td>
                    <td className="px-4 py-3 font-black tabular-nums text-emerald-900">
                      {formatMoney(expense.amount, currency)}
                    </td>
                    <td className="px-4 py-3 font-bold tabular-nums text-slate-600">
                      {formatMoney(perPersonSplit(expense.amount), currency)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => onEditExpense(expense)}
                          className="rounded-xl bg-emerald-50 p-2 text-emerald-700 transition hover:-translate-y-0.5"
                          aria-label="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteExpense(expense)}
                          className="rounded-xl bg-red-50 p-2 text-red-600 transition hover:-translate-y-0.5"
                          aria-label="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
              <tr className="border-t-2 border-dashed border-emerald-200 bg-gradient-to-r from-emerald-50/80 to-white">
                <td className="px-3 py-3">
                  <input
                    type="date"
                    value={draft.date}
                    onChange={(event) => setDraft((current) => ({ ...current, date: event.target.value }))}
                    className="relite-cell w-full min-w-[120px]"
                  />
                </td>
                <td className="px-3 py-3">
                  <input
                    value={draft.title}
                    onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                    onKeyDown={handleDraftKeyDown}
                    placeholder="New expense..."
                    className="relite-cell w-full min-w-[140px]"
                  />
                </td>
                <td className="px-3 py-3">
                  <select
                    value={draft.payerId}
                    onChange={(event) => setDraft((current) => ({ ...current, payerId: event.target.value }))}
                    className="relite-cell w-full"
                  >
                    {members.map((memberId) => (
                      <option key={memberId} value={memberId}>
                        {memberDisplayName(memberId, profiles)}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-3">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={draft.amount}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, amount: sanitizeDecimalTyping(event.target.value) }))
                    }
                    onKeyDown={handleDraftKeyDown}
                    placeholder="Enter amount"
                    className="relite-cell w-full min-w-[100px] font-black"
                  />
                </td>
                <td className="px-3 py-3 text-xs font-bold text-slate-500">
                  {draftAmountNpr > 0
                    ? formatMoney(perPersonSplit(draftAmountNpr), currency)
                    : "—"}
                </td>
                <td className="px-3 py-3">
                  <button
                    type="button"
                    onClick={addDraftExpense}
                    disabled={!draft.title.trim() || draftAmountNpr <= 0}
                    className="inline-flex items-center gap-1 rounded-xl bg-emerald-700 px-3 py-2 text-xs font-black text-white transition enabled:hover:-translate-y-0.5 enabled:hover:bg-emerald-800 disabled:opacity-50"
                  >
                    <Plus size={14} /> Add
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h3 className="mb-4 text-lg font-black text-emerald-950">Premium Settlement Cards</h3>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {members.map((member) => {
            const paid = liveSettlement.paidByMember[member] ?? 0;
            const balance = liveSettlement.balances[member] ?? 0;
            const profile = profiles[member];

            const cardTone =
              balance > 1
                ? "settlement-card-positive border-emerald-200/80"
                : balance < -1
                  ? "settlement-card-negative border-red-200/80"
                  : "border-white/80";

            return (
              <article
                key={member}
                className={`relite-glass group rounded-[1.5rem] border p-5 transition duration-300 hover:-translate-y-1 ${cardTone}`}
              >
                <button type="button" onClick={() => onOpenProfile(member)} className="flex w-full items-center gap-3 text-left">
                  <MemberAvatar name={member} profile={profile} />
                  <div>
                    <p className="font-black text-emerald-950">{member}</p>
                    <p className="text-xs font-bold text-slate-500">
                      {(contributionByMember[member] ?? 0).toFixed(1)}% contribution
                    </p>
                  </div>
                </button>
                <dl className="mt-4 space-y-2 text-xs font-bold">
                  <div className="flex justify-between text-slate-500">
                    <dt>Total paid</dt>
                    <dd className="tabular-nums text-emerald-900">{formatMoney(paid, currency)}</dd>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <dt>Share amount</dt>
                    <dd className="tabular-nums text-emerald-900">
                      {formatMoney(liveSettlement.equalSplitAmount, currency)}
                    </dd>
                  </div>
                </dl>
                <div className="mt-4 border-t border-emerald-100 pt-4">
                  <SettlementDisplay balance={balance} currency={currency} />
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="relite-glass rounded-[1.6rem] border border-white/80 p-5 sm:p-6">
        <h3 className="text-lg font-black text-emerald-950">Recommended Transfers</h3>
        <p className="mt-1 text-xs font-bold text-slate-500">Minimized payments — who should send money to whom</p>
        <div className="mt-4 space-y-3">
          {liveSettlement.transfers.length === 0 ? (
            <p className="rounded-2xl bg-emerald-50 p-4 text-sm font-black text-emerald-800">All settled for this month.</p>
          ) : (
            liveSettlement.transfers.map((transfer) => (
              <div
                key={`${transfer.from}-${transfer.to}-${transfer.amount}`}
                className="flex flex-wrap items-center gap-3 rounded-2xl bg-white/90 px-4 py-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <span className="font-black text-emerald-950">{transfer.from}</span>
                <ArrowRight className="text-emerald-600" size={18} />
                <span className="font-black text-emerald-950">{transfer.to}</span>
                <span className="ml-auto text-lg font-black tabular-nums text-emerald-700">
                  = {formatMoney(transfer.amount, currency)}
                </span>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="relite-glass rounded-[1.6rem] border border-white/80 p-5">
          <div className="mb-4 flex items-center gap-2">
            <BarChart3 className="text-emerald-700" size={20} />
            <h3 className="font-black text-emerald-950">Monthly history</h3>
          </div>
          <div className="h-64">
            <Bar data={monthlyChart} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
          </div>
        </div>
        <div className="relite-glass rounded-[1.6rem] border border-white/80 p-5">
          <div className="mb-4 flex items-center gap-2">
            <PieChart className="text-emerald-700" size={20} />
            <h3 className="font-black text-emerald-950">Category breakdown</h3>
          </div>
          <div className="mx-auto h-64 max-w-sm">
            {categoryTotals.length ? (
              <Pie data={categoryChart} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom" } } }} />
            ) : (
              <p className="grid h-full place-items-center text-sm font-bold text-slate-500">No category data</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function SettlementDisplay({ balance, currency }: { balance: number; currency: Currency }) {
  if (Math.abs(balance) <= 1) {
    return <p className="text-center text-sm font-black text-slate-500">Settled ✓</p>;
  }

  if (balance > 1) {
    return (
      <div className="settlement-positive text-center">
        <p className="text-[11px] font-black uppercase tracking-wider">लिनु / Receive</p>
        <p className="mt-1 text-3xl font-black tabular-nums tracking-tight">{formatSignedMoney(balance, currency)}</p>
      </div>
    );
  }

  return (
    <div className="settlement-negative text-center">
      <p className="text-[11px] font-black uppercase tracking-wider">दिनु / Pay</p>
      <p className="mt-1 text-3xl font-black tabular-nums tracking-tight">{formatSignedMoney(balance, currency)}</p>
    </div>
  );
}

function MemberAvatar({ name, profile }: { name: string; profile?: RoommateProfile }) {
  if (profile?.avatarUrl) {
    return (
      <div className="relative h-12 w-12 overflow-hidden rounded-2xl ring-2 ring-white">
        <Image src={profile.avatarUrl} alt={name} fill className="object-cover" unoptimized />
      </div>
    );
  }

  return (
    <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-500 text-sm font-black text-white shadow-lg">
      {initials(name)}
    </span>
  );
}

function SummaryCard({ label, value, meta }: { label: string; value: string; meta?: string }) {
  return (
    <article className="relite-glass rounded-[1.4rem] border border-white/80 p-5 transition hover:-translate-y-0.5">
      <p className="text-xs font-black uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-emerald-950">{value}</p>
      {meta ? <p className="mt-1 text-xs font-bold text-emerald-700">{meta}</p> : null}
    </article>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-2xl border border-emerald-100 bg-white/90 px-4 py-2.5 text-xs font-black text-emerald-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-50"
    >
      {icon} {label}
    </button>
  );
}

function MobileExpenseList({
  monthExpenses,
  currency,
  members,
  profiles,
  draft,
  draftAmountNpr,
  setDraft,
  perPersonSplit,
  onAdd,
  onEdit,
  onDelete,
  onDraftKeyDown,
}: {
  monthExpenses: Expense[];
  currency: Currency;
  members: string[];
  profiles: Record<string, RoommateProfile>;
  draft: DraftRow;
  draftAmountNpr: number;
  setDraft: React.Dispatch<React.SetStateAction<DraftRow>>;
  perPersonSplit: (amount: number) => number;
  onAdd: () => void;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
  onDraftKeyDown: (event: React.KeyboardEvent) => void;
}) {
  return (
    <div className="space-y-3 p-4 md:hidden">
      {monthExpenses.length === 0 ? (
        <p className="rounded-2xl bg-emerald-50/80 p-6 text-center text-sm font-bold text-slate-500">
          No expenses this month. Add one below.
        </p>
      ) : (
        monthExpenses.map((expense) => (
          <article
            key={expense.id}
            className="animate-fade-up rounded-2xl border border-emerald-100/80 bg-white/90 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-black text-emerald-950">{expense.title}</p>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  {expense.date} · {resolveExpensePayerName(expense, profiles)}
                </p>
              </div>
              <p className="text-right text-lg font-black tabular-nums text-emerald-800">
                {formatMoney(expense.amount, currency)}
              </p>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-emerald-50 pt-3">
              <span className="text-xs font-bold text-slate-500">
                Split: {formatMoney(perPersonSplit(expense.amount), currency)}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onEdit(expense)}
                  className="rounded-xl bg-emerald-50 p-2 text-emerald-700"
                  aria-label="Edit"
                >
                  <Pencil size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(expense)}
                  className="rounded-xl bg-red-50 p-2 text-red-600"
                  aria-label="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </article>
        ))
      )}

      <div className="rounded-2xl border-2 border-dashed border-emerald-200 bg-gradient-to-b from-emerald-50/90 to-white p-4">
        <p className="mb-3 text-xs font-black uppercase tracking-wider text-emerald-800">Quick add</p>
        <div className="grid gap-2">
          <input
            value={draft.title}
            onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
            onKeyDown={onDraftKeyDown}
            placeholder="Expense name"
            className="relite-cell"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={draft.date}
              onChange={(event) => setDraft((current) => ({ ...current, date: event.target.value }))}
              className="relite-cell"
            />
            <select
              value={draft.payerId}
              onChange={(event) => setDraft((current) => ({ ...current, payerId: event.target.value }))}
              className="relite-cell"
            >
              {members.map((member) => (
                <option key={member} value={member}>
                  {member}
                </option>
              ))}
            </select>
          </div>
          <input
            type="text"
            inputMode="decimal"
            value={draft.amount}
            onChange={(event) =>
              setDraft((current) => ({ ...current, amount: sanitizeDecimalTyping(event.target.value) }))
            }
            onKeyDown={onDraftKeyDown}
            placeholder="Enter amount"
            className="relite-cell font-black"
          />
          {draftAmountNpr > 0 ? (
            <p className="text-center text-xs font-bold text-emerald-700">
              Per person: {formatMoney(perPersonSplit(draftAmountNpr), currency)}
            </p>
          ) : null}
          <button
            type="button"
            onClick={onAdd}
            disabled={!draft.title.trim() || draftAmountNpr <= 0}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 py-3 text-sm font-black text-white transition enabled:hover:bg-emerald-800 disabled:opacity-50"
          >
            <Plus size={16} /> Add expense
          </button>
        </div>
      </div>
    </div>
  );
}
