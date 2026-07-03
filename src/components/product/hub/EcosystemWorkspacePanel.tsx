"use client";

import { ArrowRight, Flame, LayoutGrid } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserMenuDropdown } from "@/components/product/auth/UserMenuDropdown";
import { useFireTheme } from "@/contexts/FireThemeContext";

export type EcosystemWorkspaceItem = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
};

type EcosystemWorkspacePanelProps = {
  title: string;
  eyebrow: string;
  description: string;
  items: EcosystemWorkspaceItem[];
};

function activeFor(href: string, pathname: string | null) {
  if (!pathname) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function EcosystemWorkspacePanel({ title, eyebrow, description, items }: EcosystemWorkspacePanelProps) {
  const pathname = usePathname();
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";

  const eyebrowCls = light ? "text-emerald-700/85" : "text-emerald-200/55";
  const titleCls = light ? "text-slate-900" : "text-white";
  const subtitleCls = light ? "text-slate-600" : "text-emerald-100/65";

  return (
    <div
      className={`flex min-h-screen max-w-[100vw] overflow-x-clip ${
        light ? "bg-slate-100 text-slate-900" : "bg-[#030806] text-zinc-100"
      }`}
    >
      <aside
        className={`hidden w-64 shrink-0 border-r px-3 py-6 backdrop-blur-xl lg:flex lg:flex-col ${
          light ? "border-emerald-200/60 bg-white/95" : "border-emerald-400/10 bg-[#04140f]/95"
        }`}
      >
        <Link href="/hub" className={`mb-6 flex items-center gap-2 px-1 font-black tracking-tight ${titleCls}`}>
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-lime-400 text-emerald-950 shadow-lg shadow-emerald-500/25">
            <Flame size={20} />
          </span>
          <span className="text-sm">FIRE Nepal</span>
        </Link>
        <p className={`mb-3 px-2 text-[10px] font-black uppercase tracking-[0.16em] ${eyebrowCls}`}>{title}</p>
        <nav className="flex flex-col gap-1">
          {items.map((item) => {
            const active = activeFor(item.href, pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition active:scale-[0.99] ${
                  active
                    ? light
                      ? "bg-emerald-100 text-emerald-900"
                      : "bg-gradient-to-r from-emerald-500/90 to-lime-400/90 text-emerald-950 shadow-lg shadow-emerald-500/20"
                    : light
                      ? "text-slate-700 hover:bg-emerald-50 hover:text-slate-900"
                      : "text-emerald-100/80 hover:bg-white/[0.06] hover:text-white"
                }`}
              >
                <item.icon size={18} className="shrink-0 opacity-90" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className={`sticky top-0 z-40 flex min-w-0 max-w-full items-center justify-between gap-2 border-b px-4 py-3 backdrop-blur-xl sm:gap-3 ${
            light ? "border-emerald-200/60 bg-white/90" : "border-emerald-400/10 bg-[#030806]/90"
          }`}
        >
          <Link href="/hub" className="flex min-w-0 max-w-[min(100%,12rem)] items-center gap-2">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-400 to-lime-400 text-emerald-950">
              <LayoutGrid size={18} />
            </span>
            <span className={`truncate text-sm font-black tracking-tight ${titleCls}`}>Hub</span>
          </Link>
          <UserMenuDropdown variant={light ? "light" : "dark"} />
        </header>

        <main className="min-w-0 max-w-full flex-1 overflow-x-clip px-4 py-6 pb-28 sm:px-6 lg:pb-10">
          <div className="mx-auto max-w-6xl space-y-5 animate-fade-up">
            <div>
              <p className={`text-[11px] font-black uppercase tracking-[0.2em] ${eyebrowCls}`}>{eyebrow}</p>
              <h1 className={`mt-1.5 text-2xl font-black tracking-tight sm:text-3xl ${titleCls}`}>{title}</h1>
              <p className={`mt-1.5 max-w-2xl text-sm font-medium leading-relaxed ${subtitleCls}`}>{description}</p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group relative flex min-h-[112px] touch-manipulation flex-col justify-between overflow-hidden rounded-2xl border p-4 transition duration-200 active:scale-[0.98] sm:min-h-[120px] sm:p-5 ${
                    light
                      ? "border-emerald-200/80 bg-white/95 shadow-[0_12px_40px_-24px_rgba(15,23,42,0.12)] hover:border-emerald-400/50"
                      : "border-emerald-400/15 bg-emerald-950/35 shadow-[0_20px_60px_rgba(0,0,0,0.35)] hover:border-emerald-300/35"
                  }`}
                >
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/25 to-lime-400/10 opacity-90" aria-hidden />
                  <div className="relative z-10 flex items-start justify-between gap-2">
                    <span
                      className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border ${
                        light ? "border-emerald-200/80 bg-emerald-50 text-emerald-700" : "border-white/10 bg-black/30 text-lime-200"
                      }`}
                    >
                      <item.icon size={22} strokeWidth={2.1} />
                    </span>
                    <ArrowRight size={18} className={`shrink-0 opacity-60 ${light ? "text-emerald-700" : "text-lime-300"}`} />
                  </div>
                  <div className="relative z-10 mt-3 min-w-0">
                    <h2 className={`text-base font-black leading-tight sm:text-lg ${titleCls}`}>{item.label}</h2>
                    <p className={`mt-1 line-clamp-2 text-xs font-semibold leading-snug sm:text-sm ${subtitleCls}`}>{item.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
