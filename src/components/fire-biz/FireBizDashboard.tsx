"use client";

import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  BarChart3,
  Package,
  Plus,
  Receipt,
  ShoppingBag,
  ShoppingCart,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { DashboardSectionHeader } from "@/components/DashboardSectionHeader";
import {
  FireBizEmptyState,
  FireBizGlassCard,
  FireBizQuickAction,
  FireBizSummaryCard,
} from "@/components/fire-biz/FireBizUiPrimitives";
import { useFireBiz, useFireBizCopy } from "@/contexts/FireBizContext";
import { formatBizNpr } from "@/lib/fire-biz/i18n";

export function FireBizDashboard() {
  const copy = useFireBizCopy();
  const { summary, loading, sales, purchases, transactions } = useFireBiz();
  const d = copy.dashboard;

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

  return (
    <div className="space-y-6">
      <DashboardSectionHeader
        eyebrow={copy.moduleName}
        title={d.title}
        subtitle={d.subtitle}
        accent="emerald"
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <FireBizSummaryCard label={d.totalSales} value={loading ? "…" : formatBizNpr(summary.totalSales)} icon={TrendingUp} accent="emerald" />
        <FireBizSummaryCard label={d.totalPurchases} value={loading ? "…" : formatBizNpr(summary.totalPurchases)} icon={ShoppingBag} accent="teal" />
        <FireBizSummaryCard label={d.receivables} value={loading ? "…" : formatBizNpr(summary.receivables)} icon={ArrowDownLeft} accent="amber" />
        <FireBizSummaryCard label={d.payables} value={loading ? "…" : formatBizNpr(summary.payables)} icon={ArrowUpRight} accent="rose" />
        <FireBizSummaryCard label={d.cashBalance} value={loading ? "…" : formatBizNpr(summary.cashBalance)} icon={Wallet} accent="emerald" />
        <FireBizSummaryCard label={d.inventoryValue} value={loading ? "…" : formatBizNpr(summary.inventoryValue)} icon={Package} accent="teal" />
      </div>

      <FireBizGlassCard title={d.quickActions} icon={Plus}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <FireBizQuickAction label={d.newSale} href="/fire-biz/sales" icon={ShoppingCart} />
          <FireBizQuickAction label={d.newPurchase} href="/fire-biz/purchases" icon={ShoppingBag} />
          <FireBizQuickAction label={d.addCustomer} href="/fire-biz/customers" icon={Users} />
          <FireBizQuickAction label={d.receivePayment} href="/fire-biz/cash-bank" icon={Banknote} />
          <FireBizQuickAction label={d.makePayment} href="/fire-biz/cash-bank" icon={Receipt} />
          <FireBizQuickAction label={d.addExpense} href="/fire-biz/cash-bank" icon={Wallet} />
          <FireBizQuickAction label={d.inventoryEntry} href="/fire-biz/inventory" icon={Package} />
          <FireBizQuickAction label={d.reports} href="/fire-biz/reports" icon={BarChart3} />
        </div>
      </FireBizGlassCard>

      <FireBizGlassCard title={d.recentActivity} icon={Receipt}>
        {recentItems.length === 0 ? (
          <FireBizEmptyState message={d.noActivity} />
        ) : (
          <ul className="space-y-2">
            {recentItems.map((item) => (
              <li
                key={`${item.type}-${item.id}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-emerald-400/10 bg-black/20 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-emerald-50">{item.label}</p>
                  <p className="text-[11px] font-semibold text-emerald-200/60">{item.date}</p>
                </div>
                <p className="shrink-0 text-sm font-black tabular-nums text-lime-300">{formatBizNpr(Number(item.amount))}</p>
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
