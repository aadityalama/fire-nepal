"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getMsUntilNextNepalMidnight,
  getSmartNepalDayInfo,
  type SmartNepalDayInfo,
} from "@/lib/smart-nepal-info";

async function fetchDayInfoFromApi(): Promise<SmartNepalDayInfo | null> {
  try {
    const response = await fetch("/api/smart-nepal-info", { cache: "no-store" });
    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as SmartNepalDayInfo;
    if (!payload?.dateKey) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function useSmartNepalDayInfo() {
  const [dayInfo, setDayInfo] = useState<SmartNepalDayInfo>(() => getSmartNepalDayInfo());

  const refreshDayInfo = useCallback(() => {
    setDayInfo(getSmartNepalDayInfo());
  }, []);

  useEffect(() => {
    let cancelled = false;

    void fetchDayInfoFromApi().then((remoteInfo) => {
      if (!cancelled && remoteInfo) {
        setDayInfo(remoteInfo);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [dayInfo.dateKey]);

  useEffect(() => {
    const timeout = window.setTimeout(refreshDayInfo, getMsUntilNextNepalMidnight());
    return () => window.clearTimeout(timeout);
  }, [dayInfo.dateKey, refreshDayInfo]);

  return dayInfo;
}

export function useNepalLiveClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const interval = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  return now;
}
