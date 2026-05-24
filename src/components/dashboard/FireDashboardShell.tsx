"use client";

import {
  BadgeCheck,
  Brain,
  Briefcase,
  CreditCard,
  Crown,
  Flame,
  LayoutGrid,
  Lock,
  PanelLeft,
  PanelLeftClose,
  Settings2,
  Shield,
  Sparkles,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useCallback, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { FireThemeToggle } from "@/components/dashboard/FireThemeToggle";
import { UserMenuDropdown } from "@/components/product/auth/UserMenuDropdown";
import { useFireMembership } from "@/contexts/FireMembershipContext";
import { useFireTheme } from "@/contexts/FireThemeContext";

const NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/dashboard/profile", label: "Profile", icon: UserRound },
  { href: "/portfolio", label: "Wealth dashboard", icon: Briefcase },
  { href: "/dashboard/ai-coach", label: "AI Coach", icon: Brain },
  { href: "/dashboard/security", label: "Security", icon: Shield },
  { href: "/dashboard/membership", label: "Plans & Billing", icon: CreditCard },
  { href: "/dashboard/membership", label: "Membership", icon: BadgeCheck },
  { href: "/dashboard/settings", label: "Settings", icon: Settings2 },
];

function navActive(href: string, pathname: string | null): boolean {
  if (!pathname) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function DashboardMembershipUpsell() {
  const pathname = usePathname();
  const { tier } = useFireMembership();
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  if (pathname?.startsWith("/dashboard/membership")) return null;
  if (pathname?.startsWith("/dashboard/ai-coach")) return null;
  if (tier === "elite") return null;
  if (tier === "free") {
    return (
      <div
        className={
          light
            ? "border-b border-emerald-200/50 bg-gradient-to-r from-emerald-50/95 via-white to-slate-50"
            : "border-b border-emerald-500/15 bg-gradient-to-r from-emerald-500/10 via-[#04140f]/90 to-[#030806]/95"
        }
      >
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-center gap-3 px-4 py-2.5 text-center sm:justify-between sm:text-left sm:px-6">
          <p
            className={
              light
                ? "text-xs font-bold text-emerald-900/90 sm:text-sm"
                : "text-xs font-bold text-emerald-100/90 sm:text-sm"
            }
          >
            <Sparkles className="mb-0.5 inline sm:mb-0 sm:mr-2" size={14} aria-hidden />
            Unlock Premium — AI coach, OCR payslips, advanced analytics & PDF reports.
          </p>
          <Link
            href="/dashboard/membership"
            className={
              light
                ? "shrink-0 rounded-full bg-gradient-to-r from-emerald-600 to-lime-500 px-4 py-2 text-xs font-black text-white shadow-md transition hover:brightness-105"
                : "shrink-0 rounded-full bg-gradient-to-r from-emerald-500 to-lime-400 px-4 py-2 text-xs font-black text-emerald-950 shadow-md transition hover:brightness-110"
            }
          >
            View plans
          </Link>
        </div>
      </div>
    );
  }
  return (
    <div
      className={
        light
          ? "border-b border-amber-200/50 bg-gradient-to-r from-amber-50/95 via-white to-slate-50"
          : "border-b border-amber-500/15 bg-gradient-to-r from-amber-500/10 via-[#1a1204]/80 to-[#030806]/95"
      }
    >
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-center gap-3 px-4 py-2.5 text-center sm:justify-between sm:text-left sm:px-6">
        <p
          className={
            light ? "text-xs font-bold text-amber-900/90 sm:text-sm" : "text-xs font-bold text-amber-100/90 sm:text-sm"
          }
        >
          <Crown className="mb-0.5 inline sm:mb-0 sm:mr-2" size={14} aria-hidden />
          Go Elite — Bloomberg-style terminal, stress tests, family wealth & priority roadmap.
        </p>
        <Link
          href="/dashboard/membership"
          className={
            light
              ? "shrink-0 rounded-full border border-amber-300/60 bg-amber-100/80 px-4 py-2 text-xs font-black text-amber-950 transition hover:bg-amber-100"
              : "shrink-0 rounded-full border border-amber-400/40 bg-amber-500/15 px-4 py-2 text-xs font-black text-amber-50 transition hover:bg-amber-500/25"
          }
        >
          Compare Elite
        </Link>
      </div>
    </div>
  );
}

export function FireDashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const [collapsed, setCollapsed] = useState(false);
  const toggle = useCallback(() => setCollapsed((c) => !c), []);
  const w = collapsed ? "lg:w-[76px]" : "lg:w-64";

  return (
    <div
      className={`fire-dashboard-root relative min-h-screen transition-[background-color,color] duration-300 ease-out ${
        light ? "bg-slate-100 text-slate-900" : "bg-[#020807] text-zinc-100"
      }`}
    >
      <div
        className={
          light
            ? "pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(16,185,129,0.09),transparent_55%),radial-gradient(circle_at_100%_30%,rgba(5,150,105,0.06),transparent_42%)]"
            : "pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(16,185,129,0.12),transparent_55%),radial-gradient(circle_at_100%_30%,rgba(52,211,153,0.06),transparent_40%)]"
        }
      />

      <header
        className={`sticky top-0 z-40 border-b backdrop-blur-xl transition-colors duration-300 ${
          light ? "border-emerald-200/40 bg-white/90" : "border-emerald-500/10 bg-[#030806]/85"
        }`}
      >
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link
            href="/"
            className={`flex items-center gap-2.5 font-black tracking-tight ${light ? "text-slate-900" : "text-white"}`}
          >
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-lime-400 text-emerald-950 shadow-lg shadow-emerald-500/20">
              <Flame size={20} />
            </span>
            <div className="leading-tight">
              <p className="text-sm">FIRE Nepal</p>
              <p
                className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] ${
                  light ? "text-emerald-700/85" : "text-emerald-400/80"
                }`}
              >
                <Lock size={10} className={light ? "text-emerald-700/90" : "text-emerald-400/90"} aria-hidden />
                Secure workspace
              </p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/hub"
              className={`hidden rounded-xl border px-3 py-2 text-xs font-black transition sm:inline-flex ${
                light
                  ? "border-emerald-200/70 bg-emerald-50/90 text-emerald-900 hover:bg-emerald-100"
                  : "border-emerald-500/20 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/20"
              }`}
            >
              Product hub
            </Link>
            <FireThemeToggle variant="header" />
            <UserMenuDropdown variant={light ? "light" : "dark"} />
          </div>
        </div>
      </header>

      <DashboardMembershipUpsell />

      <div className="relative mx-auto flex max-w-[1600px] gap-0 px-0 pb-12 pt-6 lg:gap-6 lg:px-6">
        <aside
          className={`hidden shrink-0 border-r px-3 py-6 backdrop-blur-xl transition-[width] duration-300 lg:flex lg:flex-col ${w} ${
            light
              ? "border-emerald-200/50 bg-white/90"
              : "border-emerald-500/10 bg-[#04140f]/90"
          }`}
        >
          <div className="mb-4 flex items-center justify-between gap-2 px-1">
            {!collapsed ? (
              <p
                className={`text-[10px] font-black uppercase tracking-[0.16em] ${
                  light ? "text-emerald-700/70" : "text-emerald-400/55"
                }`}
              >
                Navigate
              </p>
            ) : null}
            <button
              type="button"
              onClick={toggle}
              className={`ml-auto rounded-lg border p-2 transition ${
                light
                  ? "border-slate-200/80 text-emerald-800 hover:bg-slate-100"
                  : "border-white/10 text-emerald-200/80 hover:bg-white/10 hover:text-white"
              }`}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
            </button>
          </div>
          <nav className="flex flex-col gap-1">
            {NAV.map((item) => {
              const active = navActive(item.href, pathname);
              return (
                <Link
                  key={`${item.href}-${item.label}`}
                  href={item.href}
                  title={item.label}
                  className={`flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition active:scale-[0.99] ${
                    active
                      ? "bg-gradient-to-r from-emerald-500 to-lime-400 text-emerald-950 shadow-lg shadow-emerald-500/25"
                      : light
                        ? "text-slate-700 hover:bg-emerald-50/80 hover:text-slate-900"
                        : "text-emerald-100/75 hover:bg-white/[0.06] hover:text-white"
                  }`}
                >
                  <item.icon size={18} className="shrink-0 opacity-90" />
                  {!collapsed ? item.label : null}
                </Link>
              );
            })}
          </nav>
          <div className="mt-4 border-t pt-3 lg:block">
            <FireThemeToggle variant="sidebar" collapsed={collapsed} />
          </div>
          <div
            className={`mt-auto hidden border-t pt-4 text-[10px] font-semibold lg:block ${
              light ? "border-slate-200/80 text-slate-500" : "border-white/10 text-zinc-500"
            }`}
          >
            {!collapsed ? <p className="px-2 leading-relaxed">Bloomberg-style workspace · local-first data</p> : null}
          </div>
        </aside>

        <main
          className={`fire-dashboard-main min-w-0 flex-1 px-4 pb-10 transition-colors duration-300 sm:px-5 lg:px-0 ${
            light ? "bg-slate-100/80" : ""
          }`}
        >
          {children}
        </main>

        <nav
          className={`fixed bottom-0 left-0 right-0 z-30 flex border-t px-2 py-2 backdrop-blur-xl lg:hidden ${
            light ? "border-emerald-200/50 bg-white/95" : "border-emerald-500/15 bg-[#030806]/95"
          }`}
        >
          {NAV.map((item) => {
            const active = navActive(item.href, pathname);
            return (
              <Link
                key={`${item.href}-${item.label}`}
                href={item.href}
                className={`flex flex-1 flex-col items-center gap-0.5 rounded-lg py-2 text-[10px] font-black uppercase tracking-wide ${
                  active
                    ? light
                      ? "text-emerald-700"
                      : "text-emerald-300"
                    : light
                      ? "text-slate-500"
                      : "text-zinc-500"
                }`}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            );
          })}
          <Link
            href="/hub"
            className={`flex flex-1 flex-col items-center gap-0.5 rounded-lg py-2 text-[10px] font-black uppercase tracking-wide ${
              light ? "text-slate-500" : "text-zinc-500"
            }`}
          >
            <LayoutGrid size={18} />
            Hub
          </Link>
        </nav>
      </div>
    </div>
  );
}
