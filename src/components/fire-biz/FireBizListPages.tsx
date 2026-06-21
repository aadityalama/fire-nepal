"use client";

import { ShoppingCart } from "lucide-react";
import { DashboardSectionHeader } from "@/components/DashboardSectionHeader";
import { FireBizEmptyState, FireBizGlassCard, FireBizPageActions, FireBizPrimaryButton } from "@/components/fire-biz/FireBizUiPrimitives";
import { useFireBiz, useFireBizCopy } from "@/contexts/FireBizContext";
import { formatBizNpr } from "@/lib/fire-biz/i18n";

export function FireBizSalesPage() {
  const copy = useFireBizCopy();
  const s = copy.sales;
  const { sales, loading } = useFireBiz();

  return (
    <div className="space-y-6">
      <DashboardSectionHeader eyebrow={copy.moduleName} title={s.title} subtitle={s.subtitle} />
      <FireBizPageActions>
        <FireBizPrimaryButton>{s.newSale}</FireBizPrimaryButton>
      </FireBizPageActions>
      <FireBizGlassCard title={s.title} icon={ShoppingCart}>
        {loading ? (
          <p className="text-sm font-semibold text-emerald-200/60">{copy.common.loading}</p>
        ) : sales.length === 0 ? (
          <FireBizEmptyState message={s.empty} />
        ) : (
          <ul className="space-y-2">
            {sales.map((sale) => (
              <li key={sale.id} className="flex items-center justify-between gap-3 rounded-xl border border-emerald-400/10 bg-black/20 px-3 py-2.5">
                <div>
                  <p className="text-sm font-bold">{sale.invoice_number ?? "Invoice"}</p>
                  <p className="text-[11px] text-emerald-200/60">{sale.sale_date} · {sale.payment_status}</p>
                </div>
                <p className="text-sm font-black tabular-nums text-lime-300">{formatBizNpr(Number(sale.total_amount))}</p>
              </li>
            ))}
          </ul>
        )}
      </FireBizGlassCard>
    </div>
  );
}

export function FireBizPurchasesPage() {
  const copy = useFireBizCopy();
  const p = copy.purchases;
  const { purchases, loading } = useFireBiz();

  return (
    <div className="space-y-6">
      <DashboardSectionHeader eyebrow={copy.moduleName} title={p.title} subtitle={p.subtitle} />
      <FireBizPageActions>
        <FireBizPrimaryButton>{p.newPurchase}</FireBizPrimaryButton>
      </FireBizPageActions>
      <FireBizGlassCard title={p.title} icon={ShoppingCart}>
        {loading ? (
          <p className="text-sm font-semibold text-emerald-200/60">{copy.common.loading}</p>
        ) : purchases.length === 0 ? (
          <FireBizEmptyState message={p.empty} />
        ) : (
          <ul className="space-y-2">
            {purchases.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-3 rounded-xl border border-emerald-400/10 bg-black/20 px-3 py-2.5">
                <div>
                  <p className="text-sm font-bold">{row.bill_number ?? "Bill"}</p>
                  <p className="text-[11px] text-emerald-200/60">{row.purchase_date} · {row.payment_status}</p>
                </div>
                <p className="text-sm font-black tabular-nums text-amber-300">{formatBizNpr(Number(row.total_amount))}</p>
              </li>
            ))}
          </ul>
        )}
      </FireBizGlassCard>
    </div>
  );
}

export function FireBizCustomersPage() {
  const copy = useFireBizCopy();
  const c = copy.customers;
  const { customers, loading } = useFireBiz();

  return (
    <div className="space-y-6">
      <DashboardSectionHeader eyebrow={copy.moduleName} title={c.title} subtitle={c.subtitle} />
      <FireBizPageActions>
        <FireBizPrimaryButton>{c.addCustomer}</FireBizPrimaryButton>
      </FireBizPageActions>
      <FireBizGlassCard title={c.title} icon={ShoppingCart}>
        {loading ? (
          <p className="text-sm font-semibold text-emerald-200/60">{copy.common.loading}</p>
        ) : customers.length === 0 ? (
          <FireBizEmptyState message={c.empty} />
        ) : (
          <ul className="space-y-2">
            {customers.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-3 rounded-xl border border-emerald-400/10 bg-black/20 px-3 py-2.5">
                <div>
                  <p className="text-sm font-bold">{row.name}</p>
                  <p className="text-[11px] text-emerald-200/60">{row.phone ?? row.email ?? "—"}</p>
                </div>
                <p className="text-sm font-black tabular-nums text-lime-300">{formatBizNpr(Number(row.balance))}</p>
              </li>
            ))}
          </ul>
        )}
      </FireBizGlassCard>
    </div>
  );
}

