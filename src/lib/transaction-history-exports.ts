import type { GroupProfile } from "@/lib/group-profile";
import type { Currency } from "@/lib/expense-utils";
import { formatMoney } from "@/lib/expense-utils";
import {
  transactionTypeLabel,
  type ExpenseTransactionRow,
  type TransactionHistorySummary,
} from "@/lib/transaction-history-types";
import { resolveDateRange, type TransactionHistoryFilters } from "@/lib/transaction-history-types";

function escapeCsv(value: string | number) {
  const text = String(value);
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function formatDateRangeLabel(filters: TransactionHistoryFilters): string {
  const { from, to } = resolveDateRange(filters);
  if (!from && !to) return "All dates";
  if (from && to && from === to) return from;
  if (from && to) return `${from} to ${to}`;
  if (from) return `From ${from}`;
  return `Until ${to}`;
}

function groupDisplayName(profile: GroupProfile): string {
  return profile.companyName?.trim() || "Roommate Expense Group";
}

function buildExportMeta(
  profile: GroupProfile,
  filters: TransactionHistoryFilters,
  summary: TransactionHistorySummary,
) {
  const generatedAt = new Date();
  return {
    groupName: groupDisplayName(profile),
    dateRange: formatDateRangeLabel(filters),
    generatedLabel: generatedAt.toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }),
    summary,
  };
}

function transactionTableRows(rows: ExpenseTransactionRow[]) {
  return rows.map((row) => [
    row.transaction_date,
    row.description,
    row.category ?? "—",
    String(row.amount),
    row.currency,
    row.created_by_name ?? "—",
    new Date(row.created_at).toLocaleString(),
    transactionTypeLabel(row.transaction_type),
  ]);
}

export function exportTransactionHistoryCsv(
  rows: ExpenseTransactionRow[],
  profile: GroupProfile,
  filters: TransactionHistoryFilters,
  summary: TransactionHistorySummary,
) {
  const meta = buildExportMeta(profile, filters, summary);
  const headerRows: string[][] = [
    ["FIRE Nepal Transaction History"],
    ["Group / Company", meta.groupName],
    ["Date Range", meta.dateRange],
    ["Generated", meta.generatedLabel],
    [],
    ["Total Income", String(meta.summary.totalIncome)],
    ["Total Expense", String(meta.summary.totalExpense)],
    ["Net Balance", String(meta.summary.netBalance)],
    [],
    ["Date", "Description", "Category", "Amount", "Currency", "Created By", "Created At", "Transaction Type"],
  ];

  const dataRows = transactionTableRows(rows);
  const csv = `\uFEFF${[...headerRows, ...dataRows].map((row) => row.map(escapeCsv).join(",")).join("\n")}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `fire-nepal-transactions-${Date.now()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export async function exportTransactionHistoryXlsx(
  rows: ExpenseTransactionRow[],
  profile: GroupProfile,
  filters: TransactionHistoryFilters,
  summary: TransactionHistorySummary,
) {
  const XLSX = await import("xlsx");
  const meta = buildExportMeta(profile, filters, summary);

  const sheetData: (string | number)[][] = [
    ["FIRE Nepal Transaction History"],
    ["Group / Company", meta.groupName],
    ["Date Range", meta.dateRange],
    ["Generated", meta.generatedLabel],
    [],
    ["Total Income", meta.summary.totalIncome],
    ["Total Expense", meta.summary.totalExpense],
    ["Net Balance", meta.summary.netBalance],
    [],
    ["Date", "Description", "Category", "Amount", "Currency", "Created By", "Created At", "Transaction Type"],
    ...transactionTableRows(rows),
  ];

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
  XLSX.utils.book_append_sheet(workbook, worksheet, "Transactions");
  XLSX.writeFile(workbook, `fire-nepal-transactions-${Date.now()}.xlsx`);
}

export async function exportTransactionHistoryPdf(
  rows: ExpenseTransactionRow[],
  profile: GroupProfile,
  filters: TransactionHistoryFilters,
  summary: TransactionHistorySummary,
  currency: Currency,
) {
  const { jsPDF } = await import("jspdf");
  const meta = buildExportMeta(profile, filters, summary);
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

  let y = 40;
  doc.setFontSize(16);
  doc.setTextColor(0, 122, 61);
  doc.text("FIRE Nepal Transaction History", 40, y);
  y += 22;
  doc.setFontSize(10);
  doc.setTextColor(60, 80, 70);
  doc.text(`Group: ${meta.groupName}`, 40, y);
  y += 14;
  doc.text(`Date Range: ${meta.dateRange}`, 40, y);
  y += 14;
  doc.text(`Generated: ${meta.generatedLabel}`, 40, y);
  y += 20;

  doc.setFontSize(11);
  doc.setTextColor(6, 43, 34);
  doc.text(`Total Income: ${formatMoney(meta.summary.totalIncome, currency)}`, 40, y);
  doc.text(`Total Expense: ${formatMoney(meta.summary.totalExpense, currency)}`, 220, y);
  doc.text(`Net Balance: ${formatMoney(meta.summary.netBalance, currency)}`, 400, y);
  y += 24;

  const colX = [40, 95, 250, 330, 390, 440, 520, 650];
  const headers = ["Date", "Description", "Category", "Amount", "Currency", "Created By", "Created At", "Type"];
  doc.setFontSize(8);
  doc.setTextColor(6, 95, 70);
  headers.forEach((header, i) => doc.text(header, colX[i], y));
  y += 12;
  doc.setDrawColor(209, 250, 229);
  doc.line(40, y, 800, y);
  y += 10;

  doc.setTextColor(30, 41, 59);
  for (const row of rows) {
    if (y > 540) {
      doc.addPage();
      y = 40;
    }
    const cells = [
      row.transaction_date,
      row.description.slice(0, 28),
      (row.category ?? "—").slice(0, 14),
      String(row.amount),
      row.currency,
      (row.created_by_name ?? "—").slice(0, 12),
      new Date(row.created_at).toLocaleString().slice(0, 16),
      transactionTypeLabel(row.transaction_type),
    ];
    cells.forEach((cell, i) => doc.text(cell, colX[i], y));
    y += 14;
  }

  doc.save(`fire-nepal-transactions-${Date.now()}.pdf`);
}
