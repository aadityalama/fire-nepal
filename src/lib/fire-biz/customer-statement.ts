import type { BizTransactionRow, CustomerRow, SaleRow } from "@/lib/fire-biz/types";

export type StatementEntry = {
  id: string;
  date: string;
  type: "opening" | "invoice" | "payment";
  reference: string;
  debit: number;
  credit: number;
  balance: number;
};

export type CustomerStatement = {
  customer: CustomerRow;
  entries: StatementEntry[];
  totalDebit: number;
  totalCredit: number;
  outstanding: number;
};

export function buildCustomerStatement(
  customer: CustomerRow,
  sales: SaleRow[],
  transactions: BizTransactionRow[],
): CustomerStatement {
  const customerSales = sales.filter((s) => s.customer_id === customer.id);
  const payments = transactions.filter(
    (t) =>
      (t.transaction_type === "payment_received" || t.transaction_type === "income") &&
      (t.reference_id && customerSales.some((s) => s.id === t.reference_id)),
  );

  type RawEntry = { date: string; sortKey: string; entry: Omit<StatementEntry, "balance"> };
  const raw: RawEntry[] = [];

  if (Number(customer.opening_balance) !== 0) {
    const amt = Number(customer.opening_balance);
    raw.push({
      date: customer.created_at.slice(0, 10),
      sortKey: `${customer.created_at} opening`,
      entry: {
        id: "opening",
        date: customer.created_at.slice(0, 10),
        type: "opening",
        reference: "Opening balance",
        debit: amt > 0 ? amt : 0,
        credit: amt < 0 ? Math.abs(amt) : 0,
      },
    });
  }

  for (const sale of customerSales) {
    const total = Number(sale.total_amount);
    const paid = Number(sale.amount_paid);
    const due = total - paid;
    if (due > 0) {
      raw.push({
        date: sale.sale_date,
        sortKey: `${sale.sale_date} inv ${sale.id}`,
        entry: {
          id: sale.id,
          date: sale.sale_date,
          type: "invoice",
          reference: sale.invoice_number ?? `Invoice ${sale.sale_date}`,
          debit: due,
          credit: 0,
        },
      });
    }
    if (paid > 0) {
      raw.push({
        date: sale.sale_date,
        sortKey: `${sale.sale_date} pay ${sale.id}`,
        entry: {
          id: `${sale.id}-paid`,
          date: sale.sale_date,
          type: "payment",
          reference: `Payment — ${sale.invoice_number ?? sale.sale_date}`,
          debit: 0,
          credit: paid,
        },
      });
    }
  }

  for (const tx of payments) {
    raw.push({
      date: tx.transaction_date,
      sortKey: `${tx.transaction_date} tx ${tx.id}`,
      entry: {
        id: tx.id,
        date: tx.transaction_date,
        type: "payment",
        reference: tx.notes ?? tx.party_name ?? "Payment received",
        debit: 0,
        credit: Number(tx.amount),
      },
    });
  }

  raw.sort((a, b) => a.sortKey.localeCompare(b.sortKey));

  let running = 0;
  const entries: StatementEntry[] = raw.map(({ entry }) => {
    running += entry.debit - entry.credit;
    return { ...entry, balance: running };
  });

  const totalDebit = entries.reduce((s, e) => s + e.debit, 0);
  const totalCredit = entries.reduce((s, e) => s + e.credit, 0);

  return {
    customer,
    entries,
    totalDebit,
    totalCredit,
    outstanding: Number(customer.balance),
  };
}
