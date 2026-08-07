#!/usr/bin/env node
/**
 * Notification destination routing for in-app smart reminder cards.
 * Run: npx tsx --test scripts/notification-nav.test.mjs
 */
import assert from "node:assert/strict";
import test from "node:test";
import { getInAppNotificationHref } from "../src/lib/smart-reminders/notification-nav.ts";

test("payment_due with reminderId deep-links to smart reminders", () => {
  assert.equal(
    getInAppNotificationHref({ kind: "payment_due", reminderId: "abc 123" }),
    "/smart-reminders?reminder=abc%20123",
  );
});

test("overdue with reminderId deep-links to smart reminders", () => {
  assert.equal(
    getInAppNotificationHref({ kind: "overdue", reminderId: "r1" }),
    "/smart-reminders?reminder=r1",
  );
});

test("email_sent without reminder falls back to smart reminders hub", () => {
  assert.equal(getInAppNotificationHref({ kind: "email_sent", reminderId: null }), "/smart-reminders");
});

test("family_shared navigates to family module", () => {
  assert.equal(getInAppNotificationHref({ kind: "family_shared", reminderId: null }), "/family");
  assert.equal(getInAppNotificationHref({ kind: "family_shared", reminderId: "x" }), "/family");
});
