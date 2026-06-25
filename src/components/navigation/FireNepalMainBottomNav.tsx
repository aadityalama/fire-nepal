"use client";

import { Banknote, Briefcase, Home, LayoutGrid, MoreHorizontal, Sparkles, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFireTheme } from "@/contexts/FireThemeContext";
import { FIRE_BIZ_I18N } from "@/lib/fire-biz/i18n";

const MAIN_NAV = [
  { href: "/hub", labelKey: "home" as const, icon: Home, match: (p: string) => p === "/hub" || p === "/account" },
  { href: "/cashflow-dashboard", labelKey: "finance" as const, icon: Banknote, match: (p: string) => p.startsWith("/cashflow") || p.startsWith("/expense-dashboard") || p.startsWith("/savings-tracker") },
  { href: "/portfolio", labelKey: "portfolio" as const, icon: Briefcase, match: (p: string) => p.startsWith("/portfolio") || p.startsWith("/return-to-nepal") || p.startsWith("/fire-summary") },
  { href: "/fire-biz", labelKey: "fireBiz" as const, icon: LayoutGrid, match: (p: string) => p.startsWith("/fire-biz") },
  { href: "/fire-ai", labelKey: "fireAi" as const, icon: Sparkles, match: (p: string) => p === "/fire-ai" || p.startsWith("/fire-ai/") },
  { href: "/more", labelKey: "more" as const, icon: MoreHorizontal, match: (p: string) => p === "/more" || p.startsWith("/dashboard") || p.startsWith("/family") || p.startsWith("/smart-reminders") || p.startsWith("/admin") },
];

/** Center hero tab — FIRE wealth journey (portfolio, return-to-nepal, fire-summary). */
const HERO_NAV_INDEX = 2;

const NAV_TRANSITION_MS = 200;

type FireNepalMainBottomNavProps = {
  locale?: "en" | "ne";
};

/** Reserved hook point for future haptic feedback on tab press. */
function onNavItemPress(_labelKey: (typeof MAIN_NAV)[number]["labelKey"]) {
  /* navigator.vibrate?.(1) */
}

function useBottomNavScroll() {
  const [scrolledDown, setScrolledDown] = useState(false);
  const lastY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    lastY.current = window.scrollY;
    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        if (y > 32 && y > lastY.current + 6) setScrolledDown(true);
        else if (y < lastY.current - 6) setScrolledDown(false);
        lastY.current = y;
        ticking.current = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return scrolledDown;
}

type NavItemProps = {
  href: string;
  label: string;
  ariaLabel: string;
  labelKey: (typeof MAIN_NAV)[number]["labelKey"];
  icon: LucideIcon;
  active: boolean;
  isHero: boolean;
  light: boolean;
};

