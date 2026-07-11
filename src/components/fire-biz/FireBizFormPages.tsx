"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { FireBizFormShell } from "@/components/fire-biz/FireBizFormShell";
import {
  FireBizInput,
  FireBizPrimaryButton,
  FireBizSecondaryButton,
  FireBizSelect,
} from "@/components/fire-biz/FireBizUiPrimitives";
import { useFireBiz, useFireBizCopy } from "@/contexts/FireBizContext";
import { useFireTheme } from "@/contexts/FireThemeContext";
import { lineItemsSubtotal, lineItemsToJson, type FireBizLineItem } from "@/lib/fire-biz/line-items";
import type { PaymentStatus, PaymentMethod } from "@/lib/fire-biz/types";
import { computeVatFromLineItems, NEPAL_DEFAULT_VAT_RATE } from "@/lib/fire-biz/vat";
import type { CashBankTransactionType } from "@/services/fire-biz-supabase";
import { formatBizNpr } from "@/lib/fire-biz/i18n";

function derivePaymentStatus(total: number, paid: number): PaymentStatus {
  if (total > 0 && paid >= total) return "paid";
  if (paid > 0) return "partial";
  return "unpaid";
}

const EMPTY_LINE: FireBizLineItem = { name: "", quantity: 1, unit: "pcs", unitPrice: 0, taxable: true };

const PAYMENT_METHODS: PaymentMethod[] = ["cash", "bank", "esewa", "khalti", "other"];

const CASH_BANK_TYPES: CashBankTransactionType[] = ["income", "payment_received", "payment_made", "transfer"];

type FormProps = { editId?: string };

export function FireBizCustomerFormPage({ editId }: FormProps) {
  const copy = useFireBizCopy();
  const f = copy.customers;
  const { customers, saveCustomer, deleteCustomer } = useFireBiz();
  const router = useRouter();
  const existing = useMemo(() => (editId ? customers.find((c) => c.id === editId) : null), [customers, editId]);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [openingBalance, setOpeningBalance] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(!editId);

  useEffect(() => {
    if (!existing) return;
    setName(existing.name);
    setPhone(existing.phone ?? "");
    setEmail(existing.email ?? "");
    setAddress(existing.address ?? "");
    setOpeningBalance(String(existing.opening_balance));
    setNotes(existing.notes ?? "");
    setLoaded(true);
  }, [existing]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error(f.invalidName);
      return;
    }
    setSaving(true);
    try {
      const opening = Number(openingBalance) || 0;
      await saveCustomer({
        id: editId,
        name: name.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
        address: address.trim() || null,
        opening_balance: opening,
        balance: editId ? undefined : opening,
        notes: notes.trim() || null,
      });
      toast.success(editId ? f.updated : f.added);
      router.push("/fire-biz/customers");
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    if (!editId || !window.confirm(f.confirmDelete)) return;
    void deleteCustomer(editId).then(() => {
      toast.success(f.deleted);
      router.push("/fire-biz/customers");
    });
  }

  if (editId && !loaded) {
    return (
      <FireBizFormShell title={f.editTitle} backHref="/fire-biz/customers">
        <p className="text-sm font-semibold text-emerald-200/60">{copy.common.loading}</p>
      </FireBizFormShell>
    );
  }

  return (
    <FireBizFormShell
      title={editId ? f.editTitle : f.addTitle}
      backHref="/fire-biz/customers"
      onDelete={editId ? handleDelete : undefined}
      deleteLabel={f.delete}
    >
      <form className="grid gap-4" onSubmit={(e) => void handleSubmit(e)}>
        <FireBizInput label={f.name} value={name} onChange={setName} placeholder={f.namePlaceholder} />
        <FireBizInput label={f.phone} value={phone} onChange={setPhone} type="tel" />
        <FireBizInput label={f.email} value={email} onChange={setEmail} type="email" />
        <FireBizInput label={f.address} value={address} onChange={setAddress} />
        <FireBizInput label={f.openingBalance} value={openingBalance} onChange={setOpeningBalance} type="number" />
        <FireBizInput label={f.notes} value={notes} onChange={setNotes} />
        <div className="flex flex-wrap gap-2 pt-2">
          <FireBizPrimaryButton type="submit" disabled={saving}>
            {saving ? copy.common.loading : editId ? f.saveEdit : f.save}
          </FireBizPrimaryButton>
          <FireBizSecondaryButton type="button" onClick={() => router.push("/fire-biz/customers")}>
            {copy.common.cancel}
          </FireBizSecondaryButton>
        </div>
      </form>
    </FireBizFormShell>
  );
}

