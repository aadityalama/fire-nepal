"use client";

import { Flame, Lock, Menu } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { LanguageSelector } from "@/components/LanguageSelector";
import { UserMenuDropdown } from "@/components/product/auth/UserMenuDropdown";
import { useHomepageLanguage } from "@/contexts/HomepageLanguageContext";
import { useProductAuth } from "@/contexts/ProductAuthContext";

export function ProductMarketingNav() {
  const { user } = useProductAuth();
  const { copy } = useHomepageLanguage();
  const router = useRouter();
  const [drawer, setDrawer] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const navCopy = copy.nav;

  const close = useCallback(() => setDrawer(false), []);
  const openSecurityCenter = useCallback(() => {
    setDrawer(false);
    router.push("/security");
  }, [router]);

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
      <nav className="product-nav-in sticky top-0 z-50 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3.5 sm:px-6 lg:px-8">
          <Link href="/#home" className="group flex min-w-0 shrink-0 items-center gap-2 sm:gap-3" aria-label="FIRE Nepal home">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7CFFB3] via-[#39E58C] to-[#149B5F] shadow-[0_0_25px_rgba(57,229,140,0.45)] sm:h-14 sm:w-14">
              <Flame className="h-5 w-5 fill-white text-white sm:h-7 sm:w-7" strokeWidth={2.6} aria-hidden />
            </span>
            <div className="min-w-0 leading-none">
              <p className="whitespace-nowrap text-base font-black uppercase tracking-[-0.035em] text-black sm:text-2xl">
                FIRE NEPAL
              </p>
              <p className="mt-1 whitespace-nowrap text-[0.45rem] font-semibold uppercase tracking-[0.24em] text-slate-500 sm:text-[0.63rem] sm:tracking-[0.34em]">
                {navCopy.financialIndependence}
              </p>
            </div>
          </Link>

          <div className="hidden items-center gap-6 text-sm font-semibold text-slate-700 lg:flex xl:gap-7">
            {navCopy.links.map((l) => (
              <Link key={l.href} href={l.href} className="whitespace-nowrap transition hover:text-emerald-800">
                {l.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              className="group hidden cursor-pointer items-center gap-1.5 rounded-full border border-emerald-300/70 bg-white/80 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-emerald-900 shadow-[0_10px_28px_rgba(0,122,61,0.1)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-50/90 hover:text-emerald-950 hover:shadow-[0_18px_40px_rgba(16,185,129,0.22),0_0_0_6px_rgba(16,185,129,0.08)] focus:outline-none focus:ring-4 focus:ring-emerald-200/70 md:inline-flex"
              title="Encrypted connection · privacy-first"
              onClick={openSecurityCenter}
            >
              <Lock size={12} className="shrink-0 text-emerald-600 transition group-hover:scale-110 group-hover:text-emerald-500" aria-hidden />
              {navCopy.secure}
            </button>
            <LanguageSelector />
            {user ? (
              <UserMenuDropdown variant="light" />
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden rounded-full border border-emerald-200/80 bg-white/80 px-4 py-2 text-sm font-black text-emerald-900 shadow-sm transition hover:bg-emerald-50 sm:inline-block"
                >
                  {navCopy.signIn}
                </Link>
                <Link
                  href="/signup"
                  className="rounded-full bg-emerald-700 px-3.5 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-emerald-800 sm:px-4"
                >
                  {navCopy.signUp}
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
            <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">{navCopy.navigate}</p>
            <div className="mt-4 flex flex-col gap-1">
              {navCopy.links.map((l) => (
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
                {navCopy.productHub} →
              </Link>
            </div>
            <div className="mt-auto space-y-2 border-t border-emerald-100/80 pt-4">
              <button
                type="button"
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white/70 py-3 text-sm font-black text-emerald-900 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-emerald-50 hover:shadow-[0_14px_30px_rgba(16,185,129,0.16)] focus:outline-none focus:ring-4 focus:ring-emerald-100"
                onClick={openSecurityCenter}
              >
                <Lock size={16} className="text-emerald-600" aria-hidden />
                {navCopy.securityCenter}
              </button>
              {!user ? (
                <>
                  <Link
                    href="/login"
                    className="flex w-full items-center justify-center rounded-xl border border-emerald-200 py-3 text-sm font-black text-emerald-900 transition hover:bg-emerald-50"
                    onClick={close}
                  >
                    {navCopy.signIn}
                  </Link>
                  <Link
                    href="/signup"
                    className="flex w-full items-center justify-center rounded-xl bg-emerald-700 py-3 text-sm font-black text-white transition hover:bg-emerald-800"
                    onClick={close}
                  >
                    {navCopy.createAccount}
                  </Link>
                  <p className="text-center text-[10px] font-semibold text-zinc-500">{navCopy.securePagesNote}</p>
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
