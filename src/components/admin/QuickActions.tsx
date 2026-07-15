"use client";

import { Bot, Download, Mail, MessageSquareHeart, Receipt, Users } from "lucide-react";
import Link from "next/link";

const ACTIONS = [
  { href: "/admin/members", label: "Members", icon: Users },
  { href: "/admin/membership-requests", label: "Membership Payments", icon: Receipt },
  { href: "/admin/ai-analytics", label: "AI Analytics", icon: Bot },
  { href: "/admin/reviews", label: "Reviews", icon: MessageSquareHeart },
  { href: "/admin/members?filter=expiring_soon", label: "Reminder Center", icon: Mail },
  { href: "#export-center", label: "Export Center", icon: Download, hash: true },
] as const;

export function QuickActions() {
  return (
    <section>
      <h2 className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-200/45">Quick actions</h2>
      <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          const className =
            "group flex aspect-square flex-col items-center justify-center gap-1.5 rounded-xl border border-white/[0.08] bg-gradient-to-br from-white/[0.05] to-transparent px-2 text-center shadow-[0_0_0_1px_rgba(16,185,129,0.05)] backdrop-blur-xl transition duration-200 hover:-translate-y-0.5 hover:border-emerald-500/30 hover:bg-emerald-500/[0.07] hover:shadow-[0_8px_24px_-12px_rgba(16,185,129,0.35)]";

          if ("hash" in action && action.hash) {
            return (
              <a key={action.label} href={action.href} className={className}>
                <span className="grid h-8 w-8 place-items-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-300 transition group-hover:bg-emerald-500/18">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="text-[10px] font-bold leading-tight text-zinc-200 sm:text-[11px]">{action.label}</span>
              </a>
            );
          }

          return (
            <Link key={action.label} href={action.href} className={className}>
              <span className="grid h-8 w-8 place-items-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-300 transition group-hover:bg-emerald-500/18">
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <span className="text-[10px] font-bold leading-tight text-zinc-200 sm:text-[11px]">{action.label}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
