"use client";

import { Bot, Home, LineChart, SlidersHorizontal, Star } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  {
    href: "/market",
    label: "Hub",
    icon: Home,
    match: (path: string) => path === "/market",
  },
  {
    href: "/market/terminal",
    label: "Terminal",
    icon: LineChart,
    match: (path: string) =>
      path.startsWith("/market/terminal") ||
      path.startsWith("/market/top-") ||
      path.startsWith("/market/live-") ||
      path.startsWith("/market/sector") ||
      path.startsWith("/market/heat") ||
      path.startsWith("/market/floorsheet") ||
      path.startsWith("/market/market-") ||
      path.startsWith("/market/corporate") ||
      path.startsWith("/market/ipo") ||
      path.startsWith("/market/company") ||
      path.startsWith("/market/breadth") ||
      path.startsWith("/market/top-brokers"),
  },
  {
    href: "/market/screener",
    label: "Screener",
    icon: SlidersHorizontal,
    match: (path: string) => path.startsWith("/market/screener"),
  },
  {
    href: "/market/watchlist",
    label: "Watchlist",
    icon: Star,
    match: (path: string) => path.startsWith("/market/watchlist"),
  },
  {
    href: "/market/ai-assistant",
    label: "AI",
    icon: Bot,
    match: (path: string) => path.startsWith("/market/ai-assistant"),
  },
] as const;

/** Premium mobile bottom navigation for the NEPSE Hub module. */
export function NepseHubBottomNav() {
  const pathname = usePathname() ?? "/market";

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[60] border-t border-emerald-200/70 bg-white/95 px-1.5 pb-[max(0.45rem,env(safe-area-inset-bottom,0px))] pt-2 shadow-[0_-18px_40px_-28px_rgba(5,46,34,0.45)] backdrop-blur-xl dark:border-emerald-400/15 dark:bg-[#04140f]/95 dark:shadow-[0_-18px_40px_-28px_rgba(0,0,0,0.85)] lg:hidden"
      aria-label="NEPSE Hub navigation"
    >
      <div className="mx-auto flex max-w-lg justify-between gap-0.5">
        {NAV.map((item) => {
          const active = item.match(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              data-testid={`nepse-nav-${item.label.toLowerCase()}`}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-[56px] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-0.5 py-1 text-center transition duration-300 ${
                active
                  ? "bg-emerald-50 text-emerald-800 shadow-sm shadow-emerald-500/10 dark:bg-emerald-500/15 dark:text-lime-300 dark:shadow-emerald-500/15"
                  : "text-slate-500 hover:bg-emerald-50/80 hover:text-emerald-700 dark:text-zinc-500 dark:hover:bg-white/[0.04] dark:hover:text-emerald-200"
              }`}
            >
              <item.icon size={20} strokeWidth={active ? 2.4 : 2} aria-hidden />
              <span className="line-clamp-1 w-full text-[9px] font-black uppercase leading-tight tracking-tight">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
