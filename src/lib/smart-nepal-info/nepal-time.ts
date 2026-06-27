const NEPAL_TIME_ZONE = "Asia/Kathmandu";

export function getNepalDateKey(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: NEPAL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function getNepalAdDateParts(date: Date = new Date()): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: NEPAL_TIME_ZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(date);

  const lookup = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));

  return {
    year: Number(lookup.year),
    month: Number(lookup.month),
    day: Number(lookup.day),
  };
}

/** Stable AD reference at Nepal-local noon for BS conversion. */
export function getNepalReferenceDate(date: Date = new Date()): Date {
  const { year, month, day } = getNepalAdDateParts(date);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

export function getMsUntilNextNepalMidnight(now: Date = new Date()): number {
  const currentKey = getNepalDateKey(now);
  let probe = now.getTime() + 60_000;

  while (getNepalDateKey(new Date(probe)) === currentKey) {
    probe += 60_000;
  }

  return Math.max(probe - now.getTime() + 250, 1_000);
}

export const nepalTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: NEPAL_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

export const nepalTimeZoneLabel = "NPT";
