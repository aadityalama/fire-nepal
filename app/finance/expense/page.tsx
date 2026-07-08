"use client";

import { ArrowLeft, BarChart3, Bell, CalendarDays, FileText, ReceiptText, Sparkles } from "lucide-react";
import Link from "next/link";
import { DashboardAccessGuard } from "@/components/auth/DashboardAccessGuard";
import { useFireTheme } from "@/contexts/FireThemeContext";

const WORKSPACE_FEATURES: Array<{
  href: string;
  label: string;
  description: string;
  icon: typeof ReceiptText;
  primary?: boolean;
}> = [
  {
    href: "/expense-dashboard?finance=personal&view=expenses",
    label: "Open Expense Workspace",
    description: "Track expenses, bills, reminders and upcoming payments.",
    icon: ReceiptText,
    primary: true,
  },
  {
    href: "/expense-dashboard?finance=personal&view=analytics",
    label: "Analytics",
    description: "Monthly spending, category breakdown, and trends.",
    icon: BarChart3,
  },
  {
    href: "/expense-dashboard?finance=personal&view=reports",
    label: "Reports",
    description: "Expense history and export reports.",
    icon: FileText,
  },
  {
    href: "/budget",
    label: "Budget",
    description: "Plan monthly budgets for personal FIRE cashflow.",
    icon: CalendarDays,
  },
] ;

export default function FinanceExpenseWorkspacePage() {
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";

  return (
    <DashboardAccessGuard>
      <main
        className={`min-h-screen px-4 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] pt-[calc(0.85rem+env(safe-area-inset-top,0px))] sm:px-6 lg:px-8 ${
          light ? "bg-[#06291f] text-white" : "bg-[#020806] text-white"
        }`}
      >
        <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
          <div className="absolute -left-24 top-8 h-72 w-72 rounded-full bg-emerald-400/18 blur-3xl" />
          <div className="absolute -right-24 top-52 h-80 w-80 rounded-full bg-lime-300/12 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-lg space-y-4 lg:max-w-3xl">
          <Link
            href="/finance"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 text-sm font-black text-emerald-50 backdrop-blur-xl"
          >
            <ArrowLeft size={17} /> Finance
          </Link>

          <section>
            <div className="inline-flex items-center gap-2 rounded-full border border-lime-300/20 bg-lime-300/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-lime-100">
              <Sparkles size={13} /> Premium workspace
            </div>
            <h1 className="mt-3 text-[2.2rem] font-black tracking-[-0.05em] text-white sm:text-5xl">Expense</h1>
            <p className="mt-2 max-w-xl text-sm font-semibold leading-relaxed text-emerald-100/58">
              Track expenses, bills, reminders and upcoming payments.
            </p>
          </section>

          <section className="grid gap-3">
            {WORKSPACE_FEATURES.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-[1.5rem] border p-4 backdrop-blur-xl transition active:scale-[0.99] ${
                    item.primary
                      ? "border-emerald-200/15 bg-gradient-to-br from-emerald-500/24 via-emerald-950/88 to-[#03110d] shadow-[0_24px_80px_-40px_rgba(16,185,129,0.55)]"
                      : "border-white/10 bg-white/[0.06]"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${item.primary ? "bg-lime-300 text-emerald-950" : "bg-emerald-300/12 text-lime-200"}`}>
                      <Icon size={20} />
                    </span>
                    <div className="min-w-0">
                      <h2 className="text-base font-black text-white">{item.label}</h2>
                      <p className="mt-1 text-sm font-semibold leading-relaxed text-emerald-100/58">{item.description}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </section>

          <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.055] p-4 backdrop-blur-xl">
            <div className="flex items-center gap-2">
              <Bell size={16} className="text-lime-200" />
              <p className="text-sm font-black text-white">Smart reminders & notifications</p>
            </div>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-emerald-100/58">
              Due dates, payment reminders, in-app notifications, and email reminder previews — all inside the Expense Workspace.
            </p>
          </section>
        </div>
      </main>
    </DashboardAccessGuard>
  );
}
