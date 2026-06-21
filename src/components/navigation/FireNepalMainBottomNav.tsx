"use client";

import { Banknote, Briefcase, Home, LayoutGrid, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useFireTheme } from "@/contexts/FireThemeContext";
import { FIRE_BIZ_I18N } from "@/lib/fire-biz/i18n";

const MAIN_NAV = [
  { href: "/hub", labelKey: "home" as const, icon: Home, match: (p: string) => p === "/hub" || p === "/account" },
  { href: "/cashflow-dashboard", labelKey: "finance" as const, icon: Banknote, match: (p: string) => p.startsWith("/cashflow") || p.startsWith("/expense-dashboard") || p.startsWith("/savings-tracker") },
  { href: "/portfolio", labelKey: "portfolio" as const, icon: Briefcase, match: (p: string) => p.startsWith("/portfolio") || p.startsWith("/return-to-nepal") || p.startsWith("/fire-summary") },
  { href: "/fire-biz", labelKey: "fireBiz" as const, icon: LayoutGrid, match: (p: string) => p.startsWith("/fire-biz") },
  { href: "/more", labelKey: "more" as const, icon: MoreHorizontal, match: (p: string) => p === "/more" || p.startsWith("/dashboard") || p.startsWith("/family") || p.startsWith("/smart-reminders") || p.startsWith("/admin") },
];

type FireNepalMainBottomNavProps = {
  locale?: "en" | "ne";
};

export function FireNepalMainBottomNav({ locale = "en" }: FireNepalMainBottomNavProps) {
  const pathname = usePathname();
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const labels = FIRE_BIZ_I18N[locale].mainNav;

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 z-50 max-w-[100vw] overflow-x-clip border-t px-1 pb-[max(0.35rem,env(safe-area-inset-bottom,0px))] pt-1.5 backdrop-blur-xl lg:hidden ${
        light ? "border-emerald-200/60 bg-white/95" : "border-emerald-400/15 bg-[#04140f]/95"
      }`}
      aria-label="Main navigation"
    >
      <div className="mx-auto flex min-w-0 max-w-lg justify-between gap-0.5">
        {MAIN_NAV.map((item) => {
          const active = item.match(pathname ?? "");
          return (
            <Link
              key={item.href}
              href={item.href}
              title={labels[item.labelKey]}
              aria-label={
                item.labelKey === "fireBiz"
                  ? `${labels.fireBiz} — ${FIRE_BIZ_I18N[locale].moduleTagline}`
                  : labels[item.labelKey]
              }
              data-testid={`main-nav-${item.labelKey}`}
              className={`flex min-h-[52px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 py-1 text-center transition ${
                active
                  ? light
                    ? "bg-emerald-50 text-emerald-700 shadow-sm shadow-emerald-500/10"
                    : "bg-emerald-500/10 text-lime-300 shadow-sm shadow-emerald-500/10"
                  : light
                    ? "text-slate-500 hover:bg-emerald-50/80 hover:text-emerald-600"
                    : "text-zinc-500 hover:bg-white/[0.04] hover:text-emerald-200"
              }`}
            >
              <item.icon size={18} strokeWidth={active ? 2.4 : 2} className="shrink-0" />
              <span className="line-clamp-2 w-full max-w-full break-words text-[9px] font-black uppercase leading-tight tracking-tight">
                {labels[item.labelKey]}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function mainNavActive(href: string, pathname: string | null): boolean {
  const item = MAIN_NAV.find((n) => n.href === href);
  if (!item || !pathname) return false;
  return item.match(pathname);
}
