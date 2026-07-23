/**
 * Sample expense → scheduled reminder → catch-up fire simulation.
 * Run after `npm install`: npx tsx scripts/reminders-e2e-sample.ts
 */
import { buildExpenseScheduledReminderBody } from "../src/lib/expense-workspace/expense-reminder-sync";
import { shouldDeliverExpenseInAppNotification } from "../src/lib/expense-workspace/expense-reminder-sync";
import {
  firesDueCatchUp,
  formatNextSendLabel,
  nextTheoreticalEmailUtc,
  normalizeDueTime,
  wallDateTimeToUtc,
  type ScheduledReminderShape,
} from "../src/lib/scheduled-reminders/schedule-logic";
import { isResendApiKeyConfigured, resolveResendFromAddress } from "../src/lib/resend-api";

function main() {
  const sample = buildExpenseScheduledReminderBody({
    title: "Room Rent July",
    amountNpr: 25000,
    category: "Rent",
    dueDate: "2026-07-23",
    email: "member@example.com",
    repeat: "Monthly",
    reminderTiming: "1 Day Before",
    expenseId: 1721718000000,
  });

  const shape: ScheduledReminderShape = {
    dueDate: sample.dueDate,
    dueTime: normalizeDueTime(sample.dueTime),
    timezone: sample.timezone,
    repeatFrequency: sample.repeatFrequency,
    notify7DaysBefore: sample.notify7DaysBefore,
    notify3DaysBefore: sample.notify3DaysBefore,
    notify1DayBefore: sample.notify1DayBefore,
    notifyAtDueTime: sample.notifyAtDueTime,
    notifyOverdue: sample.notifyOverdue,
  };

  // Simulate cron at 06:00 UTC on due day — d1 fire was yesterday 09:00 NPT.
  const cronNow = new Date("2026-07-23T06:00:00.000Z");
  const fires = firesDueCatchUp(shape, cronNow, { rollAnchor: true });
  const next = nextTheoreticalEmailUtc(shape, new Date("2026-07-21T00:00:00.000Z"));
  const d1Utc = wallDateTimeToUtc("2026-07-22", shape.dueTime, shape.timezone);

  const inAppTomorrow = shouldDeliverExpenseInAppNotification({
    reminderEnabled: true,
    reminderTiming: "1 Day Before",
    remainingDays: 1,
    tone: "tomorrow",
  });

  const report = {
    sample,
    normalizeDueTimeSeconds: normalizeDueTime("09:00:00"),
    d1FireAtUtc: d1Utc.toISOString(),
    firesAtCron: fires.map((f) => ({
      slot: f.slot,
      fireAtUtc: f.fireAtUtc.toISOString(),
      anchorDueDate: f.anchorDueDate,
    })),
    nextEmailPreview: formatNextSendLabel(next, shape.timezone),
    inAppTomorrow,
    resendConfigured: isResendApiKeyConfigured(),
    fromAddress: resolveResendFromAddress(),
    vercelCronPath: "/api/cron/scheduled-reminders",
    pipeline: [
      "1. Expense save with reminderEmail → POST /api/scheduled-reminders",
      "2. Vercel cron 0 6 * * * → GET /api/cron/scheduled-reminders",
      "3. firesDueCatchUp selects due slots in 8-day lookback",
      "4. Dedupe insert scheduled_reminder_email_sends",
      "5. sendEmailViaResend + reminder_logs email_sent",
      "6. In-app: buildNotifications / draftNotificationsForDay",
    ],
  };

  console.log(JSON.stringify(report, null, 2));

  if (!fires.some((f) => f.slot === "d1")) {
    console.error("FAIL: expected d1 fire in catch-up window for sample expense");
    process.exitCode = 1;
    return;
  }
  if (!inAppTomorrow) {
    console.error("FAIL: expected in-app notification for 1-day-before sample");
    process.exitCode = 1;
    return;
  }
  console.log("\nOK: sample expense reminder pipeline simulation passed");
}

main();
