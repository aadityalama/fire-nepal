"use client";

import { ArrowLeft, BarChart3, Bell, Home, Settings, ShoppingBag, ShoppingCart, Truck, Users, Wallet } from "lucide-react";
import Link from "next/link";
import { DashboardSectionHeader } from "@/components/DashboardSectionHeader";
import { FireBizHubTile } from "@/components/fire-biz/FireBizUiPrimitives";
import { useFireBizCopy } from "@/contexts/FireBizContext";

export function FireBizTransactionsHubPage() {
  const copy = useFireBizCopy();
  const t = copy.transactionsHub;

  return (
    <div className="space-y-6">
      <DashboardSectionHeader eyebrow={copy.moduleName} title={t.title} subtitle={t.subtitle} accent="teal" />
      <div className="grid gap-2 sm:grid-cols-2">
        <FireBizHubTile label={t.sales} href="/fire-biz/sales" icon={ShoppingCart} />
        <FireBizHubTile label={t.purchases} href="/fire-biz/purchases" icon={ShoppingBag} />
        <FireBizHubTile label={t.cashBank} href="/fire-biz/cash-bank" icon={Wallet} />
        <FireBizHubTile label={t.creditReminders} href="/fire-biz/credit-reminders" icon={Bell} />
      </div>
    </div>
  );
}

export function FireBizPartiesHubPage() {
  const copy = useFireBizCopy();
  const p = copy.partiesHub;

  return (
    <div className="space-y-6">
      <DashboardSectionHeader eyebrow={copy.moduleName} title={p.title} subtitle={p.subtitle} accent="emerald" />
      <div className="grid gap-2 sm:grid-cols-2">
        <FireBizHubTile label={p.customers} href="/fire-biz/customers" icon={Users} />
        <FireBizHubTile label={p.suppliers} href="/fire-biz/suppliers" icon={Truck} />
      </div>
    </div>
  );
}

export function FireBizMoreHubPage() {
  const copy = useFireBizCopy();
  const m = copy.moreHub;

  return (
    <div className="space-y-6">
      <DashboardSectionHeader eyebrow={copy.moduleName} title={m.title} subtitle={m.subtitle} accent="emerald" />
      <div className="grid gap-2 sm:grid-cols-2">
        <FireBizHubTile label={m.reports} href="/fire-biz/reports" icon={BarChart3} />
        <FireBizHubTile label={m.creditReminders} href="/fire-biz/credit-reminders" icon={Bell} />
        <FireBizHubTile label={m.suppliers} href="/fire-biz/suppliers" icon={Truck} />
        <FireBizHubTile label={m.settings} href="/fire-biz/settings" icon={Settings} />
      </div>
      <Link
        href="/hub"
        className="inline-flex min-h-[48px] items-center gap-2 rounded-xl border border-emerald-400/20 px-4 py-2.5 text-sm font-black text-emerald-200 transition hover:bg-emerald-500/10"
      >
        <Home size={18} />
        {m.backToFire}
        <ArrowLeft size={16} className="ml-auto rotate-180" />
      </Link>
    </div>
  );
}
