"use client";

import { useMemo, useState } from "react";
import { Activity, AlertTriangle, Bot, CheckCircle2, Download, FileText, Save, Search, Shield, Timer, Users, Wallet, Zap } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AdminAiAnalyticsSnapshot, AiAnalyticsRow, AiLogRow } from "@/lib/admin/fetch-ai-analytics-snapshot";
import type { FireAiMembershipPlan } from "@/services/fire-ai-usage";

type SortKey = "requests" | "tokens" | "cost" | "lastActivity";
type LogStatusFilter = "all" | "success" | "failed" | "blocked_quota";
type PlanFilter = "all" | FireAiMembershipPlan;

const gridStroke = "rgba(148,163,184,0.12)";
const chartStroke = "#34d399";
const chartFill = "#059669";

function usd(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 4 }).format(n || 0);
}

function compact(n: number): string {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n || 0);
}

function dateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function KpiCard({ label, value, hint, icon: Icon, tone = "emerald" }: { label: string; value: string; hint?: string; icon: typeof Bot; tone?: "emerald" | "amber" | "rose" }) {
  const toneClass =
    tone === "amber" ? "text-amber-300 bg-amber-500/10" : tone === "rose" ? "text-rose-300 bg-rose-500/10" : "text-emerald-300 bg-emerald-500/10";
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-3 shadow-[0_0_0_1px_rgba(16,185,129,0.06)] backdrop-blur-xl sm:p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-200/55">{label}</p>
          <p className="mt-1 truncate font-mono text-xl font-black text-white sm:text-2xl">{value}</p>
          {hint ? <p className="mt-1 line-clamp-1 text-[11px] font-semibold text-zinc-500">{hint}</p> : null}
        </div>
        <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${toneClass}`}>
          <Icon size={17} />
        </div>
      </div>
    </div>
  );
}

function ChartCard({ title, data, metric, type = "area" }: { title: string; data: { label: string; requests: number; cost: number; tokens: number }[]; metric: "requests" | "cost" | "tokens"; type?: "area" | "bar" }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#04120d]/70 p-3 backdrop-blur-xl sm:p-4">
      <h3 className="text-xs font-black uppercase tracking-[0.16em] text-emerald-200/55">{title}</h3>
      <div className="mt-3 h-44 sm:h-56 xl:h-64">
        <ResponsiveContainer width="100%" height="100%">
          {type === "bar" ? (
            <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid stroke={gridStroke} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} width={36} />
              <Tooltip contentStyle={{ background: "#06140f", border: "1px solid rgba(255,255,255,.08)", borderRadius: 12, fontSize: 12 }} />
              <Bar dataKey={metric} fill={chartFill} radius={[8, 8, 0, 0]} />
            </BarChart>
          ) : (
            <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id={`ai-${title}-${metric}`} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor={chartStroke} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={chartStroke} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={gridStroke} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} width={36} />
              <Tooltip contentStyle={{ background: "#06140f", border: "1px solid rgba(255,255,255,.08)", borderRadius: 12, fontSize: 12 }} />
              <Area dataKey={metric} stroke={chartStroke} fill={`url(#ai-${title}-${metric})`} strokeWidth={2} />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function planBadge(plan: FireAiMembershipPlan) {
  const cls = plan === "elite" ? "border-amber-400/30 bg-amber-500/10 text-amber-200" : plan === "premium" ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-200" : "border-zinc-500/30 bg-zinc-500/10 text-zinc-300";
  return <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black uppercase ${cls}`}>{plan}</span>;
}

function UserTable({ rows }: { rows: AiAnalyticsRow[] }) {
  const [sort, setSort] = useState<SortKey>("requests");
  const sorted = useMemo(() => [...rows].sort((a, b) => {
    if (sort === "lastActivity") return (b.lastActivity ?? "").localeCompare(a.lastActivity ?? "");
    return b[sort] - a[sort];
  }), [rows, sort]);
  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#04120d]/70">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] px-4 py-3">
        <h3 className="text-xs font-black uppercase tracking-[0.16em] text-emerald-200/55">Top AI Users</h3>
        <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-bold text-emerald-100 outline-none">
          <option value="requests">Requests</option>
          <option value="tokens">Tokens</option>
          <option value="cost">Cost</option>
          <option value="lastActivity">Last activity</option>
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-xs">
          <thead className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
            <tr><th className="px-4 py-2">User</th><th>Membership</th><th className="text-right">Requests</th><th className="text-right">Tokens</th><th className="text-right">Cost</th><th className="px-4 text-right">Last Activity</th></tr>
          </thead>
          <tbody>
            {sorted.slice(0, 25).map((row) => (
              <tr key={row.id} className="border-t border-white/[0.04]">
                <td className="px-4 py-3"><p className="font-bold text-emerald-100">{row.label}</p><p className="font-mono text-[10px] text-zinc-600">{row.detail}</p></td>
                <td>{planBadge(row.membership)}</td>
                <td className="text-right font-mono text-zinc-300">{row.requests}</td>
                <td className="text-right font-mono text-zinc-300">{compact(row.tokens)}</td>
                <td className="text-right font-mono text-emerald-200">{usd(row.cost)}</td>
                <td className="px-4 text-right font-mono text-zinc-400">{dateTime(row.lastActivity)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BudgetPanel({ snapshot }: { snapshot: AdminAiAnalyticsSnapshot }) {
  const [budget, setBudget] = useState(snapshot.budget.monthlyBudgetUsd);
  const [saving, setSaving] = useState(false);
  const pct = snapshot.budget.monthlyBudgetUsd > 0 ? (snapshot.kpis.costThisMonth / snapshot.budget.monthlyBudgetUsd) * 100 : 0;
  const alertTone = pct >= 100 ? "border-rose-500/30 bg-rose-500/10 text-rose-100" : pct >= 80 ? "border-amber-500/30 bg-amber-500/10 text-amber-100" : pct >= 50 ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100" : "border-white/[0.08] bg-white/[0.04] text-emerald-100";
  async function save() {
    setSaving(true);
    try {
      await fetch("/api/admin/ai-analytics/settings", { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ monthlyBudgetUsd: budget }) });
    } finally {
      setSaving(false);
    }
  }
  return (
    <section className={`rounded-2xl border p-4 ${alertTone}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xs font-black uppercase tracking-[0.16em]">Budget Controls</h2>
          <p className="mt-1 text-sm font-semibold opacity-80">{usd(snapshot.kpis.costThisMonth)} used of {usd(snapshot.budget.monthlyBudgetUsd)} this month ({Math.round(pct)}%).</p>
        </div>
        <div className="flex gap-2">
          <input value={budget} onChange={(e) => setBudget(Number(e.target.value) || 0)} type="number" min={0} step={1} className="h-11 w-28 rounded-xl border border-white/10 bg-black/20 px-3 text-sm font-bold text-white outline-none" />
          <button onClick={() => void save()} disabled={saving} className="inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-700 px-4 text-sm font-black text-white disabled:opacity-50"><Save size={15} /> Save</button>
        </div>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/25"><div className="h-full rounded-full bg-emerald-400" style={{ width: `${Math.min(100, pct)}%` }} /></div>
      <p className="mt-2 text-xs font-semibold opacity-75">Alerts enabled at 50%, 80%, and 100% budget usage.</p>
    </section>
  );
}

