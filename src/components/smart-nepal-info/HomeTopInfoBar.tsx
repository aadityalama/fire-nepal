"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useHomepageLanguage } from "@/contexts/HomepageLanguageContext";
import {
  formatBsDateCompact,
  formatBsDateParts,
  getMsUntilNextNepalMidnight,
  getSmartNepalDayInfo,
  getSmartNepalInfoBarCopy,
  nepalTimeFormatter,
  nepalTimeZoneLabel,
  resolveBarLocale,
  resolveBarStatus,
  type BarStatusKind,
  type SmartNepalDayInfo,
} from "@/lib/smart-nepal-info";

const STATUS_CLASS: Record<BarStatusKind, string> = {
  regular: "text-emerald-600",
  festival: "text-red-600",
  "public-holiday": "text-red-600",
};

function useNepalDayInfo() {
  const [dayInfo, setDayInfo] = useState<SmartNepalDayInfo>(() => getSmartNepalDayInfo());

  const refresh = useCallback(() => {
    setDayInfo(getSmartNepalDayInfo());
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(refresh, getMsUntilNextNepalMidnight());
    return () => window.clearTimeout(timeout);
  }, [dayInfo.dateKey, refresh]);

  return dayInfo;
}

function useNepalClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const interval = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  return now;
}

/** Single-line Nepal date, weekday, day status, and live NPT — no cards or chrome. */
export function HomeTopInfoBar() {
  const { language } = useHomepageLanguage();
  const locale = resolveBarLocale(language);
  const copy = getSmartNepalInfoBarCopy(locale);
  const dayInfo = useNepalDayInfo();
  const now = useNepalClock();

  const line = useMemo(() => {
    const date = formatBsDateCompact(dayInfo, locale);
    const weekday = formatBsDateParts(dayInfo, locale).weekday;
    const status = resolveBarStatus(dayInfo, copy, locale);
    const time = now ? nepalTimeFormatter.format(now) : "--:--:--";

    return { date, weekday, status, time };
  }, [copy, dayInfo, locale, now]);

  return (
    <p
      aria-label={`${line.date}, ${line.weekday}, ${line.status.text}, ${line.time} ${nepalTimeZoneLabel}`}
      className="mx-auto max-w-7xl overflow-hidden whitespace-nowrap px-3 py-1 text-center text-[12px] font-semibold leading-none tracking-[-0.01em] text-emerald-950 sm:px-4 sm:py-1.5 sm:text-[13px]"
    >
      <span>{line.date}</span>
      <span className="text-emerald-900/35"> • </span>
      <span>{line.weekday}</span>
      <span className="text-emerald-900/35"> • </span>
      <span className={STATUS_CLASS[line.status.kind]}>{line.status.text}</span>
      <span className="text-emerald-900/35"> • </span>
      <time dateTime={now?.toISOString()} className="tabular-nums">
        {line.time} {nepalTimeZoneLabel}
      </time>
    </p>
  );
}
