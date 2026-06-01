"use client";

import { Flame, LayoutGrid, PanelLeft, PanelLeftClose } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useCallback, useState } from "react";
import { FireThemeToggle } from "@/components/dashboard/FireThemeToggle";
import { SmartRemindersHeaderBell } from "@/components/smart-reminders/SmartRemindersHeaderBell";
import { UserMenuDropdown } from "@/components/product/auth/UserMenuDropdown";
import { useFireTheme } from "@/contexts/FireThemeContext";

const FAMILY_NAV: { href: string; label: string; emoji: string }[] = [
  { href: "/family", label: "Family Hub", emoji: "👨‍👩‍👧" },
  { href: "/children", label: "Children", emoji: "👶" },
  { href: "/education", label: "Education", emoji: "🎓" },
  { href: "/health", label: "Health", emoji: "❤️" },
  { href: "/family-calendar", label: "Calendar", emoji: "📅" },
  { href: "/parenting-ai", label: "Parenting AI", emoji: "🧠" },
  { href: "/child-records-vault", label: "Records Vault", emoji: "📁" },
];

function navActive(href: string, pathname: string | null): boolean {
  if (!pathname) return false;
  if (href === "/family") return pathname === "/family" || pathname.startsWith("/family/");
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function FamilyModuleShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const [collapsed, setCollapsed] = useState(false);
  const toggle = useCallback(() => setCollapsed((c) => !c), []);
  const w = collapsed ? "lg:w-[76px]" : "lg:w-64";

  return (
    <div
      className={`family-module-root relative min-h-screen transition-[background-color,color] duration-300 ease-out ${
        light ? "bg-slate-100 text-slate-900" : "bg-[#020807] text-zinc-100"
      }`}
    >
      <div
        className={
          light
            ? "pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(16,185,129,0.09),transparent_55%),radial-gradient(circle_at_100%_30%,rgba(5,150,105,0.06),transparent_42%)]"
            : "pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(16,185,129,0.14),transparent_55%),radial-gradient(circle_at_100%_30%,rgba(52,211,153,0.07),transparent_40%)]"
        }
      />

      <header
        className={`sticky top-0 z-40 border-b backdrop-blur-xl transition-colors duration-300 ${
          light ? "border-emerald-200/40 bg-white/90" : "border-emerald-500/10 bg-[#030806]/85"
        }`}
      >
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link
            href="/"
            className={`flex min-w-0 items-center gap-2.5 font-black tracking-tight ${light ? "text-slate-900" : "text-white"}`}
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-lime-400 text-emerald-950 shadow-lg shadow-emerald-500/20">
              <Flame size={20} />
            </span>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm">FIRE Nepal</p>
              <p
                className={`flex flex-wrap items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] ${
                  light ? "text-emerald-700/85" : "text-emerald-400/80"
                }`}
              >
                Family OS
              </p>
            </div>
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <SmartRemindersHeaderBell />
            <Link
              href="/dashboard/profile"
              className={`hidden rounded-xl border px-3 py-2 text-xs font-black transition sm:inline-flex ${
                light
                  ? "border-emerald-200/70 bg-emerald-50/90 text-emerald-900 hover:bg-emerald-100"
                  : "border-emerald-500/20 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/20"
              }`}
            >
              Member dashboard
            </Link>
            <FireThemeToggle variant="header" />
            <UserMenuDropdown variant={light ? "light" : "dark"} />
          </div>
        </div>
      </header>

      <div className="relative mx-auto flex max-w-[1600px] gap-0 px-0 pb-12 pt-6 lg:gap-6 lg:px-6">
        <aside
          className={`hidden shrink-0 border-r px-3 py-6 backdrop-blur-xl transition-[width] duration-300 lg:flex lg:flex-col ${w} ${
            light ? "border-emerald-200/50 bg-white/90" : "border-emerald-500/10 bg-[#04140f]/90"
          }`}
        >
          <div className="mb-4 flex items-center justify-between gap-2 px-1">
            {!collapsed ? (
              <p
                className={`text-[10px] font-black uppercase tracking-[0.16em] ${
                  light ? "text-emerald-700/70" : "text-emerald-400/55"
                }`}
              >
                Family module
              </p>
            ) : null}
            <button
              type="button"
              onClick={toggle}
              className={`ml-auto rounded-lg border p-2 transition ${
                light
                  ? "border-slate-200/80 text-emerald-800 hover:bg-slate-100"
                  : "border-white/10 text-emerald-200/80 hover:bg-white/10 hover:text-white"
              }`}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
            </button>
          </div>
          <nav className="flex flex-col gap-1">
            {FAMILY_NAV.map((item) => {
              const active = navActive(item.href, pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  className={`flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition duration-300 active:scale-[0.99] ${
                    active
                      ? "bg-gradient-to-r from-emerald-500 to-lime-400 text-emerald-950 shadow-lg shadow-emerald-500/25"
                      : light
                        ? "text-slate-700 hover:bg-emerald-50/80 hover:text-slate-900"
                        : "text-emerald-100/75 hover:bg-white/[0.06] hover:text-white"
                  }`}
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center text-lg leading-none" aria-hidden>
                    {item.emoji}
                  </span>
                  {!collapsed ? <span className="min-w-0 truncate">{item.label}</span> : null}
                </Link>
              );
            })}
          </nav>
          <div className="mt-4 border-t pt-3 lg:block">
            <FireThemeToggle variant="sidebar" collapsed={collapsed} />
          </div>
          <div
            className={`mt-auto hidden border-t pt-4 text-[10px] font-semibold lg:block ${
              light ? "border-slate-200/80 text-slate-500" : "border-white/10 text-zinc-500"
            }`}
          >
            {!collapsed ? <p className="px-2 leading-relaxed">Premium family workspace · saved on this device</p> : null}
          </div>
        </aside>

        <main
          className={`family-module-main min-w-0 flex-1 px-4 pb-24 transition-colors duration-300 sm:px-5 sm:pb-10 lg:px-0 ${
            light ? "bg-slate-100/80" : ""
          }`}
        >
          {children}
        </main>

        <nav
          className={`fixed bottom-0 left-0 right-0 z-30 flex max-h-[72px] overflow-x-auto border-t px-1 py-2 backdrop-blur-xl lg:hidden ${
            light ? "border-emerald-200/50 bg-white/95" : "border-emerald-500/15 bg-[#030806]/95"
          }`}
        >
          {FAMILY_NAV.map((item) => {
            const active = navActive(item.href, pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-w-[4.25rem] flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 text-[9px] font-black uppercase tracking-wide ${
                  active ? (light ? "text-emerald-700" : "text-emerald-300") : light ? "text-slate-500" : "text-zinc-500"
                }`}
              >
                <span className="text-lg leading-none" aria-hidden>
                  {item.emoji}
                </span>
                <span className="line-clamp-2 text-center leading-tight">{item.label.split(" ")[0]}</span>
              </Link>
            );
          })}
          <Link
            href="/hub"
            className={`flex min-w-[4.25rem] flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 text-[9px] font-black uppercase tracking-wide ${
              light ? "text-slate-500" : "text-zinc-500"
            }`}
          >
            <LayoutGrid size={18} className="opacity-80" />
            Hub
          </Link>
        </nav>
      </div>
    </div>
  );
}
