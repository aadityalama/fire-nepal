"use client";

import { ArrowLeft, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { isPensionOverviewPath, PENSION_BASE, PENSION_TAB_LINKS } from "@/lib/pension/nav";
import { PcEyebrow, SyncStatusChip } from "@/components/pension/PensionUi";

const PRIMARY_TABS = [
  { href: PENSION_BASE, label: "Home" },
  { href: `${PENSION_BASE}/ssf`, label: "SSF" },
  { href: `${PENSION_BASE}/epf`, label: "EPF" },
  { href: `${PENSION_BASE}/cit`, label: "CIT" },
  { href: `${PENSION_BASE}/government`, label: "Gov" },
] as const;

const MORE_TABS = PENSION_TAB_LINKS.filter(
  (t) =>
    t.href !== PENSION_BASE &&
    !t.href.endsWith("/ssf") &&
    !t.href.endsWith("/epf") &&
    !t.href.endsWith("/cit") &&
    !t.href.endsWith("/government"),
);

export function PensionChrome({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const [moreOpen, setMoreOpen] = useState(false);

  const activeMore = useMemo(
    () => MORE_TABS.some((t) => pathname === t.href || pathname.startsWith(`${t.href}/`)),
    [pathname],
  );

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 pb-28 sm:max-w-5xl sm:gap-5 sm:pb-8 lg:max-w-6xl">
      <header className="flex items-center justify-between gap-3">
        <Link
          href="/portfolio"
          className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-white/10 bg-[#0c1219] px-3.5 text-xs font-bold text-[#c5d0db] transition hover:border-[#2dd4bf]/35 hover:text-white"
        >
          <ArrowLeft size={15} /> Portfolio
        </Link>
        <SyncStatusChip connected={false} />
      </header>

      <section className="rounded-[1.5rem] border border-white/[0.08] bg-[radial-gradient(120%_80%_at_0%_0%,rgba(45,212,191,0.14),transparent_55%),linear-gradient(165deg,#0e1620_0%,#090e14_100%)] px-4 py-5 sm:px-6 sm:py-6">
        <PcEyebrow>Pension Center · Nepal</PcEyebrow>
        <h1 className="mt-2 text-[1.65rem] font-semibold tracking-[-0.035em] text-white sm:text-3xl">{title}</h1>
        {subtitle ? <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#8b9aab]">{subtitle}</p> : null}
        <p className="mt-3 text-[11px] font-semibold text-amber-100/85">
          Official portal sync not connected — personal balances show as Not Connected / Not Synced. Never fabricated.
        </p>
      </section>

      <nav aria-label="Pension primary" className="sticky top-0 z-30 -mx-1 border-b border-white/[0.05] bg-[#070b10]/90 px-1 py-2 backdrop-blur-xl sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {PRIMARY_TABS.map((item) => {
            const active =
              item.href === PENSION_BASE
                ? isPensionOverviewPath(pathname)
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-bold transition ${
                  active
                    ? "bg-[#14b8a6] text-[#042f2e]"
                    : "border border-white/10 bg-[#0c1219] text-[#9aa8b8] hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          <button
            type="button"
            aria-expanded={moreOpen}
            onClick={() => setMoreOpen((v) => !v)}
            className={`inline-flex shrink-0 items-center gap-1 rounded-full px-3.5 py-2 text-xs font-bold transition ${
              activeMore || moreOpen
                ? "bg-white/10 text-white"
                : "border border-white/10 bg-[#0c1219] text-[#9aa8b8]"
            }`}
          >
            <MoreHorizontal size={14} /> Plan
          </button>
        </div>
        {moreOpen ? (
          <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {MORE_TABS.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className={`rounded-xl border px-3 py-2.5 text-[11px] font-bold ${
                    active
                      ? "border-[#2dd4bf]/40 bg-[#2dd4bf]/15 text-[#99f6e4]"
                      : "border-white/10 bg-[#0c1219] text-[#9aa8b8]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        ) : null}
      </nav>

      <div className="flex flex-col gap-4 sm:gap-5">{children}</div>
    </div>
  );
}
