"use client";

import { useMemo } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  BarChart3,
  FileText,
  Package,
  Receipt,
  ShoppingBag,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { DashboardSectionHeader } from "@/components/DashboardSectionHeader";
import { FireBizDashboardAnalytics } from "@/components/fire-biz/FireBizDashboardAnalytics";
import { FireBizFireIntegrationPanel } from "@/components/fire-biz/FireBizFireIntegrationPanel";
import {
  FireBizEmptyState,
  FireBizGlassCard,
  FireBizKpiGridCard,
  FireBizQuickAction,
} from "@/components/fire-biz/FireBizUiPrimitives";
import { useFireBiz, useFireBizCopy } from "@/contexts/FireBizContext";
import { useFireTheme } from "@/contexts/FireThemeContext";
import { computeFireBizAnalytics, computeFireBizFireIntegration } from "@/lib/fire-biz/analytics";
import { formatBizNpr } from "@/lib/fire-biz/i18n";

export function FireBizDashboard() {
  const copy = useFireBizCopy();
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const { summary, loading, sales, purchases, transactions, customers } = useFireBiz();
  const d = copy.dashboard;
  const loadingVal = "…";

  const analytics = useMemo(
    () => computeFireBizAnalytics(sales, purchases, transactions, customers, summary),
    [sales, purchases, transactions, customers, summary],
  );

  const fireIntegration = useMemo(() => computeFireBizFireIntegration(summary), [summary]);

  const recentItems = [
    ...sales.slice(0, 3).map((s) => ({
      id: s.id,
      label: s.invoice_number ?? "Sale",
      amount: s.total_amount,
      date: s.sale_date,
      type: "sale" as const,
    })),
    ...purchases.slice(0, 3).map((p) => ({
      id: p.id,
      label: p.bill_number ?? "Purchase",
      amount: p.total_amount,
      date: p.purchase_date,
      type: "purchase" as const,
    })),
    ...transactions.slice(0, 3).map((t) => ({
      id: t.id,
      label: t.party_name ?? t.transaction_type,
      amount: t.amount,
      date: t.transaction_date,
      type: "transaction" as const,
    })),
  ]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 6);

  const kpiCards = [
    { label: d.receivable, value: loading ? loadingVal : formatBizNpr(summary.receivables), icon: ArrowDownLeft, accent: "amber" as const, href: "/fire-biz/customers" },
    { label: d.payable, value: loading ? loadingVal : formatBizNpr(summary.payables), icon: ArrowUpRight, accent: "rose" as const, href: "/fire-biz/suppliers" },
    { label: d.monthlySales, value: loading ? loadingVal : formatBizNpr(summary.monthlySales), icon: TrendingUp, accent: "emerald" as const, href: "/fire-biz/sales" },
    { label: d.monthlyPurchases, value: loading ? loadingVal : formatBizNpr(summary.monthlyPurchases), icon: ShoppingBag, accent: "teal" as const, href: "/fire-biz/purchases" },
    { label: d.monthlyExpenses, value: loading ? loadingVal : formatBizNpr(summary.monthlyExpenses), icon: TrendingDown, accent: "rose" as const, href: "/fire-biz/expenses" },
    { label: d.cashBankBalance, value: loading ? loadingVal : formatBizNpr(summary.cashBalance), icon: Wallet, accent: "emerald" as const, href: "/fire-biz/cash-bank" },
  ];

  return (
    <div className="space-y-5 pb-4">
      <DashboardSectionHeader eyebrow={copy.moduleName} title={d.title} subtitle={d.subtitle} accent="emerald" />

      <section aria-label="Business KPIs" className="grid grid-cols-2 gap-3">
        {kpiCards.map((kpi) => (
          <FireBizKpiGridCard
            key={kpi.label}
            label={kpi.label}
            value={kpi.value}
            icon={kpi.icon}
            accent={kpi.accent}
            href={kpi.href}
          />
        ))}
      </section>

      <FireBizGlassCard title={d.quickActions} icon={Banknote}>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <FireBizQuickAction label={d.addCustomer} href="/fire-biz/customers" icon={Users} />
          <FireBizQuickAction label={d.createInvoice} href="/fire-biz/sales" icon={FileText} />
          <FireBizQuickAction label={d.receivePayment} href="/fire-biz/cash-bank" icon={Banknote} />
          <FireBizQuickAction label={d.makePayment} href="/fire-biz/cash-bank" icon={Receipt} />
          <FireBizQuickAction label={d.purchaseEntry} href="/fire-biz/purchases" icon={ShoppingCart} />
          <FireBizQuickAction label={d.inventoryEntry} href="/fire-biz/inventory" icon={Package} />
          <FireBizQuickAction label={d.addExpense} href="/fire-biz/expenses" icon={Wallet} />
          <FireBizQuickAction label={d.reports} href="/fire-biz/reports" icon={BarChart3} />
        </div>
      </FireBizGlassCard>

      <FireBizDashboardAnalytics analytics={analytics} loading={loading} />

      <FireBizFireIntegrationPanel data={fireIntegration} loading={loading} />

      <FireBizGlassCard title={d.recentActivity} icon={Receipt}>
        {recentItems.length === 0 ? (
          <FireBizEmptyState message={d.noActivity} />
        ) : (
          <ul className="space-y-2">
            {recentItems.map((item) => (
              <li
                key={`${item.type}-${item.id}`}
                className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 ${
                  light ? "border-emerald-200/60 bg-white/80" : "border-emerald-400/10 bg-black/20"
                }`}
              >
                <div className="min-w-0">
                  <p className={`truncate text-sm font-bold ${light ? "text-slate-900" : "text-emerald-50"}`}>{item.label}</p>
                  <p className={`text-[11px] font-semibold ${light ? "text-slate-500" : "text-emerald-200/60"}`}>{item.date}</p>
                </div>
                <p className={`shrink-0 text-sm font-black tabular-nums ${light ? "text-emerald-700" : "text-lime-300"}`}>
                  {formatBizNpr(Number(item.amount))}
                </p>
              </li>
            ))}
          </ul>
        )}
      </FireBizGlassCard>

      <p className="text-center text-[11px] font-semibold text-emerald-200/50">
        <Link href="/fire-biz/settings" className="underline-offset-2 hover:underline">
          {copy.settings.title}
        </Link>
      </p>
    </div>
  );
}
