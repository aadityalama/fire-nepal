/** Labels for `dayOfWeek`: 0 = Monday … 6 = Sunday */
export const SCHEDULE_DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

/** Monday-first index (0–6) for a given date (default: today). */
export function mondayFirstDayOfWeek(d = new Date()): number {
  return (d.getDay() + 6) % 7;
}

export function scheduleDayLabel(dayOfWeek: number): string {
  return SCHEDULE_DAY_LABELS[Math.max(0, Math.min(6, Math.floor(dayOfWeek)))] ?? "—";
}