export function FireBizSupplierFormPage({ editId }: FormProps) {
  const copy = useFireBizCopy();
  const f = copy.suppliers;
  const { suppliers, saveSupplier, deleteSupplier } = useFireBiz();
  const router = useRouter();
  const existing = useMemo(() => (editId ? suppliers.find((s) => s.id === editId) : null), [suppliers, editId]);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [openingBalance, setOpeningBalance] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(!editId);

  useEffect(() => {
    if (!existing) return;
    setName(existing.name);
    setPhone(existing.phone ?? "");
    setEmail(existing.email ?? "");
    setAddress(existing.address ?? "");
    setOpeningBalance(String(existing.opening_balance));
    setNotes(existing.notes ?? "");
    setLoaded(true);
  }, [existing]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error(f.invalidName);
      return;
    }
    setSaving(true);
    try {
      const opening = Number(openingBalance) || 0;
      await saveSupplier({
        id: editId,
        name: name.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
        address: address.trim() || null,
        opening_balance: opening,
        balance: editId ? undefined : opening,
        notes: notes.trim() || null,
      });
      toast.success(editId ? f.updated : f.added);
      router.push("/fire-biz/suppliers");
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    if (!editId || !window.confirm(f.confirmDelete)) return;
    void deleteSupplier(editId).then(() => {
      toast.success(f.deleted);
      router.push("/fire-biz/suppliers");
    });
  }

  if (editId && !loaded) {
    return (
      <FireBizFormShell title={f.editTitle} backHref="/fire-biz/suppliers">
        <p className="text-sm font-semibold text-emerald-200/60">{copy.common.loading}</p>
      </FireBizFormShell>
    );
  }

  return (
    <FireBizFormShell
      title={editId ? f.editTitle : f.addTitle}
      backHref="/fire-biz/suppliers"
      onDelete={editId ? handleDelete : undefined}
      deleteLabel={f.delete}
    >
      <form className="grid gap-4" onSubmit={(e) => void handleSubmit(e)}>
        <FireBizInput label={f.name} value={name} onChange={setName} placeholder={f.namePlaceholder} />
        <FireBizInput label={f.phone} value={phone} onChange={setPhone} type="tel" />
        <FireBizInput label={f.email} value={email} onChange={setEmail} type="email" />
        <FireBizInput label={f.address} value={address} onChange={setAddress} />
        <FireBizInput label={f.openingBalance} value={openingBalance} onChange={setOpeningBalance} type="number" />
        <FireBizInput label={f.notes} value={notes} onChange={setNotes} />
        <div className="flex flex-wrap gap-2 pt-2">
          <FireBizPrimaryButton type="submit" disabled={saving}>
            {saving ? copy.common.loading : editId ? f.saveEdit : f.save}
          </FireBizPrimaryButton>
          <FireBizSecondaryButton type="button" onClick={() => router.push("/fire-biz/suppliers")}>
            {copy.common.cancel}
          </FireBizSecondaryButton>
        </div>
      </form>
    </FireBizFormShell>
  );
}

