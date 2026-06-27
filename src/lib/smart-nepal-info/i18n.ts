import type { SmartNepalInfoBarLocale } from "./types";

export type SmartNepalInfoBarCopy = {
  bsDate: string;
  festival: string;
  publicHolidayLabel: string;
  publicHolidayYes: string;
  publicHolidayNo: string;
  specialDay: string;
  nepalTime: string;
  noFestivalToday: string;
  noSpecialDayToday: string;
};

const COPY: Record<SmartNepalInfoBarLocale, SmartNepalInfoBarCopy> = {
  en: {
    bsDate: "Nepali Date",
    festival: "Festival",
    publicHolidayLabel: "Public Holiday",
    publicHolidayYes: "Today is a Public Holiday",
    publicHolidayNo: "No Public Holiday Today",
    specialDay: "Special Day",
    nepalTime: "Nepal Time",
    noFestivalToday: "Regular Day",
    noSpecialDayToday: "No Special Day Today",
  },
  np: {
    bsDate: "नेपाली मिति",
    festival: "पर्व / विशेष दिन",
    publicHolidayLabel: "सार्वजनिक बिदा",
    publicHolidayYes: "आज सार्वजनिक बिदा छ",
    publicHolidayNo: "आज सार्वजनिक बिदा छैन",
    specialDay: "राष्ट्रिय / अन्तर्राष्ट्रिय दिवस",
    nepalTime: "नेपाल समय",
    noFestivalToday: "सामान्य दिन",
    noSpecialDayToday: "आज विशेष दिवस छैन",
  },
};

export function getSmartNepalInfoBarCopy(locale: SmartNepalInfoBarLocale): SmartNepalInfoBarCopy {
  return COPY[locale];
}

export function resolveBarLocale(language: string): SmartNepalInfoBarLocale {
  return language === "np" ? "np" : "en";
}
