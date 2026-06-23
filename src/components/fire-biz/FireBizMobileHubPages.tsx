"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  FileText,
  HelpCircle,
  Package,
  Receipt,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Tags,
  Truck,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { FireBizDashboardAnalytics } from "@/components/fire-biz/FireBizDashboardAnalytics";
import { FireBizFireIntegrationPanel } from "@/components/fire-biz/FireBizFireIntegrationPanel";
import {
  FireBizCompactHeader,
  FireBizFabMenu,
  FireBizMobileScreen,
  FireBizMobileTabs,
  FireBizRankList,
  FireBizSearchFilterBar,
  FireBizSectionLink,
  FireBizTimelineList,
} from "@/components/fire-biz/FireBizMobileScreens";
import { FireBizGlassCard, FireBizKpiGridCard } from "@/components/fire-biz/FireBizUiPrimitives";
import { useFireBiz, useFireBizCopy } from "@/contexts/FireBizContext";
import { computeFireBizAnalytics, computeFireBizFireIntegration } from "@/lib/fire-biz/analytics";
import { formatBizNpr } from "@/lib/fire-biz/i18n";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useFireTheme } from "@/contexts/FireThemeContext";

const CASH_BANK_TYPES = new Set(["income", "transfer", "payment_received", "payment_made"]);

type TxnTab = "sales" | "purchases" | "expenses" | "payments";
type InvTab = "all" | "low" | "out";

function inDateRange(dateStr: string, filter: string): boolean {
  if (filter === "all") return true;
  const d = new Date(dateStr);
  const now = new Date();
  if (filter === "week") {
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);
    return d >= weekAgo;
  }
  if (filter === "month") {
    return dateStr.startsWith(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
  }
  return true;
}

