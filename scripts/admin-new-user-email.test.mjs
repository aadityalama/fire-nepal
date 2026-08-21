#!/usr/bin/env node
/**
 * Unit tests for admin new-user registration notification email.
 * Run: npx tsx --test scripts/admin-new-user-email.test.mjs
 */
import assert from "node:assert/strict";
import test from "node:test";
import {
  ADMIN_NEW_USER_EMAIL_SUBJECT,
  adminPanelUrl,
  buildAdminNewUserEmail,
  formatRegistrationDateTime,
  resolveAdminNewUserLogoUrl,
} from "../src/lib/admin-new-user-email/email-templates.ts";

test("adminPanelUrl points at /admin", () => {
  assert.equal(adminPanelUrl("https://www.firenepal.com"), "https://www.firenepal.com/admin");
  assert.equal(adminPanelUrl("https://www.firenepal.com/"), "https://www.firenepal.com/admin");
});

test("resolveAdminNewUserLogoUrl prefers FIRE_NEPAL_LOGO_URL then email-logo asset", () => {
  const prev = process.env.FIRE_NEPAL_LOGO_URL;
  delete process.env.FIRE_NEPAL_LOGO_URL;
  assert.equal(resolveAdminNewUserLogoUrl("https://www.firenepal.com"), "https://www.firenepal.com/email-logo.png");
  process.env.FIRE_NEPAL_LOGO_URL = "https://cdn.example.com/logo.png";
  assert.equal(resolveAdminNewUserLogoUrl("https://www.firenepal.com"), "https://cdn.example.com/logo.png");
  if (prev === undefined) delete process.env.FIRE_NEPAL_LOGO_URL;
  else process.env.FIRE_NEPAL_LOGO_URL = prev;
});

