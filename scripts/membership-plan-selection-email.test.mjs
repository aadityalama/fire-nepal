#!/usr/bin/env node
/**
 * Plan-selection invite email + Free-only Quick Action visibility tests.
 * Run: npx tsx --test scripts/membership-plan-selection-email.test.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  PLAN_SELECTION_EMAIL_SUBJECT,
  buildPlanSelectionEmail,
} from "../src/lib/membership-plan-selection-email/email-templates.ts";
import {
  buildPlanSelectionUrl,
  createPlanSelectionInviteToken,
  verifyPlanSelectionInviteToken,
} from "../src/lib/membership-plan-selection-email/invite-token.ts";
import {
  PLAN_SELECTION_EMAIL_SUCCESS_MESSAGE,
  sendPlanSelectionEmailForAdmin,
} from "../src/lib/membership-plan-selection-email/send-plan-selection-email.ts";

const SECRET = "test-plan-selection-secret";

function mockAdmin({
  sentRecently = false,
  email = "member@example.com",
  emailConfirmed = true,
  insertError = null,
} = {}) {
  const inserts = [];
  return {
    inserts,
    admin: {
      auth: {
        admin: {
          getUserById: async () => ({
            data: {
              user: {
                email,
                email_confirmed_at: emailConfirmed ? "2026-01-01T00:00:00.000Z" : null,
              },
            },
            error: null,
          }),
        },
      },
      from(table) {
        if (table !== "membership_plan_selection_emails") {
          throw new Error(`unexpected table ${table}`);
        }
        return {
          select() {
            return {
              eq() {
                return {
                  eq() {
                    return {
                      gte() {
                        return {
                          limit() {
                            return {
                              maybeSingle: async () => ({
                                data: sentRecently ? { id: "recent" } : null,
                                error: null,
                              }),
                            };
                          },
                        };
                      },
                    };
                  },
                };
              },
            };
          },
          insert(row) {
            inserts.push(row);
            return Promise.resolve({ error: insertError });
          },
        };
      },
    },
  };
}

test("invite token identifies member without exposing email", () => {
  const token = createPlanSelectionInviteToken("user-abc", 1_700_000_000, SECRET);
  assert.doesNotMatch(token, /@/);
  assert.doesNotMatch(token, /member@/i);
  const verified = verifyPlanSelectionInviteToken(token, SECRET, 1_700_000_000);
  assert.equal(verified.ok, true);
  if (verified.ok) assert.equal(verified.userId, "user-abc");
});

test("invite token rejects bad signature and expiry", () => {
  const token = createPlanSelectionInviteToken("user-abc", 1_700_000_000, SECRET);
  assert.equal(verifyPlanSelectionInviteToken(token + "x", SECRET, 1_700_000_000).ok, false);
  assert.equal(verifyPlanSelectionInviteToken(token, SECRET, 1_700_000_000 + 20 * 24 * 3600).ok, false);
});

test("plan selection URL targets membership plan-selection page with opaque invite", () => {
  const prev = process.env.AUTH_SECRET;
  process.env.AUTH_SECRET = SECRET;
  try {
    const url = buildPlanSelectionUrl("user-xyz", "https://www.firenepal.com");
    assert.match(url, /^https:\/\/www\.firenepal\.com\/dashboard\/membership\?invite=/);
    assert.match(url, /#membership-plan-selection$/);
    assert.doesNotMatch(url, /@/);
    const invite = new URL(url).searchParams.get("invite") ?? "";
    const verified = verifyPlanSelectionInviteToken(invite, SECRET);
    assert.equal(verified.ok, true);
    if (verified.ok) assert.equal(verified.userId, "user-xyz");
  } finally {
    if (prev === undefined) delete process.env.AUTH_SECRET;
    else process.env.AUTH_SECRET = prev;
  }
});

test("plan selection email includes CTA, branding footer, and plan choices", () => {
  const built = buildPlanSelectionEmail({
    memberName: "Sita Sharma",
    planSelectionUrl: "https://www.firenepal.com/dashboard/membership?invite=abc#membership-plan-selection",
    logoUrl: "https://www.firenepal.com/email-logo.png",
  });
  assert.equal(built.subject, PLAN_SELECTION_EMAIL_SUBJECT);
  assert.match(built.html, /Sita Sharma/);
  assert.match(built.html, /Premium/);
  assert.match(built.html, /Elite/);
  assert.match(built.html, /Choose Premium or Elite/);
  assert.match(built.html, /dashboard\/membership\?invite=abc/);
  assert.match(built.html, /email-logo\.png/);
  assert.match(built.html, /www\.firenepal\.com/);
  assert.match(built.html, /support@firenepal\.com/);
  assert.match(built.html, /mailto:support@firenepal\.com/);
  assert.match(built.html, /© FIRE Nepal\. All rights reserved\./);
  assert.match(built.text, /Choose Premium or Elite/);
});

test("sendPlanSelectionEmailForAdmin succeeds for Free member with verified email", async () => {
  const prevFetch = globalThis.fetch;
  const prevKey = process.env.RESEND_API_KEY;
  process.env.RESEND_API_KEY = "test-key";
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({ id: "re_plan_1" }),
    text: async () => "",
  });
  try {
    const { admin, inserts } = mockAdmin({ emailConfirmed: true });
    const result = await sendPlanSelectionEmailForAdmin(admin, {
      userId: "u1",
      memberName: "Ram",
      plan: "free",
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.message, PLAN_SELECTION_EMAIL_SUCCESS_MESSAGE);
      assert.equal(result.resendId, "re_plan_1");
    }
    assert.equal(inserts[0]?.delivery_status, "sent");
  } finally {
    globalThis.fetch = prevFetch;
    if (prevKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = prevKey;
  }
});

test("sendPlanSelectionEmailForAdmin errors when email is not verified", async () => {
  const prevKey = process.env.RESEND_API_KEY;
  process.env.RESEND_API_KEY = "test-key";
  try {
    const { admin, inserts } = mockAdmin({ emailConfirmed: false });
    const result = await sendPlanSelectionEmailForAdmin(admin, {
      userId: "u2",
      memberName: "Maya",
      plan: "free",
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.code, "email_not_verified");
      assert.match(result.error, /verified email/i);
    }
    assert.equal(inserts[0]?.delivery_status, "skipped");
  } finally {
    if (prevKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = prevKey;
  }
});

test("sendPlanSelectionEmailForAdmin reports send failure", async () => {
  const prevFetch = globalThis.fetch;
  const prevKey = process.env.RESEND_API_KEY;
  process.env.RESEND_API_KEY = "test-key";
  globalThis.fetch = async () => ({
    ok: false,
    status: 500,
    json: async () => ({}),
    text: async () => "provider down",
  });
  try {
    const { admin, inserts } = mockAdmin();
    const result = await sendPlanSelectionEmailForAdmin(admin, {
      userId: "u3",
      memberName: "Hari",
      plan: "free",
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.code, "send_failed");
      assert.match(result.error, /Failed to send/i);
    }
    assert.equal(inserts[0]?.delivery_status, "failed");
  } finally {
    globalThis.fetch = prevFetch;
    if (prevKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = prevKey;
  }
});

test("sendPlanSelectionEmailForAdmin rejects Premium and Elite plans", async () => {
  const prevKey = process.env.RESEND_API_KEY;
  process.env.RESEND_API_KEY = "test-key";
  try {
    for (const plan of ["premium", "elite"]) {
      const { admin, inserts } = mockAdmin();
      const result = await sendPlanSelectionEmailForAdmin(admin, {
        userId: "u4",
        memberName: "Paid",
        plan,
      });
      assert.equal(result.ok, false);
      if (!result.ok) assert.equal(result.code, "not_free");
      assert.equal(inserts.length, 0);
    }
  } finally {
    if (prevKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = prevKey;
  }
});

test("sendPlanSelectionEmailForAdmin prevents duplicate recent sends", async () => {
  const prevKey = process.env.RESEND_API_KEY;
  process.env.RESEND_API_KEY = "test-key";
  try {
    const { admin } = mockAdmin({ sentRecently: true });
    const result = await sendPlanSelectionEmailForAdmin(admin, {
      userId: "u5",
      memberName: "Dup",
      plan: "free",
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, "duplicate");
  } finally {
    if (prevKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = prevKey;
  }
});

test("MemberCrmDrawer shows plan-selection Quick Action only for Free members", () => {
  const src = readFileSync(new URL("../src/components/admin/MemberCrmDrawer.tsx", import.meta.url), "utf8");
  assert.match(src, /const isFree = crm\?\.planType === "free"/);
  assert.match(src, /\{isFree \? \(/);
  assert.match(src, /Send plan selection email/);
  assert.match(src, /plan-selection-email/);
  assert.match(src, /PLAN_SELECTION_EMAIL_SUCCESS_MESSAGE|Plan selection email sent successfully/);
  // Paid renew/reminder gates remain separate
  assert.match(src, /const paid = crm\?\.planType === "premium" \|\| crm\?\.planType === "elite"/);
  assert.match(src, /\{paid \? \([\s\S]*Send reminder/);
  // Free action must not be gated on paid
  const freeBlock = src.slice(src.indexOf("{isFree ? ("), src.indexOf("{!archived ? ("));
  assert.match(freeBlock, /Send plan selection email/);
  assert.doesNotMatch(freeBlock, /planType === "premium"/);
});

test("membership page exposes plan-selection anchor for email CTA", () => {
  const src = readFileSync(new URL("../src/components/dashboard/FireMembershipPage.tsx", import.meta.url), "utf8");
  assert.match(src, /id="membership-plan-selection"/);
  assert.match(src, /Choose your plan/);
});
