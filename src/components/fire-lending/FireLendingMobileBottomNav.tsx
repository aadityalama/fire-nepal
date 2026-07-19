"use client";

import { CreditCard, Home, Inbox, Landmark, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useFireTheme } from "@/contexts/FireThemeContext";

const NAV = [
  { href: "/fire-lending", label: "Dashboard", icon: Home, match: (p: string) => p === "/fire-lending" },
  {
    href: "/fire-lending/loans",
    label: "Loans",
    icon: Landmark,
    match: (p: string) =>
      p.startsWith("/fire-lending/loans") ||
      p.startsWith("/fire-lending/borrowed") ||
      p.startsWith("/fire-lending/lent") ||
      p.startsWith("/fire-lending/new"),
  },
  {
    href: "/fire-lending/requests",
    label: "Requests",
    icon: Inbox,
    match: (p: string) => p.startsWith("/fire-lending/requests"),
  },
  {
    href: "/fire-lending/payments",
    label: "Payments",
    icon: CreditCard,
    match: (p: string) => p.startsWith("/fire-lending/payments") || p.startsWith("/fire-lending/installments"),
  },
  {
    href: "/fire-lending/more",
    label: "More",
    icon: MoreHorizontal,
    match: (p: string) =>
      p.startsWith("/fire-lending/more") ||
      p.startsWith("/fire-lending/borrowers") ||
      p.startsWith("/fire-lending/lenders") ||
      p.startsWith("/fire-lending/agreements") ||
      p.startsWith("/fire-lending/analytics") ||
      p.startsWith("/fire-lending/trust-score") ||
      p.startsWith("/fire-lending/documents") ||
      p.startsWith("/fire-lending/settings"),
  },
];

export function FireLendingMobileBottomNav() {
  const pathname = usePathname() ?? "";
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";

  return (
    <nav
      className={`fixed inset-x-0 bottom-0 z-40 border-t px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl lg:hidden ${
        light ? "border-emerald-200/60 bg-white/95" : "border-emerald-400/15 bg-[#030806]/92"
      }`}
      aria-label="Loan & P2P navigation"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-between gap-1">
        {NAV.map((item) => {
          const active = item.match(pathname);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                data-testid={`fire-lending-nav-${item.label.toLowerCase()}`}
                className={`flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[10px] font-black transition ${
                  active
                    ? light
                      ? "bg-emerald-100 text-emerald-900"
                      : "bg-gradient-to-b from-emerald-500/25 to-lime-400/10 text-lime-200"
                    : light
                      ? "text-slate-600"
                      : "text-emerald-200/65"
                }`}
              >
                <item.icon size={18} strokeWidth={active ? 2.4 : 2} />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
