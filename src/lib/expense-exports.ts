import type { Currency } from "@/lib/expense-utils";
import { formatMoney } from "@/lib/expense-utils";
import type { MonthlyStatement } from "@/lib/expense-analytics";
import { normalizeCategory } from "@/lib/expense-analytics";
import { resolveExpensePayerName } from "@/lib/expense-members";
import type { RoommateProfile } from "@/lib/expense-utils";
import { memberDisplayName } from "@/lib/expense-members";

function escapeCsv(value: string | number) {
  const text = String(value);
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function exportStatementExcel(
  statement: MonthlyStatement,
  currency: Currency,
  profiles: Record<string, RoommateProfile>,
) {
  const rows: string[][] = [
    ["FIRE Nepal Monthly Statement"],
    ["Month", statement.monthLabel],
    ["Settlement Status", statement.settlementStatus],
    ["Total Expenses", formatMoney(statement.totalExpense, currency)],
    ["Group average share", formatMoney(statement.equalSplitAmount, currency)],
    ["Highest Spender", memberDisplayName(statement.highestSpender.id, profiles)],
    [],
    ["Date", "Title", "Category", "Payer", "Amount (NPR base)", "Split"],
  ];

  statement.expenses.forEach((expense) => {
    rows.push([
      expense.date,
      expense.title,
      normalizeCategory(expense.category),
      resolveExpensePayerName(expense, profiles),
      String(expense.amount),
      (() => {
        const n =
          expense.splitAmong && expense.splitAmong.length > 0 ? expense.splitAmong.length : "all";
        return expense.splitEqually !== false ? `Equal (${n})` : `Custom % (${n})`;
      })(),
    ]);
  });

  rows.push([]);
  rows.push(["Member", "Paid", "Balance", "Attributed share"]);
  Object.keys(statement.paidByMember).forEach((memberId) => {
    rows.push([
      memberDisplayName(memberId, profiles),
      formatMoney(statement.paidByMember[memberId] ?? 0, currency),
      formatMoney(statement.balances[memberId] ?? 0, currency),
      formatMoney(statement.memberExpectedShare[memberId] ?? 0, currency),
    ]);
  });

  rows.push([]);
  rows.push(["Settlement Transfers"]);
  if (statement.transfers.length === 0) {
    rows.push(["All settled"]);
  } else {
    statement.transfers.forEach((transfer) => {
      rows.push([
        `${transfer.from} pays ${transfer.to}`,
        formatMoney(transfer.amount, currency),
      ]);
    });
  }

  const csv = `\uFEFF${rows.map((row) => row.map(escapeCsv).join(",")).join("\n")}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `fire-nepal-statement-${statement.monthKey}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportStatementPdf(
  statement: MonthlyStatement,
  currency: Currency,
  profiles: Record<string, RoommateProfile>,
) {
  const categoryRows = statement.categoryTotals
    .map(
      ({ category, total }) =>
        `<tr><td>${category}</td><td style="text-align:right">${formatMoney(total, currency)}</td></tr>`,
    )
    .join("");

  const expenseRows = statement.expenses
    .map(
      (expense) => `
      <tr>
        <td>${expense.date}</td>
        <td>${expense.title}</td>
        <td>${normalizeCategory(expense.category)}</td>
        <td>${resolveExpensePayerName(expense, profiles)}</td>
        <td style="text-align:right">${formatMoney(expense.amount, currency)}</td>
      </tr>`,
    )
    .join("");

  const memberRows = Object.keys(statement.paidByMember)
    .map(
      (memberId) => `
      <tr>
        <td>${memberDisplayName(memberId, profiles)}</td>
        <td style="text-align:right">${formatMoney(statement.paidByMember[memberId] ?? 0, currency)}</td>
        <td style="text-align:right">${formatMoney(statement.balances[memberId] ?? 0, currency)}</td>
        <td style="text-align:right">${formatMoney(statement.memberExpectedShare[memberId] ?? 0, currency)}</td>
      </tr>`,
    )
    .join("");

  const transferRows =
    statement.transfers.length === 0
      ? `<p class="settled">सबै settled — All balances clear</p>`
      : statement.transfers
          .map(
            (t) =>
              `<li>${t.from} → ${t.to}: <strong>${formatMoney(t.amount, currency)}</strong></li>`,
          )
          .join("");

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>FIRE Nepal Statement — ${statement.monthLabel}</title>
  <style>
    body { font-family: Inter, system-ui, sans-serif; color: #062b22; padding: 32px; }
    h1 { color: #007a3d; margin-bottom: 4px; }
    .subtitle { color: #64748b; margin-bottom: 24px; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 28px; }
    .card { border: 1px solid #d1fae5; border-radius: 16px; padding: 16px; background: #f0fdf4; }
    .card strong { display: block; font-size: 22px; margin-top: 6px; color: #007a3d; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px; }
    th, td { border-bottom: 1px solid #e2e8f0; padding: 10px 8px; text-align: left; }
    th { background: #ecfdf5; color: #065f46; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; }
    .settled { color: #007a3d; font-weight: 700; }
    @media print { body { padding: 16px; } }
  </style>
</head>
<body>
  <h1>FIRE Nepal खर्च विवरण</h1>
  <p class="subtitle">${statement.monthLabel} · Roommate Expense Statement</p>
  <div class="grid">
    <div class="card">Total Expense<strong>${formatMoney(statement.totalExpense, currency)}</strong></div>
    <div class="card">Settlement<strong>${statement.settlementStatus}</strong></div>
    <div class="card">Top Spender<strong>${memberDisplayName(statement.highestSpender.id, profiles)}</strong></div>
  </div>
  <h2>Expense Ledger</h2>
  <table>
    <thead><tr><th>Date</th><th>Title</th><th>Category</th><th>Paid By</th><th>Amount</th></tr></thead>
    <tbody>${expenseRows || "<tr><td colspan='5'>No expenses</td></tr>"}</tbody>
  </table>
  <h2>Member Contributions</h2>
  <table>
    <thead><tr><th>Member</th><th>Paid</th><th>Balance</th><th>Attributed</th></tr></thead>
    <tbody>${memberRows}</tbody>
  </table>
  <h2>Categories</h2>
  <table><thead><tr><th>Category</th><th>Total</th></tr></thead><tbody>${categoryRows}</tbody></table>
  <h2>Settlement</h2>
  <ul>${transferRows}</ul>
  <script>window.onload = () => window.print();</script>
</body>
</html>`;

  const popup = window.open("", "_blank", "noopener,noreferrer,width=900,height=700");
  if (!popup) return;
  popup.document.write(html);
  popup.document.close();
}
