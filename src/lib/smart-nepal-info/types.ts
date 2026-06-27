export type LocalizedLabel = {
  en: string;
  np: string;
};

export type SmartNepalDayInfo = {
  /** Nepal-local AD date key (YYYY-MM-DD). */
  dateKey: string;
  bsDate: {
    year: number;
    month: number;
    day: number;
    weekdayIndex: number;
  };
  /** Primary festival for the day, if any. */
  festival: LocalizedLabel | null;
  publicHoliday: boolean;
  /** National or international observance (may overlap with festival). */
  specialDay: LocalizedLabel | null;
};

export type InfoChipKind =
  | "bs-date"
  | "festival"
  | "public-holiday"
  | "special-day"
  | "nepal-time"
  | "weather"
  | "gold"
  | "nepse"
  | "exchange";

export type InfoChipData = {
  id: string;
  kind: InfoChipKind;
  emoji: string;
  label: string;
  value: string;
  subValue?: string;
};

export type SmartNepalInfoBarLocale = "en" | "np";
