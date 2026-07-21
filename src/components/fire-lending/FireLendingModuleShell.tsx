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
  Crown,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { FireThemeToggle } from "@/components/dashboard/FireThemeToggle";
import { FireLendingMobileBottomNav } from "@/components/fire-lending/FireLendingMobileBottomNav";
import { SmartRemindersHeaderBell } from "@/components/smart-reminders/SmartRemindersHeaderBell";
import { UserMenuDropdown } from "@/components/product/auth/UserMenuDropdown";
import { useFireLending } from "@/contexts/FireLendingContext";
import { useFireTheme } from "@/contexts/FireThemeContext";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  badgeKey?: "requests" | "payments" | "agreements" | "notifications";
  elite?: boolean;
};

const NAV_SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: "Overview",
    items: [
      { href: "/fire-lending", label: "Dashboard", icon: LayoutDashboard },
      { href: "/fire-lending/analytics", label: "Analytics", icon: BarChart3, elite: true },
      { href: "/fire-lending/trust-score", label: "Trust Score", icon: BadgeCheck, elite: true },
    ],
  },
  {
    title: "Lending",
    items: [
      { href: "/fire-lending/loans", label: "My Loans", icon: Landmark },
      { href: "/fire-lending/borrowed", label: "Borrowed", icon: Wallet },
      { href: "/fire-lending/lent", label: "Lent", icon: Handshake },
      { href: "/fire-lending/requests", label: "Loan Requests", icon: Inbox, badgeKey: "requests" },
    ],
  },
  {
    title: "Collections",
    items: [
      { href: "/fire-lending/payments", label: "Payments", icon: CreditCard, badgeKey: "payments" },
      { href: "/fire-lending/installments", label: "Installments", icon: CalendarClock },
    ],
  },
  {
    title: "Network",
    items: [
      { href: "/fire-lending/borrowers", label: "Borrowers", icon: Users },
      { href: "/fire-lending/lenders", label: "Lenders", icon: UserRound },
      { href: "/fire-lending/agreements", label: "Agreements", icon: FileText, badgeKey: "agreements" },
      { href: "/fire-lending/documents", label: "Documents", icon: Shield },
    ],
  },
  {
    title: "System",
    items: [{ href: "/fire-lending/settings", label: "Settings", icon: Settings, badgeKey: "notifications" }],
  },
];

