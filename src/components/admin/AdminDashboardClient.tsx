"use client";

import { format, isBefore, parseISO, subDays } from "date-fns";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Download,
  Mail,
  RefreshCw,
  Server,
  Shield,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
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
import type { AdminDailyPoint, AdminSignupRow, AdminSnapshot } from "@/lib/admin/fetch-admin-snapshot";

const chartStroke = "#34d399";
const chartMuted = "#64748b";
const gridStroke = "rgba(148,163,184,0.12)";

function formatNpr(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "NPR", maximumFractionDigits: 0 }).format(n);
}

function StatTile({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: typeof Users;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.05] to-transparent p-4 shadow-[0_0_0_1px_rgba(16,185,129,0.08)] backdrop-blur-xl sm:p-5">
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-emerald-500/10 blur-2xl transition-opacity group-hover:opacity-90" />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-200/55">{label}</p>
          <p className="mt-2 font-mono text-2xl font-black tabular-nums tracking-tight text-white sm:text-3xl">{value}</p>
          {hint ? <p className="mt-1.5 text-xs font-medium text-zinc-500">{hint}</p> : null}
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-emerald-300/90">
          <Icon className="h-5 w-5" aria-hidden />
        </div>
      </div>
    </div>
  );
}

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
  const chartData = data.map((d) => ({ ...d, label: d.date.slice(5) }));
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#04120d]/70 p-4 backdrop-blur-xl sm:p-5">
      <h3 className="text-xs font-black uppercase tracking-[0.14em] text-emerald-200/60">{title}</h3>
      <div className="mt-4 h-48 w-full min-w-0 sm:h-56">
        <ResponsiveContainer width="100%" height="100%">
          {area ? (
            <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="fillAdmin" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34d399" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={gridStroke} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: chartMuted, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: chartMuted, fontSize: 10 }} axisLine={false} tickLine={false} width={36} />
              <Tooltip
                contentStyle={{
                  background: "#0a1a14",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 12,
                  fontSize: 12,
                }}
                labelStyle={{ color: "#a7f3d0" }}
                formatter={(v: number) => [`${v}${suffix ?? ""}`, ""]}
              />
              <Area type="monotone" dataKey="value" stroke={chartStroke} fill="url(#fillAdmin)" strokeWidth={2} />
            </AreaChart>
          ) : (
            <LineChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid stroke={gridStroke} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: chartMuted, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: chartMuted, fontSize: 10 }} axisLine={false} tickLine={false} width={36} />
              <Tooltip
                contentStyle={{
                  background: "#0a1a14",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 12,
                  fontSize: 12,
                }}
                labelStyle={{ color: "#a7f3d0" }}
                formatter={(v: number) => [`${v}${suffix ?? ""}`, ""]}
              />
              <Line type="monotone" dataKey="value" stroke="#5eead4" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

type PlanFilter = "all" | "free" | "premium" | "elite";
type RangePreset = "all" | "7d" | "30d" | "90d";

