"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, BarChart3, TrendingUp } from "lucide-react";
import { LendingEmptyState, LendingGlassCard } from "@/components/fire-lending/FireLendingUiPrimitives";
import { useFireLending } from "@/contexts/FireLendingContext";
import { useFireTheme } from "@/contexts/FireThemeContext";

const PIE_COLORS = ["#10b981", "#84cc16", "#38bdf8", "#f59e0b", "#f43f5e", "#a78bfa"];

function tipStyle(light: boolean) {
  return {
    borderRadius: 12,
    border: light ? "1px solid rgba(16,185,129,0.25)" : "1px solid rgba(52,211,153,0.25)",
    background: light ? "rgba(255,255,255,0.96)" : "rgba(4,20,15,0.95)",
    boxShadow: "0 12px 40px rgba(0,0,0,0.18)",
    fontSize: 12,
    fontWeight: 700,
  };
}

export function FireLendingChartsInner() {
  const { monthlySeries, statusDistribution, summary } = useFireLending();
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const axis = light ? "#64748b" : "#86efac99";
  const grid = light ? "#e2e8f0" : "#064e3b66";

  return (
    <div className="grid gap-3.5 lg:grid-cols-2">
      <LendingGlassCard title="Cash Flow" subtitle="Monthly lending vs borrowing" icon={BarChart3}>
        <div className="h-60 w-full sm:h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlySeries}>
              <defs>
                <linearGradient id="lendBar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34d399" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#059669" stopOpacity={0.75} />
                </linearGradient>
                <linearGradient id="borrowBar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7dd3fc" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#0284c7" stopOpacity={0.7} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={grid} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" stroke={axis} fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke={axis} fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tipStyle(light)} cursor={{ fill: light ? "rgba(16,185,129,0.06)" : "rgba(16,185,129,0.08)" }} />
              <Legend />
              <Bar dataKey="lending" name="Lending" fill="url(#lendBar)" radius={[8, 8, 0, 0]} animationDuration={900} />
              <Bar dataKey="borrowing" name="Borrowing" fill="url(#borrowBar)" radius={[8, 8, 0, 0]} animationDuration={900} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </LendingGlassCard>

      <LendingGlassCard title="Interest & Collections" subtitle="Income and collection trend" icon={Activity}>
        <div className="h-60 w-full sm:h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlySeries}>
              <defs>
                <linearGradient id="interestFillPremium" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#84cc16" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#84cc16" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="collectFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={grid} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" stroke={axis} fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke={axis} fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tipStyle(light)} />
              <Legend />
              <Area type="monotone" dataKey="interest" name="Interest earned" stroke="#84cc16" fill="url(#interestFillPremium)" strokeWidth={2.5} animationDuration={1000} />
              <Area type="monotone" dataKey="collected" name="Collections" stroke="#f59e0b" fill="url(#collectFill)" strokeWidth={2} animationDuration={1000} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </LendingGlassCard>

      <LendingGlassCard title="Portfolio Growth" subtitle={`Score ${summary.healthScore} · repayment performance`} icon={TrendingUp}>
        <div className="h-60 w-full sm:h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlySeries}>
              <CartesianGrid stroke={grid} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" stroke={axis} fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke={axis} fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tipStyle(light)} />
              <Legend />
              <Line type="monotone" dataKey="growth" name="Portfolio growth" stroke="#10b981" strokeWidth={3} dot={{ r: 3 }} animationDuration={1100} />
              <Line type="monotone" dataKey="collected" name="Repayment performance" stroke="#38bdf8" strokeWidth={2} strokeDasharray="5 5" animationDuration={1100} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </LendingGlassCard>

      <LendingGlassCard title="Loan Status Distribution" subtitle="Active book mix" icon={BarChart3}>
        <div className="h-60 w-full sm:h-64">
          {statusDistribution.length === 0 ? (
            <LendingEmptyState title="No loans" message="Status mix appears once loans are active." />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusDistribution}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={52}
                  outerRadius={84}
                  paddingAngle={3}
                  animationDuration={900}
                >
                  {statusDistribution.map((_, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tipStyle(light)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </LendingGlassCard>
    </div>
  );
}
