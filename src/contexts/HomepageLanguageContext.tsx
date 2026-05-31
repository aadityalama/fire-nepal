"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import {
  homepageTranslations,
  LANGUAGE_STORAGE_KEY,
  supportedLanguages,
} from "@/lib/i18n/homepage-translations";
import type { HomepageCopy, LanguageCode } from "@/lib/i18n/homepage-translations";

type HomepageLanguageContextValue = {
  language: LanguageCode;
  setLanguage: (language: LanguageCode) => void;
  copy: HomepageCopy;
};

const DEFAULT_LANGUAGE: LanguageCode = "en";
const languageCodes = new Set<LanguageCode>(supportedLanguages.map((language) => language.code));
const LANGUAGE_CHANGE_EVENT = "fire-nepal-language-change";
const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

const HomepageLanguageContext = createContext<HomepageLanguageContextValue | null>(null);

function isLanguageCode(value: string | null): value is LanguageCode {
  return value !== null && languageCodes.has(value as LanguageCode);
}

function getCookieLanguage(): LanguageCode | null {
  const cookieLanguage = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith(`${LANGUAGE_STORAGE_KEY}=`))
    ?.split("=")[1];

  const decodedLanguage = cookieLanguage ? decodeURIComponent(cookieLanguage) : null;
  return isLanguageCode(decodedLanguage) ? decodedLanguage : null;
}

function getStoredLanguage(): LanguageCode {
  if (typeof window === "undefined") {
    return DEFAULT_LANGUAGE;
  }

  const storedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (isLanguageCode(storedLanguage)) {
    return storedLanguage;
  }

  return getCookieLanguage() ?? DEFAULT_LANGUAGE;
}

function subscribeToLanguageChanges(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(LANGUAGE_CHANGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(LANGUAGE_CHANGE_EVENT, onStoreChange);
  };
}

export function HomepageLanguageProvider({ children }: { children: ReactNode }) {
  const language = useSyncExternalStore(subscribeToLanguageChanges, getStoredLanguage, () => DEFAULT_LANGUAGE);

  useEffect(() => {
    const htmlLanguage = language === "np" ? "ne" : language === "kr" ? "ko" : language === "ja" ? "ja" : "en";
    document.documentElement.lang = htmlLanguage;
    document.documentElement.dataset.homepageLanguage = language;
  }, [language]);

  const setLanguage = useCallback((nextLanguage: LanguageCode) => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
    document.cookie = `${LANGUAGE_STORAGE_KEY}=${encodeURIComponent(nextLanguage)}; path=/; max-age=${ONE_YEAR_IN_SECONDS}; SameSite=Lax`;
    window.dispatchEvent(new Event(LANGUAGE_CHANGE_EVENT));
  }, []);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      copy: homepageTranslations[language],
    }),
    [language, setLanguage],
  );

  return <HomepageLanguageContext.Provider value={value}>{children}</HomepageLanguageContext.Provider>;
}

export function useHomepageLanguage() {
  const context = useContext(HomepageLanguageContext);

  if (!context) {
    throw new Error("useHomepageLanguage must be used within HomepageLanguageProvider");
  }

  return context;
}