export function AdminDashboardClient({ snapshot }: { snapshot: AdminSnapshot }) {
  const [search, setSearch] = useState("");
  const [plan, setPlan] = useState<PlanFilter>("all");
  const [range, setRange] = useState<RangePreset>("all");

  const filteredSignups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const now = new Date();
    const cut =
      range === "7d"
        ? subDays(now, 7)
        : range === "30d"
          ? subDays(now, 30)
          : range === "90d"
            ? subDays(now, 90)
            : null;

    return snapshot.recentSignups.filter((row) => {
      if (plan !== "all" && row.planType !== plan) return false;
      if (cut && row.joinedAt) {
        const j = parseISO(row.joinedAt);
        if (!Number.isNaN(j.getTime()) && isBefore(j, cut)) return false;
      }
      if (!q) return true;
      return row.email.toLowerCase().includes(q) || row.name.toLowerCase().includes(q);
    });
  }, [snapshot.recentSignups, search, plan, range]);

  const overview = snapshot.metrics;
  const re = snapshot.reminderEngine;

  return (
    <div className="space-y-8 sm:space-y-10">
      {!snapshot.configured ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-100">
          Supabase env is not configured. Set{" "}
          <code className="rounded bg-black/30 px-1 py-0.5 text-xs">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code className="rounded bg-black/30 px-1 py-0.5 text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>.
        </div>
      ) : null}

      {snapshot.loadError ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-100">
          {snapshot.loadError}{" "}
          {!snapshot.serviceRoleConfigured ? (
            <span className="block pt-2 text-xs font-medium text-rose-200/80">
              Add <code className="rounded bg-black/30 px-1">SUPABASE_SERVICE_ROLE_KEY</code> on the server for full
              auth-backed metrics and exports.
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">Operations overview</h1>
          <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-zinc-400">
            Live aggregates from Supabase Auth, profiles, reminders, revenue ledger, and delivery telemetry. Access is
            restricted to accounts in <span className="text-emerald-200/90">admin_users</span>.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href="/api/admin/export/users"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-emerald-100 transition hover:bg-white/[0.07]"
          >
            <Download className="h-3.5 w-3.5" aria-hidden />
            Users CSV
          </a>
          <a
            href="/api/admin/export/reminders"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-emerald-100 transition hover:bg-white/[0.07]"
          >
            <Download className="h-3.5 w-3.5" aria-hidden />
            Reminders CSV
          </a>
          <a
            href="/api/admin/export/revenue"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-emerald-100 transition hover:bg-white/[0.07]"
          >
            <Download className="h-3.5 w-3.5" aria-hidden />
            Revenue CSV
          </a>
        </div>
      </div>

      <section>
        <h2 className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-emerald-200/50">Executive cards</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile label="Users" value={String(overview.totalUsers)} hint={`+${overview.newUsersToday} today`} icon={Users} />
          <StatTile label="Revenue (NPR)" value={formatNpr(overview.totalRevenueNpr)} hint="Sum of revenue_events" icon={Wallet} />
          <StatTile label="Premium members" value={String(overview.premiumUsers)} hint="Profiles: premium + elite" icon={Sparkles} />
          <StatTile
            label="Reminder activity"
            value={String(overview.reminderEmailsSent)}
            hint={`${re.emailsSentThisMonth} sends this month`}
            icon={Activity}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-emerald-200/50">Core metrics</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <StatTile label="Total users" value={String(overview.totalUsers)} icon={Users} />
          <StatTile label="New users today" value={String(overview.newUsersToday)} icon={ArrowUpRight} />
          <StatTile label="Active (7d)" value={String(overview.activeUsers7d)} hint="Auth last_sign_in_at" icon={RefreshCw} />
          <StatTile label="Premium users" value={String(overview.premiumUsers)} icon={Sparkles} />
          <StatTile label="Total revenue" value={formatNpr(overview.totalRevenueNpr)} icon={Wallet} />
          <StatTile label="Reminder emails sent" value={String(overview.reminderEmailsSent)} icon={Mail} />
          <StatTile label="Reminders created" value={String(overview.totalRemindersCreated)} icon={Activity} />
          <StatTile label="Upcoming reminders" value={String(overview.upcomingReminders)} icon={ArrowUpRight} />
          <StatTile label="Overdue reminders" value={String(overview.overdueReminders)} icon={ArrowDownRight} />
        </div>
      </section>

      <section className="rounded-2xl border border-white/[0.08] bg-[#04120d]/60 p-4 backdrop-blur-xl sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xs font-black uppercase tracking-[0.18em] text-emerald-200/55">Reminder engine</h2>
          <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-200/90">
            Resend + cron
          </span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <StatTile label="Emails today" value={String(re.emailsSentToday)} icon={Mail} />
          <StatTile label="Emails this month" value={String(re.emailsSentThisMonth)} icon={Mail} />
          <StatTile label="Failed emails" value={String(re.failedEmails)} hint="reminder_logs" icon={ArrowDownRight} />
          <StatTile label="Pending reminders" value={String(re.pendingReminders)} icon={Activity} />
          <StatTile label="Upcoming scheduled" value={String(re.upcomingScheduled)} icon={ArrowUpRight} />
        </div>
      </section>

      <section className="rounded-2xl border border-white/[0.08] bg-[#04120d]/50 p-4 backdrop-blur-xl sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Server className="h-4 w-4 text-emerald-400/80" aria-hidden />
          <h2 className="text-xs font-black uppercase tracking-[0.18em] text-emerald-200/55">System health</h2>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Supabase</p>
            <p className={`mt-2 text-sm font-bold ${snapshot.systemHealth.supabaseOk ? "text-emerald-300" : "text-rose-300"}`}>
              {snapshot.systemHealth.supabaseOk ? "Operational" : "Degraded"}
            </p>
            <p className="mt-1 text-xs text-zinc-500">{snapshot.systemHealth.supabaseMessage}</p>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Resend</p>
            <p
              className={`mt-2 text-sm font-bold ${
                snapshot.systemHealth.resendOk === null
                  ? "text-zinc-400"
                  : snapshot.systemHealth.resendOk
                    ? "text-emerald-300"
                    : "text-rose-300"
              }`}
            >
              {snapshot.systemHealth.resendOk === null
                ? "Unknown"
                : snapshot.systemHealth.resendOk
                  ? "Reachable"
                  : "Check key"}
            </p>
            <p className="mt-1 text-xs text-zinc-500">{snapshot.systemHealth.resendMessage}</p>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Last cron</p>
            <p className="mt-2 text-sm font-bold text-white">
              {snapshot.systemHealth.lastCronAt
                ? format(parseISO(snapshot.systemHealth.lastCronAt), "MMM d, HH:mm")
                : "—"}
            </p>
            <p className="mt-1 text-xs text-zinc-500">{snapshot.systemHealth.lastCronStatus ?? "No runs recorded"}</p>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Deployment</p>
            <p className="mt-2 font-mono text-xs font-bold text-emerald-200/90">
              {snapshot.systemHealth.lastDeploymentSha
                ? snapshot.systemHealth.lastDeploymentSha.slice(0, 7)
                : "local / unset"}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {snapshot.systemHealth.lastDeploymentAt
                ? format(parseISO(snapshot.systemHealth.lastDeploymentAt), "MMM d, yyyy HH:mm")
                : "Set on Vercel builds (VERCEL_GIT_COMMIT_SHA)"}
            </p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-emerald-200/50">Analytics (30 days)</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <MiniChart title="User growth (cumulative signups)" data={snapshot.charts.userGrowth30d} area />
          <MiniChart title="Reminder activity (email sends / day)" data={snapshot.charts.reminderActivity30d} />
          <MiniChart title="Revenue trend (NPR / day)" data={snapshot.charts.revenueTrend30d} area />
          <MiniChart title="Premium conversion rate (% of users to date)" data={snapshot.charts.premiumConversion30d} suffix="%" />
        </div>
      </section>

      <section className="rounded-2xl border border-white/[0.08] bg-[#04120d]/60 p-4 backdrop-blur-xl sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-emerald-400/80" aria-hidden />
            <h2 className="text-xs font-black uppercase tracking-[0.18em] text-emerald-200/55">Recent signups</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or email"
              className="min-w-[12rem] flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none ring-emerald-500/30 placeholder:text-zinc-600 focus:ring-2 sm:max-w-xs"
            />
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value as PlanFilter)}
              className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs font-bold text-emerald-100"
            >
              <option value="all">All plans</option>
              <option value="free">Free</option>
              <option value="premium">Premium</option>
              <option value="elite">Elite</option>
            </select>
            <select
              value={range}
              onChange={(e) => setRange(e.target.value as RangePreset)}
              className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs font-bold text-emerald-100"
            >
              <option value="all">All dates</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto rounded-xl border border-white/[0.06]">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] bg-black/25 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Join date</th>
                <th className="px-4 py-3">Plan</th>
              </tr>
            </thead>
            <tbody>
              {filteredSignups.map((row: AdminSignupRow) => (
                <tr key={row.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                  <td className="px-4 py-3 font-semibold text-white">{row.name}</td>
                  <td className="px-4 py-3 text-zinc-400">{row.email}</td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-300">
                    {row.joinedAt ? format(parseISO(row.joinedAt), "MMM d, yyyy HH:mm") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${
                        row.planType === "free"
                          ? "border border-zinc-600/50 bg-zinc-800/60 text-zinc-300"
                          : "border border-emerald-500/30 bg-emerald-500/15 text-emerald-200"
                      }`}
                    >
                      {row.planType}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredSignups.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-zinc-500">No rows match your filters.</p>
          ) : null}
        </div>
        <p className="mt-3 text-xs text-zinc-500">
          Showing up to 200 most recent accounts from Auth. Narrow with search and filters.
        </p>
      </section>

      <p className="text-center text-xs text-zinc-600">
        Secured with Supabase session cookies.{" "}
        <Link href="/hub" className="font-semibold text-emerald-400/90 underline-offset-2 hover:underline">
          Return to hub
        </Link>
      </p>
    </div>
  );
}
