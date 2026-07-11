"use client";

import { Pencil, ShoppingCart, Trash2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { DashboardSectionHeader } from "@/components/DashboardSectionHeader";
import { FireBizFloatingActionButton } from "@/components/fire-biz/FireBizFloatingActionButton";
import {
  FireBizEmptyState,
  FireBizGlassCard,
  FireBizPageActions,
  FireBizPrimaryLinkButton,
} from "@/components/fire-biz/FireBizUiPrimitives";
import { useFireBiz, useFireBizCopy } from "@/contexts/FireBizContext";
import { useFireTheme } from "@/contexts/FireThemeContext";
import { formatBizNpr } from "@/lib/fire-biz/i18n";

function listItemCls(light: boolean) {
  return `flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 ${
    light ? "border-emerald-200/60 bg-white/80" : "border-emerald-400/10 bg-black/20"
  }`;
}

export function FireBizSalesPage() {
  const copy = useFireBizCopy();
  const s = copy.sales;
  const { sales, loading, deleteSale } = useFireBiz();
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";

  return (
    <div className="space-y-6">
      <DashboardSectionHeader eyebrow={copy.moduleName} title={s.title} subtitle={s.subtitle} />
      <FireBizPageActions>
        <FireBizPrimaryLinkButton href="/fire-biz/sales/new">{s.newSale}</FireBizPrimaryLinkButton>
      </FireBizPageActions>
      <FireBizGlassCard title={s.title} icon={ShoppingCart}>
        {loading ? (
          <p className={`text-sm font-semibold ${light ? "text-slate-600" : "text-emerald-200/60"}`}>{copy.common.loading}</p>
        ) : sales.length === 0 ? (
          <FireBizEmptyState message={s.empty} />
        ) : (
          <ul className="space-y-2">
            {sales.map((sale) => (
              <li key={sale.id} className={listItemCls(light)}>
                <div className="min-w-0">
                  <p className={`text-sm font-bold ${light ? "text-slate-900" : "text-white"}`}>{sale.invoice_number ?? "Invoice"}</p>
                  <p className={`text-[11px] ${light ? "text-slate-600" : "text-emerald-200/60"}`}>
                    {sale.sale_date} · {sale.payment_status} · {sale.payment_method ?? "cash"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <p className="text-sm font-black tabular-nums text-lime-400">{formatBizNpr(Number(sale.total_amount))}</p>
                  <Link href={`/fire-biz/sales/${sale.id}`} className="text-xs font-bold text-emerald-400 hover:underline">
                    {s.viewInvoice}
                  </Link>
                  <Link href={`/fire-biz/sales/${sale.id}/edit`} className="rounded-lg p-2 text-emerald-400 hover:bg-emerald-500/10" aria-label={s.edit}>
                    <Pencil size={16} />
                  </Link>
                  <button
                    type="button"
                    className="rounded-lg p-2 text-rose-400 hover:bg-rose-500/10"
                    onClick={() => {
                      if (!window.confirm(s.confirmDelete)) return;
                      void deleteSale(sale.id).then(() => toast.success(s.deleted));
                    }}
                    aria-label={s.delete}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </FireBizGlassCard>
      <FireBizFloatingActionButton href="/fire-biz/sales/new" label={s.newSale} />
    </div>
  );
}

export function FireBizPurchasesPage() {
  const copy = useFireBizCopy();
  const p = copy.purchases;
  const { purchases, loading, deletePurchase } = useFireBiz();
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";

  return (
    <div className="space-y-6">
      <DashboardSectionHeader eyebrow={copy.moduleName} title={p.title} subtitle={p.subtitle} />
      <FireBizPageActions>
        <FireBizPrimaryLinkButton href="/fire-biz/purchases/new">{p.newPurchase}</FireBizPrimaryLinkButton>
      </FireBizPageActions>
      <FireBizGlassCard title={p.title} icon={ShoppingCart}>
        {loading ? (
          <p className={`text-sm font-semibold ${light ? "text-slate-600" : "text-emerald-200/60"}`}>{copy.common.loading}</p>
        ) : purchases.length === 0 ? (
          <FireBizEmptyState message={p.empty} />
        ) : (
          <ul className="space-y-2">
            {purchases.map((row) => (
              <li key={row.id} className={listItemCls(light)}>
                <div className="min-w-0">
                  <p className={`text-sm font-bold ${light ? "text-slate-900" : "text-white"}`}>{row.bill_number ?? "Bill"}</p>
                  <p className={`text-[11px] ${light ? "text-slate-600" : "text-emerald-200/60"}`}>
                    {row.purchase_date} · {row.payment_status}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <p className="text-sm font-black tabular-nums text-amber-300">{formatBizNpr(Number(row.total_amount))}</p>
                  <Link href={`/fire-biz/purchases/${row.id}/edit`} className="rounded-lg p-2 text-emerald-400 hover:bg-emerald-500/10" aria-label={p.edit}>
                    <Pencil size={16} />
                  </Link>
                  <button
                    type="button"
                    className="rounded-lg p-2 text-rose-400 hover:bg-rose-500/10"
                    onClick={() => {
                      if (!window.confirm(p.confirmDelete)) return;
                      void deletePurchase(row.id).then(() => toast.success(p.deleted));
                    }}
                    aria-label={p.delete}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </FireBizGlassCard>
      <FireBizFloatingActionButton href="/fire-biz/purchases/new" label={p.newPurchase} />
    </div>
  );
}

export function FireBizCustomersPage() {
  const copy = useFireBizCopy();
  const c = copy.customers;
  const { customers, loading, deleteCustomer } = useFireBiz();
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";

  return (
    <div className="space-y-6">
      <DashboardSectionHeader eyebrow={copy.moduleName} title={c.title} subtitle={c.subtitle} />
      <FireBizPageActions>
        <FireBizPrimaryLinkButton href="/fire-biz/customers/new">{c.addCustomer}</FireBizPrimaryLinkButton>
      </FireBizPageActions>
      <FireBizGlassCard title={c.title} icon={ShoppingCart}>
        {loading ? (
          <p className={`text-sm font-semibold ${light ? "text-slate-600" : "text-emerald-200/60"}`}>{copy.common.loading}</p>
        ) : customers.length === 0 ? (
          <FireBizEmptyState message={c.empty} />
        ) : (
          <ul className="space-y-2">
            {customers.map((row) => (
              <li key={row.id} className={listItemCls(light)}>
                <div className="min-w-0">
                  <p className={`text-sm font-bold ${light ? "text-slate-900" : "text-white"}`}>{row.name}</p>
                  <p className={`text-[11px] ${light ? "text-slate-600" : "text-emerald-200/60"}`}>{row.phone ?? row.email ?? "—"}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <p className="text-sm font-black tabular-nums text-lime-400">{formatBizNpr(Number(row.balance))}</p>
                  <Link href={`/fire-biz/customers/${row.id}/statement`} className="text-xs font-bold text-emerald-400 hover:underline">
                    {c.viewStatement}
                  </Link>
                  <Link href={`/fire-biz/customers/${row.id}/edit`} className="rounded-lg p-2 text-emerald-400 hover:bg-emerald-500/10" aria-label={c.edit}>
                    <Pencil size={16} />
                  </Link>
                  <button
                    type="button"
                    className="rounded-lg p-2 text-rose-400 hover:bg-rose-500/10"
                    onClick={() => {
                      if (!window.confirm(c.confirmDelete)) return;
                      void deleteCustomer(row.id).then(() => toast.success(c.deleted));
                    }}
                    aria-label={c.delete}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </FireBizGlassCard>
      <FireBizFloatingActionButton href="/fire-biz/customers/new" label={c.addCustomer} />
    </div>
  );
}

export function FireBizSuppliersPage() {
  const copy = useFireBizCopy();
  const s = copy.suppliers;
  const { suppliers, loading } = useFireBiz();
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";

  return (
    <div className="space-y-6">
      <DashboardSectionHeader eyebrow={copy.moduleName} title={s.title} subtitle={s.subtitle} />
      <FireBizPageActions>
        <FireBizPrimaryLinkButton href="/fire-biz/suppliers/new">{s.addSupplier}</FireBizPrimaryLinkButton>
      </FireBizPageActions>
      <FireBizGlassCard title={s.title} icon={ShoppingCart}>
        {loading ? (
          <p className={`text-sm font-semibold ${light ? "text-slate-600" : "text-emerald-200/60"}`}>{copy.common.loading}</p>
        ) : suppliers.length === 0 ? (
          <FireBizEmptyState message={s.empty} />
        ) : (
          <ul className="space-y-2">
            {suppliers.map((row) => (
              <li key={row.id} className={listItemCls(light)}>
                <div>
                  <p className={`text-sm font-bold ${light ? "text-slate-900" : "text-white"}`}>{row.name}</p>
                  <p className={`text-[11px] ${light ? "text-slate-600" : "text-emerald-200/60"}`}>{row.phone ?? row.email ?? "—"}</p>
                </div>
                <p className="text-sm font-black tabular-nums text-rose-300">{formatBizNpr(Number(row.balance))}</p>
              </li>
            ))}
          </ul>
        )}
      </FireBizGlassCard>
    </div>
  );
}

export function FireBizInventoryPage() {
  const copy = useFireBizCopy();
  const i = copy.inventory;
  const { inventory, loading, deleteInventoryItem } = useFireBiz();
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";

  return (
    <div className="space-y-6">
      <DashboardSectionHeader eyebrow={copy.moduleName} title={i.title} subtitle={i.subtitle} />
      <FireBizPageActions>
        <FireBizPrimaryLinkButton href="/fire-biz/inventory/new">{i.addItem}</FireBizPrimaryLinkButton>
      </FireBizPageActions>
      <FireBizGlassCard title={i.title} icon={ShoppingCart}>
        {loading ? (
          <p className={`text-sm font-semibold ${light ? "text-slate-600" : "text-emerald-200/60"}`}>{copy.common.loading}</p>
        ) : inventory.length === 0 ? (
          <FireBizEmptyState message={i.empty} />
        ) : (
          <ul className="space-y-2">
            {inventory.map((row) => (
              <li key={row.id} className={listItemCls(light)}>
                <div className="min-w-0">
                  <p className={`text-sm font-bold ${light ? "text-slate-900" : "text-white"}`}>{row.name}</p>
                  <p className={`text-[11px] ${light ? "text-slate-600" : "text-emerald-200/60"}`}>
                    {row.sku ?? row.category ?? "—"} · {row.quantity} {row.unit}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <p className="text-sm font-black tabular-nums text-emerald-300">{formatBizNpr(Number(row.selling_price))}</p>
                  <Link href={`/fire-biz/inventory/${row.id}/edit`} className="rounded-lg p-2 text-emerald-400 hover:bg-emerald-500/10" aria-label={i.edit}>
                    <Pencil size={16} />
                  </Link>
                  <button
                    type="button"
                    className="rounded-lg p-2 text-rose-400 hover:bg-rose-500/10"
                    onClick={() => {
                      if (!window.confirm(i.confirmDelete)) return;
                      void deleteInventoryItem(row.id).then(() => toast.success(i.deleted));
                    }}
                    aria-label={i.delete}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </FireBizGlassCard>
      <FireBizFloatingActionButton href="/fire-biz/inventory/new" label={i.addItem} />
    </div>
  );
}

const CASH_BANK_TYPES = new Set(["income", "transfer", "payment_received", "payment_made"]);

export function FireBizCashBankPage() {
  const copy = useFireBizCopy();
  const c = copy.cashBank;
  const { transactions, loading, deleteBizTransaction } = useFireBiz();
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";

  const cashBankTx = transactions.filter((t) => CASH_BANK_TYPES.has(t.transaction_type));

  return (
    <div className="space-y-6">
      <DashboardSectionHeader eyebrow={copy.moduleName} title={c.title} subtitle={c.subtitle} />
      <FireBizPageActions>
        <FireBizPrimaryLinkButton href="/fire-biz/cash-bank/new">{c.addTransaction}</FireBizPrimaryLinkButton>
      </FireBizPageActions>
      <FireBizGlassCard title={c.title} icon={ShoppingCart}>
        {loading ? (
          <p className={`text-sm font-semibold ${light ? "text-slate-600" : "text-emerald-200/60"}`}>{copy.common.loading}</p>
        ) : cashBankTx.length === 0 ? (
          <FireBizEmptyState message={c.empty} />
        ) : (
          <ul className="space-y-2">
            {cashBankTx.map((row) => (
              <li key={row.id} className={listItemCls(light)}>
                <div className="min-w-0">
                  <p className={`text-sm font-bold ${light ? "text-slate-900" : "text-white"}`}>{row.party_name ?? row.transaction_type}</p>
                  <p className={`text-[11px] ${light ? "text-slate-600" : "text-emerald-200/60"}`}>
                    {row.transaction_date} · {row.account_type} · {c.transactionTypes[row.transaction_type as keyof typeof c.transactionTypes] ?? row.transaction_type}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <p className="text-sm font-black tabular-nums text-lime-400">{formatBizNpr(Number(row.amount))}</p>
                  <Link href={`/fire-biz/cash-bank/${row.id}/edit`} className="rounded-lg p-2 text-emerald-400 hover:bg-emerald-500/10" aria-label={c.edit}>
                    <Pencil size={16} />
                  </Link>
                  <button
                    type="button"
                    className="rounded-lg p-2 text-rose-400 hover:bg-rose-500/10"
                    onClick={() => {
                      if (!window.confirm(c.confirmDelete)) return;
                      void deleteBizTransaction(row.id).then(() => toast.success(c.deleted));
                    }}
                    aria-label={c.delete}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </FireBizGlassCard>
      <FireBizFloatingActionButton href="/fire-biz/cash-bank/new" label={c.addTransaction} />
    </div>
  );
}

export function FireBizCreditRemindersPage() {
  const copy = useFireBizCopy();
  const c = copy.creditReminders;
  const { creditReminders, loading } = useFireBiz();
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";

  return (
    <div className="space-y-6">
      <DashboardSectionHeader eyebrow={copy.moduleName} title={c.title} subtitle={c.subtitle} />
      <FireBizPageActions>
        <FireBizPrimaryLinkButton href="/fire-biz/credit-reminders">{c.addReminder}</FireBizPrimaryLinkButton>
      </FireBizPageActions>
      <FireBizGlassCard title={c.title} icon={ShoppingCart}>
        {loading ? (
          <p className={`text-sm font-semibold ${light ? "text-slate-600" : "text-emerald-200/60"}`}>{copy.common.loading}</p>
        ) : creditReminders.length === 0 ? (
          <FireBizEmptyState message={c.empty} />
        ) : (
          <ul className="space-y-2">
            {creditReminders.map((row) => (
              <li key={row.id} className={listItemCls(light)}>
                <div>
                  <p className={`text-sm font-bold ${light ? "text-slate-900" : "text-white"}`}>{row.party_name}</p>
                  <p className={`text-[11px] ${light ? "text-slate-600" : "text-emerald-200/60"}`}>
                    {row.due_date} · {row.reminder_type}
                  </p>
                </div>
                <p className="text-sm font-black tabular-nums text-amber-300">{formatBizNpr(Number(row.amount_due))}</p>
              </li>
            ))}
          </ul>
        )}
      </FireBizGlassCard>
    </div>
  );
}