const MainBottomNavItem = memo(function MainBottomNavItem({
  href,
  label,
  ariaLabel,
  labelKey,
  icon: Icon,
  active,
  isHero,
  light,
}: NavItemProps) {
  const inactiveIconSize = isHero ? 23 : 22;
  const activeIconSize = isHero ? 25 : 24;
  const iconSize = active ? activeIconSize : inactiveIconSize;

  const handleClick = useCallback(() => {
    onNavItemPress(labelKey);
  }, [labelKey]);

  return (
    <Link
      href={href}
      title={label}
      aria-label={ariaLabel}
      aria-current={active ? "page" : undefined}
      data-testid={`main-nav-${labelKey}`}
      onClick={handleClick}
      className="fn-main-bottom-nav-item group relative z-10 flex min-h-[48px] min-w-0 flex-1 touch-manipulation flex-col items-center justify-center gap-0.5 rounded-2xl px-0.5 py-1.5 text-center outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2"
      style={{ transitionDuration: `${NAV_TRANSITION_MS}ms` }}
    >
      <span
        className={`relative grid shrink-0 place-items-center transition-transform ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
          isHero ? "h-[50px] w-[50px]" : "h-12 w-12"
        } ${active ? "scale-[1.04]" : "scale-100 group-active:scale-[0.96]"}`}
        style={{ transitionDuration: `${NAV_TRANSITION_MS}ms` }}
      >
        <span
          aria-hidden
          className={`pointer-events-none absolute inset-0 rounded-full bg-emerald-500 shadow-[0_8px_20px_-6px_rgba(16,185,129,0.55)] transition-[transform,opacity] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
            active ? "scale-100 opacity-100" : "scale-[0.72] opacity-0"
          } ${isHero ? "shadow-[0_10px_24px_-6px_rgba(16,185,129,0.62)]" : ""}`}
          style={{ transitionDuration: `${NAV_TRANSITION_MS}ms` }}
        />
        {isHero && !active ? (
          <span
            aria-hidden
            className={`pointer-events-none absolute inset-[3px] rounded-full border transition-opacity ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
              light ? "border-emerald-500/20 bg-emerald-500/[0.06]" : "border-emerald-400/25 bg-emerald-500/[0.08]"
            }`}
            style={{ transitionDuration: `${NAV_TRANSITION_MS}ms` }}
          />
        ) : null}
        <Icon
          size={iconSize}
          strokeWidth={active ? 2.25 : 2}
          className={`relative z-10 transition-[color,transform,opacity] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
            active
              ? "text-white"
              : light
                ? isHero
                  ? "text-emerald-600/90"
                  : "text-slate-400"
                : isHero
                  ? "text-emerald-300/90"
                  : "text-zinc-500"
          }`}
          style={{ transitionDuration: `${NAV_TRANSITION_MS}ms` }}
        />
      </span>
      <span
        className={`line-clamp-2 w-full max-w-full break-words text-[12.5px] leading-tight tracking-[0.01em] transition-[color,opacity,font-weight] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
          active
            ? light
              ? "font-semibold text-emerald-700"
              : "font-semibold text-emerald-200"
            : light
              ? isHero
                ? "font-medium text-emerald-700/75"
                : "font-medium text-slate-500"
              : isHero
                ? "font-medium text-emerald-300/80"
                : "font-medium text-zinc-500"
        }`}
        style={{ transitionDuration: `${NAV_TRANSITION_MS}ms` }}
      >
        {label}
      </span>
    </Link>
  );
});

export function FireNepalMainBottomNav({ locale = "en" }: FireNepalMainBottomNavProps) {
  const pathname = usePathname();
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const labels = FIRE_BIZ_I18N[locale].mainNav;
  const scrolledDown = useBottomNavScroll();

  const navItems = useMemo(
    () =>
      MAIN_NAV.map((item, index) => ({
        ...item,
        active: item.match(pathname ?? ""),
        isHero: index === HERO_NAV_INDEX,
        label: labels[item.labelKey],
        ariaLabel:
          item.labelKey === "fireBiz"
            ? `${labels.fireBiz} — ${FIRE_BIZ_I18N[locale].moduleTagline}`
            : labels[item.labelKey],
      })),
    [labels, locale, pathname],
  );

  return (
    <nav
      className="fn-main-bottom-nav pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex justify-center px-5 pb-[calc(18px+env(safe-area-inset-bottom,0px))] lg:hidden"
      aria-label="Main navigation"
    >
      <div
        className={`fn-main-bottom-nav-card pointer-events-auto relative mx-auto flex h-[75px] w-full max-w-[720px] items-stretch rounded-[24px] px-1 transition-[transform,opacity] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[transform,opacity] motion-reduce:transition-none ${
          light ? "fn-main-bottom-nav-card--light" : "fn-main-bottom-nav-card--dark"
        } ${scrolledDown ? "translate-y-2 opacity-[0.86]" : "translate-y-0 opacity-100"}`}
        style={{ transitionDuration: `${NAV_TRANSITION_MS}ms` }}
      >
        {navItems.map((item) => (
          <MainBottomNavItem
            key={item.href}
            href={item.href}
            label={item.label}
            ariaLabel={item.ariaLabel}
            labelKey={item.labelKey}
            icon={item.icon}
            active={item.active}
            isHero={item.isHero}
            light={light}
          />
        ))}
      </div>
    </nav>
  );
}

export function mainNavActive(href: string, pathname: string | null): boolean {
  const item = MAIN_NAV.find((n) => n.href === href);
  if (!item || !pathname) return false;
  return item.match(pathname);
}
