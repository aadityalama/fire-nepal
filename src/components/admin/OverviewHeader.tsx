"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin", label: "Overview", match: (p: string) => p === "/admin" },
  { href: "/admin/members", label: "Members", match: (p: string) => p.startsWith("/admin/members") },
  {
    href: "/admin/membership-requests",
    label: "Membership Payments",
    match: (p: string) => p.startsWith("/admin/membership-requests"),
  },
  {
    href: "/admin/ai-analytics",
    label: "AI Analytics",
    match: (p: string) => p.startsWith("/admin/ai-analytics"),
  },
  { href: "/admin/reviews", label: "Reviews", match: (p: string) => p.startsWith("/admin/reviews") },
] as const;

export function OverviewHeader() {
  const pathname = usePathname() || "/admin";

  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#020806]/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-2.5 px-3 py-2.5 sm:px-5 sm:py-3">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="shrink-0 rounded-md border border-emerald-500/35 bg-emerald-500/12 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.16em] text-emerald-300">
              Admin
            </span>
            <Link href="/admin" className="truncate text-sm font-black tracking-tight text-white sm:text-[15px]">
              FIRE Nepal Control Room
            </Link>
          </div>
          <Link
            href="/hub"
            className="shrink-0 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-[11px] font-bold text-zinc-300 transition hover:bg-white/[0.06] hover:text-white"
          >
            Exit
          </Link>
        </div>

        <nav className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TABS.map((tab) => {
            const active = tab.match(pathname);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition sm:text-xs ${
                  active
                    ? "bg-emerald-500/18 text-emerald-100 shadow-[inset_0_0_0_1px_rgba(52,211,153,0.28)]"
                    : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