export function FireBizTransactionsHubPage() {
  const copy = useFireBizCopy();
  const t = copy.transactionsHub;
  const { sales, purchases, transactions, loading } = useFireBiz();
  const [tab, setTab] = useState<TxnTab>("sales");
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("all");

  const timelineItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    const match = (label: string, sub: string) => !q || label.toLowerCase().includes(q) || sub.toLowerCase().includes(q);

    const salesItems = sales
      .filter((s) => inDateRange(s.sale_date, dateFilter))
      .map((s) => ({
        id: `sale-${s.id}`,
        label: s.invoice_number ?? "Sale",
        sublabel: `${s.sale_date} · ${s.payment_status}`,
        amount: Number(s.total_amount),
        date: s.sale_date,
        type: "sale" as const,
        href: `/fire-biz/sales/${s.id}`,
      }));

    const purchaseItems = purchases
      .filter((p) => inDateRange(p.purchase_date, dateFilter))
      .map((p) => ({
        id: `purchase-${p.id}`,
        label: p.bill_number ?? "Purchase",
        sublabel: `${p.purchase_date} · ${p.payment_status}`,
        amount: Number(p.total_amount),
        date: p.purchase_date,
        type: "purchase" as const,
        href: `/fire-biz/purchases/${p.id}/edit`,
      }));

    const expenseItems = transactions
      .filter((tx) => tx.transaction_type === "expense" && inDateRange(tx.transaction_date, dateFilter))
      .map((tx) => ({
        id: `expense-${tx.id}`,
        label: tx.party_name ?? "Expense",
        sublabel: `${tx.transaction_date} · expense`,
        amount: Number(tx.amount),
        date: tx.transaction_date,
        type: "expense" as const,
      }));

    const paymentItems = transactions
      .filter((tx) => CASH_BANK_TYPES.has(tx.transaction_type) && inDateRange(tx.transaction_date, dateFilter))
      .map((tx) => ({
        id: `payment-${tx.id}`,
        label: tx.party_name ?? tx.transaction_type,
        sublabel: `${tx.transaction_date} · ${tx.account_type}`,
        amount: Number(tx.amount),
        date: tx.transaction_date,
        type: "payment" as const,
        href: `/fire-biz/cash-bank/${tx.id}/edit`,
      }));

    const byTab =
      tab === "sales"
        ? salesItems
        : tab === "purchases"
          ? purchaseItems
          : tab === "expenses"
            ? expenseItems
            : paymentItems;

    return byTab
      .filter((item) => match(item.label, item.sublabel))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [sales, purchases, transactions, tab, search, dateFilter]);

  return (
    <FireBizMobileScreen>
      <FireBizCompactHeader eyebrow={copy.moduleName} title={t.title} subtitle={t.subtitle} />

      <FireBizMobileTabs
        tabs={[
          { key: "sales" as const, label: t.sales },
          { key: "purchases" as const, label: t.purchases },
          { key: "expenses" as const, label: t.expenses },
          { key: "payments" as const, label: t.payments },
        ]}
        active={tab}
        onChange={setTab}
      />

      <FireBizSearchFilterBar
        search={search}
        onSearchChange={setSearch}
        filterLabel="Date filter"
        filterOptions={[
          { value: "all", label: t.filterAll },
          { value: "week", label: t.filterWeek },
          { value: "month", label: t.filterMonth },
        ]}
        filterValue={dateFilter}
        onFilterChange={setDateFilter}
        placeholder={t.searchPlaceholder}
      />

      <FireBizGlassCard title={t.title} icon={ShoppingCart}>
        {loading ? (
          <p className="text-sm font-semibold text-emerald-200/60">{copy.common.loading}</p>
        ) : (
          <FireBizTimelineList items={timelineItems} emptyMessage={t.empty} formatAmount={formatBizNpr} />
        )}
      </FireBizGlassCard>

      <FireBizFabMenu
        label={t.fabLabel}
        actions={[
          { label: copy.dashboard.addSale, href: "/fire-biz/sales/new", icon: ShoppingCart },
          { label: copy.dashboard.addPurchase, href: "/fire-biz/purchases/new", icon: ShoppingBag },
          { label: copy.dashboard.addExpense, href: "/fire-biz/expenses", icon: Receipt },
          { label: copy.cashBank.addTransaction, href: "/fire-biz/cash-bank/new", icon: Wallet },
        ]}
      />
    </FireBizMobileScreen>
  );
}

export function FireBizPartiesHubPage() {
  const copy = useFireBizCopy();
  const p = copy.partiesHub;
  const { customers, suppliers, summary, loading } = useFireBiz();
  const loadingVal = "…";

  const topCustomers = useMemo(
    () =>
      customers
        .filter((c) => Number(c.balance) > 0)
        .sort((a, b) => Number(b.balance) - Number(a.balance))
        .slice(0, 5)
        .map((c) => ({ name: c.name, amount: Number(c.balance) })),
    [customers],
  );

  const topSuppliers = useMemo(
    () =>
      suppliers
        .filter((s) => Number(s.balance) > 0)
        .sort((a, b) => Number(b.balance) - Number(a.balance))
        .slice(0, 5)
        .map((s) => ({ name: s.name, amount: Number(s.balance) })),
    [suppliers],
  );

  return (
    <FireBizMobileScreen>
      <FireBizCompactHeader eyebrow={copy.moduleName} title={p.title} subtitle={p.subtitle} />

      <section aria-label="Party balances" className="grid grid-cols-2 gap-2.5">
        <FireBizKpiGridCard
          label={p.receivables}
          value={loading ? loadingVal : formatBizNpr(summary.receivables)}
          icon={ArrowDownLeft}
          accent="amber"
          href="/fire-biz/customers"
        />
        <FireBizKpiGridCard
          label={p.payables}
          value={loading ? loadingVal : formatBizNpr(summary.payables)}
          icon={ArrowUpRight}
          accent="rose"
          href="/fire-biz/suppliers"
        />
      </section>

      <div className="grid gap-2">
        <FireBizSectionLink label={p.customers} href="/fire-biz/customers" icon={Users} value={String(customers.length)} />
        <FireBizSectionLink label={p.suppliers} href="/fire-biz/suppliers" icon={Truck} value={String(suppliers.length)} />
      </div>

      <FireBizGlassCard title={p.topCustomers} icon={Users}>
        <FireBizRankList
          title=""
          items={topCustomers}
          emptyMessage={copy.analytics.noCustomers}
          formatAmount={formatBizNpr}
        />
      </FireBizGlassCard>

      <FireBizGlassCard title={p.topSuppliers} icon={Truck}>
        <FireBizRankList title="" items={topSuppliers} emptyMessage={p.noSuppliers} formatAmount={formatBizNpr} />
      </FireBizGlassCard>

      <FireBizFabMenu
        label={p.fabLabel}
        actions={[
          { label: copy.customers.addCustomer, href: "/fire-biz/customers/new", icon: Users },
          { label: copy.suppliers.addSupplier, href: "/fire-biz/suppliers", icon: Truck },
        ]}
      />
    </FireBizMobileScreen>
  );
}

