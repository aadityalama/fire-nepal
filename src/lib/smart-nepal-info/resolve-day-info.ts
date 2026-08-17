import NepaliDate from "nepali-date-converter";
import { getCachedDayInfo, resolveWithDailyCache, setCachedDayInfo } from "./daily-cache";
import {
  fetchHamroPatroDayFestival,
  type HamroPatroFetch,
} from "./hamro-patro";
import { lookupAdEvents } from "./holidays-data";
import { getNepalAdDateParts, getNepalDateKey, getNepalReferenceDate } from "./nepal-time";
import type { LocalizedLabel, SmartNepalDayInfo } from "./types";

function pickAdFestival(adEvents: ReturnType<typeof lookupAdEvents>): LocalizedLabel | null {
  const festivalLike = adEvents.find((event) => event.publicHoliday && !event.specialDay);
  return festivalLike?.label ?? null;
}

function pickSpecialDay(adEvents: ReturnType<typeof lookupAdEvents>): LocalizedLabel | null {
  const special = adEvents.find((event) => event.specialDay);
  return special?.label ?? null;
}

function isAdPublicHoliday(adEvents: ReturnType<typeof lookupAdEvents>): boolean {
  return adEvents.some((event) => event.publicHoliday);
}

/** Sync BS date + AD observances only (no Hamro Patro network). */
export function resolveSmartNepalDayInfoBase(referenceDate: Date = new Date()): SmartNepalDayInfo {
  const dateKey = getNepalDateKey(referenceDate);
  const adParts = getNepalAdDateParts(referenceDate);
  const nepaliDate = NepaliDate.fromAD(getNepalReferenceDate(referenceDate));
  const bs = nepaliDate.getBS();
  const bsMonth = bs.month + 1;
  const bsDay = bs.date;
  const weekdayIndex = nepaliDate.getDay();
  const adEvents = lookupAdEvents(adParts.month, adParts.day, dateKey);
  const adFestival = pickAdFestival(adEvents);

  return {
    dateKey,
    bsDate: {
      year: bs.year,
      month: bsMonth,
      day: bsDay,
      weekdayIndex,
    },
    festival: adFestival,
    festivalSource: adFestival ? "ad-observance" : null,
    festivalSourceUrl: null,
    publicHoliday: isAdPublicHoliday(adEvents),
    specialDay: pickSpecialDay(adEvents),
  };
}

export type ResolveSmartNepalDayInfoOptions = {
  fetchImpl?: HamroPatroFetch;
  /** Skip Hamro Patro enrichment (tests / offline). */
  skipHamroPatro?: boolean;
};

/**
 * Resolve Nepal-local day info. Festival/holiday labels for Nepali events come from
 * Hamro Patro public date pages (schema.org Event JSON-LD), not hardcoded BS maps.
 */
export async function resolveSmartNepalDayInfo(
  referenceDate: Date = new Date(),
  options: ResolveSmartNepalDayInfoOptions = {},
): Promise<SmartNepalDayInfo> {
  const base = resolveSmartNepalDayInfoBase(referenceDate);
  if (options.skipHamroPatro) {
    return base;
  }

  try {
    const hamro = await fetchHamroPatroDayFestival(
      base.bsDate.year,
      base.bsDate.month,
      base.bsDate.day,
      options.fetchImpl,
    );
    if (!hamro?.festival) {
      return base;
    }

    return {
      ...base,
      festival: hamro.festival,
      festivalSource: "hamro-patro",
      festivalSourceUrl: hamro.sourceUrl,
      publicHoliday: base.publicHoliday || hamro.publicHoliday,
    };
  } catch {
    return base;
  }
}

export async function getSmartNepalDayInfo(
  referenceDate: Date = new Date(),
  options: ResolveSmartNepalDayInfoOptions = {},
): Promise<SmartNepalDayInfo> {
  const dateKey = getNepalDateKey(referenceDate);
  const cached = getCachedDayInfo(dateKey);
  if (cached?.festivalSource === "hamro-patro") {
    return cached;
  }
  if (cached && options.skipHamroPatro) {
    return cached;
  }

  const resolved = await resolveSmartNepalDayInfo(referenceDate, options);
  return setCachedDayInfo(resolved);
}

/** Sync accessor for BS formatting / market stamps (may lack Hamro Patro festival until async enrich). */
export function getSmartNepalDayInfoSync(referenceDate: Date = new Date()): SmartNepalDayInfo {
  const dateKey = getNepalDateKey(referenceDate);
  return resolveWithDailyCache(dateKey, () => resolveSmartNepalDayInfoBase(referenceDate));
}

export function formatBsDate(info: SmartNepalDayInfo, locale: "en" | "np"): string {
  const nepaliDate = new NepaliDate(info.bsDate.year, info.bsDate.month - 1, info.bsDate.day);
  return nepaliDate.format("ddd DD, MMMM YYYY", locale);
}

export function formatBsDateCompact(info: SmartNepalDayInfo, locale: "en" | "np"): string {
  const nepaliDate = new NepaliDate(info.bsDate.year, info.bsDate.month - 1, info.bsDate.day);
  return `${nepaliDate.format("YYYY", locale)} ${nepaliDate.format("MMMM", locale)} ${nepaliDate.format("DD", locale)}`;
}

export type BarStatusKind = "regular" | "festival" | "public-holiday";

export type BarStatus = {
  text: string;
  kind: BarStatusKind;
};

export function resolveBarStatus(
  dayInfo: SmartNepalDayInfo,
  copy: { noFestivalToday: string; publicHolidayStatus: string },
  locale: "en" | "np",
): BarStatus {
  const festivalLabel = pickLocalizedLabel(dayInfo.festival, locale);
  if (festivalLabel) {
    return { text: festivalLabel, kind: "festival" };
  }

  if (dayInfo.publicHoliday) {
    return { text: copy.publicHolidayStatus, kind: "public-holiday" };
  }

  return { text: copy.noFestivalToday, kind: "regular" };
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

/** Full Nepali BS line: e.g. २०८३ श्रावण १० आइतबार */
export function formatBsDateHeroLine(referenceDate: Date = new Date()): string {
  const info = getSmartNepalDayInfoSync(referenceDate);
  const nepaliDate = new NepaliDate(info.bsDate.year, info.bsDate.month - 1, info.bsDate.day);
  return nepaliDate.format("YYYY MMMM D ddd", "np");
}

/**
 * Market "As of" stamp: BS YYYY-MM-DD + Kathmandu HH:mm:ss from the update timestamp.
 * Example: 2083-04-10 15:00:00
 */
export function formatMarketAsOfBsTimestamp(iso: string | null | undefined): string {
  const date = iso ? new Date(iso) : new Date();
  const safe = Number.isNaN(date.getTime()) ? new Date() : date;
  const info = getSmartNepalDayInfoSync(safe);
  const yyyy = String(info.bsDate.year).padStart(4, "0");
  const mm = String(info.bsDate.month).padStart(2, "0");
  const dd = String(info.bsDate.day).padStart(2, "0");
  const timeParts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kathmandu",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(safe);
  const hour = timeParts.find((part) => part.type === "hour")?.value ?? "00";
  const minute = timeParts.find((part) => part.type === "minute")?.value ?? "00";
  const second = timeParts.find((part) => part.type === "second")?.value ?? "00";
  return `${yyyy}-${mm}-${dd} ${hour}:${minute}:${second}`;
}

export function pickLocalizedLabel(label: LocalizedLabel | null, locale: "en" | "np"): string | null {
  if (!label) {
    return null;
  }

  return locale === "np" ? label.np : label.en;
}
