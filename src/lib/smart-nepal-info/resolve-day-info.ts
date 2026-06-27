import NepaliDate from "nepali-date-converter";
import { resolveWithDailyCache } from "./daily-cache";
import { lookupAdEvents, lookupBsEvent } from "./holidays-data";
import { getNepalAdDateParts, getNepalDateKey, getNepalReferenceDate } from "./nepal-time";
import type { LocalizedLabel, SmartNepalDayInfo } from "./types";

function pickPrimaryFestival(
  bsEvent: ReturnType<typeof lookupBsEvent>,
  adEvents: ReturnType<typeof lookupAdEvents>,
): LocalizedLabel | null {
  if (bsEvent) {
    return bsEvent.festival;
  }

  const festivalLike = adEvents.find((event) => event.publicHoliday && !event.specialDay);
  if (festivalLike) {
    return festivalLike.label;
  }

  return null;
}

function pickSpecialDay(adEvents: ReturnType<typeof lookupAdEvents>): LocalizedLabel | null {
  const special = adEvents.find((event) => event.specialDay);
  return special?.label ?? null;
}

function isPublicHoliday(
  bsEvent: ReturnType<typeof lookupBsEvent>,
  adEvents: ReturnType<typeof lookupAdEvents>,
): boolean {
  if (bsEvent?.publicHoliday) {
    return true;
  }

  return adEvents.some((event) => event.publicHoliday);
}

export function resolveSmartNepalDayInfo(referenceDate: Date = new Date()): SmartNepalDayInfo {
  const dateKey = getNepalDateKey(referenceDate);
  const adParts = getNepalAdDateParts(referenceDate);
  const nepaliDate = NepaliDate.fromAD(getNepalReferenceDate(referenceDate));
  const bs = nepaliDate.getBS();
  const bsMonth = bs.month + 1;
  const bsDay = bs.date;
  const weekdayIndex = nepaliDate.getDay();

  const bsEvent = lookupBsEvent(bsMonth, bsDay);
  const adEvents = lookupAdEvents(adParts.month, adParts.day, dateKey);

  return {
    dateKey,
    bsDate: {
      year: bs.year,
      month: bsMonth,
      day: bsDay,
      weekdayIndex,
    },
    festival: pickPrimaryFestival(bsEvent, adEvents),
    publicHoliday: isPublicHoliday(bsEvent, adEvents),
    specialDay: pickSpecialDay(adEvents),
  };
}

export function getSmartNepalDayInfo(referenceDate: Date = new Date()): SmartNepalDayInfo {
  const dateKey = getNepalDateKey(referenceDate);
  return resolveWithDailyCache(dateKey, () => resolveSmartNepalDayInfo(referenceDate));
}

export function formatBsDate(info: SmartNepalDayInfo, locale: "en" | "np"): string {
  const nepaliDate = new NepaliDate(info.bsDate.year, info.bsDate.month - 1, info.bsDate.day);
  return nepaliDate.format("ddd DD, MMMM YYYY", locale);
}

export function formatBsDateParts(info: SmartNepalDayInfo, locale: "en" | "np"): {
  year: string;
  month: string;
  day: string;
  weekday: string;
} {
  const nepaliDate = new NepaliDate(info.bsDate.year, info.bsDate.month - 1, info.bsDate.day);
  return {
    year: nepaliDate.format("YYYY", locale),
    month: nepaliDate.format("MMMM", locale),
    day: nepaliDate.format("DD", locale),
    weekday: nepaliDate.format("ddd", locale),
  };
}

export function pickLocalizedLabel(label: LocalizedLabel | null, locale: "en" | "np"): string | null {
  if (!label) {
    return null;
  }

  return locale === "np" ? label.np : label.en;
}