export function FireBizSaleFormPage({ editId }: FormProps) {
  const copy = useFireBizCopy();
  const f = copy.sales;
  const { sales, customers, profile, saveSale, deleteSale } = useFireBiz();
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const router = useRouter();
  const existing = useMemo(() => (editId ? sales.find((s) => s.id === editId) : null), [sales, editId]);

  const [customerId, setCustomerId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [saleDate, setSaleDate] = useState(new Date().toISOString().slice(0, 10));
  const [lineItems, setLineItems] = useState<FireBizLineItem[]>([{ ...EMPTY_LINE }]);
  const [discount, setDiscount] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [isTaxInvoice, setIsTaxInvoice] = useState(false);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(!editId);

  const vatRate = profile?.default_vat_rate ?? NEPAL_DEFAULT_VAT_RATE;

  const totals = useMemo(
    () =>
      computeVatFromLineItems(lineItems.filter((i) => i.name.trim()), {
        vatRate: Number(vatRate),
        discountAmount: Number(discount) || 0,
        isTaxInvoice,
      }),
    [lineItems, discount, isTaxInvoice, vatRate],
  );

  useEffect(() => {
    if (!existing) return;
    setCustomerId(existing.customer_id ?? "");
    setInvoiceNumber(existing.invoice_number ?? "");
    setSaleDate(existing.sale_date);
    const items = Array.isArray(existing.line_items)
      ? (existing.line_items as FireBizLineItem[])
      : [{ ...EMPTY_LINE }];
    setLineItems(items.length > 0 ? items : [{ ...EMPTY_LINE }]);
    setDiscount(String(existing.discount_amount ?? 0));
    setAmountPaid(String(existing.amount_paid ?? 0));
    setPaymentMethod(existing.payment_method ?? "cash");
    setIsTaxInvoice(Boolean(existing.is_tax_invoice));
    setNotes(existing.notes ?? "");
    setLoaded(true);
  }, [existing]);

  function updateLine(idx: number, patch: Partial<FireBizLineItem>) {
    setLineItems((prev) => prev.map((item, i) => (i === idx ? { ...item, ...patch } : item)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const items = lineItems.filter((i) => i.name.trim());
    if (items.length === 0) {
      toast.error(f.invalidItems);
      return;
    }
    if (totals.total <= 0) {
      toast.error(f.invalidAmount);
      return;
    }
    const paid = Number(amountPaid) || 0;
    setSaving(true);
    try {
      await saveSale({
        id: editId,
        customer_id: customerId || null,
        invoice_number: invoiceNumber || `INV-${Date.now().toString().slice(-6)}`,
        sale_date: saleDate,
        subtotal: totals.subtotal,
        tax_amount: totals.vatAmount,
        discount_amount: totals.discount,
        total_amount: totals.total,
        amount_paid: paid,
        payment_status: derivePaymentStatus(totals.total, paid),
        payment_method: paymentMethod,
        vat_rate: Number(vatRate),
        is_tax_invoice: isTaxInvoice,
        line_items: lineItemsToJson(items),
        notes: notes.trim() || null,
      });
      toast.success(editId ? f.updated : f.added);
      router.push("/fire-biz/sales");
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    if (!editId || !window.confirm(f.confirmDelete)) return;
    void deleteSale(editId).then(() => {
      toast.success(f.deleted);
      router.push("/fire-biz/sales");
    });
  }

  if (editId && !loaded) {
    return (
      <FireBizFormShell title={f.editTitle} backHref="/fire-biz/sales">
        <p className="text-sm font-semibold text-emerald-200/60">{copy.common.loading}</p>
      </FireBizFormShell>
    );
  }

  return (
    <FireBizFormShell
      title={editId ? f.editTitle : f.addTitle}
      backHref="/fire-biz/sales"
      onDelete={editId ? handleDelete : undefined}
      deleteLabel={f.delete}
    >
      <form className="grid gap-4" onSubmit={(e) => void handleSubmit(e)}>
        <FireBizSelect
          label={f.customer}
          value={customerId}
          onChange={setCustomerId}
          placeholder={f.selectCustomer}
          options={customers.map((c) => ({ value: c.id, label: c.name }))}
        />
        <FireBizInput label={f.invoiceNumber} value={invoiceNumber} onChange={setInvoiceNumber} />
        <FireBizInput label={f.date} value={saleDate} onChange={setSaleDate} type="date" />
        <div className="space-y-3">
          <p className={`text-xs font-bold ${light ? "text-slate-700" : "text-emerald-200/80"}`}>{f.lineItems}</p>
          {lineItems.map((item, idx) => (
            <div key={idx} className={`grid gap-2 rounded-xl border p-3 sm:grid-cols-3 ${light ? "border-emerald-200/60 bg-white/80" : "border-emerald-400/10 bg-black/20"}`}>
              <FireBizInput label={f.itemName} value={item.name} onChange={(v) => updateLine(idx, { name: v })} />
              <FireBizInput label={f.quantity} value={String(item.quantity)} onChange={(v) => updateLine(idx, { quantity: Number(v) || 1 })} type="number" />
              <FireBizInput label={f.unitPrice} value={String(item.unitPrice)} onChange={(v) => updateLine(idx, { unitPrice: Number(v) || 0 })} type="number" />
            </div>
          ))}
          <FireBizSecondaryButton type="button" onClick={() => setLineItems((prev) => [...prev, { ...EMPTY_LINE }])}>
            {f.addLine}
          </FireBizSecondaryButton>
        </div>
        <FireBizInput label={f.discount} value={discount} onChange={setDiscount} type="number" />
        <label className={`flex items-center gap-2 text-sm font-bold ${light ? "text-slate-800" : "text-emerald-100"}`}>
          <input type="checkbox" checked={isTaxInvoice} onChange={(e) => setIsTaxInvoice(e.target.checked)} className="h-4 w-4 rounded" />
          {f.taxInvoice}
        </label>
        <div className={`rounded-xl border px-3 py-2 text-sm ${light ? "border-emerald-200/60 bg-emerald-50/50" : "border-emerald-400/10 bg-black/20"}`}>
          <p className="font-bold">{f.subtotal}: {formatBizNpr(totals.subtotal)}</p>
          {isTaxInvoice ? <p className="opacity-80">{f.vat} ({vatRate}%): {formatBizNpr(totals.vatAmount)}</p> : null}
          <p className="font-black text-lime-400">{f.total}: {formatBizNpr(totals.total)}</p>
        </div>
        <FireBizInput label={f.amountPaid} value={amountPaid} onChange={setAmountPaid} type="number" />
        <FireBizSelect
          label={f.paymentMethod}
          value={paymentMethod}
          onChange={(v) => setPaymentMethod(v as PaymentMethod)}
          options={PAYMENT_METHODS.map((m) => ({ value: m, label: f.paymentMethods[m] }))}
        />
        <FireBizInput label={f.notes} value={notes} onChange={setNotes} />
        <div className="flex flex-wrap gap-2 pt-2">
          <FireBizPrimaryButton type="submit" disabled={saving}>
            {saving ? copy.common.loading : editId ? f.saveEdit : f.save}
          </FireBizPrimaryButton>
          <FireBizSecondaryButton type="button" onClick={() => router.push("/fire-biz/sales")}>
            {copy.common.cancel}
          </FireBizSecondaryButton>
        </div>
      </form>
    </FireBizFormShell>
  );
}

export function FireBizPurchaseFormPage({ editId }: FormProps) {
  const copy = useFireBizCopy();
  const f = copy.purchases;
  const { purchases, suppliers, savePurchase, deletePurchase } = useFireBiz();
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const router = useRouter();
  const existing = useMemo(() => (editId ? purchases.find((p) => p.id === editId) : null), [purchases, editId]);

  const [supplierId, setSupplierId] = useState("");
  const [billNumber, setBillNumber] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [lineItems, setLineItems] = useState<FireBizLineItem[]>([{ ...EMPTY_LINE }]);
  const [amountPaid, setAmountPaid] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(!editId);

  const subtotal = useMemo(() => lineItemsSubtotal(lineItems.filter((i) => i.name.trim())), [lineItems]);

  useEffect(() => {
    if (!existing) return;
    setSupplierId(existing.supplier_id ?? "");
    setBillNumber(existing.bill_number ?? "");
    setPurchaseDate(existing.purchase_date);
    const items = Array.isArray(existing.line_items)
      ? (existing.line_items as FireBizLineItem[])
      : [{ ...EMPTY_LINE }];
    setLineItems(items.length > 0 ? items : [{ ...EMPTY_LINE }]);
    setAmountPaid(String(existing.amount_paid ?? 0));
    setNotes(existing.notes ?? "");
    setLoaded(true);
  }, [existing]);

  function updateLine(idx: number, patch: Partial<FireBizLineItem>) {
    setLineItems((prev) => prev.map((item, i) => (i === idx ? { ...item, ...patch } : item)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const items = lineItems.filter((i) => i.name.trim());
    if (items.length === 0) {
      toast.error(f.invalidItems);
      return;
    }
    if (subtotal <= 0) {
      toast.error(f.invalidAmount);
      return;
    }
    const paid = Number(amountPaid) || 0;
    setSaving(true);
    try {
      await savePurchase({
        id: editId,
        supplier_id: supplierId || null,
        bill_number: billNumber || `BILL-${Date.now().toString().slice(-6)}`,
        purchase_date: purchaseDate,
        subtotal,
        tax_amount: 0,
        discount_amount: 0,
        total_amount: subtotal,
        amount_paid: paid,
        payment_status: derivePaymentStatus(subtotal, paid),
        line_items: lineItemsToJson(items),
        notes: notes.trim() || null,
      });
      toast.success(editId ? f.updated : f.added);
      router.push("/fire-biz/purchases");
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    if (!editId || !window.confirm(f.confirmDelete)) return;
    void deletePurchase(editId).then(() => {
      toast.success(f.deleted);
      router.push("/fire-biz/purchases");
    });
  }

  if (editId && !loaded) {
    return (
      <FireBizFormShell title={f.editTitle} backHref="/fire-biz/purchases">
        <p className="text-sm font-semibold text-emerald-200/60">{copy.common.loading}</p>
      </FireBizFormShell>
    );
  }

  return (
    <FireBizFormShell
      title={editId ? f.editTitle : f.addTitle}
      backHref="/fire-biz/purchases"
      onDelete={editId ? handleDelete : undefined}
      deleteLabel={f.delete}
    >
      <form className="grid gap-4" onSubmit={(e) => void handleSubmit(e)}>
        <FireBizSelect
          label={f.supplier}
          value={supplierId}
          onChange={setSupplierId}
          placeholder={f.selectSupplier}
          options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
        />
        <FireBizInput label={f.billNumber} value={billNumber} onChange={setBillNumber} />
        <FireBizInput label={f.date} value={purchaseDate} onChange={setPurchaseDate} type="date" />
        <div className="space-y-3">
          <p className={`text-xs font-bold ${light ? "text-slate-700" : "text-emerald-200/80"}`}>{f.lineItems}</p>
          {lineItems.map((item, idx) => (
            <div key={idx} className={`grid gap-2 rounded-xl border p-3 sm:grid-cols-3 ${light ? "border-emerald-200/60 bg-white/80" : "border-emerald-400/10 bg-black/20"}`}>
              <FireBizInput label={f.itemName} value={item.name} onChange={(v) => updateLine(idx, { name: v })} />
              <FireBizInput label={f.quantity} value={String(item.quantity)} onChange={(v) => updateLine(idx, { quantity: Number(v) || 1 })} type="number" />
              <FireBizInput label={f.unitPrice} value={String(item.unitPrice)} onChange={(v) => updateLine(idx, { unitPrice: Number(v) || 0 })} type="number" />
            </div>
          ))}
          <FireBizSecondaryButton type="button" onClick={() => setLineItems((prev) => [...prev, { ...EMPTY_LINE }])}>
            {f.addLine}
          </FireBizSecondaryButton>
        </div>
        <div className={`rounded-xl border px-3 py-2 text-sm font-black ${light ? "border-emerald-200/60 bg-emerald-50/50 text-slate-900" : "border-emerald-400/10 bg-black/20 text-lime-300"}`}>
          {f.total}: {formatBizNpr(subtotal)}
        </div>
        <FireBizInput label={f.amountPaid} value={amountPaid} onChange={setAmountPaid} type="number" />
        <FireBizInput label={f.notes} value={notes} onChange={setNotes} />
        <div className="flex flex-wrap gap-2 pt-2">
          <FireBizPrimaryButton type="submit" disabled={saving}>
            {saving ? copy.common.loading : editId ? f.saveEdit : f.save}
          </FireBizPrimaryButton>
          <FireBizSecondaryButton type="button" onClick={() => router.push("/fire-biz/purchases")}>
            {copy.common.cancel}
          </FireBizSecondaryButton>
        </div>
      </form>
    </FireBizFormShell>
  );
}

export function FireBizInventoryFormPage({ editId }: FormProps) {
  const copy = useFireBizCopy();
  const f = copy.inventory;
  const { inventory, saveInventoryItem, deleteInventoryItem } = useFireBiz();
  const router = useRouter();
  const existing = useMemo(() => (editId ? inventory.find((i) => i.id === editId) : null), [inventory, editId]);

  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [unit, setUnit] = useState("pcs");
  const [quantity, setQuantity] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [reorderLevel, setReorderLevel] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(!editId);

  useEffect(() => {
    if (!existing) return;
    setSku(existing.sku ?? "");
    setName(existing.name);
    setCategory(existing.category ?? "");
    setUnit(existing.unit);
    setQuantity(String(existing.quantity));
    setCostPrice(String(existing.cost_price));
    setSellingPrice(String(existing.selling_price));
    setReorderLevel(String(existing.reorder_level));
    setNotes(existing.notes ?? "");
    setLoaded(true);
  }, [existing]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error(f.invalidName);
      return;
    }
    setSaving(true);
    try {
      await saveInventoryItem({
        id: editId,
        sku: sku.trim() || null,
        name: name.trim(),
        category: category.trim() || null,
        unit: unit.trim() || "pcs",
        quantity: Number(quantity) || 0,
        cost_price: Number(costPrice) || 0,
        selling_price: Number(sellingPrice) || 0,
        reorder_level: Number(reorderLevel) || 0,
        notes: notes.trim() || null,
      });
      toast.success(editId ? f.updated : f.added);
      router.push("/fire-biz/inventory");
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    if (!editId || !window.confirm(f.confirmDelete)) return;
    void deleteInventoryItem(editId).then(() => {
      toast.success(f.deleted);
      router.push("/fire-biz/inventory");
    });
  }

  if (editId && !loaded) {
    return (
      <FireBizFormShell title={f.editTitle} backHref="/fire-biz/inventory">
        <p className="text-sm font-semibold text-emerald-200/60">{copy.common.loading}</p>
      </FireBizFormShell>
    );
  }

  return (
    <FireBizFormShell
      title={editId ? f.editTitle : f.addTitle}
      backHref="/fire-biz/inventory"
      onDelete={editId ? handleDelete : undefined}
      deleteLabel={f.delete}
    >
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => void handleSubmit(e)}>
        <FireBizInput label={f.sku} value={sku} onChange={setSku} />
        <FireBizInput label={f.name} value={name} onChange={setName} />
        <FireBizInput label={f.category} value={category} onChange={setCategory} />
        <FireBizInput label={f.unit} value={unit} onChange={setUnit} />
        <FireBizInput label={f.quantity} value={quantity} onChange={setQuantity} type="number" />
        <FireBizInput label={f.costPrice} value={costPrice} onChange={setCostPrice} type="number" />
        <FireBizInput label={f.sellingPrice} value={sellingPrice} onChange={setSellingPrice} type="number" />
        <FireBizInput label={f.reorderLevel} value={reorderLevel} onChange={setReorderLevel} type="number" />
        <div className="sm:col-span-2">
          <FireBizInput label={f.notes} value={notes} onChange={setNotes} />
        </div>
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <FireBizPrimaryButton type="submit" disabled={saving}>
            {saving ? copy.common.loading : editId ? f.saveEdit : f.save}
          </FireBizPrimaryButton>
          <FireBizSecondaryButton type="button" onClick={() => router.push("/fire-biz/inventory")}>
            {copy.common.cancel}
          </FireBizSecondaryButton>
        </div>
      </form>
    </FireBizFormShell>
  );
}

export function FireBizTransactionFormPage({ editId }: FormProps) {
  const copy = useFireBizCopy();
  const f = copy.cashBank;
  const { transactions, saveBizTransaction, deleteBizTransaction } = useFireBiz();
  const router = useRouter();
  const existing = useMemo(
    () => (editId ? transactions.find((t) => t.id === editId && t.transaction_type !== "expense") : null),
    [transactions, editId],
  );

  const [transactionType, setTransactionType] = useState<CashBankTransactionType>("income");
  const [amount, setAmount] = useState("");
  const [accountType, setAccountType] = useState<"cash" | "bank">("cash");
  const [partyName, setPartyName] = useState("");
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(!editId);

  useEffect(() => {
    if (!existing) return;
    if (CASH_BANK_TYPES.includes(existing.transaction_type as CashBankTransactionType)) {
      setTransactionType(existing.transaction_type as CashBankTransactionType);
    }
    setAmount(String(existing.amount));
    setAccountType(existing.account_type);
    setPartyName(existing.party_name ?? "");
    setTransactionDate(existing.transaction_date);
    setNotes(existing.notes ?? "");
    setLoaded(true);
  }, [existing]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      toast.error(f.invalidAmount);
      return;
    }
    setSaving(true);
    try {
      await saveBizTransaction({
        id: editId,
        transaction_type: transactionType,
        amount: amt,
        account_type: accountType,
        party_name: partyName.trim() || null,
        transaction_date: transactionDate,
        notes: notes.trim() || null,
        reference_type: "other",
      });
      toast.success(editId ? f.updated : f.added);
      router.push("/fire-biz/cash-bank");
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    if (!editId || !window.confirm(f.confirmDelete)) return;
    void deleteBizTransaction(editId).then(() => {
      toast.success(f.deleted);
      router.push("/fire-biz/cash-bank");
    });
  }

  if (editId && !loaded) {
    return (
      <FireBizFormShell title={f.editTitle} backHref="/fire-biz/cash-bank">
        <p className="text-sm font-semibold text-emerald-200/60">{copy.common.loading}</p>
      </FireBizFormShell>
    );
  }

  return (
    <FireBizFormShell
      title={editId ? f.editTitle : f.addTitle}
      backHref="/fire-biz/cash-bank"
      onDelete={editId ? handleDelete : undefined}
      deleteLabel={f.delete}
    >
      <form className="grid gap-4" onSubmit={(e) => void handleSubmit(e)}>
        <FireBizSelect
          label={f.transactionType}
          value={transactionType}
          onChange={(v) => setTransactionType(v as CashBankTransactionType)}
          options={CASH_BANK_TYPES.map((t) => ({ value: t, label: f.transactionTypes[t] }))}
        />
        <FireBizInput label={f.amount} value={amount} onChange={setAmount} type="number" />
        <FireBizSelect
          label={f.accountType}
          value={accountType}
          onChange={(v) => setAccountType(v as "cash" | "bank")}
          options={[
            { value: "cash", label: f.accountCash },
            { value: "bank", label: f.accountBank },
          ]}
        />
        <FireBizInput label={f.party} value={partyName} onChange={setPartyName} />
        <FireBizInput label={f.date} value={transactionDate} onChange={setTransactionDate} type="date" />
        <FireBizInput label={f.notes} value={notes} onChange={setNotes} />
        <div className="flex flex-wrap gap-2 pt-2">
          <FireBizPrimaryButton type="submit" disabled={saving}>
            {saving ? copy.common.loading : editId ? f.saveEdit : f.save}
          </FireBizPrimaryButton>
          <FireBizSecondaryButton type="button" onClick={() => router.push("/fire-biz/cash-bank")}>
            {copy.common.cancel}
          </FireBizSecondaryButton>
        </div>
      </form>
    </FireBizFormShell>
  );
}
