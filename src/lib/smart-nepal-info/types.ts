export type LocalizedLabel = {
  en: string;
  np: string;
};

export type FestivalSource = "hamro-patro" | "ad-observance" | null;

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
  /** Where the festival label came from (Hamro Patro is authoritative for Nepali festivals). */
  festivalSource: FestivalSource;
  /** Hamro Patro public date page used for the festival, when applicable. */
  festivalSourceUrl: string | null;
  publicHoliday: boolean;
  /** National or international observance (may overlap with festival). */
  specialDay: LocalizedLabel | null;
};

export type SmartNepalInfoBarLocale = "en" | "np";
