"use client";

import Image from "next/image";
import { useFireTheme } from "@/contexts/FireThemeContext";

/**
 * Compact premium hero for Gold & Silver Portfolio.
 * Visual-only — does not display standalone net worth.
 */
export function GoldSilverHero() {
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";

  return (
    <header className="gs-premium-hero relative mb-0 overflow-hidden rounded-2xl border sm:rounded-[1.35rem]">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <Image
          src="/illustrations/gold-silver/himalaya-hero.svg"
          alt=""
          fill
          priority
          unoptimized
          className="object-cover object-center"
          sizes="(max-width: 768px) 100vw, 1200px"
        />
        <div
          className={`absolute inset-0 ${
            light
              ? "bg-gradient-to-r from-[#062B24]/88 via-[#062B24]/72 to-[#03100F]/55"
              : "bg-gradient-to-r from-[#03100F]/88 via-[#062B24]/70 to-[#03100F]/40"
          }`}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#03100F] via-transparent to-[#03100F]/25" />
      </div>

      <div className="relative z-[1] flex min-h-[7.5rem] items-center gap-3 px-4 py-4 sm:min-h-[8.5rem] sm:px-6 sm:py-5">
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-center gap-2">
            <span
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[#D4AF37]/40 bg-gradient-to-br from-[#F4D06F]/25 to-[#D4AF37]/10 text-[11px] font-black text-[#F4D06F] shadow-[0_0_18px_-6px_rgba(212,175,55,0.55)]"
              aria-hidden
            >
              ◆
            </span>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#CBD5E1]/80">FIRE Nepal</p>
          </div>
          <h1 className="gs-premium-display text-[1.35rem] font-extrabold leading-[1.15] tracking-tight text-[#F8FAFC] sm:text-2xl md:text-[1.75rem]">
            <span className="bg-gradient-to-r from-[#F8FAFC] via-[#F4D06F] to-[#D4AF37] bg-clip-text text-transparent">
              Gold &amp; Silver Portfolio
            </span>
          </h1>
          <p className="mt-1.5 text-[11px] font-semibold tracking-wide text-[#CBD5E1]/85 sm:text-xs">
            Track · Analyze · Grow Your Wealth
          </p>
        </div>

        <div className="relative hidden h-[5.5rem] w-[7.5rem] shrink-0 sm:block md:h-[6.5rem] md:w-[9rem]" aria-hidden>
          <Image
            src="/illustrations/gold-silver/gold-bars.svg"
            alt=""
            width={120}
            height={96}
            unoptimized
            className="absolute right-0 top-0 h-auto w-[4.75rem] drop-shadow-[0_8px_20px_rgba(212,175,55,0.35)] md:w-[5.5rem]"
          />
          <Image
            src="/illustrations/gold-silver/silver-bars.svg"
            alt=""
            width={100}
            height={80}
            unoptimized
            className="absolute bottom-0 left-0 h-auto w-[3.75rem] opacity-95 drop-shadow-[0_8px_16px_rgba(148,163,184,0.35)] md:w-[4.25rem]"
          />
        </div>
      </div>
    </header>
  );
}