function LogsTable({ logs }: { logs: AiLogRow[] }) {
  const [query, setQuery] = useState("");
  const [plan, setPlan] = useState<PlanFilter>("all");
  const [status, setStatus] = useState<LogStatusFilter>("all");
  const filtered = logs.filter((log) => {
    const q = query.trim().toLowerCase();
    if (plan !== "all" && log.membership !== plan) return false;
    if (status !== "all" && log.status !== status) return false;
    if (!q) return true;
    return log.userLabel.toLowerCase().includes(q) || log.userId.toLowerCase().includes(q) || log.aiFeature.toLowerCase().includes(q);
  });
  return (
    <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#04120d]/70">
      <div className="flex flex-col gap-2 border-b border-white/[0.06] px-4 py-3 md:flex-row md:items-center md:justify-between">
        <h2 className="text-xs font-black uppercase tracking-[0.16em] text-emerald-200/55">Latest AI Logs</h2>
        <div className="flex flex-wrap gap-2">
          <div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter user/feature" className="h-9 rounded-xl border border-white/10 bg-white/[0.04] pl-9 pr-3 text-xs font-bold text-emerald-100 outline-none" /></div>
          <select value={plan} onChange={(e) => setPlan(e.target.value as PlanFilter)} className="h-9 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-xs font-bold text-emerald-100"><option value="all">All plans</option><option value="free">Free</option><option value="premium">Premium</option><option value="elite">Elite</option></select>
          <select value={status} onChange={(e) => setStatus(e.target.value as LogStatusFilter)} className="h-9 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-xs font-bold text-emerald-100"><option value="all">All status</option><option value="success">Success</option><option value="failed">Failed</option><option value="blocked_quota">Blocked</option></select>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-xs">
          <thead className="text-[10px] font-black uppercase tracking-wider text-zinc-500"><tr><th className="px-4 py-2">User</th><th>Feature</th><th>Time</th><th>Status</th><th className="text-right">Tokens</th><th className="text-right">Cost</th><th className="px-4 text-right">Duration</th></tr></thead>
          <tbody>{filtered.slice(0, 100).map((log) => <tr key={log.id} className="border-t border-white/[0.04]"><td className="px-4 py-3"><p className="font-bold text-emerald-100">{log.userLabel}</p><p className="font-mono text-[10px] text-zinc-600">{log.userId}</p></td><td className="font-bold text-zinc-300">{log.aiFeature}</td><td className="font-mono text-zinc-400">{dateTime(log.createdAt)}</td><td className="font-bold text-zinc-300">{log.status}</td><td className="text-right font-mono text-zinc-300">{compact(log.tokens)}</td><td className="text-right font-mono text-emerald-200">{usd(log.cost)}</td><td className="px-4 text-right font-mono text-zinc-300">{log.durationMs}ms</td></tr>)}</tbody>
        </table>
      </div>
    </section>
  );
}

