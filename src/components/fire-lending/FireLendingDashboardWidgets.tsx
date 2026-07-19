"use client";

import Link from "next/link";
import {
  Bell,
  CheckCircle2,
  FileSignature,
  HandCoins,
  Landmark,
  Sparkles,
  Wallet,
} from "lucide-react";
import {
  LendingAvatar,
  LendingEmptyState,
  LendingGlassCard,
  LendingPrimaryLink,
  LendingStatusPill,
} from "@/components/fire-lending/FireLendingUiPrimitives";
import { useFireLending } from "@/contexts/FireLendingContext";
import { useFireTheme } from "@/contexts/FireThemeContext";
import { formatCompactDate, formatLendingMoney } from "@/lib/fire-lending/format";
import type { ActivityItem } from "@/lib/fire-lending/types";

const BUCKET_LABEL = {
  today: "Today",
  tomorrow: "Tomorrow",
  "3days": "3 Days",
  "7days": "7 Days",
} as const;

function activityIcon(kind: ActivityItem["kind"]) {
  switch (kind) {
    case "loan_created":
      return Landmark;
    case "agreement_signed":
      return FileSignature;
    case "payment_received":
      return Wallet;
    case "reminder_sent":
      return Bell;
    default:
      return CheckCircle2;
  }
}

