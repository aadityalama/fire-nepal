"use client";

import {
  Activity,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  FileSignature,
  HandCoins,
  QrCode,
  Sparkles,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { LendingFloatingActionButton } from "@/components/fire-lending/FireLendingFloatingActionButton";
import { FireLendingDashboardAnalytics } from "@/components/fire-lending/FireLendingDashboardAnalytics";
import { LendingCompactHeader, LendingMobileScreen } from "@/components/fire-lending/FireLendingMobileScreens";
import {
  LendingEmptyState,
  LendingGlassCard,
  LendingKpiCard,
  LendingQuickAction,
  LendingStatusPill,
} from "@/components/fire-lending/FireLendingUiPrimitives";
import { useFireLending } from "@/contexts/FireLendingContext";
import { useFireTheme } from "@/contexts/FireThemeContext";
import { formatLendingMoney } from "@/lib/fire-lending/format";

const KPI_ICONS = {
  lent: ArrowUpRight,
  borrowed: ArrowDownLeft,
  outstanding: Wallet,
  interest: HandCoins,
  collection: Activity,
  due: AlertTriangle,
  overdue: AlertTriangle,
  trust: BadgeCheck,
} as const;

export function FireLendingDashboard() {
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const { summary, kpis, insights, store, loading, partyById } = useFireLending();

  return (
    <LendingMobileScreen>
      <LendingCompactHeader
        eyebrow="FIRE Nepal Elite"
        title="Loan Portfolio"
        subtitle="Borrow, lend, digital agreements, EMI tracking & AI risk analysis."
      />

      <LendingGlassCard
        title="Portfolio Health"
        subtitle={loading ? "Loading…" : summary.aiSummary}
        icon={Sparkles}
        elite
        headerRight={
          <div className="text-right">
            <p className={`text-[10px] font-black uppercase tracking-wider ${light ? "text-amber-700" : "text-amber-300"}`}>Health Score</p>
            <p className={`text-2xl font-black tabular-nums ${light ? "text-slate-900" : "text-white"}`}>
              {loading ? "…" : summary.healthScore}
            </p>
          </div>
        }
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { label: "Net Outstanding", value: formatLendingMoney(summary.netOutstanding) },
            { label: "Active Loans", value: String(summary.totalActiveLoans) },
            { label: "Total Lent", value: formatLendingMoney(summary.totalLent) },
            { label: "Total Borrowed", value: formatLendingMoney(summary.totalBorrowed) },
          ].map((item) => (
            <div
              key={item.label}
              className={`rounded-xl border px-3 py-2.5 ${
                light ? "border-amber-200/60 bg-white/70" : "border-amber-400/15 bg-black/20"
              }`}
            >
              <p className={`text-[9px] font-black uppercase tracking-wider ${light ? "text-slate-500" : "text-emerald-200/60"}`}>{item.label}</p>
              <p className={`mt-1 truncate text-sm font-black tabular-nums ${light ? "text-slate-900" : "text-emerald-50"}`}>
                {loading ? "…" : item.value}
              </p>
            </div>
          ))}
        </div>
      </LendingGlassCard>

      <section aria-label="Lending KPIs" className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <LendingKpiCard
            key={kpi.key}
            label={kpi.label}
            value={loading ? "…" : kpi.value}
            icon={KPI_ICONS[kpi.key as keyof typeof KPI_ICONS] ?? Wallet}
            changePct={kpi.changePct}
            sparkline={kpi.sparkline}
            accent={kpi.accent}
            href={kpi.key === "trust" ? "/fire-lending/trust-score" : kpi.key === "overdue" || kpi.key === "due" ? "/fire-lending/installments" : "/fire-lending/analytics"}
          />
        ))}
      </section>

      <LendingGlassCard title="Quick Actions" icon={HandCoins} className="!p-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <LendingQuickAction label="New Loan" href="/fire-lending/new" icon={HandCoins} />
          <LendingQuickAction label="Request Loan" href="/fire-lending/new?mode=request" icon={ArrowDownLeft} />
          <LendingQuickAction label="Create Agreement" href="/fire-lending/new" icon={FileSignature} />
          <LendingQuickAction label="QR Loan" href="/fire-lending/new?method=qr" icon={QrCode} />
          <LendingQuickAction label="Record Payment" href="/fire-lending/payments/new" icon={Wallet} />
          <LendingQuickAction label="View Analytics" href="/fire-lending/analytics" icon={BarChart3} />
        </div>
      </LendingGlassCard>

      <LendingGlassCard title="AI Insights" subtitle="Risk, collections & next actions" icon={Sparkles} elite>
        {insights.length === 0 ? (
          <LendingEmptyState message="No insights yet." />
        ) : (
          <ul className="space-y-2">
            {insights.map((insight) => (
              <li
                key={insight.id}
                className={`rounded-xl border px-3 py-2.5 ${
                  light ? "border-emerald-200/60 bg-white/80" : "border-emerald-400/10 bg-black/20"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className={`text-sm font-black ${light ? "text-slate-900" : "text-emerald-50"}`}>{insight.title}</p>
                    <p className={`mt-0.5 text-[11px] font-semibold ${light ? "text-slate-600" : "text-emerald-200/65"}`}>{insight.body}</p>
                  </div>
                  <LendingStatusPill status={insight.severity} />
                </div>
                {insight.href && insight.actionLabel ? (
                  <Link href={insight.href} className={`mt-2 inline-block text-xs font-black ${light ? "text-emerald-700" : "text-lime-300"}`}>
                    {insight.actionLabel} →
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </LendingGlassCard>

      <FireLendingDashboardAnalytics />

      <LendingGlassCard title="Recent Loans" icon={HandCoins} headerRight={<Link href="/fire-lending/loans" className={`text-xs font-black ${light ? "text-emerald-700" : "text-lime-300"}`}>View all</Link>}>
        {store.loans.length === 0 ? (
          <LendingEmptyState message="No loans yet. Create your first peer loan." />
        ) : (
          <ul className="space-y-1.5">
            {store.loans.slice(0, 5).map((loan) => {
              const party = partyById(loan.counterpartyId);
              return (
                <li key={loan.id}>
                  <Link
                    href={`/fire-lending/loans/${loan.id}`}
                    className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 transition hover:scale-[1.01] ${
                      light ? "border-emerald-200/60 bg-white/80" : "border-emerald-400/10 bg-black/20"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className={`truncate text-sm font-bold ${light ? "text-slate-900" : "text-emerald-50"}`}>
                        {loan.role === "lender" ? "Lent to" : "Borrowed from"} {party?.name ?? "Counterparty"}
                      </p>
                      <p className={`text-[11px] font-semibold ${light ? "text-slate-500" : "text-emerald-200/60"}`}>
                        {loan.agreementNumber} · {loan.purpose}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={`text-sm font-black tabular-nums ${light ? "text-emerald-700" : "text-lime-300"}`}>
                        {formatLendingMoney(loan.outstanding, loan.currency)}
                      </p>
                      <LendingStatusPill status={loan.status} />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </LendingGlassCard>

      <LendingFloatingActionButton href="/fire-lending/new" label="New loan" />
    </LendingMobileScreen>
  );
}
