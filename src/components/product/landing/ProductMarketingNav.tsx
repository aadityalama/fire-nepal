"use client";

import { Flame, Lock, Menu } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { UserMenuDropdown } from "@/components/product/auth/UserMenuDropdown";
import { useProductAuth } from "@/contexts/ProductAuthContext";

const DESKTOP_LINKS: { href: string; label: string }[] = [
  { href: "#home", label: "Home" },
  { href: "#calculator", label: "FIRE Calculator" },
  { href: "#dashboard", label: "Dashboard" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "#investments", label: "Investments" },
  { href: "#learn", label: "Learn" },
  { href: "#community", label: "Community" },
];

export function ProductMarketingNav() {
  const { user } = useProductAuth();
  const [drawer, setDrawer] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setDrawer(false), []);

  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawer, close]);

  return (
    <>
      <nav className="product-nav-in sticky top-0 z-50 border-b border-white/40 bg-white/70 shadow-[0_10px_35px_rgba(0,63,47,0.07)] backdrop-blur-[18px] [-webkit-backdrop-filter:blur(18px)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/#home" className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-700 text-white shadow-lg shadow-emerald-900/20">
              <Flame size={22} fill="currentColor" />
            </div>
            <div>
              <p className="text-lg font-black tracking-tight text-emerald-950">FIRE NEPAL</p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700">Financial Independence</p>
            </div>
          </Link>

          <div className="hidden items-center gap-7 text-sm font-semibold text-slate-700 lg:flex">
            {DESKTOP_LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="transition hover:text-emerald-800">
                {l.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <span
              className="hidden items-center gap-1.5 rounded-full border border-emerald-200/80 bg-white/90 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-emerald-800 shadow-sm md:inline-flex"
              title="Encrypted connection · privacy-first"
            >
              <Lock size={12} className="shrink-0 text-emerald-600" aria-hidden />
              Secure
            </span>
            <span className="hidden rounded-full border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 sm:inline-block">
              KR / EN / NP
            </span>
            {user ? (
              <UserMenuDropdown variant="light" />
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden rounded-full border border-emerald-200/80 bg-white/80 px-4 py-2 text-sm font-black text-emerald-900 shadow-sm transition hover:bg-emerald-50 sm:inline-block"
                >
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  className="glow-button rounded-full bg-emerald-700 px-4 py-2.5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-emerald-800"
                >
                  Sign up
                </Link>
              </>
            )}
            <button
              type="button"
              className="rounded-xl border border-emerald-100/80 p-2.5 text-emerald-900 lg:hidden"
              aria-label="Open menu"
              onClick={() => setDrawer(true)}
            >
              <Menu size={22} />
            </button>
          </div>
        </div>
      </nav>

      {drawer ? (
        <div className="fixed inset-0 z-[200] lg:hidden" role="dialog" aria-modal>
          <button type="button" className="absolute inset-0 bg-black/50 backdrop-blur-sm" aria-label="Close menu" onClick={close} />
          <div
            ref={drawerRef}
            className="absolute right-0 top-0 flex h-full w-[min(88vw,320px)] flex-col border-l border-emerald-100/60 bg-white/95 p-5 shadow-2xl backdrop-blur-xl animate-fade-up"
          >
            <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">Navigate</p>
            <div className="mt-4 flex flex-col gap-1">
              {DESKTOP_LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="rounded-xl px-3 py-3 text-sm font-bold text-emerald-950 hover:bg-emerald-50"
                  onClick={close}
                >
                  {l.label}
                </Link>
              ))}
              <Link href="/hub" className="rounded-xl px-3 py-3 text-sm font-black text-emerald-700 hover:bg-emerald-50" onClick={close}>
                Product hub →
              </Link>
            </div>
            <div className="mt-auto space-y-2 border-t border-emerald-100/80 pt-4">
              {user ? (
                <Link
                  href="/dashboard/security"
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 py-3 text-sm font-black text-emerald-900 transition hover:bg-emerald-50"
                  onClick={close}
                >
                  <Lock size={16} className="text-emerald-600" aria-hidden />
                  Security center
                </Link>
              ) : null}
              {!user ? (
                <>
                  <Link
                    href="/login"
                    className="flex w-full items-center justify-center rounded-xl border border-emerald-200 py-3 text-sm font-black text-emerald-900 transition hover:bg-emerald-50"
                    onClick={close}
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/signup"
                    className="flex w-full items-center justify-center rounded-xl bg-emerald-700 py-3 text-sm font-black text-white transition hover:bg-emerald-800"
                    onClick={close}
                  >
                    Create account
                  </Link>
                  <p className="text-center text-[10px] font-semibold text-zinc-500">Secure pages · optional quick modal from hub</p>
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
