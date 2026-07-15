"use client";

import { AlertTriangle, Bot, Clock3, Gem, Inbox, Users, Wallet } from "lucide-react";
import type { AdminSnapshot } from "@/lib/admin/fetch-admin-snapshot";

function formatNpr(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "NPR", maximumFractionDigits: 0 }).format(n);
}

function formatUsd(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n);
}

type Kpi = {
  label: string;
  value: string;
  hint: string;
  icon: typeof Users;
  tone?: "emerald" | "amber" | "rose";
};

function CompactKpi({ label, value, hint, icon: Icon, tone = "emerald" }: Kpi) {
  const iconTone =
    tone === "amber"
      ? "border-amber-500/25 bg-amber-500/10 text-amber-300"
      : tone === "rose"
        ? "border-rose-500/25 bg-rose-500/10 text-rose-300"
        : "border-emerald-500/25 bg-emerald-500/10 text-emerald-300";

  return (
    <div className="group relative overflow-hidden rounded-xl border border-white/[0.08] bg-gradient-to-br from-white/[0.055] to-transparent px-3 py-2.5 shadow-[0_0_0_1px_rgba(16,185,129,0.06)] backdrop-blur-xl transition hover:border-emerald-500/25 sm:px-3.5 sm:py-3">
      <div className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-emerald-500/10 blur-2xl opacity-70 transition group-hover:opacity-100" />
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[9px] font-black uppercase tracking-[0.14em] text-emerald-200/50 sm:text-[10px]">{label}</p>
          <p className="mt-0.5 truncate font-mono text-lg font-black tabular-nums tracking-tight text-white sm:text-xl">
            {value}
          </p>
          <p className="mt-0.5 line-clamp-1 text-[10px] font-medium text-zinc-500 sm:text-[11px]">{hint}</p>
        </div>
        <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border ${iconTone}`}>
          <Icon className="h-3.5 w-3.5" aria-hidden />
        </div>
      </div>
    </div>
  );
}

export function ExecutiveCards({ snapshot }: { snapshot: AdminSnapshot }) {
  const m = snapshot.metrics;
  const mr = snapshot.membershipRenewal.kpi;
  const ai = snapshot.aiAnalytics;

  const cards: Kpi[] = [
    {
      label: "Users",
      value: String(m.totalUsers),
      hint: `+${m.newUsersToday} today`,
      icon: Users,
    },
    {
      label: "Premium Members",
      value: String(m.premiumUsers),
      hint: "Premium + elite (excl. archived)",
      icon: Gem,
    },
    {
      label: "Revenue",
      value: formatNpr(m.totalRevenueNpr),
      hint: "Sum of revenue events",
      icon: Wallet,
    },
    {
      label: "Expiring Soon",
      value: String(mr.expiringThisWeek),
      hint: "Paid · ≤7 days",
      icon: Clock3,
      tone: mr.expiringThisWeek > 0 ? "amber" : "emerald",
    },
    {
      label: "Pending Renewals",
      value: String(mr.pendingRenewals),
      hint: "Membership payment requests",
      icon: Inbox,
      tone: mr.pendingRenewals > 0 ? "amber" : "emerald",
    },
    {
      label: "AI Cost",
      value: formatUsd(ai.totalCost),
      hint: `${formatUsd(ai.costThisMonth)} this month`,
      icon: Bot,
    },
  ];

  return (
    <section>
      <div className="mb-2 flex items-end justify-between gap-2">
        <h2 className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-200/45">Executive summary</h2>
        {mr.expiredMembers > 0 ? (
          <p className="flex items-center gap-1 text-[10px] font-semibold text-rose-300/80">
            <AlertTriangle className="h-3 w-3" aria-hidden />
            {mr.expiredMembers} expired
          </p>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-3 lg:gap-2.5">
        {cards.map((card) => (
          <CompactKpi key={card.label} {...card} />
        ))}
      </div>
    </section>
  );
}
