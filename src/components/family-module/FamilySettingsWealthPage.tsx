"use client";

import Link from "next/link";
import { DashboardSectionHeader } from "@/components/DashboardSectionHeader";
import { WealthDashboardShell } from "@/components/portfolio/WealthDashboardShell";
import { useFireTheme } from "@/contexts/FireThemeContext";

const PLACEHOLDER_ROWS = [
  { label: "Default child profile", value: "Arya (demo)" },
  { label: "Shared calendar visibility", value: "Parents + nanny" },
  { label: "AI insight sensitivity", value: "Balanced" },
  { label: "Emergency SMS", value: "Off (demo)" },
];

export function FamilySettingsWealthPage() {
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";

  return (
    <WealthDashboardShell
      brand={{ tagline: "Family settings", iconGradient: "from-emerald-400 to-lime-400" }}
      footerNote="Family Settings — local preferences stub. Persist to your account API when available."
    >
      <div className="wealth-dash-flow flex flex-col gap-5 lg:gap-6">
        <DashboardSectionHeader
          eyebrow="Household"
          title="Family Settings"
          subtitle="Privacy, shared access, and AI behavior for the Family Hub — premium controls (demo)."
        />
        <div className={`wealth-glass overflow-hidden rounded-2xl border ${light ? "border-emerald-200/70 shadow-sm" : "border-emerald-400/15"}`}>
          <ul className="divide-y divide-emerald-200/60 dark:divide-emerald-500/15">
            {PLACEHOLDER_ROWS.map((row) => (
              <li key={row.label} className="flex flex-col gap-1 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <span className="text-sm font-bold text-slate-900 dark:text-white">{row.label}</span>
                <span className="text-sm font-semibold text-slate-600 dark:text-zinc-400">{row.value}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs font-semibold leading-relaxed text-slate-500 dark:text-zinc-500">
          Account-wide security and billing remain under{" "}
          <Link href="/dashboard/settings" className="font-black text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-300">
            Settings
          </Link>
          .
        </p>
      </div>
    </WealthDashboardShell>
  );
}
