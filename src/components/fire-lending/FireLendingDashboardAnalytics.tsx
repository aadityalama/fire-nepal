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
import { Activity, BarChart3 } from "lucide-react";
import { LendingGlassCard } from "@/components/fire-lending/FireLendingUiPrimitives";
import { useFireLending } from "@/contexts/FireLendingContext";
import { useFireTheme } from "@/contexts/FireThemeContext";

const PIE_COLORS = ["#10b981", "#84cc16", "#f59e0b", "#f43f5e", "#38bdf8", "#a78bfa"];

export function FireLendingDashboardAnalytics() {
  const { monthlySeries, statusDistribution, summary } = useFireLending();
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const axis = light ? "#64748b" : "#86efac99";
  const grid = light ? "#e2e8f0" : "#064e3b66";

  return (
    <div className="grid gap-3.5 lg:grid-cols-2">
      <LendingGlassCard title="Cash Flow & Lending" subtitle="Monthly lending vs borrowing" icon={BarChart3}>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlySeries}>
              <CartesianGrid stroke={grid} strokeDasharray="3 3" />
              <XAxis dataKey="month" stroke={axis} fontSize={11} />
              <YAxis stroke={axis} fontSize={11} />
              <Tooltip />
              <Legend />
              <Bar dataKey="lending" name="Lending" fill="#10b981" radius={[6, 6, 0, 0]} />
              <Bar dataKey="borrowing" name="Borrowing" fill="#38bdf8" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </LendingGlassCard>

      <LendingGlassCard title="Interest & Collections" subtitle="Income and collection trend" icon={Activity}>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlySeries}>
              <defs>
                <linearGradient id="interestFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#84cc16" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#84cc16" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={grid} strokeDasharray="3 3" />
              <XAxis dataKey="month" stroke={axis} fontSize={11} />
              <YAxis stroke={axis} fontSize={11} />
              <Tooltip />
              <Area type="monotone" dataKey="interest" name="Interest" stroke="#84cc16" fill="url(#interestFill)" />
              <Line type="monotone" dataKey="collected" name="Collected" stroke="#f59e0b" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </LendingGlassCard>

      <LendingGlassCard title="Portfolio Health" subtitle={`Score ${summary.healthScore} · Collection ${summary.collectionRate}%`} icon={Activity}>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlySeries}>
              <CartesianGrid stroke={grid} strokeDasharray="3 3" />
              <XAxis dataKey="month" stroke={axis} fontSize={11} />
              <YAxis stroke={axis} fontSize={11} />
              <Tooltip />
              <Line type="monotone" dataKey="collected" name="Repayment performance" stroke="#10b981" strokeWidth={2.5} />
              <Line type="monotone" dataKey="lending" name="Lending volume" stroke="#a78bfa" strokeWidth={2} strokeDasharray="4 4" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </LendingGlassCard>

      <LendingGlassCard title="Loan Status Distribution" subtitle="Active book mix" icon={BarChart3}>
        <div className="h-56 w-full">
          {statusDistribution.length === 0 ? (
            <p className={`grid h-full place-items-center text-sm font-semibold ${light ? "text-slate-500" : "text-emerald-200/60"}`}>No loans yet</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusDistribution} dataKey="value" nameKey="name" innerRadius={48} outerRadius={78} paddingAngle={3}>
                  {statusDistribution.map((_, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </LendingGlassCard>
    </div>
  );
}