test("new-user admin email includes required fields, CTA, and branded footer", () => {
  const registeredAt = "2026-08-21T05:30:00.000Z";
  const built = buildAdminNewUserEmail({
    name: "Ram Bahadur",
    email: "ram@example.com",
    userId: "11111111-2222-4333-8444-555555555555",
    registeredAtIso: registeredAt,
    adminPanelUrl: "https://www.firenepal.com/admin",
    logoUrl: "https://www.firenepal.com/email-logo.png",
    accountStatus: "Active",
  });

  assert.equal(built.subject, ADMIN_NEW_USER_EMAIL_SUBJECT);
  assert.equal(built.subject, "🔥 New FIRE Nepal User Registration");

  assert.match(built.html, /A new user has registered on FIRE Nepal/);
  assert.match(built.html, /Ram Bahadur/);
  assert.match(built.html, /ram@example\.com/);
  assert.match(built.html, /11111111-2222-4333-8444-555555555555/);
  assert.match(built.html, /Active/);
  assert.match(built.html, /Open Admin Panel/);
  assert.match(built.html, /https:\/\/www\.firenepal\.com\/admin/);
  assert.match(built.html, /email-logo\.png/);
  assert.match(built.html, /FIRE Nepal/);
  assert.match(built.html, /www\.firenepal\.com/);
  assert.match(built.html, /support@firenepal\.com/);
  assert.match(built.html, /Please review the new member/);
  assert.doesNotMatch(built.html, /password/i);
  assert.doesNotMatch(built.html, /RESEND/i);

  assert.match(built.text, /A new user has registered on FIRE Nepal/);
  assert.match(built.text, /• Name: Ram Bahadur/);
  assert.match(built.text, /• Email: ram@example\.com/);
  assert.match(built.text, /• User ID: 11111111-2222-4333-8444-555555555555/);
  assert.match(built.text, /• Account Status: Active/);
  assert.match(built.text, /Admin Panel:/);
  assert.match(built.text, /https:\/\/www\.firenepal\.com\/admin/);
  assert.match(built.text, /Please review the new member/);

  const formatted = formatRegistrationDateTime(registeredAt);
  assert.match(built.html, new RegExp(formatted.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(built.text, new RegExp(formatted.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("new-user admin email escapes HTML in user-controlled fields", () => {
  const built = buildAdminNewUserEmail({
    name: `<script>alert(1)</script>`,
    email: `evil@example.com`,
    userId: `"><img src=x onerror=alert(1)>`,
    registeredAtIso: "2026-08-21T05:30:00.000Z",
    adminPanelUrl: "https://www.firenepal.com/admin",
    logoUrl: "https://www.firenepal.com/email-logo.png",
  });
  assert.doesNotMatch(built.html, /<script>/);
  assert.match(built.html, /&lt;script&gt;/);
  assert.match(built.html, /&quot;&gt;&lt;img/);
});

test("sendAdminNewUserEmail is idempotent for the same userId", async () => {
  const {
    __resetAdminNewUserEmailDedupeForTests,
    sendAdminNewUserEmail,
  } = await import("../src/lib/admin-notifications.ts");

  __resetAdminNewUserEmailDedupeForTests();

  const prevKey = process.env.RESEND_API_KEY;
  const prevAdmin = process.env.ADMIN_NOTIFICATION_EMAIL;
  const prevFrom = process.env.RESEND_FROM_EMAIL;
  process.env.RESEND_API_KEY = "test-resend-key";
  process.env.ADMIN_NOTIFICATION_EMAIL = "admin@example.com";
  process.env.RESEND_FROM_EMAIL = "FIRE Nepal <onboarding@firenepal.com>";

  let sendCount = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : String(input.url ?? input);
    if (url.includes("api.resend.com/emails")) {
      sendCount += 1;
      return new Response(JSON.stringify({ id: `email_${sendCount}` }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return originalFetch(input, init);
  };

  try {
    const params = {
      name: "Test User",
      email: "new@example.com",
      userId: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
      registeredAtIso: "2026-08-21T06:00:00.000Z",
    };

    const first = await sendAdminNewUserEmail(params);
    const second = await sendAdminNewUserEmail(params);

    assert.equal(first.ok, true);
    assert.equal(first.skipped, undefined);
    assert.equal(second.ok, true);
    assert.equal(second.skipped, true);
    assert.equal(second.reason, "already_sent");
    assert.equal(sendCount, 1, "Resend must be called only once for the same userId");
  } finally {
    globalThis.fetch = originalFetch;
    __resetAdminNewUserEmailDedupeForTests();
    if (prevKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = prevKey;
    if (prevAdmin === undefined) delete process.env.ADMIN_NOTIFICATION_EMAIL;
    else process.env.ADMIN_NOTIFICATION_EMAIL = prevAdmin;
    if (prevFrom === undefined) delete process.env.RESEND_FROM_EMAIL;
    else process.env.RESEND_FROM_EMAIL = prevFrom;
  }
});

test("sendAdminNewUserEmail skips when ADMIN_NOTIFICATION_EMAIL is unset", async () => {
  const {
    __resetAdminNewUserEmailDedupeForTests,
    sendAdminNewUserEmail,
  } = await import("../src/lib/admin-notifications.ts");

  __resetAdminNewUserEmailDedupeForTests();

  const prevKey = process.env.RESEND_API_KEY;
  const prevAdmin = process.env.ADMIN_NOTIFICATION_EMAIL;
  process.env.RESEND_API_KEY = "test-resend-key";
  delete process.env.ADMIN_NOTIFICATION_EMAIL;

  let sendCount = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : String(input.url ?? input);
    if (url.includes("api.resend.com/emails")) {
      sendCount += 1;
      return new Response(JSON.stringify({ id: "should-not-send" }), { status: 200 });
    }
    return originalFetch(input, init);
  };

  try {
    const result = await sendAdminNewUserEmail({
      name: "Test User",
      email: "new@example.com",
      userId: "bbbbbbbb-bbbb-4ccc-8ddd-eeeeeeeeeeee",
      registeredAtIso: "2026-08-21T06:00:00.000Z",
    });
    assert.equal(result.ok, false);
    assert.equal(result.skipped, true);
    assert.equal(result.reason, "recipient_not_configured");
    assert.equal(sendCount, 0);
  } finally {
    globalThis.fetch = originalFetch;
    __resetAdminNewUserEmailDedupeForTests();
    if (prevKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = prevKey;
    if (prevAdmin === undefined) delete process.env.ADMIN_NOTIFICATION_EMAIL;
    else process.env.ADMIN_NOTIFICATION_EMAIL = prevAdmin;
  }
});

test("sendAdminNewUserEmail failure does not throw (registration must stay ok)", async () => {
  const {
    __resetAdminNewUserEmailDedupeForTests,
    sendAdminNewUserEmail,
  } = await import("../src/lib/admin-notifications.ts");

  __resetAdminNewUserEmailDedupeForTests();

  const prevKey = process.env.RESEND_API_KEY;
  const prevAdmin = process.env.ADMIN_NOTIFICATION_EMAIL;
  const prevFrom = process.env.RESEND_FROM_EMAIL;
  process.env.RESEND_API_KEY = "test-resend-key";
  process.env.ADMIN_NOTIFICATION_EMAIL = "admin@example.com";
  process.env.RESEND_FROM_EMAIL = "FIRE Nepal <onboarding@firenepal.com>";

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : String(input.url ?? input);
    if (url.includes("api.resend.com/emails")) {
      return new Response(JSON.stringify({ message: "provider down" }), { status: 500 });
    }
    return originalFetch(input, init);
  };

  try {
    const result = await sendAdminNewUserEmail({
      name: "Test User",
      email: "new@example.com",
      userId: "cccccccc-bbbb-4ccc-8ddd-eeeeeeeeeeee",
      registeredAtIso: "2026-08-21T06:00:00.000Z",
    });
    assert.equal(result.ok, false);
    assert.equal(result.reason, "send_failed");
  } finally {
    globalThis.fetch = originalFetch;
    __resetAdminNewUserEmailDedupeForTests();
    if (prevKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = prevKey;
    if (prevAdmin === undefined) delete process.env.ADMIN_NOTIFICATION_EMAIL;
    else process.env.ADMIN_NOTIFICATION_EMAIL = prevAdmin;
    if (prevFrom === undefined) delete process.env.RESEND_FROM_EMAIL;
    else process.env.RESEND_FROM_EMAIL = prevFrom;
  }
});
