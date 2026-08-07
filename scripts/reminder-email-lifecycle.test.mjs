#!/usr/bin/env node
/**
 * Unit tests for reminder email lifecycle + template content.
 * Run: npx tsx --test scripts/reminder-email-lifecycle.test.mjs
 */
import assert from "node:assert/strict";
import test from "node:test";
import {
  ensureEmailNotifyRegistration,
  isReminderActiveForEmail,
} from "../src/lib/scheduled-reminders/email-lifecycle.ts";
import {
  buildScheduledReminderEmail,
  reminderEmailStatus,
  reminderViewUrl,
} from "../src/lib/scheduled-reminders/email-templates.ts";

test("ensureEmailNotifyRegistration forces due+overdue when all flags off", () => {
  const out = ensureEmailNotifyRegistration({
    notify7DaysBefore: false,
    notify3DaysBefore: false,
    notify1DayBefore: false,
    notifyAtDueTime: false,
    notifyOverdue: false,
  });
  assert.equal(out.notifyAtDueTime, true);
  assert.equal(out.notifyOverdue, true);
});

test("ensureEmailNotifyRegistration keeps overdue on when any pre-due slot set", () => {
  const out = ensureEmailNotifyRegistration({
    notify7DaysBefore: true,
    notify3DaysBefore: false,
    notify1DayBefore: false,
    notifyAtDueTime: false,
    notifyOverdue: false,
  });
  assert.equal(out.notify7DaysBefore, true);
  assert.equal(out.notifyOverdue, true);
});

test("isReminderActiveForEmail excludes completed/archived/disabled", () => {
  assert.equal(isReminderActiveForEmail({ is_completed: false, is_archived: false, email_enabled: true }), true);
  assert.equal(isReminderActiveForEmail({ is_completed: true, is_archived: false, email_enabled: true }), false);
  assert.equal(isReminderActiveForEmail({ is_completed: false, is_archived: true, email_enabled: true }), false);
  assert.equal(isReminderActiveForEmail({ is_completed: false, is_archived: false, email_enabled: false }), false);
});

test("reminderEmailStatus classifies by local due date", () => {
  const now = new Date("2026-08-07T12:00:00.000Z");
  assert.equal(reminderEmailStatus("2026-08-06", "UTC", now), "Overdue");
  assert.equal(reminderEmailStatus("2026-08-07", "UTC", now), "Due Today");
  assert.equal(reminderEmailStatus("2026-08-10", "UTC", now), "Upcoming");
});

test("email template includes required fields and View Reminder CTA", () => {
  const built = buildScheduledReminderEmail({
    reminderId: "abc-123",
    title: "Room rent",
    amountNpr: 25000,
    reminderType: "room_rent",
    dueDate: "2026-08-07",
    dueTime: "09:00",
    timezone: "Asia/Kathmandu",
    slot: "due",
    status: "Due Today",
  });
  assert.match(built.subject, /Room rent/);
  assert.match(built.subject, /Due Today/);
  assert.match(built.html, /Room rent/);
  assert.match(built.html, /NPR/);
  assert.match(built.html, /25,000|25000/);
  assert.match(built.html, /Room rent|Category/i);
  assert.match(built.html, /2026-08-07/);
  assert.match(built.html, /Due Today/);
  assert.match(built.html, /View Reminder/);
  assert.match(built.html, /smart-reminders\?reminder=abc-123/);
  assert.match(built.text, /View Reminder:/);
  assert.equal(reminderViewUrl("abc-123").includes("reminder=abc-123"), true);
});
