"use client";

import { Flame, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import { FireThemeToggle } from "@/components/dashboard/FireThemeToggle";
import { useFireTheme } from "@/contexts/FireThemeContext";

const ASSET_MODULE_PATHS = [
  "/portfolio/banking",
  "/portfolio/investments",
  "/portfolio/gold",
  "/portfolio/real-estate",
  "/portfolio/vehicles",
  "/portfolio/liabilities",
  "/portfolio/retirement",
  "/portfolio/ledger",
] as const;

type ShellNavItem = { href: string; label: string; isActive: (pathname: string) => boolean };

const NAV: readonly ShellNavItem[] = [
  { href: "/portfolio", label: "🏠 Dashboard", isActive: (p) => p === "/portfolio" },
  { href: "/fire-summary", label: "🔥 FIRE Goal", isActive: (p) => p === "/fire-summary" || p.startsWith("/fire-summary/") },
  { href: "/cashflow-dashboard", label: "💸 Cashflow", isActive: (p) => p === "/cashflow-dashboard" || p.startsWith("/cashflow-dashboard/") },
  { href: "/expense-dashboard", label: "📑 Transactions", isActive: (p) => p === "/expense-dashboard" || p.startsWith("/expense-dashboard/") },
  {
    href: "/portfolio/investments",
    label: "💼 Assets",
    isActive: (p) => ASSET_MODULE_PATHS.some((h) => p === h || p.startsWith(`${h}/`)),
  },
  { href: "/portfolio/ai-insights", label: "🤖 AI Insights", isActive: (p) => p.startsWith("/portfolio/ai-insights") },
  { href: "/dashboard/settings", label: "⚙️ Settings", isActive: (p) => p.startsWith("/dashboard/settings") || p.startsWith("/dashboard/profile") },
] as const;

export type WealthDashboardShellBrand = {
  tagline: string;
  /** Tailwind gradient utility segment, e.g. `from-emerald-400 to-lime-400` */
  iconGradient: string;
};

type WealthDashboardShellProps = {
  brand: WealthDashboardShellBrand;
  /** Shown in the sidebar (desktop) and at the bottom of the mobile drawer */
  footerNote: ReactNode;
  children: React.ReactNode;
  /** Optional grouped nav below primary links; receives close to dismiss the mobile drawer */
  portfolioNav?: ReactNode | ((opts: { close: () => void }) => ReactNode);
  /** Wider sidebar when portfolio module nav is present */
  wideAside?: boolean;
};

function navLinkClasses(active: boolean, light: boolean) {
  const base =
    "flex min-h-[44px] items-center justify-center rounded-xl border px-3 py-2.5 text-xs font-semibold tracking-[-0.01em] transition-colors duration-200 active:scale-[0.99] sm:justify-start sm:text-[0.8125rem] sm:leading-snug";
  if (active) {
    return light
      ? `${base} border-emerald-400/55 bg-emerald-50 text-emerald-950`
      : `${base} border-emerald-400/35 bg-emerald-500/[0.12] text-white`;
  }
  return light
    ? `${base} border-transparent bg-white/55 text-slate-700 backdrop-blur-sm hover:border-emerald-200/70 hover:bg-emerald-50/90`
    : `${base} border-transparent bg-white/[0.04] text-zinc-300 backdrop-blur-sm hover:border-white/10 hover:bg-white/[0.06] hover:text-white`;
}

export function WealthDashboardShell({
  brand,
  footerNote,
  children,
  portfolioNav,
  wideAside,
}: WealthDashboardShellProps) {
  const pathname = usePathname();
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const [drawerOpen, setDrawerOpen] = useState(false);

  const close = useCallback(() => setDrawerOpen(false), []);

  useEffect(() => {
    queueMicrotask(() => {
      close();
    });
  }, [pathname, close]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const mq = window.matchMedia("(min-width: 1280px)");
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
    <main
      className={`portfolio-wealth-dash premium-shell relative min-h-screen pb-24 antialiased transition-[background-color,color] duration-300 ease-out max-xl:pb-[calc(5.75rem+env(safe-area-inset-bottom,0px))] xl:pb-10 ${
        light ? "bg-slate-100 text-slate-800" : "bg-[#011a14] text-zinc-100"
      }`}
    >
      <div className="wealth-dash-atmosphere wealth-dash-atmosphere-float pointer-events-none fixed inset-0" />

      <div className="relative mx-auto flex w-full max-w-[1840px] min-h-0 flex-col xl:flex-row xl:items-start 2xl:max-w-[1920px]">
        <header
          className={`wealth-dash-mobile-bar sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-emerald-400/10 px-4 py-3 backdrop-blur-xl xl:hidden ${
            light ? "bg-white/90" : "bg-[#021910]/90"
          }`}
        >
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-emerald-100 shadow-sm transition xl:hidden ${
                light
                  ? "border-slate-200/90 bg-white/90 text-emerald-900 hover:bg-slate-50"
                  : "border-emerald-400/20 bg-white/[0.06] hover:border-emerald-300/35 hover:bg-white/10"
              }`}
              aria-expanded={drawerOpen}
              aria-controls="wealth-dash-drawer"
              aria-label="Open navigation menu"
            >
              <Menu size={22} strokeWidth={2.25} />
            </button>
            <FireThemeToggle variant="header" />
          </div>
          <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
            <div
              className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${brand.iconGradient} text-emerald-950 shadow-sm`}
            >
              <Flame size={18} fill="currentColor" />
            </div>
            <div className="min-w-0 text-right">
              <p className={`truncate text-[0.8125rem] font-semibold tracking-[-0.03em] ${light ? "text-slate-900" : "text-white"}`}>
                FIRE Nepal
              </p>
              <p
                className={`truncate text-[9px] font-medium uppercase tracking-[0.2em] ${light ? "text-slate-500" : "text-zinc-400"}`}
              >
                {brand.tagline}
              </p>
            </div>
          </div>
        </header>

        <button
          type="button"
          className={`fixed inset-0 z-40 bg-black/55 backdrop-blur-[2px] transition-opacity duration-500 ease-out xl:hidden ${
            drawerOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
          }`}
          aria-hidden={!drawerOpen}
          tabIndex={drawerOpen ? 0 : -1}
          onClick={close}
        />

        <aside
          id="wealth-dash-drawer"
          className={`wealth-dash-aside wealth-dash-sidebar-shell fixed inset-y-0 left-0 z-50 flex w-[min(90vw,300px)] max-w-[100vw] flex-col transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform xl:static xl:z-auto xl:max-w-none ${
            wideAside ? "xl:w-[276px]" : "xl:w-[16.75rem]"
          } xl:translate-x-0 xl:border-b-0 xl:shrink-0 ${
            light
              ? "border-r border-emerald-200/55 bg-gradient-to-b from-white/98 via-white/95 to-emerald-50/40 text-slate-800 shadow-none backdrop-blur-xl xl:shadow-[2px_0_32px_-16px_rgba(16,185,129,0.1)]"
              : "border-r border-emerald-500/12 bg-gradient-to-b from-zinc-950/98 via-[#041a14]/96 to-black/92 text-zinc-100 shadow-[2px_0_28px_-12px_rgba(0,0,0,0.55)] backdrop-blur-xl"
          } ${
            drawerOpen ? "translate-x-0 shadow-2xl shadow-black/50" : "-translate-x-full xl:translate-x-0"
          } xl:sticky xl:top-0 xl:max-h-[min(100dvh,100svh)] xl:min-h-0 xl:overflow-hidden xl:flex xl:flex-col`}
        >
          <div
            className={`flex items-center justify-between gap-2 border-b px-4 py-3 xl:hidden ${
              light ? "border-emerald-200/50" : "border-emerald-400/10"
            }`}
          >
            <p
              className={`text-[11px] font-black uppercase tracking-[0.18em] ${
                light ? "text-slate-600" : "text-zinc-200"
              }`}
            >
              Navigate
            </p>
            <button
              type="button"
              onClick={close}
              className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border transition ${
                light
                  ? "border-slate-200/80 text-slate-700 hover:bg-slate-100"
                  : "border-emerald-400/20 text-emerald-100 hover:bg-white/10"
              }`}
              aria-label="Close menu"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex flex-1 flex-col gap-5 overflow-y-auto overscroll-contain p-4 xl:gap-6 xl:p-5">
            <div className="flex items-center gap-2 xl:flex-col xl:items-stretch xl:gap-3">
              <div className="flex items-center gap-2 xl:gap-3">
                <div
                  className={`relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br ${brand.iconGradient} text-emerald-950 shadow-sm shadow-emerald-900/20`}
                >
                  <Flame size={20} fill="currentColor" />
                </div>
                <div className="min-w-0 xl:text-left">
                  <p
                    className={`text-[0.8125rem] font-semibold tracking-[-0.03em] ${light ? "text-slate-900" : "text-white"}`}
                  >
                    FIRE Nepal
                  </p>
                  <p
                    className={`mt-0.5 text-[9px] font-medium uppercase leading-relaxed tracking-[0.2em] ${
                      light ? "text-slate-500" : "text-zinc-400"
                    }`}
                  >
                    {brand.tagline}
                  </p>
                </div>
              </div>
              <nav className="mt-1 flex flex-col gap-1.5 xl:mt-0">
                {NAV.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={navLinkClasses(item.isActive(pathname ?? ""), light)}
                    onClick={close}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
              {portfolioNav ? (
                <div className="mt-1 min-w-0 xl:mt-2">
                  {typeof portfolioNav === "function" ? portfolioNav({ close }) : portfolioNav}
                </div>
              ) : null}
            </div>
            <div
              className={`mt-auto space-y-3 border-t pt-4 text-[10px] font-bold leading-relaxed xl:border-t-0 xl:pt-0 ${
                light ? "border-emerald-200/60 text-slate-600" : "border-emerald-400/10 text-zinc-200"
              }`}
            >
              <div className="hidden xl:block">
                <FireThemeToggle variant="header" />
              </div>
              {footerNote}
            </div>
          </div>
        </aside>

        <div className="relative min-h-0 w-full min-w-0 flex-1 self-start px-4 py-5 sm:px-5 sm:py-6 lg:px-6 lg:py-7 xl:px-8 xl:py-7 2xl:px-9 2xl:py-8">
          {children}
        </div>
      </div>
    </main>
  );
}
