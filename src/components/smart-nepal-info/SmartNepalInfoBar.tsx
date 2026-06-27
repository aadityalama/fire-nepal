"use client";

import { useMemo } from "react";
import { useHomepageLanguage } from "@/contexts/HomepageLanguageContext";
import {
  formatBsDateParts,
  getSmartNepalInfoBarCopy,
  nepalTimeFormatter,
  nepalTimeZoneLabel,
  pickLocalizedLabel,
  resolveBarLocale,
  type InfoChipData,
} from "@/lib/smart-nepal-info";
import { InfoChip } from "./InfoChip";
import { useNepalLiveClock, useSmartNepalDayInfo } from "./useSmartNepalInfoBar";

type SmartNepalInfoBarProps = {
  /** Optional future chips (weather, gold, NEPSE, exchange rates). */
  extraChips?: InfoChipData[];
  className?: string;
};

export function SmartNepalInfoBar({ extraChips = [], className = "" }: SmartNepalInfoBarProps) {
  const { language } = useHomepageLanguage();
  const locale = resolveBarLocale(language);
  const copy = getSmartNepalInfoBarCopy(locale);
  const dayInfo = useSmartNepalDayInfo();
  const now = useNepalLiveClock();

  const chips = useMemo(() => {
    const bsParts = formatBsDateParts(dayInfo, locale);
    const festivalLabel = pickLocalizedLabel(dayInfo.festival, locale);
    const specialDayLabel = pickLocalizedLabel(dayInfo.specialDay, locale);
    const liveTime = now ? nepalTimeFormatter.format(now) : "--:--:--";

    const coreChips: InfoChipData[] = [
      {
        id: "bs-date",
        kind: "bs-date",
        emoji: "🇳🇵",
        label: copy.bsDate,
        value: `${bsParts.weekday}, ${bsParts.day} ${bsParts.month} ${bsParts.year}`,
        subValue: `${bsParts.day} · ${bsParts.month} · ${bsParts.year}`,
      },
      {
        id: "festival",
        kind: "festival",
        emoji: "📅",
        label: copy.festival,
        value: festivalLabel ?? copy.noFestivalToday,
      },
      {
        id: "public-holiday",
        kind: "public-holiday",
        emoji: "🏖️",
        label: copy.publicHolidayLabel,
        value: dayInfo.publicHoliday ? copy.publicHolidayYes : copy.publicHolidayNo,
      },
      {
        id: "special-day",
        kind: "special-day",
        emoji: "⭐",
        label: copy.specialDay,
        value: specialDayLabel ?? copy.noSpecialDayToday,
      },
      {
        id: "nepal-time",
        kind: "nepal-time",
        emoji: "🕒",
        label: copy.nepalTime,
        value: liveTime,
        subValue: nepalTimeZoneLabel,
      },
    ];

    return [...coreChips, ...extraChips];
  }, [copy, dayInfo, extraChips, locale, now]);

  return (
    <section
      aria-label={locale === "np" ? "स्मार्ट नेपाल सूचना पट्टी" : "Smart Nepal Information Bar"}
      className={`smart-nepal-info-bar relative overflow-hidden border-b border-white/10 bg-gradient-to-r from-slate-950/95 via-emerald-950/90 to-slate-950/95 ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(16,185,129,0.14),transparent_42%),radial-gradient(circle_at_80%_50%,rgba(214,168,62,0.1),transparent_38%)]" />
      <div className="relative mx-auto max-w-7xl px-3 py-2 sm:px-6 lg:px-8">
        <div className="no-scrollbar flex items-stretch gap-2 overflow-x-auto pb-0.5 sm:gap-2.5">
          {chips.map((chip) => (
            <InfoChip key={chip.id} chip={chip} />
          ))}
        </div>
      </div>
    </section>
  );
}