function navActive(href: string, pathname: string | null): boolean {
  if (!pathname) return false;
  if (href === "/fire-lending") return pathname === "/fire-lending";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function sidebarLinkCls(active: boolean, light: boolean) {
  return `group relative flex min-h-[44px] items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-bold transition duration-200 active:scale-[0.99] ${
    active
      ? light
        ? "bg-emerald-100 text-emerald-900 shadow-[0_0_0_1px_rgba(16,185,129,0.35),0_0_24px_rgba(16,185,129,0.18)]"
        : "bg-gradient-to-r from-emerald-500/95 to-lime-400/90 text-emerald-950 shadow-[0_0_28px_rgba(16,185,129,0.35)]"
      : light
        ? "text-slate-700 hover:translate-x-0.5 hover:bg-emerald-50 hover:text-slate-900"
        : "text-emerald-100/80 hover:translate-x-0.5 hover:bg-white/[0.06] hover:text-white"
  }`;
}

function LendingNavSections({
  pathname,
  light,
  badges,
  onNavigate,
}: {
  pathname: string | null;
  light: boolean;
  badges: Record<"requests" | "payments" | "agreements" | "notifications", number>;
  onNavigate?: () => void;
}) {
  return (
    <>
      {NAV_SECTIONS.map((section) => (
        <div key={section.title}>
          <p className={`mb-1.5 px-3 text-[10px] font-black uppercase tracking-[0.16em] ${light ? "text-slate-400" : "text-emerald-200/40"}`}>
            {section.title}
          </p>
          <div className="flex flex-col gap-1">
            {section.items.map((navItem) => {
              const active = navActive(navItem.href, pathname);
              const count = navItem.badgeKey ? badges[navItem.badgeKey] : 0;
              return (
                <Link key={navItem.href} href={navItem.href} className={sidebarLinkCls(active, light)} onClick={onNavigate}>
                  <navItem.icon size={18} className="shrink-0 opacity-90" />
                  <span className="min-w-0 flex-1 truncate">{navItem.label}</span>
                  {navItem.elite ? (
                    <span className={`rounded-full px-1.5 py-0.5 text-[8px] font-black uppercase ${light ? "bg-amber-100 text-amber-800" : "bg-amber-500/20 text-amber-200"}`}>
                      Elite
                    </span>
                  ) : null}
                  {count > 0 ? (
                    <span
                      className={`grid min-w-[1.25rem] place-items-center rounded-full px-1.5 py-0.5 text-[10px] font-black ${
                        active
                          ? light
                            ? "bg-emerald-700 text-white"
                            : "bg-emerald-950/40 text-emerald-50"
                          : light
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-emerald-500/20 text-lime-200"
                      }`}
                    >
                      {count}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}

/**
 * Architecture: ONE document scroll (html/body).
 * - Header + <main> children are in normal document flow (no nested overflow-y on the page column).
 * - Mobile drawer is portaled to document.body so its overflow-y-auto cannot become a page scroll ancestor.
 * - No h-screen / flex-1 overflow shell wrapping dashboard content.
 */
export function FireLendingModuleShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const { store, agreementCenter } = useFireLending();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const portalReady = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const close = useCallback(() => setDrawerOpen(false), []);

  const badges = {
    requests: store.requests.filter((r) => r.status === "pending").length,
    payments: store.installments.filter((i) => i.status === "due" || i.status === "overdue").length,
    agreements: agreementCenter.pendingSignature + agreementCenter.waitingApproval,
    notifications: store.notifications.filter((n) => !n.read).length,
  };

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

  const eliteBadge = (
    <div className={`mx-4 mt-4 flex items-center gap-2 rounded-xl border px-3 py-2 ${light ? "border-amber-200/70 bg-amber-50/80" : "border-amber-400/25 bg-amber-500/10"}`}>
      <Crown size={14} className={light ? "text-amber-700" : "text-amber-300"} />
      <span className={`text-[10px] font-black uppercase tracking-[0.14em] ${light ? "text-amber-800" : "text-amber-200"}`}>Elite Module</span>
    </div>
  );

  const mobileDrawer =
    portalReady &&
    createPortal(
      <>
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
          className={`fixed inset-y-0 left-0 z-50 flex h-dvh w-[min(90vw,292px)] flex-col border-r backdrop-blur-xl transition-transform duration-300 lg:hidden ${
            light ? "border-emerald-200/60 bg-white/95" : "border-emerald-400/10 bg-[#04140f]/95"
          } ${drawerOpen ? "translate-x-0 pointer-events-auto" : "-translate-x-full pointer-events-none"}`}
        >
          {eliteBadge}
          {/* Isolated drawer scroller — not an ancestor of dashboard content */}
          <nav className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain p-4">
            <LendingNavSections pathname={pathname} light={light} badges={badges} onNavigate={close} />
          </nav>
        </aside>
      </>,
      document.body,
    );

  return (
    <div
      className={`fire-lending-root relative min-h-screen max-w-[100vw] transition-[background-color,color] duration-300 ${
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

      {/* In-flow chrome — scrolls with the page on mobile (no sticky / no nested scroller) */}
      <header
        className={`relative z-40 border-b backdrop-blur-xl ${
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

      {/*
        Page column: header (above) + this row are document-flow only.
        Desktop sidebar is static (not fixed). Mobile drawer is portaled (above).
        <main> must never gain overflow-y / h-screen — page scroll is the document.
      */}
      <div className="relative z-10 mx-auto flex w-full max-w-[1600px]">
        <aside
          className={`hidden w-[min(90vw,292px)] shrink-0 flex-col border-r backdrop-blur-xl lg:flex ${
            light ? "border-emerald-200/60 bg-white/95" : "border-emerald-400/10 bg-[#04140f]/95"
          }`}
        >
          {eliteBadge}
          <nav className="flex flex-col gap-4 p-4">
            <LendingNavSections pathname={pathname} light={light} badges={badges} />
          </nav>
        </aside>

        <main className="relative z-10 min-w-0 flex-1 px-4 py-5 pb-28 sm:px-6 lg:pb-8">{children}</main>
      </div>

      <FireLendingMobileBottomNav />
      {mobileDrawer}
    </div>
  );
}
