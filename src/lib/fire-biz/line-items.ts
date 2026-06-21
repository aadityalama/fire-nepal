export type FireBizLineItem = {
  name: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
  discount?: number;
  taxable?: boolean;
};

export function parseLineItems(raw: unknown): FireBizLineItem[] {
  if (!Array.isArray(raw)) return [];
  const items: FireBizLineItem[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const name = String(r.name ?? "").trim();
    if (!name) continue;
    items.push({
      name,
      quantity: Number(r.quantity ?? 1) || 1,
      unit: r.unit ? String(r.unit) : "pcs",
      unitPrice: Number(r.unitPrice ?? r.unit_price ?? 0) || 0,
      discount: Number(r.discount ?? 0) || 0,
      taxable: r.taxable !== false,
    });
  }
  return items;
}

export function lineItemsSubtotal(items: FireBizLineItem[]): number {
  return items.reduce((sum, item) => {
    const gross = item.quantity * item.unitPrice;
    return sum + gross - (item.discount ?? 0);
  }, 0);
}

export function lineItemsToJson(items: FireBizLineItem[]): FireBizLineItem[] {
  return items.map((item) => ({
    name: item.name,
    quantity: item.quantity,
    unit: item.unit ?? "pcs",
    unitPrice: item.unitPrice,
    discount: item.discount ?? 0,
    taxable: item.taxable !== false,
  }));
}
