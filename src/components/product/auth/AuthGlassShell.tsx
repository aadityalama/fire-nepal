"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Flame } from "lucide-react";

type AuthGlassShellProps = {
  children: ReactNode;
  /** Larger max width for signup with avatar */
  wide?: boolean;
};

export function AuthGlassShell({ children, wide }: AuthGlassShellProps) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#030806] px-4 py-10 text-zinc-100 sm:px-6 sm:py-14">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(16,185,129,0.25),transparent_55%),radial-gradient(circle_at_100%_50%,rgba(52,211,153,0.08),transparent_45%),radial-gradient(circle_at_0%_80%,rgba(16,185,129,0.06),transparent_40%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:48px_48px]" />

      <div className={`relative mx-auto w-full ${wide ? "max-w-lg" : "max-w-md"}`}>
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2.5 text-sm font-black text-emerald-200/90 transition hover:text-white motion-safe:hover:translate-x-0.5"
        >
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-lime-400 text-emerald-950 shadow-lg shadow-emerald-500/30 ring-1 ring-white/20">
            <Flame size={20} />
          </span>
          <span>FIRE Nepal</span>
        </Link>

        <div className="animate-fade-up">{children}</div>
      </div>
    </main>
  );
}
