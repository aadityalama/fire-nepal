#!/usr/bin/env node
/**
 * Unit tests for membership payment-plan approval email template + send flow helpers.
 * Run: npx tsx --test scripts/membership-approval-email.test.mjs
 */
import assert from "node:assert/strict";
import test from "node:test";
import {
  MEMBERSHIP_APPROVAL_EMAIL_SUBJECT,
  buildMembershipApprovalEmail,
  formatApprovalDate,
  formatNprAmount,
  membershipPlanViewUrl,
  paymentScheduleLabel,
  planDisplayName,
  resolveApprovalEmailLogoUrl,
} from "../src/lib/membership-approval-email/email-templates.ts";

test("planDisplayName maps premium and elite", () => {
  assert.equal(planDisplayName("premium"), "Premium");
  assert.equal(planDisplayName("elite"), "Elite");
});

test("formatNprAmount uses Nepali locale grouping", () => {
  assert.match(formatNprAmount(500), /500/);
  assert.match(formatNprAmount(800), /800/);
});

test("paymentScheduleLabel includes annual term and payment method", () => {
  const label = paymentScheduleLabel("khalti_qr");
  assert.match(label, /Annual/);
  assert.match(label, /Khalti/);
});

test("membershipPlanViewUrl points at dashboard membership", () => {
  assert.equal(membershipPlanViewUrl("https://www.firenepal.com"), "https://www.firenepal.com/dashboard/membership");
});

test("resolveApprovalEmailLogoUrl prefers FIRE_NEPAL_LOGO_URL then email-logo asset", () => {
  const prev = process.env.FIRE_NEPAL_LOGO_URL;
  delete process.env.FIRE_NEPAL_LOGO_URL;
  assert.equal(resolveApprovalEmailLogoUrl("https://www.firenepal.com"), "https://www.firenepal.com/email-logo.png");
  process.env.FIRE_NEPAL_LOGO_URL = "https://cdn.example.com/logo.png";
  assert.equal(resolveApprovalEmailLogoUrl("https://www.firenepal.com"), "https://cdn.example.com/logo.png");
  if (prev === undefined) delete process.env.FIRE_NEPAL_LOGO_URL;
  else process.env.FIRE_NEPAL_LOGO_URL = prev;
});

