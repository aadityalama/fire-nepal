"use client";

import Link from "next/link";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AdminDailyPoint, AdminSnapshot } from "@/lib/admin/fetch-admin-snapshot";
import { EmptyState } from "@/components/admin/EmptyState";

const chartStroke = "#34d399";
const chartMuted = "#64748b";
const gridStroke = "rgba(148,163,184,0.12)";

function MiniChart({
  title,
  data,
  suffix,
  area,
}: {
  title: string;
  data: AdminDailyPoint[];
  suffix?: string;
  area?: boolean;
}) {
  if (!data.length || data.every((d) => d.value === 0)) {
    return (
      <div className="rounded-xl border border-white/[0.06] p-3">
        <h3 className="text-[10px] font-black uppercase tracking-[0.12em] text-emerald-200/50">{title}</h3>
        <div className="mt-2">
          <EmptyState message="No activity available." className="py-6" />
        </div>
      </div>
    );
  }

  const chartData = data.map((d) => ({ ...d, label: d.date.slice(5) }));
  return (
    <div className="rounded-xl border border-white/[0.06] bg-black/15 p-3">
      <h3 className="text-[10px] font-black uppercase tracking-[0.12em] text-emerald-200/50">{title}</h3>
      <div className="mt-2 h-36 w-full min-w-0 sm:h-40">
        <ResponsiveContainer width="100%" height="100%">
          {area ? (
            <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id={`fill-${title}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34d399" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={gridStroke} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: chartMuted, fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: chartMuted, fontSize: 9 }} axisLine={false} tickLine={false} width={32} />
              <Tooltip
                contentStyle={{
                  background: "#0a1a14",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 10,
                  fontSize: 11,
                }}
                labelStyle={{ color: "#a7f3d0" }}
                formatter={(v: number) => [`${v}${suffix ?? ""}`, ""]}
              />
              <Area type="monotone" dataKey="value" stroke={chartStroke} fill={`url(#fill-${title})`} strokeWidth={2} />
            </AreaChart>
          ) : (
            <LineChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid stroke={gridStroke} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: chartMuted, fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: chartMuted, fontSize: 9 }} axisLine={false} tickLine={false} width={32} />
              <Tooltip
                contentStyle={{
                  background: "#0a1a14",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 10,
                  fontSize: 11,
                }}
                labelStyle={{ color: "#a7f3d0" }}
                formatter={(v: number) => [`${v}${suffix ?? ""}`, ""]}
              />
              <Line type="monotone" dataKey="value" stroke="#5eead4" strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function formatNpr(n: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "NPR", maximumFractionDigits: 0 }).format(n || 0);
}

export function MembershipAnalyticsPanel({ snapshot }: { snapshot: AdminSnapshot }) {
  const m = snapshot.metrics;
  const mr = snapshot.membershipRenewal;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <MetricChip label="Active" value={String(m.activeMembersCount)} />
        <MetricChip label="Suspended" value={String(m.suspendedMembersCount)} />
        <MetricChip label="Archived" value={String(m.archivedMembersCount)} />
        <MetricChip label="Expired" value={String(mr.kpi.expiredMembers)} />
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <QueueChip
          label="Expiring ≤7d"
          value={mr.queue.expiringIn7Days}
          href="/admin/members?filter=expiring_soon"
          tone="amber"
        />
        <QueueChip
          label="Expiring 8–30d"
          value={mr.queue.expiringIn30DaysExcluding7}
          href="/admin/members?filter=expiring_in_30"
          tone="emerald"
        />
        <QueueChip
          label="Already expired"
          value={mr.queue.alreadyExpired}
          href="/admin/members?filter=expired"
          tone="rose"
        />
      </div>
      <p className="text-[11px] text-zinc-500">
        Full roster, CRM, and filters live on{" "}
        <Link href="/admin/members" className="font-bold text-emerald-400 hover:underline">
          Members
        </Link>
        .
      </p>
    </div>
  );
}

export function RevenueAnalyticsPanel({ snapshot }: { snapshot: AdminSnapshot }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <MetricChip label="Total revenue" value={formatNpr(snapshot.metrics.totalRevenueNpr)} />
        <MetricChip
          label="Premium share"
          value={`${snapshot.metrics.totalUsers > 0 ? Math.round((snapshot.metrics.premiumUsers / snapshot.metrics.totalUsers) * 100) : 0}%`}
        />
      </div>
      <div className="grid gap-2 lg:grid-cols-2">
        <MiniChart title="Revenue trend (30d)" data={snapshot.charts.revenueTrend30d} area />
        <MiniChart title="Premium conversion %" data={snapshot.charts.premiumConversion30d} suffix="%" />
      </div>
    </div>
  );
}

