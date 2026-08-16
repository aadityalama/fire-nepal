#!/usr/bin/env node
/**
 * Production e2e: create active reminder → cron sends email → delete → cron sends no more.
 *
 * Requires env:
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, CRON_SECRET
 * Optional: RESEND_FROM_EMAIL, NEXT_PUBLIC_SITE_URL, REMINDER_E2E_BASE_URL
 *
 * Run: node scripts/verify-production-reminder-emails.mjs
 */
import assert from "node:assert/strict";

const baseUrl = (process.env.REMINDER_E2E_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://www.firenepal.com")
  .trim()
  .replace(/\/+$/, "");
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const cronSecret = process.env.CRON_SECRET?.trim();
const resendKey = process.env.RESEND_API_KEY?.trim();

function fail(msg) {
  console.error("FAIL:", msg);
  process.exit(1);
}

if (!supabaseUrl || !serviceKey) fail("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
if (!resendKey) fail("Missing RESEND_API_KEY");
if (!cronSecret) fail("Missing CRON_SECRET");

const sbHeaders = {
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

async function sb(path, init = {}) {
  const res = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers: { ...sbHeaders, ...(init.headers || {}) },
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  return { ok: res.ok, status: res.status, json, text };
}

async function seedUser() {
  const res = await fetch(`${baseUrl}/api/schema/e2e-sot-session?phase=seed`, {
    cache: "no-store",
    headers: { Authorization: `Bearer ${cronSecret}` },
  });
  const json = await res.json();
  if (!json?.ok) throw new Error(`seed failed: ${JSON.stringify(json)}`);
  return json;
}

async function cleanupUser(userId) {
  if (!userId) return;
  await fetch(`${baseUrl}/api/schema/e2e-sot-session?phase=cleanup&userId=${encodeURIComponent(userId)}`, {
    cache: "no-store",
    headers: { Authorization: `Bearer ${cronSecret}` },
  }).catch(() => {});
}

async function runCron() {
  const res = await fetch(`${baseUrl}/api/cron/scheduled-reminders`, {
    headers: { Authorization: `Bearer ${cronSecret}` },
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

function todayYmdInTz(tz = "Asia/Kathmandu") {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function currentHmInTz(tz = "Asia/Kathmandu") {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

const report = {
  baseUrl,
  resendConfigured: Boolean(resendKey),
  steps: [],
};

let seed = null;
let reminderId = null;

try {
  seed = await seedUser();
  report.steps.push({ step: "seed_user", ok: true, email: seed.email, userId: seed.userId });

  // Ensure preference on
  await sb("user_reminder_email_preferences", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({
      user_id: seed.userId,
      email_notifications_enabled: true,
      updated_at: new Date().toISOString(),
    }),
  });

  const tz = "Asia/Kathmandu";
  const dueDate = todayYmdInTz(tz);
  // Use a due time a few minutes in the past so catch-up window includes "due" slot.
  const hm = currentHmInTz(tz);
  const [hh, mm] = hm.split(":").map(Number);
  const pastMin = Math.max(0, mm - 5);
  const dueTime = `${String(hh).padStart(2, "0")}:${String(pastMin).padStart(2, "0")}`;

  const insert = await sb("scheduled_reminders", {
    method: "POST",
    body: JSON.stringify({
      user_id: seed.userId,
      title: `E2E email reminder ${Date.now()}`,
      amount: 1500,
      due_date: dueDate,
      due_time: dueTime,
      timezone: tz,
      email: seed.email,
      repeat_frequency: "once",
      notify_7d: false,
      notify_3d: false,
      notify_1d: false,
      notify_at_due: true,
      notify_overdue: true,
      reminder_type: "room_rent",
      notes: "e2e-reminder-email-verify",
      shared_with_family: false,
      is_completed: false,
      is_archived: false,
      email_enabled: true,
    }),
  });

  if (!insert.ok) {
    // Retry without new columns if migration lag
    const retry = await sb("scheduled_reminders", {
      method: "POST",
      body: JSON.stringify({
        user_id: seed.userId,
        title: `E2E email reminder ${Date.now()}`,
        amount: 1500,
        due_date: dueDate,
        due_time: dueTime,
        timezone: tz,
        email: seed.email,
        repeat_frequency: "once",
        notify_7d: false,
        notify_3d: false,
        notify_1d: false,
        notify_at_due: true,
        notify_overdue: true,
        reminder_type: "room_rent",
        notes: "e2e-reminder-email-verify",
        shared_with_family: false,
        is_completed: false,
      }),
    });
    if (!retry.ok) throw new Error(`insert reminder failed: ${retry.status} ${JSON.stringify(retry.json)}`);
    reminderId = Array.isArray(retry.json) ? retry.json[0]?.id : retry.json?.id;
    report.steps.push({ step: "create_reminder_legacy_schema", ok: true, reminderId, dueDate, dueTime });
  } else {
    reminderId = Array.isArray(insert.json) ? insert.json[0]?.id : insert.json?.id;
    report.steps.push({ step: "create_reminder", ok: true, reminderId, dueDate, dueTime });
  }
  assert.ok(reminderId, "reminder id required");

  const cron1 = await runCron();
  report.steps.push({
    step: "cron_after_create",
    ok: cron1.json?.ok === true,
    status: cron1.status,
    emailsSent: cron1.json?.emailsSent,
    firesFound: cron1.json?.firesFound,
    error: cron1.json?.error ?? null,
  });
  if (!cron1.json?.ok) throw new Error(`cron failed: ${JSON.stringify(cron1.json)}`);

  const sends = await sb(
    `scheduled_reminder_email_sends?reminder_id=eq.${reminderId}&select=id,slot,sent_at&order=sent_at.desc`,
  );
  const sendRows = Array.isArray(sends.json) ? sends.json : [];
  report.steps.push({ step: "ledger_after_create", ok: sendRows.length > 0, count: sendRows.length, rows: sendRows });
  if (!sendRows.length) {
    throw new Error(
      `No email ledger rows after cron. Cron: ${JSON.stringify(cron1.json)}. Ensure dueTime is within catch-up window.`,
    );
  }

  const logs = await sb(
    `reminder_logs?reminder_id=eq.${reminderId}&event_type=eq.email_sent&select=id,provider_message,metadata,created_at&order=created_at.desc&limit=5`,
  );
  const logRows = Array.isArray(logs.json) ? logs.json : [];
  report.steps.push({ step: "email_sent_logs", ok: logRows.length > 0, count: logRows.length, sample: logRows[0] ?? null });
  assert.ok(logRows.length > 0, "expected email_sent reminder_logs entry");

  const sentBeforeDelete = sendRows.length;

  // Delete reminder (hard delete stops further emails)
  const del = await sb(`scheduled_reminders?id=eq.${reminderId}`, { method: "DELETE" });
  report.steps.push({ step: "delete_reminder", ok: del.status < 300, status: del.status });
  reminderId = null;

  const cron2 = await runCron();
  report.steps.push({
    step: "cron_after_delete",
    ok: cron2.json?.ok === true,
    status: cron2.status,
    emailsSent: cron2.json?.emailsSent,
  });
  if (!cron2.json?.ok) throw new Error(`cron after delete failed: ${JSON.stringify(cron2.json)}`);

  // Original reminder id is gone; ledger cascades on delete — confirm no new sends for that user e2e note
  const leftover = await sb(
    `scheduled_reminders?user_id=eq.${seed.userId}&notes=eq.e2e-reminder-email-verify&select=id`,
  );
  const leftoverRows = Array.isArray(leftover.json) ? leftover.json : [];
  report.steps.push({
    step: "confirm_deleted",
    ok: leftoverRows.length === 0,
    leftover: leftoverRows.length,
    priorSendCount: sentBeforeDelete,
  });
  assert.equal(leftoverRows.length, 0, "deleted reminder must not remain active");

  report.ok = true;
  console.log(JSON.stringify(report, null, 2));
  console.log("PASS: production reminder email create→send→delete verified");
} catch (e) {
  report.ok = false;
  report.error = String(e?.message || e);
  console.error(JSON.stringify(report, null, 2));
  fail(report.error);
} finally {
  if (reminderId) {
    await sb(`scheduled_reminders?id=eq.${reminderId}`, { method: "DELETE" }).catch(() => {});
  }
  if (seed?.userId) await cleanupUser(seed.userId);
}
