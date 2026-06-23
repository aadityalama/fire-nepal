"use client";

import { useMemo } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  FileText,
  Receipt,
  ShoppingBag,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import {
  FireBizCompactHeader,
  FireBizMobileScreen,
} from "@/components/fire-biz/FireBizMobileScreens";
import {
  FireBizEmptyState,
  FireBizGlassCard,
  FireBizKpiGridCard,
  FireBizQuickAction,
} from "@/components/fire-biz/FireBizUiPrimitives";
import { useFireBiz, useFireBizCopy } from "@/contexts/FireBizContext";
import { useFireTheme } from "@/contexts/FireThemeContext";
import { formatBizNpr } from "@/lib/fire-biz/i18n";

export function FireBizDashboard() {
  const copy = useFireBizCopy();
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const { summary, loading, sales, purchases, transactions } = useFireBiz();
  const d = copy.dashboard;
  const loadingVal = "…";

  const recentItems = useMemo(
    () =>
      [
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
        .slice(0, 5),
    [sales, purchases, transactions],
  );

  const kpiCards = [
    { label: d.receivable, value: loading ? loadingVal : formatBizNpr(summary.receivables), icon: ArrowDownLeft, accent: "amber" as const, href: "/fire-biz/parties" },
    { label: d.payable, value: loading ? loadingVal : formatBizNpr(summary.payables), icon: ArrowUpRight, accent: "rose" as const, href: "/fire-biz/parties" },
    { label: d.sales, value: loading ? loadingVal : formatBizNpr(summary.monthlySales), icon: TrendingUp, accent: "emerald" as const, href: "/fire-biz/transactions" },
    { label: d.purchase, value: loading ? loadingVal : formatBizNpr(summary.monthlyPurchases), icon: ShoppingBag, accent: "teal" as const, href: "/fire-biz/transactions" },
    { label: d.expense, value: loading ? loadingVal : formatBizNpr(summary.monthlyExpenses), icon: TrendingDown, accent: "rose" as const, href: "/fire-biz/transactions" },
    { label: d.cashBank, value: loading ? loadingVal : formatBizNpr(summary.cashBalance), icon: Wallet, accent: "emerald" as const, href: "/fire-biz/cash-bank" },
  ];

  return (
    <FireBizMobileScreen>
      <FireBizCompactHeader eyebrow={copy.moduleName} title={d.title} subtitle={d.subtitle} />

      <section aria-label="Business KPIs" className="grid grid-cols-2 gap-2.5">
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

      <FireBizGlassCard title={d.quickActions} icon={Wallet} className="!p-3">
        <div className="grid grid-cols-2 gap-2">
          <FireBizQuickAction label={d.addSale} href="/fire-biz/sales/new" icon={ShoppingCart} compact />
          <FireBizQuickAction label={d.addPurchase} href="/fire-biz/purchases/new" icon={ShoppingBag} compact />
          <FireBizQuickAction label={d.addCustomer} href="/fire-biz/customers/new" icon={Users} compact />
          <FireBizQuickAction label={d.addExpense} href="/fire-biz/expenses" icon={Receipt} compact />
        </div>
      </FireBizGlassCard>

      <FireBizGlassCard title={d.recentActivity} icon={FileText}>
        {recentItems.length === 0 ? (
          <FireBizEmptyState message={d.noActivity} />
        ) : (
          <ul className="space-y-1.5">
            {recentItems.map((item) => (
              <li
                key={`${item.type}-${item.id}`}
                className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 ${
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
    </FireBizMobileScreen>
  );
}