export function FireLendingUpcomingPayments() {
  const { upcomingPayments } = useFireLending();
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const buckets = (["today", "tomorrow", "3days", "7days"] as const).filter((b) => upcomingPayments.some((p) => p.bucket === b));

  return (
    <LendingGlassCard title="Upcoming Payments" subtitle="Collection timeline" icon={HandCoins}>
      {upcomingPayments.length === 0 ? (
        <LendingEmptyState
          title="No upcoming payments"
          message="You're clear for the next 7 days. Create a loan or wait for the next EMI cycle."
          ctaHref="/fire-lending/new"
          ctaLabel="New Loan"
          icon={HandCoins}
        />
      ) : (
        <div className="space-y-4">
          {(buckets.length ? buckets : (["today"] as const)).map((bucket) => {
            const rows = upcomingPayments.filter((p) => p.bucket === bucket);
            if (rows.length === 0) return null;
            return (
              <div key={bucket}>
                <p className={`mb-2 text-[10px] font-black uppercase tracking-[0.16em] ${light ? "text-emerald-700" : "text-lime-300"}`}>
                  {BUCKET_LABEL[bucket]}
                </p>
                <ul className="space-y-2">
                  {rows.map((row) => (
                    <li
                      key={row.id}
                      className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition hover:-translate-y-0.5 ${
                        light ? "border-emerald-200/60 bg-white/85" : "border-emerald-400/10 bg-black/25"
                      }`}
                    >
                      <LendingAvatar name={row.partyName} size={42} />
                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-sm font-black ${light ? "text-slate-900" : "text-emerald-50"}`}>{row.partyName}</p>
                        <p className={`text-[11px] font-semibold ${light ? "text-slate-500" : "text-emerald-200/60"}`}>
                          Due {formatCompactDate(row.dueDate)}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className={`text-sm font-black tabular-nums ${light ? "text-emerald-700" : "text-lime-300"}`}>
                          {formatLendingMoney(row.amount, row.currency)}
                        </p>
                        <LendingStatusPill status={row.status} />
                      </div>
                      <Link
                        href="/fire-lending/payments/new"
                        className={`ml-1 shrink-0 rounded-lg px-2.5 py-2 text-[10px] font-black uppercase tracking-wide ${
                          light ? "bg-emerald-100 text-emerald-800" : "bg-emerald-500/20 text-lime-200"
                        }`}
                      >
                        Pay
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </LendingGlassCard>
  );
}

export function FireLendingRecentActivity() {
  const { activityFeed } = useFireLending();
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";

  return (
    <LendingGlassCard title="Recent Activity" subtitle="Live lending timeline" icon={Bell}>
      {activityFeed.length === 0 ? (
        <LendingEmptyState title="No activity yet" message="Loan events, signatures and payments will appear here." ctaHref="/fire-lending/new" ctaLabel="Create loan" />
      ) : (
        <ol className="relative space-y-0 border-l border-emerald-400/25 pl-4">
          {activityFeed.map((item) => {
            const Icon = activityIcon(item.kind);
            return (
              <li key={item.id} className="relative pb-4 last:pb-0">
                <span
                  className={`absolute -left-[1.4rem] top-0 grid h-7 w-7 place-items-center rounded-full ring-2 ${
                    light ? "bg-emerald-100 text-emerald-700 ring-white" : "bg-emerald-500/20 text-lime-300 ring-[#04140f]"
                  }`}
                >
                  <Icon size={14} />
                </span>
                <p className={`text-sm font-black ${light ? "text-slate-900" : "text-emerald-50"}`}>{item.title}</p>
                <p className={`text-[11px] font-semibold ${light ? "text-slate-600" : "text-emerald-200/65"}`}>{item.body}</p>
                <p className={`mt-0.5 text-[10px] font-bold ${light ? "text-slate-400" : "text-emerald-200/45"}`}>{formatCompactDate(item.at)}</p>
              </li>
            );
          })}
        </ol>
      )}
    </LendingGlassCard>
  );
}

export function FireLendingTopBorrowers() {
  const { topBorrowers } = useFireLending();
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";

  return (
    <LendingGlassCard title="Top Borrowers" subtitle="Trust, outstanding & performance" icon={HandCoins} elite>
      {topBorrowers.length === 0 ? (
        <LendingEmptyState title="No borrowers yet" message="Lend to a verified peer to populate this leaderboard." ctaHref="/fire-lending/new" ctaLabel="Invite borrower" />
      ) : (
        <ul className="space-y-2">
          {topBorrowers.map((b) => (
            <li
              key={b.partyId}
              className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${
                light ? "border-amber-200/50 bg-white/80" : "border-amber-400/15 bg-black/20"
              }`}
            >
              <LendingAvatar name={b.name} />
              <div className="min-w-0 flex-1">
                <p className={`truncate text-sm font-black ${light ? "text-slate-900" : "text-white"}`}>{b.name}</p>
                <p className={`text-[11px] font-semibold ${light ? "text-slate-500" : "text-emerald-200/60"}`}>
                  Trust {b.trustScore} · Perf {b.performancePct}%
                  {b.nextDue ? ` · Next ${formatCompactDate(b.nextDue)}` : ""}
                </p>
              </div>
              <p className={`shrink-0 text-sm font-black tabular-nums ${light ? "text-emerald-700" : "text-lime-300"}`}>
                {formatLendingMoney(b.outstanding)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </LendingGlassCard>
  );
}

export function FireLendingAgreementCenter() {
  const { agreementCenter } = useFireLending();
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";

  const tiles = [
    { label: "Pending Signature", value: agreementCenter.pendingSignature, href: "/fire-lending/agreements" },
    { label: "Waiting Approval", value: agreementCenter.waitingApproval, href: "/fire-lending/requests" },
    { label: "Active Agreements", value: agreementCenter.active, href: "/fire-lending/agreements" },
    { label: "Completed", value: agreementCenter.completed, href: "/fire-lending/agreements" },
    { label: "Expired / Void", value: agreementCenter.expired, href: "/fire-lending/agreements" },
  ];

  return (
    <LendingGlassCard
      title="Agreement Center"
      subtitle="Digital contracts at a glance"
      icon={FileSignature}
      headerRight={<LendingPrimaryLink href="/fire-lending/agreements">Open</LendingPrimaryLink>}
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map((tile) => (
          <Link
            key={tile.label}
            href={tile.href}
            className={`rounded-xl border px-3 py-3 transition hover:-translate-y-0.5 ${
              light ? "border-emerald-200/70 bg-white/85" : "border-emerald-400/15 bg-black/25"
            }`}
          >
            <p className={`text-[9px] font-black uppercase tracking-wider ${light ? "text-slate-500" : "text-emerald-200/55"}`}>{tile.label}</p>
            <p className={`mt-1 text-2xl font-black tabular-nums ${light ? "text-slate-900" : "text-white"}`}>{tile.value}</p>
          </Link>
        ))}
      </div>
    </LendingGlassCard>
  );
}

export function FireLendingAiPanel() {
  const { insights, loading } = useFireLending();
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const greeting = "Good day";

  return (
    <LendingGlassCard title="AI Insights" subtitle={`${greeting} · Portfolio intelligence`} icon={Sparkles} elite>
      {loading ? (
        <div className="space-y-2">
          <div className="h-16 animate-pulse rounded-xl bg-amber-500/10" />
          <div className="h-16 animate-pulse rounded-xl bg-amber-500/10" />
        </div>
      ) : insights.length === 0 ? (
        <LendingEmptyState title="AI is warming up" message="Insights appear once you have active loans and payments." />
      ) : (
        <ul className="space-y-2">
          {insights.map((insight) => (
            <li
              key={insight.id}
              className={`rounded-xl border px-3 py-2.5 ${light ? "border-amber-200/50 bg-white/85" : "border-amber-400/15 bg-black/25"}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className={`text-sm font-black ${light ? "text-slate-900" : "text-emerald-50"}`}>{insight.title}</p>
                  <p className={`mt-0.5 text-[11px] font-semibold ${light ? "text-slate-600" : "text-emerald-200/65"}`}>{insight.body}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <LendingStatusPill status={insight.severity} />
                  <span
                    className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${
                      light ? "bg-sky-100 text-sky-800" : "bg-sky-500/20 text-sky-200"
                    }`}
                  >
                    {insight.confidence}% conf
                  </span>
                </div>
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
  );
}
