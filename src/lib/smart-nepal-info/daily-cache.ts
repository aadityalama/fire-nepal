import type { SmartNepalDayInfo } from "./types";

const dayInfoCache = new Map<string, SmartNepalDayInfo>();

export function getCachedDayInfo(dateKey: string): SmartNepalDayInfo | undefined {
  return dayInfoCache.get(dateKey);
}

export function setCachedDayInfo(info: SmartNepalDayInfo): SmartNepalDayInfo {
  dayInfoCache.set(info.dateKey, info);
  return info;
}

export function resolveWithDailyCache(
  dateKey: string,
  resolver: () => SmartNepalDayInfo,
): SmartNepalDayInfo {
  const cached = getCachedDayInfo(dateKey);
  if (cached) {
    return cached;
  }

  return setCachedDayInfo(resolver());
}

export function clearDayInfoCache(): void {
  dayInfoCache.clear();
}
