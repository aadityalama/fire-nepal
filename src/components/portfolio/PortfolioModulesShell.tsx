"use client";

import { Cloud, LogOut, Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useCallback } from "react";
import { useWealthPortfolio } from "@/contexts/WealthPortfolioContext";
import { PortfolioAddAssetFab } from "@/components/portfolio/premium/PortfolioAddAssetFab";
import { WealthDashboardShell } from "@/components/portfolio/WealthDashboardShell";
import { useFireTheme } from "@/contexts/FireThemeContext";
import { useProductAuth } from "@/contexts/ProductAuthContext";
import { formatMoney } from "@/lib/expense-utils";

function PortfolioTotalsStrip() {
  const { totals, hydrated } = useWealthPortfolio();
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";

  const cardBase = light
    ? "border-emerald-200/70 bg-white/90 text-slate-900 shadow-sm"
    : "border-white/[0.08] bg-white/[0.04] text-white shadow-sm";

  const muted = light ? "text-slate-500" : "text-emerald-200/75";
  const labelMuted = light ? "text-slate-500" : "text-zinc-400";
  const liabCard = light
    ? "border-rose-200/80 bg-rose-50/80 text-rose-950"
    : "border-rose-400/15 bg-white/[0.04] text-rose-50/95";

  return (
    <div className="mb-5 grid gap-3 sm:mb-6 sm:grid-cols-3">
      <div className={`relative overflow-hidden rounded-2xl border px-4 py-3 backdrop-blur-xl ${cardBase}`}>
        <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.14em] ${muted}`}>
          <Wallet size={14} className={light ? "text-emerald-600" : "text-lime-300"} />
          Net worth
        </div>
        <p className={`mt-1 truncate text-lg font-black tracking-tight sm:text-xl ${light ? "text-slate-900" : ""}`}>
          {!hydrated ? "—" : formatMoney(totals.netWorthNpr, "NPR")}
        </p>
      </div>
      <div
        className={`relative overflow-hidden rounded-2xl border px-4 py-3 backdrop-blur-xl ${
          light ? "border-slate-200/80 bg-white/85 text-slate-900" : "border-white/10 bg-white/[0.05] text-emerald-50"
        }`}
      >
        <div className={`text-[10px] font-black uppercase tracking-[0.14em] ${labelMuted}`}>Total assets</div>
        <p className="mt-1 truncate text-lg font-black sm:text-xl">{!hydrated ? "—" : formatMoney(totals.totalAssetsNpr, "NPR")}</p>
      </div>
      <div className={`relative overflow-hidden rounded-2xl border px-4 py-3 backdrop-blur-xl ${liabCard}`}>
        <div className={`text-[10px] font-black uppercase tracking-[0.14em] ${light ? "text-rose-700/80" : "text-rose-200/70"}`}>
          Liabilities
        </div>
        <p className="mt-1 truncate text-lg font-black sm:text-xl">{!hydrated ? "—" : formatMoney(totals.liabilitiesNpr, "NPR")}</p>
      </div>
    </div>
  );
}

function SidebarAccountFooter({ light }: { light: boolean }) {
  const { logout } = useProductAuth();
  const onLogout = useCallback(async () => {
    await logout();
  }, [logout]);
  return (
    <div className={`mt-3 space-y-1 border-t pt-3 ${light ? "border-emerald-200/50" : "border-white/[0.06]"}`}>
      <Link
        href="/dashboard/profile"
        className={`block rounded-lg px-2 py-2 text-[11px] font-semibold transition-colors ${
          light ? "text-slate-700 hover:bg-slate-100" : "text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-200"
        }`}
      >
        Profile
      </Link>
      <button
        type="button"
        onClick={() => void onLogout()}
        className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-[11px] font-semibold transition-colors ${
          light ? "text-rose-800 hover:bg-rose-50" : "text-rose-200/90 hover:bg-rose-500/10"
        }`}
      >
        <LogOut size={14} strokeWidth={2.25} aria-hidden />
        Sign out
      </button>
    </div>
  );
}

export function PortfolioModulesShell({ children }: { children: ReactNode }) {
  const { ratesLoading } = useWealthPortfolio();
  const pathname = usePathname() ?? "";
  const hideTotalsStrip = pathname === "/portfolio";
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const muted = light ? "text-slate-500" : "text-emerald-200/75";

  return (
    <WealthDashboardShell
      brand={{ tagline: "Financial Independence Retire Early", iconGradient: "from-emerald-400 to-lime-400" }}
      footerNote={
        <>
          <div
            className={`rounded-xl border px-3 py-3 ${
              light ? "border-emerald-200/70 bg-white/90" : "border-white/[0.08] bg-white/[0.035]"
            }`}
          >
            <div className={`flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide ${muted}`}>
              <Cloud size={14} className={light ? "text-emerald-600" : "text-emerald-400/80"} />
              Data sync
            </div>
            <p className={`mt-1 text-[11px] font-medium ${light ? "text-slate-700" : "text-zinc-300"}`}>
              Last backup: Today, 10:45 AM
            </p>
            <p className={`mt-0.5 text-[10px] font-medium ${light ? "text-slate-500" : "text-zinc-500"}`}>
              All data is secure · NPR base · KRW/USD converted live.
              {ratesLoading ? " Rates…" : ""}
            </p>
          </div>
          <SidebarAccountFooter light={light} />
        </>
      }
    >
      {hideTotalsStrip ? null : <PortfolioTotalsStrip />}
      {children}
      <PortfolioAddAssetFab />
    </WealthDashboardShell>
  );
}
