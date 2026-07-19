"use client";

import {
  BarChart3,
  BadgeCheck,
  FileText,
  Handshake,
  LayoutDashboard,
  Landmark,
  Settings,
  Shield,
  Users,
  Wallet,
  Inbox,
  CreditCard,
  CalendarClock,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import { FireThemeToggle } from "@/components/dashboard/FireThemeToggle";
import { FireLendingMobileBottomNav } from "@/components/fire-lending/FireLendingMobileBottomNav";
import { SmartRemindersHeaderBell } from "@/components/smart-reminders/SmartRemindersHeaderBell";
import { UserMenuDropdown } from "@/components/product/auth/UserMenuDropdown";
import { useFireTheme } from "@/contexts/FireThemeContext";

const NAV: { href: string; label: string; icon: typeof LayoutDashboard }[] = [
  { href: "/fire-lending", label: "Dashboard", icon: LayoutDashboard },
  { href: "/fire-lending/loans", label: "My Loans", icon: Landmark },
  { href: "/fire-lending/borrowed", label: "Borrowed", icon: Wallet },
  { href: "/fire-lending/lent", label: "Lent", icon: Handshake },
  { href: "/fire-lending/requests", label: "Loan Requests", icon: Inbox },
  { href: "/fire-lending/payments", label: "Payments", icon: CreditCard },
  { href: "/fire-lending/installments", label: "Installments", icon: CalendarClock },
  { href: "/fire-lending/borrowers", label: "Borrowers", icon: Users },
  { href: "/fire-lending/lenders", label: "Lenders", icon: UserRound },
  { href: "/fire-lending/agreements", label: "Agreements", icon: FileText },
  { href: "/fire-lending/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/fire-lending/trust-score", label: "Trust Score", icon: BadgeCheck },
  { href: "/fire-lending/documents", label: "Documents", icon: Shield },
  { href: "/fire-lending/settings", label: "Settings", icon: Settings },
];

function navActive(href: string, pathname: string | null): boolean {
  if (!pathname) return false;
  if (href === "/fire-lending") return pathname === "/fire-lending";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function sidebarLinkCls(active: boolean, light: boolean) {
  return `flex min-h-[44px] items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-bold transition active:scale-[0.99] ${
    active
      ? light
        ? "bg-emerald-100 text-emerald-900"
        : "bg-gradient-to-r from-emerald-500/90 to-lime-400/90 text-emerald-950 shadow-lg shadow-emerald-500/20"
      : light
        ? "text-slate-700 hover:bg-emerald-50 hover:text-slate-900"
        : "text-emerald-100/80 hover:bg-white/[0.06] hover:text-white"
  }`;
}

export function FireLendingModuleShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const [drawerOpen, setDrawerOpen] = useState(false);
  const close = useCallback(() => setDrawerOpen(false), []);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => {
      if (mq.matches) {
        document.body.style.overflow = "";
        return;
      }
      document.body.style.overflow = drawerOpen ? "hidden" : "";
    };
    sync();
    mq.addEventListener("change", sync);
    return () => {
      mq.removeEventListener("change", sync);
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  return (
    <div
      className={`fire-lending-root relative min-h-screen max-w-[100vw] overflow-x-clip transition-[background-color,color] duration-300 ${
        light ? "bg-slate-100 text-slate-900" : "bg-[#020807] text-zinc-100"
      }`}
    >
      <div
        className={
          light
            ? "pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(16,185,129,0.09),transparent_55%)]"
            : "pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(16,185,129,0.14),transparent_55%)]"
        }
        aria-hidden
      />

      <header
        className={`sticky top-0 z-40 border-b backdrop-blur-xl ${
          light ? "border-emerald-200/40 bg-white/90" : "border-emerald-500/10 bg-[#030806]/85"
        }`}
      >
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border lg:hidden ${
                light ? "border-emerald-200/70 text-slate-800" : "border-emerald-400/20 text-emerald-100"
              }`}
              aria-label="Open Loan & P2P menu"
            >
              <Landmark size={20} />
            </button>
            <Link href="/fire-lending" className="flex min-w-0 items-center gap-2.5 font-black tracking-tight">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 via-lime-400 to-amber-300 text-emerald-950 shadow-lg shadow-emerald-500/20">
                <Handshake size={20} />
              </span>
              <div className="min-w-0 leading-tight">
                <p className={`truncate text-sm ${light ? "text-slate-900" : "text-white"}`}>Loan & P2P Lending</p>
                <p className={`text-[10px] font-bold uppercase tracking-[0.18em] ${light ? "text-amber-700/85" : "text-amber-300/80"}`}>
                  Elite · Bank-grade peer credit
                </p>
              </div>
            </Link>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <SmartRemindersHeaderBell />
            <FireThemeToggle variant="header" />
            <UserMenuDropdown variant={light ? "light" : "dark"} />
          </div>
        </div>
      </header>

      <div className="relative z-10 mx-auto flex max-w-[1600px] min-h-[calc(100dvh-4rem)]">
        <button
          type="button"
          className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-[1px] transition-opacity duration-300 lg:hidden ${
            drawerOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
          }`}
          aria-label="Close menu overlay"
          aria-hidden={!drawerOpen}
          tabIndex={drawerOpen ? 0 : -1}
          onClick={close}
        />

        <aside
          id="fire-lending-drawer"
          aria-hidden={!drawerOpen}
          className={`fixed inset-y-0 left-0 z-50 flex w-[min(90vw,280px)] flex-col border-r backdrop-blur-xl transition-transform duration-300 lg:static lg:z-auto lg:translate-x-0 lg:shrink-0 ${
            light ? "border-emerald-200/60 bg-white/95" : "border-emerald-400/10 bg-[#04140f]/95"
          } ${drawerOpen ? "translate-x-0 pointer-events-auto" : "-translate-x-full pointer-events-none lg:pointer-events-auto lg:translate-x-0"}`}
        >
          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-4">
            {NAV.map((item) => {
              const active = navActive(item.href, pathname);
              return (
                <Link key={item.href} href={item.href} className={sidebarLinkCls(active, light)} onClick={close}>
                  <item.icon size={18} className="shrink-0 opacity-90" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="relative z-10 min-w-0 flex-1 px-4 py-5 pb-28 sm:px-6 lg:pb-8">{children}</main>
      </div>

      <FireLendingMobileBottomNav />
    </div>
  );
}
