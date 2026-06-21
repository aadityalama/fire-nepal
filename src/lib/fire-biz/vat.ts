import { lineItemsSubtotal, parseLineItems, type FireBizLineItem } from "@/lib/fire-biz/line-items";
import type { SaleRow } from "@/lib/fire-biz/types";

export const NEPAL_DEFAULT_VAT_RATE = 13;

export type VatBreakdown = {
  subtotal: number;
  taxableAmount: number;
  vatRate: number;
  vatAmount: number;
  discount: number;
  total: number;
};

export function computeVatFromLineItems(
  lineItems: FireBizLineItem[],
  opts: { vatRate?: number; discountAmount?: number; isTaxInvoice?: boolean } = {},
): VatBreakdown {
  const vatRate = opts.vatRate ?? NEPAL_DEFAULT_VAT_RATE;
  const discount = opts.discountAmount ?? 0;
  const subtotal = lineItemsSubtotal(lineItems);
  const taxableAmount = opts.isTaxInvoice
    ? lineItems.filter((i) => i.taxable !== false).reduce((sum, item) => {
        const gross = item.quantity * item.unitPrice - (item.discount ?? 0);
        return sum + gross;
      }, 0)
    : 0;
  const vatAmount = opts.isTaxInvoice ? Math.round(taxableAmount * (vatRate / 100) * 100) / 100 : 0;
  const total = subtotal - discount + vatAmount;
  return { subtotal, taxableAmount, vatRate, vatAmount, discount, total };
}

export function computeVatFromSale(sale: SaleRow): VatBreakdown {
  const items = parseLineItems(sale.line_items);
  return computeVatFromLineItems(items, {
    vatRate: Number(sale.vat_rate ?? NEPAL_DEFAULT_VAT_RATE),
    discountAmount: Number(sale.discount_amount),
    isTaxInvoice: Boolean(sale.is_tax_invoice),
  });
}

export type VatReportRow = {
  month: string;
  invoiceCount: number;
  taxableSales: number;
  vatCollected: number;
};

export function computeVatReport(sales: SaleRow[], from: string, to: string): VatReportRow[] {
  const filtered = sales.filter(
    (s) => s.is_tax_invoice && s.sale_date >= from && s.sale_date <= to,
  );
  const byMonth = new Map<string, VatReportRow>();
  for (const sale of filtered) {
    const month = sale.sale_date.slice(0, 7);
    const row = byMonth.get(month) ?? { month, invoiceCount: 0, taxableSales: 0, vatCollected: 0 };
    const vat = computeVatFromSale(sale);
    row.invoiceCount += 1;
    row.taxableSales += vat.taxableAmount;
    row.vatCollected += Number(sale.tax_amount) || vat.vatAmount;
    byMonth.set(month, row);
  }
  return [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month));
}

export function vatReportTotals(rows: VatReportRow[]) {
  return rows.reduce(
    (acc, r) => ({
      invoiceCount: acc.invoiceCount + r.invoiceCount,
      taxableSales: acc.taxableSales + r.taxableSales,
      vatCollected: acc.vatCollected + r.vatCollected,
    }),
    { invoiceCount: 0, taxableSales: 0, vatCollected: 0 },
  );
}