export function AiAnalyticsPanel({ snapshot }: { snapshot: AdminSnapshot }) {
  const ai = snapshot.aiAnalytics;
  const hasUsage = ai.totalCost > 0 || ai.tokensThisMonth > 0 || ai.mostActiveUsers.length > 0;

  if (!hasUsage) {
    return <EmptyState message="No activity available." />;
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <MetricChip label="Cost (month)" value={`$${ai.costThisMonth.toFixed(2)}`} />
        <MetricChip label="Tokens (month)" value={String(ai.tokensThisMonth)} />
        <MetricChip label="Avg response" value={`${ai.averageResponseTimeMs}ms`} />
        <MetricChip label="Cost today" value={`$${ai.costToday.toFixed(2)}`} />
      </div>
      <p className="text-[11px] text-zinc-500">
        Detailed tables and exports are on{" "}
        <Link href="/admin/ai-analytics" className="font-bold text-emerald-400 hover:underline">
          AI Analytics
        </Link>
        .
      </p>
    </div>
  );
}

export function ReminderActivityPanel({ snapshot }: { snapshot: AdminSnapshot }) {
  const re = snapshot.reminderEngine;
  const mrr = snapshot.membershipRenewalReminders;
  const hasActivity =
    re.emailsSentToday > 0 ||
    re.emailsSentThisMonth > 0 ||
    mrr.analytics.reminderEmailsSent30d > 0 ||
    mrr.recentSentToday.length > 0;

  if (!hasActivity) {
    return <EmptyState message="No activity available." />;
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <MetricChip label="Emails today" value={String(re.emailsSentToday)} />
        <MetricChip label="This month" value={String(re.emailsSentThisMonth)} />
        <MetricChip label="Failed" value={String(re.failedEmails)} />
        <MetricChip label="Pending" value={String(re.pendingReminders)} />
      </div>
      <div className="grid gap-2 lg:grid-cols-2">
        <MiniChart title="User growth (30d)" data={snapshot.charts.userGrowth30d} area />
        <MiniChart title="Reminder sends / day" data={snapshot.charts.reminderActivity30d} />
      </div>
      <p className="text-[11px] text-zinc-500">
        Manage renewals via{" "}
        <Link href="/admin/members?filter=expiring_soon" className="font-bold text-emerald-400 hover:underline">
          Reminder Center
        </Link>
        .
      </p>
    </div>
  );
}

export function ExportCenterPanel() {
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      <ExportLink href="/api/admin/export/users" label="Users CSV" />
      <ExportLink href="/api/admin/export/reminders" label="Reminders CSV" />
      <ExportLink href="/api/admin/export/revenue" label="Revenue CSV" />
    </div>
  );
}

function MetricChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-black/20 px-2.5 py-2">
      <p className="text-[9px] font-black uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-0.5 font-mono text-sm font-black tabular-nums text-white">{value}</p>
    </div>
  );
}

function QueueChip({
  label,
  value,
  href,
  tone,
}: {
  label: string;
  value: number;
  href: string;
  tone: "amber" | "emerald" | "rose";
}) {
  const toneClass =
    tone === "amber"
      ? "border-amber-500/25 bg-amber-500/10"
      : tone === "rose"
        ? "border-rose-500/25 bg-rose-500/10"
        : "border-emerald-500/20 bg-emerald-500/10";
  return (
    <Link href={href} className={`rounded-lg border px-2.5 py-2 transition hover:brightness-110 ${toneClass}`}>
      <p className="text-[9px] font-black uppercase tracking-wider text-zinc-400">{label}</p>
      <p className="mt-0.5 font-mono text-lg font-black text-white">{value}</p>
    </Link>
  );
}

function ExportLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 text-center text-xs font-bold text-emerald-100 transition hover:border-emerald-500/30 hover:bg-emerald-500/10"
    >
      {label}
    </a>
  );
}