export function FireBizSuppliersPage() {
  const copy = useFireBizCopy();
  const s = copy.suppliers;
  const { suppliers, loading } = useFireBiz();

  return (
    <div className="space-y-6">
      <DashboardSectionHeader eyebrow={copy.moduleName} title={s.title} subtitle={s.subtitle} />
      <FireBizPageActions>
        <FireBizPrimaryButton>{s.addSupplier}</FireBizPrimaryButton>
      </FireBizPageActions>
      <FireBizGlassCard title={s.title} icon={ShoppingCart}>
        {loading ? (
          <p className="text-sm font-semibold text-emerald-200/60">{copy.common.loading}</p>
        ) : suppliers.length === 0 ? (
          <FireBizEmptyState message={s.empty} />
        ) : (
          <ul className="space-y-2">
            {suppliers.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-3 rounded-xl border border-emerald-400/10 bg-black/20 px-3 py-2.5">
                <div>
                  <p className="text-sm font-bold">{row.name}</p>
                  <p className="text-[11px] text-emerald-200/60">{row.phone ?? row.email ?? "—"}</p>
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
  const { inventory, loading } = useFireBiz();

  return (
    <div className="space-y-6">
      <DashboardSectionHeader eyebrow={copy.moduleName} title={i.title} subtitle={i.subtitle} />
      <FireBizPageActions>
        <FireBizPrimaryButton>{i.addItem}</FireBizPrimaryButton>
      </FireBizPageActions>
      <FireBizGlassCard title={i.title} icon={ShoppingCart}>
        {loading ? (
          <p className="text-sm font-semibold text-emerald-200/60">{copy.common.loading}</p>
        ) : inventory.length === 0 ? (
          <FireBizEmptyState message={i.empty} />
        ) : (
          <ul className="space-y-2">
            {inventory.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-3 rounded-xl border border-emerald-400/10 bg-black/20 px-3 py-2.5">
                <div>
                  <p className="text-sm font-bold">{row.name}</p>
                  <p className="text-[11px] text-emerald-200/60">{row.sku ?? row.category ?? "—"} · {row.quantity} {row.unit}</p>
                </div>
                <p className="text-sm font-black tabular-nums text-emerald-200">{formatBizNpr(Number(row.selling_price))}</p>
              </li>
            ))}
          </ul>
        )}
      </FireBizGlassCard>
    </div>
  );
}

export function FireBizCashBankPage() {
  const copy = useFireBizCopy();
  const c = copy.cashBank;
  const { transactions, loading } = useFireBiz();

  return (
    <div className="space-y-6">
      <DashboardSectionHeader eyebrow={copy.moduleName} title={c.title} subtitle={c.subtitle} />
      <FireBizPageActions>
        <FireBizPrimaryButton>{c.addTransaction}</FireBizPrimaryButton>
      </FireBizPageActions>
      <FireBizGlassCard title={c.title} icon={ShoppingCart}>
        {loading ? (
          <p className="text-sm font-semibold text-emerald-200/60">{copy.common.loading}</p>
        ) : transactions.length === 0 ? (
          <FireBizEmptyState message={c.empty} />
        ) : (
          <ul className="space-y-2">
            {transactions.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-3 rounded-xl border border-emerald-400/10 bg-black/20 px-3 py-2.5">
                <div>
                  <p className="text-sm font-bold">{row.party_name ?? row.transaction_type}</p>
                  <p className="text-[11px] text-emerald-200/60">{row.transaction_date} · {row.account_type}</p>
                </div>
                <p className="text-sm font-black tabular-nums text-lime-300">{formatBizNpr(Number(row.amount))}</p>
              </li>
            ))}
          </ul>
        )}
      </FireBizGlassCard>
    </div>
  );
}

export function FireBizCreditRemindersPage() {
  const copy = useFireBizCopy();
  const c = copy.creditReminders;
  const { creditReminders, loading } = useFireBiz();

  return (
    <div className="space-y-6">
      <DashboardSectionHeader eyebrow={copy.moduleName} title={c.title} subtitle={c.subtitle} />
      <FireBizPageActions>
        <FireBizPrimaryButton>{c.addReminder}</FireBizPrimaryButton>
      </FireBizPageActions>
      <FireBizGlassCard title={c.title} icon={ShoppingCart}>
        {loading ? (
          <p className="text-sm font-semibold text-emerald-200/60">{copy.common.loading}</p>
        ) : creditReminders.length === 0 ? (
          <FireBizEmptyState message={c.empty} />
        ) : (
          <ul className="space-y-2">
            {creditReminders.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-3 rounded-xl border border-emerald-400/10 bg-black/20 px-3 py-2.5">
                <div>
                  <p className="text-sm font-bold">{row.party_name}</p>
                  <p className="text-[11px] text-emerald-200/60">{row.due_date} · {row.reminder_type}</p>
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