export function FireBizInventoryHubPage() {
  const copy = useFireBizCopy();
  const i = copy.inventoryHub;
  const inv = copy.inventory;
  const { inventory, summary, loading } = useFireBiz();
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const [tab, setTab] = useState<InvTab>("all");
  const loadingVal = "…";

  const stats = useMemo(() => {
    const lowStock = inventory.filter((row) => Number(row.quantity) > 0 && Number(row.quantity) <= Number(row.reorder_level));
    const outOfStock = inventory.filter((row) => Number(row.quantity) <= 0);
    const topByValue = inventory
      .map((row) => ({
        name: row.name,
        amount: Number(row.quantity) * Number(row.cost_price ?? row.selling_price ?? 0),
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
    return { lowStock, outOfStock, topByValue };
  }, [inventory]);

  const filteredItems = useMemo(() => {
    if (tab === "low") return stats.lowStock;
    if (tab === "out") return stats.outOfStock;
    return inventory;
  }, [inventory, stats, tab]);

  return (
    <FireBizMobileScreen>
      <FireBizCompactHeader eyebrow={copy.moduleName} title={i.title} subtitle={i.subtitle} />

      <section aria-label="Inventory KPIs" className="grid grid-cols-2 gap-2.5">
        <FireBizKpiGridCard
          label={i.inventoryValue}
          value={loading ? loadingVal : formatBizNpr(summary.inventoryValue)}
          icon={Package}
          accent="emerald"
        />
        <FireBizKpiGridCard
          label={i.inventoryItems}
          value={loading ? loadingVal : String(inventory.length)}
          icon={Package}
          accent="teal"
          href="/fire-biz/inventory"
        />
        <FireBizKpiGridCard
          label={i.lowStock}
          value={loading ? loadingVal : String(stats.lowStock.length)}
          icon={Package}
          accent="amber"
        />
        <FireBizKpiGridCard
          label={i.outOfStock}
          value={loading ? loadingVal : String(stats.outOfStock.length)}
          icon={Package}
          accent="rose"
        />
      </section>

      <FireBizGlassCard title={i.stockAnalytics} icon={BarChart3}>
        {stats.topByValue.length === 0 ? (
          <p className={`text-sm font-semibold ${light ? "text-slate-600" : "text-emerald-200/60"}`}>{i.empty}</p>
        ) : (
          <div className={`h-[180px] rounded-xl p-2 ${light ? "bg-slate-50/80" : "bg-black/25"}`}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.topByValue} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid stroke={light ? "rgba(15,23,42,0.08)" : "rgba(255,255,255,0.06)"} strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fill: light ? "#64748b" : "#cbd5e1", fontSize: 10 }} tickLine={false} interval={0} angle={-20} textAnchor="end" height={48} />
                <YAxis tick={{ fill: light ? "#64748b" : "#cbd5e1", fontSize: 10 }} tickLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <Tooltip formatter={(v: number) => formatBizNpr(v)} />
                <Bar dataKey="amount" fill="#34d399" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </FireBizGlassCard>

      <FireBizMobileTabs
        tabs={[
          { key: "all" as const, label: i.allItems },
          { key: "low" as const, label: i.lowStock },
          { key: "out" as const, label: i.outOfStock },
        ]}
        active={tab}
        onChange={setTab}
      />

      <FireBizGlassCard title={inv.title} icon={Package}>
        {loading ? (
          <p className={`text-sm font-semibold ${light ? "text-slate-600" : "text-emerald-200/60"}`}>{copy.common.loading}</p>
        ) : filteredItems.length === 0 ? (
          <p className={`text-sm font-semibold ${light ? "text-slate-600" : "text-emerald-200/60"}`}>
            {tab === "low" ? i.noLowStock : tab === "out" ? i.noOutOfStock : i.empty}
          </p>
        ) : (
          <ul className="space-y-1.5">
            {filteredItems.map((row) => (
              <li key={row.id}>
                <Link
                  href={`/fire-biz/inventory/${row.id}/edit`}
                  className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 transition active:scale-[0.99] ${
                    light ? "border-emerald-200/60 bg-white/80" : "border-emerald-400/10 bg-black/20"
                  }`}
                >
                  <div className="min-w-0">
                    <p className={`truncate text-sm font-bold ${light ? "text-slate-900" : "text-white"}`}>{row.name}</p>
                    <p className={`text-[11px] ${light ? "text-slate-600" : "text-emerald-200/60"}`}>
                      {row.quantity} {row.unit} · {row.sku ?? row.category ?? "—"}
                    </p>
                  </div>
                  <p className={`shrink-0 text-sm font-black tabular-nums ${light ? "text-emerald-700" : "text-lime-300"}`}>
                    {formatBizNpr(Number(row.selling_price))}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </FireBizGlassCard>

      <FireBizFabMenu label={i.fabLabel} actions={[{ label: inv.addItem, href: "/fire-biz/inventory/new", icon: Package }]} />
    </FireBizMobileScreen>
  );
}

export function FireBizMoreHubPage() {
  const copy = useFireBizCopy();
  const m = copy.moreHub;
  const { sales, purchases, transactions, customers, summary, loading } = useFireBiz();

  const analytics = useMemo(
    () => computeFireBizAnalytics(sales, purchases, transactions, customers, summary),
    [sales, purchases, transactions, customers, summary],
  );
  const fireIntegration = useMemo(() => computeFireBizFireIntegration(summary), [summary]);

  return (
    <FireBizMobileScreen>
      <FireBizCompactHeader eyebrow={copy.moduleName} title={m.title} subtitle={m.subtitle} />

      <FireBizDashboardAnalytics analytics={analytics} loading={loading} variant="more" />

      <div className="grid gap-2 sm:grid-cols-2">
        <FireBizSectionLink label={m.reports} href="/fire-biz/reports" icon={BarChart3} />
        <FireBizSectionLink label={m.bankAccounts} href="/fire-biz/cash-bank" icon={Wallet} />
        <FireBizSectionLink label={m.categories} href="/fire-biz/expenses" icon={Tags} />
        <FireBizSectionLink label={m.settings} href="/fire-biz/settings" icon={Settings} />
        <FireBizSectionLink label={m.support} href="/contact" icon={HelpCircle} />
      </div>

      <FireBizFireIntegrationPanel data={fireIntegration} loading={loading} />

      <Link
        href="/hub"
        className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-emerald-400/20 px-4 py-2.5 text-sm font-black text-emerald-200 transition hover:bg-emerald-500/10"
      >
        {m.backToFire}
      </Link>
    </FireBizMobileScreen>
  );
}
