import type { LocalizedLabel } from "./types";

export type AdCalendarEvent = {
  /** Gregorian month (1–12) in Nepal local time. */
  month: number;
  day: number;
  label: LocalizedLabel;
  publicHoliday?: boolean;
  /** Marks national/international observance chip (vs festival). */
  specialDay?: boolean;
};

/**
 * Fixed Gregorian observances in Nepal local time.
 * Nepali lunar festivals / Dashain–Tihar come from Hamro Patro (schema.org date pages),
 * not from a hardcoded BS month/day table.
 */
export const AD_CALENDAR_EVENTS: AdCalendarEvent[] = [
  { month: 1, day: 1, label: { en: "New Year's Day", np: "नयाँ वर्ष" }, specialDay: true },
  { month: 1, day: 11, label: { en: "Prithvi Jayanti", np: "पृथ्वी जयन्ती" }, specialDay: true },
  { month: 1, day: 15, label: { en: "Maghe Sankranti", np: "माघे सङ्क्रान्ति" }, publicHoliday: true, specialDay: true },
  { month: 2, day: 19, label: { en: "Democracy Day", np: "प्रजातन्त्र दिवस" }, publicHoliday: true, specialDay: true },
  { month: 3, day: 8, label: { en: "International Women's Day", np: "अन्तर्राष्ट्रिय महिला दिवस" }, specialDay: true },
  { month: 4, day: 22, label: { en: "Earth Day", np: "पृथ्वी दिवस" }, specialDay: true },
  { month: 5, day: 1, label: { en: "Labour Day", np: "श्रम दिवस" }, publicHoliday: true, specialDay: true },
  { month: 5, day: 29, label: { en: "Republic Day", np: "गणतन्त्र दिवस" }, publicHoliday: true, specialDay: true },
  { month: 6, day: 5, label: { en: "World Environment Day", np: "विश्व वातावरण दिवस" }, specialDay: true },
  { month: 9, day: 20, label: { en: "Constitution Day", np: "संविधान दिवस" }, publicHoliday: true, specialDay: true },
  { month: 12, day: 25, label: { en: "Christmas Day", np: "क्रिसमस" }, publicHoliday: true, specialDay: true },
];

/** Year-specific AD overrides for moveable Gregorian observances (extend as needed). */
export const AD_YEAR_OVERRIDES: Record<string, AdCalendarEvent[]> = {
  "2026-05-31": [
    {
      month: 5,
      day: 31,
      label: { en: "Buddha Jayanti", np: "बुद्ध जयन्ती" },
      publicHoliday: true,
      specialDay: true,
    },
  ],
};

export function getThirdSundayOfMonth(year: number, month: number): number {
  let count = 0;
  for (let day = 1; day <= 31; day += 1) {
    const weekday = new Date(Date.UTC(year, month - 1, day, 12)).getUTCDay();
    if (weekday === 0) {
      count += 1;
      if (count === 3) {
        return day;
      }
    }
  }
  return 1;
}

export function getSecondSundayOfMonth(year: number, month: number): number {
  let count = 0;
  for (let day = 1; day <= 31; day += 1) {
    const weekday = new Date(Date.UTC(year, month - 1, day, 12)).getUTCDay();
    if (weekday === 0) {
      count += 1;
      if (count === 2) {
        return day;
      }
    }
  }
  return 1;
}

export function getMoveableAdEvents(year: number, month: number, day: number): AdCalendarEvent[] {
  const events: AdCalendarEvent[] = [];

  if (month === 5 && day === getSecondSundayOfMonth(year, 5)) {
    events.push({
      month: 5,
      day,
      label: { en: "Mother's Day", np: "आमाको दिन" },
      specialDay: true,
    });
  }

  if (month === 6 && day === getThirdSundayOfMonth(year, 6)) {
    events.push({
      month: 6,
      day,
      label: { en: "Father's Day", np: "बुबाको दिन" },
      specialDay: true,
    });
  }

  return events;
}

export function lookupAdEvents(adMonth: number, adDay: number, dateKey: string): AdCalendarEvent[] {
  const fixed = AD_CALENDAR_EVENTS.filter((event) => event.month === adMonth && event.day === adDay);
  const overrides = AD_YEAR_OVERRIDES[dateKey] ?? [];
  const moveable = getMoveableAdEvents(Number(dateKey.slice(0, 4)), adMonth, adDay);

  return [...fixed, ...overrides, ...moveable];
}
