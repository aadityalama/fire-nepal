import type { LocalizedLabel } from "./types";

export type BsCalendarEvent = {
  /** Bikram Sambat month (1–12). */
  month: number;
  day: number;
  festival: LocalizedLabel;
  publicHoliday?: boolean;
};

export type AdCalendarEvent = {
  /** Gregorian month (1–12) in Nepal local time. */
  month: number;
  day: number;
  label: LocalizedLabel;
  publicHoliday?: boolean;
  /** Marks national/international observance chip (vs festival). */
  specialDay?: boolean;
};

/** Fixed Bikram Sambat festival & public-holiday calendar (approximate lunar dates). */
export const BS_CALENDAR_EVENTS: BsCalendarEvent[] = [
  { month: 1, day: 1, festival: { en: "Nepali New Year (Navavarsha)", np: "नेपाली नयाँ वर्ष (नववर्ष)" }, publicHoliday: true },
  { month: 1, day: 11, festival: { en: "Buddha Jayanti", np: "बुद्ध जयन्ती" }, publicHoliday: true },
  { month: 2, day: 15, festival: { en: "Republic Day (Ganatantra Diwas)", np: "गणतन्त्र दिवस" }, publicHoliday: true },
  { month: 3, day: 15, festival: { en: "Janai Purnima / Rakshya Bandhan", np: "जनै पूर्णिमा / रक्ष्याबन्धन" }, publicHoliday: true },
  { month: 4, day: 4, festival: { en: "Krishna Janmashtami", np: "श्रीकृष्ण जन्माष्टमी" }, publicHoliday: true },
  { month: 4, day: 15, festival: { en: "Teej (Haritalika)", np: "तीज (हरितालिका)" }, publicHoliday: true },
  { month: 5, day: 1, festival: { en: "Ghatasthapana (Dashain begins)", np: "घटस्थापना (विजया दशमी सुरु)" }, publicHoliday: true },
  { month: 5, day: 7, festival: { en: "Fulpati", np: "फूलपाती" }, publicHoliday: true },
  { month: 5, day: 8, festival: { en: "Maha Astami", np: "महाअष्टमी" }, publicHoliday: true },
  { month: 5, day: 9, festival: { en: "Maha Nawami", np: "महानवमी" }, publicHoliday: true },
  { month: 5, day: 10, festival: { en: "Vijaya Dashami (Dashain)", np: "विजया दशमी (दशैं)" }, publicHoliday: true },
  { month: 5, day: 11, festival: { en: "Dashain (Day 2)", np: "दशैं (दोस्रो दिन)" }, publicHoliday: true },
  { month: 5, day: 12, festival: { en: "Dashain (Day 3)", np: "दशैं (तेस्रो दिन)" }, publicHoliday: true },
  { month: 5, day: 13, festival: { en: "Dashain (Day 4)", np: "दशैं (चौथो दिन)" }, publicHoliday: true },
  { month: 5, day: 14, festival: { en: "Dashain (Day 5)", np: "दशैं (पाँचौं दिन)" }, publicHoliday: true },
  { month: 5, day: 15, festival: { en: "Dashain (Day 6)", np: "दशैं (छैटौं दिन)" }, publicHoliday: true },
  { month: 6, day: 1, festival: { en: "Laxmi Puja (Tihar)", np: "लक्ष्मी पूजा (तिहार)" }, publicHoliday: true },
  { month: 6, day: 2, festival: { en: "Gai Puja / Govardhan Puja", np: "गाई पूजा / गोवर्धन पूजा" }, publicHoliday: true },
  { month: 6, day: 3, festival: { en: "Bhai Tika (Tihar)", np: "भाई टीका (तिहार)" }, publicHoliday: true },
  { month: 6, day: 4, festival: { en: "Tihar (Day 4)", np: "तिहार (चौथो दिन)" }, publicHoliday: true },
  { month: 6, day: 15, festival: { en: "Chhath Parva", np: "छठ पर्व" }, publicHoliday: true },
  { month: 7, day: 1, festival: { en: "Guru Nanak Jayanti", np: "गुरु नानक जयन्ती" }, publicHoliday: true },
  { month: 8, day: 1, festival: { en: "Maghe Sankranti", np: "माघे सङ्क्रान्ति" }, publicHoliday: true },
  { month: 8, day: 16, festival: { en: "Martyrs' Day (Shahid Diwas)", np: "शहीद दिवस" }, publicHoliday: true },
  { month: 9, day: 7, festival: { en: "Democracy Day (Prajatantra Diwas)", np: "प्रजातन्त्र दिवस" }, publicHoliday: true },
  { month: 10, day: 8, festival: { en: "Ghode Jatra", np: "घोडे जात्रा" }, publicHoliday: true },
  { month: 11, day: 1, festival: { en: "Holi (Fagu Purnima)", np: "होली (फागु पूर्णिमा)" }, publicHoliday: true },
  { month: 12, day: 15, festival: { en: "Ram Nawami", np: "राम नवमी" }, publicHoliday: true },
];

/** Fixed Gregorian observances in Nepal local time. */
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

/** Year-specific AD overrides for moveable festivals (extend as needed). */
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

export function lookupBsEvent(bsMonth: number, bsDay: number): BsCalendarEvent | undefined {
  return BS_CALENDAR_EVENTS.find((event) => event.month === bsMonth && event.day === bsDay);
}

export function lookupAdEvents(adMonth: number, adDay: number, dateKey: string): AdCalendarEvent[] {
  const fixed = AD_CALENDAR_EVENTS.filter((event) => event.month === adMonth && event.day === adDay);
  const overrides = AD_YEAR_OVERRIDES[dateKey] ?? [];
  const moveable = getMoveableAdEvents(Number(dateKey.slice(0, 4)), adMonth, adDay);

  return [...fixed, ...overrides, ...moveable];
}
