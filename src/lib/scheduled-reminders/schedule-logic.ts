import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { addDays, addMonths, addYears, formatYmd, parseYmd } from "@/lib/smart-reminders/date-utils";
import type { RepeatFrequency } from "@/lib/smart-reminders/types";

export type EmailSlot = "d7" | "d3" | "d1" | "due" | "overdue";

export type ScheduleFlags = {
  notify7DaysBefore: boolean;
  notify3DaysBefore: boolean;
  notify1DayBefore: boolean;
  notifyAtDueTime: boolean;
  notifyOverdue: boolean;
};

export type ScheduledReminderShape = ScheduleFlags & {
  dueDate: string;
  dueTime: string;
  timezone: string;
  repeatFrequency: RepeatFrequency;
};

/** Normalize wall-clock times from UI (`HH:mm`) or PostgREST (`HH:mm:ss` / `HH:mm:ss.sss`). */
export function normalizeDueTime(dueTime: string): string {
  const m = /^(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/.exec(dueTime.trim());
  if (!m) return "09:00";
  const hh = Math.min(23, Math.max(0, Number.parseInt(m[1], 10)));
  const mm = Math.min(59, Math.max(0, Number.parseInt(m[2], 10)));
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

/** Gregorian calendar shift on YYYY-MM-DD (timezone-agnostic date math). */
export function addCalendarDaysYmd(ymd: string, deltaDays: number): string {
  const d = parseYmd(ymd);
  return formatYmd(addDays(d, deltaDays));
}

export function wallDateTimeToUtc(dueDate: string, dueTime: string, timezone: string): Date {
  const t = normalizeDueTime(dueTime);
  return fromZonedTime(`${dueDate} ${t}:00`, timezone);
}

export function utcToLocalYmd(d: Date, timezone: string): string {
  return formatInTimeZone(d, timezone, "yyyy-MM-dd");
}

export function utcToLocalHm(d: Date, timezone: string): string {
  return formatInTimeZone(d, timezone, "HH:mm");
}

function minuteWindowUtc(now: Date): { start: Date; end: Date } {
  const y = now.getUTCFullYear();
  const mo = now.getUTCMonth();
  const da = now.getUTCDate();
  const h = now.getUTCHours();
  const mi = now.getUTCMinutes();
  const start = new Date(Date.UTC(y, mo, da, h, mi, 0, 0));
  const end = new Date(start.getTime() + 60_000);
  return { start, end };
}

function inMinuteWindow(t: Date, start: Date, end: Date): boolean {
  const x = t.getTime();
  return x >= start.getTime() && x < end.getTime();
}

export function nextDueAfterPaidYmd(due: string, repeatFrequency: RepeatFrequency): string {
  const base = parseYmd(due);
  if (repeatFrequency === "once") return due;
  if (repeatFrequency === "daily") return formatYmd(addDays(base, 1));
  if (repeatFrequency === "weekly") return formatYmd(addDays(base, 7));
  if (repeatFrequency === "monthly") return formatYmd(addMonths(base, 1));
  if (repeatFrequency === "yearly") return formatYmd(addYears(base, 1));
  return due;
}

/** Roll `due` forward while the calendar date is strictly before "today" in `timezone`. */
export function rollForwardDueYmdIfNeeded(
  due: string,
  repeatFrequency: RepeatFrequency,
  nowUtc: Date,
  timezone: string,
): string {
  if (repeatFrequency === "once") return due;
  const todayInTz = utcToLocalYmd(nowUtc, timezone);
  let cur = due;
  let guard = 0;
  while (cur < todayInTz && guard < 400) {
    cur = nextDueAfterPaidYmd(cur, repeatFrequency);
    guard += 1;
  }
  return cur;
}

/** First overdue send strictly after `fromUtc` (local days after `dueDate`, at `dueTime`). */
export function nextOverdueSendUtc(dueDate: string, dueTime: string, timezone: string, fromUtc: Date): Date | null {
  const t = normalizeDueTime(dueTime);
  let ymd = addCalendarDaysYmd(dueDate, 1);
  for (let i = 0; i < 400; i += 1) {
    const candidate = wallDateTimeToUtc(ymd, t, timezone);
    if (candidate.getTime() > fromUtc.getTime()) return candidate;
    ymd = addCalendarDaysYmd(ymd, 1);
  }
  return null;
}

export type DueSlotFire = {
  slot: EmailSlot;
  anchorDueDate: string;
  fireAtUtc: Date;
  overdueLocalDate: string | null;
};

/** All candidate email fires for the current anchor row (before recurrence roll). */
export function listDueSlotFires(r: ScheduledReminderShape): DueSlotFire[] {
  const { dueDate, dueTime, timezone } = r;
  const t = normalizeDueTime(dueTime);
  const out: DueSlotFire[] = [];
  if (r.notify7DaysBefore) {
    out.push({
      slot: "d7",
      anchorDueDate: dueDate,
      fireAtUtc: wallDateTimeToUtc(addCalendarDaysYmd(dueDate, -7), t, timezone),
      overdueLocalDate: null,
    });
  }
  if (r.notify3DaysBefore) {
    out.push({
      slot: "d3",
      anchorDueDate: dueDate,
      fireAtUtc: wallDateTimeToUtc(addCalendarDaysYmd(dueDate, -3), t, timezone),
      overdueLocalDate: null,
    });
  }
  if (r.notify1DayBefore) {
    out.push({
      slot: "d1",
      anchorDueDate: dueDate,
      fireAtUtc: wallDateTimeToUtc(addCalendarDaysYmd(dueDate, -1), t, timezone),
      overdueLocalDate: null,
    });
  }
  if (r.notifyAtDueTime) {
    out.push({
      slot: "due",
      anchorDueDate: dueDate,
      fireAtUtc: wallDateTimeToUtc(dueDate, t, timezone),
      overdueLocalDate: null,
    });
  }
  return out;
}

/**
 * If we're past due and overdue emails are enabled, overdue fires at due_time on each local day after the due date.
 * `referenceUtc` is typically start of the cron minute.
 */
export function overdueFireForMinute(
  r: ScheduledReminderShape,
  referenceUtc: Date,
): { fireAtUtc: Date; overdueLocalDate: string } | null {
  if (!r.notifyOverdue) return null;
  const t = normalizeDueTime(r.dueTime);
  const dueUtc = wallDateTimeToUtc(r.dueDate, t, r.timezone);
  if (referenceUtc.getTime() <= dueUtc.getTime()) return null;

  const localYmd = utcToLocalYmd(referenceUtc, r.timezone);
  const localHm = utcToLocalHm(referenceUtc, r.timezone);
  if (localHm !== t) return null;

  if (localYmd <= r.dueDate) return null;

  return {
    fireAtUtc: wallDateTimeToUtc(localYmd, t, r.timezone),
    overdueLocalDate: localYmd,
  };
}

/** Default lookback for daily (or sparse) cron: cover missed sends between runs + timezone slack. */
export const SCHEDULED_REMINDERS_CRON_LOOKBACK_MS = 8 * 24 * 60 * 60 * 1000;

function maxYmd(a: string, b: string): string {
  return a >= b ? a : b;
}

function inUtcWindow(t: Date, windowStartMs: number, windowEndMs: number): boolean {
  const x = t.getTime();
  return x >= windowStartMs && x <= windowEndMs;
}

/**
 * Emails that should have fired between `nowUtc - lookbackMs` and `nowUtc` (inclusive).
 * Used when Vercel Cron runs at most once per day (Hobby); replaces minute-precise `firesDueThisMinute`.
 */
export function firesDueCatchUp(
  r: ScheduledReminderShape,
  nowUtc: Date,
  opts?: { rollAnchor?: boolean; lookbackMs?: number },
): DueSlotFire[] {
  const lookbackMs = opts?.lookbackMs ?? SCHEDULED_REMINDERS_CRON_LOOKBACK_MS;
  const roll = opts?.rollAnchor ?? true;
  const windowEndMs = nowUtc.getTime();
  const windowStartMs = windowEndMs - lookbackMs;

  let shape = { ...r };
  if (roll && r.repeatFrequency !== "once") {
    const rolled = rollForwardDueYmdIfNeeded(r.dueDate, r.repeatFrequency, nowUtc, r.timezone);
    if (rolled !== r.dueDate) shape = { ...shape, dueDate: rolled };
  }

  const hits: DueSlotFire[] = [];
  for (const f of listDueSlotFires(shape)) {
    if (inUtcWindow(f.fireAtUtc, windowStartMs, windowEndMs)) hits.push(f);
  }

  if (shape.notifyOverdue) {
    const t = normalizeDueTime(shape.dueTime);
    const dueUtc = wallDateTimeToUtc(shape.dueDate, t, shape.timezone);
    if (windowEndMs > dueUtc.getTime()) {
      const slackMs = 2 * 86_400_000;
      const approxStartUtc = new Date(windowStartMs - slackMs);
      const lowerYmd = utcToLocalYmd(approxStartUtc, shape.timezone);
      let ymd = maxYmd(addCalendarDaysYmd(shape.dueDate, 1), lowerYmd);
      const todayYmd = utcToLocalYmd(nowUtc, shape.timezone);
      for (let i = 0; i < 400 && ymd <= todayYmd; i += 1) {
        const fireAt = wallDateTimeToUtc(ymd, t, shape.timezone);
        if (inUtcWindow(fireAt, windowStartMs, windowEndMs)) {
          hits.push({
            slot: "overdue",
            anchorDueDate: shape.dueDate,
            fireAtUtc: fireAt,
            overdueLocalDate: ymd,
          });
        }
        ymd = addCalendarDaysYmd(ymd, 1);
      }
    }
  }

  return hits;
}

export function firesDueThisMinute(
  r: ScheduledReminderShape,
  nowUtc: Date,
  opts?: { rollAnchor?: boolean },
): DueSlotFire[] {
  const { start, end } = minuteWindowUtc(nowUtc);
  const roll = opts?.rollAnchor ?? true;
  let shape = { ...r };
  if (roll && r.repeatFrequency !== "once") {
    const rolled = rollForwardDueYmdIfNeeded(r.dueDate, r.repeatFrequency, nowUtc, r.timezone);
    if (rolled !== r.dueDate) shape = { ...shape, dueDate: rolled };
  }

  const hits: DueSlotFire[] = [];
  for (const f of listDueSlotFires(shape)) {
    if (inMinuteWindow(f.fireAtUtc, start, end)) hits.push(f);
  }

  const od = overdueFireForMinute(shape, start);
  if (od && inMinuteWindow(od.fireAtUtc, start, end)) {
    hits.push({
      slot: "overdue",
      anchorDueDate: shape.dueDate,
      fireAtUtc: od.fireAtUtc,
      overdueLocalDate: od.overdueLocalDate,
    });
  }
  return hits;
}

/** Earliest future email instant (preview for UI; ignores send history). */
export function nextTheoreticalEmailUtc(r: ScheduledReminderShape, fromUtc: Date): Date | null {
  const candidates: Date[] = [];
  const tryShape = (shape: ScheduledReminderShape) => {
    for (const f of listDueSlotFires(shape)) {
      if (f.fireAtUtc.getTime() > fromUtc.getTime()) candidates.push(f.fireAtUtc);
    }
    if (shape.notifyOverdue) {
      const n = nextOverdueSendUtc(shape.dueDate, shape.dueTime, shape.timezone, fromUtc);
      if (n) candidates.push(n);
    }
  };

  tryShape(r);
  if (r.repeatFrequency !== "once") {
    let nextAnchor = nextDueAfterPaidYmd(r.dueDate, r.repeatFrequency);
    for (let k = 0; k < 24; k += 1) {
      const rolled: ScheduledReminderShape = { ...r, dueDate: nextAnchor };
      tryShape(rolled);
      nextAnchor = nextDueAfterPaidYmd(nextAnchor, r.repeatFrequency);
    }
  }

  if (!candidates.length) return null;
  return candidates.reduce((a, b) => (a.getTime() <= b.getTime() ? a : b));
}

export function formatNextSendLabel(nextUtc: Date | null, displayTimezone: string): string {
  if (!nextUtc || Number.isNaN(nextUtc.getTime())) return "No upcoming email";
  return formatInTimeZone(nextUtc, displayTimezone, "EEE, MMM d, yyyy 'at' HH:mm zzz");
}
