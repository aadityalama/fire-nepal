"use client";

import {
  Activity,
  ArrowRight,
  Bell,
  Briefcase,
  Flame,
  Home,
  LayoutGrid,
  MoreHorizontal,
  PanelLeft,
  PanelLeftClose,
  Settings,
  Users,
  Wallet,
  Banknote,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useCallback, useState } from "react";
import { FireNepalMainBottomNav, mainNavActive } from "@/components/navigation/FireNepalMainBottomNav";
import { UserMenuDropdown } from "@/components/product/auth/UserMenuDropdown";
import { useFireTheme } from "@/contexts/FireThemeContext";
import { useProductAuth } from "@/contexts/ProductAuthContext";
import { FIRE_BIZ_I18N } from "@/lib/fire-biz/i18n";

const BASE_NAV = [
  { href: "/hub", labelKey: "home" as const, icon: Home },
  { href: "/cashflow-dashboard", labelKey: "finance" as const, icon: Banknote },
  { href: "/portfolio", labelKey: "portfolio" as const, icon: Briefcase },
  { href: "/fire-biz", labelKey: "fireBiz" as const, icon: LayoutGrid },
  { href: "/more", labelKey: "more" as const, icon: MoreHorizontal },
];

const MORE_LINKS = [
  { href: "/account", label: "Account", icon: Wallet },
  { href: "/dashboard/profile", label: "My Profile", icon: Users },
  { href: "/smart-reminders", label: "Reminders", icon: Bell },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

function linkCls(active: boolean, light: boolean) {
  return `flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition active:scale-[0.99] ${
    active
      ? light
        ? "bg-emerald-100 text-emerald-900"
        : "bg-gradient-to-r from-emerald-500/90 to-lime-400/90 text-emerald-950 shadow-lg shadow-emerald-500/20"
      : light
        ? "text-slate-700 hover:bg-emerald-50 hover:text-slate-900"
        : "text-emerald-100/80 hover:bg-white/[0.06] hover:text-white"
  }`;
}

export function MorePagePanel() {
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const { isAdmin } = useProductAuth();
  const labels = FIRE_BIZ_I18N.en.mainNav;
  const fireBiz = FIRE_BIZ_I18N.en.hubPromo;
  const fireBizMore = FIRE_BIZ_I18N.en.morePromo;

  const links = isAdmin
    ? [...MORE_LINKS, { href: "/admin", label: "Admin", icon: Activity }]
    : MORE_LINKS;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header
        className={`rounded-2xl border p-6 backdrop-blur-xl ${
          light ? "border-emerald-200/70 bg-white/90" : "border-emerald-400/12 bg-emerald-950/35"
        }`}
      >
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400/80">FIRE Nepal</p>
        <h1 className={`mt-2 text-2xl font-black ${light ? "text-slate-900" : "text-white"}`}>{labels.more}</h1>
        <p className={`mt-2 text-sm font-semibold ${light ? "text-slate-600" : "text-emerald-200/70"}`}>
          Account, family modules, reminders, FIRE Biz, and settings.
        </p>
      </header>

      <Link
        href="/fire-biz"
        data-testid="more-fire-biz-promo"
        className={`group relative block overflow-hidden rounded-2xl border p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)] transition duration-500 hover:border-emerald-300/35 hover:shadow-[0_24px_70px_rgba(16,185,129,0.12)] ${
          light
            ? "border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-lime-50/80"
            : "border-emerald-400/20 bg-gradient-to-br from-emerald-500/15 to-lime-400/5"
        }`}
      >
        <div
          className={`pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-lime-400/10 opacity-90 ${
            light ? "opacity-60" : ""
          }`}
        />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span
              className={`mt-0.5 grid h-11 w-11 shrink-0 place-items-center rounded-xl border shadow-lg ${
                light
                  ? "border-emerald-200 bg-white text-emerald-700 shadow-emerald-500/10"
                  : "border-emerald-400/25 bg-black/30 text-lime-200 shadow-emerald-500/20"
              }`}
            >
              <LayoutGrid size={22} />
            </span>
            <div>
              <p className={`text-sm font-black ${light ? "text-slate-900" : "text-white"}`}>{fireBiz.title}</p>
              <p className={`mt-1 text-xs font-medium leading-relaxed ${light ? "text-slate-600" : "text-emerald-100/75"}`}>
                {fireBizMore.description}
              </p>
            </div>
          </div>
          <span
            className={`inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 self-start rounded-xl border px-4 py-2.5 text-xs font-black transition group-hover:translate-x-0.5 sm:self-center ${
              light
                ? "border-emerald-300/60 bg-emerald-600 text-white hover:bg-emerald-700"
                : "border-emerald-300/30 bg-emerald-500/15 text-lime-100 hover:bg-emerald-500/25"
            }`}
          >
            Open business desk
            <ArrowRight size={16} />
          </span>
        </div>
      </Link>

      <div className="grid gap-2 sm:grid-cols-2">
        {links.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex min-h-[56px] items-center gap-3 rounded-2xl border px-4 py-3 font-bold transition active:scale-[0.98] ${
              light
                ? "border-emerald-200/70 bg-white/90 text-slate-800 hover:border-emerald-400/50"
                : "border-emerald-400/15 bg-white/[0.04] text-emerald-100 hover:border-emerald-400/30"
            }`}
          >
            <item.icon size={20} className="text-emerald-400" />
            {item.label}
          </Link>
        ))}
        <Link
          href="/family"
          className={`flex min-h-[56px] items-center gap-3 rounded-2xl border px-4 py-3 font-bold transition active:scale-[0.98] ${
            light
              ? "border-emerald-200/70 bg-white/90 text-slate-800 hover:border-emerald-400/50"
              : "border-emerald-400/15 bg-white/[0.04] text-emerald-100 hover:border-emerald-400/30"
          }`}
        >
          <Users size={20} className="text-emerald-400" />
          Family OS
        </Link>
      </div>
    </div>
  );
}

export function ProductAppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const [collapsed, setCollapsed] = useState(false);
  const labels = FIRE_BIZ_I18N.en.mainNav;

  const toggle = useCallback(() => setCollapsed((c) => !c), []);
  const desktopW = collapsed ? "lg:w-[72px]" : "lg:w-60";

  return (
    <div
      className={`flex min-h-screen max-w-[100vw] flex-col overflow-x-clip lg:flex-row ${
        light ? "bg-slate-100 text-slate-900" : "bg-[#030806] text-zinc-100"
      }`}
    >
      <aside
        className={`hidden shrink-0 border-r px-3 py-6 backdrop-blur-xl transition-[width] duration-300 lg:flex lg:flex-col ${desktopW} ${
          light ? "border-emerald-200/60 bg-white/95" : "border-emerald-400/10 bg-[#04140f]/95"
        }`}
      >
        <div className="mb-6 flex items-center justify-between gap-2 px-1">
          <Link href="/hub" className={`flex items-center gap-2 font-black tracking-tight ${collapsed ? "justify-center" : ""} ${light ? "text-slate-900" : "text-white"}`}>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-lime-400 text-emerald-950 shadow-lg shadow-emerald-500/25">
              <Flame size={20} />
            </span>
            {!collapsed ? <span className="text-sm">FIRE Nepal</span> : null}
          </Link>
          <button
            type="button"
            onClick={toggle}
            className={`hidden rounded-lg border p-2 transition lg:inline-flex ${
              light ? "border-emerald-200/70 text-slate-700 hover:bg-emerald-50" : "border-white/10 text-emerald-200/80 hover:bg-white/10 hover:text-white"
            }`}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {BASE_NAV.map((item) => {
            const active = mainNavActive(item.href, pathname);
            return (
              <Link key={item.href} href={item.href} className={linkCls(active, light)} title={labels[item.labelKey]}>
                <item.icon size={18} className="shrink-0 opacity-90" />
                {!collapsed ? <span>{labels[item.labelKey]}</span> : null}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header
          className={`sticky top-0 z-40 flex min-w-0 max-w-full items-center justify-between gap-2 border-b px-4 py-3 backdrop-blur-xl sm:gap-3 ${
            light ? "border-emerald-200/60 bg-white/90" : "border-emerald-400/10 bg-[#030806]/90"
          }`}
        >
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Link href="/hub" className="flex min-w-0 max-w-[min(100%,12rem)] items-center gap-2 lg:hidden">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-400 to-lime-400 text-emerald-950">
                <Flame size={18} />
              </span>
              <span className={`truncate text-sm font-black tracking-tight ${light ? "text-slate-900" : "text-white"}`}>FIRE Nepal</span>
            </Link>
          </div>
          <UserMenuDropdown variant={light ? "light" : "dark"} />
        </header>

        <main className="product-shell-main min-w-0 max-w-full flex-1 overflow-x-clip px-4 py-6 pb-28 sm:px-6 lg:pb-10">{children}</main>
      </div>

      <FireNepalMainBottomNav />
    </div>
  );
}
