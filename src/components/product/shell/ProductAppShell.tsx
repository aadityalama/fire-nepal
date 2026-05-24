"use client";

import {
  Banknote,
  BarChart2,
  BadgeCheck,
  Flame,
  Home,
  LayoutDashboard,
  LineChart,
  PanelLeftClose,
  PanelLeft,
  Wallet2,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useCallback, useState } from "react";
import { UserMenuDropdown } from "@/components/product/auth/UserMenuDropdown";

const NAV: { href: string; label: string; icon: typeof LayoutDashboard }[] = [
  { href: "/hub", label: "Hub", icon: LayoutDashboard },
  { href: "/account", label: "Account", icon: BadgeCheck },
  { href: "/portfolio", label: "Wealth", icon: Wallet2 },
  { href: "/portfolio/simulation", label: "Simulate", icon: LineChart },
  { href: "/cashflow-dashboard", label: "Cashflow", icon: Banknote },
  { href: "/fire-summary", label: "Summary", icon: BarChart2 },
];

function navActive(href: string, pathname: string | null): boolean {
  if (!pathname) return false;
  if (href === "/hub") return pathname === "/hub";
  if (href === "/account") return pathname === "/account" || pathname.startsWith("/account/");
  if (href === "/portfolio") return pathname === "/portfolio";
  if (href === "/portfolio/simulation") return pathname.startsWith("/portfolio/simulation");
  return pathname.startsWith(href);
}

function linkCls(active: boolean) {
  return `flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition active:scale-[0.99] ${
    active
      ? "bg-gradient-to-r from-emerald-500/90 to-lime-400/90 text-emerald-950 shadow-lg shadow-emerald-500/20"
      : "text-emerald-100/80 hover:bg-white/[0.06] hover:text-white"
  }`;
}

export function ProductAppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const desktopW = collapsed ? "lg:w-[72px]" : "lg:w-60";

  const toggle = useCallback(() => setCollapsed((c) => !c), []);

  return (
    <div className="flex min-h-screen flex-col bg-[#030806] text-zinc-100 lg:flex-row">
      <aside
        className={`hidden shrink-0 border-r border-emerald-400/10 bg-[#04140f]/95 px-3 py-6 backdrop-blur-xl transition-[width] duration-300 lg:flex lg:flex-col ${desktopW}`}
      >
        <div className="mb-6 flex items-center justify-between gap-2 px-1">
          <Link href="/hub" className={`flex items-center gap-2 font-black tracking-tight text-white ${collapsed ? "justify-center" : ""}`}>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-lime-400 text-emerald-950 shadow-lg shadow-emerald-500/25">
              <Flame size={20} />
            </span>
            {!collapsed ? <span className="text-sm">FIRE Nepal</span> : null}
          </Link>
          <button
            type="button"
            onClick={toggle}
            className="hidden rounded-lg border border-white/10 p-2 text-emerald-200/80 transition hover:bg-white/10 hover:text-white lg:inline-flex"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map((item) => {
            const active = navActive(item.href, pathname);
            return (
              <Link key={item.href} href={item.href} className={linkCls(active)} title={item.label}>
                <item.icon size={18} className="shrink-0 opacity-90" />
                {!collapsed ? <span>{item.label}</span> : null}
              </Link>
            );
          })}
        </nav>
        <Link
          href="/"
          className={`mt-4 flex min-h-[44px] items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-black text-zinc-400 transition hover:border-emerald-400/25 hover:text-emerald-100 ${collapsed ? "justify-center" : ""}`}
        >
          <Home size={16} />
          {!collapsed ? "Marketing site" : null}
        </Link>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-emerald-400/10 bg-[#030806]/90 px-4 py-3 backdrop-blur-xl">
          <div className="flex min-w-0 items-center gap-2">
            <Link href="/hub" className="flex items-center gap-2 lg:hidden">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-emerald-400 to-lime-400 text-emerald-950">
                <Flame size={18} />
              </span>
              <span className="text-sm font-black tracking-tight text-white">FIRE Nepal</span>
            </Link>
            <p className="hidden text-[11px] font-black uppercase tracking-[0.16em] text-emerald-200/45 lg:block">Premium workspace</p>
          </div>
          <UserMenuDropdown variant="dark" />
        </header>

        <main className="product-shell-main flex-1 px-4 py-6 pb-28 sm:px-6 lg:pb-10">{children}</main>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-emerald-400/15 bg-[#04140f]/95 px-2 py-2 backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex max-w-lg justify-between gap-1">
          {NAV.map((item) => {
            const active = navActive(item.href, pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-h-[52px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[10px] font-black uppercase tracking-wide transition ${
                  active ? "text-lime-300" : "text-zinc-500 hover:text-emerald-200"
                }`}
              >
                <item.icon size={18} strokeWidth={active ? 2.4 : 2} />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
