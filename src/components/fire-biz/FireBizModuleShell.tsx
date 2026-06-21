"use client";

import {
  BarChart3,
  Bell,
  Boxes,
  Building2,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Truck,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useCallback, useState } from "react";
import { FireThemeToggle } from "@/components/dashboard/FireThemeToggle";
import { FireBizMobileBottomNav } from "@/components/fire-biz/FireBizMobileBottomNav";
import { SmartRemindersHeaderBell } from "@/components/smart-reminders/SmartRemindersHeaderBell";
import { UserMenuDropdown } from "@/components/product/auth/UserMenuDropdown";
import { useFireBizCopy } from "@/contexts/FireBizContext";
import { useFireTheme } from "@/contexts/FireThemeContext";

const FIRE_BIZ_NAV: { href: string; labelKey: keyof ReturnType<typeof useFireBizCopy>["nav"]; icon: typeof LayoutDashboard }[] = [
  { href: "/fire-biz", labelKey: "dashboard", icon: LayoutDashboard },
  { href: "/fire-biz/sales", labelKey: "sales", icon: ShoppingCart },
  { href: "/fire-biz/purchases", labelKey: "purchases", icon: ShoppingBag },
  { href: "/fire-biz/customers", labelKey: "customers", icon: Users },
  { href: "/fire-biz/suppliers", labelKey: "suppliers", icon: Truck },
  { href: "/fire-biz/inventory", labelKey: "inventory", icon: Package },
  { href: "/fire-biz/cash-bank", labelKey: "cashBank", icon: Wallet },
  { href: "/fire-biz/credit-reminders", labelKey: "creditReminders", icon: Bell },
  { href: "/fire-biz/reports", labelKey: "reports", icon: BarChart3 },
  { href: "/fire-biz/settings", labelKey: "settings", icon: Settings },
];

function navActive(href: string, pathname: string | null): boolean {
  if (!pathname) return false;
  if (href === "/fire-biz") return pathname === "/fire-biz";
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

export function FireBizModuleShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const copy = useFireBizCopy();
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const [drawerOpen, setDrawerOpen] = useState(false);
  const close = useCallback(() => setDrawerOpen(false), []);

  return (
    <div
      className={`fire-biz-root relative min-h-screen max-w-[100vw] overflow-x-clip transition-[background-color,color] duration-300 ${
        light ? "bg-slate-100 text-slate-900" : "bg-[#020807] text-zinc-100"
      }`}
    >
      <div
        className={
          light
            ? "pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(16,185,129,0.09),transparent_55%)]"
            : "pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(16,185,129,0.14),transparent_55%)]"
        }
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
              aria-label="Open FIRE Biz menu"
            >
              <Boxes size={20} />
            </button>
            <Link href="/fire-biz" className="flex min-w-0 items-center gap-2.5 font-black tracking-tight">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-lime-400 text-emerald-950 shadow-lg shadow-emerald-500/20">
                <Building2 size={20} />
              </span>
              <div className="min-w-0 leading-tight">
                <p className={`truncate text-sm ${light ? "text-slate-900" : "text-white"}`}>{copy.moduleName}</p>
                <p className={`text-[10px] font-bold uppercase tracking-[0.18em] ${light ? "text-emerald-700/85" : "text-emerald-400/80"}`}>
                  {copy.moduleTagline.slice(0, 32)}
                  {copy.moduleTagline.length > 32 ? "…" : ""}
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

      <div className="relative mx-auto flex max-w-[1600px] min-h-[calc(100dvh-4rem)]">
        {drawerOpen ? (
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            aria-label="Close menu overlay"
            onClick={close}
          />
        ) : null}

        <aside
          className={`fixed inset-y-0 left-0 z-50 flex w-[min(90vw,280px)] flex-col border-r backdrop-blur-xl transition-transform duration-300 lg:static lg:z-auto lg:translate-x-0 lg:shrink-0 ${
            light ? "border-emerald-200/60 bg-white/95" : "border-emerald-400/10 bg-[#04140f]/95"
          } ${drawerOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
        >
          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-4">
            {FIRE_BIZ_NAV.map((item) => {
              const active = navActive(item.href, pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={sidebarLinkCls(active, light)}
                  onClick={close}
                >
                  <item.icon size={18} className="shrink-0 opacity-90" />
                  <span>{copy.nav[item.labelKey]}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-5 pb-28 sm:px-6 lg:pb-8">{children}</main>
      </div>

      <FireBizMobileBottomNav />
    </div>
  );
}
