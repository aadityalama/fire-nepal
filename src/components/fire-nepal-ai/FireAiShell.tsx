"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { FireNepalMainBottomNav } from "@/components/navigation/FireNepalMainBottomNav";
import { useFireTheme } from "@/contexts/FireThemeContext";

const PAGE_TITLES: Record<string, string> = {
  "/fire-ai": "FIRE AI",
  "/fire-ai/chat": "Ask FIRE AI",
  "/fire-ai/expense-insights": "Expense Insights",
  "/fire-ai/fire-guidance": "FIRE Guidance",
  "/fire-ai/wealth-summary": "Wealth Summary",
};

type FireAiShellProps = {
  children: ReactNode;
  hideBack?: boolean;
};

export function FireAiShell({ children, hideBack }: FireAiShellProps) {
  const pathname = usePathname();
  const light = useFireTheme().resolvedTheme === "light";
  const title = PAGE_TITLES[pathname] ?? "FIRE AI";
  const showBack = !hideBack && pathname !== "/fire-ai";

  return (
    <div
      className={`flex min-h-screen flex-col pb-28 ${
        light ? "bg-[#f4fbf6] text-slate-900" : "bg-[#030806] text-zinc-100"
      }`}
    >
      <header
        className={`sticky top-0 z-30 border-b backdrop-blur-xl ${
          light ? "border-emerald-200/60 bg-white/90" : "border-emerald-400/10 bg-[#04140f]/95"
        }`}
      >
        <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3.5 sm:max-w-2xl">
          {showBack ? (
            <Link
              href="/fire-ai"
              className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl transition active:scale-95 ${
                light ? "text-emerald-800 hover:bg-emerald-50" : "text-emerald-200 hover:bg-white/10"
              }`}
              aria-label="Back to FIRE AI home"
            >
              <ArrowLeft size={20} />
            </Link>
          ) : (
            <div className="w-11 shrink-0" />
          )}
          <h1 className={`flex-1 text-center text-base font-black tracking-tight ${light ? "text-slate-900" : "text-white"}`}>
            {title}
          </h1>
          <div className="w-11 shrink-0" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-4 sm:max-w-2xl sm:py-5">{children}</main>

      <FireNepalMainBottomNav />
    </div>
  );
}
