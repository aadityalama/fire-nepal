import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { requireAdminUserId } from "@/lib/admin/require-admin";

export const metadata: Metadata = {
  title: "Admin | FIRE Nepal",
  description: "Restricted operations dashboard for FIRE Nepal.",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdminUserId();

  return (
    <div className="min-h-screen bg-[#020806] text-zinc-100 antialiased">
      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#020806]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="shrink-0 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-emerald-300">
              Admin
            </span>
            <Link href="/admin" className="truncate text-sm font-black text-white sm:text-base">
              FIRE Nepal Control Room
            </Link>
          </div>
          <nav className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin/members"
              className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-100 transition hover:bg-emerald-500/18"
            >
              Members
            </Link>
            <Link
              href="/admin/membership-requests"
              className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-100 transition hover:bg-emerald-500/18"
            >
              Membership payments
            </Link>
            <Link
              href="/hub"
              className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-emerald-100 transition hover:bg-white/[0.07]"
            >
              Exit to Hub
            </Link>
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8">{children}</div>
    </div>
  );
}
