"use client";

import { useMemo } from "react";
import { useHomepageLanguage } from "@/contexts/HomepageLanguageContext";
import {
  formatBsDateCompact,
  formatBsDateParts,
  getSmartNepalInfoBarCopy,
  nepalTimeCompactFormatter,
  nepalTimeZoneLabel,
  resolveBarLocale,
  resolveBarStatus,
  type BarStatusKind,
} from "@/lib/smart-nepal-info";
import { useNepalLiveClock, useSmartNepalDayInfo } from "./useSmartNepalInfoBar";

type SmartNepalInfoBarProps = {
  className?: string;
};

const STATUS_COLOR: Record<BarStatusKind, string> = {
  regular: "text-emerald-400",
  festival: "text-red-400",
  "public-holiday": "text-red-400",
};

function Separator() {
  return <span className="shrink-0 text-white/40">•</span>;
}

export function SmartNepalInfoBar({ className = "" }: SmartNepalInfoBarProps) {
  const { language } = useHomepageLanguage();
  const locale = resolveBarLocale(language);
  const copy = getSmartNepalInfoBarCopy(locale);
  const dayInfo = useSmartNepalDayInfo();
  const now = useNepalLiveClock();

  const line = useMemo(() => {
    const bsCompact = formatBsDateCompact(dayInfo, locale);
    const weekday = formatBsDateParts(dayInfo, locale).weekday;
    const status = resolveBarStatus(dayInfo, copy, locale);
    const liveTime = now ? nepalTimeCompactFormatter.format(now) : "--:--";

    return {
      bsCompact,
      weekday,
      status,
      liveTime,
    };
  }, [copy, dayInfo, locale, now]);

  const ariaLabel = `${line.bsCompact}, ${line.weekday}, ${line.status.text}, ${line.liveTime} ${nepalTimeZoneLabel}`;

  return (
    <section
      aria-label={locale === "np" ? "स्मार्ट नेपाल सूचना पट्टी" : "Smart Nepal Information Bar"}
      className={`smart-nepal-info-bar relative border-b border-white/10 bg-gradient-to-r from-slate-950/95 via-emerald-950/90 to-slate-950/95 ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(16,185,129,0.12),transparent_42%),radial-gradient(circle_at_80%_50%,rgba(214,168,62,0.08),transparent_38%)]" />
      <div className="relative mx-auto max-w-7xl px-2 py-1.5 sm:px-4">
        <p
          aria-label={ariaLabel}
          className="flex min-w-0 items-center justify-center gap-1 overflow-hidden whitespace-nowrap text-[12px] font-semibold leading-none tracking-[-0.01em] text-white sm:text-[13px]"
        >
          <span className="shrink-0">{line.bsCompact}</span>
          <Separator />
          <span className="shrink-0">{line.weekday}</span>
          <Separator />
          <span className={`min-w-0 truncate ${STATUS_COLOR[line.status.kind]}`}>{line.status.text}</span>
          <Separator />
          <time dateTime={now?.toISOString()} className="shrink-0 tabular-nums">
            {line.liveTime} {nepalTimeZoneLabel}
          </time>
        </p>
      </div>
    </section>
  );
}