test("approval email includes required fields, CTA, and branded footer", () => {
  const approvedAt = "2026-08-15T10:00:00.000Z";
  const expiryAt = "2027-08-15T10:00:00.000Z";
  const built = buildMembershipApprovalEmail({
    memberName: "Sita Sharma",
    referenceId: "TXN-998877",
    plan: "elite",
    amountNpr: 800,
    paymentMethod: "esewa_qr",
    approvedAtIso: approvedAt,
    expiryAtIso: expiryAt,
    viewPlanUrl: "https://www.firenepal.com/dashboard/membership",
    logoUrl: "https://www.firenepal.com/email-logo.png",
  });

  assert.equal(built.subject, MEMBERSHIP_APPROVAL_EMAIL_SUBJECT);
  assert.match(built.subject, /FIRE Nepal Payment Plan Has Been Approved/);

  assert.match(built.html, /Sita Sharma/);
  assert.match(built.html, /TXN-998877/);
  assert.match(built.html, /Elite/);
  assert.match(built.html, /NPR/);
  assert.match(built.html, /800/);
  assert.match(built.html, /Annual/);
  assert.match(built.html, /eSewa/);
  assert.match(built.html, /Approved/);
  assert.match(built.html, /View My Payment Plan →/);
  assert.match(built.html, /dashboard\/membership/);
  assert.match(built.html, /email-logo\.png/);
  assert.match(built.html, /FIRE Nepal/);
  assert.match(built.html, /www\.firenepal\.com/);
  assert.match(built.html, /support@firenepal\.com/);
  assert.match(built.html, /href="https:\/\/www\.firenepal\.com"/);
  assert.match(built.html, /mailto:support@firenepal\.com/);
  assert.match(built.html, /\/contact/);
  assert.match(built.html, /© FIRE Nepal\. All rights reserved\./);
  assert.match(built.html, /Financial Independence/);
  assert.match(built.html, /automated notification/i);

  assert.match(built.text, /Sita Sharma/);
  assert.match(built.text, /TXN-998877/);
  assert.match(built.text, /Elite/);
  assert.match(built.text, /NPR 800/);
  assert.match(built.text, /View My Payment Plan →/);
  assert.match(built.text, /support@firenepal\.com/);
  assert.match(built.text, /© FIRE Nepal\. All rights reserved\./);

  // Dynamic dates — not hardcoded copy
  assert.match(built.html, new RegExp(formatApprovalDate(approvedAt).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(built.html, new RegExp(formatApprovalDate(expiryAt).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("approval email escapes HTML in member-controlled fields", () => {
  const built = buildMembershipApprovalEmail({
    memberName: `<script>alert(1)</script>`,
    referenceId: `"><img src=x onerror=alert(1)>`,
    plan: "premium",
    amountNpr: 500,
    paymentMethod: "global_ime_qr",
    approvedAtIso: "2026-08-15T10:00:00.000Z",
    expiryAtIso: "2027-08-15T10:00:00.000Z",
    viewPlanUrl: "https://www.firenepal.com/dashboard/membership",
    logoUrl: "https://www.firenepal.com/email-logo.png",
  });
  assert.doesNotMatch(built.html, /<script>/);
  assert.match(built.html, /&lt;script&gt;/);
  assert.match(built.html, /&quot;&gt;&lt;img/);
});

test("sendMembershipApprovalEmail is idempotent when already sent", async () => {
  const { sendMembershipApprovalEmail } = await import("../src/lib/membership-approval-email/send-approval-email.ts");

  const inserts = [];
  const admin = {
    auth: {
      admin: {
        getUserById: async () => ({
          data: {
            user: {
              email: "member@example.com",
              email_confirmed_at: "2026-01-01T00:00:00.000Z",
            },
          },
          error: null,
        }),
      },
    },
    from(table) {
      if (table === "membership_approval_emails") {
        return {
          select() {
            return {
              eq() {
                return {
                  eq() {
                    return {
                      maybeSingle: async () => ({ data: { id: "already-sent-row" }, error: null }),
                    };
                  },
                };
              },
            };
          },
          insert(row) {
            inserts.push(row);
            return Promise.resolve({ error: null });
          },
        };
      }
      if (table === "user_profiles") {
        return {
          select() {
            return {
              eq() {
                return {
                  maybeSingle: async () => ({ data: { full_name: "Test Member", display_name: null }, error: null }),
                };
              },
            };
          },
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  };

  process.env.RESEND_API_KEY = process.env.RESEND_API_KEY || "test-key-for-unit";
  const result = await sendMembershipApprovalEmail(admin, {
    membershipRequestId: "req-1",
    userId: "user-1",
    requestEmail: "member@example.com",
    plan: "premium",
    amountNpr: 500,
    paymentMethod: "khalti_qr",
    paymentReference: "REF-1",
    approvedAtIso: "2026-08-15T10:00:00.000Z",
    expiryAtIso: "2027-08-15T10:00:00.000Z",
  });

  assert.equal(result.ok, true);
  assert.equal(result.skipped, true);
  assert.equal(result.reason, "already_sent");
  assert.equal(inserts.length, 0);
});

test("sendMembershipApprovalEmail skips unverified auth email", async () => {
  const { sendMembershipApprovalEmail } = await import("../src/lib/membership-approval-email/send-approval-email.ts");

  const inserts = [];
  const admin = {
    auth: {
      admin: {
        getUserById: async () => ({
          data: {
            user: {
              email: "member@example.com",
              email_confirmed_at: null,
            },
          },
          error: null,
        }),
      },
    },
    from(table) {
      if (table === "membership_approval_emails") {
        return {
          select() {
            return {
              eq() {
                return {
                  eq() {
                    return {
                      maybeSingle: async () => ({ data: null, error: null }),
                    };
                  },
                };
              },
            };
          },
          insert(row) {
            inserts.push(row);
            return Promise.resolve({ error: null });
          },
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  };

  process.env.RESEND_API_KEY = process.env.RESEND_API_KEY || "test-key-for-unit";
  const result = await sendMembershipApprovalEmail(admin, {
    membershipRequestId: "req-2",
    userId: "user-2",
    requestEmail: "member@example.com",
    plan: "elite",
    amountNpr: 800,
    paymentMethod: "esewa_qr",
    paymentReference: null,
    approvedAtIso: "2026-08-15T10:00:00.000Z",
    expiryAtIso: "2027-08-15T10:00:00.000Z",
  });

  assert.equal(result.ok, false);
  assert.equal(result.skipped, true);
  assert.equal(result.reason, "email_not_verified");
  assert.equal(inserts.length, 1);
  assert.equal(inserts[0].delivery_status, "skipped");
});

test("sendMembershipApprovalEmail sends via Resend after approval success path data", async () => {
  const prevFetch = globalThis.fetch;
  const fetchCalls = [];
  globalThis.fetch = async (url, init) => {
    fetchCalls.push({ url: String(url), init });
    return {
      ok: true,
      status: 200,
      json: async () => ({ id: "re_test_123" }),
      text: async () => "",
    };
  };

  try {
    // Fresh module import not required — function reads env at call time for Resend.
    const { sendMembershipApprovalEmail } = await import("../src/lib/membership-approval-email/send-approval-email.ts");

    const inserts = [];
    const admin = {
      auth: {
        admin: {
          getUserById: async () => ({
            data: {
              user: {
                email: "verified@firenepal.com",
                email_confirmed_at: "2026-02-01T00:00:00.000Z",
              },
            },
            error: null,
          }),
        },
      },
      from(table) {
        if (table === "membership_approval_emails") {
          return {
            select() {
              return {
                eq() {
                  return {
                    eq() {
                      return {
                        maybeSingle: async () => ({ data: null, error: null }),
                      };
                    },
                  };
                },
              };
            },
            insert(row) {
              inserts.push(row);
              return Promise.resolve({ error: null });
            },
          };
        }
        if (table === "user_profiles") {
          return {
            select() {
              return {
                eq() {
                  return {
                    maybeSingle: async () => ({
                      data: { full_name: "Ram Bahadur", display_name: "Ram" },
                      error: null,
                    }),
                  };
                },
              };
            },
          };
        }
        throw new Error(`unexpected table ${table}`);
      },
    };

    process.env.RESEND_API_KEY = "test-resend-key";
    const result = await sendMembershipApprovalEmail(admin, {
      membershipRequestId: "req-3",
      userId: "user-3",
      requestEmail: "verified@firenepal.com",
      plan: "premium",
      amountNpr: 500,
      paymentMethod: "global_ime_qr",
      paymentReference: "PAY-55",
      approvedAtIso: "2026-08-15T12:00:00.000Z",
      expiryAtIso: "2027-08-15T12:00:00.000Z",
    });

    assert.equal(result.ok, true);
    assert.equal(fetchCalls.length, 1);
    assert.match(String(fetchCalls[0].url), /api\.resend\.com\/emails/);
    const body = JSON.parse(fetchCalls[0].init.body);
    assert.deepEqual(body.to, ["verified@firenepal.com"]);
    assert.equal(body.subject, MEMBERSHIP_APPROVAL_EMAIL_SUBJECT);
    assert.match(body.html, /Ram Bahadur/);
    assert.match(body.html, /PAY-55/);
    assert.match(body.html, /Premium/);
    assert.match(body.html, /NPR/);
    assert.match(body.html, /500/);
    assert.match(body.html, /View My Payment Plan →/);
    assert.match(body.html, /support@firenepal\.com/);
    assert.equal(inserts.length, 1);
    assert.equal(inserts[0].delivery_status, "sent");
    assert.equal(inserts[0].resend_id, "re_test_123");
    assert.equal(inserts[0].membership_request_id, "req-3");
  } finally {
    globalThis.fetch = prevFetch;
  }
});
