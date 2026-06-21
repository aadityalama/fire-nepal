"use client";

import { Home, LayoutGrid, MoreHorizontal, Package, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useFireBizCopy } from "@/contexts/FireBizContext";
import { useFireTheme } from "@/contexts/FireThemeContext";
import type { FireBizMobileNavKey } from "@/lib/fire-biz/types";

const MOBILE_NAV: {
  href: string;
  labelKey: FireBizMobileNavKey;
  icon: typeof Home;
  match: (p: string) => boolean;
}[] = [
  { href: "/fire-biz", labelKey: "home", icon: Home, match: (p) => p === "/fire-biz" },
  {
    href: "/fire-biz/transactions",
    labelKey: "transactions",
    icon: LayoutGrid,
    match: (p) =>
      p.startsWith("/fire-biz/transactions") ||
      p.startsWith("/fire-biz/sales") ||
      p.startsWith("/fire-biz/purchases") ||
      p.startsWith("/fire-biz/cash-bank"),
  },
  {
    href: "/fire-biz/parties",
    labelKey: "parties",
    icon: Users,
    match: (p) =>
      p.startsWith("/fire-biz/parties") ||
      p.startsWith("/fire-biz/customers") ||
      p.startsWith("/fire-biz/suppliers"),
  },
  { href: "/fire-biz/inventory", labelKey: "inventory", icon: Package, match: (p) => p.startsWith("/fire-biz/inventory") },
  {
    href: "/fire-biz/more",
    labelKey: "more",
    icon: MoreHorizontal,
    match: (p) =>
      p.startsWith("/fire-biz/more") ||
      p.startsWith("/fire-biz/reports") ||
      p.startsWith("/fire-biz/settings") ||
      p.startsWith("/fire-biz/credit-reminders"),
  },
];

export function FireBizMobileBottomNav() {
  const pathname = usePathname();
  const copy = useFireBizCopy();
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const labels = copy.mobileNav;

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 z-50 border-t px-1 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] pt-2 backdrop-blur-xl lg:hidden ${
        light ? "border-emerald-200/70 bg-white/95" : "border-emerald-400/15 bg-[#04140f]/95"
      }`}
      aria-label="FIRE Biz navigation"
    >
      <div className="mx-auto flex max-w-lg justify-between gap-0.5">
        {MOBILE_NAV.map((item) => {
          const active = item.match(pathname ?? "");
          return (
            <Link
              key={item.href}
              href={item.href}
              data-testid={`fire-biz-nav-${item.labelKey}`}
              className={`flex min-h-[56px] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-0.5 py-1 text-center transition duration-300 ${
                active
                  ? light
                    ? "bg-emerald-50 text-emerald-800 shadow-sm shadow-emerald-500/10"
                    : "bg-emerald-500/15 text-lime-300 shadow-sm shadow-emerald-500/15"
                  : light
                    ? "text-slate-500 hover:bg-emerald-50/80 hover:text-emerald-700"
                    : "text-zinc-500 hover:bg-white/[0.04] hover:text-emerald-200"
              }`}
            >
              <item.icon size={20} strokeWidth={active ? 2.4 : 2} />
              <span className="line-clamp-2 w-full text-[9px] font-black uppercase leading-tight tracking-tight">
                {labels[item.labelKey]}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