export function AdminAiAnalyticsClient({ snapshot }: { snapshot: AdminAiAnalyticsSnapshot }) {
  const k = snapshot.kpis;
  return (
    <div className="space-y-5 lg:space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300/70">Admin only</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-white sm:text-4xl">AI Analytics</h1>
          <p className="mt-2 max-w-3xl text-sm font-medium leading-relaxed text-zinc-400">Monitor FIRE AI usage, OpenAI cost, quota pressure, feature adoption, and system health from one responsive dashboard.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="/api/admin/ai-analytics/export/csv" className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 text-xs font-black text-emerald-100"><Download size={15} /> CSV Export</a>
          <a href="/api/admin/ai-analytics/export/pdf" className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-xs font-black text-emerald-100"><FileText size={15} /> PDF Export</a>
        </div>
      </div>

      {snapshot.loadError ? <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-bold text-amber-100">{snapshot.loadError}</div> : null}

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9">
        <KpiCard label="Total AI Requests" value={compact(k.totalRequests)} icon={Bot} />
        <KpiCard label="Active AI Users" value={compact(k.activeAiUsers)} icon={Users} />
        <KpiCard label="Requests Today" value={compact(k.requestsToday)} icon={Zap} />
        <KpiCard label="Requests Month" value={compact(k.requestsThisMonth)} icon={Activity} />
        <KpiCard label="Cost Today" value={usd(k.costToday)} icon={Wallet} />
        <KpiCard label="Cost Month" value={usd(k.costThisMonth)} icon={Wallet} tone={k.costThisMonth > snapshot.budget.monthlyBudgetUsd * 0.8 ? "amber" : "emerald"} />
        <KpiCard label="Lifetime Cost" value={usd(k.lifetimeCost)} icon={Wallet} />
        <KpiCard label="Avg Response" value={`${k.averageResponseTimeMs}ms`} icon={Timer} />
        <KpiCard label="Tokens Used" value={compact(k.totalTokensUsed)} icon={Shield} />
      </section>

      <BudgetPanel snapshot={snapshot} />

      <section className="grid gap-3 md:grid-cols-3">
        {(["free", "premium", "elite"] as FireAiMembershipPlan[]).map((p) => {
          const row = snapshot.membership[p];
          return <div key={p} className="rounded-2xl border border-white/[0.08] bg-[#04120d]/70 p-4"><div className="flex items-center justify-between">{planBadge(p)}<span className="font-mono text-xs text-zinc-500">{row.users} users</span></div><div className="mt-3 grid grid-cols-2 gap-2 text-xs"><KpiMini label="Requests" value={compact(row.requests)} /><KpiMini label="Tokens" value={compact(row.tokens)} /><KpiMini label="Cost" value={usd(row.cost)} /><KpiMini label="Avg/User" value={usd(row.averageCostPerUser)} /></div><p className="mt-3 text-xs font-semibold text-zinc-500">Remaining quota: <span className="text-emerald-200">{compact(row.remainingQuota)}</span></p></div>;
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <ChartCard title="Daily AI Requests" data={snapshot.charts.daily} metric="requests" />
        <ChartCard title="Daily OpenAI Cost" data={snapshot.charts.daily} metric="cost" />
        <ChartCard title="Daily Token Usage" data={snapshot.charts.daily} metric="tokens" type="bar" />
        <ChartCard title="Monthly AI Requests" data={snapshot.charts.monthly} metric="requests" />
        <ChartCard title="Monthly OpenAI Cost" data={snapshot.charts.monthly} metric="cost" />
        <ChartCard title="Monthly Token Usage" data={snapshot.charts.monthly} metric="tokens" type="bar" />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <UserTable rows={snapshot.topUsers} />
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/[0.08] bg-[#04120d]/70 p-4">
            <h2 className="text-xs font-black uppercase tracking-[0.16em] text-emerald-200/55">AI Health</h2>
            <div className="mt-3 grid gap-2 text-sm font-semibold text-zinc-300">
              <HealthRow label="API Status" value={snapshot.configured ? "Configured" : "Not configured"} ok={snapshot.configured} />
              <HealthRow label="OpenAI Status" value={k.failedRequests === 0 ? "Healthy" : "Errors detected"} ok={k.failedRequests === 0} />
              <HealthRow label="Error Rate" value={`${k.errorRatePct}%`} ok={k.errorRatePct < 5} />
              <HealthRow label="Streaming Success" value={`${k.streamingSuccessRatePct}%`} ok={k.streamingSuccessRatePct >= 95} />
              <HealthRow label="Failed Requests" value={String(k.failedRequests)} ok={k.failedRequests === 0} />
            </div>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-[#04120d]/70 p-4">
            <h2 className="text-xs font-black uppercase tracking-[0.16em] text-emerald-200/55">AI Feature Analytics</h2>
            <div className="mt-3 space-y-2">{snapshot.features.map((f) => <div key={f.id} className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2 text-xs"><span className="font-bold text-emerald-100">{f.label}</span><span className="font-mono text-zinc-400">{compact(f.requests)} · {usd(f.cost)}</span></div>)}</div>
          </div>
        </div>
      </section>

      <LogsTable logs={snapshot.logs} />
    </div>
  );
}

function KpiMini({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-white/[0.04] px-3 py-2"><p className="text-[10px] font-black uppercase text-zinc-500">{label}</p><p className="mt-1 font-mono font-black text-white">{value}</p></div>;
}

function HealthRow({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return <div className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.03] px-3 py-2"><span className="text-zinc-400">{label}</span><span className={`inline-flex items-center gap-1 font-black ${ok ? "text-emerald-300" : "text-amber-300"}`}>{ok ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}{value}</span></div>;
}
